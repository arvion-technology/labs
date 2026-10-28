/**
 * Six template palettes, two modes each.
 *
 * These values are the source of truth for the demo CSS: a test reads
 * demo/landing.css and checks every colour below appears verbatim, so a palette
 * change cannot land on one side only.
 */
import { auditPair } from "./contrast.js";

export const PALETTE_TOKENS = ["bg", "surface", "text", "muted", "accent", "onAccent", "line", "tint"];

export const PALETTES = {
  saas: {
    name: "Ledgerline",
    note: "Cool light surfaces, one indigo action colour. Deliberately quiet: finance software sells on calm, not excitement.",
    light: {
      bg: "#f6f7fb", surface: "#ffffff", text: "#101828", muted: "#5b6478",
      accent: "#4f46e5", onAccent: "#ffffff", line: "#dfe3ee", tint: "#eef0ff",
    },
    dark: {
      bg: "#0b1020", surface: "#121a2e", text: "#f5f7ff", muted: "#a5b0c8",
      accent: "#8b86ff", onAccent: "#12102a", line: "#263149", tint: "#1a2138",
    },
  },
  agency: {
    name: "Fieldnote",
    note: "Warm paper and terracotta. The palette is doing the positioning: craft studio, not growth agency.",
    light: {
      bg: "#f3efe7", surface: "#fffdf8", text: "#1b1a17", muted: "#5c5a53",
      accent: "#a3402a", onAccent: "#fff8f0", line: "#ddd6c8", tint: "#f7e8dd",
    },
    dark: {
      bg: "#121110", surface: "#1b1917", text: "#f4efe5", muted: "#b3ab9c",
      accent: "#e8846a", onAccent: "#1a0f0b", line: "#332f29", tint: "#2a201a",
    },
  },
  app: {
    name: "Tempo",
    note: "Violet on near-black. The product is a phone app, so the page is allowed one loud colour and no chrome.",
    light: {
      bg: "#f4f1ff", surface: "#ffffff", text: "#1a1330", muted: "#5f5875",
      accent: "#7c3aed", onAccent: "#ffffff", line: "#e4dcfa", tint: "#efe8ff",
    },
    dark: {
      bg: "#0f0b1e", surface: "#191233", text: "#f6f1ff", muted: "#a99ec9",
      accent: "#b79bff", onAccent: "#160c33", line: "#2e2452", tint: "#241a45",
    },
  },
  ai: {
    name: "Vela",
    note: "Dark-first, with an electric blue action. The blue is reserved for anything the model can do for you.",
    light: {
      bg: "#f5f8ff", surface: "#ffffff", text: "#0a1020", muted: "#54617a",
      accent: "#1e63d6", onAccent: "#ffffff", line: "#dce5f5", tint: "#e8f0ff",
    },
    dark: {
      bg: "#070b14", surface: "#0e1524", text: "#eaf1ff", muted: "#93a4c1",
      accent: "#5aa2ff", onAccent: "#04101f", line: "#1d2940", tint: "#101b30",
    },
  },
  marketplace: {
    name: "Swap",
    note: "Warm cream and orange, with bigger type and more photography space than the SaaS template.",
    light: {
      bg: "#fbf5ec", surface: "#ffffff", text: "#22190f", muted: "#6b5c49",
      accent: "#b84a10", onAccent: "#ffffff", line: "#eadfcd", tint: "#fbe7d5",
    },
    dark: {
      bg: "#16100a", surface: "#21180f", text: "#fdf3e6", muted: "#b7a48c",
      accent: "#ff9b54", onAccent: "#231206", line: "#3a2c1d", tint: "#2b1f13",
    },
  },
  devtool: {
    name: "Relay",
    note: "Terminal green on ink. Monospace is a feature here: the page should feel like the tool's output.",
    light: {
      bg: "#f6f8f8", surface: "#ffffff", text: "#0d1512", muted: "#52605b",
      accent: "#0f766e", onAccent: "#ffffff", line: "#d8e2de", tint: "#e3f1ed",
    },
    dark: {
      bg: "#07100e", surface: "#0d1815", text: "#e9f5f0", muted: "#93aaa1",
      accent: "#34d3b4", onAccent: "#04140f", line: "#1c2f29", tint: "#0f231d",
    },
  },
};

export function getPalette(id, mode = "light") {
  const entry = PALETTES[id];
  if (!entry) throw new Error(`unknown palette "${id}"`);
  const colors = entry[mode];
  if (!colors) throw new Error(`palette "${id}" has no ${mode} mode`);
  return colors;
}

/** The four promises every template palette has to keep. */
export function paletteAudit(id, mode = "light") {
  const colors = getPalette(id, mode);
  return [
    auditPair("Body text on page", colors.text, colors.bg),
    auditPair("Secondary text on page", colors.muted, colors.bg),
    auditPair("Label on the action colour", colors.onAccent, colors.accent),
    auditPair("Action colour as text", colors.accent, colors.bg),
  ];
}

export function auditAllPalettes() {
  const rows = [];
  for (const id of Object.keys(PALETTES)) {
    for (const mode of ["light", "dark"]) {
      const groups = paletteAudit(id, mode);
      rows.push({
        id, mode,
        name: PALETTES[id].name,
        passing: groups.filter((g) => g.passes).length,
        total: groups.length,
        worst: groups.reduce((a, b) => (a.ratio <= b.ratio ? a : b)),
      });
    }
  }
  return rows;
}

export function paletteVariables(id, mode = "light") {
  const colors = getPalette(id, mode);
  const vars = {};
  for (const token of PALETTE_TOKENS) vars[`--lk-${token.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}`] = colors[token];
  return vars;
}

export function swatches(id, mode = "light") {
  const colors = getPalette(id, mode);
  return PALETTE_TOKENS.map((token) => ({ token, value: colors[token] }));
}
