// Little-endian primitives + the two trailing checksums every frame carries.
// Byte-for-byte equivalents of app_protocol.c / calibration.c.

HV.define("protocol/codec", function (require, exports) {
"use strict";

function sum8(frame, length) {
  let sum = 0;
  for (let i = 0; i < length; i += 1) sum = (sum + frame[i]) & 0xff;
  return sum;
}

function xor8(frame, length) {
  let value = 0;
  for (let i = 0; i < length; i += 1) value ^= frame[i];
  return value;
}

function readLe16(frame, offset) {
  return (frame[offset] | (frame[offset + 1] << 8)) >>> 0;
}

function readLe32(frame, offset) {
  return (
    (frame[offset] |
      (frame[offset + 1] << 8) |
      (frame[offset + 2] << 16) |
      (frame[offset + 3] << 24)) >>>
    0
  );
}

function readFloat32(frame, offset) {
  const bytes = new Uint8Array(4);
  bytes[0] = frame[offset];
  bytes[1] = frame[offset + 1];
  bytes[2] = frame[offset + 2];
  bytes[3] = frame[offset + 3];
  return new DataView(bytes.buffer).getFloat32(0, true);
}

function writeLe16(frame, offset, value) {
  const normalized = value & 0xffff;
  frame[offset] = normalized & 0xff;
  frame[offset + 1] = (normalized >>> 8) & 0xff;
}

function writeLe32(frame, offset, value) {
  const normalized = value >>> 0;
  frame[offset] = normalized & 0xff;
  frame[offset + 1] = (normalized >>> 8) & 0xff;
  frame[offset + 2] = (normalized >>> 16) & 0xff;
  frame[offset + 3] = (normalized >>> 24) & 0xff;
}

function writeFloat32(frame, offset, value) {
  const view = new DataView(new ArrayBuffer(4));
  view.setFloat32(0, value, true);
  for (let i = 0; i < 4; i += 1) frame[offset + i] = view.getUint8(i);
}

function clampProtocolValue(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** True when the trailing sum8/xor8 pair matches the frame body. */
function checksumOk(frame, length) {
  return frame[length - 2] === sum8(frame, length - 2) && frame[length - 1] === xor8(frame, length - 1);
}

/** Stamp sum8/xor8 into the last two bytes of a fully populated frame. */
function sealFrame(frame) {
  const len = frame.length;
  frame[len - 2] = sum8(frame, len - 2);
  frame[len - 1] = xor8(frame, len - 1);
  return frame;
}

// CRC32 (zlib, poly 0xEDB88320) -- byte-for-byte identical to calibration.c.
const CRC32_TABLE = (function buildTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes, start, end) {
  let crc = 0xffffffff;
  for (let i = start; i < end; i += 1) {
    crc = (CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

exports.sum8 = sum8;
exports.xor8 = xor8;
exports.readLe16 = readLe16;
exports.readLe32 = readLe32;
exports.readFloat32 = readFloat32;
exports.writeLe16 = writeLe16;
exports.writeLe32 = writeLe32;
exports.writeFloat32 = writeFloat32;
exports.clampProtocolValue = clampProtocolValue;
exports.checksumOk = checksumOk;
exports.sealFrame = sealFrame;
exports.crc32 = crc32;
});
