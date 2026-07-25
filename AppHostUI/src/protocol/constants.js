// Wire constants shared by every protocol module. Mirrors app_protocol.c,
// config_manager.c and calibration.c -- do not change a value here without
// changing the firmware side too.

HV.define("protocol/constants", function (require, exports) {
"use strict";

const HEARTBEAT_HEADER = 0x55;
const COMMAND_HEADER = 0xaa;
const COMMAND_FRAME_SIZE = 23;

const CONFIG_REQUEST_HEADER = 0xc5;
const CONFIG_REQUEST_FRAME_SIZE = 16;
const CONFIG_RESPONSE_HEADER = 0xc6;
const CONFIG_RESPONSE_BASE_SIZE = 1 + 2 + 1 + 1 + 2 + 2 + 4 * 4 + 2;
// sizeof(HVCCPS_Config) on the wire = 36 fields x 4 bytes (see CONFIG_FIELDS).
const CONFIG_RECORD_SIZE = 144;
// GET_SNAPSHOT response upper bound: base header + 2 records + checksums.
const CONFIG_RESPONSE_MAX_SIZE = 320;

const MAX_CV_V = 2200;
const MAX_CC_MA = 200;
const MAX_CP_W = 400;
const MAX_RUN_SECONDS = 65534;
const RUN_CONTINUOUS = 0xffff;

const CONFIG_VALUE_U32 = 1;
const CONFIG_VALUE_FLOAT = 2;
const CONFIG_TARGET_DRAFT = 0;
const CONFIG_TARGET_ACTIVE = 1;

const CONFIG_OP_GET_SNAPSHOT = 1;
const CONFIG_OP_GET_FIELD = 2;
const CONFIG_OP_SET_FIELD = 3;
const CONFIG_OP_RESET_FIELD = 4;
const CONFIG_OP_APPLY_DRAFT = 5;
const CONFIG_OP_SAVE_DRAFT = 6;
const CONFIG_OP_LOAD_FLASH = 7;
const CONFIG_OP_LOAD_DEFAULTS = 8;
const CONFIG_OP_FACTORY_RESET = 9;

// Device status codes -> i18n key suffix. The UI renders t(`status.config.${code}`).
const CONFIG_STATUS = Object.freeze({
  0: "ok",
  1: "badField",
  2: "badType",
  3: "badValue",
  4: "flashError",
  5: "noFlash",
  6: "locked",
  7: "badRequest",
  8: "busy"
});

const CONFIG_FIELDS = Object.freeze([
  { id: 1, key: "kpCv", type: CONFIG_VALUE_FLOAT, group: "loop" },
  { id: 2, key: "kiCv", type: CONFIG_VALUE_FLOAT, group: "loop" },
  { id: 3, key: "kpCc", type: CONFIG_VALUE_FLOAT, group: "loop" },
  { id: 4, key: "kiCc", type: CONFIG_VALUE_FLOAT, group: "loop" },
  { id: 5, key: "kpCp", type: CONFIG_VALUE_FLOAT, group: "loop" },
  { id: 6, key: "kiCp", type: CONFIG_VALUE_FLOAT, group: "loop" },
  { id: 7, key: "baseFreqHz", type: CONFIG_VALUE_U32, group: "timing" },
  { id: 8, key: "freqPolicy", type: CONFIG_VALUE_U32, group: "timing" },
  { id: 9, key: "softStartStep", type: CONFIG_VALUE_FLOAT, group: "loop" },
  { id: 20, key: "freqScoreLimit", type: CONFIG_VALUE_FLOAT, group: "autoFreq" },
  { id: 21, key: "freqEnableLockoutTicks", type: CONFIG_VALUE_U32, group: "autoFreq" },
  { id: 22, key: "freqReloadLockoutTicks", type: CONFIG_VALUE_U32, group: "autoFreq" },
  { id: 23, key: "freqTargetLockoutTicks", type: CONFIG_VALUE_U32, group: "autoFreq" },
  { id: 24, key: "freqDutyFilterAlpha", type: CONFIG_VALUE_FLOAT, group: "autoFreq" },
  { id: 25, key: "freqMinStepHz", type: CONFIG_VALUE_U32, group: "autoFreq" },
  { id: 26, key: "freqMaxStepHz", type: CONFIG_VALUE_U32, group: "autoFreq" },
  { id: 27, key: "freqDownTriggerPct", type: CONFIG_VALUE_FLOAT, group: "autoFreq" },
  { id: 28, key: "freqDownFastPct", type: CONFIG_VALUE_FLOAT, group: "autoFreq" },
  { id: 29, key: "freqDownSatPct", type: CONFIG_VALUE_FLOAT, group: "autoFreq" },
  { id: 30, key: "freqDownStopPct", type: CONFIG_VALUE_FLOAT, group: "autoFreq" },
  { id: 31, key: "freqUpTriggerOffsetPct", type: CONFIG_VALUE_FLOAT, group: "autoFreq" },
  { id: 32, key: "freqUpStopSlope", type: CONFIG_VALUE_FLOAT, group: "autoFreq" },
  { id: 33, key: "freqUpStopOffsetPct", type: CONFIG_VALUE_FLOAT, group: "autoFreq" },
  { id: 34, key: "freqUpPredLimitPct", type: CONFIG_VALUE_FLOAT, group: "autoFreq" },
  { id: 35, key: "freqFfGamma", type: CONFIG_VALUE_FLOAT, group: "autoFreq" },
  // Per-key run presets. Order MUST match APP_Protocol_WriteConfig() in
  // app_protocol.c (A enable/cc/cv/cp/time, then B). Units: CV mV, CC mA,
  // CP mW, time s (0 = continuous), enable 0/1. Group "buttons" keeps these
  // out of the Configure -> Device Constants grid; they live in Presets.
  { id: 40, key: "btnAEnable", type: CONFIG_VALUE_U32, group: "buttons" },
  { id: 41, key: "btnACcMa", type: CONFIG_VALUE_U32, group: "buttons" },
  { id: 42, key: "btnACvMv", type: CONFIG_VALUE_U32, group: "buttons" },
  { id: 43, key: "btnACpMw", type: CONFIG_VALUE_U32, group: "buttons" },
  { id: 44, key: "btnATimeS", type: CONFIG_VALUE_U32, group: "buttons" },
  { id: 45, key: "btnBEnable", type: CONFIG_VALUE_U32, group: "buttons" },
  { id: 46, key: "btnBCcMa", type: CONFIG_VALUE_U32, group: "buttons" },
  { id: 47, key: "btnBCvMv", type: CONFIG_VALUE_U32, group: "buttons" },
  { id: 48, key: "btnBCpMw", type: CONFIG_VALUE_U32, group: "buttons" },
  { id: 49, key: "btnBTimeS", type: CONFIG_VALUE_U32, group: "buttons" },
  // Output calibration master switch. Edited on the Calibration drawer, so the
  // group keeps it out of the device-constants grid like the buttons set.
  { id: 50, key: "calEnable", type: CONFIG_VALUE_U32, group: "calibration" }
]);

const CONFIG_FIELD_BY_KEY = Object.freeze(
  Object.fromEntries(CONFIG_FIELDS.map((field) => [field.key, field]))
);

// ----- Switching / sampling constants matched to app_core.c ---------------
// ADC channels, sample times (2.5 cyc) and resolution (12/8 bit) are baked into
// the CubeMX config and not host-tunable, so the host only needs the buffer
// layout to parse the embedded waveforms.
const SAMPLES_PER_PERIOD = 24;
const ADC1_FULL_SCALE = 4095; // 12-bit
const ADC2_FULL_SCALE = 255; // 8-bit

// Heartbeat payload after the 1-byte header and 2-byte little-endian length
// matches app_core.c:build_heartbeat().
const HEARTBEAT_PAYLOAD_SIZE =
  10 * 4 + // measurement uint32s
  4 + // duty
  4 + // current_freq_hz (uint32)
  4 + // base_freq_hz (uint32)
  4 + // freq_policy (uint32)
  3 * 4 + // cv/cc/cp targets
  6 * 4 + // cv/cc/cp value + integral
  4 * 4 + // config revisions and flags
  1 +
  1 +
  2 + // status_flags, key_flags, run_remaining
  3 * 4 + // ISR cycles last/min/max
  SAMPLES_PER_PERIOD * 2 * 2 + // VSEC + VPRI uint16
  SAMPLES_PER_PERIOD * 3 + // ISEC + IPRI_AC + IPRI_DC uint8
  2 * 4; // raw (pre-calibration) VSEC mV + ISEC mA
const HEARTBEAT_FRAME_SIZE = 1 + 2 + HEARTBEAT_PAYLOAD_SIZE + 2;

const DEFAULT_CONFIG = Object.freeze({
  kpCv: 0.000004,
  kiCv: 0.0000008,
  kpCc: 0.001,
  kiCc: 0.00008,
  kpCp: 0.000001,
  kiCp: 0.0000001,
  baseFreqHz: 35000,
  freqPolicy: 1,
  softStartStep: 0.1,
  freqScoreLimit: 100,
  freqEnableLockoutTicks: 20,
  freqReloadLockoutTicks: 10,
  freqTargetLockoutTicks: 10,
  freqDutyFilterAlpha: 0.25,
  freqMinStepHz: 1000,
  freqMaxStepHz: 4000,
  freqDownTriggerPct: 95,
  freqDownFastPct: 98,
  freqDownSatPct: 99.5,
  freqDownStopPct: 90,
  freqUpTriggerOffsetPct: 25,
  freqUpStopSlope: 6 / 7,
  freqUpStopOffsetPct: 36.4285714,
  freqUpPredLimitPct: 90,
  freqFfGamma: 0.924,
  btnAEnable: 0,
  btnACcMa: 0,
  btnACvMv: 0,
  btnACpMw: 0,
  btnATimeS: 0,
  btnBEnable: 0,
  btnBCcMa: 0,
  btnBCvMv: 0,
  btnBCpMw: 0,
  btnBTimeS: 0,
  calEnable: 0
});

const FREQ_MIN_HZ = 11000;
const FREQ_MAX_HZ = 45000;

// ----- Output calibration -------------------------------------------------
const CAL_REQUEST_HEADER = 0xc7;
const CAL_RESPONSE_HEADER = 0xc8;
const CAL_RESPONSE_LEN = 26;
const CAL_MAX_CHUNK = 128;

const CAL_OP_BEGIN = 1;
const CAL_OP_DATA = 2;
const CAL_OP_COMMIT = 3;
const CAL_OP_GET_INFO = 4;

const CAL_MAGIC = 0x4856434c; // "HVCL"
const CAL_VERSION = 1;
const CAL_V_POINTS = 221; // 0..2200 V, 10 V step
const CAL_I_POINTS = 21; //  0..200 mA, 10 mA step
const CAL_V_STEP_MV = 10000;
const CAL_I_STEP_MA = 10;
const CAL_V_MAX_MV = 2200000;
const CAL_I_MAX_MA = 200;
const CAL_HEADER_BYTES = 64;
const CAL_DI_OFFSET = CAL_HEADER_BYTES;
const CAL_DV_OFFSET = CAL_HEADER_BYTES + CAL_I_POINTS * 2;
const CAL_DATA_BYTES = CAL_I_POINTS * 2 + CAL_V_POINTS * CAL_I_POINTS * 2;
const CAL_IMAGE_BYTES = CAL_HEADER_BYTES + CAL_DATA_BYTES; // 9388
const CAL_MAX_DV_MV = 50000; // +/-50 V clamp (matches firmware)
const CAL_MAX_DI_MA = 50; //   +/-50 mA clamp (matches firmware)
const CAL_DEFAULT_RV_V = 350; // voltage decay radius
const CAL_DEFAULT_RI_MA = 50; // current decay radius

const CAL_STATUS = Object.freeze({
  0: "ok",
  1: "badLength",
  2: "badDimensions",
  3: "badCrc",
  4: "flashError",
  6: "locked",
  7: "badRequest"
});

exports.HEARTBEAT_HEADER = HEARTBEAT_HEADER;
exports.COMMAND_HEADER = COMMAND_HEADER;
exports.COMMAND_FRAME_SIZE = COMMAND_FRAME_SIZE;
exports.CONFIG_REQUEST_HEADER = CONFIG_REQUEST_HEADER;
exports.CONFIG_REQUEST_FRAME_SIZE = CONFIG_REQUEST_FRAME_SIZE;
exports.CONFIG_RESPONSE_HEADER = CONFIG_RESPONSE_HEADER;
exports.CONFIG_RESPONSE_BASE_SIZE = CONFIG_RESPONSE_BASE_SIZE;
exports.CONFIG_RECORD_SIZE = CONFIG_RECORD_SIZE;
exports.CONFIG_RESPONSE_MAX_SIZE = CONFIG_RESPONSE_MAX_SIZE;
exports.MAX_CV_V = MAX_CV_V;
exports.MAX_CC_MA = MAX_CC_MA;
exports.MAX_CP_W = MAX_CP_W;
exports.MAX_RUN_SECONDS = MAX_RUN_SECONDS;
exports.RUN_CONTINUOUS = RUN_CONTINUOUS;
exports.CONFIG_VALUE_U32 = CONFIG_VALUE_U32;
exports.CONFIG_VALUE_FLOAT = CONFIG_VALUE_FLOAT;
exports.CONFIG_TARGET_DRAFT = CONFIG_TARGET_DRAFT;
exports.CONFIG_TARGET_ACTIVE = CONFIG_TARGET_ACTIVE;
exports.CONFIG_OP_GET_SNAPSHOT = CONFIG_OP_GET_SNAPSHOT;
exports.CONFIG_OP_GET_FIELD = CONFIG_OP_GET_FIELD;
exports.CONFIG_OP_SET_FIELD = CONFIG_OP_SET_FIELD;
exports.CONFIG_OP_RESET_FIELD = CONFIG_OP_RESET_FIELD;
exports.CONFIG_OP_APPLY_DRAFT = CONFIG_OP_APPLY_DRAFT;
exports.CONFIG_OP_SAVE_DRAFT = CONFIG_OP_SAVE_DRAFT;
exports.CONFIG_OP_LOAD_FLASH = CONFIG_OP_LOAD_FLASH;
exports.CONFIG_OP_LOAD_DEFAULTS = CONFIG_OP_LOAD_DEFAULTS;
exports.CONFIG_OP_FACTORY_RESET = CONFIG_OP_FACTORY_RESET;
exports.CONFIG_STATUS = CONFIG_STATUS;
exports.CONFIG_FIELDS = CONFIG_FIELDS;
exports.CONFIG_FIELD_BY_KEY = CONFIG_FIELD_BY_KEY;
exports.SAMPLES_PER_PERIOD = SAMPLES_PER_PERIOD;
exports.ADC1_FULL_SCALE = ADC1_FULL_SCALE;
exports.ADC2_FULL_SCALE = ADC2_FULL_SCALE;
exports.HEARTBEAT_PAYLOAD_SIZE = HEARTBEAT_PAYLOAD_SIZE;
exports.HEARTBEAT_FRAME_SIZE = HEARTBEAT_FRAME_SIZE;
exports.DEFAULT_CONFIG = DEFAULT_CONFIG;
exports.FREQ_MIN_HZ = FREQ_MIN_HZ;
exports.FREQ_MAX_HZ = FREQ_MAX_HZ;
exports.CAL_REQUEST_HEADER = CAL_REQUEST_HEADER;
exports.CAL_RESPONSE_HEADER = CAL_RESPONSE_HEADER;
exports.CAL_RESPONSE_LEN = CAL_RESPONSE_LEN;
exports.CAL_MAX_CHUNK = CAL_MAX_CHUNK;
exports.CAL_OP_BEGIN = CAL_OP_BEGIN;
exports.CAL_OP_DATA = CAL_OP_DATA;
exports.CAL_OP_COMMIT = CAL_OP_COMMIT;
exports.CAL_OP_GET_INFO = CAL_OP_GET_INFO;
exports.CAL_MAGIC = CAL_MAGIC;
exports.CAL_VERSION = CAL_VERSION;
exports.CAL_V_POINTS = CAL_V_POINTS;
exports.CAL_I_POINTS = CAL_I_POINTS;
exports.CAL_V_STEP_MV = CAL_V_STEP_MV;
exports.CAL_I_STEP_MA = CAL_I_STEP_MA;
exports.CAL_V_MAX_MV = CAL_V_MAX_MV;
exports.CAL_I_MAX_MA = CAL_I_MAX_MA;
exports.CAL_HEADER_BYTES = CAL_HEADER_BYTES;
exports.CAL_DI_OFFSET = CAL_DI_OFFSET;
exports.CAL_DV_OFFSET = CAL_DV_OFFSET;
exports.CAL_DATA_BYTES = CAL_DATA_BYTES;
exports.CAL_IMAGE_BYTES = CAL_IMAGE_BYTES;
exports.CAL_MAX_DV_MV = CAL_MAX_DV_MV;
exports.CAL_MAX_DI_MA = CAL_MAX_DI_MA;
exports.CAL_DEFAULT_RV_V = CAL_DEFAULT_RV_V;
exports.CAL_DEFAULT_RI_MA = CAL_DEFAULT_RI_MA;
exports.CAL_STATUS = CAL_STATUS;
});
