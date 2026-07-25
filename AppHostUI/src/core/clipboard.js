// Clipboard write with a textarea fallback for browsers/contexts where the
// async Clipboard API is unavailable (plain http:// origins, older builds).

HV.define("core/clipboard", function (require, exports) {
"use strict";

async function writeClipboardText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();
  try {
    if (!document.execCommand("copy")) throw new Error("copy command rejected");
  } finally {
    textarea.remove();
  }
}

exports.writeClipboardText = writeClipboardText;
});
