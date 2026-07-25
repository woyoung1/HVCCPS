// Built-in plugin: per-run averages.
//
// Accumulates duty / Ipri / Isec / Vpri / Vsec over every heartbeat received
// while the output is live, freezes the window when the output stops, and
// offers the result as a one-line copyable summary for the test log.
//
// Also the reference example of the plugin API: it observes telemetry, owns a
// tool panel, and never touches app internals.

HV.define("plugins/run-summary", function (require, exports) {
"use strict";

const { writeClipboardText } = require("core/clipboard");
const { h, setText } = require("core/dom");
const { formatDurationMs, formatSig } = require("core/format");
const { definePlugin } = require("plugins/api");

function createStats() {
  return {
    active: false,
    startedAt: 0,
    lastAt: 0,
    packets: 0,
    dutySum: 0,
    ipriSumMa: 0,
    isecSumMa: 0,
    vpriSumMv: 0,
    vsecSumMv: 0,
    freqHz: 0
  };
}

exports.default = definePlugin({
  id: "run-summary",
  name: "Run Summary",

  setup(ctx) {
    let current = createStats();
    let last = null;
    let revealed = false;

    ctx.bus.on(ctx.EVENTS.HEARTBEAT, ({ latest, now, wasEnabled, enabled }) => {
      const fallbackFreq = latest.currentFreqHz || latest.baseFreqHz || 0;

      if (enabled && !wasEnabled) {
        current = createStats();
        current.active = true;
        current.startedAt = now;
        current.lastAt = now;
        current.freqHz = fallbackFreq;
        revealed = false;
      }

      if (enabled) {
        current.packets += 1;
        current.lastAt = now;
        if (!current.freqHz) current.freqHz = fallbackFreq;
        current.dutySum += latest.duty;
        current.ipriSumMa += latest.iPriDcMa;
        current.isecSumMa += latest.iSecMa;
        current.vpriSumMv += latest.vPriMv;
        current.vsecSumMv += latest.vSecMv;
      } else if (wasEnabled) {
        last = { ...current, active: false, endedAt: now };
        current = createStats();
      }
    });

    // A dropped link ends the window just like a stop command would.
    ctx.bus.on(ctx.EVENTS.LINK_CLOSE, () => {
      if (current.active) {
        last = { ...current, active: false, endedAt: current.lastAt || performance.now() };
        current = createStats();
      }
    });

    function averages() {
      if (!last || last.packets <= 0) return null;
      const n = last.packets;
      const ipriMa = last.ipriSumMa / n;
      const isecMa = last.isecSumMa / n;
      const vpriMv = last.vpriSumMv / n;
      const vsecMv = last.vsecSumMv / n;
      const inputPower = ipriMa * vpriMv;
      const outputPower = isecMa * vsecMv;
      return {
        freqHz: last.freqHz || ctx.telemetry.latest().currentFreqHz || 0,
        dutyPct: (last.dutySum / n) * 100,
        effPct: inputPower === 0 ? NaN : (outputPower / inputPower) * 100,
        ipriA: ipriMa / 1000,
        isecMa,
        vpriV: vpriMv / 1000,
        vsecV: vsecMv / 1000
      };
    }

    function copyText() {
      const avg = averages();
      if (!avg) return "";
      return `f: ${Math.round(avg.freqHz)}Hz, duty: ${formatSig(avg.dutyPct)}%, eff: ${
        Number.isFinite(avg.effPct) ? formatSig(avg.effPct) : "NaN"
      }%, Ipri: ${formatSig(avg.ipriA)}A, Isec: ${formatSig(avg.isecMa)}mA, Vsec: ${formatSig(
        avg.vsecV
      )}V, Vpri: ${formatSig(avg.vpriV)}V`;
    }

    ctx.ui.registerTool({
      id: "run-summary",
      titleKey: "plugin.runSummary.title",
      order: 10,

      mount(container) {
        const t = ctx.i18n.t;
        const cells = {};

        function cell(labelKey) {
          const label = h("span", { "data-i18n": labelKey }, t(labelKey));
          const value = h("strong", null, "--");
          return { label, value };
        }

        for (const key of ["duty", "eff", "ipri", "isec", "vpri", "vsec"]) {
          cells[key] = cell(`plugin.runSummary.${key}`);
        }

        const activeLine = h("span.tool-meta", null, "--");
        const windowLine = h("p.tool-note", null, "--");
        const copyLine = h("div.tool-copy-line", null, "--");

        const viewButton = h(
          "button.small-button",
          { type: "button", "data-i18n": "plugin.runSummary.view", onclick: () => { revealed = true; ctx.ui.requestRender(); } },
          t("plugin.runSummary.view")
        );
        const copyButton = h(
          "button.small-button",
          {
            type: "button",
            "data-i18n": "plugin.runSummary.copy",
            onclick: async () => {
              const text = copyText();
              if (!text) {
                ctx.ui.toast("plugin.runSummary.noWindow", null, "error");
                return;
              }
              try {
                await writeClipboardText(text);
                revealed = true;
                ctx.ui.toast("plugin.runSummary.copied");
              } catch (error) {
                ctx.ui.toast("msg.copyFailed", { error: error.message }, "error");
              }
              ctx.ui.requestRender();
            }
          },
          t("plugin.runSummary.copy")
        );

        container.append(
          h("header.tool-head", null, h("strong", { "data-i18n": "plugin.runSummary.title" }, t("plugin.runSummary.title")), activeLine),
          h(
            "div.tool-grid",
            null,
            Object.values(cells).flatMap((entry) => [entry.label, entry.value])
          ),
          windowLine,
          copyLine,
          h("div.tool-actions", null, viewButton, copyButton)
        );

        return {
          update() {
            setText(
              activeLine,
              current.active
                ? t("plugin.runSummary.running", {
                    packets: current.packets,
                    duration: formatDurationMs(current.lastAt - current.startedAt)
                  })
                : t("plugin.runSummary.idle")
            );

            setText(
              windowLine,
              last && last.packets > 0
                ? t("plugin.runSummary.window", {
                    packets: last.packets,
                    duration: formatDurationMs(last.endedAt - last.startedAt)
                  })
                : t("plugin.runSummary.noWindow")
            );

            setText(copyLine, revealed ? copyText() || t("plugin.runSummary.noWindow") : t("plugin.runSummary.hint"));

            const avg = averages();
            setText(cells.duty.value, avg ? `${formatSig(avg.dutyPct)} %` : "--");
            setText(cells.eff.value, avg && Number.isFinite(avg.effPct) ? `${formatSig(avg.effPct)} %` : "--");
            setText(cells.ipri.value, avg ? `${formatSig(avg.ipriA)} A` : "--");
            setText(cells.isec.value, avg ? `${formatSig(avg.isecMa)} mA` : "--");
            setText(cells.vpri.value, avg ? `${formatSig(avg.vpriV)} V` : "--");
            setText(cells.vsec.value, avg ? `${formatSig(avg.vsecV)} V` : "--");
          }
        };
      }
    });
  }
});

});
