// Landing Kit gallery — the switcher page.
// Template metadata, palettes and the framework all come from ../src; this file
// renders the gallery, scales the live iframes and handles the preview mode.
import { TEMPLATES, SECTIONS, coverage, omitted, validateAll, sectionName } from "../src/framework.js";
import { PALETTES, paletteAudit, PALETTE_TOKENS } from "../src/palettes.js";
import { resolveTheme, nextTheme, themeAttribute, toggleLabel } from "../src/theme.js";

const $ = A.$, $$ = A.$$, el = A.el;

const state = { theme: resolveTheme(A.store.get("theme", null), false) };
const validation = validateAll();
const SUN_ICON = document.getElementById("theme-icon")?.innerHTML || "";
const MOON_ICON = '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>';

function minRatio(id, mode) {
  return paletteAudit(id, mode).reduce((min, pair) => Math.min(min, pair.ratio), Infinity);
}
function fmtRatio(value) {
  return `${value.toFixed(1)}:1`;
}

/* ---------------------------------------------------------------- iframes */

// Each thumbnail is a 1440x900 iframe scaled to the width of its frame. Doing it
// in JS rather than a CSS constant keeps the thumbnails correct at every breakpoint.
function fitPreviews() {
  $$(".thumb-frame").forEach((frame) => {
    const iframe = frame.querySelector("iframe");
    if (!iframe) return;
    const scale = frame.clientWidth / 1440;
    iframe.style.width = "1440px";
    iframe.style.height = "900px";
    iframe.style.transform = `scale(${scale})`;
  });
}

function previewSrc(template) {
  return `templates/${template.id}.html?embed=1`;
}

/* ---------------------------------------------------------------- cards */

function templateCard(template) {
  const colors = PALETTES[template.palette];
  const dots = ["bg", "surface", "accent", "tint"].map((token) =>
    el("i", { style: `background:${colors[template.mode][token]}` }));
  const score = minRatio(template.palette, template.mode);
  const missing = omitted(template);
  return el("a", {
    class: "template-card", href: `templates/${template.id}.html`,
    target: "_blank", rel: "noopener", "aria-label": `Open the ${template.name} template`,
  },
    el("div", { class: "thumb-frame template-thumb" },
      el("iframe", { "data-preview": template.id, title: `${template.name} template preview`, loading: "eager", tabindex: "-1", src: previewSrc(template) })),
    el("div", { class: "template-body" },
      el("div", { class: "template-top" },
        el("h3", { text: template.name }),
        el("span", { class: "spacer", style: "flex:1" }),
        el("span", { class: "template-vertical", text: template.vertical })),
      el("p", { text: template.pitch }),
      el("div", { class: "template-meta" },
        el("span", { class: "palette-dots" }, ...dots),
        el("span", { class: "section-count", text: missing.length ? `${template.sections.length} sections · omits ${missing.map(sectionName).join(", ")}` : `${template.sections.length} sections` }),
        el("span", { class: "contrast", text: `min ${fmtRatio(score)}` }))));
}

function renderCards() {
  const grid = $("#template-grid");
  grid.innerHTML = "";
  TEMPLATES.forEach((template) => grid.append(templateCard(template)));
  fitPreviews();
}

/* ---------------------------------------------------------------- framework */

function renderFramework() {
  const body = $("#framework-body");
  body.innerHTML = "";
  coverage().forEach((section, index) => {
    const dots = el("span", { class: "used-dots" });
    TEMPLATES.forEach((template) => {
      dots.append(el("i", {
        class: template.sections.includes(section.id) ? "on" : "",
        title: template.name,
      }));
    });
    const used = el("div", { class: "row", style: "gap:8px" },
      dots,
      el("span", { class: "small muted", text: `${section.usedBy.length}/6` }));
    body.append(el("tr", {},
      el("td", { class: "f-num", text: String(index + 1).padStart(2, "0") }),
      el("td", { class: "f-name", text: section.name }),
      el("td", { class: "f-job", text: section.job }),
      el("td", { class: "f-mistake", text: section.mistake }),
      el("td", { class: "f-used" }, used)));
  });
}

/* ---------------------------------------------------------------- palettes */

function renderPalettes() {
  const host = $("#palette-list");
  host.innerHTML = "";
  TEMPLATES.forEach((template) => {
    const light = PALETTES[template.palette].light;
    const dark = PALETTES[template.palette].dark;
    const swatchRow = (colors) => el("span", { class: "p-swatches" },
      ...["bg", "accent", "tint", "text"].map((token) => el("i", { style: `background:${colors[token]}`, title: `${token} ${colors[token]}` })));
    host.append(el("div", { class: "palette-row" },
      el("span", { class: "p-name", text: `${template.name}` }),
      el("span", { class: "p-mode", text: "light" }), swatchRow(light),
      el("span", { class: "p-mode", text: "dark" }), swatchRow(dark),
      el("span", { class: "p-score", text: `min ${fmtRatio(Math.min(minRatio(template.palette, "light"), minRatio(template.palette, "dark")))}` })));
  });
}

/* ---------------------------------------------------------------- theme */

function applyTheme(theme, persist = true) {
  state.theme = theme;
  document.documentElement.classList.toggle("theme-light", theme === "light");
  document.documentElement.dataset.theme = themeAttribute(theme);
  const toggle = $("#theme-toggle");
  toggle.setAttribute("aria-label", toggleLabel(theme));
  $("#theme-icon").innerHTML = theme === "light" ? MOON_ICON : SUN_ICON;
  if (persist) A.store.set("theme", theme);
}

$("#theme-toggle").addEventListener("click", () => applyTheme(nextTheme(state.theme)));

/* ---------------------------------------------------------------- preview mode
   Used for the second screenshot and for deep-linking one template:
   index.html#/view/agency shows the real page edge to edge in an iframe. */

let previewShell = null;

function showPreview(id) {
  const template = TEMPLATES.find((item) => item.id === id);
  if (!template) return false;
  document.body.classList.add("preview-mode");
  if (!previewShell) {
    previewShell = el("div", { class: "preview-shell" },
      el("iframe", { title: `${template.name} template`, src: previewSrc(template) }));
    document.body.append(previewShell);
    const back = el("a", { class: "preview-return", href: "#templates", text: "← Back to the gallery" });
    previewShell.append(back);
  }
  return true;
}

function hidePreview() {
  document.body.classList.remove("preview-mode");
  if (previewShell) { previewShell.remove(); previewShell = null; }
}

function handleRoute() {
  const match = /^#\/view\/([a-z0-9-]+)$/.exec(location.hash);
  if (match) { showPreview(match[1]); return; }
  hidePreview();
}

window.addEventListener("hashchange", handleRoute);

/* ---------------------------------------------------------------- boot */

applyTheme(state.theme, false);

const heroIframe = $(".hero-frame iframe");
if (heroIframe) heroIframe.src = previewSrc(TEMPLATES.find((template) => template.id === "saas"));

if (validation.length) {
  // The build fails on this too; surfacing it in the gallery makes the failure visible.
  const banner = el("div", { class: "card", style: "border-color:var(--red);margin-bottom:18px" },
    el("strong", { text: "Template validation failed" }),
    el("p", { class: "mb-0 small muted", text: validation.join(" · ") }));
  $(".lk-main").prepend(banner);
}

renderCards();
renderFramework();
renderPalettes();
handleRoute();
window.addEventListener("resize", fitPreviews);
window.addEventListener("load", fitPreviews);
setTimeout(fitPreviews, 60);
