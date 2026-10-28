/** Theme resolution and persistence keys. Pure so it can be tested without a DOM. */

export const THEME_KEY = "arvion-ui:theme";
export const DEFAULT_THEME = "dark";

export function isTheme(value) {
  return value === "dark" || value === "light";
}

/**
 * Stored choice wins, then the OS preference, then the brand default (dark).
 * `prefersLight` is the result of matchMedia("(prefers-color-scheme: light)").
 */
export function resolveTheme(stored, prefersLight = false) {
  if (isTheme(stored)) return stored;
  return prefersLight ? "light" : DEFAULT_THEME;
}

export function nextTheme(current) {
  return current === "light" ? "dark" : "light";
}

/** Class the brand stylesheet uses to flip custom properties. */
export function themeClass(theme) {
  return isTheme(theme) && theme === "light" ? "theme-light" : "";
}

export function themeAttribute(theme) {
  return isTheme(theme) ? theme : DEFAULT_THEME;
}

export function themeLabel(theme) {
  return theme === "light" ? "Light" : "Dark";
}

export function toggleLabel(theme) {
  return theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
}
