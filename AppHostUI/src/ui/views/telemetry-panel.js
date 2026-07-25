// Telemetry panel: the scrolling multi-signal plot and its legend.
//
// The panel's grid rows (header / legend / chart) are fixed and always present,
// so nothing that happens elsewhere in the app can resize the chart. The signal
// picker is an absolutely positioned overlay inside the chart area for the same
// reason.

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
        borderWidth: 1.8,
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
        ticks: {
          color: "#687583",
          callback: (value) => `${((value - chartNow) / 1000).toFixed(0)}s`
        }
      }
    };

    let leftCount = 0;
    let rightCount = 0;
    selection.get().forEach((metricKey, index) => {
      const metric = METRIC_MAP[metricKey];
      const position = index % 2 === 0 ? "left" : "right";
      const offset = position === "left" ? leftCount > 0 : rightCount > 0;
      if (position === "left") leftCount += 1;
      else rightCount += 1;
      scales[axisId(metricKey)] = {
        type: "linear",
        position,
        offset,
        grid: { drawOnChartArea: index === 0, color: "rgba(23, 32, 42, 0.08)" },
        ticks: { color: metric.color, maxTicksLimit: 5 },
        title: { display: true, text: t(metricAxisKey(metricKey)), color: metric.color }
      };
    });
    return scales;
  }

  function buildChart() {
    if (typeof Chart === "undefined") {
      setText(empty, t("plot.chartMissing"));
      setHidden(empty, false);
      log.error("Chart.js is not loaded");
      return;
    }
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
            callbacks: {
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

  function refreshChart() {
    if (!chart) return;
    chartNow = performance.now();
    chart.options.scales = buildScales();
    chart.update("none");
  }

  function animate(now) {
    if (!device.telemetry.paused && now - lastFrameAt >= FRAME_MIN_MS) {
      lastFrameAt = now;
      refreshChart();
    }
    window.requestAnimationFrame(animate);
  }

  /** Rebuild datasets + axes (selection or language changed). */
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
      const chip = h("span.legend-chip", {
        draggable: true,
        dataset: { metricKey: key },
        style: { "--signal-color": metric.color }
      });
      const remove = h(
        "button.legend-remove",
        {
          type: "button",
          "aria-label": t("plot.removeSignal", { name: t(metricLabelKey(key)) }),
          onclick: () => selection.remove(key)
        },
        "×"
      );
      chip.append(h("span.legend-swatch"), h("span", null, t(metricLabelKey(key))), remove);
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
