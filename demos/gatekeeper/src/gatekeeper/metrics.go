package gatekeeper

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"sync/atomic"
	"time"
)

// Metrics holds the counters exposed on /metrics. The format is the Prometheus
// text exposition format written by hand: no client library, no registry.
type Metrics struct {
	allowed       atomic.Uint64
	denied        atomic.Uint64
	inFlight      atomic.Int64
	durationNanos atomic.Uint64
	buckets       atomic.Int64
	started       time.Time
}

// NewMetrics returns zeroed metrics with the start time recorded for uptime.
func NewMetrics() *Metrics {
	return &Metrics{started: time.Now()}
}

// RecordAllowed counts a request that passed the limiter.
func (m *Metrics) RecordAllowed(d time.Duration) {
	m.allowed.Add(1)
	m.observe(d)
}

// RecordDenied counts a request rejected by the limiter.
func (m *Metrics) RecordDenied(d time.Duration) {
	m.denied.Add(1)
	m.observe(d)
}

func (m *Metrics) observe(d time.Duration) {
	if d > 0 {
		m.durationNanos.Add(uint64(d))
	}
}

// IncInFlight and DecInFlight track requests currently inside the gateway.
func (m *Metrics) IncInFlight() { m.inFlight.Add(1) }
func (m *Metrics) DecInFlight() { m.inFlight.Add(-1) }

// SetBuckets records the limiter's bucket count for the gauge.
func (m *Metrics) SetBuckets(n int) { m.buckets.Store(int64(n)) }

// Text renders the counters in the Prometheus text format. The order is fixed
// so a test can compare lines without sorting.
func (m *Metrics) Text() string {
	total := m.allowed.Load() + m.denied.Load()
	count := total
	seconds := float64(m.durationNanos.Load()) / float64(time.Second)

	var b strings.Builder
	writeMetric := func(name, help, kind, value string) {
		b.WriteString("# HELP " + name + " " + help + "\n")
		b.WriteString("# TYPE " + name + " " + kind + "\n")
		b.WriteString(name + " " + value + "\n")
	}
	writeMetric("gatekeeper_requests_total", "Requests handled by the limiter.", "counter", strconv.FormatUint(total, 10))
	writeMetric("gatekeeper_requests_allowed_total", "Requests admitted by the token bucket.", "counter", strconv.FormatUint(m.allowed.Load(), 10))
	writeMetric("gatekeeper_requests_denied_total", "Requests rejected with 429.", "counter", strconv.FormatUint(m.denied.Load(), 10))
	writeMetric("gatekeeper_in_flight_requests", "Requests currently being served.", "gauge", strconv.FormatInt(m.inFlight.Load(), 10))
	writeMetric("gatekeeper_request_duration_seconds_sum", "Total time spent in limiter-protected handlers.", "counter", formatFloat(seconds))
	writeMetric("gatekeeper_request_duration_seconds_count", "Number of timed limiter-protected requests.", "counter", strconv.FormatUint(count, 10))
	writeMetric("gatekeeper_bucket_count", "Keys currently tracked by the limiter.", "gauge", strconv.FormatInt(m.buckets.Load(), 10))
	writeMetric("gatekeeper_uptime_seconds", "Seconds since the process started.", "gauge", formatFloat(time.Since(m.started).Seconds()))
	return b.String()
}

func formatFloat(v float64) string {
	if math.IsNaN(v) || math.IsInf(v, 0) {
		return "0"
	}
	return strconv.FormatFloat(v, 'f', 3, 64)
}

// String is useful in logs and tests.
func (m *Metrics) String() string {
	return fmt.Sprintf("allowed=%d denied=%d in_flight=%d", m.allowed.Load(), m.denied.Load(), m.inFlight.Load())
}
