// Number / unit formatting. Pure functions, no DOM, no app state -- so both the
// views and any plugin can format identically without importing UI code.

HV.define("core/format", function (require, exports) {
"use strict";

const CPU_CLOCK_HZ = 170_000_000;
const CPU_CYCLE_NS = 1e9 / CPU_CLOCK_HZ;

/** 4 significant digits, trailing zeros stripped, -0 normalised to 0. */
function formatSig(value, digits = 4) {
  if (!Number.isFinite(value)) return "0";
  if (Object.is(value, -0) || value === 0) return "0";
  const text = Number(value).toPrecision(digits);
  return text.includes(".") ? text.replace(/\.?0+$/, "") : text;
}

function formatVoltageMv(mV) {
  return Math.abs(mV) < 1000 ? `${formatSig(mV)} mV` : `${formatSig(mV / 1000)} V`;
}

function formatCurrentMa(mA) {
  return Math.abs(mA) < 1000 ? `${formatSig(mA)} mA` : `${formatSig(mA / 1000)} A`;
}

function formatPowerMw(mW) {
  return Math.abs(mW) < 1000 ? `${formatSig(mW)} mW` : `${formatSig(mW / 1000)} W`;
}

function formatTemperatureMc(mC) {
  return `${formatSig(mC / 1000)} C`;
}

function formatPercentRatio(value) {
  return `${formatSig(value * 100)} %`;
}

function formatDurationMs(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "0 s";
  return ms < 1000 ? `${Math.round(ms)} ms` : `${formatSig(ms / 1000)} s`;
}

function formatCyclesUs(cycles) {
  if (!Number.isFinite(cycles) || cycles === 0) return "0 us";
  return `${formatSig((cycles * CPU_CYCLE_NS) / 1000)} us`;
}

function formatUnit(value, unit) {
  return unit ? `${formatSig(value)} ${unit}` : formatSig(value);
}

function formatHex(value, width = 2) {
  return `0x${(value >>> 0).toString(16).padStart(width, "0")}`;
}

function formatBytesHex(bytes, limit = Infinity) {
  const out = [];
  const count = Math.min(bytes.length, limit);
  for (let i = 0; i < count; i += 1) out.push(bytes[i].toString(16).padStart(2, "0"));
  if (bytes.length > count) out.push(`... +${bytes.length - count}`);
  return out.join(" ");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

exports.formatSig = formatSig;
exports.formatVoltageMv = formatVoltageMv;
exports.formatCurrentMa = formatCurrentMa;
exports.formatPowerMw = formatPowerMw;
exports.formatTemperatureMc = formatTemperatureMc;
exports.formatPercentRatio = formatPercentRatio;
exports.formatDurationMs = formatDurationMs;
exports.formatCyclesUs = formatCyclesUs;
exports.formatUnit = formatUnit;
exports.formatHex = formatHex;
exports.formatBytesHex = formatBytesHex;
exports.clamp = clamp;
exports.CPU_CLOCK_HZ = CPU_CLOCK_HZ;
exports.CPU_CYCLE_NS = CPU_CYCLE_NS;
});
