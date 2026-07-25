// Single-cycle waveform signal catalogue + ADC sample-instant model.
//
// Per-channel sample-time offset within an ADC trigger slot:
//
// All ranks of an ADC run in series after the same HRTIM trigger, so rank `r`
// only starts its sample-and-hold AFTER all previous ranks have finished their
// (sample + conversion) cycles. We treat the "effective sample instant" as the
// middle of the sample-and-hold window of each rank. ADC clock = 42.5 MHz
// (=> 23.53 ns/cyc).
//
//   ADC1 (12-bit): per rank = 2.5 S+H + 12.5 conv = 15 cyc
//     rank 0 (VSEC)  S+H center = 1.25 cyc  -> ~29.4 ns from trigger
//     rank 1 (VPRI)  S+H center = 16.25 cyc -> ~382.4 ns
//   ADC2 (8-bit):  per rank = 2.5 S+H + 8.5 conv = 11 cyc
//     rank 0 (IPRI_AC)  S+H center = 1.25 cyc  -> ~29.4 ns
//     rank 1 (ISEC)     S+H center = 12.25 cyc -> ~288.2 ns
//     rank 2 (IPRI_DC)  S+H center = 23.25 cyc -> ~547.0 ns
//
// These offsets are small but real -- at 50 kHz one switching period is 20 us
// and a single trigger slot is 833 ns, so the spread within ADC2 alone
// (29..547 ns) is a noticeable fraction of one slot. Each signal's dots are
// rendered at its true (trigger + offset) X position so the operator can see
// exactly when each sample was actually taken.

HV.define("device/cycle-signals", function (require, exports) {
"use strict";

const { ADC1_FULL_SCALE, ADC2_FULL_SCALE } = require("protocol/index");

const ADC_CLOCK_NS = 1e9 / 42_500_000;
const ADC1_RANK_CYCLES = 15;
const ADC2_RANK_CYCLES = 11;
const ADC1_SH_CYCLES = 2.5;
const ADC2_SH_CYCLES = 2.5;

function adc1RankSampleDelayNs(rank) {
  return (rank * ADC1_RANK_CYCLES + ADC1_SH_CYCLES / 2) * ADC_CLOCK_NS;
}

function adc2RankSampleDelayNs(rank) {
  return (rank * ADC2_RANK_CYCLES + ADC2_SH_CYCLES / 2) * ADC_CLOCK_NS;
}

// Listed in the actual hardware sampling order (ADC1 runs in parallel with ADC2
// off the same HRTIM TRG1, so rank 0 of each bank goes first at ~29 ns from the
// trigger; subsequent ranks stack after their predecessor finishes its full S+H
// + conversion).
const CYCLE_SIGNALS = Object.freeze([
  // ADC1 rank 0 - fires immediately on trigger (~29 ns).
  {
    key: "vsec",
    label: "VSEC",
    color: "#b45309",
    unit: "V",
    samples: (l) => l.vsecSamples,
    fullScale: ADC1_FULL_SCALE,
    adcBank: "ADC1",
    rank: 0,
    sampleDelayNs: adc1RankSampleDelayNs(0),
    // 1:1000 attenuator -> volts
    toUnit: (raw, l) => (raw * l.vccMv) / ADC1_FULL_SCALE
  },
  // ADC2 rank 0 - fires in parallel with ADC1 rank 0 (~29 ns).
  {
    key: "ipriAc",
    label: "IPRI AC",
    color: "#16a34a",
    unit: "A",
    samples: (l) => l.ipriAcSamples,
    fullScale: ADC2_FULL_SCALE,
    adcBank: "ADC2",
    rank: 0,
    sampleDelayNs: adc2RankSampleDelayNs(0),
    // 1:200 CT + 7.5R + |.| rectifier -> mA per mV = 200/7.5, then /1000 for A.
    toUnit: (raw, l) => (((raw * l.vccMv) / ADC2_FULL_SCALE) * (200 / 7.5)) / 1000
  },
  // ADC2 rank 1 - after rank 0 finishes (11 cyc) -> ~288 ns.
  {
    key: "isec",
    label: "ISEC",
    color: "#0f766e",
    unit: "mA",
    samples: (l) => l.isecSamples,
    fullScale: ADC2_FULL_SCALE,
    adcBank: "ADC2",
    rank: 1,
    sampleDelayNs: adc2RankSampleDelayNs(1),
    toUnit: (raw, l) => ((raw * l.vccMv) / ADC2_FULL_SCALE) * 0.1626
  },
  // ADC1 rank 1 - after ADC1 rank 0 finishes (15 cyc) -> ~382 ns.
  {
    key: "vpri",
    label: "VBUS",
    color: "#ca8a04",
    unit: "V",
    samples: (l) => l.vpriSamples,
    fullScale: ADC1_FULL_SCALE,
    adcBank: "ADC1",
    rank: 1,
    sampleDelayNs: adc1RankSampleDelayNs(1),
    toUnit: (raw, l) => ((raw * l.vccMv) / ADC1_FULL_SCALE) * 17 / 1000
  },
  // ADC2 rank 2 - after rank 1 finishes (22 cyc) -> ~547 ns. Last sample.
  {
    key: "ipriDc",
    label: "IPRI DC",
    color: "#15803d",
    unit: "A",
    samples: (l) => l.ipriDcSamples,
    fullScale: ADC2_FULL_SCALE,
    adcBank: "ADC2",
    rank: 2,
    sampleDelayNs: adc2RankSampleDelayNs(2),
    toUnit: (raw, l) => {
      const sensorMv = (raw * l.vccMv) / ADC2_FULL_SCALE;
      const zeroMv = 2500; // ACS712 fixed 2.5 V zero point (matches firmware)
      const ma = (zeroMv - sensorMv) * 10;
      return (ma < 0 ? 0 : ma) / 1000;
    }
  }
]);

/** PSFB bridge legs drawn as PWM overlay strokes on the cycle plot. */
const PWM_BRIDGES = Object.freeze([
  { key: "lead", color: "rgba(29, 78, 216, 0.55)" },
  { key: "lag", color: "rgba(192, 38, 211, 0.55)" }
]);

exports.CYCLE_SIGNALS = CYCLE_SIGNALS;
exports.PWM_BRIDGES = PWM_BRIDGES;
});
