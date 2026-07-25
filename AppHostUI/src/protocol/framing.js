// Generic byte-stream frame decoder.
//
// All three inbound frame families share one shape: a 1-byte header, a length
// field (1 or 2 bytes, little-endian, counting the whole frame), a payload, and
// a trailing sum8/xor8 pair. Only the header byte, the width of the length
// field and the accepted length range differ -- so one factory covers them all
// and each protocol module just declares its parameters.
//
// Resync rule (unchanged from the original decoders): a header byte with an
// implausible length or a bad checksum is dropped one byte at a time and the
// scan continues, so a corrupted frame costs at most one frame -- never the
// link.

HV.define("protocol/framing", function (require, exports) {
"use strict";

const { checksumOk } = require("protocol/codec");

function createFrameDecoder({ header, lengthBytes = 2, minLength, maxLength }) {
  const headerBytes = 1 + lengthBytes;
  const min = minLength;
  const max = maxLength ?? minLength;
  /** @type {number[]} */
  const rx = [];

  return {
    feed(chunk) {
      for (const byte of chunk) rx.push(byte & 0xff);

      const frames = [];
      while (rx.length >= headerBytes) {
        const start = rx.indexOf(header);
        if (start < 0) {
          rx.length = 0;
          return frames;
        }
        if (start > 0) rx.splice(0, start);
        if (rx.length < headerBytes) return frames;

        const length = lengthBytes === 1 ? rx[1] : rx[1] | (rx[2] << 8);
        if (length < min || length > max) {
          rx.shift();
          continue;
        }
        if (rx.length < length) return frames;

        const frame = Uint8Array.from(rx.slice(0, length));
        if (!checksumOk(frame, length)) {
          rx.shift();
          continue;
        }
        frames.push(frame);
        rx.splice(0, length);
      }
      return frames;
    },

    reset() {
      rx.length = 0;
    },

    get pending() {
      return rx.length;
    }
  };
}

exports.createFrameDecoder = createFrameDecoder;
});
