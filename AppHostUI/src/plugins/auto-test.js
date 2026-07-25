// Built-in plugin: automated test sequences.
//
// A sequence is a list of declarative steps executed one at a time. The engine
// here is deliberately small -- the point is that the plugin API is enough to
// drive the supply end to end, so new benches can add their own sequences
// without touching the shell.
//
// Step kinds:
//   { kind: "note",    key }                     -- log a line
//   { kind: "require", key, check(ctx) }         -- abort unless check() passes
//   { kind: "targets", cvV, ccMa, cpW }          -- stage setpoints
//   { kind: "start",   seconds }                 -- enable the output
//   { kind: "wait",    ms }                      -- sleep (abortable)
//   { kind: "sample",  label }                   -- record one telemetry row
//   { kind: "expect",  key, check(latest) }      -- assert on live telemetry
//   { kind: "stop" }                             -- disable the output
//   { kind: "action",  key, run(ctx) }           -- arbitrary async work
//
// `stop` always runs in the finally block too, so an aborted or failed run can
// never leave the output enabled.

HV.define("plugins/auto-test", function (require, exports) {
"use strict";

const { writeClipboardText } = require("core/clipboard");
const { h, setDisabled, setText } = require("core/dom");
const { formatSig } = require("core/format");
const { efficiencyRatio, outputPowerMw } = require("device/metrics");
const { definePlugin } = require("plugins/api");

const SEQUENCES = [
  {
    id: "selfCheck",
    titleKey: "plugin.autoTest.seq.selfCheck",
    // Safe to run at any time: never enables the output.
    build: () => [
      { kind: "require", key: "plugin.autoTest.step.linkUp", check: (ctx) => ctx.device.isConnected() },
      { kind: "require", key: "plugin.autoTest.step.outputOff", check: (ctx) => !ctx.device.isOutputLive() },
      { kind: "action", key: "plugin.autoTest.step.syncConfig", run: (ctx) => ctx.device.config.sync() },
      { kind: "wait", ms: 300 },
      { kind: "sample", label: "idle" },
      {
        kind: "expect",
        key: "plugin.autoTest.step.busPresent",
        check: (latest) => latest.vPriMv > 1000
      },
      {
        kind: "expect",
        key: "plugin.autoTest.step.configOk",
        check: (latest) => latest.configOk
      }
    ]
  },
  {
    id: "cvSoak",
    titleKey: "plugin.autoTest.seq.cvSoak",
    // Uses whatever setpoints are currently staged in the command bar.
    build: (options) => {
      const steps = [
        { kind: "require", key: "plugin.autoTest.step.linkUp", check: (ctx) => ctx.device.isConnected() },
        { kind: "require", key: "plugin.autoTest.step.outputOff", check: (ctx) => !ctx.device.isOutputLive() },
        { kind: "start", seconds: options.seconds },
        { kind: "wait", ms: 1500 },
        { kind: "expect", key: "plugin.autoTest.step.outputLive", check: (latest) => latest.powerEnable }
      ];
      const samples = Math.max(1, Math.round((options.seconds * 1000 - 1500) / options.intervalMs));
      for (let i = 0; i < samples; i += 1) {
        steps.push({ kind: "wait", ms: options.intervalMs }, { kind: "sample", label: `t${i + 1}` });
      }
      steps.push({ kind: "stop" });
      return steps;
    }
  }
];

exports.default = definePlugin({
  id: "auto-test",
  name: "Auto Test",

  setup(ctx) {
    const state = {
      sequenceId: ctx.storage.get("sequenceId", SEQUENCES[0].id),
      seconds: ctx.storage.get("seconds", 10),
      intervalMs: ctx.storage.get("intervalMs", 1000),
      running: false,
      abort: false,
      log: [],
      samples: [],
      verdict: null
    };

    function line(key, params, level = "info") {
      state.log.push({ key, params, level });
      ctx.ui.requestRender();
    }

    const sleep = (ms) =>
      new Promise((resolve) => {
        const timer = setTimeout(resolve, ms);
        // Aborting resolves early; the runner re-checks state.abort after every step.
        const poll = setInterval(() => {
          if (state.abort) {
            clearTimeout(timer);
            clearInterval(poll);
            resolve();
          }
        }, 50);
        setTimeout(() => clearInterval(poll), ms + 60);
      });

    function takeSample(label) {
      const latest = ctx.telemetry.latest();
      const row = {
        label,
        vsecV: latest.vSecMv / 1000,
        isecMa: latest.iSecMa,
        vbusV: latest.vPriMv / 1000,
        ipriA: latest.iPriDcMa / 1000,
        dutyPct: latest.duty * 100,
        freqKHz: latest.currentFreqHz / 1000,
        powerW: outputPowerMw(latest) / 1000,
        effPct: efficiencyRatio(latest) * 100
      };
      state.samples.push(row);
      return row;
    }

    async function runStep(step) {
      switch (step.kind) {
        case "note":
          line(step.key);
          return true;
        case "require":
          if (!step.check(ctx)) {
            line(step.key, null, "error");
            return false;
          }
          line(step.key, null, "ok");
          return true;
        case "targets":
          ctx.device.run.patch({ cvV: step.cvV, ccMa: step.ccMa, cpW: step.cpW });
          line("plugin.autoTest.step.targetsStaged");
          return true;
        case "start": {
          ctx.device.run.patch({ continuous: false, runSeconds: step.seconds, mode: "closed" });
          const ok = await ctx.device.run.start();
          line("plugin.autoTest.step.started", { seconds: step.seconds }, ok ? "ok" : "error");
          return ok;
        }
        case "wait":
          await sleep(step.ms);
          return !state.abort;
        case "sample": {
          const row = takeSample(step.label);
          line("plugin.autoTest.step.sampled", { label: row.label, v: formatSig(row.vsecV), i: formatSig(row.isecMa) });
          return true;
        }
        case "expect": {
          const pass = !!step.check(ctx.telemetry.latest());
          line(step.key, null, pass ? "ok" : "error");
          return pass;
        }
        case "action":
          await step.run(ctx);
          line(step.key, null, "ok");
          return true;
        case "stop": {
          await ctx.device.run.stop();
          line("plugin.autoTest.step.stopped", null, "ok");
          return true;
        }
        default:
          return true;
      }
    }

    async function run() {
      if (state.running) return;
      const sequence = SEQUENCES.find((item) => item.id === state.sequenceId) || SEQUENCES[0];
      state.running = true;
      state.abort = false;
      state.log = [];
      state.samples = [];
      state.verdict = null;
      line("plugin.autoTest.step.begin", { name: ctx.i18n.t(sequence.titleKey) });
      ctx.ui.requestRender();

      let passed = true;
      const steps = sequence.build({ seconds: state.seconds, intervalMs: state.intervalMs });
      try {
        for (const step of steps) {
          if (state.abort) {
            passed = false;
            line("plugin.autoTest.step.aborted", null, "error");
            break;
          }
          const ok = await runStep(step);
          if (!ok) {
            passed = false;
            break;
          }
        }
      } catch (error) {
        passed = false;
        ctx.log.error("sequence failed", error);
        line("plugin.autoTest.step.error", { error: error.message }, "error");
      } finally {
        // Never leave the bench energised because a step threw.
        if (ctx.device.isOutputLive()) {
          await ctx.device.run.stop();
          line("plugin.autoTest.step.safeStop", null, "error");
        }
        state.running = false;
        state.verdict = passed ? "pass" : "fail";
        line(passed ? "plugin.autoTest.step.pass" : "plugin.autoTest.step.fail", null, passed ? "ok" : "error");
        ctx.ui.requestRender();
      }
    }

    function samplesCsv() {
      if (state.samples.length === 0) return "";
      const header = "label,vsec_V,isec_mA,vbus_V,ipri_A,duty_pct,freq_kHz,power_W,eff_pct";
      const body = state.samples
        .map((row) =>
          [
            row.label,
            formatSig(row.vsecV),
            formatSig(row.isecMa),
            formatSig(row.vbusV),
            formatSig(row.ipriA),
            formatSig(row.dutyPct),
            formatSig(row.freqKHz),
            formatSig(row.powerW),
            Number.isFinite(row.effPct) ? formatSig(row.effPct) : ""
          ].join(",")
        )
        .join("\n");
      return `${header}\n${body}`;
    }

    ctx.ui.registerTool({
      id: "auto-test",
      titleKey: "plugin.autoTest.title",
      order: 30,

      mount(container) {
        const t = ctx.i18n.t;

        const sequenceSelect = h(
          "select",
          {
            onchange: (event) => {
              state.sequenceId = event.target.value;
              ctx.storage.set("sequenceId", state.sequenceId);
            }
          },
          SEQUENCES.map((item) =>
            h("option", { value: item.id, "data-i18n": item.titleKey }, t(item.titleKey))
          )
        );
        sequenceSelect.value = state.sequenceId;

        const secondsInput = h("input", {
          type: "number",
          min: "1",
          max: "600",
          step: "1",
          value: String(state.seconds),
          oninput: (event) => {
            state.seconds = Number.parseInt(event.target.value, 10) || 1;
            ctx.storage.set("seconds", state.seconds);
          }
        });

        const intervalInput = h("input", {
          type: "number",
          min: "100",
          max: "10000",
          step: "100",
          value: String(state.intervalMs),
          oninput: (event) => {
            state.intervalMs = Number.parseInt(event.target.value, 10) || 100;
            ctx.storage.set("intervalMs", state.intervalMs);
          }
        });

        const runButton = h("button.small-button", { type: "button", onclick: () => void run() }, t("plugin.autoTest.run"));
        const abortButton = h(
          "button.small-button",
          { type: "button", onclick: () => { state.abort = true; } },
          t("plugin.autoTest.abort")
        );
        const copyButton = h(
          "button.small-button",
          {
            type: "button",
            "data-i18n": "plugin.autoTest.copyCsv",
            onclick: async () => {
              const csv = samplesCsv();
              if (!csv) {
                ctx.ui.toast("plugin.autoTest.noSamples", null, "error");
                return;
              }
              try {
                await writeClipboardText(csv);
                ctx.ui.toast("plugin.autoTest.copied");
              } catch (error) {
                ctx.ui.toast("msg.copyFailed", { error: error.message }, "error");
              }
            }
          },
          t("plugin.autoTest.copyCsv")
        );

        const verdictChip = h("span.tool-meta", null, "--");
        const logList = h("div.tool-log");

        container.append(
          h(
            "header.tool-head",
            null,
            h("strong", { "data-i18n": "plugin.autoTest.title" }, t("plugin.autoTest.title")),
            verdictChip
          ),
          h(
            "div.tool-form",
            null,
            h("label.field", null, h("span", { "data-i18n": "plugin.autoTest.sequence" }, t("plugin.autoTest.sequence")), sequenceSelect),
            h("label.field", null, h("span", { "data-i18n": "plugin.autoTest.seconds" }, t("plugin.autoTest.seconds")), secondsInput),
            h("label.field", null, h("span", { "data-i18n": "plugin.autoTest.interval" }, t("plugin.autoTest.interval")), intervalInput)
          ),
          h("p.tool-note", { "data-i18n": "plugin.autoTest.warning" }, t("plugin.autoTest.warning")),
          logList,
          h("div.tool-actions", null, runButton, abortButton, copyButton)
        );

        let renderedLogLength = -1;

        return {
          update() {
            setText(runButton, t("plugin.autoTest.run"));
            setText(abortButton, t("plugin.autoTest.abort"));
            setDisabled(runButton, state.running || !ctx.device.isConnected());
            setDisabled(abortButton, !state.running);
            setDisabled(copyButton, state.samples.length === 0);
            setText(
              verdictChip,
              state.running
                ? t("plugin.autoTest.running")
                : state.verdict === "pass"
                  ? t("plugin.autoTest.pass")
                  : state.verdict === "fail"
                    ? t("plugin.autoTest.fail")
                    : t("plugin.autoTest.idle")
            );

            if (renderedLogLength === state.log.length) return;
            renderedLogLength = state.log.length;
            logList.replaceChildren(
              ...state.log.map((entry) =>
                h(`div.tool-log-line.is-${entry.level}`, null, ctx.i18n.t(entry.key, entry.params))
              )
            );
            logList.scrollTop = logList.scrollHeight;
          }
        };
      }
    });
  }
});

});
