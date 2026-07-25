// Toast stack. Renders bus TOAST events; nothing else in the app touches it.

HV.define("ui/components/toast", function (require, exports) {
"use strict";

const { bus, EVENTS } = require("core/bus");
const { h } = require("core/dom");
const { t } = require("i18n/index");

const INFO_MS = 3200;
const ERROR_MS = 5200;

function mountToasts(stack) {
  bus.on(EVENTS.TOAST, ({ level = "info", key, params = null, text = null }) => {
    const message = text ?? t(key, params);
    const toast = h(`div.toast.toast-${level === "error" ? "error" : "info"}`);
    const body = h("span.toast-text", null, message);
    const dismiss = h(
      "button.toast-close",
      { type: "button", "data-i18n-attr": "aria-label=a11y.dismiss", "aria-label": t("a11y.dismiss") },
      "×"
    );
    toast.append(body, dismiss);
    stack.append(toast);

    const close = () => {
      toast.classList.add("is-leaving");
      window.setTimeout(() => toast.remove(), 180);
    };
    const timer = window.setTimeout(close, level === "error" ? ERROR_MS : INFO_MS);
    dismiss.addEventListener("click", () => {
      window.clearTimeout(timer);
      close();
    });
  });
}

exports.mountToasts = mountToasts;
});
