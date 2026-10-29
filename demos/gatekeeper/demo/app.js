// Gatekeeper demo: a static mirror of the Go gateway.
//
// The token bucket, retry arithmetic and metrics text live in mirror.js, which
// follows src/gatekeeper/limiter.go. This file only renders the simulation and
// handles the controls. The real service is Go and is documented in the README.
import { GatewaySim, PRESETS, CLIENTS } from "./mirror.js";

const $ = A.$, el = A.el, fmt = A.fmt;

const sim = new GatewaySim(PRESETS.steady, 11);
let mode = "steady";
let paused = false;
let frames = 0;
let chartFrame = 0;
let metricsFrame = 0;

const clientById = new Map(CLIENTS.map((client) => [client.id, client]));
const initials = (value) => value.replace(/[^a-z]/gi, " ").trim().split(/\s+/).slice(0, 2).map((part) => part[0].toUpperCase()).join("");

function clockText(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `t+${String(minutes).padStart(2, "0")}:${rest.toFixed(0).padStart(2, "0")}`;
}

function statCard({ label, value, sub, tone = "gold", spark }) {
  return el("div", { class: "card" },
    el("div", { class: "stat" },
      el("div", { class: "stat-label", text: label }),
      el("div", { class: "row", style: "align-items:baseline;gap:10px;margin:2px 0 3px" },
        el("div", { class: `stat-value ${tone}`, text: value }),
        spark && spark.length > 1 ? A.sparkline(spark, { width: 70, height: 22, color: tone === "red" ? "#ff8f8f" : "#b6f36b" }) : null),
      el("div", { class: "small muted", text: sub })));
}

function renderKpis() {
  const totals = sim.totals();
  const allowedSeries = sim.samples.slice(-20).map((sample) => sample.allowed);
  const deniedSeries = sim.samples.slice(-20).map((sample) => sample.denied);
  $("#kpis").replaceChildren(
    statCard({ label: "Requests", value: fmt.num(totals.total), sub: `${totals.rps.toFixed(1)} per second now`, spark: allowedSeries }),
    statCard({ label: "Allowed", value: fmt.num(totals.allowed), sub: `${fmt.pct(1 - totals.deniedRate, 1)} of traffic` }),
    statCard({ label: "Rejected (429)", value: fmt.num(totals.denied), sub: `${fmt.pct(totals.deniedRate, 1)} denied by the bucket`, tone: "red", spark: deniedSeries }),
    statCard({ label: "p95 latency", value: `${totals.p95.toFixed(1)} ms`, sub: `p50 ${totals.p50.toFixed(1)} ms, simulated upstream`, tone: "blue" }),
  );
  $("#decision-count").textContent = `${fmt.num(totals.total)} served`;
  $("#bucket-count").textContent = `${totals.buckets} keys`;
  $("#sim-clock").textContent = clockText(totals.elapsed);
}

function renderChart(force = false) {
  if (!force && chartFrame++ % 4 !== 0) return;
  const samples = sim.samples.slice(-30);
  if (samples.length < 2) return;
  $("#rps-chart").replaceChildren(A.lineChart({
    series: [
      { name: "allowed", data: samples.map((sample) => sample.allowed), color: "#b6f36b" },
      { name: "429", data: samples.map((sample) => sample.denied), color: "#ff8f8f", area: false },
    ],
    labels: samples.map((sample) => `${Math.round(sample.at)}s`),
    width: 760,
    height: 118,
  }));
}

function renderBuckets() {
  const states = sim.bucketStates();
  $("#bucket-config").textContent = `rate ${sim.rate}/s, burst ${sim.burst}`;
  $("#buckets").replaceChildren(...states.map((bucket) => {
    const ratio = Math.max(0, Math.min(1, bucket.tokens / bucket.burst));
    const tone = bucket.allowed ? "green" : "red";
    return el("div", { class: "bucket-row" },
      el("span", { class: "avatar sm", style: `background:${bucket.allowed ? "rgba(182,243,107,0.16)" : "rgba(255,143,143,0.16)"};color:${bucket.allowed ? "var(--gold)" : "var(--red)"};border-color:var(--line-strong)`, text: initials(bucket.id) }),
      el("div", { style: "min-width:0" },
        el("div", { class: "bucket-key", text: bucket.id }),
        el("div", { class: "bucket-meta" },
          el("span", { text: `${bucket.tokens.toFixed(2)} / ${bucket.burst} tokens` }),
          el("span", { text: bucket.allowed ? "next request passes" : `retry in ${bucket.retryAfterMs} ms` })),
        el("div", { class: "progress thin", style: "margin-top:5px" },
          el("i", { class: bucket.allowed ? "" : "danger", style: `width:${Math.max(2, ratio * 100)}%` }))),
      el("div", { class: "bucket-status" },
        el("span", { class: `badge ${tone}`, text: bucket.allowed ? "ready" : "throttled" })));
  }));
}

function renderDecisions() {
  const rows = sim.events.slice(0, 6).map((event) => ({ ...event }));
  $("#decisions").replaceChildren(A.dataTable({
    columns: [
      { label: "t", width: "52px", render: (row) => el("span", { class: "mono muted", text: `${row.at.toFixed(1)}s` }) },
      { label: "key", render: (row) => el("span", { class: "mono", style: "font-size:10.5px", text: row.key }) },
      { label: "status", width: "72px", render: (row) => el("span", { class: `badge ${row.allowed ? "green" : "red"}`, text: row.allowed ? "200" : "429" }) },
      { label: "tokens", width: "62px", align: "right", render: (row) => el("span", { class: "mono muted", text: row.remaining.toFixed(2) }) },
      { label: "latency", width: "66px", align: "right", render: (row) => el("span", { class: "mono", text: `${row.latency.toFixed(1)}ms` }) },
    ],
    rows,
    empty: "Sending requests with the arrival rate above.",
  }));
}

function renderMetrics(force = false) {
  if (!force && metricsFrame++ % 6 !== 0) return;
  $("#metrics-text").textContent = sim.metricsText();
}

function renderControls() {
  $("#rate-value").textContent = `${sim.rate}/s`;
  $("#burst-value").textContent = String(sim.burst);
  $("#arrival-value").textContent = `${sim.arrivalRate.toFixed(0)}/s`;
  $("#mode-badge").textContent = mode === "overload" ? "overload traffic" : mode === "custom" ? "custom traffic" : "steady traffic";
  $("#pause-btn").textContent = paused ? "Resume" : "Pause";
  $("#preset-note").textContent = mode === "overload" ? PRESETS.overload.note : mode === "custom" ? "Custom limits, the bucket keeps refilling." : PRESETS.steady.note;
}

function renderAll(forceChart = false) {
  renderKpis();
  renderChart(forceChart);
  renderBuckets();
  renderDecisions();
  renderMetrics(forceChart);
  renderControls();
}

function syncSliders() {
  $("#rate").value = String(sim.rate);
  $("#burst").value = String(sim.burst);
  $("#arrival").value = String(Math.round(sim.arrivalRate));
}

function applyPreset(name, warmupSeconds = 14) {
  mode = name;
  sim.reset(PRESETS[name]);
  sim.warmup(warmupSeconds);
  syncSliders();
  if (location.hash !== `#${name}`) history.replaceState(null, "", `#${name}`);
  renderAll(true);
}

function setCustom(values) {
  mode = "custom";
  sim.setConfig(values);
  renderAll();
}

function copyText(text, label) {
  navigator.clipboard?.writeText(text).then(
    () => A.toast(`Copied ${label}`, "success", 1600),
    () => A.toast("Clipboard is blocked in this browser", "error"),
  );
}

function wire() {
  $("#preset-steady").addEventListener("click", () => applyPreset("steady"));
  $("#preset-overload").addEventListener("click", () => applyPreset("overload"));

  $("#rate").addEventListener("input", (event) => setCustom({ rate: Number(event.target.value) }));
  $("#burst").addEventListener("input", (event) => setCustom({ burst: Number(event.target.value) }));
  $("#arrival").addEventListener("input", (event) => setCustom({ arrivalRate: Number(event.target.value) }));

  $("#pause-btn").addEventListener("click", () => {
    paused = !paused;
    sim.paused = paused;
    renderControls();
  });

  $("#burst-btn").addEventListener("click", () => {
    sim.burst(20);
    renderAll(true);
    A.toast("Added a 20 request burst to the simulation", "info", 1600);
  });

  $("#reset-btn").addEventListener("click", () => {
    applyPreset(mode === "overload" ? "overload" : "steady", 10);
  });

  $("#copy-metrics").addEventListener("click", () => copyText(sim.metricsText(), "metrics text"));

  window.addEventListener("hashchange", () => {
    const requested = location.hash.slice(1);
    if (requested === "steady" || requested === "overload") {
      if (requested !== mode) applyPreset(requested);
    }
  });
}

const requested = location.hash.slice(1);
if (requested === "overload" || requested === "steady") mode = requested;
sim.reset(PRESETS[mode] ?? PRESETS.steady);
sim.warmup(14);
syncSliders();
wire();
renderAll(true);
setInterval(() => {
  sim.tick(120);
  frames++;
  if (frames % 2 === 0) renderAll();
}, 120);
