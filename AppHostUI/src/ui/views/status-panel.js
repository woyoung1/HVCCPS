// Status panel: hardware facts that are NOT already stated by the command bar.
//
// Deliberately does not repeat "output live" / control mode -- those belong to
// the command bar. What lives here is the config-sync state, latched faults,
// and the full numeric readout.

HV.define("ui/views/status-panel", function (require, exports) {
"use strict";

const { h, qs, setAttr, setClass, setHidden, setText } = require("core/dom");
const { registerView } = require("core/scheduler");
const { onLanguageChange, t } = require("i18n/index");
const { keyFlagLabels } = require("protocol/index");
const { DEBUG_METRIC_KEYS, KEY_METRIC_KEYS, TELEMETRY_METRICS, metricLabelKey } = require("device/metrics");
const { statusChipRegistry } = require("ui/registry");

function mountStatusPanel({ root, device, config }) {
  const subtitle = qs(root, '[data-el="subtitle"]');
  const chipHost = qs(root, '[data-el="chips"]');
  const keyHost = qs(root, '[data-el="keyReadings"]');
  const secondaryHost = qs(root, '[data-el="secondary"]');
  const debugHost = qs(root, '[data-el="debug"]');
  const secondaryToggle = qs(root, '[data-el="secondaryToggle"]');
  const debugToggle = qs(root, '[data-el="debugToggle"]');

  /** @type {Record<string, HTMLElement>} */
  let valueNodes = {};

  function buildReadings() {
    keyHost.replaceChildren();
    secondaryHost.replaceChildren();
    debugHost.replaceChildren();
    valueNodes = {};

    for (const metric of TELEMETRY_METRICS) {
      const isKey = KEY_METRIC_KEYS.includes(metric.key);
      const value = h(isKey ? "strong.metric-value" : "strong.reading-value", null, metric.format(device.telemetry.latest));
      const card = h(
        isKey ? "article.metric-card" : "div.reading-row",
        { style: { "--signal-color": metric.color } },
        h(isKey ? "span.metric-label" : "span.reading-label", null, t(metricLabelKey(metric.key))),
        value
      );
      valueNodes[metric.key] = value;

      if (isKey) keyHost.append(card);
      else if (DEBUG_METRIC_KEYS.has(metric.key)) debugHost.append(card);
      else secondaryHost.append(card);
    }
  }

  function bindSection(button, panel) {
    button.addEventListener("click", () => {
      const open = button.getAttribute("aria-expanded") !== "true";
      setAttr(button, "aria-expanded", String(open));
      setHidden(panel, !open);
    });
  }
  bindSection(secondaryToggle, secondaryHost);
  bindSection(debugToggle, debugHost);

  // ---- chips -------------------------------------------------------------
  const chips = {
    config: h("span.state-chip"),
    keys: h("span.state-chip"),
    ocp: h("span.state-chip.is-danger", { hidden: true }),
    wdg: h("span.state-chip.is-warn", { hidden: true }),
    otp: h("span.state-chip.is-danger", { hidden: true })
  };
  const pluginChips = new Map();

  function rebuildChips() {
    chipHost.replaceChildren(chips.config, chips.keys, chips.ocp, chips.wdg, chips.otp);
    pluginChips.clear();
    for (const entry of statusChipRegistry.list()) {
      const node = h("span.state-chip");
      pluginChips.set(entry.id, { entry, node });
      chipHost.append(node);
    }
  }
  statusChipRegistry.subscribe(rebuildChips);
  rebuildChips();

  onLanguageChange(buildReadings);
  buildReadings();

  registerView("status-panel", () => {
    const latest = device.telemetry.latest;
    const link = device.link.snapshot();

    setText(
      subtitle,
      link.connected
        ? t("link.packetRate", { n: device.telemetry.packetRate })
        : link.connecting
          ? t("status.connecting")
          : link.reconnecting
            ? t("status.reconnecting")
            : t("status.offline")
    );

    for (const metric of TELEMETRY_METRICS) {
      setText(valueNodes[metric.key], metric.format(latest));
    }

    const configState = device.configBusy ? "busy" : config.model.deviceDraft ? "synced" : "unknown";
    setText(chips.config, t(`status.cfg.${configState}`));
    setClass(chips.config, "is-pending", configState === "busy");
    setClass(chips.config, "is-ok", configState === "synced");

    const keys = keyFlagLabels(latest.keyFlags);
    setText(chips.keys, keys.length > 0 ? t("status.keyPressed", { keys: keys.join(" ") }) : t("status.keyNone"));
    setClass(chips.keys, "is-warn", keys.length > 0);

    // Latched hardware trips: the output is already off, the operator has to
    // re-enable to clear them.
    setHidden(chips.ocp, !latest.ocpTripped);
    setText(chips.ocp, t("status.ocp"));
    setHidden(chips.wdg, !latest.wdgReset);
    setText(chips.wdg, t("status.wdg"));
    setHidden(chips.otp, !latest.otpTripped);
    setText(chips.otp, t("status.otp"));

    for (const { entry, node } of pluginChips.values()) {
      try {
        entry.sync(node);
      } catch (_) {
        /* a broken plugin chip must not break the panel */
      }
    }
  });
}

exports.mountStatusPanel = mountStatusPanel;
});
