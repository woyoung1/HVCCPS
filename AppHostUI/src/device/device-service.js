// Frame-level device client.
//
// Sits between the raw byte transport (serial-link.js) and every feature
// service. Responsibilities:
//   * run the three frame decoders over the inbound stream
//   * turn request/response protocols into promises (sequence + timeout)
//   * broadcast decoded traffic on the bus so plugins can observe it
//
// It holds no UI state and shows no messages.

HV.define("device/device-service", function (require, exports) {
"use strict";

const { bus, EVENTS } = require("core/bus");
const { createLogger } = require("core/logger");
const { codedError, ERR } = require("core/notify");
const { requestRender } = require("core/scheduler");
const { buildCalGetInfoFrame, createCalResponseDecoder, createConfigResponseDecoder, createHeartbeatDecoder, CONFIG_OP_GET_SNAPSHOT, CONFIG_OP_SET_FIELD, buildConfigRequest, buildConfigSetFieldRequest, parseCalResponseFrame, parseConfigResponseFrame } = require("protocol/index");
const { createSerialLink } = require("device/serial-link");
const { createTelemetry } = require("device/telemetry");

const log = createLogger("device");

const CONFIG_REQUEST_TIMEOUT_MS = 1800;
const CAL_REQUEST_TIMEOUT_MS = 7000;

function createDeviceService() {
  const telemetry = createTelemetry();
  const heartbeatDecoder = createHeartbeatDecoder();
  const configDecoder = createConfigResponseDecoder();
  const calDecoder = createCalResponseDecoder();

  const pending = { config: null, cal: null };
  let configSequence = 0;
  let calInfo = null;

  const link = createSerialLink({ onData: feedRx });

  function feedRx(chunk) {
    bus.emit(EVENTS.FRAME_RX, { kind: "bytes", bytes: chunk });

    for (const frame of heartbeatDecoder.feed(chunk)) {
      try {
        const now = performance.now();
        const transition = telemetry.ingest(frame, now);
        bus.emit(EVENTS.FRAME_RX, { kind: "heartbeat", bytes: frame });
        bus.emit(EVENTS.HEARTBEAT, { latest: telemetry.latest, now, ...transition });
        if (transition.enabled !== transition.wasEnabled) {
          bus.emit(transition.enabled ? EVENTS.OUTPUT_STARTED : EVENTS.OUTPUT_STOPPED, { latest: telemetry.latest });
          bus.emit(EVENTS.OUTPUT_CHANGE, { live: transition.enabled, latest: telemetry.latest });
        }
        requestRender();
      } catch (error) {
        log.error("heartbeat parse failed", error);
      }
    }

    for (const frame of configDecoder.feed(chunk)) handleConfigResponse(frame);
    for (const frame of calDecoder.feed(chunk)) handleCalResponse(frame);
  }

  function handleConfigResponse(frame) {
    let response;
    try {
      response = parseConfigResponseFrame(frame);
    } catch (error) {
      log.error("config response parse failed", error);
      return;
    }
    bus.emit(EVENTS.FRAME_RX, { kind: "config", bytes: frame, response });
    if (response.status === 0 && response.op === CONFIG_OP_GET_SNAPSHOT) {
      bus.emit(EVENTS.CONFIG_SNAPSHOT, { draft: response.draft, active: response.active });
    }
    if (!pending.config || pending.config.sequence !== response.sequence) return;
    window.clearTimeout(pending.config.timeout);
    const entry = pending.config;
    pending.config = null;
    entry.resolve(response);
    requestRender();
  }

  function handleCalResponse(frame) {
    let response;
    try {
      response = parseCalResponseFrame(frame);
    } catch (error) {
      log.error("cal response parse failed", error);
      return;
    }
    calInfo = response;
    bus.emit(EVENTS.FRAME_RX, { kind: "cal", bytes: frame, response });
    bus.emit(EVENTS.CAL_INFO, { info: response });
    if (!pending.cal || pending.cal.op !== response.op) return;
    window.clearTimeout(pending.cal.timeout);
    const entry = pending.cal;
    pending.cal = null;
    entry.resolve(response);
    requestRender();
  }

  function resetStreams() {
    heartbeatDecoder.reset();
    configDecoder.reset();
    calDecoder.reset();
  }

  function failPending(error) {
    if (pending.config) {
      window.clearTimeout(pending.config.timeout);
      pending.config.reject(error);
      pending.config = null;
    }
    if (pending.cal) {
      window.clearTimeout(pending.cal.timeout);
      pending.cal.reject(error);
      pending.cal = null;
    }
  }

  bus.on(EVENTS.LINK_OPEN, () => {
    resetStreams();
    telemetry.clearSeries();
    requestRender();
  });

  bus.on(EVENTS.LINK_CLOSE, () => {
    resetStreams();
    failPending(codedError(ERR.NOT_CONNECTED));
    telemetry.reset();
    calInfo = null;
    requestRender();
  });

  async function sendFrame(frame, kind = "raw") {
    await link.write(frame);
    bus.emit(EVENTS.FRAME_TX, { kind, bytes: frame });
  }

  function nextConfigSequence() {
    configSequence = (configSequence + 1) & 0xffff;
    if (configSequence === 0) configSequence = 1;
    return configSequence;
  }

  async function configRequest(op, options = {}) {
    if (!link.isConnected()) throw codedError(ERR.NOT_CONNECTED);
    if (pending.config) throw codedError(ERR.CONFIG_PENDING);

    const sequence = nextConfigSequence();
    const frame =
      op === CONFIG_OP_SET_FIELD
        ? buildConfigSetFieldRequest(options.field, options.value, sequence)
        : buildConfigRequest(op, { ...options, sequence });

    const promise = new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        if (pending.config && pending.config.sequence === sequence) {
          pending.config = null;
          reject(codedError(ERR.CONFIG_TIMEOUT));
          requestRender();
        }
      }, CONFIG_REQUEST_TIMEOUT_MS);
      pending.config = { sequence, resolve, reject, timeout };
    });

    requestRender();
    try {
      await sendFrame(frame, "config");
      return await promise;
    } catch (error) {
      if (pending.config && pending.config.sequence === sequence) {
        window.clearTimeout(pending.config.timeout);
        pending.config = null;
        requestRender();
      }
      throw error;
    }
  }

  async function calRequest(frame) {
    if (!link.isConnected()) throw codedError(ERR.NOT_CONNECTED);
    if (pending.cal) throw codedError(ERR.CAL_PENDING);
    if (pending.config) throw codedError(ERR.CONFIG_PENDING);

    const op = frame[2];
    const promise = new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        if (pending.cal && pending.cal.op === op) {
          pending.cal = null;
          reject(codedError(ERR.CAL_TIMEOUT));
          requestRender();
        }
      }, CAL_REQUEST_TIMEOUT_MS);
      pending.cal = { op, resolve, reject, timeout };
    });

    requestRender();
    try {
      await sendFrame(frame, "cal");
      return await promise;
    } catch (error) {
      if (pending.cal && pending.cal.op === op) {
        window.clearTimeout(pending.cal.timeout);
        pending.cal = null;
        requestRender();
      }
      throw error;
    }
  }

  function requestCalInfoFrame() {
    return calRequest(buildCalGetInfoFrame());
  }

  return {
    link,
    telemetry,
    // Push bytes through the exact path real serial data takes. Intended for
    // tests, simulation and replay -- there is no other way in, so anything
    // driven through here exercises the real decoders and the real events.
    ingest: feedRx,
    sendFrame,
    configRequest,
    calRequest,
    requestCalInfoFrame,
    isConnected: () => link.isConnected(),
    isOutputLive: () => !!telemetry.latest.powerEnable,
    get calInfo() {
      return calInfo;
    },
    get configBusy() {
      return pending.config !== null;
    },
    get calBusy() {
      return pending.cal !== null;
    }
  };
}

exports.createDeviceService = createDeviceService;
});
