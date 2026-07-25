// Single rAF render scheduler.
//
// Every source of change -- a heartbeat at 20 Hz, an operator keystroke, a
// language switch -- calls `requestRender()`. Views are synced at most once per
// animation frame, in registration order, in ONE pass. That is what makes the
// language switch a single relayout instead of hundreds of interleaved DOM
// mutations, and it keeps the 20 Hz telemetry stream from starving input.

HV.define("core/scheduler", function (require, exports) {
"use strict";

const { logger } = require("core/logger");

const views = [];
let frame = 0;
let dirty = false;

/**
 * Register a sync callback. Returns a disposer.
 * Callbacks must be idempotent and cheap -- they run every frame the app is
 * dirty, so they should compare-then-write (see core/dom.js setters).
 */
function registerView(name, sync) {
  const entry = { name, sync };
  views.push(entry);
  return () => {
    const index = views.indexOf(entry);
    if (index >= 0) views.splice(index, 1);
  };
}

function requestRender() {
  dirty = true;
  if (frame !== 0) return;
  frame = window.requestAnimationFrame(runFrame);
}

function runFrame() {
  frame = 0;
  if (!dirty) return;
  dirty = false;
  for (const entry of views) {
    try {
      entry.sync();
    } catch (error) {
      logger.error(`view sync failed: ${entry.name}`, error);
    }
  }
}

/** Force an immediate synchronous pass (used right after mount). */
function renderNow() {
  dirty = false;
  if (frame !== 0) {
    window.cancelAnimationFrame(frame);
    frame = 0;
  }
  for (const entry of views) {
    try {
      entry.sync();
    } catch (error) {
      logger.error(`view sync failed: ${entry.name}`, error);
    }
  }
}

exports.registerView = registerView;
exports.requestRender = requestRender;
exports.renderNow = renderNow;
});
