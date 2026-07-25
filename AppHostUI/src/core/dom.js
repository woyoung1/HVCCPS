// DOM helpers.
//
// Two jobs:
//   1. `h()` -- terse element construction so views read like markup.
//   2. idempotent setters (`setText`, `setHidden`, ...) -- every view sync pass
//      runs on every frame, so writing only on change is what keeps the UI from
//      thrashing layout (and is a large part of why the language switch and the
//      run-state transition no longer flicker).

HV.define("core/dom", function (require, exports) {
"use strict";

/**
 * Create an element.
 *   h("button.small-button", { onclick, dataset: {...} }, "label")
 * Tag syntax: "tag.class1.class2" or ".class" (implies div).
 */
function h(spec, props = null, ...children) {
  const [tagPart, ...classes] = String(spec).split(".");
  const node = document.createElement(tagPart || "div");
  if (classes.length > 0) node.className = classes.join(" ");

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === null || value === undefined || value === false) continue;
      if (key === "class" || key === "className") {
        node.className = node.className ? `${node.className} ${value}` : String(value);
      } else if (key === "dataset") {
        Object.assign(node.dataset, value);
      } else if (key === "style") {
        for (const [prop, styleValue] of Object.entries(value)) {
          // Custom properties are invisible to the CSSStyleDeclaration
          // property accessors -- they only land via setProperty().
          if (prop.startsWith("--")) node.style.setProperty(prop, styleValue);
          else node.style[prop] = styleValue;
        }
      } else if (key === "html") {
        node.innerHTML = value;
      } else if (key.startsWith("on") && typeof value === "function") {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key in node && key !== "list" && key !== "type" && key !== "form") {
        node[key] = value;
      } else {
        node.setAttribute(key, value === true ? "" : String(value));
      }
    }
  }

  appendChildren(node, children);
  return node;
}

function appendChildren(node, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) appendChildren(node, child);
    else if (child instanceof Node) node.append(child);
    else node.append(document.createTextNode(String(child)));
  }
}

function qs(root, selector) {
  const node = root.querySelector(selector);
  if (!node) throw new Error(`missing element: ${selector}`);
  return node;
}

function qsa(root, selector) {
  return Array.from(root.querySelectorAll(selector));
}

/** Write textContent only when it actually differs. */
function setText(node, text) {
  if (!node) return;
  const value = text === null || text === undefined ? "" : String(text);
  if (node.textContent !== value) node.textContent = value;
}

function setHidden(node, hidden) {
  if (!node) return;
  const next = !!hidden;
  if (node.hidden !== next) node.hidden = next;
}

function setDisabled(node, disabled) {
  if (!node) return;
  const next = !!disabled;
  if (node.disabled !== next) node.disabled = next;
}

function setClass(node, name, on) {
  if (!node) return;
  node.classList.toggle(name, !!on);
}

function setAttr(node, name, value) {
  if (!node) return;
  if (value === null || value === false || value === undefined) {
    if (node.hasAttribute(name)) node.removeAttribute(name);
    return;
  }
  const next = value === true ? "" : String(value);
  if (node.getAttribute(name) !== next) node.setAttribute(name, next);
}

/** Set an input's value without clobbering what the operator is typing. */
function setValueIfIdle(input, value) {
  if (!input) return;
  if (document.activeElement === input) return;
  const next = value === null || value === undefined ? "" : String(value);
  if (input.value !== next) input.value = next;
}

function setChecked(input, checked) {
  if (!input) return;
  const next = !!checked;
  if (input.checked !== next) input.checked = next;
}

/** Inline SVG icon from a path string (all icons in this app are 20x20). */
function icon(path, { width = 1.7 } = {}) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 20 20");
  svg.setAttribute("aria-hidden", "true");
  const node = document.createElementNS("http://www.w3.org/2000/svg", "path");
  node.setAttribute("d", path);
  node.setAttribute("fill", "none");
  node.setAttribute("stroke", "currentColor");
  node.setAttribute("stroke-width", String(width));
  node.setAttribute("stroke-linecap", "round");
  node.setAttribute("stroke-linejoin", "round");
  svg.append(node);
  return svg;
}

/**
 * Replace `data-icon="name"` placeholders in static markup with real SVG.
 * Idempotent, so it is safe to call again after new markup is inserted.
 */
function hydrateIcons(root = document) {
  for (const node of root.querySelectorAll("[data-icon]")) {
    if (node.dataset.iconDone === "1") continue;
    const path = ICONS[node.dataset.icon];
    if (!path) continue;
    node.prepend(icon(path));
    node.dataset.iconDone = "1";
  }
}

const ICONS = Object.freeze({
  plug: "M6 5h8v5H6zM8 10v5m4-5v5M5 15h10",
  wave: "M3 12c2 0 2-7 4-7s2 14 4 14s2-7 4-7s2 0 2 0",
  gear: "M10 7a3 3 0 1 0 0 6a3 3 0 0 0 0-6zM10 2v3M10 15v3M2 10h3M15 10h3M4.3 4.3l2.1 2.1M13.6 13.6l2.1 2.1M15.7 4.3l-2.1 2.1M6.4 13.6l-2.1 2.1",
  keys: "M4 5h5v10H4zM11 5h5v10h-5M6.5 12V8M13.5 12v-2",
  ruler: "M3 15 15 3l2 2L5 17zM12 6l2 2M3 15v2h2",
  tools: "M4 16 9 11M8 5a3 3 0 0 0 4 4l4 4-2 2-4-4a3 3 0 0 1-4-4z",
  undo: "M8 6 4 10l4 4M4 10h8a4 4 0 0 1 4 4v1",
  redo: "m12 6 4 4-4 4M16 10H8a4 4 0 0 0-4 4v1",
  close: "m6 6 8 8M14 6l-8 8",
  chevron: "m6 8 4 4 4-4",
  sliders: "M4 5h12M7 10h6M9 15h2",
  pause: "M7 5v10M13 5v10",
  play: "M7 4.5v11l9-5.5z",
  reset: "M5 10a5 5 0 1 0 1.5-3.6M5 5v5h5",
  power: "M10 2v8M6 5a6 6 0 1 0 8 0"
});

exports.h = h;
exports.qs = qs;
exports.qsa = qsa;
exports.setText = setText;
exports.setHidden = setHidden;
exports.setDisabled = setDisabled;
exports.setClass = setClass;
exports.setAttr = setAttr;
exports.setValueIfIdle = setValueIfIdle;
exports.setChecked = setChecked;
exports.icon = icon;
exports.hydrateIcons = hydrateIcons;
exports.ICONS = ICONS;
});
