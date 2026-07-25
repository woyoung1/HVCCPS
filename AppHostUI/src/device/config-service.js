// Device configuration: the editable draft mirror plus the apply / save /
// load / reset operations. The Configure drawer is a pure view over this.

HV.define("device/config-service", function (require, exports) {
"use strict";

const { bus, EVENTS } = require("core/bus");
const { notify, notifyFailure } = require("core/notify");
const { requestRender } = require("core/scheduler");
const { t } = require("i18n/index");
const { cloneDefaultSettings, CONFIG_FIELDS, CONFIG_OP_APPLY_DRAFT, CONFIG_OP_GET_SNAPSHOT, CONFIG_OP_SAVE_DRAFT, CONFIG_OP_SET_FIELD, CONFIG_STATUS, CONFIG_VALUE_FLOAT, validateConfigForm } = require("protocol/index");

function configStatusText(status) {
  const key = CONFIG_STATUS[status];
  return key ? t(`status.config.${key}`) : t("status.config.unknown", { code: status });
}

function statusError(status) {
  const error = new Error(configStatusText(status));
  error.deviceStatus = status;
  return error;
}

function createConfigService(device) {
  const model = {
    form: cloneDefaultSettings(),
    deviceDraft: null,
    deviceActive: null
  };

  bus.on(EVENTS.CONFIG_SNAPSHOT, ({ draft, active }) => {
    if (draft) {
      model.deviceDraft = draft;
      model.form = { ...draft };
    }
    if (active) model.deviceActive = active;
    requestRender();
  });

  bus.on(EVENTS.LINK_CLOSE, () => {
    model.deviceDraft = null;
    model.deviceActive = null;
    requestRender();
  });

  function getForm() {
    return { ...model.form };
  }

  function setField(key, value) {
    model.form = { ...model.form, [key]: value };
    requestRender();
  }

  function replaceForm(next) {
    model.form = { ...next };
    requestRender();
  }

  function validate() {
    return validateConfigForm(model.form);
  }

  async function syncSnapshot({ announce = false } = {}) {
    try {
      const response = await device.configRequest(CONFIG_OP_GET_SNAPSHOT);
      if (response.status !== 0) throw statusError(response.status);
      if (announce) notify("msg.draftSynced");
      return response;
    } catch (error) {
      notifyFailure("msg.configSyncFailed", error);
      return null;
    }
  }

  async function runSimpleOp(op, okKey) {
    if (device.isOutputLive() && op !== CONFIG_OP_GET_SNAPSHOT) {
      bus.emit(EVENTS.TOAST, { level: "error", key: "msg.stopBeforeConfig" });
      return false;
    }
    try {
      const response = await device.configRequest(op);
      if (response.status !== 0) throw statusError(response.status);
      await syncSnapshot();
      notify(okKey);
      return true;
    } catch (error) {
      notifyFailure("msg.configCommandFailed", error);
      return false;
    }
  }

  /** Write only the fields that actually changed, then activate the draft. */
  async function pushFields(entries) {
    const baseline = model.deviceDraft || {};
    for (const [key, value] of entries) {
      const previous = baseline[key];
      const field = CONFIG_FIELDS.find((item) => item.key === key);
      const changed =
        field && field.type === CONFIG_VALUE_FLOAT
          ? Math.abs(Number(value) - Number(previous)) > 1e-9
          : Number(value) !== Number(previous);
      if (!changed) continue;
      const response = await device.configRequest(CONFIG_OP_SET_FIELD, { field: key, value });
      if (response.status !== 0) {
        const error = statusError(response.status);
        error.message = `${t(`field.${key}`)}: ${error.message}`;
        throw error;
      }
    }
  }

  async function applyDraft() {
    if (!device.isConnected()) {
      bus.emit(EVENTS.TOAST, { level: "error", key: "msg.connectFirst" });
      return false;
    }
    if (device.isOutputLive()) {
      bus.emit(EVENTS.TOAST, { level: "error", key: "msg.stopBeforeConfig" });
      return false;
    }
    if (validate().errors.length > 0) {
      bus.emit(EVENTS.TOAST, { level: "error", key: "msg.configHasErrors" });
      return false;
    }
    try {
      await pushFields(CONFIG_FIELDS.map((field) => [field.key, model.form[field.key]]));
      const applied = await device.configRequest(CONFIG_OP_APPLY_DRAFT);
      if (applied.status !== 0) throw statusError(applied.status);
      await syncSnapshot();
      notify("msg.draftApplied");
      return true;
    } catch (error) {
      notifyFailure("msg.applyFailed", error);
      return false;
    }
  }

  async function saveToFlash() {
    if (!device.isConnected()) {
      bus.emit(EVENTS.TOAST, { level: "error", key: "msg.connectFirst" });
      return false;
    }
    if (device.isOutputLive()) {
      bus.emit(EVENTS.TOAST, { level: "error", key: "msg.stopBeforeConfig" });
      return false;
    }
    try {
      const response = await device.configRequest(CONFIG_OP_SAVE_DRAFT);
      if (response.status !== 0) throw statusError(response.status);
      await syncSnapshot();
      notify("msg.draftSaved");
      return true;
    } catch (error) {
      notifyFailure("msg.saveFailed", error);
      return false;
    }
  }

  /** Set + apply + save one field in a single call (used by the cal toggle). */
  async function commitField(key, value) {
    await pushFields([[key, value]]);
    const applied = await device.configRequest(CONFIG_OP_APPLY_DRAFT);
    if (applied.status !== 0) throw statusError(applied.status);
    const saved = await device.configRequest(CONFIG_OP_SAVE_DRAFT);
    if (saved.status !== 0) throw statusError(saved.status);
    await syncSnapshot();
  }

  return {
    model,
    getForm,
    setField,
    replaceForm,
    validate,
    syncSnapshot,
    runSimpleOp,
    pushFields,
    commitField,
    applyDraft,
    saveToFlash
  };
}

exports.configStatusText = configStatusText;
exports.createConfigService = createConfigService;
});
