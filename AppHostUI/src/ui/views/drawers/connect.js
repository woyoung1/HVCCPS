// Serial link drawer.

HV.define("ui/views/drawers/connect", function (require, exports) {
"use strict";

const { qs, setClass, setDisabled, setText } = require("core/dom");
const { notify, notifyFailure } = require("core/notify");
const { registerView, requestRender } = require("core/scheduler");
const { t } = require("i18n/index");

function mountConnectDrawer({ root, device, onConnected }) {
  const support = qs(root, '[data-el="support"]');
  const portInfo = qs(root, '[data-el="portInfo"]');
  const status = qs(root, '[data-el="status"]');
  const rate = qs(root, '[data-el="rate"]');
  const selectPortButton = qs(root, '[data-el="selectPort"]');
  const connectButton = qs(root, '[data-el="connect"]');
  const disconnectButton = qs(root, '[data-el="disconnect"]');

  selectPortButton.addEventListener("click", async () => {
    try {
      await device.link.selectPort();
      notify("msg.portAuthorized");
    } catch (error) {
      // The picker throws NotFoundError when the operator just cancels it.
      if (error && error.name === "NotFoundError") return;
      notifyFailure("msg.portSelectFailed", error);
    }
    requestRender();
  });

  connectButton.addEventListener("click", async () => {
    try {
      await device.link.connect();
      if (device.isConnected()) {
        notify("msg.connected");
        if (onConnected) void onConnected();
      }
    } catch (error) {
      notifyFailure("msg.connectFailed", error);
    }
    requestRender();
  });

  disconnectButton.addEventListener("click", async () => {
    await device.link.disconnect();
    notify("msg.disconnected");
    requestRender();
  });

  registerView("connect-drawer", () => {
    const link = device.link.snapshot();

    setText(support, link.supported ? t("connect.webSerialReady") : t("connect.webSerialMissing"));
    setClass(support, "is-error", !link.supported);

    setText(portInfo, link.hasPort ? link.portInfo || t("connect.authorizedPort") : t("connect.noPort"));
    setText(
      status,
      link.connected
        ? t("connect.stateConnected")
        : link.connecting
          ? t("connect.stateOpening")
          : link.reconnecting
            ? t("connect.stateReconnecting")
            : link.hasPort
              ? t("connect.statePortReady")
              : t("connect.stateNoPort")
    );
    setText(rate, t("link.packetRate", { n: device.telemetry.packetRate }));

    setDisabled(selectPortButton, !link.supported || link.connected || link.connecting);
    setDisabled(connectButton, !link.supported || !link.hasPort || link.connected || link.connecting || link.reconnecting);
    setDisabled(disconnectButton, !device.link.canDisconnect());
  });
}

exports.mountConnectDrawer = mountConnectDrawer;
});
