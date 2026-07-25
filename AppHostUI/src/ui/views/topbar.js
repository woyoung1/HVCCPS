// Top bar: identity, link status, navigation, history, language.
//
// Layout stability rule for this view: every track in styles/layout.css is a
// FIXED width and every label truncates. Nothing here changes size when the
// language changes, so switching to Chinese re-letters the bar without moving
// a single button.

HV.define("ui/views/topbar", function (require, exports) {
"use strict";

const { h, qs, setAttr, setClass, setDisabled, setText } = require("core/dom");
const { registerView } = require("core/scheduler");
const { getLanguage, LANGUAGES, setLanguage, t } = require("i18n/index");

function mountTopbar({ root, device, history, drawers }) {
  const linkPill = qs(root, '[data-el="linkPill"]');
  const linkLamp = qs(root, '[data-el="linkLamp"]');
  const linkLabel = qs(root, '[data-el="linkLabel"]');
  const linkMeta = qs(root, '[data-el="linkMeta"]');
  const undoButton = qs(root, '[data-el="undo"]');
  const redoButton = qs(root, '[data-el="redo"]');
  const languageSelect = qs(root, '[data-el="language"]');

  languageSelect.replaceChildren(
    ...LANGUAGES.map((entry) => h("option", { value: entry.code }, entry.label))
  );
  languageSelect.value = getLanguage();
  languageSelect.addEventListener("change", () => setLanguage(languageSelect.value));

  linkPill.addEventListener("click", () => drawers.open("connect"));
  undoButton.addEventListener("click", () => history.get()?.undo());
  redoButton.addEventListener("click", () => history.get()?.redo());

  registerView("topbar", () => {
    const link = device.link.snapshot();

    const stateKey = link.connected
      ? "link.connected"
      : link.connecting
        ? "link.connecting"
        : link.reconnecting
          ? "link.reconnecting"
          : "link.disconnected";
    setText(linkLabel, t(stateKey));

    setText(
      linkMeta,
      link.connected
        ? t("link.packetRate", { n: device.telemetry.packetRate })
        : link.connecting
          ? t("link.openingPort")
          : link.reconnecting
            ? t("link.attempt", { n: Math.max(1, link.attempt) })
            : t("link.packetRate", { n: 0 })
    );

    setClass(linkLamp, "is-on", link.connected);
    setClass(linkLamp, "is-warn", !link.connected && (link.connecting || link.reconnecting));

    const stack = history.get();
    setDisabled(undoButton, !stack || !stack.canUndo());
    setDisabled(redoButton, !stack || !stack.canRedo());

    if (languageSelect.value !== getLanguage()) languageSelect.value = getLanguage();

    for (const button of root.querySelectorAll("[data-open]")) {
      setAttr(button, "aria-pressed", String(drawers.isOpen(button.dataset.open)));
      setClass(button, "is-active", drawers.isOpen(button.dataset.open));
    }
  });
}

exports.mountTopbar = mountTopbar;
});
