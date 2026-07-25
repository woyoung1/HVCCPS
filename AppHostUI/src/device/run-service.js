// Run control: the operator's staged setpoints plus start / stop / update.
//
// The staged form lives here (not in a view) so the command bar, the run
// options drawer, the undo stack and any plugin all read and write the exact
// same numbers.
//
// Update-targets detail: the firmware writes cv/cc/cp from EVERY command frame
// before it looks at the flag bits (app_core.c parse_command), and only
// restarts the run timer when the ENABLE bit is set. So a target update is sent
// with NO flags -- the setpoints move and the countdown keeps running.

HV.define("device/run-service", function (require, exports) {
"use strict";

const { bus, EVENTS } = require("core/bus");
const { notify, notifyFailure } = require("core/notify");
const { requestRender } = require("core/scheduler");
const { readJson, writeJson } = require("core/storage");
const { buildCommandFrame, MAX_CC_MA, MAX_CP_W, MAX_CV_V, MAX_RUN_SECONDS } = require("protocol/index");

const STORAGE_AREA = "app";
const STORAGE_KEY = "run.form.v1";

const START_MODE = Object.freeze({ CLOSED_LOOP: "closed", FIXED_DUTY: "fixed" });

function defaultForm() {
  return {
    cvV: 1200,
    ccMa: 80,
    cpW: 120,
    runSeconds: 10,
    continuous: false,
    mode: START_MODE.CLOSED_LOOP,
    fixedDutyPct: 20
  };
}

function sanitizeForm(raw) {
  const base = defaultForm();
  if (!raw || typeof raw !== "object") return base;
  return {
    cvV: Number.isFinite(raw.cvV) ? raw.cvV : base.cvV,
    ccMa: Number.isFinite(raw.ccMa) ? raw.ccMa : base.ccMa,
    cpW: Number.isFinite(raw.cpW) ? raw.cpW : base.cpW,
    runSeconds: Number.isFinite(raw.runSeconds) ? raw.runSeconds : base.runSeconds,
    continuous: !!raw.continuous,
    mode: raw.mode === START_MODE.FIXED_DUTY ? START_MODE.FIXED_DUTY : START_MODE.CLOSED_LOOP,
    fixedDutyPct: Number.isFinite(raw.fixedDutyPct) ? raw.fixedDutyPct : base.fixedDutyPct
  };
}

function createRunService(device) {
  let form = sanitizeForm(readJson(STORAGE_AREA, STORAGE_KEY, null));

  function persist() {
    writeJson(STORAGE_AREA, STORAGE_KEY, form);
  }

  function getForm() {
    return { ...form };
  }

  function patch(changes, { persistNow = true } = {}) {
    form = { ...form, ...changes };
    if (persistNow) persist();
    requestRender();
  }

  function replaceForm(next) {
    form = sanitizeForm(next);
    persist();
    requestRender();
  }

  /** @returns {{ok: boolean, error?: {key: string, params?: object}, values?: object}} */
  function validate() {
    if (!Number.isFinite(form.cvV) || form.cvV < 0 || form.cvV > MAX_CV_V) {
      return { ok: false, error: { key: "validate.cvRange", params: { max: MAX_CV_V } } };
    }
    if (!Number.isFinite(form.ccMa) || form.ccMa < 0 || form.ccMa > MAX_CC_MA) {
      return { ok: false, error: { key: "validate.ccRange", params: { max: MAX_CC_MA } } };
    }
    if (!Number.isFinite(form.cpW) || form.cpW < 0 || form.cpW > MAX_CP_W) {
      return { ok: false, error: { key: "validate.cpRange", params: { max: MAX_CP_W } } };
    }
    let runSeconds = 0;
    if (!form.continuous) {
      runSeconds = Math.trunc(form.runSeconds);
      if (!Number.isFinite(runSeconds) || runSeconds < 1 || runSeconds > MAX_RUN_SECONDS) {
        return { ok: false, error: { key: "validate.runSeconds", params: { max: MAX_RUN_SECONDS } } };
      }
    }
    const fixedSelected = form.mode === START_MODE.FIXED_DUTY;
    let fixedDuty = 0;
    if (fixedSelected) {
      if (!Number.isFinite(form.fixedDutyPct) || form.fixedDutyPct < 0 || form.fixedDutyPct > 100) {
        return { ok: false, error: { key: "validate.fixedDuty" } };
      }
      fixedDuty = form.fixedDutyPct / 100;
    }
    return {
      ok: true,
      values: {
        cvMv: Math.round(form.cvV) * 1000,
        ccMa: Math.round(form.ccMa),
        cpMw: Math.round(form.cpW * 1000),
        runSeconds,
        fixedDuty,
        fixedSelected
      }
    };
  }

  /** True when the staged setpoints differ from what the device reports. */
  function targetsDiffer() {
    const check = validate();
    if (!check.ok) return false;
    const latest = device.telemetry.latest;
    return (
      check.values.cvMv !== latest.cvTargetMv ||
      check.values.ccMa !== latest.ccTargetMa ||
      check.values.cpMw !== latest.cpTargetMw
    );
  }

  async function start() {
    const check = validate();
    if (!check.ok) {
      bus.emit(EVENTS.TOAST, { level: "error", key: check.error.key, params: check.error.params });
      return false;
    }
    const v = check.values;
    try {
      await device.sendFrame(
        buildCommandFrame(true, false, v.fixedSelected, v.cvMv, v.ccMa, v.cpMw, v.runSeconds, v.fixedDuty),
        "command"
      );
      notify(v.fixedSelected ? "msg.fixedDutyStartSent" : "msg.startSent", {
        duty: (v.fixedDuty * 100).toFixed(1)
      });
      return true;
    } catch (error) {
      notifyFailure("msg.sendFailed", error);
      return false;
    }
  }

  /** Push new setpoints without touching the run timer or the output latch. */
  async function updateTargets() {
    const check = validate();
    if (!check.ok) {
      bus.emit(EVENTS.TOAST, { level: "error", key: check.error.key, params: check.error.params });
      return false;
    }
    const v = check.values;
    try {
      await device.sendFrame(buildCommandFrame(false, false, false, v.cvMv, v.ccMa, v.cpMw, 0, 0), "command");
      notify("msg.targetsSent");
      return true;
    } catch (error) {
      notifyFailure("msg.sendFailed", error);
      return false;
    }
  }

  async function stop() {
    const latest = device.telemetry.latest;
    try {
      await device.sendFrame(
        buildCommandFrame(false, true, false, latest.cvTargetMv, latest.ccTargetMa, latest.cpTargetMw, 0, 0),
        "command"
      );
      notify("msg.stopSent");
      return true;
    } catch (error) {
      notifyFailure("msg.sendFailed", error);
      return false;
    }
  }

  /** Fire a stored preset's values as a one-shot closed-loop run. */
  async function startWith({ cvMv, ccMa, cpMw, runSeconds }) {
    try {
      await device.sendFrame(buildCommandFrame(true, false, false, cvMv, ccMa, cpMw, runSeconds, 0), "command");
      return true;
    } catch (error) {
      notifyFailure("msg.sendFailed", error);
      return false;
    }
  }

  return {
    getForm,
    patch,
    replaceForm,
    validate,
    targetsDiffer,
    start,
    stop,
    updateTargets,
    startWith,
    defaults: defaultForm
  };
}

exports.createRunService = createRunService;
exports.START_MODE = START_MODE;
});
