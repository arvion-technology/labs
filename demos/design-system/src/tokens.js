/**
 * Arvion UI token architecture.
 *
 * Three layers, in this order:
 *   1. primitives, raw ramps. Never referenced by product code.
 *   2. semantic, role tokens (text, surface, accent). What components use.
 *   3. component, not a token layer at all: components read semantic tokens
 *                    through the `--arv-*` custom properties emitted here.
 *
 * Keeping primitives out of the emitted CSS is deliberate. It stops a product
 * from painting `#3a7bff` directly and then failing when the theme changes.
 */

export const BRAND = {
  bg: "#0b0f1a",
  surface: "#121826",
  gold: "#f5c26b",
  blue: "#3a7bff",
  green: "#34d399",
  text: "#ffffff",
  body: "#cfd6e4",
};

/** Raw ramps. Docs-only surface; components never consume these. */
export const PRIMITIVES = {
  ink: [
    ["ink-950", "#070a11"], ["ink-900", "#0b0f1a"], ["ink-850", "#0e1322"],
    ["ink-800", "#121826"], ["ink-750", "#171f31"], ["ink-700", "#1d2740"],
    ["ink-600", "#27324a"], ["ink-500", "#3a4763"],
  ],
  gold: [
    ["gold-100", "#fdf3df"], ["gold-300", "#f9d79a"], ["gold-500", "#f5c26b"],
    ["gold-600", "#e0a94a"], ["gold-700", "#c08a2e"], ["gold-900", "#7a4d00"],
    ["gold-950", "#4a2e00"],
  ],
  blue: [
    ["blue-100", "#e6efff"], ["blue-300", "#9dc0ff"], ["blue-500", "#3a7bff"],
    ["blue-600", "#2f66e0"], ["blue-700", "#2456c9"], ["blue-900", "#122a63"],
  ],
  green: [
    ["green-100", "#d8fbee"], ["green-300", "#9bf0d0"], ["green-500", "#34d399"],
    ["green-600", "#10b981"], ["green-700", "#067a57"],
  ],
  red: [
    ["red-100", "#fee2e2"], ["red-300", "#fca5a5"], ["red-500", "#f87171"],
    ["red-600", "#dc2626"], ["red-700", "#b91c1c"],
  ],
  amber: [["amber-500", "#fbbf24"], ["amber-700", "#b45309"]],
  purple: [["purple-500", "#a78bfa"], ["purple-700", "#7c3aed"]],
  neutral: [
    ["white", "#ffffff"], ["neutral-200", "#cfd6e4"], ["neutral-400", "#8d98ab"],
    ["neutral-600", "#5a6579"], ["neutral-800", "#2b3447"],
  ],
};

const dark = {
  bg: ["#0b0f1a", "Page background. The one surface everything sits on."],
  bgSoft: ["#0e1322", "Recessed panels, sidebars, page gutters."],
  surface: ["#121826", "Default card and panel fill."],
  surface2: ["#171f31", "Raised card, table head, toast."],
  surface3: ["#1d2740", "Pressed state, progress track, switch track."],
  line: ["rgba(255, 255, 255, 0.08)", "Hairline separators and card borders."],
  lineStrong: ["rgba(255, 255, 255, 0.16)", "Input borders, focus-adjacent edges."],
  text: ["#ffffff", "Primary text and headings."],
  text2: ["#cfd6e4", "Body copy and table cells."],
  muted: ["#8d98ab", "Labels, captions, secondary metadata."],
  accent: ["#f5c26b", "Brand fill: primary button, active nav, progress."],
  accentSoft: ["rgba(245, 194, 107, 0.12)", "Tinted background behind gold text."],
  accentLine: ["rgba(245, 194, 107, 0.32)", "Gold border on tinted backgrounds."],
  accentText: ["#f5c26b", "Gold used as text or icon on a dark surface."],
  onAccent: ["#1a1405", "Text on top of an accent fill."],
  blue: ["#2f66e0", "Action blue fill. Darker than the brand hue for contrast."],
  blueSoft: ["rgba(58, 123, 255, 0.12)", "Selected row and informational tint."],
  blueText: ["#8fb4ff", "Blue used as text on dark surfaces."],
  onBlue: ["#ffffff", "Text on top of an action-blue fill."],
  green: ["#34d399", "Success fill and chart series."],
  greenSoft: ["rgba(52, 211, 153, 0.12)", "Success tint behind positive messages."],
  greenText: ["#34d399", "Success text on dark surfaces."],
  red: ["#f87171", "Danger fill and destructive text."],
  redSoft: ["rgba(248, 113, 113, 0.12)", "Danger tint behind destructive text."],
  redText: ["#f87171", "Danger text on dark surfaces."],
  amber: ["#fbbf24", "Warning fill and icon."],
  purple: ["#a78bfa", "Category accent, analytics series."],
  focus: ["#f5c26b", "Focus ring. Must clear 3:1 against its background."],
  overlay: ["rgba(4, 7, 13, 0.72)", "Modal and drawer scrim."],
};

const light = {
  bg: ["#f4f6fb", "Page background for the light theme."],
  bgSoft: ["#eef1f8", "Recessed panels, sidebars, page gutters."],
  surface: ["#ffffff", "Default card and panel fill."],
  surface2: ["#f7f8fc", "Raised card, table head, toast."],
  surface3: ["#eef1f8", "Pressed state, progress track, switch track."],
  line: ["rgba(11, 15, 26, 0.09)", "Hairline separators and card borders."],
  lineStrong: ["rgba(11, 15, 26, 0.16)", "Input borders, focus-adjacent edges."],
  text: ["#0b0f1a", "Primary text and headings."],
  text2: ["#2b3447", "Body copy and table cells."],
  muted: ["#5a6579", "Labels, captions, secondary metadata."],
  accent: ["#e0a94a", "Brand fill: primary button, active nav, progress."],
  accentSoft: ["rgba(154, 106, 14, 0.1)", "Tinted background behind gold text."],
  accentLine: ["rgba(154, 106, 14, 0.28)", "Gold border on tinted backgrounds."],
  accentText: ["#7a4d00", "Gold used as text or icon on a light surface."],
  onAccent: ["#1a1405", "Text on top of an accent fill."],
  blue: ["#2f66e0", "Action blue fill. Same value in both themes."],
  blueSoft: ["rgba(58, 123, 255, 0.1)", "Selected row and informational tint."],
  blueText: ["#2456c9", "Blue used as text on light surfaces."],
  onBlue: ["#ffffff", "Text on top of an action-blue fill."],
  green: ["#059669", "Success fill and chart series."],
  greenSoft: ["rgba(5, 150, 105, 0.1)", "Success tint behind positive messages."],
  greenText: ["#067a57", "Success text on light surfaces."],
  red: ["#dc2626", "Danger fill and destructive text."],
  redSoft: ["rgba(220, 38, 38, 0.08)", "Danger tint behind destructive text."],
  redText: ["#b91c1c", "Danger text on light surfaces."],
  amber: ["#b45309", "Warning fill and icon."],
  purple: ["#7c3aed", "Category accent, analytics series."],
  focus: ["#7a4d00", "Focus ring. Must clear 3:1 against its background."],
  overlay: ["rgba(11, 15, 26, 0.45)", "Modal and drawer scrim."],
};

const entries = (record) => Object.fromEntries(
  Object.entries(record).map(([key, [value, description]]) => [key, { value, description }]),
);

export const THEMES = { dark: entries(dark), light: entries(light) };

export const FONTS = {
  sans: {
    stack: '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    role: "Body copy, labels, tables, everything that is not a heading.",
  },
  display: {
    stack: '"Poppins", "Inter", ui-sans-serif, system-ui, sans-serif',
    role: "Headings and numbers. Geometric, so figures stay legible when large.",
  },
  mono: {
    stack: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    role: "Code, order ids, token values.",
  },
};

export const TYPE_SCALE = [
  { name: "display", size: 56, lineHeight: 1.05, weight: 700, tracking: "-0.03em", usage: "Landing hero, one per page." },
  { name: "h1", size: 42, lineHeight: 1.12, weight: 700, tracking: "-0.025em", usage: "Page title." },
  { name: "h2", size: 32, lineHeight: 1.2, weight: 600, tracking: "-0.02em", usage: "Section heading." },
  { name: "h3", size: 24, lineHeight: 1.25, weight: 600, tracking: "-0.015em", usage: "Card group heading." },
  { name: "h4", size: 19, lineHeight: 1.3, weight: 600, tracking: "-0.01em", usage: "Card title." },
  { name: "lead", size: 18, lineHeight: 1.6, weight: 400, tracking: "0", usage: "Intro paragraph under an h1." },
  { name: "body", size: 15, lineHeight: 1.55, weight: 400, tracking: "0", usage: "Default text." },
  { name: "small", size: 13, lineHeight: 1.5, weight: 400, tracking: "0.005em", usage: "Secondary metadata." },
  { name: "caption", size: 11.5, lineHeight: 1.4, weight: 500, tracking: "0.01em", usage: "Chart labels, table meta." },
  { name: "overline", size: 11, lineHeight: 1.4, weight: 600, tracking: "0.14em", usage: "Eyebrow labels. Always uppercase." },
  { name: "code", size: 13, lineHeight: 1.65, weight: 400, tracking: "0", usage: "Inline code and snippets." },
];

export const SPACING = [
  { token: "2xs", px: 4, usage: "Icon-to-label gap." },
  { token: "xs", px: 8, usage: "Inside a button, between badges." },
  { token: "sm", px: 12, usage: "Form field to its hint." },
  { token: "md", px: 16, usage: "Card inner padding, grid gap." },
  { token: "lg", px: 24, usage: "Between cards in a column." },
  { token: "xl", px: 32, usage: "Between content groups." },
  { token: "2xl", px: 40, usage: "Section padding on mobile." },
  { token: "3xl", px: 48, usage: "Section padding." },
  { token: "4xl", px: 64, usage: "Page section rhythm at 1440px." },
  { token: "5xl", px: 80, usage: "Landing section rhythm." },
];

export const RADIUS = [
  { token: "none", px: 0, usage: "Dividers, full-bleed charts." },
  { token: "sm", px: 10, usage: "Inputs, small buttons, badges inside cards." },
  { token: "md", px: 14, usage: "Cards, panels." },
  { token: "lg", px: 22, usage: "Modals, hero panels." },
  { token: "full", px: 999, usage: "Pills, avatars, switches." },
];

export const ELEVATION = [
  { token: "flat", value: "none", usage: "Cards on the page background." },
  { token: "raised", value: "0 12px 32px -20px rgba(0, 0, 0, 0.85)", usage: "Hoverable cards, toasts." },
  { token: "overlay", value: "0 1px 0 rgba(255, 255, 255, 0.04) inset, 0 24px 60px -30px rgba(0, 0, 0, 0.9)", usage: "Modals, popovers." },
];

export const MOTION = {
  durations: [
    { token: "instant", ms: 0, usage: "Theme switch when reduced motion is requested." },
    { token: "fast", ms: 120, usage: "Button press, toggle knob." },
    { token: "base", ms: 180, usage: "Hover, focus, menu open." },
    { token: "slow", ms: 280, usage: "Modal enter, accordion." },
    { token: "slower", ms: 480, usage: "Chart draw on first paint." },
  ],
  easings: [
    { token: "standard", value: "cubic-bezier(0.22, 0.61, 0.36, 1)", usage: "Most transitions. Fast out, soft in." },
    { token: "entrance", value: "cubic-bezier(0.16, 1, 0.3, 1)", usage: "Things appearing: modal, toast, drawer." },
    { token: "exit", value: "cubic-bezier(0.4, 0, 1, 1)", usage: "Things leaving. No overshoot on the way out." },
    { token: "spring", value: "cubic-bezier(0.34, 1.56, 0.64, 1)", usage: "Playful confirmations only. Never on scroll." },
  ],
};

export const BREAKPOINTS = [
  { token: "sm", px: 640, usage: "Two-up cards." },
  { token: "md", px: 768, usage: "Sidebar becomes a drawer." },
  { token: "lg", px: 960, usage: "Docs two-column layout." },
  { token: "xl", px: 1200, usage: "Full 12-column grid." },
  { token: "2xl", px: 1440, usage: "Maximum content width." },
];

/**
 * Contrast pairs the system promises. `fg` and `bg` are semantic token keys,
 * so the same promise is checked in both themes.
 * `use`: text (4.5:1), large (3:1), ui (3:1).
 */
export const A11Y_PAIRS = [
  { id: "text-bg", label: "Primary text on page", fg: "text", bg: "bg", use: "text" },
  { id: "text-surface", label: "Primary text on card", fg: "text", bg: "surface", use: "text" },
  { id: "text2-surface", label: "Body text on card", fg: "text2", bg: "surface", use: "text" },
  { id: "muted-surface", label: "Secondary text on card", fg: "muted", bg: "surface", use: "text" },
  { id: "accent-text", label: "Gold link on card", fg: "accentText", bg: "surface", use: "text" },
  { id: "blue-text", label: "Blue link on card", fg: "blueText", bg: "surface", use: "text" },
  { id: "green-text", label: "Success text on card", fg: "greenText", bg: "surface", use: "text" },
  { id: "red-text", label: "Danger text on card", fg: "redText", bg: "surface", use: "text" },
  { id: "on-accent", label: "Label on primary button", fg: "onAccent", bg: "accent", use: "text" },
  { id: "on-blue", label: "Label on action-blue button", fg: "onBlue", bg: "blue", use: "text" },
  { id: "focus-bg", label: "Focus ring on page", fg: "focus", bg: "bg", use: "ui" },
];

const kebab = (s) => s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());

/** Base tokens are theme-independent. */
export function baseVariables() {
  const vars = {
    "--arv-font-sans": FONTS.sans.stack,
    "--arv-font-display": FONTS.display.stack,
    "--arv-font-mono": FONTS.mono.stack,
  };
  for (const step of TYPE_SCALE) {
    vars[`--arv-text-${step.name}`] = `${step.size}px`;
    vars[`--arv-leading-${step.name}`] = String(step.lineHeight);
    vars[`--arv-tracking-${step.name}`] = step.tracking;
    vars[`--arv-weight-${step.name}`] = String(step.weight);
  }
  for (const s of SPACING) vars[`--arv-space-${s.token}`] = `${s.px}px`;
  for (const r of RADIUS) vars[`--arv-radius-${r.token}`] = `${r.px}px`;
  for (const e of ELEVATION) vars[`--arv-shadow-${e.token}`] = e.value;
  for (const d of MOTION.durations) vars[`--arv-duration-${d.token}`] = `${d.ms}ms`;
  for (const e of MOTION.easings) vars[`--arv-ease-${e.token}`] = e.value;
  for (const b of BREAKPOINTS) vars[`--arv-breakpoint-${b.token}`] = `${b.px}px`;
  return vars;
}

/** Flatten one theme into `--arv-color-*` custom properties. */
export function colorVariables(theme = "dark") {
  const source = THEMES[theme];
  if (!source) throw new Error(`unknown theme "${theme}"`);
  const vars = {};
  for (const [key, token] of Object.entries(source)) vars[`--arv-color-${kebab(key)}`] = token.value;
  return vars;
}

export function cssVariables(theme = "dark") {
  return { ...baseVariables(), ...colorVariables(theme) };
}

function block(selector, vars, indent = "  ") {
  const body = Object.entries(vars).map(([k, v]) => `${indent}${k}: ${v};`).join("\n");
  return `${selector} {\n${body}\n}`;
}

/**
 * The token package's CSS. Consumers paste this once and use semantic
 * `--arv-color-*` properties; the light theme only overrides colour.
 */
export function themeCSS() {
  const base = baseVariables();
  const darkVars = colorVariables("dark");
  const lightVars = colorVariables("light");
  const darkBlock = Object.fromEntries(Object.keys(lightVars).map((k) => [k, darkVars[k]]));
  return [
    "/* Arvion UI tokens, generated from src/tokens.js. MIT licensed. */",
    block(":root", { ...base, ...darkBlock, "color-scheme": "dark" }),
    block('[data-theme="light"]', { ...lightVars, "color-scheme": "light" }),
    "",
  ].join("\n\n");
}

export function tokenMaps(theme = "dark") {
  const source = THEMES[theme];
  if (!source) throw new Error(`unknown theme "${theme}"`);
  return Object.fromEntries(Object.entries(source).map(([k, v]) => [k, v.value]));
}

export const TOKEN_GROUPS = [
  { id: "color", name: "Color", description: "Primitive ramps and semantic roles for both themes." },
  { id: "type", name: "Typography", description: "Two families, eleven steps, fixed line heights." },
  { id: "spacing", name: "Spacing", description: "A 4px base scale with ten steps and no in-betweens." },
  { id: "radius", name: "Radius and elevation", description: "Five radii and three shadows, nothing floating." },
  { id: "motion", name: "Motion", description: "Four durations and four easings with a reduced-motion path." },
];
