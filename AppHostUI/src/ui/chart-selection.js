// Which telemetry signals are plotted, in which order.
//
// Shared by the plot header, the legend and the signal picker, and captured by
// the undo stack -- so it lives outside all three instead of inside any of them.

HV.define("ui/chart-selection", function (require, exports) {
"use strict";

const { requestRender } = require("core/scheduler");
const { readJson, writeJson } = require("core/storage");
const { DEFAULT_CHART_METRICS, METRIC_MAP } = require("device/metrics");

const STORAGE_AREA = "app";
const STORAGE_KEY = "chart.selection.v2";

function normalize(keys) {
  if (!Array.isArray(keys)) return [];
  const seen = new Set();
  const out = [];
  for (const key of keys) {
    if (typeof key === "string" && METRIC_MAP[key] && !seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

function createChartSelection() {
  const stored = normalize(readJson(STORAGE_AREA, STORAGE_KEY, null));
  let keys = stored.length > 0 ? stored : DEFAULT_CHART_METRICS.slice();
  const listeners = new Set();

  function emit() {
    writeJson(STORAGE_AREA, STORAGE_KEY, keys);
    for (const listener of listeners) listener(keys.slice());
    requestRender();
  }

  return {
    get: () => keys.slice(),
    has: (key) => keys.includes(key),
    count: () => keys.length,

    set(next) {
      keys = normalize(next);
      emit();
    },

    toggle(key, on) {
      const set = new Set(keys);
      if (on) set.add(key);
      else set.delete(key);
      this.set(Array.from(set));
    },

    remove(key) {
      this.set(keys.filter((item) => item !== key));
    },

    reorder(sourceKey, targetKey, insertBefore) {
      if (!sourceKey || sourceKey === targetKey) return;
      const next = keys.filter((key) => key !== sourceKey);
      let index = next.indexOf(targetKey);
      if (index < 0) return;
      if (!insertBefore) index += 1;
      next.splice(index, 0, sourceKey);
      this.set(next);
    },

    restoreDefaults() {
      this.set(DEFAULT_CHART_METRICS.slice());
    },

    isDefault() {
      return (
        keys.length === DEFAULT_CHART_METRICS.length &&
        keys.every((key, index) => key === DEFAULT_CHART_METRICS[index])
      );
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

exports.createChartSelection = createChartSelection;
});
