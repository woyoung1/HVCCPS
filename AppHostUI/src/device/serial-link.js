// WebSerial transport.
//
// Owns exactly one thing: bytes in and out of an authorised serial port,
// including the keep-alive reconnect loop. It knows nothing about frames,
// telemetry or the UI -- decoding lives in device-service.js.

HV.define("device/serial-link", function (require, exports) {
"use strict";

const { bus, EVENTS } = require("core/bus");
const { createLogger } = require("core/logger");
const { codedError, ERR } = require("core/notify");

const log = createLogger("serial");

const BAUD_RATE = 115200;
const RECONNECT_DELAY_MS = 500;

function createSerialLink({ onData }) {
  const state = {
    selectedPort: null,
    port: null,
    reader: null,
    readTask: null,
    connected: false,
    connectInProgress: false,
    autoReconnectEnabled: false,
    disconnectRequested: false,
    reconnectTimer: 0,
    reconnectAttempt: 0
  };

  function supported() {
    return "serial" in navigator;
  }

  function snapshot() {
    const connecting = !state.connected && state.connectInProgress;
    const reconnecting = !state.connected && !connecting && state.autoReconnectEnabled && !!state.selectedPort;
    return {
      supported: supported(),
      connected: state.connected,
      connecting,
      reconnecting,
      attempt: state.reconnectAttempt,
      hasPort: !!state.selectedPort,
      portInfo: portInfo(state.selectedPort)
    };
  }

  function announce() {
    bus.emit(EVENTS.LINK_CHANGE, snapshot());
  }

  function portInfo(port) {
    if (!port || typeof port.getInfo !== "function") return null;
    const info = port.getInfo();
    const parts = [];
    if (typeof info.usbVendorId === "number") parts.push(`VID ${info.usbVendorId.toString(16).padStart(4, "0")}`);
    if (typeof info.usbProductId === "number") parts.push(`PID ${info.usbProductId.toString(16).padStart(4, "0")}`);
    return parts.length > 0 ? parts.join(" / ") : "";
  }

  async function selectPort() {
    if (!supported()) throw codedError(ERR.NO_WEB_SERIAL);
    state.selectedPort = await navigator.serial.requestPort();
    announce();
    return state.selectedPort;
  }

  function clearReconnectTimer() {
    if (state.reconnectTimer) {
      window.clearTimeout(state.reconnectTimer);
      state.reconnectTimer = 0;
    }
  }

  function scheduleReconnect(reason) {
    if (!state.autoReconnectEnabled || state.disconnectRequested || !state.selectedPort) return;
    if (state.connected || state.connectInProgress || state.reconnectTimer) return;
    state.reconnectAttempt += 1;
    log.warn(`${reason} -- reconnect attempt ${state.reconnectAttempt}`);
    bus.emit(EVENTS.LINK_CLOSE, { reason, willReconnect: true, attempt: state.reconnectAttempt });
    state.reconnectTimer = window.setTimeout(() => {
      state.reconnectTimer = 0;
      void connect();
    }, RECONNECT_DELAY_MS);
    announce();
  }

  async function finalize(reason, shouldReconnect) {
    const port = state.port;
    state.connected = false;
    state.port = null;
    state.reader = null;
    state.readTask = null;
    if (!shouldReconnect) state.disconnectRequested = false;
    try {
      if (port && port.readable) await port.close();
    } catch (error) {
      log.error("port close failed", error);
    }
    if (shouldReconnect) {
      scheduleReconnect(reason);
    } else {
      bus.emit(EVENTS.LINK_CLOSE, { reason, willReconnect: false, attempt: 0 });
    }
    announce();
  }

  async function readLoop() {
    const port = state.port;
    const reader = port.readable.getReader();
    state.reader = reader;
    try {
      for (;;) {
        const result = await reader.read();
        if (result.done) break;
        if (result.value) onData(result.value);
      }
    } catch (error) {
      if (!state.disconnectRequested) log.error("serial read failed", error);
    } finally {
      try {
        reader.releaseLock();
      } catch (error) {
        log.error("reader release failed", error);
      }
      if (state.port === port) {
        const manual = state.disconnectRequested;
        await finalize(manual ? "manual" : "linkClosed", !manual);
      }
    }
  }

  async function connect() {
    if (state.connected || !state.selectedPort) return;
    clearReconnectTimer();
    state.autoReconnectEnabled = true;
    state.disconnectRequested = false;
    state.connectInProgress = true;
    announce();
    try {
      await state.selectedPort.open({ baudRate: BAUD_RATE });
      if (!state.autoReconnectEnabled || state.disconnectRequested) {
        try {
          await state.selectedPort.close();
        } catch (closeError) {
          log.error("port close after cancelled connect failed", closeError);
        }
        state.connectInProgress = false;
        announce();
        return;
      }
      state.port = state.selectedPort;
      state.connected = true;
      state.connectInProgress = false;
      state.reconnectAttempt = 0;
      state.readTask = readLoop();
      bus.emit(EVENTS.LINK_OPEN, snapshot());
      announce();
    } catch (error) {
      state.connected = false;
      state.port = null;
      state.connectInProgress = false;
      log.error("connect failed", error);
      try {
        if (state.selectedPort && state.selectedPort.readable) await state.selectedPort.close();
      } catch (closeError) {
        log.error("port close after failed connect failed", closeError);
      }
      if (state.autoReconnectEnabled && !state.disconnectRequested) {
        scheduleReconnect("connectFailed");
      } else {
        announce();
        throw error;
      }
      announce();
    }
  }

  async function disconnect() {
    state.autoReconnectEnabled = false;
    state.disconnectRequested = true;
    clearReconnectTimer();
    if (!state.port) {
      state.connectInProgress = false;
      state.connected = false;
      bus.emit(EVENTS.LINK_CLOSE, { reason: "manual", willReconnect: false, attempt: 0 });
      announce();
      return;
    }
    try {
      if (state.reader) await state.reader.cancel();
    } catch (error) {
      log.error("reader cancel failed", error);
    }
    try {
      if (state.readTask) await state.readTask;
    } catch (error) {
      log.error("read task settle failed", error);
    }
  }

  async function write(frame) {
    if (!state.port || !state.connected || !state.port.writable) throw codedError(ERR.NOT_CONNECTED);
    const writer = state.port.writable.getWriter();
    try {
      await writer.write(frame);
    } finally {
      writer.releaseLock();
    }
  }

  return {
    supported,
    snapshot,
    selectPort,
    connect,
    disconnect,
    write,
    isConnected: () => state.connected,
    canDisconnect: () => state.connected || state.autoReconnectEnabled || state.connectInProgress
  };
}

exports.createSerialLink = createSerialLink;
exports.BAUD_RATE = BAUD_RATE;
});
