// Output calibration (0xC7 request / 0xC8 response) + host-side table compiler.
//
// The firmware stores a dense residual grid (delta = measured - raw) and looks
// it up with linear/bilinear interpolation. The host compiles arbitrary user
// points into that grid: exact at the points, piecewise-linear between
// bracketing points, and a bidirectional distance decay K(d) = 1/(1+(d/R)^2)
// outside them so a lone point fades smoothly to zero instead of
// extrapolating. Layout / units / CRC mirror calibration.c exactly.

HV.define("protocol/calibration", function (require, exports) {
"use strict";

const { clampProtocolValue, crc32, readLe16, readLe32, sealFrame, sum8, writeLe16, writeLe32, xor8 } = require("protocol/codec");
const { createFrameDecoder } = require("protocol/framing");
const { CAL_DATA_BYTES, CAL_DEFAULT_RI_MA, CAL_DEFAULT_RV_V, CAL_DI_OFFSET, CAL_DV_OFFSET, CAL_IMAGE_BYTES, CAL_I_MAX_MA, CAL_I_POINTS, CAL_I_STEP_MA, CAL_MAGIC, CAL_MAX_CHUNK, CAL_MAX_DI_MA, CAL_MAX_DV_MV, CAL_OP_BEGIN, CAL_OP_COMMIT, CAL_OP_DATA, CAL_OP_GET_INFO, CAL_REQUEST_HEADER, CAL_RESPONSE_HEADER, CAL_RESPONSE_LEN, CAL_VERSION, CAL_V_MAX_MV, CAL_V_POINTS, CAL_V_STEP_MV } = require("protocol/constants");

function calDecayWeight(distance, radius) {
  const r = radius > 0 ? radius : 1;
  const t = distance / r;
  return 1 / (1 + t * t);
}

// 1D residual curve over gridXs from scattered {x, d} samples: exact at the
// samples, linear between them, decaying outside (and around a lone sample).
// Samples sharing an x are averaged. No samples -> all zeros (ideal table).
function calBuildCurve1D(samples, gridXs, radius) {
  const out = new Float64Array(gridXs.length);
  if (!samples.length) return out;

  const merged = [];
  samples
    .slice()
    .sort((a, b) => a.x - b.x)
    .forEach((s) => {
      const last = merged[merged.length - 1];
      if (last && Math.abs(last.x - s.x) < 1e-6) {
        last.sum += s.d;
        last.n += 1;
      } else {
        merged.push({ x: s.x, sum: s.d, n: 1 });
      }
    });
  const pts = merged.map((m) => ({ x: m.x, d: m.sum / m.n }));
  const first = pts[0];
  const last = pts[pts.length - 1];

  for (let g = 0; g < gridXs.length; g += 1) {
    const x = gridXs[g];
    if (x <= first.x) {
      out[g] = first.d * calDecayWeight(first.x - x, radius);
    } else if (x >= last.x) {
      out[g] = last.d * calDecayWeight(x - last.x, radius);
    } else {
      let lo = 0;
      while (lo < pts.length - 1 && pts[lo + 1].x <= x) lo += 1;
      const a = pts[lo];
      const b = pts[lo + 1];
      out[g] = a.d + (b.d - a.d) * ((x - a.x) / (b.x - a.x));
    }
  }
  return out;
}

/**
 * Compile user points -> { dv: Int16Array (0.1 V), di: Int16Array (0.1 mA) }.
 *   voltagePoints: [{ setV (V), measuredV (V), measuredI (mA)|null }]
 *   currentPoints: [{ setI (mA), measuredI (mA) }]
 */
function compileCalibration(voltagePoints, currentPoints, options = {}) {
  const rv = Number.isFinite(options.radiusV) && options.radiusV > 0 ? options.radiusV : CAL_DEFAULT_RV_V;
  const ri = Number.isFinite(options.radiusI) && options.radiusI > 0 ? options.radiusI : CAL_DEFAULT_RI_MA;

  const vGrid = new Float64Array(CAL_V_POINTS);
  for (let v = 0; v < CAL_V_POINTS; v += 1) vGrid[v] = (v * CAL_V_STEP_MV) / 1000;
  const iGrid = new Float64Array(CAL_I_POINTS);
  for (let i = 0; i < CAL_I_POINTS; i += 1) iGrid[i] = i * CAL_I_STEP_MA;

  // Current grid (1D): residual = measured - set (mA).
  const iSamples = (currentPoints || [])
    .filter((p) => Number.isFinite(p.setI) && Number.isFinite(p.measuredI))
    .map((p) => ({ x: p.setI, d: p.measuredI - p.setI }));
  const iCurve = calBuildCurve1D(iSamples, iGrid, ri);
  const di = new Int16Array(CAL_I_POINTS);
  for (let i = 0; i < CAL_I_POINTS; i += 1) {
    di[i] = Math.round(clampProtocolValue(iCurve[i], -CAL_MAX_DI_MA, CAL_MAX_DI_MA) * 10);
  }

  // Voltage base curve B(V): unconditional voltage points define the base. If
  // the user only provides current-bearing points, fall back to all points so a
  // lone point still produces a broad voltage correction. Load coupling then
  // appears only when there is enough information to separate it from the base.
  const vPts = (voltagePoints || []).filter((p) => Number.isFinite(p.setV) && Number.isFinite(p.measuredV));
  const unconditional = vPts.filter((p) => !Number.isFinite(p.measuredI));
  const baseSource = unconditional.length > 0 ? unconditional : vPts;
  const baseSamples = baseSource.map((p) => ({ x: p.setV, d: p.measuredV - p.setV }));
  const baseCurve = calBuildCurve1D(baseSamples, vGrid, rv);
  const baseAt = calBuildCurve1D(baseSamples, vPts.map((p) => p.setV), rv);

  // Load-coupling layer from current-bearing points: each contributes its
  // deviation from the base, decayed in both V and I. A point alone at its
  // voltage has ~zero deviation (it cannot separate load from base), so its
  // effect stays in the base and applies across all currents.
  const loadPts = [];
  vPts.forEach((p, idx) => {
    if (Number.isFinite(p.measuredI)) {
      loadPts.push({ v: p.setV, i: p.measuredI, rel: p.measuredV - p.setV - baseAt[idx] });
    }
  });

  const dv = new Int16Array(CAL_V_POINTS * CAL_I_POINTS);
  let maxAbsV = 0;
  for (let v = 0; v < CAL_V_POINTS; v += 1) {
    for (let i = 0; i < CAL_I_POINTS; i += 1) {
      let load = 0;
      for (let p = 0; p < loadPts.length; p += 1) {
        const lp = loadPts[p];
        load +=
          lp.rel * calDecayWeight(Math.abs(vGrid[v] - lp.v), rv) * calDecayWeight(Math.abs(iGrid[i] - lp.i), ri);
      }
      const corr = clampProtocolValue(baseCurve[v] + load, -CAL_MAX_DV_MV / 1000, CAL_MAX_DV_MV / 1000);
      dv[v * CAL_I_POINTS + i] = Math.round(corr * 10);
      if (Math.abs(corr) > maxAbsV) maxAbsV = Math.abs(corr);
    }
  }

  return { dv, di, maxAbsV, vPoints: CAL_V_POINTS, iPoints: CAL_I_POINTS };
}

/** Bilinear lookup mirroring Calibration_ApplyVoltage (returns corrected mV). */
function calEvalVoltage(grid, vMv, iMa) {
  const xv = clampProtocolValue(vMv / CAL_V_STEP_MV, 0, CAL_V_POINTS - 1);
  const xi = clampProtocolValue(iMa / CAL_I_STEP_MA, 0, CAL_I_POINTS - 1);
  const v0 = Math.floor(xv);
  const v1 = Math.min(v0 + 1, CAL_V_POINTS - 1);
  const fv = xv - v0;
  const i0 = Math.floor(xi);
  const i1 = Math.min(i0 + 1, CAL_I_POINTS - 1);
  const fi = xi - i0;
  const g = grid.dv;
  const a = g[v0 * CAL_I_POINTS + i0] + (g[v1 * CAL_I_POINTS + i0] - g[v0 * CAL_I_POINTS + i0]) * fv;
  const b = g[v0 * CAL_I_POINTS + i1] + (g[v1 * CAL_I_POINTS + i1] - g[v0 * CAL_I_POINTS + i1]) * fv;
  const dvMv = clampProtocolValue((a + (b - a) * fi) * 100, -CAL_MAX_DV_MV, CAL_MAX_DV_MV);
  return vMv + dvMv;
}

function calEvalCurrent(grid, iMa) {
  const x = iMa / CAL_I_STEP_MA;
  let di;
  if (x <= 0) di = grid.di[0];
  else if (x >= CAL_I_POINTS - 1) di = grid.di[CAL_I_POINTS - 1];
  else {
    const i0 = Math.floor(x);
    di = grid.di[i0] + (grid.di[i0 + 1] - grid.di[i0]) * (x - i0);
  }
  return iMa + clampProtocolValue(di * 0.1, -CAL_MAX_DI_MA, CAL_MAX_DI_MA);
}

/** Serialize a compiled grid into the 9388-byte flash image (matches calibration.c). */
function buildCalImage(grid) {
  const img = new Uint8Array(CAL_IMAGE_BYTES);
  writeLe32(img, 0, CAL_MAGIC);
  writeLe32(img, 8, CAL_VERSION);
  writeLe32(img, 12, CAL_V_POINTS);
  writeLe32(img, 16, CAL_I_POINTS);
  writeLe32(img, 20, CAL_V_STEP_MV);
  writeLe32(img, 24, CAL_I_STEP_MA);
  writeLe32(img, 28, CAL_V_MAX_MV);
  writeLe32(img, 32, CAL_I_MAX_MA);
  writeLe32(img, 36, 0); // flags
  writeLe32(img, 40, CAL_DATA_BYTES);
  const view = new DataView(img.buffer);
  for (let i = 0; i < CAL_I_POINTS; i += 1) view.setInt16(CAL_DI_OFFSET + i * 2, grid.di[i], true);
  for (let k = 0; k < CAL_V_POINTS * CAL_I_POINTS; k += 1) view.setInt16(CAL_DV_OFFSET + k * 2, grid.dv[k], true);
  writeLe32(img, 4, crc32(img, 8, CAL_IMAGE_BYTES));
  return img;
}

function buildCalFrame(op, payload) {
  const len = 4 + payload.length + 2;
  const frame = new Uint8Array(len);
  frame[0] = CAL_REQUEST_HEADER;
  frame[1] = len;
  frame[2] = op;
  frame[3] = 0;
  frame.set(payload, 4);
  return sealFrame(frame);
}

function buildCalBeginFrame(totalLen, crc) {
  const payload = new Uint8Array(8);
  writeLe32(payload, 0, totalLen);
  writeLe32(payload, 4, crc);
  return buildCalFrame(CAL_OP_BEGIN, payload);
}

function buildCalDataFrame(offset, chunk) {
  const payload = new Uint8Array(6 + chunk.length);
  writeLe32(payload, 0, offset);
  writeLe16(payload, 4, chunk.length);
  payload.set(chunk, 6);
  return buildCalFrame(CAL_OP_DATA, payload);
}

function buildCalCommitFrame() {
  return buildCalFrame(CAL_OP_COMMIT, new Uint8Array(0));
}

function buildCalGetInfoFrame() {
  return buildCalFrame(CAL_OP_GET_INFO, new Uint8Array(0));
}

/**
 * Split an image into the ordered frames the host streams one at a time
 * (stop-and-wait, waiting for each 0xC8 reply): [begin, data..., commit].
 */
function buildCalUploadFrames(image) {
  const frames = [buildCalBeginFrame(image.length, crc32(image, 8, image.length))];
  for (let off = 0; off < image.length; off += CAL_MAX_CHUNK) {
    frames.push(buildCalDataFrame(off, image.subarray(off, Math.min(off + CAL_MAX_CHUNK, image.length))));
  }
  frames.push(buildCalCommitFrame());
  return frames;
}

function parseCalResponseFrame(frame) {
  if (frame.length < CAL_RESPONSE_LEN) throw new Error("cal response too short");
  if (frame[0] !== CAL_RESPONSE_HEADER) throw new Error("invalid cal response header");
  if (frame[1] !== CAL_RESPONSE_LEN) throw new Error("invalid cal response length");
  if (
    frame[CAL_RESPONSE_LEN - 2] !== sum8(frame, CAL_RESPONSE_LEN - 2) ||
    frame[CAL_RESPONSE_LEN - 1] !== xor8(frame, CAL_RESPONSE_LEN - 1)
  ) {
    throw new Error("invalid cal response checksum");
  }
  return {
    op: frame[2],
    status: frame[3],
    valid: frame[4] !== 0,
    enable: frame[5] !== 0,
    version: readLe32(frame, 6),
    crc: readLe32(frame, 10),
    vPoints: readLe16(frame, 14),
    iPoints: readLe16(frame, 16),
    imageLen: readLe32(frame, 18),
    maxChunk: readLe16(frame, 22)
  };
}

function createCalResponseDecoder() {
  return createFrameDecoder({
    header: CAL_RESPONSE_HEADER,
    lengthBytes: 1,
    minLength: CAL_RESPONSE_LEN,
    maxLength: CAL_RESPONSE_LEN
  });
}

exports.compileCalibration = compileCalibration;
exports.calEvalVoltage = calEvalVoltage;
exports.calEvalCurrent = calEvalCurrent;
exports.buildCalImage = buildCalImage;
exports.buildCalBeginFrame = buildCalBeginFrame;
exports.buildCalDataFrame = buildCalDataFrame;
exports.buildCalCommitFrame = buildCalCommitFrame;
exports.buildCalGetInfoFrame = buildCalGetInfoFrame;
exports.buildCalUploadFrames = buildCalUploadFrames;
exports.parseCalResponseFrame = parseCalResponseFrame;
exports.createCalResponseDecoder = createCalResponseDecoder;
});
