// Minimal module registry.
//
// Why this exists instead of ES modules: `type="module"` scripts are always
// CORS-checked, and a page opened straight from disk has the opaque `file://`
// origin, so the browser refuses to load them. Classic <script> tags have no
// such restriction. This registry gives back what ES modules provided -- one
// file per module, explicit dependencies, no globals leaking between files --
// while keeping the console double-clickable with no build step and no server.
//
// Every file under src/ is:
//
//   HV.define("core/bus", function (require, exports) {
//     const { logger } = require("core/logger");
//     function createBus() { ... }
//     exports.createBus = createBus;
//   });
//
// Module names are the path under src/ without the extension. Script tag order
// in index.html does not matter: define() only records the factory, and
// require() runs it on first use.

(function (global) {
  "use strict";

  var PENDING = 1;
  var READY = 2;
  var modules = Object.create(null);

  function define(name, factory) {
    if (modules[name]) throw new Error('duplicate module "' + name + '"');
    if (typeof factory !== "function") throw new TypeError('module "' + name + '" needs a factory function');
    modules[name] = { factory: factory, exports: {}, state: 0 };
  }

  function require(name) {
    var mod = modules[name];
    if (!mod) {
      throw new Error('unknown module "' + name + '" -- is its <script> tag missing from index.html?');
    }
    // A partially-initialised module is returned as-is so a dependency cycle
    // degrades to "you get what has been assigned so far" instead of hanging.
    if (mod.state === READY || mod.state === PENDING) return mod.exports;
    mod.state = PENDING;
    try {
      mod.factory(require, mod.exports);
    } catch (error) {
      mod.state = 0;
      throw error;
    }
    mod.state = READY;
    return mod.exports;
  }

  function start(entry) {
    try {
      require(entry);
    } catch (error) {
      console.error("[HVCCPS/loader] failed to start:", error);
      // Never leave the operator staring at a hidden shell.
      document.documentElement.classList.add("is-ready");
      throw error;
    }
  }

  global.HV = {
    define: define,
    require: require,
    start: start,
    names: function () {
      return Object.keys(modules).sort();
    }
  };
})(window);
