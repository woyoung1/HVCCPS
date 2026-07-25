// Device configuration protocol (0xC5 request / 0xC6 response).
//
// Validation returns i18n DESCRIPTORS ({ key, params }) instead of English
// sentences so the same validator serves both languages without the UI having
// to pattern-match prose.

HV.define("protocol/config", function (require, exports) {
"use strict";

const { readFloat32, readLe16, readLe32, sealFrame, sum8, writeFloat32, writeLe16, writeLe32, xor8 } = require("protocol/codec");
const { createFrameDecoder } = require("protocol/framing");
const { CONFIG_FIELDS, CONFIG_FIELD_BY_KEY, CONFIG_OP_GET_FIELD, CONFIG_OP_GET_SNAPSHOT, CONFIG_OP_SET_FIELD, CONFIG_REQUEST_FRAME_SIZE, CONFIG_REQUEST_HEADER, CONFIG_RESPONSE_BASE_SIZE, CONFIG_RESPONSE_HEADER, CONFIG_RESPONSE_MAX_SIZE, CONFIG_TARGET_DRAFT, CONFIG_VALUE_FLOAT, DEFAULT_CONFIG, FREQ_MAX_HZ, FREQ_MIN_HZ } = require("protocol/constants");

function cloneDefaultSettings() {
  return { ...DEFAULT_CONFIG };
}

const NON_NEGATIVE_GAINS = ["kpCv", "kiCv", "kpCc", "kiCc", "kpCp", "kiCp"];

/** @returns {{errors: Array<{key: string, params?: object}>}} */
function validateConfigForm(form) {
  const errors = [];
  for (const key of NON_NEGATIVE_GAINS) {
    if (!Number.isFinite(form[key]) || form[key] < 0) {
      errors.push({ key: "validate.gainNonNegative", params: { field: key } });
    }
  }
  if (!Number.isFinite(form.baseFreqHz) || form.baseFreqHz < FREQ_MIN_HZ || form.baseFreqHz > FREQ_MAX_HZ) {
    errors.push({ key: "validate.freqRange", params: { min: FREQ_MIN_HZ, max: FREQ_MAX_HZ } });
  }
  if (![0, 1].includes(Number(form.freqPolicy))) errors.push({ key: "validate.freqPolicy" });
  if (!Number.isFinite(form.softStartStep) || form.softStartStep < 0 || form.softStartStep > 1) {
    errors.push({ key: "validate.softStartStep" });
  }
  if (!Number.isFinite(form.freqDutyFilterAlpha) || form.freqDutyFilterAlpha < 0 || form.freqDutyFilterAlpha > 1) {
    errors.push({ key: "validate.dutyFilterAlpha" });
  }
  if (!Number.isFinite(form.freqMinStepHz) || form.freqMinStepHz < 100) errors.push({ key: "validate.minStep" });
  if (!Number.isFinite(form.freqMaxStepHz) || form.freqMaxStepHz < form.freqMinStepHz) {
    errors.push({ key: "validate.maxStep" });
  }
  return { errors };
}

function buildConfigRequest(op, options = {}) {
  const frame = new Uint8Array(CONFIG_REQUEST_FRAME_SIZE);
  const field = typeof options.field === "string" ? CONFIG_FIELD_BY_KEY[options.field] : null;
  const type = options.valueType || (field ? field.type : 0);
  const sequence = options.sequence || 0;
  let off = 0;
  frame[off++] = CONFIG_REQUEST_HEADER;
  frame[off++] = CONFIG_REQUEST_FRAME_SIZE;
  frame[off++] = op;
  frame[off++] = options.target ?? CONFIG_TARGET_DRAFT;
  writeLe16(frame, off, field ? field.id : options.fieldId || 0);
  off += 2;
  frame[off++] = type;
  if (type === CONFIG_VALUE_FLOAT) writeFloat32(frame, off, Number(options.value || 0));
  else writeLe32(frame, off, Number(options.value || 0) >>> 0);
  off += 4;
  writeLe16(frame, off, sequence);
  off += 2;
  frame[off++] = 0;
  return sealFrame(frame);
}

function buildConfigSetFieldRequest(fieldKey, value, sequence = 0) {
  const field = CONFIG_FIELD_BY_KEY[fieldKey];
  if (!field) throw new Error(`unknown config field ${fieldKey}`);
  return buildConfigRequest(CONFIG_OP_SET_FIELD, { field: fieldKey, value, valueType: field.type, sequence });
}

function parseConfigRecord(frame, offset) {
  const config = {};
  for (const field of CONFIG_FIELDS) {
    config[field.key] = field.type === CONFIG_VALUE_FLOAT ? readFloat32(frame, offset) : readLe32(frame, offset);
    offset += 4;
  }
  return { config, offset };
}

function parseConfigResponseFrame(frame) {
  if (frame.length < CONFIG_RESPONSE_BASE_SIZE) throw new Error("config response too short");
  if (frame[0] !== CONFIG_RESPONSE_HEADER) throw new Error("invalid config response header");
  const length = readLe16(frame, 1);
  if (frame.length < length) throw new Error("truncated config response");
  if (frame[length - 2] !== sum8(frame, length - 2) || frame[length - 1] !== xor8(frame, length - 1)) {
    throw new Error("invalid config response checksum");
  }

  let offset = 3;
  const response = {
    op: frame[offset++],
    status: frame[offset++],
    sequence: readLe16(frame, offset),
    fieldId: 0,
    draftRevision: 0,
    activeRevision: 0,
    flashSequence: 0,
    flags: 0,
    draft: null,
    active: null,
    valueType: 0,
    value: 0
  };
  offset += 2;
  response.fieldId = readLe16(frame, offset); offset += 2;
  response.draftRevision = readLe32(frame, offset); offset += 4;
  response.activeRevision = readLe32(frame, offset); offset += 4;
  response.flashSequence = readLe32(frame, offset); offset += 4;
  response.flags = readLe32(frame, offset); offset += 4;

  if (response.op === CONFIG_OP_GET_SNAPSHOT) {
    let parsed = parseConfigRecord(frame, offset);
    response.draft = parsed.config;
    parsed = parseConfigRecord(frame, parsed.offset);
    response.active = parsed.config;
  } else if (response.op === CONFIG_OP_GET_FIELD) {
    response.valueType = frame[offset++];
    response.value =
      response.valueType === CONFIG_VALUE_FLOAT ? readFloat32(frame, offset) : readLe32(frame, offset);
  }
  return response;
}

function createConfigResponseDecoder() {
  return createFrameDecoder({
    header: CONFIG_RESPONSE_HEADER,
    lengthBytes: 2,
    minLength: CONFIG_RESPONSE_BASE_SIZE,
    maxLength: CONFIG_RESPONSE_MAX_SIZE
  });
}

exports.cloneDefaultSettings = cloneDefaultSettings;
exports.validateConfigForm = validateConfigForm;
exports.buildConfigRequest = buildConfigRequest;
exports.buildConfigSetFieldRequest = buildConfigSetFieldRequest;
exports.parseConfigResponseFrame = parseConfigResponseFrame;
exports.createConfigResponseDecoder = createConfigResponseDecoder;
});
