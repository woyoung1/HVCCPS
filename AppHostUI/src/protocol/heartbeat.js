// Heartbeat (0x55) decoding: the 20 Hz telemetry frame that carries every
// measurement plus the 24 raw ADC samples of the last switching period.

HV.define("protocol/heartbeat", function (require, exports) {
"use strict";

const { readFloat32, readLe16, readLe32, sum8, xor8 } = require("protocol/codec");
const { createFrameDecoder } = require("protocol/framing");
const { HEARTBEAT_FRAME_SIZE, HEARTBEAT_HEADER, SAMPLES_PER_PERIOD } = require("protocol/constants");

/** A zeroed telemetry record. Reused in place so the 30 Hz stream allocates nothing. */
function createLatest() {
  return {
    iPriAcMa: 0,
    iSecMa: 0,
    iPriDcMa: 0,
    vPriMv: 0,
    vSecMv: 0,
    rawVSecMv: 0,
    rawISecMa: 0,
    aux12Mv: 0,
    aux5Mv: 0,
    vccMv: 0,
    mosTempMc: 0,
    internalTempMc: 0,
    duty: 0,
    currentFreqHz: 0,
    baseFreqHz: 0,
    freqPolicy: 0,
    cvTargetMv: 0,
    ccTargetMa: 0,
    cpTargetMw: 0,
    cvValue: 0,
    cvIntegral: 0,
    ccValue: 0,
    ccIntegral: 0,
    cpValue: 0,
    cpIntegral: 0,
    configDraftRevision: 0,
    configActiveRevision: 0,
    configFlashSequence: 0,
    configFlags: 0,
    statusFlags: 0,
    ocpTripped: false,
    wdgReset: false,
    otpTripped: false,
    keyFlags: 0,
    runSecondsRemaining: 0,
    isrCyclesLast: 0,
    isrCyclesMin: 0,
    isrCyclesMax: 0,
    powerEnable: false,
    driveActive: false,
    fixedDutyActive: false,
    configOk: false,
    controlMode: 0,
    updatedAt: 0,
    vsecSamples: new Uint16Array(SAMPLES_PER_PERIOD),
    vpriSamples: new Uint16Array(SAMPLES_PER_PERIOD),
    isecSamples: new Uint8Array(SAMPLES_PER_PERIOD),
    ipriAcSamples: new Uint8Array(SAMPLES_PER_PERIOD),
    ipriDcSamples: new Uint8Array(SAMPLES_PER_PERIOD)
  };
}

function parseHeartbeatFrame(frame, latest = createLatest(), updatedAt = 0) {
  if (frame.length < HEARTBEAT_FRAME_SIZE) throw new Error("heartbeat frame too short");
  if (frame[0] !== HEARTBEAT_HEADER) throw new Error("invalid heartbeat header");
  const length = readLe16(frame, 1);
  if (length !== HEARTBEAT_FRAME_SIZE) throw new Error("invalid heartbeat length");
  if (
    frame[HEARTBEAT_FRAME_SIZE - 2] !== sum8(frame, HEARTBEAT_FRAME_SIZE - 2) ||
    frame[HEARTBEAT_FRAME_SIZE - 1] !== xor8(frame, HEARTBEAT_FRAME_SIZE - 1)
  ) {
    throw new Error("invalid heartbeat checksum");
  }

  let offset = 3;
  latest.iPriAcMa = readLe32(frame, offset); offset += 4;
  latest.iSecMa = readLe32(frame, offset); offset += 4;
  latest.iPriDcMa = readLe32(frame, offset); offset += 4;
  latest.vPriMv = readLe32(frame, offset); offset += 4;
  latest.vSecMv = readLe32(frame, offset); offset += 4;
  latest.aux12Mv = readLe32(frame, offset); offset += 4;
  latest.aux5Mv = readLe32(frame, offset); offset += 4;
  latest.vccMv = readLe32(frame, offset); offset += 4;
  latest.mosTempMc = readLe32(frame, offset); offset += 4;
  latest.internalTempMc = readLe32(frame, offset); offset += 4;
  latest.duty = readFloat32(frame, offset); offset += 4;
  latest.currentFreqHz = readLe32(frame, offset); offset += 4;
  latest.baseFreqHz = readLe32(frame, offset); offset += 4;
  latest.freqPolicy = readLe32(frame, offset); offset += 4;
  latest.cvTargetMv = readLe32(frame, offset); offset += 4;
  latest.ccTargetMa = readLe32(frame, offset); offset += 4;
  latest.cpTargetMw = readLe32(frame, offset); offset += 4;
  latest.cvValue = readFloat32(frame, offset); offset += 4;
  latest.cvIntegral = readFloat32(frame, offset); offset += 4;
  latest.ccValue = readFloat32(frame, offset); offset += 4;
  latest.ccIntegral = readFloat32(frame, offset); offset += 4;
  latest.cpValue = readFloat32(frame, offset); offset += 4;
  latest.cpIntegral = readFloat32(frame, offset); offset += 4;
  latest.configDraftRevision = readLe32(frame, offset); offset += 4;
  latest.configActiveRevision = readLe32(frame, offset); offset += 4;
  latest.configFlashSequence = readLe32(frame, offset); offset += 4;
  latest.configFlags = readLe32(frame, offset); offset += 4;
  latest.statusFlags = frame[offset++];
  latest.keyFlags = frame[offset++];
  latest.runSecondsRemaining = readLe16(frame, offset); offset += 2;
  latest.isrCyclesLast = readLe32(frame, offset); offset += 4;
  latest.isrCyclesMin = readLe32(frame, offset); offset += 4;
  latest.isrCyclesMax = readLe32(frame, offset); offset += 4;
  for (let k = 0; k < SAMPLES_PER_PERIOD; k += 1) {
    latest.vsecSamples[k] = readLe16(frame, offset); offset += 2;
  }
  for (let k = 0; k < SAMPLES_PER_PERIOD; k += 1) {
    latest.vpriSamples[k] = readLe16(frame, offset); offset += 2;
  }
  for (let k = 0; k < SAMPLES_PER_PERIOD; k += 1) latest.isecSamples[k] = frame[offset++];
  for (let k = 0; k < SAMPLES_PER_PERIOD; k += 1) latest.ipriAcSamples[k] = frame[offset++];
  for (let k = 0; k < SAMPLES_PER_PERIOD; k += 1) latest.ipriDcSamples[k] = frame[offset++];
  latest.rawVSecMv = readLe32(frame, offset); offset += 4;
  latest.rawISecMa = readLe32(frame, offset); offset += 4;

  latest.powerEnable = (latest.statusFlags & 0x01) !== 0;
  latest.controlMode = (latest.statusFlags >> 1) & 0x03;
  latest.configOk = (latest.statusFlags & 0x08) !== 0;
  latest.fixedDutyActive = (latest.statusFlags & 0x10) !== 0;
  latest.ocpTripped = (latest.statusFlags & 0x20) !== 0;
  latest.wdgReset = (latest.statusFlags & 0x40) !== 0;
  latest.otpTripped = (latest.statusFlags & 0x80) !== 0;
  latest.driveActive = latest.powerEnable;
  latest.updatedAt = updatedAt;
  return latest;
}

function createHeartbeatDecoder() {
  return createFrameDecoder({
    header: HEARTBEAT_HEADER,
    lengthBytes: 2,
    minLength: HEARTBEAT_FRAME_SIZE,
    maxLength: HEARTBEAT_FRAME_SIZE
  });
}

exports.createLatest = createLatest;
exports.parseHeartbeatFrame = parseHeartbeatFrame;
exports.createHeartbeatDecoder = createHeartbeatDecoder;
});
