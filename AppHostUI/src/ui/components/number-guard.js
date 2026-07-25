// Number inputs on a test bench are one wheel-tick away from an expensive
// mistake, so arrow-key and wheel stepping are blocked globally. Typing still
// works normally.

HV.define("ui/components/number-guard", function (require, exports) {
"use strict";

function installNumberGuards() {
  window.addEventListener(
    "keydown",
    (event) => {
      if (
        (event.key === "ArrowUp" || event.key === "ArrowDown") &&
        event.target instanceof HTMLInputElement &&
        event.target.type === "number"
      ) {
        event.preventDefault();
      }
    },
    true
  );

  window.addEventListener(
    "wheel",
    (event) => {
      if (
        event.target instanceof HTMLInputElement &&
        event.target.type === "number" &&
        document.activeElement === event.target
      ) {
        event.preventDefault();
      }
    },
    { passive: false, capture: true }
  );
}

exports.installNumberGuards = installNumberGuards;
});
