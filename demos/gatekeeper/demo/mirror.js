// Browser mirror of the Go gateway.
//
// This file is a faithful translation of the decision rules in
// src/gatekeeper/limiter.go and src/gatekeeper/metrics.go. The real service is
// Go; this mirror exists so the demo can run on a static host with no backend.
// If you change the refill or retry arithmetic in Go, change it here too.
//
// Time is in seconds (float), matching time.Time.Sub(...).Seconds() on the Go
// side. Latency values are simulated upstream work, not measured network time.

export const CLIENTS = [
  { id: "checkout-web", label: "checkout-web", weight: 0.34, baseLatency: 7 },
  { id: "mobile-ios", label: "mobile-ios", weight: 0.30, baseLatency: 9 },
  { id: "partner-api", label: "partner-api", weight: 0.26, baseLatency: 12 },
  { id: "internal-jobs", label: "internal-jobs", weight: 0.10, baseLatency: 5 },
];

export const PRESETS = {
  steady: { rate: 9, burst: 14, arrivalRate: 8.2, note: "Traffic sits just under the limit" },
  overload: { rate: 4, burst: 6, arrivalRate: 26, note: "Four times over capacity" },
};

function mulberry32(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Mirror of gatekeeper.Limiter: one bucket per key, refilled by elapsed time,
// burst applied as a cap, retry delay rounded up to the next millisecond.
export class TokenBucketLimiter {
  constructor({ rate, burst, now }) {
    this.now = now;
    this.rate = rate;
    this.burst = burst;
    this.buckets = new Map();
  }

  setConfig(rate, burst) {
    this.rate = rate;
    this.burst = burst;
    for (const bucket of this.buckets.values()) {
      bucket.tokens = Math.min(bucket.tokens, burst);
    }
  }

  allow(key) {
    const now = this.now();
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: this.burst, last: now };
      this.buckets.set(key, bucket);
    } else {
      const elapsed = now - bucket.last;
      if (elapsed > 0) {
        bucket.tokens = Math.min(this.burst, bucket.tokens + elapsed * this.rate);
      }
      if (elapsed !== 0) bucket.last = now;
    }
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true, remaining: bucket.tokens, retryAfterMs: 0 };
    }
    const retryAfterMs = Math.ceil(((1 - bucket.tokens) / this.rate) * 1000);
    return { allowed: false, remaining: bucket.tokens, retryAfterMs };
  }

  snapshot(key) {
    const bucket = this.buckets.get(key);
    if (!bucket) return { tokens: this.burst, exists: false };
    const elapsed = this.now() - bucket.last;
    if (elapsed > 0) {
      bucket.tokens = Math.min(this.burst, bucket.tokens + elapsed * this.rate);
      bucket.last = this.now();
    }
    return { tokens: bucket.tokens, exists: true };
  }

  keys() {
    return this.buckets.size;
  }
}

export class GatewaySim {
  constructor(config = PRESETS.steady, seed = 11) {
    this.random = mulberry32(seed);
    this.reset(config);
  }

  reset(config = PRESETS.steady) {
    this.config = { rate: config.rate, burst: config.burst, arrivalRate: config.arrivalRate };
    this.rate = this.config.rate;
    this.burst = this.config.burst;
    this.arrivalRate = this.config.arrivalRate;
    this.time = 0;
    this.carry = 0;
    this.paused = false;
    this.allowed = 0;
    this.denied = 0;
    this.inFlight = 0;
    this.latencies = [];
    this.events = [];
    this.buckets = new Map();
    this.limiter = new TokenBucketLimiter({ rate: this.rate, burst: this.burst, now: () => this.time });
    this.samples = [];
    this.sampleAllowed = 0;
    this.sampleDenied = 0;
    this.sampleTime = 0;
    this.durationSeconds = 0;
    this.lastRetry = new Map();
  }

  setConfig({ rate, burst, arrivalRate }) {
    if (rate !== undefined) this.rate = Number(rate);
    if (burst !== undefined) this.burst = Number(burst);
    if (arrivalRate !== undefined) this.arrivalRate = Number(arrivalRate);
    this.config = { rate: this.rate, burst: this.burst, arrivalRate: this.arrivalRate };
    this.limiter.setConfig(this.rate, this.burst);
  }

  chooseClient() {
    const roll = this.random();
    let total = 0;
    for (const client of CLIENTS) {
      total += client.weight;
      if (roll <= total) return client;
    }
    return CLIENTS[CLIENTS.length - 1];
  }

  latencyFor(client, allowed) {
    const base = client.baseLatency + this.random() * 14;
    // A rejected request still costs the limiter lookup but skips the handler.
    return Math.round((allowed ? base : 0.4 + this.random() * 0.8) * 10) / 10;
  }

  dispatch(client) {
    const decision = this.limiter.allow(client.id);
    const latency = this.latencyFor(client, decision.allowed);
    this.durationSeconds += latency / 1000;
    if (decision.allowed) {
      this.allowed++;
      this.sampleAllowed++;
    } else {
      this.denied++;
      this.sampleDenied++;
      this.lastRetry.set(client.id, decision.retryAfterMs);
    }
    this.latencies.push(latency);
    if (this.latencies.length > 300) this.latencies.shift();
    this.events.unshift({
      at: this.time,
      key: client.id,
      allowed: decision.allowed,
      remaining: decision.remaining,
      retryAfterMs: decision.retryAfterMs,
      latency,
    });
    if (this.events.length > 60) this.events.length = 60;
  }

  burst(count = 20) {
    for (let i = 0; i < count; i++) this.dispatch(this.chooseClient());
  }

  tick(dtMs = 120) {
    if (this.paused) return;
    const dt = dtMs / 1000;
    this.time += dt;
    this.carry += this.arrivalRate * dt;
    let arrivals = Math.floor(this.carry);
    this.carry -= arrivals;
    if (this.random() < this.carry) {
      arrivals++;
      this.carry -= 1;
    }
    for (let i = 0; i < arrivals; i++) this.dispatch(this.chooseClient());

    if (this.time - this.sampleTime >= 0.5) {
      const elapsed = this.time - this.sampleTime;
      this.samples.push({
        at: this.time,
        allowed: this.sampleAllowed / elapsed,
        denied: this.sampleDenied / elapsed,
        rps: (this.sampleAllowed + this.sampleDenied) / elapsed,
      });
      if (this.samples.length > 80) this.samples.shift();
      this.sampleAllowed = 0;
      this.sampleDenied = 0;
      this.sampleTime = this.time;
    }
  }

  warmup(seconds = 20, stepMs = 120) {
    const steps = Math.round((seconds * 1000) / stepMs);
    for (let i = 0; i < steps; i++) this.tick(stepMs);
  }

  percentile(p) {
    if (!this.latencies.length) return 0;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return sorted[index];
  }

  bucketStates() {
    return CLIENTS.map((client) => {
      const snapshot = this.limiter.snapshot(client.id);
      const tokens = snapshot.tokens;
      return {
        id: client.id,
        label: client.label,
        tokens,
        burst: this.burst,
        allowed: tokens >= 1,
        retryAfterMs: tokens >= 1 ? 0 : Math.ceil(((1 - tokens) / this.rate) * 1000),
      };
    });
  }

  totals() {
    const total = this.allowed + this.denied;
    return {
      total,
      allowed: this.allowed,
      denied: this.denied,
      deniedRate: total ? this.denied / total : 0,
      rps: this.samples.length ? this.samples[this.samples.length - 1].rps : 0,
      p50: this.percentile(50),
      p95: this.percentile(95),
      buckets: this.limiter.keys(),
      elapsed: this.time,
    };
  }

  // Same text exposition layout as gatekeeper.Metrics.Text().
  metricsText() {
    const now = this.time;
    const total = this.allowed + this.denied;
    const fmt = (value) => value.toFixed(3);
    const lines = [
      "# HELP gatekeeper_requests_total Requests handled by the limiter.",
      "# TYPE gatekeeper_requests_total counter",
      `gatekeeper_requests_total ${total}`,
      "# HELP gatekeeper_requests_allowed_total Requests admitted by the token bucket.",
      "# TYPE gatekeeper_requests_allowed_total counter",
      `gatekeeper_requests_allowed_total ${this.allowed}`,
      "# HELP gatekeeper_requests_denied_total Requests rejected with 429.",
      "# TYPE gatekeeper_requests_denied_total counter",
      `gatekeeper_requests_denied_total ${this.denied}`,
      "# HELP gatekeeper_in_flight_requests Requests currently being served.",
      "# TYPE gatekeeper_in_flight_requests gauge",
      `gatekeeper_in_flight_requests ${this.inFlight}`,
      "# HELP gatekeeper_request_duration_seconds_sum Total time spent in limiter protected handlers.",
      "# TYPE gatekeeper_request_duration_seconds_sum counter",
      `gatekeeper_request_duration_seconds_sum ${fmt(this.durationSeconds)}`,
      "# HELP gatekeeper_request_duration_seconds_count Number of timed limiter protected requests.",
      "# TYPE gatekeeper_request_duration_seconds_count counter",
      `gatekeeper_request_duration_seconds_count ${total}`,
      "# HELP gatekeeper_bucket_count Keys currently tracked by the limiter.",
      "# TYPE gatekeeper_bucket_count gauge",
      `gatekeeper_bucket_count ${this.limiter.keys()}`,
      "# HELP gatekeeper_uptime_seconds Seconds since the process started.",
      "# TYPE gatekeeper_uptime_seconds gauge",
      `gatekeeper_uptime_seconds ${fmt(now)}`,
    ];
    return lines.join("\n");
  }
}
