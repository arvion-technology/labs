/**
 * Contrast audit for the semantic token set.
 *
 * The docs page does not hard-code any ratio. It resolves each promised pair
 * through the theme tokens and runs the WCAG maths from src/contrast.js, so a
 * token change that breaks a pair fails a test before it reaches the docs.
 */
import { A11Y_PAIRS, THEMES, tokenMaps } from "./tokens.js";
import { auditPair, contrastRatio, grade, sortBySeverity } from "./contrast.js";

export function auditTheme(theme = "dark") {
  const colors = tokenMaps(theme);
  if (!Object.keys(colors).length) throw new Error(`unknown theme "${theme}"`);
  return A11Y_PAIRS.map((pair) => {
    const fg = colors[pair.fg];
    const bg = colors[pair.bg];
    if (!fg || !bg) throw new Error(`pair ${pair.id} references a missing token`);
    return { id: pair.id, ...auditPair({ label: pair.label, fg, bg, use: pair.use }) };
  });
}

export function auditBothThemes() {
  const dark = auditTheme("dark");
  const light = auditTheme("light");
  return {
    dark,
    light,
    summary: {
      total: dark.length + light.length,
      passing: [...dark, ...light].filter((r) => r.passes).length,
      failing: [...dark, ...light].filter((r) => !r.passes).length,
      worst: sortBySeverity([...dark, ...light])[0],
    },
  };
}

/** Contrast of any two semantic tokens, for the colour reference tables. */
export function tokenPairRatio(theme, fgToken, bgToken) {
  const colors = tokenMaps(theme);
  const fg = colors[fgToken];
  const bg = colors[bgToken];
  if (!fg || !bg) return null;
  const ratio = contrastRatio(fg, bg);
  return { ratio, ...grade(ratio, "text") };
}

export function themeTokenRows(theme) {
  const source = THEMES[theme];
  if (!source) throw new Error(`unknown theme "${theme}"`);
  return Object.entries(source).map(([key, token]) => ({
    key,
    cssVar: `--arv-color-${key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}`,
    ...token,
  }));
}
