// Service-layer messaging.
//
// Services never touch the DOM: they emit a localisation KEY on the bus and the
// toast view renders it. That keeps every user-facing string in the locale
// files and lets a plugin observe (or suppress) messages if it wants to.

HV.define("core/notify", function (require, exports) {
"use strict";

const { bus, EVENTS } = require("core/bus");
const { t } = require("i18n/index");

/** Turn a thrown value into display text, preferring a coded i18n message. */
function describeError(error) {
  if (!error) return "";
  if (error.code && t(`err.${error.code}`) !== `err.${error.code}`) return t(`err.${error.code}`);
  return error.message || String(error);
}

function notify(key, params = null) {
  bus.emit(EVENTS.TOAST, { level: "info", key, params });
}

function notifyError(key, params = null) {
  bus.emit(EVENTS.TOAST, { level: "error", key, params });
}

/** Report a failed operation: `key` must accept an {error} parameter. */
function notifyFailure(key, error) {
  bus.emit(EVENTS.TOAST, { level: "error", key, params: { error: describeError(error) } });
}

/** Error carrying a stable code so the UI can localise it. */
function codedError(code, fallbackMessage) {
  const error = new Error(fallbackMessage || code);
  error.code = code;
  return error;
}

const ERR = Object.freeze({
  NOT_CONNECTED: "notConnected",
  CONFIG_PENDING: "configPending",
  CAL_PENDING: "calPending",
  CONFIG_TIMEOUT: "configTimeout",
  CAL_TIMEOUT: "calTimeout",
  OUTPUT_LIVE: "outputLive",
  NO_WEB_SERIAL: "noWebSerial"
});

exports.describeError = describeError;
exports.notify = notify;
exports.notifyError = notifyError;
exports.notifyFailure = notifyFailure;
exports.codedError = codedError;
exports.ERR = ERR;
});
