/** Gallery theme helpers. Same contract as the templates' landing.js. */

export const THEME_KEY = "landing-kit:theme";

export function isTheme(value) {
  return value === "light" || value === "dark";
}

export function resolveTheme(stored, prefersLight = false) {
  if (isTheme(stored)) return stored;
  return prefersLight ? "light" : "dark";
}

export function nextTheme(current) {
  return current === "light" ? "dark" : "light";
}

export function themeClass(theme) {
  return theme === "light" ? "theme-light" : "";
}

export function themeAttribute(theme) {
  return isTheme(theme) ? theme : "dark";
}

export function toggleLabel(theme) {
  return theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
}
