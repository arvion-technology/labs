package gatekeeper

import (
	"io"
	"log"
	"net/http"
	"time"
)

// Version is reported by /healthz and the root document.
const Version = "1.0.0"

// Server wires configuration, limiter, metrics and middleware into one handler.
// main owns the listener and shutdown; Server is testable with httptest.
type Server struct {
	cfg     Config
	logger  *log.Logger
	limiter *Limiter
	metrics *Metrics
	handler http.Handler
	start   time.Time
}

// NewServer builds the gateway handler. A nil logger discards log lines, which
// keeps handler tests quiet by default.
func NewServer(cfg Config, logger *log.Logger) *Server {
	if logger == nil {
		logger = log.New(io.Discard, "", 0)
	}
	s := &Server{
		cfg:     cfg,
		logger:  logger,
		limiter: NewLimiter(cfg.Rate, cfg.Burst, SystemClock()),
		metrics: NewMetrics(),
		start:   time.Now(),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.handleHealth)
	mux.HandleFunc("GET /metrics", s.handleMetrics)
	mux.HandleFunc("GET /{$}", s.handleInfo)

	protected := RateLimit(s.limiter, HeaderKey(cfg.KeyHeader), s.metrics)(http.HandlerFunc(s.handleEcho))
	mux.Handle("/api/echo", protected)

	s.handler = Chain(mux, Recovery(logger), RequestID(), Logger(logger), SecurityHeaders())
	return s
}

// Handler returns the fully wrapped http.Handler.
func (s *Server) Handler() http.Handler { return s.handler }

// Limiter exposes the limiter for the sweep goroutine and tests.
func (s *Server) Limiter() *Limiter { return s.limiter }

// Metrics exposes the metrics collector.
func (s *Server) Metrics() *Metrics { return s.metrics }

// Config returns the effective configuration.
func (s *Server) Config() Config { return s.cfg }

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":         "ok",
		"service":        "gatekeeper",
		"version":        Version,
		"uptime_seconds": formatFloat(time.Since(s.start).Seconds()),
	})
}

func (s *Server) handleMetrics(w http.ResponseWriter, _ *http.Request) {
	s.metrics.SetBuckets(s.limiter.Keys())
	w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(s.metrics.Text()))
}

func (s *Server) handleInfo(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"service": "gatekeeper",
		"version": Version,
		"endpoints": map[string]string{
			"GET /healthz": "process health",
			"GET /metrics": "Prometheus text metrics",
			"/api/echo":    "limiter-protected example route",
		},
		"limits": map[string]any{
			"rate_per_second": s.cfg.Rate,
			"burst":           s.cfg.Burst,
			"key_header":      s.cfg.KeyHeader,
		},
	})
}

func (s *Server) handleEcho(w http.ResponseWriter, r *http.Request) {
	key := ClientKeyFromContext(r.Context())
	tokens, _, ok := s.limiter.Snapshot(key)
	if !ok {
		tokens = 0
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"service":          "gatekeeper",
		"request_id":       RequestIDFromContext(r.Context()),
		"key":              key,
		"method":           r.Method,
		"path":             r.URL.Path,
		"tokens_remaining": formatFloat(tokens),
	})
}
