/**
 * WCAG 2.2 contrast maths.
 *
 * Every function here is pure and takes plain values, so the docs site, the
 * tests and any consumer compute the same numbers. Alpha colours are composited
 * over an explicit backdrop, a ratio only exists relative to a background.
 */

const NAMED = { white: "#ffffff", black: "#000000", transparent: "#00000000" };

export function parseColor(input) {
  if (typeof input !== "string") throw new TypeError("colour must be a string");
  const raw = input.trim().toLowerCase();
  if (NAMED[raw]) return parseColor(NAMED[raw]);
  const fn = /^rgba?\(([^)]+)\)$/.exec(raw);
  if (fn) {
    const parts = fn[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) throw new Error(`bad rgb colour: ${input}`);
    const [r, g, b, a = 1] = parts;
    if ([r, g, b].some((v) => v < 0 || v > 255) || a < 0 || a > 1) throw new Error(`rgb out of range: ${input}`);
    return { r, g, b, a };
  }
  let hex = raw.startsWith("#") ? raw.slice(1) : raw;
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  if (hex.length === 4) hex = hex.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/.test(hex)) throw new Error(`not a hex colour: ${input}`);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

export function toHex({ r, g, b }) {
  const part = (v) => Math.round(clampByte(v)).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

const clampByte = (v) => Math.min(255, Math.max(0, v));

/** Composite `top` over `bottom`; opaque backdrops pass through. */
export function blend(top, bottom) {
  const fg = typeof top === "string" ? parseColor(top) : top;
  const bg = typeof bottom === "string" ? parseColor(bottom) : bottom;
  if (fg.a >= 1) return { r: fg.r, g: fg.g, b: fg.b, a: 1 };
  const a = fg.a + bg.a * (1 - fg.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
    g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
    b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
    a,
  };
}

/** sRGB relative luminance per WCAG 2.2 §relative-luminance. */
export function luminance(color) {
  const { r, g, b } = typeof color === "string" ? parseColor(color) : color;
  const lin = (v) => {
    const c = clampByte(v) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Contrast ratio, 1:1 to 21:1. Order does not matter; this is (Lmax+.05)/(Lmin+.05).
 * If either colour is translucent it is composited over the other when possible.
 */
export function contrastRatio(first, second) {
  const a = typeof first === "string" ? parseColor(first) : first;
  const b = typeof second === "string" ? parseColor(second) : second;
  const fg = a.a < 1 && b.a >= 1 ? blend(a, b) : a;
  const bg = b.a < 1 && a.a >= 1 ? blend(b, a) : b;
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

export const THRESHOLDS = {
  text: 4.5, // AA, normal-size text
  large: 3, // AA, >= 18.66px bold or >= 24px
  ui: 3, // non-text UI and graphical objects
  aaa: 7,
};

/**
 * Grade a ratio for a use. Returns `{ level, passes, label }`.
 * level is AAA, AA, AA-large or FAIL; `passes` compares against that use.
 */
export function grade(ratio, use = "text") {
  const threshold = THRESHOLDS[use] ?? THRESHOLDS.text;
  if (use === "text" && ratio >= THRESHOLDS.aaa) return { level: "AAA", passes: true, threshold };
  if (ratio >= THRESHOLDS.text) return { level: "AA", passes: ratio >= threshold, threshold };
  if (ratio >= THRESHOLDS.large) {
    return { level: use === "text" ? "AA-large" : "AA", passes: ratio >= threshold, threshold };
  }
  return { level: "FAIL", passes: false, threshold };
}

export function auditPair({ label, fg, bg, use = "text" }) {
  const ratio = contrastRatio(fg, bg);
  const result = grade(ratio, use);
  return {
    label, fg, bg, use,
    ratio,
    ratioText: `${ratio.toFixed(2)}:1`,
    level: result.level,
    passes: result.passes,
    threshold: result.threshold,
  };
}

export function auditPairs(pairs) {
  return pairs.map(auditPair);
}

/** Largest problem first; passing pairs sink to the bottom. */
export function sortBySeverity(rows) {
  return [...rows].sort((a, b) => {
    if (a.passes !== b.passes) return a.passes ? 1 : -1;
    return a.ratio - b.ratio;
  });
}

/**
 * Pick black or white for text on a fill, whichever has more contrast.
 * Used for generated avatars and chart labels.
 */
export function readableOn(background, options = ["#1a1405", "#ffffff"]) {
  const [a, b] = options;
  return contrastRatio(a, background) >= contrastRatio(b, background) ? a : b;
}

/** Hex ramp from one colour to another in `steps` even sRGB steps. */
export function mix(from, to, steps = 5) {
  if (steps < 2) throw new Error("need at least two steps");
  const a = parseColor(from);
  const b = parseColor(to);
  return Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1);
    return toHex({
      r: a.r + (b.r - a.r) * t,
      g: a.g + (b.g - a.g) * t,
      b: a.b + (b.b - a.b) * t,
    });
  });
}

export function describeRatio(ratio) {
  if (ratio >= 7) return "Excellent, AAA for body text";
  if (ratio >= 4.5) return "Passes AA for body text";
  if (ratio >= 3) return "Large text and UI only";
  return "Below 3:1, do not use for text";
}
