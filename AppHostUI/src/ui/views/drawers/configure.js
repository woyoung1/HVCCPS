// Configuration drawer: control-loop gains, HRTIM timing and the remaining
// device constants, plus the draft/flash operations.

HV.define("ui/views/drawers/configure", function (require, exports) {
"use strict";

const { h, qs, qsa, setAttr, setClass, setDisabled, setHidden, setText, setValueIfIdle } = require("core/dom");
const { formatSig } = require("core/format");
const { registerView } = require("core/scheduler");
const { t } = require("i18n/index");
const { CONFIG_FIELDS, CONFIG_OP_FACTORY_RESET, CONFIG_OP_LOAD_DEFAULTS, CONFIG_OP_LOAD_FLASH, CONFIG_VALUE_FLOAT } = require("protocol/index");
const { renderValidation } = require("ui/components/validation");

// Groups edited elsewhere: presets have their own drawer, calEnable belongs to
// the calibration workflow.
const HIDDEN_GROUPS = new Set(["buttons", "calibration"]);

function mountConfigureDrawer({ root, device, config, run, history }) {
  const state = qs(root, '[data-el="state"]');
  const lock = qs(root, '[data-el="lock"]');
  const lockStop = qs(root, '[data-el="lockStop"]');
  const deviceGrid = qs(root, '[data-el="deviceGrid"]');
  const freqSummary = qs(root, '[data-el="freqSummary"]');
  const validation = qs(root, '[data-el="validation"]');
  const applyButton = qs(root, '[data-el="apply"]');
  const saveButton = qs(root, '[data-el="save"]');
  const syncButton = qs(root, '[data-el="sync"]');
  const loadFlashButton = qs(root, '[data-el="loadFlash"]');
  const loadDefaultsButton = qs(root, '[data-el="loadDefaults"]');
  const factoryResetButton = qs(root, '[data-el="factoryReset"]');

  /** @type {Record<string, HTMLElement>} */
  const inputs = {};

  function bindInput(key, input) {
    inputs[key] = input;
    const field = CONFIG_FIELDS.find((entry) => entry.key === key);
    const parse = field && field.type === CONFIG_VALUE_FLOAT ? Number.parseFloat : (value) => Number.parseInt(value, 10);
    const handler = () => {
      config.setField(key, parse(input.value));
      history.get()?.schedule();
    };
    input.addEventListener("input", handler);
    input.addEventListener("change", handler);
  }

  for (const input of qsa(root, "[data-cfg]")) bindInput(input.dataset.cfg, input);

  // Everything not bound to a hand-authored control gets a generic number
  // field. Rebuilt on language change, so the previous generation's keys are
  // dropped from the binding table first.
  const dynamicKeys = new Set();
  function buildDeviceGrid() {
    for (const key of dynamicKeys) delete inputs[key];
    dynamicKeys.clear();
    deviceGrid.replaceChildren();
    for (const field of CONFIG_FIELDS) {
      if (inputs[field.key] || HIDDEN_GROUPS.has(field.group)) continue;
      dynamicKeys.add(field.key);
      const input = h("input", {
        type: "number",
        step: field.type === CONFIG_VALUE_FLOAT ? "any" : "1"
      });
      deviceGrid.append(h("label.field", null, h("span", null, t(`field.${field.key}`)), input));
      bindInput(field.key, input);
    }
  }
  buildDeviceGrid();

  // ---- tabs --------------------------------------------------------------
  const tabs = qsa(root, "[data-tab]");
  const pages = qsa(root, "[data-page]");
  function selectTab(name) {
    for (const tab of tabs) {
      const active = tab.dataset.tab === name;
      setClass(tab, "is-active", active);
      setAttr(tab, "aria-selected", String(active));
    }
    for (const page of pages) {
      const active = page.dataset.page === name;
      setClass(page, "is-active", active);
      setHidden(page, !active);
    }
  }
  for (const tab of tabs) tab.addEventListener("click", () => selectTab(tab.dataset.tab));

  // ---- actions -----------------------------------------------------------
  applyButton.addEventListener("click", () => void config.applyDraft());
  saveButton.addEventListener("click", () => void config.saveToFlash());
  syncButton.addEventListener("click", () => void config.syncSnapshot({ announce: true }));
  loadFlashButton.addEventListener("click", () => void config.runSimpleOp(CONFIG_OP_LOAD_FLASH, "msg.flashLoaded"));
  loadDefaultsButton.addEventListener("click", () => void config.runSimpleOp(CONFIG_OP_LOAD_DEFAULTS, "msg.defaultsLoaded"));
  factoryResetButton.addEventListener("click", () => void config.runSimpleOp(CONFIG_OP_FACTORY_RESET, "msg.factoryReset"));
  lockStop.addEventListener("click", () => void run.stop());

  registerView("configure-drawer", () => {
    const form = config.getForm();
    const live = device.isOutputLive();
    const connected = device.isConnected();
    const busy = device.configBusy;

    for (const [key, input] of Object.entries(inputs)) {
      const value = form[key];
      setValueIfIdle(input, value === undefined || value === null || Number.isNaN(value) ? "" : value);
    }

    setText(
      state,
      busy ? t("cfg.stateBusy") : config.model.deviceDraft ? t("cfg.stateSynced") : t("cfg.stateNeedsSync")
    );

    const setKHz = form.baseFreqHz / 1000;
    const liveHz = device.telemetry.latest.currentFreqHz;
    setText(
      freqSummary,
      Number.isFinite(setKHz)
        ? t("cfg.freqSummaryValue", {
            base: formatSig(setKHz),
            live: liveHz > 0 ? `${formatSig(liveHz / 1000)} kHz` : "--"
          })
        : t("cfg.freqInvalid")
    );

    const { errors } = config.validate();
    renderValidation(validation, errors, { okKey: "validate.ok", hideWhenValid: false });

    setHidden(lock, !live);
    setDisabled(applyButton, !connected || live || busy || errors.length > 0);
    setDisabled(saveButton, !connected || live || busy);
    setDisabled(syncButton, !connected || busy);
    setDisabled(loadFlashButton, !connected || live || busy);
    setDisabled(loadDefaultsButton, !connected || live || busy);
    setDisabled(factoryResetButton, !connected || live || busy);
  });

  return { rebuildLabels: buildDeviceGrid };
}

exports.mountConfigureDrawer = mountConfigureDrawer;
});
