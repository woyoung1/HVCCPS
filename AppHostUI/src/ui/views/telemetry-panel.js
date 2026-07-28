// Telemetry panel: the scrolling multi-signal plot and its legend.
//
// The panel's grid rows (header / legend / chart) are fixed and always present,
// so nothing that happens elsewhere in the app can resize the chart. The signal
// picker is an absolutely positioned overlay inside the chart area for the same
// reason.
//
// Exactly ONE Y axis is ever drawn: the one belonging to the reference signal
// (click a legend chip to move it). Every other curve keeps its own hidden,
// auto-scaled axis so its shape stays visible, but contributes no ticks -- a
// number read off the plot can therefore only ever belong to the signal named
// on the axis. Absolute values live in the status panel; point-in-time values,
// including anywhere inside a frozen window, come from hovering the curve.

HV.define("ui/views/telemetry-panel", function (require, exports) {
"use strict";

const { h, qs, setAttr, setClass, setDisabled, setHidden, setText } = require("core/dom");
const { formatSig } = require("core/format");
const { createLogger } = require("core/logger");
const { registerView } = require("core/scheduler");
const { onLanguageChange, t } = require("i18n/index");
const { METRIC_MAP, metricAxisKey, metricLabelKey } = require("device/metrics");
const { CHART_WINDOW_MS } = require("device/telemetry");
const { mountSignalPicker } = require("ui/views/signal-picker");

const log = createLogger("plot");
const FRAME_MIN_MS = 1000 / 60;
/** Spacing of the time ticks. The window is a whole multiple of this, so the
 *  ticks come out as round relative seconds. */
const X_TICK_STEP_MS = 4000;

function mountTelemetryPanel({ root, device, selection }) {
  const canvas = qs(root, '[data-el="canvas"]');
  const empty = qs(root, '[data-el="empty"]');
  const legend = qs(root, '[data-el="legend"]');
  const subtitle = qs(root, '[data-el="subtitle"]');
  const selectionSummary = qs(root, '[data-el="selectionSummary"]');
  const pickerToggle = qs(root, '[data-el="pickerToggle"]');
  const pauseButton = qs(root, '[data-el="pause"]');
  const pauseLabel = pauseButton.querySelector("span");
  const resetButton = qs(root, '[data-el="reset"]');
  const picker = qs(root, '[data-el="picker"]');

  let chart = null;
  let chartNow = performance.now();
  let lastFrameAt = 0;
  let legendVersion = "";

  const signalPicker = mountSignalPicker({ root: picker, selection });

  function axisId(metricKey) {
    return `axis_${metricKey}`;
  }

  function buildDatasets() {
    const reference = selection.reference;
    return selection.get().map((metricKey, index) => {
      const metric = METRIC_MAP[metricKey];
      return {
        label: t(metricLabelKey(metricKey)),
        metricKey,
        order: index,
        data: device.telemetry.series[metricKey],
        parsing: false,
        yAxisID: axisId(metricKey),
        borderColor: metric.color,
        backgroundColor: metric.color,
        pointRadius: 0,
        // The curve the axis is calibrated to is drawn heavier, so the ticks
        // read as belonging to it rather than to whichever trace is nearest.
        borderWidth: metricKey === reference ? 2.4 : 1.3,
        tension: 0.18
      };
    });
  }

  function buildScales() {
    const scales = {
      x: {
        type: "linear",
        min: chartNow - CHART_WINDOW_MS,
        max: chartNow,
        grid: { color: "rgba(23, 32, 42, 0.08)" },
        // Ticks are pinned to the window instead of to absolute time. Auto
        // ticks sit at round absolute timestamps, so on a window that slides
        // every frame the end ones keep crossing the edge -- they blink in and
        // out, and the rounded labels next to them jitter. Fixed relative
        // offsets give steady gridlines and labels that never change.
        afterBuildTicks: (axis) => {
          const ticks = [];
          for (let offset = CHART_WINDOW_MS; offset >= 0; offset -= X_TICK_STEP_MS) {
            ticks.push({ value: chartNow - offset });
          }
          axis.ticks = ticks;
        },
        ticks: {
          color: "#687583",
          callback: (value) => `${Math.round((value - chartNow) / 1000)}s`
        }
      }
    };

    // `position` stays set on the hidden axes too: Chart.js infers the axis
    // kind from it, and an id like "axis_vSecV" gives it nothing to go on.
    const reference = selection.reference;
    for (const metricKey of selection.get()) {
      const metric = METRIC_MAP[metricKey];
      const isReference = metricKey === reference;
      scales[axisId(metricKey)] = {
        type: "linear",
        position: "left",
        display: isReference,
        grid: { drawOnChartArea: isReference, color: "rgba(23, 32, 42, 0.08)" },
        ticks: { color: metric.color, maxTicksLimit: 7 },
        title: { display: true, text: t(metricAxisKey(metricKey)), color: metric.color }
      };
    }
    return scales;
  }

  /**
   * Keep the hover tooltip inside the plotting area. Chart.js only keeps it
   * inside the canvas, so hovering a point low in the plot drops the box onto
   * the time axis and hard against the frame. Clamping the anchor by half the
   * box height pulls it back above the axis at any panel size.
   */
  function registerTooltipPositioner() {
    const positioners = Chart.Tooltip && Chart.Tooltip.positioners;
    if (!positioners || positioners.insidePlot) return "nearest";
    positioners.insidePlot = function (items, eventPosition) {
      const base = positioners.nearest.call(this, items, eventPosition);
      if (!base) return base;
      const { top, bottom } = this.chart.chartArea;
      const margin = this.height / 2 + 6;
      const lowest = top + margin;
      const highest = bottom - margin;
      // Degenerate only if the panel is shorter than the box; centre then.
      const y = lowest > highest ? (top + bottom) / 2 : Math.min(Math.max(base.y, lowest), highest);
      return { x: base.x, y };
    };
    return "insidePlot";
  }

  function buildChart() {
    if (typeof Chart === "undefined") {
      setText(empty, t("plot.chartMissing"));
      setHidden(empty, false);
      log.error("Chart.js is not loaded");
      return;
    }
    const tooltipPosition = registerTooltipPositioner();
    const mono = getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim();
    chart = new Chart(canvas, {
      type: "line",
      data: { datasets: buildDatasets() },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        normalized: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "nearest",
            intersect: false,
            position: tooltipPosition,
            // Same surface as every other tip in the app: white, 1 px border,
            // mono type -- not Chart.js's dark default.
            backgroundColor: "#fff",
            borderColor: "#aeb7c2",
            borderWidth: 1,
            cornerRadius: 4,
            padding: 6,
            titleColor: "#17202a",
            bodyColor: "#17202a",
            bodyFont: { family: mono },
            callbacks: {
              // No title: it would be the raw performance.now() timestamp, a
              // number that only grows and means nothing. The time is already
              // on the axis.
              title: () => [],
              label: (context) =>
                `${t(metricLabelKey(context.dataset.metricKey))}: ${formatSig(context.parsed.y)}`
            }
          }
        },
        interaction: { mode: "nearest", intersect: false },
        scales: buildScales()
      }
    });
    window.requestAnimationFrame(animate);
  }

  /** Scroll the window. Runs every frame, so it must not allocate. */
  function refreshChart() {
    if (!chart) return;
    // While paused the window stays where it froze, so a redraw triggered from
    // elsewhere -- adding a signal, switching the axis, changing language --
    // re-renders the same interval instead of jumping to now and leaving the
    // frozen data behind the left edge.
    if (!device.telemetry.paused) chartNow = performance.now();
    // Assign through Chart.js's option proxy rather than into the object we
    // built: the proxy is what invalidates the resolver cache, so mutating the
    // raw options in place would leave the axis frozen at its first range.
    const x = chart.options.scales.x;
    x.min = chartNow - CHART_WINDOW_MS;
    x.max = chartNow;
    chart.update("none");
  }

  function animate(now) {
    if (!device.telemetry.paused && now - lastFrameAt >= FRAME_MIN_MS) {
      lastFrameAt = now;
      refreshChart();
    }
    window.requestAnimationFrame(animate);
  }

  /** Rebuild datasets + axes (selection, reference or language changed). */
  function syncChartConfig() {
    if (!chart) {
      setHidden(empty, selection.count() > 0);
      return;
    }
    chart.data.datasets = buildDatasets();
    chart.options.scales = buildScales();
    setHidden(empty, selection.count() > 0);
    refreshChart();
  }

  function renderLegend() {
    const keys = selection.get();
    legend.replaceChildren();
    if (keys.length === 0) {
      legend.append(h("span.legend-chip.is-empty", null, t("plot.noSignalsSelected")));
      return;
    }
    for (const key of keys) {
      const metric = METRIC_MAP[key];
      const name = t(metricLabelKey(key));
      // Clicking the chip calibrates the axis to this signal. The chip stays a
      // <span> because it is the drag handle for reordering -- a <button> would
      // swallow the dragstart -- so it carries the button role explicitly.
      const chip = h("span.legend-chip", {
        draggable: true,
        role: "button",
        tabindex: "0",
        dataset: { metricKey: key },
        style: { "--signal-color": metric.color },
        "data-tip": t("plot.useAsAxis", { name }),
        onclick: () => selection.setReference(key),
        onkeydown: (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          selection.setReference(key);
        }
      });
      const remove = h(
        "button.legend-remove",
        {
          type: "button",
          "aria-label": t("plot.removeSignal", { name }),
          onclick: (event) => {
            event.stopPropagation();
            selection.remove(key);
          }
        },
        "×"
      );
      chip.append(h("span.legend-swatch"), h("span.legend-name", null, name), remove);
      chip.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("text/plain", key);
        event.dataTransfer.effectAllowed = "move";
      });
      chip.addEventListener("dragover", (event) => event.preventDefault());
      chip.addEventListener("drop", (event) => {
        event.preventDefault();
        const sourceKey = event.dataTransfer.getData("text/plain");
        selection.reorder(sourceKey, key, event.offsetX < chip.offsetWidth / 2);
      });
      legend.append(chip);
    }
  }

  function setPickerOpen(open) {
    setHidden(picker, !open);
    setAttr(pickerToggle, "aria-expanded", String(open));
    setClass(pickerToggle, "is-active", open);
    if (open) signalPicker.focusSearch();
  }

  pickerToggle.addEventListener("click", () => setPickerOpen(picker.hidden));
  signalPicker.onClose(() => setPickerOpen(false));

  pauseButton.addEventListener("click", () => {
    device.telemetry.setPaused(!device.telemetry.paused);
    setAttr(pauseButton, "aria-pressed", String(device.telemetry.paused));
    setText(pauseLabel, device.telemetry.paused ? t("plot.resume") : t("plot.pause"));
  });

  resetButton.addEventListener("click", () => selection.restoreDefaults());

  selection.subscribe(() => syncChartConfig());
  onLanguageChange(() => {
    legendVersion = "";
    syncChartConfig();
  });

  buildChart();
  syncChartConfig();

  registerView("telemetry-panel", () => {
    const keys = selection.get();
    const version = `${keys.join("|")}::${t("plot.pause")}`;
    if (version !== legendVersion) {
      legendVersion = version;
      renderLegend();
    }

    // Which chip owns the axis is per-frame state, so it is written here rather
    // than by rebuilding the chips (a rebuild would drop keyboard focus).
    const reference = selection.reference;
    for (const chip of legend.children) {
      const key = chip.dataset.metricKey;
      if (!key) continue;
      const isReference = key === reference;
      setClass(chip, "is-reference", isReference);
      setAttr(chip, "aria-pressed", String(isReference));
      setAttr(
        chip,
        "data-tip",
        isReference
          ? t("plot.isAxisReference")
          : t("plot.useAsAxis", { name: t(metricLabelKey(key)) })
      );
    }

    const summary = keys.length === 0 ? t("plot.noSignals") : t("plot.selectedCount", { n: keys.length });
    setText(selectionSummary, summary);
    setText(subtitle, keys.length === 0 ? t("plot.noSignals") : keys.map((key) => t(metricLabelKey(key))).join(" / "));
    setText(pauseLabel, device.telemetry.paused ? t("plot.resume") : t("plot.pause"));
    setDisabled(resetButton, selection.isDefault());
    signalPicker.sync();
  });
}

exports.mountTelemetryPanel = mountTelemetryPanel;
});
