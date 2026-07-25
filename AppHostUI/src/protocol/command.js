// Run command frame (0xAA): enable / disable / fixed-duty plus the three
// closed-loop targets and the run duration.

HV.define("protocol/command", function (require, exports) {
"use strict";

const { clampProtocolValue, sealFrame, writeFloat32, writeLe16, writeLe32 } = require("protocol/codec");
const { COMMAND_FRAME_SIZE, COMMAND_HEADER } = require("protocol/constants");

function buildCommandFrame(enable, disable, fixedDuty, cvMv, ccMa, cpMw, runSeconds, fixedDutyValue) {
  const frame = new Uint8Array(COMMAND_FRAME_SIZE);
  frame[0] = COMMAND_HEADER;
  frame[1] = COMMAND_FRAME_SIZE;
  frame[2] = (enable ? 0x01 : 0x00) | (disable ? 0x02 : 0x00) | (fixedDuty ? 0x04 : 0x00);
  writeLe32(frame, 3, clampProtocolValue(cvMv, 0, 0xffffffff));
  writeLe32(frame, 7, clampProtocolValue(ccMa, 0, 0xffffffff));
  writeLe32(frame, 11, clampProtocolValue(cpMw, 0, 0xffffffff));
  writeLe16(frame, 15, clampProtocolValue(runSeconds, 0, 0xffff));
  writeFloat32(frame, 17, fixedDutyValue);
  return sealFrame(frame);
}

/** Control-mode code (bits 1..2 of status_flags) -> i18n key suffix. */
function controlModeKey(mode, enabled, fixedDuty) {
  if (!enabled) return "off";
  if (fixedDuty) return "fixed";
  if (mode === 1) return "cc";
  if (mode === 2) return "cv";
  if (mode === 3) return "cp";
  return "unknown";
}

/** Front-panel key bitmask -> ["A", "B", ...]. */
function keyFlagLabels(flags) {
  const labels = [];
  if ((flags & 0x01) !== 0) labels.push("A");
  if ((flags & 0x02) !== 0) labels.push("B");
  if ((flags & 0x04) !== 0) labels.push("C");
  if ((flags & 0x08) !== 0) labels.push("D");
  return labels;
}

exports.buildCommandFrame = buildCommandFrame;
exports.controlModeKey = controlModeKey;
exports.keyFlagLabels = keyFlagLabels;
});
