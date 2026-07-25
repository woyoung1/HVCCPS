// Single-cycle waveform overlay.
//
// Full-screen because the per-channel sample offsets and the PWM overlay need
// real room; a subpanel under the telemetry plot could not show them legibly.
// Draws the 24 raw samples of the latest heartbeat with no smoothing and no
// cross-cycle averaging.

HV.define("ui/views/cycle-overlay", function (require, exports) {
"use strict";

const { h, qs, setChecked, setClass, setText } = require("core/dom");
const { formatSig } = require("core/format");
const { registerView, requestRender } = require("core/scheduler");
const { readJson, writeJson } = require("core/storage");
const { onLanguageChange, t } = require("i18n/index");
const { SAMPLES_PER_PERIOD } = require("protocol/index");
const { CYCLE_SIGNALS } = require("device/cycle-signals");

const STORAGE_AREA = "app";
const STORAGE_KEY = "cycle.prefs.v2";
const MONO_FONT = "11px 'Cascadia Mono','JetBrains Mono',Consolas,monospace";

function loadPrefs() {
  const parsed = readJson(STORAGE_AREA, STORAGE_KEY, null) || {};
  const enabled = {};
  for (const signal of CYCLE_SIGNALS) {
    enabled[signal.key] = parsed.enabled && signal.key in parsed.enabled ? !!parsed.enabled[signal.key] : true;
  }
  return {
    enabled,
    showPwm: parsed.showPwm !== false,
    yMode: parsed.yMode === "physical" ? "physical" : "normalized"
  };
}

function mountCycleOverlay({ root, device }) {
  const canvas = qs(root, '[data-el="canvas"]');
  const subtitle = qs(root, '[data-el="subtitle"]');
  const signalList = qs(root, '[data-el="signalList"]');
  const showPwm = qs(root, '[data-el="showPwm"]');
  const yMode = qs(root, '[data-el="yMode"]');
  const closeButton = qs(root, '[data-el="close"]');
  const backdrop = qs(root, '[data-el="backdrop"]');

  const prefs = loadPrefs();
  let open = false;
  let valueCells = {};

  function persist() {
    writeJson(STORAGE_AREA, STORAGE_KEY, prefs);
  }

  function buildSignalList() {
    valueCells = {};
    signalList.replaceChildren(
      ...CYCLE_SIGNALS.map((signal) => {
        const checkbox = h("input", {
          type: "checkbox",
          checked: !!prefs.enabled[signal.key],
          onchange: () => {
            prefs.enabled[signal.key] = checkbox.checked;
            persist();
            render();
          }
        });
        const value = h("span.cycle-signal-value", null, "--");
        valueCells[signal.key] = value;
        return h(
          "label.cycle-signal-row",
          { style: { "--signal-color": signal.color } },
          checkbox,
          h("span.cycle-signal-swatch"),
          h("strong.cycle-signal-label", null, `${signal.label} (${signal.unit})`),
          h("em.cycle-signal-meta", null, t("cycle.rankMeta", {
            bank: signal.adcBank,
            rank: signal.rank,
            ns: signal.sampleDelayNs.toFixed(1)
          })),
          value
        );
      })
    );
  }

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(320, rect.width || canvas.clientWidth || 720);
    const cssH = Math.max(240, rect.height || canvas.clientHeight || 420);
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }
    return { cssW, cssH, dpr };
  }

  function render() {
    if (!open) return;
    const ctx = canvas.getContext("2d");
    const { cssW, cssH, dpr } = resizeCanvas();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const latest = device.telemetry.latest;

    // Period: prefer the firmware-reported realized frequency, fall back to the
    // configured base so the X offsets are visible before the first heartbeat.
    const periodNsLive = latest.currentFreqHz > 0 ? 1e9 / latest.currentFreqHz : NaN;
    const baseFreqHz = latest.baseFreqHz;
    const periodNsSet = baseFreqHz > 0 ? 1e9 / baseFreqHz : NaN;
    const periodNs = Number.isFinite(periodNsLive) ? periodNsLive : periodNsSet;
    const periodUs = Number.isFinite(periodNs) ? periodNs / 1000 : NaN;

    // PSFB phase-shift fraction of the period (0..0.5). duty already encodes the
    // realized phase as duty = phase / (PRD/2), so phaseFrac = duty / 2.
    const phaseFrac = Math.max(0, Math.min(0.5, latest.duty / 2));

    const padL = 70;
    const padR = 24;
    const padT = 24;
    const padB = 56;
    const plotW = Math.max(120, cssW - padL - padR);
    const plotH = Math.max(140, cssH - padT - padB);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cssW, cssH);

    // --- frame + gridlines -------------------------------------------------
    ctx.strokeStyle = "#9ca8b6";
    ctx.lineWidth = 1;
    ctx.strokeRect(padL, padT, plotW, plotH);

    ctx.strokeStyle = "rgba(120,130,144,0.18)";
    ctx.beginPath();
    for (let i = 1; i < SAMPLES_PER_PERIOD; i += 1) {
      const x = padL + (i / SAMPLES_PER_PERIOD) * plotW;
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
    }
    ctx.stroke();

    ctx.strokeStyle = "rgba(120,130,144,0.4)";
    ctx.beginPath();
    for (const frac of [0, 0.25, 0.5, 0.75, 1]) {
      const x = padL + frac * plotW;
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
    }
    ctx.stroke();

    ctx.fillStyle = "#5a6776";
    ctx.font = MONO_FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i <= 4; i += 1) {
      const frac = i / 4;
      const label = Number.isFinite(periodUs) ? `${(frac * periodUs).toFixed(2)} μs` : `${(frac * 100).toFixed(0)}%`;
      ctx.fillText(label, padL + frac * plotW, padT + plotH + 6);
    }

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const pct of [0, 0.5, 1]) {
      ctx.fillText(`${Math.round(pct * 100)}%`, padL - 8, padT + plotH * (1 - pct));
    }

    ctx.save();
    ctx.translate(18, padT + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText(t(prefs.yMode === "physical" ? "cycle.axisPhysical" : "cycle.axisNormalized"), 0, 0);
    ctx.restore();

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#5a6776";
    ctx.fillText(
      t(Number.isFinite(periodUs) ? "cycle.axisPeriodUs" : "cycle.axisPeriodPct"),
      padL + plotW / 2,
      padT + plotH + 26
    );

    // --- sample traces -----------------------------------------------------
    // Each rank starts its sample-and-hold at a slightly different offset from
    // the shared trigger, so dots go at the TRUE (trigger_k + delay) position.
    const slotDurNs = Number.isFinite(periodNs) ? periodNs / SAMPLES_PER_PERIOD : NaN;
    const xForSample = (k, signal) => {
      if (!Number.isFinite(slotDurNs)) return padL + (k / SAMPLES_PER_PERIOD) * plotW;
      return padL + ((k * slotDurNs + signal.sampleDelayNs) / periodNs) * plotW;
    };

    for (const signal of CYCLE_SIGNALS) {
      const cell = valueCells[signal.key];
      if (!prefs.enabled[signal.key]) {
        if (cell) setText(cell, t("cycle.off"));
        continue;
      }
      const samples = signal.samples(latest);
      if (!samples || samples.length === 0) continue;

      let maxRaw = 0;
      for (let k = 0; k < samples.length; k += 1) if (samples[k] > maxRaw) maxRaw = samples[k];
      const scaleDen = prefs.yMode === "physical" ? Math.max(maxRaw, signal.fullScale * 0.02) : signal.fullScale;
      const yFor = (raw) => padT + plotH * (1 - Math.max(0, Math.min(1, raw / scaleDen)));

      // 1. Solid polyline between REAL samples only (slot 0..23). Slot 23 sits
      //    at ~95.83% of the period, never at 100%.
      ctx.strokeStyle = signal.color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let k = 0; k < samples.length; k += 1) {
        const x = xForSample(k, signal);
        const y = yFor(samples[k]);
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 2. Dashed stubs across the period boundary. Slot 23 is at
      //    trigger_23 + delay and the boundary at trigger_24, so the boundary
      //    value is interpolated (slotDur - delay) / slotDur of the way from
      //    slot 23 towards the next cycle's slot 0. Makes the cyclic continuity
      //    visible without pretending a sample exists at 100%.
      if (Number.isFinite(slotDurNs)) {
        const v23 = samples[SAMPLES_PER_PERIOD - 1] / scaleDen;
        const v0 = samples[0] / scaleDen;
        const tBoundary = Math.max(0, Math.min(1, (slotDurNs - signal.sampleDelayNs) / slotDurNs));
        const vBoundary = v23 + (v0 - v23) * tBoundary;
        const clampY = (v) => padT + plotH * (1 - Math.max(0, Math.min(1, v)));
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = `${signal.color}aa`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(xForSample(SAMPLES_PER_PERIOD - 1, signal), clampY(v23));
        ctx.lineTo(padL + plotW, clampY(vBoundary));
        ctx.moveTo(padL, clampY(vBoundary));
        ctx.lineTo(xForSample(0, signal), clampY(v0));
        ctx.stroke();
        ctx.restore();
      }

      // 3. Dots at the actual sample instants.
      ctx.fillStyle = signal.color;
      for (let k = 0; k < samples.length; k += 1) {
        ctx.fillRect(xForSample(k, signal) - 2.5, yFor(samples[k]) - 2.5, 5, 5);
      }

      if (cell) {
        let sum = 0;
        for (let k = 0; k < samples.length; k += 1) sum += samples[k];
        setText(cell, `${formatSig(signal.toUnit(sum / samples.length, latest))} ${signal.unit}`);
      }
    }

    // --- PWM waveforms on top ---------------------------------------------
    // Both bridges share the same high/low Y so the operator reads one PWM
    // reference; 55% alpha lets the overlap (the PSFB power-transfer interval)
    // show through. High tops out at 25% from the top so tall traces stay clear.
    if (prefs.showPwm) {
      const yHigh = padT + plotH * 0.25;
      const yLow = padT + plotH * 0.97;
      const bridges = [
        { key: "cycle.bridgeLead", color: "rgba(29, 78, 216, 0.55)", start: 0, end: 0.5 },
        { key: "cycle.bridgeLag", color: "rgba(192, 38, 211, 0.55)", start: phaseFrac, end: phaseFrac + 0.5 }
      ];
      const xAt = (f) => padL + Math.max(0, Math.min(1, f)) * plotW;

      for (const bridge of bridges) {
        ctx.strokeStyle = bridge.color;
        ctx.lineWidth = 2.4;
        ctx.lineJoin = "miter";
        ctx.lineCap = "butt";
        ctx.beginPath();
        if (bridge.end <= 1) {
          ctx.moveTo(padL, yLow);
          if (bridge.start > 0) ctx.lineTo(xAt(bridge.start), yLow);
          ctx.lineTo(xAt(bridge.start), yHigh);
          ctx.lineTo(xAt(bridge.end), yHigh);
          ctx.lineTo(xAt(bridge.end), yLow);
          if (bridge.end < 1) ctx.lineTo(padL + plotW, yLow);
        } else {
          const wrapEnd = bridge.end - 1;
          ctx.moveTo(padL, yHigh);
          ctx.lineTo(xAt(wrapEnd), yHigh);
          ctx.lineTo(xAt(wrapEnd), yLow);
          ctx.lineTo(xAt(bridge.start), yLow);
          ctx.lineTo(xAt(bridge.start), yHigh);
          ctx.lineTo(padL + plotW, yHigh);
        }
        ctx.stroke();
      }

      ctx.font = MONO_FONT;
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      let chipX = padL + 4;
      for (const bridge of bridges) {
        ctx.fillStyle = bridge.color;
        ctx.fillRect(chipX, padT + 2, 10, 3);
        const label = t(bridge.key);
        ctx.fillText(label, chipX + 14, padT + 7);
        chipX += ctx.measureText(label).width + 28;
      }
    }

    setText(
      subtitle,
      Number.isFinite(periodUs)
        ? t("cycle.subtitleLive", {
            state: t(latest.currentFreqHz > 0 ? "cycle.stateLive" : "cycle.statePreview"),
            period: periodUs.toFixed(2),
            slot: slotDurNs.toFixed(1),
            duty: (latest.duty * 100).toFixed(1),
            phase: (phaseFrac * 100).toFixed(1),
            pkt: device.telemetry.packetRate
          })
        : t("cycle.subtitleIdle", { duty: (latest.duty * 100).toFixed(1) })
    );
  }

  showPwm.addEventListener("change", () => {
    prefs.showPwm = showPwm.checked;
    persist();
    render();
  });
  yMode.addEventListener("change", () => {
    prefs.yMode = yMode.value === "physical" ? "physical" : "normalized";
    persist();
    render();
  });
  closeButton.addEventListener("click", () => close());
  backdrop.addEventListener("click", () => close());
  window.addEventListener("resize", () => render());
  onLanguageChange(() => {
    buildSignalList();
    render();
  });

  function openOverlay() {
    open = true;
    setClass(root, "is-open", true);
    root.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-overlay-open");
    setChecked(showPwm, prefs.showPwm);
    yMode.value = prefs.yMode;
    render();
    requestRender();
  }

  function close() {
    open = false;
    setClass(root, "is-open", false);
    root.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-overlay-open");
    requestRender();
  }

  buildSignalList();
  setChecked(showPwm, prefs.showPwm);
  yMode.value = prefs.yMode;

  // Repaint on every render pass while open. Each heartbeat calls
  // requestRender(), so the canvas tracks the device live instead of freezing
  // on whatever period happened to be on screen when it was opened.
  registerView("cycle-overlay", () => {
    if (open) render();
  });

  return {
    open: openOverlay,
    close,
    toggle: () => (open ? close() : openOverlay()),
    isOpen: () => open,
    render
  };
}

exports.mountCycleOverlay = mountCycleOverlay;
});
