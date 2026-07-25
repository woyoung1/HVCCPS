// Front-panel key presets.
//
// Each key runs a stored closed-loop preset (CC/CV/CP + run time) held in the
// device config (btnA*/btnB* fields). Edited here, persisted to flash, and
// executed by the firmware on a physical key press with no host attached.

HV.define("device/presets-service", function (require, exports) {
"use strict";

const { bus, EVENTS } = require("core/bus");
const { notify, notifyFailure } = require("core/notify");
const { requestRender } = require("core/scheduler");
const { CONFIG_OP_APPLY_DRAFT, CONFIG_OP_SAVE_DRAFT, MAX_CC_MA, MAX_CP_W, MAX_CV_V, MAX_RUN_SECONDS } = require("protocol/index");

const PRESET_SLOTS = Object.freeze(["A", "B"]);

function emptyPreset(continuous = false, timeS = 5) {
  return { enabled: false, cvV: 0, ccMa: 0, cpW: 0, timeS, continuous };
}

function createPresetsService(device, config) {
  const model = {
    A: emptyPreset(false, 5),
    B: emptyPreset(true, 10)
  };

  function fromConfig(cfg) {
    if (!cfg) return;
    for (const slot of PRESET_SLOTS) {
      const timeS = Number(cfg[`btn${slot}TimeS`]) || 0;
      model[slot] = {
        enabled: Number(cfg[`btn${slot}Enable`]) !== 0,
        cvV: (Number(cfg[`btn${slot}CvMv`]) || 0) / 1000,
        ccMa: Number(cfg[`btn${slot}CcMa`]) || 0,
        cpW: (Number(cfg[`btn${slot}CpMw`]) || 0) / 1000,
        timeS: timeS === 0 ? model[slot].timeS : timeS,
        continuous: timeS === 0
      };
    }
    requestRender();
  }

  bus.on(EVENTS.CONFIG_SNAPSHOT, ({ draft }) => fromConfig(draft));

  function get(slot) {
    return { ...model[slot] };
  }

  function patch(slot, changes) {
    model[slot] = { ...model[slot], ...changes };
    requestRender();
  }

  /** @returns {{ok: boolean, error?: {key, params}, values?: object}} */
  function validateSlot(slot) {
    const preset = model[slot];
    if (!Number.isFinite(preset.cvV) || preset.cvV < 0 || preset.cvV > MAX_CV_V) {
      return { ok: false, error: { key: "validate.presetCv", params: { slot, max: MAX_CV_V } } };
    }
    if (!Number.isFinite(preset.ccMa) || preset.ccMa < 0 || preset.ccMa > MAX_CC_MA) {
      return { ok: false, error: { key: "validate.presetCc", params: { slot, max: MAX_CC_MA } } };
    }
    if (!Number.isFinite(preset.cpW) || preset.cpW < 0 || preset.cpW > MAX_CP_W) {
      return { ok: false, error: { key: "validate.presetCp", params: { slot, max: MAX_CP_W } } };
    }
    let timeS = 0;
    if (!preset.continuous) {
      timeS = Math.trunc(preset.timeS);
      if (!Number.isFinite(timeS) || timeS < 1 || timeS > MAX_RUN_SECONDS) {
        return { ok: false, error: { key: "validate.presetTime", params: { slot, max: MAX_RUN_SECONDS } } };
      }
    }
    return {
      ok: true,
      values: {
        enable: preset.enabled ? 1 : 0,
        cvMv: Math.round(preset.cvV) * 1000,
        ccMa: Math.round(preset.ccMa),
        cpMw: Math.round(preset.cpW * 1000),
        timeS // 0 = continuous, same convention as the run command
      }
    };
  }

  function validate() {
    for (const slot of PRESET_SLOTS) {
      const result = validateSlot(slot);
      if (!result.ok) return result;
    }
    return { ok: true };
  }

  async function saveToFlash() {
    if (!device.isConnected()) {
      bus.emit(EVENTS.TOAST, { level: "error", key: "msg.connectFirst" });
      return false;
    }
    if (device.isOutputLive()) {
      bus.emit(EVENTS.TOAST, { level: "error", key: "msg.stopBeforePresets" });
      return false;
    }
    const entries = [];
    for (const slot of PRESET_SLOTS) {
      const result = validateSlot(slot);
      if (!result.ok) {
        bus.emit(EVENTS.TOAST, { level: "error", key: result.error.key, params: result.error.params });
        return false;
      }
      const v = result.values;
      entries.push(
        [`btn${slot}Enable`, v.enable],
        [`btn${slot}CcMa`, v.ccMa],
        [`btn${slot}CvMv`, v.cvMv],
        [`btn${slot}CpMw`, v.cpMw],
        [`btn${slot}TimeS`, v.timeS]
      );
    }
    try {
      await config.pushFields(entries);
      const applied = await device.configRequest(CONFIG_OP_APPLY_DRAFT);
      if (applied.status !== 0) throw new Error(String(applied.status));
      const saved = await device.configRequest(CONFIG_OP_SAVE_DRAFT);
      if (saved.status !== 0) throw new Error(String(saved.status));
      await config.syncSnapshot();
      notify("msg.presetsSaved");
      return true;
    } catch (error) {
      notifyFailure("msg.presetsSaveFailed", error);
      return false;
    }
  }

  async function runNow(slot, run) {
    if (!device.isConnected()) {
      bus.emit(EVENTS.TOAST, { level: "error", key: "msg.connectFirst" });
      return false;
    }
    const result = validateSlot(slot);
    if (!result.ok) {
      bus.emit(EVENTS.TOAST, { level: "error", key: result.error.key, params: result.error.params });
      return false;
    }
    const v = result.values;
    const ok = await run.startWith({ cvMv: v.cvMv, ccMa: v.ccMa, cpMw: v.cpMw, runSeconds: v.timeS });
    if (ok) notify("msg.presetStartSent", { slot });
    return ok;
  }

  return { model, get, patch, validate, validateSlot, saveToFlash, runNow };
}

exports.createPresetsService = createPresetsService;
exports.PRESET_SLOTS = PRESET_SLOTS;
});
