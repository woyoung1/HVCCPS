// Which telemetry signals are plotted, in which order, and which one the Y axis
// is calibrated to.
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
const REFERENCE_STORAGE_KEY = "chart.reference.v1";

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

/**
 * The plotted signal the visible Y axis is calibrated to. Every other curve is
 * auto-scaled to fill the plot but carries no axis, so the one scale on screen
 * always belongs to a curve on screen -- there is no second axis to misread a
 * value against. Falls back to the first plotted signal.
 */
function resolveReference(candidate, keys) {
  return keys.includes(candidate) ? candidate : keys[0] || null;
}

function createChartSelection() {
  const stored = normalize(readJson(STORAGE_AREA, STORAGE_KEY, null));
  let keys = stored.length > 0 ? stored : DEFAULT_CHART_METRICS.slice();
  let reference = resolveReference(readJson(STORAGE_AREA, REFERENCE_STORAGE_KEY, null), keys);
  const listeners = new Set();

  function emit() {
    writeJson(STORAGE_AREA, STORAGE_KEY, keys);
    writeJson(STORAGE_AREA, REFERENCE_STORAGE_KEY, reference);
    for (const listener of listeners) listener(keys.slice());
    requestRender();
  }

  return {
    get: () => keys.slice(),
    has: (key) => keys.includes(key),
    count: () => keys.length,

    get reference() {
      return reference;
    },

    /** Calibrate the Y axis to `key`. Ignored unless `key` is plotted. */
    setReference(key) {
      const next = resolveReference(key, keys);
      if (next === reference) return;
      reference = next;
      emit();
    },

    set(next) {
      keys = normalize(next);
      reference = resolveReference(reference, keys);
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
      reference = DEFAULT_CHART_METRICS[0];
      this.set(DEFAULT_CHART_METRICS.slice());
    },

    isDefault() {
      return (
        keys.length === DEFAULT_CHART_METRICS.length &&
        keys.every((key, index) => key === DEFAULT_CHART_METRICS[index]) &&
        reference === DEFAULT_CHART_METRICS[0]
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
