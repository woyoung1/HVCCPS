// Minimal synchronous event bus.
//
// This is the ONLY channel plugins use to observe the app, so the event names
// are part of the public plugin contract -- see plugins/api.js for the list.
// Handlers are isolated: one throwing handler never stops the others.

HV.define("core/bus", function (require, exports) {
"use strict";

const { logger } = require("core/logger");

function createBus() {
  /** @type {Map<string, Set<Function>>} */
  const handlers = new Map();

  function on(event, handler) {
    if (typeof handler !== "function") throw new TypeError("bus.on requires a function");
    let set = handlers.get(event);
    if (!set) {
      set = new Set();
      handlers.set(event, set);
    }
    set.add(handler);
    return () => off(event, handler);
  }

  function once(event, handler) {
    const dispose = on(event, (payload) => {
      dispose();
      handler(payload);
    });
    return dispose;
  }

  function off(event, handler) {
    const set = handlers.get(event);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) handlers.delete(event);
  }

  function emit(event, payload) {
    const set = handlers.get(event);
    if (!set) return;
    // Copy so a handler that unsubscribes mid-dispatch cannot corrupt iteration.
    for (const handler of Array.from(set)) {
      try {
        handler(payload);
      } catch (error) {
        logger.error(`bus handler failed for "${event}"`, error);
      }
    }
  }

  return { on, once, off, emit };
}

const bus = createBus();

/**
 * Event names emitted by the application core. Kept as a frozen table so
 * plugins can reference them symbolically instead of typing raw strings.
 */
const EVENTS = Object.freeze({
  LINK_CHANGE: "link:change",
  LINK_OPEN: "link:open",
  LINK_CLOSE: "link:close",
  HEARTBEAT: "telemetry:heartbeat",
  OUTPUT_CHANGE: "output:change",
  OUTPUT_STARTED: "output:started",
  OUTPUT_STOPPED: "output:stopped",
  FRAME_RX: "frame:rx",
  FRAME_TX: "frame:tx",
  CONFIG_SNAPSHOT: "config:snapshot",
  CAL_INFO: "cal:info",
  LANGUAGE_CHANGE: "language:change",
  TOAST: "ui:toast",
  STATE_CHANGE: "ui:state"
});

exports.createBus = createBus;
exports.bus = bus;
exports.EVENTS = EVENTS;
});
