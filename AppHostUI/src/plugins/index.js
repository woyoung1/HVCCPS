// Built-in plugin roster.
//
// Adding a tool to the shipped console is a one-line change here. Third-party
// plugins can be appended the same way (or registered at runtime through the
// host returned by createPluginHost).

HV.define("plugins/index", function (require, exports) {
"use strict";

const autoTest = require("plugins/auto-test").default;
const frameInspector = require("plugins/frame-inspector").default;
const runSummary = require("plugins/run-summary").default;

const BUILT_IN_PLUGINS = [runSummary, frameInspector, autoTest];

exports.BUILT_IN_PLUGINS = BUILT_IN_PLUGINS;
});
