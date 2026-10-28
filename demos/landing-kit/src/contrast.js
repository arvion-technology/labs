/**
 * WCAG contrast maths for the template palettes.
 *
 * Landing Kit deliberately duplicates this ~40 lines instead of importing from
 * another project: every repository in the Labs series has to be cloneable on
 * its own, and a colour helper is cheaper to repeat than a package dependency.
 */

export function parseHex(input) {
  if (typeof input !== "string") throw new TypeError("colour must be a string");
  let hex = input.trim().replace(/^#/, "").toLowerCase();
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/.test(hex)) throw new Error(`not a 6-digit hex colour: ${input}`);
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function channel(value) {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex) {
  const { r, g, b } = typeof hex === "string" ? parseHex(hex) : hex;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function ratio(first, second) {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function grade(value) {
  if (value >= 7) return "AAA";
  if (value >= 4.5) return "AA";
  if (value >= 3) return "AA-large";
  return "FAIL";
}

export function auditPair(label, fg, bg, use = "text") {
  const value = ratio(fg, bg);
  const threshold = use === "text" ? 4.5 : 3;
  return {
    label, fg, bg, use,
    ratio: value,
    ratioText: `${value.toFixed(2)}:1`,
    level: grade(value),
    passes: value >= threshold,
    threshold,
  };
}
