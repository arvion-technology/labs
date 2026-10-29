package gatekeeper

import (
	"math"
	"sync"
	"time"
)

// Clock is the only source of time in the limiter. Tests inject a fake clock so
// refill behaviour is deterministic; production uses SystemClock.
type Clock interface {
	Now() time.Time
}

type systemClock struct{}

func (systemClock) Now() time.Time { return time.Now() }

// SystemClock returns the real clock.
func SystemClock() Clock { return systemClock{} }

// Decision is the result of one Allow call. Remaining is a float because a
// bucket holds fractional tokens after a partial refill; RetryAfter is how long
// until the next request would be allowed.
type Decision struct {
	Allowed    bool
	Remaining  float64
	Burst      int
	Rate       float64
	RetryAfter time.Duration
}

type bucket struct {
	tokens float64
	last   time.Time
}

// Limiter keeps one token bucket per key. It is safe for concurrent use.
type Limiter struct {
	mu      sync.Mutex
	rate    float64
	burst   int
	clock   Clock
	buckets map[string]*bucket
}

// NewLimiter builds a limiter that admits rate requests per second per key and
// allows bursts of up to burst requests. A burst of 1 is a strict pacer.
func NewLimiter(rate float64, burst int, clock Clock) *Limiter {
	if clock == nil {
		clock = SystemClock()
	}
	return &Limiter{
		rate:    rate,
		burst:   burst,
		clock:   clock,
		buckets: make(map[string]*bucket),
	}
}

// Rate returns the configured refill rate.
func (l *Limiter) Rate() float64 { return l.rate }

// Burst returns the bucket capacity.
func (l *Limiter) Burst() int { return l.burst }

// Allow takes one token from the key's bucket if available.
func (l *Limiter) Allow(key string) Decision {
	return l.AllowN(key, 1)
}

// AllowN takes n tokens from the key's bucket. It is useful for weighted
// endpoints (a bulk request costs more than a single lookup). A request that
// cannot afford all n tokens is rejected without spending any, so a partially
// charged batch never happens.
func (l *Limiter) AllowN(key string, n int) Decision {
	if n < 1 {
		n = 1
	}
	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.clock.Now()
	b, ok := l.buckets[key]
	if !ok {
		b = &bucket{tokens: float64(l.burst), last: now}
		l.buckets[key] = b
	} else {
		elapsed := now.Sub(b.last).Seconds()
		if elapsed > 0 {
			b.tokens = math.Min(float64(l.burst), b.tokens+elapsed*l.rate)
		}
		// A clock that moves backwards must not create tokens or freeze the
		// bucket forever; treat the new time as the reference point.
		if elapsed != 0 {
			b.last = now
		}
	}

	decision := Decision{Burst: l.burst, Rate: l.rate}
	if b.tokens >= float64(n) {
		b.tokens -= float64(n)
		decision.Allowed = true
		decision.Remaining = b.tokens
		return decision
	}
	deficit := float64(n) - b.tokens
	decision.Allowed = false
	decision.Remaining = b.tokens
	// Round up to the next millisecond so Retry-After never advertises a delay
	// that still fails when the client follows it.
	ms := math.Ceil((deficit / l.rate) * 1000)
	decision.RetryAfter = time.Duration(ms) * time.Millisecond
	return decision
}

// Snapshot reports the bucket state for one key, refilling it first. The
// returned ok is false when the key has never been seen.
func (l *Limiter) Snapshot(key string) (tokens float64, decision Decision, ok bool) {
	l.mu.Lock()
	defer l.mu.Unlock()
	b, ok := l.buckets[key]
	if !ok {
		return 0, Decision{Burst: l.burst, Rate: l.rate}, false
	}
	now := l.clock.Now()
	elapsed := now.Sub(b.last).Seconds()
	if elapsed > 0 {
		b.tokens = math.Min(float64(l.burst), b.tokens+elapsed*l.rate)
		b.last = now
	}
	return b.tokens, Decision{Burst: l.burst, Rate: l.rate, Remaining: b.tokens}, true
}

// Keys returns the number of tracked buckets.
func (l *Limiter) Keys() int {
	l.mu.Lock()
	defer l.mu.Unlock()
	return len(l.buckets)
}

// Sweep drops buckets untouched for longer than idle. Without this an
// unbounded key space is a memory leak, which is the classic failure mode of a
// per-key limiter under attack.
func (l *Limiter) Sweep(idle time.Duration) int {
	l.mu.Lock()
	defer l.mu.Unlock()
	cutoff := l.clock.Now().Add(-idle)
	removed := 0
	for key, b := range l.buckets {
		// Buckets that would be full again by the cutoff carry no useful state.
		if b.last.Before(cutoff) {
			delete(l.buckets, key)
			removed++
		}
	}
	return removed
}
