package gatekeeper

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net"
	"net/http"
	"runtime/debug"
	"strconv"
	"time"
)

// Middleware wraps a handler. Chain applies them in the order given, so
// Chain(h, A, B) runs A first on the way in.
type Middleware func(http.Handler) http.Handler

// Chain composes middleware around h.
func Chain(h http.Handler, middlewares ...Middleware) http.Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		h = middlewares[i](h)
	}
	return h
}

type contextKey string

const (
	requestIDKey contextKey = "request_id"
	clientKeyKey contextKey = "client_key"
)

// RequestIDFromContext returns the id attached by the RequestID middleware.
func RequestIDFromContext(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey).(string)
	return id
}

// ClientKeyFromContext returns the limiter key chosen for the request.
func ClientKeyFromContext(ctx context.Context) string {
	key, _ := ctx.Value(clientKeyKey).(string)
	return key
}

func newRequestID() string {
	var buf [8]byte
	if _, err := rand.Read(buf[:]); err != nil {
		// crypto/rand failing is exceptional; fall back to the clock so the
		// request still gets a unique-enough id rather than an empty header.
		return fmt.Sprintf("t%x", time.Now().UnixNano())
	}
	return hex.EncodeToString(buf[:])
}

// RequestID attaches an id to the response header and the request context. An
// inbound X-Request-ID is reused when it is short and printable, so a client or
// an upstream proxy can correlate its logs with ours.
func RequestID() Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			id := r.Header.Get("X-Request-ID")
			if !validRequestID(id) {
				id = newRequestID()
			}
			w.Header().Set("X-Request-ID", id)
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), requestIDKey, id)))
		})
	}
}

func validRequestID(id string) bool {
	if id == "" || len(id) > 64 {
		return false
	}
	for _, r := range id {
		if r < 0x21 || r > 0x7e {
			return false
		}
	}
	return true
}

type responseRecorder struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (r *responseRecorder) WriteHeader(status int) {
	if r.status == 0 {
		r.status = status
	}
	r.ResponseWriter.WriteHeader(status)
}

func (r *responseRecorder) Write(p []byte) (int, error) {
	if r.status == 0 {
		r.status = http.StatusOK
	}
	n, err := r.ResponseWriter.Write(p)
	r.bytes += n
	return n, err
}

// Flush and Unwrap keep streaming responses working through the logging
// wrapper. Without Unwrap, http.NewResponseController cannot reach the original
// writer and server-sent events break under the access log.
func (r *responseRecorder) Flush() {
	if flusher, ok := r.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

func (r *responseRecorder) Unwrap() http.ResponseWriter {
	return r.ResponseWriter
}

// SecurityHeaders sets the headers a JSON gateway should always send. They are
// cheap defence for browser-facing errors and for responses cached by a proxy.
func SecurityHeaders() Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("Referrer-Policy", "no-referrer")
			w.Header().Set("Cache-Control", "no-store")
			next.ServeHTTP(w, r)
		})
	}
}

// Logger writes one line per request after the handler returns.
func Logger(logger *log.Logger) Middleware {
	if logger == nil {
		logger = log.New(nopWriter{}, "", 0)
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rec := &responseRecorder{ResponseWriter: w}
			next.ServeHTTP(rec, r)
			if rec.status == 0 {
				rec.status = http.StatusOK
			}
			logger.Printf("method=%s path=%q status=%d bytes=%d duration=%s remote=%s request_id=%s",
				r.Method, r.URL.Path, rec.status, rec.bytes, time.Since(start).Round(time.Microsecond), r.RemoteAddr, RequestIDFromContext(r.Context()))
		})
	}
}

type nopWriter struct{}

func (nopWriter) Write(p []byte) (int, error) { return len(p), nil }

// Recovery turns a panic into a 500 with a JSON error instead of a dropped
// connection. The stack trace goes to the log, never to the client.
func Recovery(logger *log.Logger) Middleware {
	if logger == nil {
		logger = log.New(nopWriter{}, "", 0)
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if recovered := recover(); recovered != nil {
					logger.Printf("panic method=%s path=%q request_id=%s error=%v\n%s",
						r.Method, r.URL.Path, RequestIDFromContext(r.Context()), recovered, debug.Stack())
					writeJSON(w, http.StatusInternalServerError, map[string]any{
						"error":      "internal_error",
						"request_id": RequestIDFromContext(r.Context()),
					})
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

// KeyFunc picks the limiter key for a request.
type KeyFunc func(*http.Request) string

// HeaderKey uses the configured header and falls back to the remote IP. Keys
// are not authenticated identities; see the README limitation.
func HeaderKey(header string) KeyFunc {
	return func(r *http.Request) string {
		if v := r.Header.Get(header); v != "" {
			return v
		}
		if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil && host != "" {
			return host
		}
		if r.RemoteAddr != "" {
			return r.RemoteAddr
		}
		return "anonymous"
	}
}

// RateLimit admits or rejects a request based on the caller's bucket. Rejected
// requests get 429 with Retry-After and the same rate-limit headers as allowed
// ones, so a client can back off without guessing.
func RateLimit(limiter *Limiter, keyFunc KeyFunc, metrics *Metrics) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			key := keyFunc(r)
			decision := limiter.Allow(key)

			w.Header().Set("X-RateLimit-Limit", formatFloat(limiter.Rate()))
			w.Header().Set("X-RateLimit-Burst", strconv.Itoa(limiter.Burst()))
			w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(maxInt(0, int(math.Floor(decision.Remaining)))))

			if !decision.Allowed {
				retrySeconds := int(math.Ceil(decision.RetryAfter.Seconds()))
				if retrySeconds < 1 {
					retrySeconds = 1
				}
				w.Header().Set("Retry-After", strconv.Itoa(retrySeconds))
				metrics.RecordDenied(time.Since(start))
				writeJSON(w, http.StatusTooManyRequests, map[string]any{
					"error":          "rate_limited",
					"key":            key,
					"retry_after_ms": decision.RetryAfter.Milliseconds(),
					"request_id":     RequestIDFromContext(r.Context()),
				})
				return
			}

			ctx := context.WithValue(r.Context(), clientKeyKey, key)
			metrics.IncInFlight()
			defer metrics.DecInFlight()
			next.ServeHTTP(w, r.WithContext(ctx))
			metrics.RecordAllowed(time.Since(start))
		})
	}
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
