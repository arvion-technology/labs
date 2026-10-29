// Package gatekeeper implements the HTTP gateway: a per-key token bucket in
// front of the application routes, plus the middleware and telemetry around it.
package gatekeeper

import (
	"fmt"
	"strconv"
	"time"
)

// Environment variable names, exported so tests and the README stay in sync.
const (
	EnvAddr            = "GATEKEEPER_ADDR"
	EnvRate            = "GATEKEEPER_RATE"
	EnvBurst           = "GATEKEEPER_BURST"
	EnvKeyHeader       = "GATEKEEPER_KEY_HEADER"
	EnvShutdownTimeout = "GATEKEEPER_SHUTDOWN_TIMEOUT"
)

// Config is everything the service reads from the environment.
type Config struct {
	Addr              string
	Rate              float64 // tokens per second, per key
	Burst             int     // bucket capacity, per key
	KeyHeader         string  // header used to identify a client
	ShutdownTimeout   time.Duration
	ReadHeaderTimeout time.Duration
}

// DefaultConfig returns the values used when the environment is empty.
func DefaultConfig() Config {
	return Config{
		Addr:              ":8080",
		Rate:              10,
		Burst:             20,
		KeyHeader:         "X-API-Key",
		ShutdownTimeout:   10 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
	}
}

// Validate rejects configurations that would produce a service that cannot work.
func (c Config) Validate() error {
	if c.Addr == "" {
		return fmt.Errorf("%s: address must not be empty", EnvAddr)
	}
	if c.Rate <= 0 {
		return fmt.Errorf("%s: rate must be greater than zero", EnvRate)
	}
	if c.Burst < 1 {
		return fmt.Errorf("%s: burst must be at least 1", EnvBurst)
	}
	if c.KeyHeader == "" {
		return fmt.Errorf("%s: key header must not be empty", EnvKeyHeader)
	}
	if c.ShutdownTimeout <= 0 {
		return fmt.Errorf("%s: shutdown timeout must be positive", EnvShutdownTimeout)
	}
	if c.ReadHeaderTimeout <= 0 {
		return fmt.Errorf("%s: read header timeout must be positive", EnvShutdownTimeout)
	}
	return nil
}

// ConfigFromEnv builds a Config from a lookup function (os.Getenv in main,
// a map lookup in tests). Every variable is optional; parse failures name the
// variable so a bad deployment is obvious in the boot log.
func ConfigFromEnv(lookup func(string) string) (Config, error) {
	cfg := DefaultConfig()
	if v := lookup(EnvAddr); v != "" {
		cfg.Addr = v
	}
	if v := lookup(EnvRate); v != "" {
		rate, err := strconv.ParseFloat(v, 64)
		if err != nil {
			return Config{}, fmt.Errorf("%s=%q: %w", EnvRate, v, err)
		}
		cfg.Rate = rate
	}
	if v := lookup(EnvBurst); v != "" {
		burst, err := strconv.Atoi(v)
		if err != nil {
			return Config{}, fmt.Errorf("%s=%q: %w", EnvBurst, v, err)
		}
		cfg.Burst = burst
	}
	if v := lookup(EnvKeyHeader); v != "" {
		cfg.KeyHeader = v
	}
	if v := lookup(EnvShutdownTimeout); v != "" {
		d, err := time.ParseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("%s=%q: %w", EnvShutdownTimeout, v, err)
		}
		cfg.ShutdownTimeout = d
	}
	if err := cfg.Validate(); err != nil {
		return Config{}, err
	}
	return cfg, nil
}
