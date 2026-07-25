// Key-based i18n.
//
// Design notes (this replaces a MutationObserver that rewrote every text node
// in the document on the fly):
//   * Lookup is by KEY, never by English source text. Keys are stable, so a
//     copy edit in English can never silently drop a translation.
//   * Static markup declares `data-i18n` / `data-i18n-attr` / `data-i18n-html`.
//     `apply(root)` resolves them in ONE synchronous pass.
//   * JS-built views call `t(key)` at build time, so what is inserted into the
//     DOM is already localised -- nothing is ever translated after the fact.
//   * Switching language = one apply() pass + one re-render. Combined with the
//     fixed-width layout tracks in styles/layout.css, nothing moves and nothing
//     flashes.

HV.define("i18n/index", function (require, exports) {
"use strict";

const en = require("i18n/locales/en").default;
const zhCN = require("i18n/locales/zh-CN").default;
const { logger } = require("core/logger");
const { readRaw, writeRaw } = require("core/storage");

const LANGUAGE_KEY = "hvccps.ui.language";
const LEGACY_LANGUAGE_KEY = "hvccps-ui-language";
const FALLBACK = "en";

const catalogues = {
  en: { ...en },
  "zh-CN": { ...zhCN }
};

const LANGUAGES = Object.freeze([
  { code: "en", label: "English" },
  { code: "zh-CN", label: "中文" }
]);

const missing = new Set();
const listeners = new Set();
let language = FALLBACK;

function isSupported(code) {
  return Object.prototype.hasOwnProperty.call(catalogues, code);
}

function resolveInitialLanguage() {
  const stored = readRaw(LANGUAGE_KEY) || readRaw(LEGACY_LANGUAGE_KEY);
  if (stored && isSupported(stored)) return stored;
  const nav = String(window.navigator.language || FALLBACK).toLowerCase();
  return nav.startsWith("zh") ? "zh-CN" : FALLBACK;
}

function interpolate(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  );
}

/** Translate a key. Falls back to English, then to the key itself. */
function t(key, params = null) {
  if (!key) return "";
  const table = catalogues[language] || catalogues[FALLBACK];
  let value = table[key];
  if (value === undefined) value = catalogues[FALLBACK][key];
  if (value === undefined) {
    if (!missing.has(key)) {
      missing.add(key);
      logger.warn(`missing i18n key: ${key}`);
    }
    return key;
  }
  return interpolate(value, params);
}

function has(key) {
  return catalogues[FALLBACK][key] !== undefined || (catalogues[language] || {})[key] !== undefined;
}

/** Translate a key if it exists, otherwise return the supplied literal. */
function tOr(key, literal) {
  return has(key) ? t(key) : literal;
}

/** Plugins register their own strings here (merged, never replacing app keys). */
function addMessages(code, messages) {
  if (!catalogues[code]) catalogues[code] = {};
  Object.assign(catalogues[code], messages);
}

function getLanguage() {
  return language;
}

function onLanguageChange(handler) {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

/**
 * Resolve every declarative binding under `root`.
 *   data-i18n="key"                  -> textContent
 *   data-i18n-html="key"             -> innerHTML (dictionary strings only)
 *   data-i18n-attr="title=key|aria-label=key"
 */
function apply(root = document) {
  const scope = root instanceof Document ? root.documentElement : root;
  if (!scope) return;

  const textNodes = scope.matches?.("[data-i18n]") ? [scope] : [];
  textNodes.push(...scope.querySelectorAll("[data-i18n]"));
  for (const node of textNodes) {
    const value = t(node.dataset.i18n);
    if (node.textContent !== value) node.textContent = value;
  }

  const htmlNodes = scope.matches?.("[data-i18n-html]") ? [scope] : [];
  htmlNodes.push(...scope.querySelectorAll("[data-i18n-html]"));
  for (const node of htmlNodes) {
    const value = t(node.dataset.i18nHtml);
    if (node.innerHTML !== value) node.innerHTML = value;
  }

  const attrNodes = scope.matches?.("[data-i18n-attr]") ? [scope] : [];
  attrNodes.push(...scope.querySelectorAll("[data-i18n-attr]"));
  for (const node of attrNodes) {
    for (const pair of node.dataset.i18nAttr.split("|")) {
      const index = pair.indexOf("=");
      if (index < 0) continue;
      const attribute = pair.slice(0, index).trim();
      const value = t(pair.slice(index + 1).trim());
      if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
    }
  }
}

function setLanguage(code, { persist = true } = {}) {
  const next = isSupported(code) ? code : FALLBACK;
  const changed = next !== language;
  language = next;
  document.documentElement.lang = next;
  document.documentElement.dataset.lang = next;
  if (persist) writeRaw(LANGUAGE_KEY, next);
  apply(document);
  if (changed) {
    for (const listener of Array.from(listeners)) {
      try {
        listener(next);
      } catch (error) {
        logger.error("language listener failed", error);
      }
    }
  }
  return changed;
}

/** Called once from main.js BEFORE any view mounts, so first paint is correct. */
function initLanguage() {
  setLanguage(resolveInitialLanguage(), { persist: false });
  return language;
}

exports.t = t;
exports.has = has;
exports.tOr = tOr;
exports.addMessages = addMessages;
exports.getLanguage = getLanguage;
exports.onLanguageChange = onLanguageChange;
exports.apply = apply;
exports.setLanguage = setLanguage;
exports.initLanguage = initLanguage;
exports.LANGUAGES = LANGUAGES;
});
