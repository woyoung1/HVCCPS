// Extension points the shell exposes to plugins.
//
// Views read these registries; plugins write to them through the plugin
// context. Keeping the registry separate from both means a plugin never
// imports a view and a view never imports a plugin.

HV.define("ui/registry", function (require, exports) {
"use strict";

const { createLogger } = require("core/logger");
const { requestRender } = require("core/scheduler");

const log = createLogger("registry");

function createRegistry(kind) {
  const items = [];
  const listeners = new Set();

  function notify() {
    for (const listener of listeners) {
      try {
        listener(items.slice());
      } catch (error) {
        log.error(`${kind} listener failed`, error);
      }
    }
    requestRender();
  }

  return {
    register(entry) {
      if (!entry || !entry.id) throw new Error(`${kind} entry needs an id`);
      if (items.some((item) => item.id === entry.id)) throw new Error(`duplicate ${kind} id: ${entry.id}`);
      items.push({ order: 100, ...entry });
      items.sort((a, b) => a.order - b.order || String(a.id).localeCompare(String(b.id)));
      notify();
      return () => {
        const index = items.findIndex((item) => item.id === entry.id);
        if (index >= 0) items.splice(index, 1);
        notify();
      };
    },
    list() {
      return items.slice();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

/**
 * Tools shown in the Tools drawer.
 * { id, titleKey|title, order?, mount(container, ctx) -> { update?, dispose? } }
 */
const toolRegistry = createRegistry("tool");

/**
 * Extra chips rendered in the status panel header.
 * { id, order?, sync(node) } -- `node` is a <span class="state-chip">.
 */
const statusChipRegistry = createRegistry("status chip");

exports.toolRegistry = toolRegistry;
exports.statusChipRegistry = statusChipRegistry;
});
