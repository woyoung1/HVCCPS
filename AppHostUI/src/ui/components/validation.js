// Validation strip helper: one place that decides how an error list is shown so
// every drawer reports problems identically.

HV.define("ui/components/validation", function (require, exports) {
"use strict";

const { setClass, setHidden, setText } = require("core/dom");
const { t } = require("i18n/index");

/**
 * @param {HTMLElement} node   the .validation-line element
 * @param {Array<{key: string, params?: object}>} errors
 * @param {{okKey?: string, hideWhenValid?: boolean, limit?: number}} options
 */
function renderValidation(node, errors, options = {}) {
  const { okKey = null, hideWhenValid = true, limit = 3 } = options;
  if (!node) return errors.length === 0;

  if (errors.length === 0) {
    if (hideWhenValid) {
      setHidden(node, true);
    } else {
      setHidden(node, false);
      setText(node, okKey ? t(okKey) : "");
    }
    setClass(node, "is-error", false);
    setClass(node, "is-ok", !hideWhenValid);
    return true;
  }

  setHidden(node, false);
  setClass(node, "is-error", true);
  setClass(node, "is-ok", false);
  setText(node, errors.slice(0, limit).map((error) => t(error.key, error.params)).join(" / "));
  return false;
}

exports.renderValidation = renderValidation;
});
