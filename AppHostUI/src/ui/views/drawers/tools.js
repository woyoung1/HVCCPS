// Tools drawer -- the host surface for plugins.
//
// Tabs come from the tool registry, so a plugin that calls
// ctx.ui.registerTool() shows up here with no change to the shell. Tools are
// mounted lazily on first selection and their update() runs on every render
// pass while visible.

HV.define("ui/views/drawers/tools", function (require, exports) {
"use strict";

const { h, qs, setAttr, setClass, setHidden, setText } = require("core/dom");
const { createLogger } = require("core/logger");
const { registerView } = require("core/scheduler");
const { onLanguageChange, t } = require("i18n/index");
const { toolRegistry } = require("ui/registry");

const log = createLogger("tools");

function mountToolsDrawer({ root, drawers }) {
  const tabs = qs(root, '[data-el="tabs"]');
  const body = qs(root, '[data-el="body"]');
  const empty = qs(root, '[data-el="empty"]');

  /** @type {Map<string, {panel: HTMLElement, instance: object}>} */
  const mounted = new Map();
  let activeId = null;
  let tabNodes = new Map();

  function toolTitle(entry) {
    return entry.titleKey ? t(entry.titleKey) : entry.title || entry.id;
  }

  function ensureMounted(entry) {
    if (mounted.has(entry.id)) return mounted.get(entry.id);
    const panel = h("div.tool-panel", { hidden: true });
    body.append(panel);
    let instance = {};
    try {
      instance = entry.mount(panel) || {};
    } catch (error) {
      log.error(`tool mount failed: ${entry.id}`, error);
      panel.append(h("div.tool-error", null, t("tools.mountFailed")));
    }
    const record = { panel, instance };
    mounted.set(entry.id, record);
    return record;
  }

  function select(id) {
    activeId = id;
    for (const [toolId, record] of mounted) setHidden(record.panel, toolId !== id);
    const entry = toolRegistry.list().find((item) => item.id === id);
    if (entry) {
      const record = ensureMounted(entry);
      setHidden(record.panel, false);
    }
    for (const [toolId, node] of tabNodes) {
      setClass(node, "is-active", toolId === id);
      setAttr(node, "aria-selected", String(toolId === id));
    }
  }

  function rebuildTabs() {
    const entries = toolRegistry.list();
    tabNodes = new Map();
    tabs.replaceChildren(
      ...entries.map((entry) => {
        const node = h(
          "button.tools-tab",
          { type: "button", role: "tab", onclick: () => select(entry.id) },
          toolTitle(entry)
        );
        tabNodes.set(entry.id, node);
        return node;
      })
    );
    setHidden(empty, entries.length > 0);
    if (entries.length === 0) {
      activeId = null;
    } else if (!activeId || !entries.some((entry) => entry.id === activeId)) {
      select(entries[0].id);
    } else {
      select(activeId);
    }
  }

  toolRegistry.subscribe(rebuildTabs);
  onLanguageChange(rebuildTabs);
  rebuildTabs();

  registerView("tools-drawer", () => {
    for (const [id, node] of tabNodes) {
      const entry = toolRegistry.list().find((item) => item.id === id);
      if (entry) setText(node, toolTitle(entry));
    }
    if (!drawers.isOpen("tools") || !activeId) return;
    const record = mounted.get(activeId);
    if (record && typeof record.instance.update === "function") {
      try {
        record.instance.update();
      } catch (error) {
        log.error(`tool update failed: ${activeId}`, error);
      }
    }
  });
}

exports.mountToolsDrawer = mountToolsDrawer;
});
