// Namespaced, failure-tolerant localStorage wrapper.
//
// Every persisted key lives under "hvccps.<area>.<name>.<version>" so a shape
// change is a version bump instead of a migration, and a private-mode browser
// (localStorage throws) degrades to in-memory instead of breaking boot.

HV.define("core/storage", function (require, exports) {
"use strict";

const { logger } = require("core/logger");

const ROOT = "hvccps";
const memory = new Map();

function backing() {
  try {
    const probe = `${ROOT}.__probe__`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch (_) {
    return null;
  }
}

const store = backing();

function fullKey(namespace, name) {
  return `${ROOT}.${namespace}.${name}`;
}

function readJson(namespace, name, fallback = null) {
  const key = fullKey(namespace, name);
  try {
    const raw = store ? store.getItem(key) : memory.get(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    logger.warn(`storage read failed for ${key}`, error);
    return fallback;
  }
}

function writeJson(namespace, name, value) {
  const key = fullKey(namespace, name);
  try {
    const raw = JSON.stringify(value);
    if (store) store.setItem(key, raw);
    else memory.set(key, raw);
  } catch (error) {
    logger.warn(`storage write failed for ${key}`, error);
  }
}

function readRaw(key, fallback = null) {
  try {
    const value = store ? store.getItem(key) : memory.get(key);
    return value === null || value === undefined ? fallback : value;
  } catch (_) {
    return fallback;
  }
}

function writeRaw(key, value) {
  try {
    if (store) store.setItem(key, value);
    else memory.set(key, value);
  } catch (_) {
    /* ignore */
  }
}

/** Per-plugin storage handle; keeps plugin keys away from app keys. */
function namespacedStorage(namespace) {
  return {
    get: (name, fallback = null) => readJson(`plugin.${namespace}`, name, fallback),
    set: (name, value) => writeJson(`plugin.${namespace}`, name, value)
  };
}

exports.readJson = readJson;
exports.writeJson = writeJson;
exports.readRaw = readRaw;
exports.writeRaw = writeRaw;
exports.namespacedStorage = namespacedStorage;
});
