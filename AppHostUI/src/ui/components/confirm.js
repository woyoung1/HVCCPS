// Modal confirmation for actions that are hard to undo on a live bench.
//
// Promise-based so a caller reads top-to-bottom:
//   if (!(await confirmAction({ ... }))) return;
//
// Safety defaults: focus lands on Cancel, Escape and the backdrop cancel, and
// nothing is pre-armed to fire on Enter. The dialog is `position: fixed`, so
// opening it never reflows the console behind it.

HV.define("ui/components/confirm", function (require, exports) {
"use strict";

const { h, setText } = require("core/dom");
const { t } = require("i18n/index");

let host = null;
let refs = null;
let active = null;

function build() {
  const title = h("h2", { id: "confirmTitle" });
  const body = h("p.modal-body", { id: "confirmBody" });
  const cancel = h("button.secondary-button", { type: "button" });
  const confirm = h("button.danger-button", { type: "button" });
  const backdrop = h("div.modal-backdrop");

  host = h(
    "div.modal",
    { hidden: true },
    backdrop,
    h(
      "div.modal-panel",
      { role: "alertdialog", "aria-modal": "true", "aria-labelledby": "confirmTitle", "aria-describedby": "confirmBody" },
      title,
      body,
      h("div.modal-actions", null, cancel, confirm)
    )
  );
  document.body.append(host);
  refs = { title, body, cancel, confirm, backdrop };

  cancel.addEventListener("click", () => settle(false));
  confirm.addEventListener("click", () => settle(true));
  backdrop.addEventListener("click", () => settle(false));
  host.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      settle(false);
    }
  });
}

function settle(result) {
  if (!active) return;
  const resolve = active;
  active = null;
  host.hidden = true;
  document.body.classList.remove("is-modal-open");
  resolve(result);
}

/**
 * `params` is interpolated into every string, so a label can quote the value
 * the operator is about to commit to ("Start at 35 %") and not just the body.
 *
 * @param {{titleKey: string, bodyKey: string, params?: object,
 *          confirmKey: string, cancelKey?: string}} options
 * @returns {Promise<boolean>}
 */
function confirmAction(options) {
  if (!host) build();
  // A second request while one is open resolves the first as cancelled.
  settle(false);

  const params = options.params || null;
  setText(refs.title, t(options.titleKey, params));
  setText(refs.body, t(options.bodyKey, params));
  setText(refs.confirm, t(options.confirmKey, params));
  setText(refs.cancel, t(options.cancelKey || "confirm.cancel", params));

  host.hidden = false;
  document.body.classList.add("is-modal-open");
  window.setTimeout(() => refs.cancel.focus(), 0);

  return new Promise((resolve) => {
    active = resolve;
  });
}

exports.confirmAction = confirmAction;
});
