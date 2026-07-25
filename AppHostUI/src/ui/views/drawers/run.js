// Run options drawer: duration and start mode.
//
// Targets are NOT here -- they live in the command bar where they are visible
// and editable at all times. What remains are the two things that only matter
// at the moment of starting, and that the firmware locks while running.

HV.define("ui/views/drawers/run", function (require, exports) {
"use strict";

const { qs, setChecked, setDisabled, setHidden, setValueIfIdle } = require("core/dom");
const { registerView } = require("core/scheduler");
const { renderValidation } = require("ui/components/validation");
const { START_MODE } = require("device/run-service");

function mountRunDrawer({ root, device, run, history }) {
  const seconds = qs(root, '[data-el="seconds"]');
  const continuous = qs(root, '[data-el="continuous"]');
  const modeClosed = qs(root, '[data-el="modeClosed"]');
  const modeFixed = qs(root, '[data-el="modeFixed"]');
  const fixedGroup = qs(root, '[data-el="fixedGroup"]');
  const fixedDuty = qs(root, '[data-el="fixedDuty"]');
  const durationGroup = qs(root, '[data-el="durationGroup"]');
  const modeGroup = qs(root, '[data-el="modeGroup"]');
  const validation = qs(root, '[data-el="validation"]');

  function commit(changes) {
    run.patch(changes);
    history.get()?.schedule();
  }

  seconds.addEventListener("input", () => commit({ runSeconds: Number.parseInt(seconds.value, 10) }));
  continuous.addEventListener("change", () => commit({ continuous: continuous.checked }));
  modeClosed.addEventListener("change", () => commit({ mode: START_MODE.CLOSED_LOOP }));
  modeFixed.addEventListener("change", () => commit({ mode: START_MODE.FIXED_DUTY }));
  fixedDuty.addEventListener("input", () => commit({ fixedDutyPct: Number.parseFloat(fixedDuty.value) }));

  registerView("run-drawer", () => {
    const form = run.getForm();
    const live = device.isOutputLive();

    setValueIfIdle(seconds, Number.isFinite(form.runSeconds) ? form.runSeconds : "");
    setChecked(continuous, form.continuous);
    setChecked(modeClosed, form.mode === START_MODE.CLOSED_LOOP);
    setChecked(modeFixed, form.mode === START_MODE.FIXED_DUTY);
    setValueIfIdle(fixedDuty, Number.isFinite(form.fixedDutyPct) ? form.fixedDutyPct : "");
    setHidden(fixedGroup, form.mode !== START_MODE.FIXED_DUTY);

    setDisabled(seconds, form.continuous || live);
    setDisabled(continuous, live);
    setDisabled(durationGroup, live);
    setDisabled(modeGroup, live);

    const check = run.validate();
    renderValidation(validation, check.ok ? [] : [check.error]);
  });
}

exports.mountRunDrawer = mountRunDrawer;
});
