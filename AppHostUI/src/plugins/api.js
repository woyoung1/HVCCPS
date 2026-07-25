// Plugin API.
//
// A plugin is a plain object:
//
//   export default definePlugin({
//     id: "my-tool",
//     name: "My Tool",
//     setup(ctx) {
//       ctx.bus.on(ctx.EVENTS.HEARTBEAT, ({ latest }) => { ... });
//       ctx.ui.registerTool({ id: "my-tool", title: "My Tool", mount(el) { ... } });
//       return () => { /* optional cleanup */ };
//     }
//   });
//
// Everything a plugin is allowed to touch arrives through `ctx`; plugins never
// reach into app internals directly. That is what keeps the shell replaceable.
//
// ---------------------------------------------------------------------------
// Events available on ctx.bus (payload in braces)
// ---------------------------------------------------------------------------
//   link:change        { supported, connected, connecting, reconnecting,
//                        attempt, hasPort, portInfo }
//   link:open          same shape as link:change
//   link:close         { reason, willReconnect, attempt }
//   telemetry:heartbeat{ latest, now, wasEnabled, enabled }
//   output:change      { live, latest }
//   output:started     { latest }
//   output:stopped     { latest }
//   frame:rx           { kind: "bytes"|"heartbeat"|"config"|"cal", bytes, response? }
//   frame:tx           { kind: "command"|"config"|"cal"|"raw", bytes }
//   config:snapshot    { draft, active }
//   cal:info           { info }
//   language:change    "en" | "zh-CN"
//   ui:toast           { level, key, params }
// ---------------------------------------------------------------------------

HV.define("plugins/api", function (require, exports) {
"use strict";

const { bus, EVENTS } = require("core/bus");
const { createLogger } = require("core/logger");
const { requestRender } = require("core/scheduler");
const { namespacedStorage } = require("core/storage");
const { addMessages, getLanguage, t } = require("i18n/index");
const { statusChipRegistry, toolRegistry } = require("ui/registry");

const log = createLogger("plugins");

/** Identity helper that validates a plugin definition at import time. */
function definePlugin(spec) {
  if (!spec || typeof spec !== "object") throw new TypeError("plugin definition must be an object");
  if (!spec.id) throw new TypeError("plugin definition needs an id");
  if (typeof spec.setup !== "function") throw new TypeError(`plugin ${spec.id} needs a setup(ctx) function`);
  return spec;
}

function createPluginHost(env) {
  const loaded = [];

  function createContext(plugin) {
    const disposers = [];
    const scopedLog = log.child(plugin.id);

    function track(dispose) {
      if (typeof dispose === "function") disposers.push(dispose);
      return dispose;
    }

    return {
      id: plugin.id,
      log: scopedLog,
      EVENTS,

      bus: {
        on: (event, handler) => track(bus.on(event, handler)),
        once: (event, handler) => track(bus.once(event, handler)),
        emit: (event, payload) => bus.emit(event, payload)
      },

      // Read-only view of live data. `latest` is identity-stable: keep the
      // reference, read fields whenever you need them.
      telemetry: {
        latest: () => env.device.telemetry.latest,
        series: (metricKey) => env.device.telemetry.series[metricKey] || [],
        packetRate: () => env.device.telemetry.packetRate,
        metrics: env.metrics
      },

      // Guarded command surface. Everything here is what the shell's own
      // buttons call, so a plugin can drive the supply exactly like a user.
      device: {
        isConnected: () => env.device.isConnected(),
        isOutputLive: () => env.device.isOutputLive(),
        calInfo: () => env.device.calInfo,
        sendFrame: (frame, kind = "raw") => env.device.sendFrame(frame, kind),
        configRequest: (op, options) => env.device.configRequest(op, options),
        run: {
          getForm: () => env.services.run.getForm(),
          patch: (changes) => env.services.run.patch(changes),
          start: () => env.services.run.start(),
          stop: () => env.services.run.stop(),
          updateTargets: () => env.services.run.updateTargets()
        },
        config: {
          getForm: () => env.services.config.getForm(),
          sync: () => env.services.config.syncSnapshot()
        }
      },

      i18n: {
        t,
        language: getLanguage,
        addMessages
      },

      storage: namespacedStorage(plugin.id),

      ui: {
        registerTool: (tool) => track(toolRegistry.register(tool)),
        registerStatusChip: (chip) => track(statusChipRegistry.register(chip)),
        toast: (key, params = null, level = "info") => bus.emit(EVENTS.TOAST, { level, key, params }),
        requestRender
      },

      onDispose: (fn) => track(fn),
      __disposers: disposers
    };
  }

  return {
    register(plugin) {
      if (loaded.some((entry) => entry.plugin.id === plugin.id)) {
        log.warn(`plugin already registered: ${plugin.id}`);
        return;
      }
      const ctx = createContext(plugin);
      try {
        const cleanup = plugin.setup(ctx);
        if (typeof cleanup === "function") ctx.__disposers.push(cleanup);
        loaded.push({ plugin, ctx });
        log.info(`loaded plugin: ${plugin.id}`);
      } catch (error) {
        log.error(`plugin setup failed: ${plugin.id}`, error);
      }
    },

    registerAll(plugins) {
      for (const plugin of plugins) this.register(plugin);
    },

    unregister(id) {
      const index = loaded.findIndex((entry) => entry.plugin.id === id);
      if (index < 0) return;
      const [entry] = loaded.splice(index, 1);
      for (const dispose of entry.ctx.__disposers.reverse()) {
        try {
          dispose();
        } catch (error) {
          log.error(`plugin dispose failed: ${id}`, error);
        }
      }
    },

    list() {
      return loaded.map((entry) => ({ id: entry.plugin.id, name: entry.plugin.name || entry.plugin.id }));
    }
  };
}

exports.definePlugin = definePlugin;
exports.createPluginHost = createPluginHost;
});
