// Telemetry metric catalogue.
//
// One row per plottable / displayable quantity. Everything downstream (chart,
// signal picker, readings list, plugins) is generated from this table, so
// adding a signal is a one-line change here and nowhere else.
//
// `label` / `axis` are i18n KEYS resolved at render time -- never literals --
// which is why switching language re-labels the chart without rebuilding it.

HV.define("device/metrics", function (require, exports) {
"use strict";

const { CPU_CYCLE_NS, formatCurrentMa, formatCyclesUs, formatHex, formatPercentRatio, formatPowerMw, formatSig, formatTemperatureMc, formatUnit, formatVoltageMv } = require("core/format");
const { RUN_CONTINUOUS } = require("protocol/index");

/** P_out = Vsec * Isec. vSecMv [mV] * iSecMa [mA] = 1e-6 W = uW; /1000 -> mW. */
function outputPowerMw(latest) {
  return (latest.vSecMv * latest.iSecMa) / 1000;
}

/**
 * Input power comes from the primary DC bus current (IPRI_DC). IPRI_AC carries
 * PSFB reactive current and is a peak-only protection readout, not real power.
 */
function efficiencyRatio(latest) {
  const inputPower = latest.iPriDcMa * latest.vPriMv;
  const outputPower = latest.iSecMa * latest.vSecMv;
  return inputPower === 0 ? NaN : outputPower / inputPower;
}

const METRIC_GROUPS = Object.freeze([
  "voltage",
  "current",
  "power",
  "temperature",
  "control",
  "isr",
  "status",
  "debug"
]);

const TELEMETRY_METRICS = Object.freeze([
  { key: "vSecV", group: "voltage", color: "#b45309", read: (l) => l.vSecMv / 1000, format: (l) => formatVoltageMv(l.vSecMv) },
  { key: "vPriV", group: "voltage", color: "#ca8a04", read: (l) => l.vPriMv / 1000, format: (l) => formatVoltageMv(l.vPriMv) },
  { key: "aux12V", group: "voltage", color: "#7c3aed", read: (l) => l.aux12Mv / 1000, format: (l) => formatVoltageMv(l.aux12Mv) },
  { key: "aux5V", group: "voltage", color: "#9333ea", read: (l) => l.aux5Mv / 1000, format: (l) => formatVoltageMv(l.aux5Mv) },
  { key: "vccV", group: "voltage", color: "#2563eb", read: (l) => l.vccMv / 1000, format: (l) => formatVoltageMv(l.vccMv) },
  { key: "cvTargetV", group: "voltage", color: "#0891b2", read: (l) => l.cvTargetMv / 1000, format: (l) => formatVoltageMv(l.cvTargetMv) },

  { key: "iSecmA", group: "current", color: "#0f766e", read: (l) => l.iSecMa, format: (l) => formatCurrentMa(l.iSecMa) },
  { key: "iPriAcA", group: "current", color: "#16a34a", read: (l) => l.iPriAcMa / 1000, format: (l) => formatCurrentMa(l.iPriAcMa) },
  { key: "iPriDcA", group: "current", color: "#15803d", read: (l) => l.iPriDcMa / 1000, format: (l) => formatCurrentMa(l.iPriDcMa) },
  { key: "ccTargetmA", group: "current", color: "#0d9488", read: (l) => l.ccTargetMa, format: (l) => formatCurrentMa(l.ccTargetMa) },

  { key: "cpTargetW", group: "power", color: "#ea580c", read: (l) => l.cpTargetMw / 1000, format: (l) => formatPowerMw(l.cpTargetMw) },
  { key: "outputPowerW", group: "power", color: "#d97706", read: (l) => outputPowerMw(l) / 1000, format: (l) => formatPowerMw(outputPowerMw(l)) },
  { key: "efficiencyPct", group: "power", color: "#b91c1c", read: (l) => efficiencyRatio(l) * 100, format: (l) => formatPercentRatio(efficiencyRatio(l)) },

  { key: "mosTempC", group: "temperature", color: "#dc2626", read: (l) => l.mosTempMc / 1000, format: (l) => formatTemperatureMc(l.mosTempMc) },
  { key: "internalTempC", group: "temperature", color: "#be123c", read: (l) => l.internalTempMc / 1000, format: (l) => formatTemperatureMc(l.internalTempMc) },

  { key: "dutyPct", group: "control", color: "#334155", read: (l) => l.duty * 100, format: (l) => formatPercentRatio(l.duty) },
  { key: "freqKHz", group: "control", color: "#0f766e", read: (l) => l.currentFreqHz / 1000, format: (l) => (l.currentFreqHz > 0 ? `${formatSig(l.currentFreqHz / 1000)} kHz` : "--") },
  { key: "cvValuePct", group: "control", color: "#0284c7", read: (l) => l.cvValue * 100, format: (l) => formatPercentRatio(l.cvValue) },
  { key: "cvIntegral", group: "control", color: "#0369a1", read: (l) => l.cvIntegral, format: (l) => formatUnit(l.cvIntegral, "") },
  { key: "ccValuePct", group: "control", color: "#047857", read: (l) => l.ccValue * 100, format: (l) => formatPercentRatio(l.ccValue) },
  { key: "ccIntegral", group: "control", color: "#166534", read: (l) => l.ccIntegral, format: (l) => formatUnit(l.ccIntegral, "") },
  { key: "cpValuePct", group: "control", color: "#c2410c", read: (l) => l.cpValue * 100, format: (l) => formatPercentRatio(l.cpValue) },
  { key: "cpIntegral", group: "control", color: "#9a3412", read: (l) => l.cpIntegral, format: (l) => formatUnit(l.cpIntegral, "") },

  { key: "isrLastUs", group: "isr", color: "#0ea5e9", read: (l) => (l.isrCyclesLast * CPU_CYCLE_NS) / 1000, format: (l) => formatCyclesUs(l.isrCyclesLast) },
  { key: "isrMinUs", group: "isr", color: "#0284c7", read: (l) => (l.isrCyclesMin * CPU_CYCLE_NS) / 1000, format: (l) => formatCyclesUs(l.isrCyclesMin) },
  { key: "isrMaxUs", group: "isr", color: "#dc2626", read: (l) => (l.isrCyclesMax * CPU_CYCLE_NS) / 1000, format: (l) => formatCyclesUs(l.isrCyclesMax) },

  { key: "statusFlags", group: "status", color: "#71717a", read: (l) => l.statusFlags, format: (l) => formatHex(l.statusFlags) },
  { key: "keyFlags", group: "status", color: "#52525b", read: (l) => l.keyFlags, format: (l) => formatHex(l.keyFlags) },
  { key: "controlMode", group: "status", color: "#3f3f46", read: (l) => l.controlMode, format: (l) => String(l.controlMode) },

  { key: "configOk", group: "debug", color: "#15803d", read: (l) => (l.configOk ? 1 : 0), format: (l) => (l.configOk ? "1" : "0") },
  { key: "fixedDutyActive", group: "debug", color: "#a16207", read: (l) => (l.fixedDutyActive ? 1 : 0), format: (l) => (l.fixedDutyActive ? "1" : "0") },
  { key: "rawVSecV", group: "debug", color: "#92400e", read: (l) => l.rawVSecMv / 1000, format: (l) => formatVoltageMv(l.rawVSecMv) },
  { key: "rawISecmA", group: "debug", color: "#115e59", read: (l) => l.rawISecMa, format: (l) => formatCurrentMa(l.rawISecMa) },
  {
    key: "runSecondsRemaining",
    group: "debug",
    color: "#6d28d9",
    read: (l) => (l.runSecondsRemaining === RUN_CONTINUOUS ? 0 : l.runSecondsRemaining),
    format: (l) =>
      l.runSecondsRemaining === 0 ? "0 s" : l.runSecondsRemaining === RUN_CONTINUOUS ? "CONT" : `${l.runSecondsRemaining} s`
  }
]);

const METRIC_MAP = Object.freeze(Object.fromEntries(TELEMETRY_METRICS.map((m) => [m.key, m])));

/** Metrics promoted to the big cards at the top of the status panel. */
const KEY_METRIC_KEYS = Object.freeze([
  "vSecV",
  "iSecmA",
  "iPriAcA",
  "iPriDcA",
  "vPriV",
  "cvTargetV",
  "ccTargetmA",
  "cpTargetW",
  "outputPowerW"
]);

/** Metrics that live in the collapsed "Raw / Debug" section. */
const DEBUG_METRIC_KEYS = new Set([
  "statusFlags",
  "keyFlags",
  "controlMode",
  "configOk",
  "fixedDutyActive",
  "rawVSecV",
  "rawISecmA",
  "runSecondsRemaining"
]);

const DEFAULT_CHART_METRICS = Object.freeze(["vSecV", "iSecmA", "iPriAcA"]);

function metricLabelKey(key) {
  return `metric.${key}`;
}

function metricAxisKey(key) {
  return `axis.${key}`;
}

exports.outputPowerMw = outputPowerMw;
exports.efficiencyRatio = efficiencyRatio;
exports.metricLabelKey = metricLabelKey;
exports.metricAxisKey = metricAxisKey;
exports.METRIC_GROUPS = METRIC_GROUPS;
exports.TELEMETRY_METRICS = TELEMETRY_METRICS;
exports.METRIC_MAP = METRIC_MAP;
exports.KEY_METRIC_KEYS = KEY_METRIC_KEYS;
exports.DEBUG_METRIC_KEYS = DEBUG_METRIC_KEYS;
exports.DEFAULT_CHART_METRICS = DEFAULT_CHART_METRICS;
});
