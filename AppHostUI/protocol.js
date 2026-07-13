(function () {
  "use strict";

  // ----- Frame headers / fixed-size frames -------------------------------
  const HEARTBEAT_HEADER = 0x55;
  const COMMAND_HEADER = 0xaa;
  const COMMAND_FRAME_SIZE = 23;
  const CONFIG_REQUEST_HEADER = 0xc5;
  const CONFIG_REQUEST_FRAME_SIZE = 16;
  const CONFIG_RESPONSE_HEADER = 0xc6;
  const CONFIG_RESPONSE_BASE_SIZE = 1 + 2 + 1 + 1 + 2 + 2 + (4 * 4) + 2;
  // sizeof(HVCCPS_Config) on the wire = 36 fields x 4 bytes (see CONFIG_FIELDS).
  const CONFIG_RECORD_SIZE = 144;
  // GET_SNAPSHOT response upper bound: base header + 2 records + checksums.
  const CONFIG_RESPONSE_MAX_SIZE = 320;

  const MAX_CV_V = 2200;
  const MAX_CC_MA = 200;
  const MAX_CP_W = 400;
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

  const CONFIG_STATUS = Object.freeze({
    0: "OK",
    1: "BAD FIELD",
    2: "BAD TYPE",
    3: "BAD VALUE",
    4: "FLASH ERROR",
    5: "NO FLASH",
    6: "LOCKED",
    7: "BAD REQUEST",
    8: "BUSY"
  });

  const CONFIG_FIELDS = Object.freeze([
    { id: 1, key: "kpCv", label: "Kp CV", type: CONFIG_VALUE_FLOAT, group: "Control Loop" },
    { id: 2, key: "kiCv", label: "Ki CV", type: CONFIG_VALUE_FLOAT, group: "Control Loop" },
    { id: 3, key: "kpCc", label: "Kp CC", type: CONFIG_VALUE_FLOAT, group: "Control Loop" },
    { id: 4, key: "kiCc", label: "Ki CC", type: CONFIG_VALUE_FLOAT, group: "Control Loop" },
    { id: 5, key: "kpCp", label: "Kp CP", type: CONFIG_VALUE_FLOAT, group: "Control Loop" },
    { id: 6, key: "kiCp", label: "Ki CP", type: CONFIG_VALUE_FLOAT, group: "Control Loop" },
    { id: 7, key: "baseFreqHz", label: "Base Frequency", type: CONFIG_VALUE_U32, group: "Timing" },
    { id: 8, key: "freqPolicy", label: "Frequency Policy", type: CONFIG_VALUE_U32, group: "Timing" },
    { id: 9, key: "softStartStep", label: "Soft-start Step", type: CONFIG_VALUE_FLOAT, group: "Control Loop" },
    { id: 20, key: "freqScoreLimit", label: "Score Limit", type: CONFIG_VALUE_FLOAT, group: "Auto Frequency" },
    { id: 21, key: "freqEnableLockoutTicks", label: "Enable Lockout", type: CONFIG_VALUE_U32, group: "Auto Frequency" },
    { id: 22, key: "freqReloadLockoutTicks", label: "Reload Lockout", type: CONFIG_VALUE_U32, group: "Auto Frequency" },
    { id: 23, key: "freqTargetLockoutTicks", label: "Target Lockout", type: CONFIG_VALUE_U32, group: "Auto Frequency" },
    { id: 24, key: "freqDutyFilterAlpha", label: "Duty Filter Alpha", type: CONFIG_VALUE_FLOAT, group: "Auto Frequency" },
    { id: 25, key: "freqMinStepHz", label: "Min Step", type: CONFIG_VALUE_U32, group: "Auto Frequency" },
    { id: 26, key: "freqMaxStepHz", label: "Max Step", type: CONFIG_VALUE_U32, group: "Auto Frequency" },
    { id: 27, key: "freqDownTriggerPct", label: "Down Trigger", type: CONFIG_VALUE_FLOAT, group: "Auto Frequency" },
    { id: 28, key: "freqDownFastPct", label: "Down Fast", type: CONFIG_VALUE_FLOAT, group: "Auto Frequency" },
    { id: 29, key: "freqDownSatPct", label: "Down Saturation", type: CONFIG_VALUE_FLOAT, group: "Auto Frequency" },
    { id: 30, key: "freqDownStopPct", label: "Down Stop", type: CONFIG_VALUE_FLOAT, group: "Auto Frequency" },
    { id: 31, key: "freqUpTriggerOffsetPct", label: "Up Trigger Offset", type: CONFIG_VALUE_FLOAT, group: "Auto Frequency" },
    { id: 32, key: "freqUpStopSlope", label: "Up Stop Slope", type: CONFIG_VALUE_FLOAT, group: "Auto Frequency" },
    { id: 33, key: "freqUpStopOffsetPct", label: "Up Stop Offset", type: CONFIG_VALUE_FLOAT, group: "Auto Frequency" },
    { id: 34, key: "freqUpPredLimitPct", label: "Up Prediction Limit", type: CONFIG_VALUE_FLOAT, group: "Auto Frequency" },
    { id: 35, key: "freqFfGamma", label: "Feed-forward Gamma", type: CONFIG_VALUE_FLOAT, group: "Auto Frequency" },
    // Per-key run presets. Order MUST match APP_Protocol_WriteConfig() in
    // app_protocol.c (A enable/cc/cv/cp/time, then B). Units: CV mV, CC mA,
    // CP mW, time s (0 = continuous), enable 0/1. Group "Buttons" keeps these
    // out of the Configure->Defaults grid; they are edited in the Presets drawer.
    { id: 40, key: "btnAEnable", label: "Button A Enable", type: CONFIG_VALUE_U32, group: "Buttons" },
    { id: 41, key: "btnACcMa", label: "Button A CC (mA)", type: CONFIG_VALUE_U32, group: "Buttons" },
    { id: 42, key: "btnACvMv", label: "Button A CV (mV)", type: CONFIG_VALUE_U32, group: "Buttons" },
    { id: 43, key: "btnACpMw", label: "Button A CP (mW)", type: CONFIG_VALUE_U32, group: "Buttons" },
    { id: 44, key: "btnATimeS", label: "Button A Time (s)", type: CONFIG_VALUE_U32, group: "Buttons" },
    { id: 45, key: "btnBEnable", label: "Button B Enable", type: CONFIG_VALUE_U32, group: "Buttons" },
    { id: 46, key: "btnBCcMa", label: "Button B CC (mA)", type: CONFIG_VALUE_U32, group: "Buttons" },
    { id: 47, key: "btnBCvMv", label: "Button B CV (mV)", type: CONFIG_VALUE_U32, group: "Buttons" },
    { id: 48, key: "btnBCpMw", label: "Button B CP (mW)", type: CONFIG_VALUE_U32, group: "Buttons" },
    { id: 49, key: "btnBTimeS", label: "Button B Time (s)", type: CONFIG_VALUE_U32, group: "Buttons" },
    // Output calibration master switch. Edited on the Calibration tab, so the
    // group keeps it out of the Configure->Defaults grid like the Buttons set.
    { id: 50, key: "calEnable", label: "Calibration Enable", type: CONFIG_VALUE_U32, group: "Calibration" }
  ]);
  const CONFIG_FIELD_BY_KEY = Object.freeze(Object.fromEntries(CONFIG_FIELDS.map((field) => [field.key, field])));

  // ----- Switching/sampling constants matched to app_core.c --------------
  // ADC channels, sample times (2.5 cyc), and resolution (12/8 bit) are
  // baked into the CubeMX config and not host-tunable any more, so the
  // host only needs the buffer layout for parsing the embedded waveforms.
  const SAMPLES_PER_PERIOD = 24;
  const ADC1_FULL_SCALE = 4095;   // 12-bit
  const ADC2_FULL_SCALE = 255;    // 8-bit

  // Heartbeat payload after the 1-byte header and 2-byte little-endian
  // length matches app_core.c:build_heartbeat(). Total frame size:
  //   1 (header) + 2 (length) + payload + 2 (sum8+xor8)
  const HEARTBEAT_PAYLOAD_SIZE =
    (10 * 4) +              // measurement uint32s
    4 +                      // duty
    4 +                      // current_freq_hz (uint32)
    4 +                      // base_freq_hz (uint32)
    4 +                      // freq_policy (uint32)
    (3 * 4) +                // cv/cc/cp targets
    (6 * 4) +                // cv/cc/cp value+integral
    (4 * 4) +                // config revisions and flags
    1 + 1 + 2 +              // status_flags, key_flags, run_remaining
    (3 * 4) +                // ISR cycles last/min/max
    (SAMPLES_PER_PERIOD * 2 * 2) + // VSEC + VPRI uint16
    (SAMPLES_PER_PERIOD * 3) +     // ISEC + IPRI_AC + IPRI_DC uint8
    (2 * 4);                       // raw (pre-calibration) VSEC mV + ISEC mA
  const HEARTBEAT_FRAME_SIZE = 1 + 2 + HEARTBEAT_PAYLOAD_SIZE + 2;

  const DEFAULT_CONFIG = Object.freeze({
    kpCv: 0.0000040,
    kiCv: 0.0000008,
    kpCc: 0.0010000,
    kiCc: 0.0000800,
    kpCp: 0.0000010,
    kiCp: 0.0000001,
    baseFreqHz: 35000,
    freqPolicy: 1,
    softStartStep: 0.10,
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

  function sum8(frame, length) {
    let sum = 0;
    for (let i = 0; i < length; i += 1) sum = (sum + frame[i]) & 0xff;
    return sum;
  }

  function xor8(frame, length) {
    let value = 0;
    for (let i = 0; i < length; i += 1) value ^= frame[i];
    return value;
  }

  function readLe16(frame, offset) {
    return (frame[offset] | (frame[offset + 1] << 8)) >>> 0;
  }

  function readLe32(frame, offset) {
    return (
      frame[offset] |
      (frame[offset + 1] << 8) |
      (frame[offset + 2] << 16) |
      (frame[offset + 3] << 24)
    ) >>> 0;
  }

  function readFloat32(frame, offset) {
    const bytes = new Uint8Array(4);
    bytes[0] = frame[offset];
    bytes[1] = frame[offset + 1];
    bytes[2] = frame[offset + 2];
    bytes[3] = frame[offset + 3];
    return new DataView(bytes.buffer).getFloat32(0, true);
  }

  function writeLe16(frame, offset, value) {
    const normalized = value & 0xffff;
    frame[offset] = normalized & 0xff;
    frame[offset + 1] = (normalized >>> 8) & 0xff;
  }

  function writeLe32(frame, offset, value) {
    const normalized = value >>> 0;
    frame[offset] = normalized & 0xff;
    frame[offset + 1] = (normalized >>> 8) & 0xff;
    frame[offset + 2] = (normalized >>> 16) & 0xff;
    frame[offset + 3] = (normalized >>> 24) & 0xff;
  }

  function writeFloat32(frame, offset, value) {
    const view = new DataView(new ArrayBuffer(4));
    view.setFloat32(0, value, true);
    for (let i = 0; i < 4; i += 1) frame[offset + i] = view.getUint8(i);
  }

  function clampProtocolValue(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function cloneDefaultSettings() {
    return { ...DEFAULT_CONFIG };
  }

  function validateConfigForm(form) {
    const errors = [];
    if (!Number.isFinite(form.kpCv) || form.kpCv < 0) errors.push("Kp CV must be >= 0");
    if (!Number.isFinite(form.kiCv) || form.kiCv < 0) errors.push("Ki CV must be >= 0");
    if (!Number.isFinite(form.kpCc) || form.kpCc < 0) errors.push("Kp CC must be >= 0");
    if (!Number.isFinite(form.kiCc) || form.kiCc < 0) errors.push("Ki CC must be >= 0");
    if (!Number.isFinite(form.kpCp) || form.kpCp < 0) errors.push("Kp CP must be >= 0");
    if (!Number.isFinite(form.kiCp) || form.kiCp < 0) errors.push("Ki CP must be >= 0");

    if (!Number.isFinite(form.baseFreqHz) || form.baseFreqHz < 11000 || form.baseFreqHz > 45000) {
      errors.push("Frequency must be 11000..45000 Hz");
    }
    if (![0, 1].includes(Number(form.freqPolicy))) errors.push("Frequency policy must be fixed or auto");
    if (!Number.isFinite(form.softStartStep) || form.softStartStep < 0 || form.softStartStep > 1) errors.push("Soft-start step must be 0..1");
    if (!Number.isFinite(form.freqDutyFilterAlpha) || form.freqDutyFilterAlpha < 0 || form.freqDutyFilterAlpha > 1) errors.push("Duty filter alpha must be 0..1");
    if (!Number.isFinite(form.freqMinStepHz) || form.freqMinStepHz < 100) errors.push("Min step must be >= 100 Hz");
    if (!Number.isFinite(form.freqMaxStepHz) || form.freqMaxStepHz < form.freqMinStepHz) errors.push("Max step must be >= min step");

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
    writeLe16(frame, off, field ? field.id : (options.fieldId || 0)); off += 2;
    frame[off++] = type;
    if (type === CONFIG_VALUE_FLOAT) writeFloat32(frame, off, Number(options.value || 0));
    else writeLe32(frame, off, Number(options.value || 0) >>> 0);
    off += 4;
    writeLe16(frame, off, sequence); off += 2;
    frame[off++] = 0;
    frame[off++] = sum8(frame, CONFIG_REQUEST_FRAME_SIZE - 2);
    frame[off++] = xor8(frame, CONFIG_REQUEST_FRAME_SIZE - 1);
    return frame;
  }

  function buildConfigSetFieldRequest(fieldKey, value, sequence = 0) {
    const field = CONFIG_FIELD_BY_KEY[fieldKey];
    if (!field) throw new Error(`unknown config field ${fieldKey}`);
    return buildConfigRequest(CONFIG_OP_SET_FIELD, { field: fieldKey, value, valueType: field.type, sequence });
  }

  function buildCommandFrame(enable, disable, fixedDuty, cvMv, ccMa, cpMw, runSeconds, fixedDutyValue) {
    const frame = new Uint8Array(COMMAND_FRAME_SIZE);
    frame[0] = COMMAND_HEADER;
    frame[1] = COMMAND_FRAME_SIZE;
    frame[2] = (enable ? 0x01 : 0x00) | (disable ? 0x02 : 0x00) | (fixedDuty ? 0x04 : 0x00);
    writeLe32(frame, 3, clampProtocolValue(cvMv, 0, 0xffffffff));
    writeLe32(frame, 7, clampProtocolValue(ccMa, 0, 0xffffffff));
    writeLe32(frame, 11, clampProtocolValue(cpMw, 0, 0xffffffff));
    writeLe16(frame, 15, clampProtocolValue(runSeconds, 0, 0xffff));
    writeFloat32(frame, 17, fixedDutyValue);
    frame[21] = sum8(frame, 21);
    frame[22] = xor8(frame, 22);
    return frame;
  }

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
    if (frame.length < HEARTBEAT_FRAME_SIZE) {
      throw new Error("heartbeat frame too short");
    }
    if (frame[0] !== HEARTBEAT_HEADER) {
      throw new Error("invalid heartbeat header");
    }
    const length = readLe16(frame, 1);
    if (length !== HEARTBEAT_FRAME_SIZE) {
      throw new Error("invalid heartbeat length");
    }
    if (frame[HEARTBEAT_FRAME_SIZE - 2] !== sum8(frame, HEARTBEAT_FRAME_SIZE - 2) ||
        frame[HEARTBEAT_FRAME_SIZE - 1] !== xor8(frame, HEARTBEAT_FRAME_SIZE - 1)) {
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
    for (let k = 0; k < SAMPLES_PER_PERIOD; k += 1) {
      latest.isecSamples[k] = frame[offset++];
    }
    for (let k = 0; k < SAMPLES_PER_PERIOD; k += 1) {
      latest.ipriAcSamples[k] = frame[offset++];
    }
    for (let k = 0; k < SAMPLES_PER_PERIOD; k += 1) {
      latest.ipriDcSamples[k] = frame[offset++];
    }
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
    const rxBuffer = [];

    return {
      feed(value) {
        for (const byte of value) rxBuffer.push(byte & 0xff);

        const frames = [];
        while (rxBuffer.length >= 3) {
          const start = rxBuffer.indexOf(HEARTBEAT_HEADER);
          if (start < 0) {
            rxBuffer.length = 0;
            return frames;
          }
          if (start > 0) rxBuffer.splice(0, start);
          if (rxBuffer.length < 3) return frames;

          const length = rxBuffer[1] | (rxBuffer[2] << 8);
          if (length !== HEARTBEAT_FRAME_SIZE) {
            // not our frame; discard the stray header and keep scanning
            rxBuffer.shift();
            continue;
          }
          if (rxBuffer.length < HEARTBEAT_FRAME_SIZE) return frames;

          const frame = rxBuffer.slice(0, HEARTBEAT_FRAME_SIZE);
          if (frame[HEARTBEAT_FRAME_SIZE - 2] !== sum8(frame, HEARTBEAT_FRAME_SIZE - 2) ||
              frame[HEARTBEAT_FRAME_SIZE - 1] !== xor8(frame, HEARTBEAT_FRAME_SIZE - 1)) {
            rxBuffer.shift();
            continue;
          }

          frames.push(frame);
          rxBuffer.splice(0, HEARTBEAT_FRAME_SIZE);
        }
        return frames;
      },
      reset() {
        rxBuffer.length = 0;
      }
    };
  }

  function parseConfigRecord(frame, offset) {
    const config = {};
    for (const field of CONFIG_FIELDS) {
      if (field.type === CONFIG_VALUE_FLOAT) {
        config[field.key] = readFloat32(frame, offset);
      } else {
        config[field.key] = readLe32(frame, offset);
      }
      offset += 4;
    }
    return { config, offset };
  }

  function parseConfigResponseFrame(frame) {
    if (frame.length < CONFIG_RESPONSE_BASE_SIZE) throw new Error("config response too short");
    if (frame[0] !== CONFIG_RESPONSE_HEADER) throw new Error("invalid config response header");
    const length = readLe16(frame, 1);
    if (frame.length < length) throw new Error("truncated config response");
    if (frame[length - 2] !== sum8(frame, length - 2) ||
        frame[length - 1] !== xor8(frame, length - 1)) {
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
      offset = parsed.offset;
    } else if (response.op === CONFIG_OP_GET_FIELD) {
      response.valueType = frame[offset++];
      response.value = response.valueType === CONFIG_VALUE_FLOAT
        ? readFloat32(frame, offset)
        : readLe32(frame, offset);
      offset += 4;
    }
    return response;
  }

  function createConfigResponseDecoder() {
    const rxBuffer = [];
    return {
      feed(value) {
        for (const byte of value) rxBuffer.push(byte & 0xff);
        const frames = [];
        while (rxBuffer.length >= 3) {
          const start = rxBuffer.indexOf(CONFIG_RESPONSE_HEADER);
          if (start < 0) {
            rxBuffer.length = 0;
            return frames;
          }
          if (start > 0) rxBuffer.splice(0, start);
          if (rxBuffer.length < 3) return frames;
          const length = rxBuffer[1] | (rxBuffer[2] << 8);
          if (length < CONFIG_RESPONSE_BASE_SIZE || length > CONFIG_RESPONSE_MAX_SIZE) {
            rxBuffer.shift();
            continue;
          }
          if (rxBuffer.length < length) return frames;
          const frame = rxBuffer.slice(0, length);
          if (frame[length - 2] !== sum8(frame, length - 2) ||
              frame[length - 1] !== xor8(frame, length - 1)) {
            rxBuffer.shift();
            continue;
          }
          frames.push(frame);
          rxBuffer.splice(0, length);
        }
        return frames;
      },
      reset() {
        rxBuffer.length = 0;
      }
    };
  }

  // ===== Output calibration =============================================
  // The firmware stores a dense residual grid (delta = measured - raw) and
  // looks it up with linear/bilinear interpolation. The host compiles arbitrary
  // user points into that grid: exact at the points, piecewise-linear between
  // bracketing points, and a bidirectional distance-decay K(d)=1/(1+(d/R)^2)
  // outside them so a lone point fades smoothly to zero instead of
  // extrapolating. Layout/units/CRC mirror calibration.c exactly.
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
  const CAL_DEFAULT_RV_V = 350; // voltage decay radius (reproduces the worked example)
  const CAL_DEFAULT_RI_MA = 50; // current decay radius

  const CAL_STATUS = Object.freeze({
    0: "OK",
    1: "BAD LENGTH",
    2: "BAD DIMENSIONS",
    3: "BAD CRC",
    4: "FLASH ERROR",
    6: "LOCKED (output on)",
    7: "BAD REQUEST"
  });

  // CRC32 (zlib, poly 0xEDB88320) -- byte-for-byte identical to calibration.c.
  const CRC32_TABLE = (function () {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes, start, end) {
    let crc = 0xffffffff;
    for (let i = start; i < end; i += 1) {
      crc = (CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function calDecayWeight(distance, radius) {
    const r = radius > 0 ? radius : 1;
    const t = distance / r;
    return 1 / (1 + t * t);
  }

  // 1D residual curve over gridXs from scattered {x, d} samples: exact at the
  // samples, linear between them, decaying outside (and around a lone sample).
  // Samples sharing an x are averaged. No samples -> all zeros (ideal table).
  function calBuildCurve1D(samples, gridXs, radius) {
    const out = new Float64Array(gridXs.length);
    if (!samples.length) return out;

    const merged = [];
    samples.slice().sort((a, b) => a.x - b.x).forEach((s) => {
      const last = merged[merged.length - 1];
      if (last && Math.abs(last.x - s.x) < 1e-6) { last.sum += s.d; last.n += 1; }
      else merged.push({ x: s.x, sum: s.d, n: 1 });
    });
    const pts = merged.map((m) => ({ x: m.x, d: m.sum / m.n }));
    const first = pts[0];
    const last = pts[pts.length - 1];

    for (let g = 0; g < gridXs.length; g += 1) {
      const x = gridXs[g];
      if (x <= first.x) {
        out[g] = first.d * calDecayWeight(first.x - x, radius);
      } else if (x >= last.x) {
        out[g] = last.d * calDecayWeight(x - last.x, radius);
      } else {
        let lo = 0;
        while (lo < pts.length - 1 && pts[lo + 1].x <= x) lo += 1;
        const a = pts[lo];
        const b = pts[lo + 1];
        out[g] = a.d + (b.d - a.d) * ((x - a.x) / (b.x - a.x));
      }
    }
    return out;
  }

  // Compile user points -> { dv: Int16Array (0.1 V), di: Int16Array (0.1 mA) }.
  //   voltagePoints: [{ setV (V), measuredV (V), measuredI (mA)|null }]
  //   currentPoints: [{ setI (mA), measuredI (mA) }]
  function compileCalibration(voltagePoints, currentPoints, options = {}) {
    const rv = Number.isFinite(options.radiusV) && options.radiusV > 0 ? options.radiusV : CAL_DEFAULT_RV_V;
    const ri = Number.isFinite(options.radiusI) && options.radiusI > 0 ? options.radiusI : CAL_DEFAULT_RI_MA;

    const vGrid = new Float64Array(CAL_V_POINTS);
    for (let v = 0; v < CAL_V_POINTS; v += 1) vGrid[v] = (v * CAL_V_STEP_MV) / 1000;
    const iGrid = new Float64Array(CAL_I_POINTS);
    for (let i = 0; i < CAL_I_POINTS; i += 1) iGrid[i] = i * CAL_I_STEP_MA;

    // Current grid (1D): residual = measured - set (mA).
    const iSamples = (currentPoints || [])
      .filter((p) => Number.isFinite(p.setI) && Number.isFinite(p.measuredI))
      .map((p) => ({ x: p.setI, d: p.measuredI - p.setI }));
    const iCurve = calBuildCurve1D(iSamples, iGrid, ri);
    const di = new Int16Array(CAL_I_POINTS);
    for (let i = 0; i < CAL_I_POINTS; i += 1) {
      di[i] = Math.round(clampProtocolValue(iCurve[i], -CAL_MAX_DI_MA, CAL_MAX_DI_MA) * 10);
    }

    // Voltage base curve B(V): unconditional voltage points define the base.
    // If the user only provides current-bearing points, fall back to all points
    // so a lone point still produces a broad voltage correction. Load-coupling
    // then appears only when there is enough information to separate it from
    // the base (for example an unconditional point, or repeated V with
    // different currents).
    const vPts = (voltagePoints || []).filter((p) => Number.isFinite(p.setV) && Number.isFinite(p.measuredV));
    const unconditional = vPts.filter((p) => !Number.isFinite(p.measuredI));
    const baseSource = unconditional.length > 0 ? unconditional : vPts;
    const baseSamples = baseSource.map((p) => ({ x: p.setV, d: p.measuredV - p.setV }));
    const baseCurve = calBuildCurve1D(baseSamples, vGrid, rv);
    const baseAt = calBuildCurve1D(baseSamples, vPts.map((p) => p.setV), rv);

    // Load-coupling layer from current-bearing points: each contributes its
    // deviation from the base, decayed in both V and I. A point that is alone at
    // its voltage has ~zero deviation (it cannot separate load from base), so its
    // effect stays in the base and applies across all currents.
    const loadPts = [];
    vPts.forEach((p, idx) => {
      if (Number.isFinite(p.measuredI)) {
        loadPts.push({ v: p.setV, i: p.measuredI, rel: (p.measuredV - p.setV) - baseAt[idx] });
      }
    });

    const dv = new Int16Array(CAL_V_POINTS * CAL_I_POINTS);
    let maxAbsV = 0;
    for (let v = 0; v < CAL_V_POINTS; v += 1) {
      for (let i = 0; i < CAL_I_POINTS; i += 1) {
        let load = 0;
        for (let p = 0; p < loadPts.length; p += 1) {
          const lp = loadPts[p];
          load += lp.rel * calDecayWeight(Math.abs(vGrid[v] - lp.v), rv) * calDecayWeight(Math.abs(iGrid[i] - lp.i), ri);
        }
        const corr = clampProtocolValue(baseCurve[v] + load, -CAL_MAX_DV_MV / 1000, CAL_MAX_DV_MV / 1000);
        dv[v * CAL_I_POINTS + i] = Math.round(corr * 10);
        if (Math.abs(corr) > maxAbsV) maxAbsV = Math.abs(corr);
      }
    }

    return { dv, di, maxAbsV, vPoints: CAL_V_POINTS, iPoints: CAL_I_POINTS };
  }

  // Bilinear lookup that mirrors Calibration_ApplyVoltage (returns corrected mV).
  function calEvalVoltage(grid, vMv, iMa) {
    let xv = clampProtocolValue(vMv / CAL_V_STEP_MV, 0, CAL_V_POINTS - 1);
    let xi = clampProtocolValue(iMa / CAL_I_STEP_MA, 0, CAL_I_POINTS - 1);
    const v0 = Math.floor(xv);
    const v1 = Math.min(v0 + 1, CAL_V_POINTS - 1);
    const fv = xv - v0;
    const i0 = Math.floor(xi);
    const i1 = Math.min(i0 + 1, CAL_I_POINTS - 1);
    const fi = xi - i0;
    const g = grid.dv;
    const a = g[v0 * CAL_I_POINTS + i0] + (g[v1 * CAL_I_POINTS + i0] - g[v0 * CAL_I_POINTS + i0]) * fv;
    const b = g[v0 * CAL_I_POINTS + i1] + (g[v1 * CAL_I_POINTS + i1] - g[v0 * CAL_I_POINTS + i1]) * fv;
    const dvMv = clampProtocolValue((a + (b - a) * fi) * 100, -CAL_MAX_DV_MV, CAL_MAX_DV_MV);
    return vMv + dvMv;
  }

  function calEvalCurrent(grid, iMa) {
    const x = iMa / CAL_I_STEP_MA;
    let di;
    if (x <= 0) di = grid.di[0];
    else if (x >= CAL_I_POINTS - 1) di = grid.di[CAL_I_POINTS - 1];
    else { const i0 = Math.floor(x); di = grid.di[i0] + (grid.di[i0 + 1] - grid.di[i0]) * (x - i0); }
    return iMa + clampProtocolValue(di * 0.1, -CAL_MAX_DI_MA, CAL_MAX_DI_MA);
  }

  // Serialize a compiled grid into the 9388-byte flash image (matches calibration.c).
  function buildCalImage(grid) {
    const img = new Uint8Array(CAL_IMAGE_BYTES);
    writeLe32(img, 0, CAL_MAGIC);
    writeLe32(img, 8, CAL_VERSION);
    writeLe32(img, 12, CAL_V_POINTS);
    writeLe32(img, 16, CAL_I_POINTS);
    writeLe32(img, 20, CAL_V_STEP_MV);
    writeLe32(img, 24, CAL_I_STEP_MA);
    writeLe32(img, 28, CAL_V_MAX_MV);
    writeLe32(img, 32, CAL_I_MAX_MA);
    writeLe32(img, 36, 0); // flags
    writeLe32(img, 40, CAL_DATA_BYTES);
    const view = new DataView(img.buffer);
    for (let i = 0; i < CAL_I_POINTS; i += 1) view.setInt16(CAL_DI_OFFSET + i * 2, grid.di[i], true);
    for (let k = 0; k < CAL_V_POINTS * CAL_I_POINTS; k += 1) view.setInt16(CAL_DV_OFFSET + k * 2, grid.dv[k], true);
    writeLe32(img, 4, crc32(img, 8, CAL_IMAGE_BYTES));
    return img;
  }

  function buildCalFrame(op, payload) {
    const len = 4 + payload.length + 2;
    const frame = new Uint8Array(len);
    frame[0] = CAL_REQUEST_HEADER;
    frame[1] = len;
    frame[2] = op;
    frame[3] = 0;
    frame.set(payload, 4);
    frame[len - 2] = sum8(frame, len - 2);
    frame[len - 1] = xor8(frame, len - 1);
    return frame;
  }

  function buildCalBeginFrame(totalLen, crc) {
    const payload = new Uint8Array(8);
    writeLe32(payload, 0, totalLen);
    writeLe32(payload, 4, crc);
    return buildCalFrame(CAL_OP_BEGIN, payload);
  }

  function buildCalDataFrame(offset, chunk) {
    const payload = new Uint8Array(6 + chunk.length);
    writeLe32(payload, 0, offset);
    writeLe16(payload, 4, chunk.length);
    payload.set(chunk, 6);
    return buildCalFrame(CAL_OP_DATA, payload);
  }

  function buildCalCommitFrame() { return buildCalFrame(CAL_OP_COMMIT, new Uint8Array(0)); }
  function buildCalGetInfoFrame() { return buildCalFrame(CAL_OP_GET_INFO, new Uint8Array(0)); }

  // Split an image into the ordered frames the host streams one-at-a-time
  // (stop-and-wait, waiting for each 0xC8 reply): [begin, data..., commit].
  function buildCalUploadFrames(image) {
    const frames = [buildCalBeginFrame(image.length, crc32(image, 8, image.length))];
    for (let off = 0; off < image.length; off += CAL_MAX_CHUNK) {
      frames.push(buildCalDataFrame(off, image.subarray(off, Math.min(off + CAL_MAX_CHUNK, image.length))));
    }
    frames.push(buildCalCommitFrame());
    return frames;
  }

  function parseCalResponseFrame(frame) {
    if (frame.length < CAL_RESPONSE_LEN) throw new Error("cal response too short");
    if (frame[0] !== CAL_RESPONSE_HEADER) throw new Error("invalid cal response header");
    if (frame[1] !== CAL_RESPONSE_LEN) throw new Error("invalid cal response length");
    if (frame[CAL_RESPONSE_LEN - 2] !== sum8(frame, CAL_RESPONSE_LEN - 2) ||
        frame[CAL_RESPONSE_LEN - 1] !== xor8(frame, CAL_RESPONSE_LEN - 1)) {
      throw new Error("invalid cal response checksum");
    }
    return {
      op: frame[2],
      status: frame[3],
      valid: frame[4] !== 0,
      enable: frame[5] !== 0,
      version: readLe32(frame, 6),
      crc: readLe32(frame, 10),
      vPoints: readLe16(frame, 14),
      iPoints: readLe16(frame, 16),
      imageLen: readLe32(frame, 18),
      maxChunk: readLe16(frame, 22)
    };
  }

  function createCalResponseDecoder() {
    const rxBuffer = [];
    return {
      feed(value) {
        for (const byte of value) rxBuffer.push(byte & 0xff);
        const frames = [];
        while (rxBuffer.length >= 2) {
          const start = rxBuffer.indexOf(CAL_RESPONSE_HEADER);
          if (start < 0) { rxBuffer.length = 0; return frames; }
          if (start > 0) rxBuffer.splice(0, start);
          if (rxBuffer.length < 2) return frames;
          if (rxBuffer[1] !== CAL_RESPONSE_LEN) { rxBuffer.shift(); continue; }
          if (rxBuffer.length < CAL_RESPONSE_LEN) return frames;
          const frame = rxBuffer.slice(0, CAL_RESPONSE_LEN);
          if (frame[CAL_RESPONSE_LEN - 2] !== sum8(frame, CAL_RESPONSE_LEN - 2) ||
              frame[CAL_RESPONSE_LEN - 1] !== xor8(frame, CAL_RESPONSE_LEN - 1)) {
            rxBuffer.shift(); continue;
          }
          frames.push(frame);
          rxBuffer.splice(0, CAL_RESPONSE_LEN);
        }
        return frames;
      },
      reset() { rxBuffer.length = 0; }
    };
  }

  // ----- Single-cycle waveform helpers -----------------------------------
  window.HvccpsProtocol = Object.freeze({
    HEARTBEAT_HEADER,
    HEARTBEAT_FRAME_SIZE,
    HEARTBEAT_PAYLOAD_SIZE,
    COMMAND_HEADER,
    COMMAND_FRAME_SIZE,
    CONFIG_REQUEST_HEADER,
    CONFIG_REQUEST_FRAME_SIZE,
    CONFIG_RESPONSE_HEADER,
    CONFIG_FIELDS,
    CONFIG_FIELD_BY_KEY,
    CONFIG_VALUE_U32,
    CONFIG_VALUE_FLOAT,
    CONFIG_TARGET_DRAFT,
    CONFIG_TARGET_ACTIVE,
    CONFIG_OP_GET_SNAPSHOT,
    CONFIG_OP_GET_FIELD,
    CONFIG_OP_SET_FIELD,
    CONFIG_OP_RESET_FIELD,
    CONFIG_OP_APPLY_DRAFT,
    CONFIG_OP_SAVE_DRAFT,
    CONFIG_OP_LOAD_FLASH,
    CONFIG_OP_LOAD_DEFAULTS,
    CONFIG_OP_FACTORY_RESET,
    CONFIG_STATUS,
    MAX_CV_V,
    MAX_CC_MA,
    MAX_CP_W,
    RUN_CONTINUOUS,
    SAMPLES_PER_PERIOD,
    ADC1_FULL_SCALE,
    ADC2_FULL_SCALE,
    DEFAULT_CONFIG,
    sum8,
    xor8,
    validateConfigForm,
    buildConfigRequest,
    buildConfigSetFieldRequest,
    buildCommandFrame,
    cloneDefaultSettings,
    createLatest,
    parseHeartbeatFrame,
    createHeartbeatDecoder,
    parseConfigResponseFrame,
    createConfigResponseDecoder,
    CAL_REQUEST_HEADER,
    CAL_RESPONSE_HEADER,
    CAL_RESPONSE_LEN,
    CAL_MAX_CHUNK,
    CAL_OP_BEGIN,
    CAL_OP_DATA,
    CAL_OP_COMMIT,
    CAL_OP_GET_INFO,
    CAL_V_POINTS,
    CAL_I_POINTS,
    CAL_V_STEP_MV,
    CAL_I_STEP_MA,
    CAL_V_MAX_MV,
    CAL_I_MAX_MA,
    CAL_IMAGE_BYTES,
    CAL_MAX_DV_MV,
    CAL_MAX_DI_MA,
    CAL_DEFAULT_RV_V,
    CAL_DEFAULT_RI_MA,
    CAL_STATUS,
    crc32,
    compileCalibration,
    calEvalVoltage,
    calEvalCurrent,
    buildCalImage,
    buildCalBeginFrame,
    buildCalDataFrame,
    buildCalCommitFrame,
    buildCalGetInfoFrame,
    buildCalUploadFrames,
    parseCalResponseFrame,
    createCalResponseDecoder
  });
})();
