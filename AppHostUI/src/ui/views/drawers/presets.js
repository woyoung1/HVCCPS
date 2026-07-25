// Front-panel key presets drawer. The two slots are symmetric, so the cards are
// generated from the slot list instead of duplicated in markup.

HV.define("ui/views/drawers/presets", function (require, exports) {
"use strict";

const { h, qs, setChecked, setDisabled, setHidden, setText, setValueIfIdle } = require("core/dom");
const { registerView } = require("core/scheduler");
const { onLanguageChange, t } = require("i18n/index");
const { PRESET_SLOTS } = require("device/presets-service");
const { renderValidation } = require("ui/components/validation");

function mountPresetsDrawer({ root, device, presets, run }) {
  const columns = qs(root, '[data-el="columns"]');
  const state = qs(root, '[data-el="state"]');
  const lockNote = qs(root, '[data-el="lockNote"]');
  const validation = qs(root, '[data-el="validation"]');
  const saveButton = qs(root, '[data-el="save"]');

  /** @type {Record<string, object>} */
  let cards = {};

  function bigInput(slot, key, attrs) {
    const input = h("input", {
      type: "number",
      ...attrs,
      oninput: () => presets.patch(slot, { [key]: Number.parseFloat(input.value) })
    });
    return input;
  }

  function buildCards() {
    cards = {};
    columns.replaceChildren(
      ...PRESET_SLOTS.map((slot) => {
        const enable = h("input", {
          type: "checkbox",
          onchange: () => presets.patch(slot, { enabled: enable.checked })
        });
        const cv = bigInput(slot, "cvV", { min: "0", max: "2200", step: "1" });
        const cc = bigInput(slot, "ccMa", { min: "0", max: "200", step: "0.1" });
        const cp = bigInput(slot, "cpW", { min: "0", max: "400", step: "0.1" });
        const time = h("input", {
          type: "number",
          min: "1",
          max: "65534",
          step: "1",
          oninput: () => presets.patch(slot, { timeS: Number.parseInt(time.value, 10) })
        });
        const continuous = h("input", {
          type: "checkbox",
          onchange: () => presets.patch(slot, { continuous: continuous.checked })
        });
        const runNow = h(
          "button.secondary-button",
          { type: "button", onclick: () => void presets.runNow(slot, run) },
          t("presets.runNow", { slot })
        );

        const card = h(
          "fieldset.form-group.preset-card",
          null,
          h("legend", null, t("presets.slot", { slot })),
          h("label.check-line", null, enable, h("span", null, t("presets.enable", { slot }))),
          h("label.big-input", null, h("span", null, "CV"), cv, h("em", null, "V")),
          h("label.big-input", null, h("span", null, "CC"), cc, h("em", null, "mA")),
          h("label.big-input", null, h("span", null, "CP"), cp, h("em", null, "W")),
          h(
            "div.inline-grid",
            null,
            h("label.field", null, h("span", null, t("presets.runTime")), time),
            h("label.check-line", null, continuous, h("span", null, t("run.continuous")))
          ),
          runNow
        );

        cards[slot] = { card, enable, cv, cc, cp, time, continuous, runNow };
        return card;
      })
    );
  }

  onLanguageChange(buildCards);
  buildCards();

  saveButton.addEventListener("click", () => void presets.saveToFlash());

  registerView("presets-drawer", () => {
    const connected = device.isConnected();
    const live = device.isOutputLive();
    const busy = device.configBusy;

    setText(state, connected ? (live ? t("presets.stateLive") : t("presets.stateReady")) : t("presets.stateOffline"));
    setHidden(lockNote, !live);

    for (const slot of PRESET_SLOTS) {
      const card = cards[slot];
      const model = presets.get(slot);
      setChecked(card.enable, model.enabled);
      setValueIfIdle(card.cv, Number.isFinite(model.cvV) ? model.cvV : "");
      setValueIfIdle(card.cc, Number.isFinite(model.ccMa) ? model.ccMa : "");
      setValueIfIdle(card.cp, Number.isFinite(model.cpW) ? model.cpW : "");
      setValueIfIdle(card.time, Number.isFinite(model.timeS) ? model.timeS : "");
      setChecked(card.continuous, model.continuous);
      setDisabled(card.time, model.continuous || live);
      setDisabled(card.card, live);
      setDisabled(card.runNow, !connected || live);
    }

    const check = presets.validate();
    renderValidation(validation, check.ok ? [] : [check.error]);
    setDisabled(saveButton, !connected || live || busy || !check.ok);
  });
}

exports.mountPresetsDrawer = mountPresetsDrawer;
});
