// Drawer manager: one drawer visible at a time, shared backdrop, Escape to
// close.
//
// Drawers are `position: fixed` and animate with `transform` + `visibility`
// only -- they are never inserted into or removed from the document flow, so
// opening one cannot reflow the workspace behind it.

HV.define("ui/components/drawer-host", function (require, exports) {
"use strict";

const { setAttr, setClass, setHidden } = require("core/dom");
const { requestRender } = require("core/scheduler");

function createDrawerHost(backdrop) {
  /** @type {Map<string, {root: HTMLElement, onOpen?: Function, onClose?: Function}>} */
  const drawers = new Map();
  let active = null;

  function register(name, root, hooks = {}) {
    drawers.set(name, { root, ...hooks });
    setAttr(root, "aria-hidden", "true");
  }

  function apply() {
    for (const [name, entry] of drawers) {
      const open = name === active;
      setClass(entry.root, "is-open", open);
      setAttr(entry.root, "aria-hidden", open ? "false" : "true");
    }
    setHidden(backdrop, active === null);
    requestRender();
  }

  function open(name) {
    if (!drawers.has(name)) return;
    if (active === name) {
      close();
      return;
    }
    const previous = active ? drawers.get(active) : null;
    if (previous && previous.onClose) previous.onClose();
    active = name;
    apply();
    const entry = drawers.get(name);
    if (entry.onOpen) entry.onOpen();
    const focusTarget = entry.root.querySelector("[data-autofocus]");
    if (focusTarget) window.setTimeout(() => focusTarget.focus(), 40);
  }

  function close() {
    if (active === null) return;
    const entry = drawers.get(active);
    if (entry && entry.onClose) entry.onClose();
    active = null;
    apply();
  }

  backdrop.addEventListener("click", close);

  return {
    register,
    open,
    close,
    isOpen: (name) => active === name,
    current: () => active
  };
}

exports.createDrawerHost = createDrawerHost;
});
