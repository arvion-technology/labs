/** Easing maths for the Motion Lab controls. Pure functions, no DOM. */

export const EASINGS = [
  { id: "standard", label: "Standard", value: "cubic-bezier(0.22, 0.61, 0.36, 1)" },
  { id: "entrance", label: "Entrance", value: "cubic-bezier(0.16, 1, 0.3, 1)" },
  { id: "exit", label: "Exit", value: "cubic-bezier(0.4, 0, 1, 1)" },
  { id: "spring", label: "Spring", value: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
  { id: "linear", label: "Linear (compare)", value: "linear" },
];

export const DURATION_MIN = 120;
export const DURATION_MAX = 2000;
export const DURATION_DEFAULT = 600;

/** Parse `cubic-bezier(a, b, c, d)` or `linear`. Returns null for anything else. */
export function parseEasing(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "linear") return { kind: "linear" };
  const match = /^cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)$/.exec(trimmed);
  if (!match) return null;
  const points = match.slice(1).map(Number);
  if (points.some((n) => Number.isNaN(n))) return null;
  if (points[0] < 0 || points[0] > 1 || points[2] < 0 || points[2] > 1) return null; // x must stay in range
  return { kind: "bezier", points };
}

/** CSS cubic-bezier evaluated as y for a given x, by bisection on the x curve. */
export function sampleEasing(value, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const parsed = parseEasing(value);
  if (!parsed) return x;
  if (parsed.kind === "linear") return x;
  const [p1x, p1y, p2x, p2y] = parsed.points;
  const bezier = (t, a, b) => {
    const u = 1 - t;
    return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t;
  };
  const xAt = (t) => bezier(t, p1x, p2x);
  const yAt = (t) => bezier(t, p1y, p2y);

  let low = 0;
  let high = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    if (xAt(mid) < x) low = mid;
    else high = mid;
  }
  return yAt((low + high) / 2);
}

export function clampDuration(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DURATION_DEFAULT;
  return Math.min(DURATION_MAX, Math.max(DURATION_MIN, Math.round(number)));
}

export function formatDuration(ms) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s`;
  return `${Math.round(ms)}ms`;
}

/**
 * Delay for each item in a staggered list. Capped so a long list does not take
 * ten seconds to appear. `total` is what the first item still has to wait after
 * the last one starts; the cap applies to the whole sequence.
 */
export function staggerDelays(count, step = 60, maxTotal = 600) {
  if (count <= 0) return [];
  const effective = Math.min(step, maxTotal / Math.max(1, count - 1));
  return Array.from({ length: count }, (_, index) => Math.round(index * effective));
}

/** The exact reduced-motion recipe every component should use. */
export const REDUCED_MOTION_CSS = `@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}`;

export function shouldAnimate(prefersReduced, userOptOut = false) {
  return !prefersReduced && !userOptOut;
}

/** Map a 0..1 progress to a spring-ish overshoot curve for the canvas preview. */
export function overshoot(progress, strength = 0.16) {
  const t = Math.min(1, Math.max(0, progress));
  return 1 - Math.cos(t * Math.PI * 1.5) * Math.exp(-t * 5) * (1 - strength) - (1 - strength) * 0;
}
