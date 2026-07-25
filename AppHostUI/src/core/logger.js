// Scoped console logger. Every module logs through here so the prefix stays
// consistent and a future log sink (plugin, file export) only has to hook one
// place instead of every call site.

HV.define("core/logger", function (require, exports) {
"use strict";

const PREFIX = "HVCCPS";

const sinks = new Set();

function emit(level, scope, message, detail) {
  const line = `[${PREFIX}/${scope}] ${message}`;
  if (level === "error") console.error(line, detail ?? "");
  else if (level === "warn") console.warn(line, detail ?? "");
  else console.log(line, detail ?? "");
  for (const sink of sinks) {
    try {
      sink({ level, scope, message, detail, at: Date.now() });
    } catch (_) {
      /* a broken sink must never break the app */
    }
  }
}

/** Register an extra log destination (used by the frame-inspector plugin). */
function addLogSink(sink) {
  sinks.add(sink);
  return () => sinks.delete(sink);
}

function createLogger(scope) {
  return {
    info: (message, detail) => emit("info", scope, message, detail),
    warn: (message, detail) => emit("warn", scope, message, detail),
    error: (message, detail) => emit("error", scope, message, detail),
    child: (sub) => createLogger(`${scope}/${sub}`)
  };
}

const logger = createLogger("app");

exports.addLogSink = addLogSink;
exports.createLogger = createLogger;
exports.logger = logger;
});
