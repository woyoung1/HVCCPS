// Live telemetry store: the newest decoded record plus the rolling series that
// feed the chart. Deliberately mutable and identity-stable -- views and plugins
// hold a reference to `latest` forever and never have to re-subscribe.

HV.define("device/telemetry", function (require, exports) {
"use strict";

const { createLatest, parseHeartbeatFrame } = require("protocol/index");
const { TELEMETRY_METRICS } = require("device/metrics");

const CHART_WINDOW_MS = 20000;
const CHART_SAMPLE_MS = 20;
const PACKET_RATE_WINDOW_MS = 1000;

function createTelemetry() {
  const latest = createLatest();
  /** @type {Record<string, Array<{x:number,y:number}>>} */
  const series = {};
  for (const metric of TELEMETRY_METRICS) series[metric.key] = [];

  let packetCounter = 0;
  let packetRate = 0;
  let rateWindowStart = performance.now();
  let paused = false;

  function ingest(frame, now) {
    const wasEnabled = !!latest.powerEnable;
    parseHeartbeatFrame(frame, latest, now);
    packetCounter += 1;
    if (now - rateWindowStart >= PACKET_RATE_WINDOW_MS) {
      packetRate = packetCounter;
      packetCounter = 0;
      rateWindowStart = now;
    }
    return { wasEnabled, enabled: !!latest.powerEnable };
  }

  /** Push one point per metric. Called on a fixed interval, not per heartbeat,
   *  so the X axis stays uniform even when the link stutters. `updatedAt` is
   *  zeroed by reset() when the link drops, which is what stops sampling. */
  function sample(now) {
    if (latest.updatedAt === 0 || paused) return;
    const cutoff = now - CHART_WINDOW_MS;
    for (const metric of TELEMETRY_METRICS) {
      const list = series[metric.key];
      list.push({ x: now, y: metric.read(latest) });
      while (list.length > 0 && list[0].x < cutoff) list.shift();
    }
  }

  function clearSeries() {
    for (const metric of TELEMETRY_METRICS) series[metric.key].length = 0;
  }

  function reset() {
    Object.assign(latest, createLatest());
    packetCounter = 0;
    packetRate = 0;
    rateWindowStart = performance.now();
    clearSeries();
  }

  return {
    latest,
    series,
    reset,
    clearSeries,
    ingest,
    sample,
    get packetRate() {
      return packetRate;
    },
    get paused() {
      return paused;
    },
    setPaused(value) {
      paused = !!value;
    }
  };
}

exports.createTelemetry = createTelemetry;
exports.CHART_WINDOW_MS = CHART_WINDOW_MS;
exports.CHART_SAMPLE_MS = CHART_SAMPLE_MS;
});
