// Built-in plugin: serial frame inspector.
//
// Rolling log of every decoded frame in both directions. Raw byte chunks are
// off by default (they are just the transport view of the same frames) but can
// be enabled when chasing a framing problem.

HV.define("plugins/frame-inspector", function (require, exports) {
"use strict";

const { writeClipboardText } = require("core/clipboard");
const { h, setChecked, setText } = require("core/dom");
const { formatBytesHex } = require("core/format");
const { definePlugin } = require("plugins/api");

const MAX_ROWS = 250;
const HEX_PREVIEW_BYTES = 16;

exports.default = definePlugin({
  id: "frame-inspector",
  name: "Frame Inspector",

  setup(ctx) {
    const rows = [];
    let paused = false;
    let showRawBytes = ctx.storage.get("showRawBytes", false);
    let seq = 0;
    let dirty = true;

    function push(direction, payload) {
      if (paused) return;
      if (payload.kind === "bytes" && !showRawBytes) return;
      rows.push({
        seq: ++seq,
        at: performance.now(),
        direction,
        kind: payload.kind,
        length: payload.bytes ? payload.bytes.length : 0,
        hex: payload.bytes ? formatBytesHex(payload.bytes, HEX_PREVIEW_BYTES) : ""
      });
      if (rows.length > MAX_ROWS) rows.splice(0, rows.length - MAX_ROWS);
      dirty = true;
      ctx.ui.requestRender();
    }

    ctx.bus.on(ctx.EVENTS.FRAME_RX, (payload) => push("rx", payload));
    ctx.bus.on(ctx.EVENTS.FRAME_TX, (payload) => push("tx", payload));

    ctx.ui.registerTool({
      id: "frame-inspector",
      titleKey: "plugin.frameInspector.title",
      order: 20,

      mount(container) {
        const t = ctx.i18n.t;
        const list = h("div.tool-log");
        const counter = h("span.tool-meta", null, "0");

        const pauseButton = h(
          "button.small-button",
          {
            type: "button",
            onclick: () => {
              paused = !paused;
              ctx.ui.requestRender();
            }
          },
          t("plugin.frameInspector.pause")
        );

        const rawToggle = h("input", {
          type: "checkbox",
          onchange: (event) => {
            showRawBytes = event.target.checked;
            ctx.storage.set("showRawBytes", showRawBytes);
          }
        });

        container.append(
          h(
            "header.tool-head",
            null,
            h("strong", { "data-i18n": "plugin.frameInspector.title" }, t("plugin.frameInspector.title")),
            counter
          ),
          h(
            "label.check-line",
            null,
            rawToggle,
            h("span", { "data-i18n": "plugin.frameInspector.showRaw" }, t("plugin.frameInspector.showRaw"))
          ),
          list,
          h(
            "div.tool-actions",
            null,
            pauseButton,
            h(
              "button.small-button",
              {
                type: "button",
                "data-i18n": "plugin.frameInspector.clear",
                onclick: () => {
                  rows.length = 0;
                  dirty = true;
                  ctx.ui.requestRender();
                }
              },
              t("plugin.frameInspector.clear")
            ),
            h(
              "button.small-button",
              {
                type: "button",
                "data-i18n": "plugin.frameInspector.copy",
                onclick: async () => {
                  const text = rows
                    .map((row) => `${row.seq}\t${row.direction}\t${row.kind}\t${row.length}\t${row.hex}`)
                    .join("\n");
                  try {
                    await writeClipboardText(text);
                    ctx.ui.toast("plugin.frameInspector.copied");
                  } catch (error) {
                    ctx.ui.toast("msg.copyFailed", { error: error.message }, "error");
                  }
                }
              },
              t("plugin.frameInspector.copy")
            )
          )
        );

        return {
          update() {
            setChecked(rawToggle, showRawBytes);
            setText(pauseButton, paused ? t("plugin.frameInspector.resume") : t("plugin.frameInspector.pause"));
            setText(counter, t("plugin.frameInspector.count", { n: rows.length }));
            if (!dirty) return;
            dirty = false;
            list.replaceChildren(
              ...rows
                .slice()
                .reverse()
                .map((row) =>
                  h(
                    `div.tool-log-row.is-${row.direction}`,
                    null,
                    h("span.tool-log-dir", null, row.direction.toUpperCase()),
                    h("span.tool-log-kind", null, row.kind),
                    h("span.tool-log-len", null, `${row.length} B`),
                    h("code.tool-log-hex", null, row.hex)
                  )
                )
            );
          }
        };
      }
    });
  }
});

});
