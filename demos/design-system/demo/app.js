// Arvion UI — documentation site.
// Rendering only: tokens, contrast maths, the component registry and search all
// come from ../src, which is the same code the test suite imports.
import {
  THEMES, PRIMITIVES, TYPE_SCALE, SPACING, RADIUS, ELEVATION, MOTION,
  BREAKPOINTS, A11Y_PAIRS, TOKEN_GROUPS, FONTS, themeCSS,
} from "../src/tokens.js";
import { auditBothThemes, tokenPairRatio, themeTokenRows } from "../src/audit.js";
import { contrastRatio, grade } from "../src/contrast.js";
import { COMPONENTS, COMPONENT_GROUPS, componentSearchRecords, getComponent, componentsByGroup } from "../src/components.js";
import { search, matchRanges } from "../src/search.js";
import { resolveTheme, nextTheme, themeAttribute, themeLabel, toggleLabel } from "../src/theme.js";

const $ = A.$, $$ = A.$$, el = A.el;

/* --------------------------------------------------------------- icons */

const PATHS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  check: '<path d="m5 12 4.5 4.5L19 7"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  play: '<path d="M8 5.5v13l11-6.5-11-6.5Z"/>',
};

function icon(name, size = 15) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`;
}

/* --------------------------------------------------------------- state */

const prefersLight = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)").matches : false;
const prefersReduced = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;
const state = {
  theme: resolveTheme(A.store.get("theme", null), prefersLight),
  preview: "dark",
  cursor: -1,
};

const AUDIT = auditBothThemes();
const SEARCH_INDEX = [
  ...componentSearchRecords(),
  ...TOKEN_GROUPS.map((group) => ({
    id: `token-${group.id}`,
    type: "page",
    title: group.name,
    subtitle: "Foundations",
    text: group.description,
    tags: [group.id, "tokens", "foundation"],
    href: `#/tokens/${group.id}`,
  })),
  {
    id: "overview", type: "page", title: "Overview", subtitle: "Getting started",
    text: "What Arvion UI is, the token layers, install and the component count.",
    tags: ["start", "index", "readme"], href: "#/",
  },
  {
    id: "accessibility", type: "page", title: "Accessibility", subtitle: "Getting started",
    text: "Contrast audit, focus order, keyboard support, reduced motion and screen reader notes.",
    tags: ["a11y", "contrast", "wcag", "focus"], href: "#/accessibility",
  },
  {
    id: "theming", type: "page", title: "Theming", subtitle: "Getting started",
    text: "Primitive, semantic and component layers. Generate the CSS, switch with a class.",
    tags: ["theme", "css", "dark", "light"], href: "#/theming",
  },
];

/* --------------------------------------------------------------- utilities */

function escapeHTML(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Just enough highlighting to make snippets scannable. */
function highlightHTML(code) {
  let out = escapeHTML(code);
  out = out.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tok-c">$1</span>');
  // One pass over each tag: highlight the element name, then its attributes
  // inside the same replacement so the inserted span markup is never re-scanned.
  out = out.replace(/(&lt;\/?)([a-zA-Z][\w-]*)([^<>]*?)(&gt;)/g, (match, open, name, attrs, close) => {
    const highlighted = attrs.replace(/([a-zA-Z-]+)=("[^"]*")/g, '<span class="tok-n">$1</span>=<span class="tok-s">$2</span>');
    return `${open}<span class="tok-k">${name}</span>${highlighted}${close}`;
  });
  return out;
}

function legacyCopy(text, done) {
  const area = el("textarea", { style: "position:fixed;left:-9999px;top:0", "aria-hidden": "true" });
  area.value = text;
  document.body.append(area);
  area.select();
  try { document.execCommand("copy"); done(); } catch { A.toast("Copy is blocked in this browser", "error"); }
  area.remove();
}

function copyText(text, message) {
  const done = () => A.toast(message, "success");
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done).catch(() => legacyCopy(text, done));
  } else {
    legacyCopy(text, done);
  }
}

function codeBlock(code, { language = "html", label = "" } = {}) {
  const body = language === "html" ? highlightHTML(code) : escapeHTML(code);
  const pre = el("pre", { class: "code" });
  pre.innerHTML = `<code>${body}</code>`;
  const button = el("button", { class: "copy-btn", type: "button", onclick: () => copyText(code, "Copied to clipboard") });
  button.innerHTML = `${icon("copy", 12)}<span>Copy</span>`;
  return el("div", { class: "code-wrap" }, pre, button, label ? el("span", { class: "sr-only", text: label }) : null);
}

function ratioBadge(ratio, use = "text") {
  const result = grade(ratio, use);
  const tone = result.passes ? "green" : ratio >= 3 ? "gold" : "red";
  return el("span", { class: `badge ${tone}`, text: result.level });
}

function crumb(trail) {
  const parts = [];
  trail.forEach((item, i) => {
    if (i) parts.push(el("span", { "aria-hidden": "true", text: "/" }));
    parts.push(item.href && i < trail.length - 1
      ? el("a", { href: item.href, text: item.label })
      : el("span", { "aria-current": i === trail.length - 1 ? "page" : null, text: item.label }));
  });
  return el("nav", { class: "crumb", "aria-label": "Breadcrumb" }, ...parts);
}

function viewHead({ eyebrow, title, lede, actions = [] }) {
  return el("div", { class: "view-head" },
    eyebrow ? el("div", { class: "eyebrow", text: eyebrow }) : null,
    el("h1", { text: title }),
    lede ? el("p", { class: "lede", text: lede }) : null,
    actions.length ? el("div", { class: "head-actions" }, ...actions) : null);
}

function sectionHead(title, description, link) {
  return el("div", { class: "section-head" },
    el("h2", { text: title }),
    description ? el("p", { text: description }) : null,
    link ? el("a", { class: "right small", href: link.href, text: link.label }) : null);
}

function docsFooter() {
  return el("footer", { class: "docs-footer" },
    el("span", { text: `Arvion UI v1.0.0 · ${COMPONENTS.length} components · ${AUDIT.summary.total} contrast checks` }),
    el("span", { class: "spacer", style: "flex:1" }),
    el("a", { href: "https://arviontech.net", target: "_blank", rel: "noopener", text: "Arvion Technologies" }),
    el("a", { href: "https://github.com/arvion-technology/design-system", target: "_blank", rel: "noopener", text: "Source" }),
    el("a", { href: "https://github.com/arvion-technology/design-system/blob/main/LICENSE", target: "_blank", rel: "noopener", text: "MIT" }));
}

function statCard(label, value, sub, tone = "gold") {
  return el("div", { class: "card stat-card" },
    el("div", { class: "stat" },
      el("div", { class: "stat-label", text: label }),
      el("div", { class: `stat-value ${tone}`, text: value }),
      el("div", { class: "small muted", text: sub })));
}

/* --------------------------------------------------------------- overview */

function heroPanel() {
  const panel = el("div", { class: "hero-panel" });
  panel.innerHTML = `
    <span class="badge green hero-chip"><span class="dot pulse"></span> escrow held</span>
    <div class="hero-app">
      <div class="hero-app-bar">
        <span class="traffic"><i></i><i></i><i></i></span>
        <span class="mono">job #GK-2481</span>
        <span class="spacer"></span>
        <span>Arvion UI</span>
      </div>
      <div class="hero-app-body">
        <div class="hero-worker">
          <span class="avatar lg">SG</span>
          <div>
            <div class="name">Sita Gurung</div>
            <div class="role">Verified plumber · Baneshwor</div>
          </div>
          <span class="spacer"></span>
          <span class="badge green">KYC verified</span>
        </div>
        <div class="hero-job">
          <div class="row"><span class="title">Kitchen tap replacement</span><span class="spacer"></span><span class="badge gold">matched</span></div>
          <div class="meta"><span>Today, 2:30 PM</span><span class="mono">NPR 2,400</span></div>
          <div class="progress" role="progressbar" aria-valuenow="66" aria-valuemin="0" aria-valuemax="100" aria-label="Job progress"><i style="width:66%"></i></div>
          <div class="row" style="gap:6px">
            <button class="btn primary sm">Mark complete</button>
            <button class="btn sm">Message</button>
          </div>
        </div>
        <div class="hero-strip">
          <div class="tile"><b>2.4k</b>Jobs this month</div>
          <div class="tile"><b>4.9</b>Average rating</div>
          <div class="tile"><b>18</b>Disputes closed</div>
        </div>
      </div>
    </div>`;
  return panel;
}

function overviewPage(main) {
  main.append(el("section", { class: "hero" },
    el("div", {},
      el("div", { class: "eyebrow", text: "Open-source design system · v1.0.0" }),
      el("h1", {}, "Interfaces with a ", el("em", { text: "receipt." })),
      el("p", { class: "lede", text: "Arvion UI is the component layer behind our client work. Thirty components, two themes, and contrast ratios computed by the same functions that run in the test suite. Small on purpose: you can read every token and every snippet in an afternoon." }),
      el("div", { class: "head-actions" },
        el("a", { class: "btn primary", href: "#/components", text: "Browse 30 components" }),
        el("a", { class: "btn", href: "#/tokens/color", text: "Read the tokens" })),
      el("div", { class: "hero-meta" },
        el("span", {}, el("b", { text: "57" }), " tests"),
        el("span", { class: "sep" }),
        el("span", {}, el("b", { text: String(AUDIT.summary.total) }), " contrast checks"),
        el("span", { class: "sep" }),
        el("span", {}, el("b", { text: "0" }), " runtime dependencies"),
        el("span", { class: "sep" }),
        el("span", { text: "MIT licensed" }))),
    heroPanel()));

  main.append(el("div", { class: "stat-row" },
    statCard("Components", String(COMPONENTS.length), "Six groups, all documented"),
    statCard("Semantic tokens", String(themeTokenRows("dark").length), "Resolved in both themes"),
    statCard("Contrast pairs", String(A11Y_PAIRS.length), "22 checks across both themes", "blue"),
    statCard("Runtime dependencies", "0", "ES modules and CSS only", "green")));

  const swatches = ["bg", "surface", "accent", "blue", "green", "red", "purple"];
  const spaceBars = SPACING.slice(0, 7).map((s) =>
    el("i", { style: `height:${4 + Math.round((s.px / 40) * 44)}px`, title: `${s.token} · ${s.px}px` }));

  main.append(sectionHead("Foundations", "The parts every component reads.", { href: "#/tokens/color", label: "All foundations →" }));
  main.append(el("div", { class: "foundation-grid" },
    el("a", { class: "card foundation-card", href: "#/tokens/color" },
      el("div", { class: "fc-head" }, el("h3", { text: "Color" }), el("span", { class: "spacer" }), el("span", { class: "badge", text: "29 roles" })),
      el("div", { class: "swatch-strip" }, ...swatches.map((token) => el("i", { style: `background:${THEMES[state.theme][token].value}` }))),
      el("div", { class: "fc-foot", text: "Primitive ramps, semantic roles, computed ratios." })),
    el("a", { class: "card foundation-card", href: "#/tokens/type" },
      el("div", { class: "fc-head" }, el("h3", { text: "Typography" }), el("span", { class: "spacer" }), el("span", { class: "badge", text: "11 steps" })),
      el("div", { class: "type-samples" }, el("span", { class: "big", text: "Ag" }), el("span", { class: "mid", text: "Kathmandu runs on trust" })),
      el("div", { class: "fc-foot", text: "Poppins for headings, Inter for everything else." })),
    el("a", { class: "card foundation-card", href: "#/tokens/spacing" },
      el("div", { class: "fc-head" }, el("h3", { text: "Spacing" }), el("span", { class: "spacer" }), el("span", { class: "badge", text: "4px base" })),
      el("div", { class: "space-bars" }, ...spaceBars),
      el("div", { class: "fc-foot", text: "Ten steps. No arbitrary pixel values." }))));

  const features = [
    { id: "button", demo: () => el("div", { class: "row" }, el("button", { class: "btn primary sm", text: "Book now" }), el("button", { class: "btn sm", text: "Save" })) },
    { id: "badge", demo: () => el("div", { class: "row" }, el("span", { class: "badge green", text: "paid" }), el("span", { class: "badge gold", text: "escrow" }), el("span", { class: "badge red", text: "disputed" })) },
    { id: "stat", demo: () => el("div", { class: "stat" }, el("div", { class: "stat-label", text: "Completion rate" }), el("div", { class: "row", style: "align-items:baseline;gap:8px" }, el("div", { class: "stat-value gold", style: "font-size:24px", text: "94.2%" }), el("span", { class: "stat-delta up", text: "▲ 3.1%" }))) },
  ];
  main.append(sectionHead("Featured components", "Each card is rendered from the registry, not screenshotted.", { href: "#/components", label: "Browse all →" }));
  main.append(el("div", { class: "feature-grid" }, ...features.map(({ id, demo }) => {
    const component = getComponent(id);
    return el("a", { class: "card feature-card", href: `#/components/${id}` },
      el("div", { class: "fc-top" }, el("h3", { text: component.name }), el("span", { class: "spacer" }), el("span", { class: "badge", text: component.group })),
      el("p", { text: component.summary }),
      el("div", { class: "feature-demo" }, demo()));
  })));

  main.append(sectionHead("Use it without a package manager", "No install, no build, no CDN. Clone it and generate the token CSS."));
  main.append(codeBlock(`git clone https://github.com/arvion-technology/design-system.git
cd design-system
node -e "import('./src/tokens.js').then(m => process.stdout.write(m.themeCSS()))" > tokens.css
npm test`, { language: "bash" }));
  main.append(el("p", { class: "small muted mt-2", text: "The generator emits the semantic layer for both themes; the component CSS is a stylesheet you can copy and audit line by line." }));

  main.append(docsFooter());
}

/* --------------------------------------------------------------- color tokens */

function tokenTable(theme) {
  const rows = themeTokenRows(theme);
  const surface = THEMES[theme].surface.value;
  const bg = THEMES[theme].bg.value;
  return A.dataTable({
    columns: [
      {
        key: "key", label: "Token", render: (row) => el("div", { class: "swatch-cell" },
          el("span", { class: "swatch" }, el("i", { style: `background:${row.value}` })),
          el("div", {}, el("div", { class: "strong", text: row.key }), el("div", { class: "token-var", text: row.cssVar }))),
      },
      { key: "value", label: "Value", render: (row) => el("span", { class: "mono small", text: row.value }) },
      {
        key: "onSurface", label: "On card", align: "right",
        render: (row) => {
          const ratio = contrastRatio(row.value, surface);
          return el("div", { class: "row", style: "justify-content:flex-end;gap:6px" }, el("span", { class: "ratio-cell", text: `${ratio.toFixed(2)}:1` }), ratioBadge(ratio));
        },
      },
      {
        key: "onPage", label: "On page", align: "right",
        render: (row) => {
          const ratio = contrastRatio(row.value, bg);
          return el("span", { class: "ratio-cell", text: `${ratio.toFixed(2)}:1` });
        },
      },
      { key: "description", label: "Usage", render: (row) => el("span", { class: "usage-cell", text: row.description }) },
    ],
    rows,
  });
}

function primitives() {
  return el("div", { class: "ramp-wrap" },
    ...Object.entries(PRIMITIVES).map(([name, ramp]) => el("div", { class: "ramp-row" },
      el("span", { class: "ramp-label", text: name }),
      el("div", { class: "ramp" }, ...ramp.map(([token, hex]) => el("span", {
        class: "ramp-chip", title: `${token} ${hex}`, style: `background:${hex}`,
      }, el("span", { text: token.replace(`${name}-`, "") })))))));
}

function colorPage(main) {
  main.append(crumb([{ label: "Foundations", href: "#/tokens/color" }, { label: "Color" }]));
  main.append(viewHead({
    eyebrow: "Foundations · Color",
    title: "Color",
    lede: `Two layers. Primitives are the raw ramps; semantic roles are the only thing components may read. Every ratio below is computed in the browser from the token values for the ${state.theme} theme.`,
    actions: [el("span", { class: "badge gold", text: `viewing: ${state.theme}` })],
  }));

  main.append(el("div", { class: "alert info", role: "status" },
    el("span", { html: `<strong>One deliberate change.</strong> The brand blue <code>#3a7bff</code> gives a 13px white label only 3.84:1. The action fill is therefore <code>#2f66e0</code> (5.12:1); the brand hue survives in charts and tints.` })));

  main.append(sectionHead("Semantic roles", "What components consume. Ratios are foreground against the two backgrounds in use."));
  main.append(tokenTable(state.theme));

  main.append(sectionHead("Primitive ramps", "Never referenced by a component. They exist so the semantic layer has somewhere to come from."));
  main.append(primitives());

  main.append(el("div", { class: "card flat pad-sm mt-2" },
    el("div", { class: "row" },
      el("span", { class: "badge", text: "note" }),
      el("span", { class: "small muted", text: "A translucent value such as line or focus is composited over the surface before its ratio is measured, because a ratio only exists relative to a background." }))));
  main.append(docsFooter());
}

/* --------------------------------------------------------------- typography */

function typePage(main) {
  main.append(crumb([{ label: "Foundations", href: "#/tokens/color" }, { label: "Typography" }]));
  main.append(viewHead({
    eyebrow: "Foundations · Typography",
    title: "Typography",
    lede: "Eleven steps, two families, fixed line heights. Poppins carries headings and numbers because its figures stay open at display sizes; Inter carries everything that has to be read in a sentence.",
  }));

  const specimen = "Kathmandu runs on trust";
  const rows = TYPE_SCALE.map((step) => el("div", { class: "type-row" },
    el("div", { class: "type-meta" },
      el("span", { class: "t-name", text: step.name }),
      el("span", { class: "t-spec", text: `${step.size}px / ${step.lineHeight} · ${step.weight} · ${step.tracking}` }),
      el("span", { class: "t-use", text: step.usage })),
    el("div", {
      class: "type-sample" + (step.name === "code" ? " mono" : ""),
      style: `font-size:${step.size}px;line-height:${step.lineHeight};font-weight:${step.weight};letter-spacing:${step.tracking};${step.name === "overline" ? "text-transform:uppercase" : ""}`,
      text: step.name === "code" ? "await repo.book(serviceId)" : specimen,
    })));
  main.append(el("div", { class: "card", style: "padding:8px 22px" }, ...rows));

  main.append(el("div", { class: "type-fonts" },
    ...Object.entries(FONTS).map(([key, font]) => el("div", { class: "card font-card" },
      el("div", { class: "fc-aa", style: `font-family:${font.stack}`, text: key === "mono" ? "01" : "Aa" }),
      el("div", { class: "fc-name", text: key === "sans" ? "Inter" : key === "display" ? "Poppins" : "System mono" }),
      el("div", { class: "fc-role", text: font.role }),
      el("div", { class: "fc-stack", text: font.stack })))));

  main.append(el("div", { class: "alert", role: "status", style: "margin-top:20px" },
    el("span", { html: "Line heights are part of the token, not a per-component decision. A card title and a table cell use the same <code>h4</code> and <code>small</code> steps, so vertical rhythm is inherited rather than re-tuned." })));
  main.append(docsFooter());
}

/* --------------------------------------------------------------- spacing */

function spacingPage(main) {
  main.append(crumb([{ label: "Foundations", href: "#/tokens/color" }, { label: "Spacing" }]));
  main.append(viewHead({
    eyebrow: "Foundations · Spacing",
    title: "Spacing",
    lede: "A 4px base scale with ten steps. If a layout needs 18px, the layout is wrong — pick 16 and let the scale do the alignment work.",
  }));
  main.append(el("div", { class: "card", style: "padding:10px 22px" },
    ...SPACING.map((step) => el("div", { class: "space-row" },
      el("span", { class: "sp-token", text: `space-${step.token}` }),
      el("span", { class: "sp-val", text: `${step.px}px` }),
      el("div", {}, el("div", { class: "sp-bar", style: `width:${Math.max(2, step.px * 4)}px` }), el("div", { class: "sp-use", text: step.usage }))))));

  main.append(sectionHead("Breakpoints", "Five fixed widths. The docs sidebar collapses at 900px, before the content gets uncomfortable."));
  main.append(A.dataTable({
    columns: [
      { key: "token", label: "Token", render: (r) => el("span", { class: "mono", text: `breakpoint-${r.token}` }) },
      { key: "px", label: "Min width", align: "right", render: (r) => el("span", { class: "mono", text: `${r.px}px` }) },
      { key: "usage", label: "Used for" },
    ],
    rows: BREAKPOINTS,
  }));
  main.append(docsFooter());
}

/* --------------------------------------------------------------- radius / elevation */

function radiusPage(main) {
  main.append(crumb([{ label: "Foundations", href: "#/tokens/color" }, { label: "Radius and elevation" }]));
  main.append(viewHead({
    eyebrow: "Foundations · Radius and elevation",
    title: "Radius and elevation",
    lede: "Five radii and three shadows. A surface gets one or the other, never both, and a card on the page background is flat rather than shadowed.",
  }));

  main.append(el("div", { class: "radius-grid" },
    ...RADIUS.map((radius) => el("div", { class: "card radius-card" },
      el("div", { class: "radius-demo", style: `border-radius:${radius.px}px` }),
      el("div", { class: "r-meta" }, el("span", { text: radius.token }), el("span", { text: `${radius.px}px` })),
      el("div", { class: "small muted", text: radius.usage })))));

  main.append(sectionHead("Elevation", "Shadows are tinted navy, not black, so they sit on the page instead of punching a hole in it."));
  main.append(el("div", { class: "elev-grid" },
    ...ELEVATION.map((elevation) => el("div", { class: "card elev-card" },
      el("div", { class: "elev-demo", style: `box-shadow:${elevation.value}` }),
      el("div", { class: "row" }, el("strong", { class: "small", text: elevation.token }), el("span", { class: "spacer" }), el("span", { class: "small muted", text: elevation.usage })),
      el("div", { class: "e-meta", text: elevation.value })))));
  main.append(docsFooter());
}

/* --------------------------------------------------------------- motion */

function describeEasing(token) {
  switch (token) {
    case "standard": return "Default for hover, focus and menus. Leaves quickly, arrives softly.";
    case "entrance": return "Panels, modals and toasts entering the screen. No bounce on entry.";
    case "exit": return "Anything leaving. Accelerates away so the wait feels shorter.";
    default: return "A small overshoot. Reserved for confirmations, never for scrolling.";
  }
}

function motionPage(main) {
  main.append(crumb([{ label: "Foundations", href: "#/tokens/color" }, { label: "Motion" }]));
  main.append(viewHead({
    eyebrow: "Foundations · Motion",
    title: "Motion",
    lede: "Four durations, four curves. Motion explains a change in state; it does not decorate the page. Every recipe below collapses to an instant state change when the operating system asks for reduced motion.",
  }));

  main.append(el("div", { class: "alert", role: "status" },
    el("span", { html: `Your browser reports <code>prefers-reduced-motion: ${prefersReduced ? "reduce" : "no-preference"}</code>. The stylesheet respects it globally, and this page checks it before starting any demo.` })));

  main.append(sectionHead("Durations", "Play a dot across the track at each duration."));
  const durationGrid = el("div", { class: "motion-grid" });
  for (const duration of MOTION.durations) {
    if (!duration.ms) continue;
    const dot = el("span", { class: "motion-dot" });
    const track = el("div", { class: "motion-track" }, dot);
    durationGrid.append(el("div", { class: "card motion-card" },
      el("div", { class: "mc-head" }, el("h3", { text: duration.token }), el("span", { class: "spacer" }), el("code", { text: `${duration.ms}ms` })),
      track,
      el("div", { class: "row mt-1" },
        el("button", { class: "btn sm", type: "button", onclick: () => {
          if (prefersReduced) { dot.style.left = "calc(100% - 32px)"; return; }
          dot.classList.remove("run"); void dot.offsetWidth;
          dot.style.animationDuration = `${duration.ms}ms`; dot.classList.add("run");
        } }, icon("play", 12), "Play"),
        el("span", { class: "small muted", text: duration.usage }))));
  }
  main.append(durationGrid);

  main.append(sectionHead("Easings", "The curve matters more than the duration."));
  const easingGrid = el("div", { class: "motion-grid" });
  for (const easing of MOTION.easings) {
    const dot = el("span", { class: "motion-dot" });
    const track = el("div", { class: "motion-track" }, dot);
    easingGrid.append(el("div", { class: "card motion-card" },
      el("div", { class: "mc-head" }, el("h3", { text: easing.token }), el("span", { class: "spacer" }), el("code", { text: easing.value })),
      track,
      el("div", { class: "row mt-1" },
        el("button", { class: "btn sm", type: "button", onclick: () => {
          if (prefersReduced) { dot.style.left = "calc(100% - 32px)"; return; }
          dot.classList.remove("run"); void dot.offsetWidth;
          dot.style.setProperty("--ease-custom", easing.value);
          dot.style.animationDuration = "900ms"; dot.classList.add("run");
        } }, icon("play", 12), "Play"),
        el("span", { class: "small muted", text: easing.usage })),
      el("div", { class: "small muted mt-1", text: describeEasing(easing.token) })));
  }
  main.append(easingGrid);

  main.append(sectionHead("Reduced motion", "The fallback is not a shorter animation. It is no animation."));
  main.append(codeBlock(`@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}`, { language: "css" }));
  main.append(docsFooter());
}

/* --------------------------------------------------------------- components index */

function componentsIndexPage(main, params) {
  const active = params.get("g") || "all";
  const group = COMPONENT_GROUPS.find((g) => g.id === active);
  main.append(crumb([{ label: "Components" }]));
  main.append(viewHead({
    eyebrow: "Components",
    title: group ? group.name : "Components",
    lede: `${COMPONENTS.length} components in six groups. Every preview on a detail page is rendered from the snippet you copy, so the documentation cannot drift from the demonstration.`,
    actions: [el("a", { class: "btn sm", href: "#/accessibility", text: "Contrast audit" })],
  }));

  main.append(el("div", { class: "chips", role: "navigation", "aria-label": "Component groups" },
    el("a", { class: `chip ${active === "all" ? "active" : ""}`, href: "#/components", text: `All ${COMPONENTS.length}` }),
    ...COMPONENT_GROUPS.map((item) => el("a", {
      class: `chip ${active === item.id ? "active" : ""}`,
      href: `#/components?g=${item.id}`,
      text: `${item.name} ${componentsByGroup(item.id).length}`,
    }))));

  if (group) main.append(el("p", { class: "small muted", text: group.blurb }));

  const list = active === "all" ? COMPONENTS : COMPONENTS.filter((c) => c.group === active);
  const grid = el("div", { class: "component-grid" });
  for (const component of list) {
    grid.append(el("a", { class: "card component-card", href: `#/components/${component.id}` },
      el("div", { class: "cc-top" }, el("h3", { text: component.name }), el("span", { class: "spacer" }), el("span", { class: "badge", text: component.group })),
      el("p", { text: component.summary }),
      el("div", { class: "cc-foot" },
        el("span", { class: "badge green", text: "stable" }),
        el("span", { text: `${component.a11y.length} a11y notes` }),
        el("span", { class: "arrow", html: icon("arrow", 13) }))));
  }
  main.append(grid);
  main.append(docsFooter());
}

/* --------------------------------------------------------------- component detail */

function openDisputeModal() {
  const body = el("div", {},
    el("p", { text: "The escrow stays held until both sides respond. The typical resolution is two working days, and the worker keeps access to the job thread." }),
    el("label", { class: "field", for: "dispute-reason" }, el("span", { text: "What went wrong?" }),
      el("textarea", { class: "textarea", id: "dispute-reason", placeholder: "The tap still drips after the visit." })));
  A.modal({
    title: "Open a dispute",
    body,
    actions: [
      { label: "Keep the booking", onClick: () => A.toast("Dispute cancelled", "info") },
      { label: "Open dispute", kind: "primary", onClick: () => A.toast("Dispute opened. Both sides have been notified.", "error") },
    ],
  });
}

function previewStage(component) {
  const stage = el("div", { class: "preview-stage" });
  if (component.id === "modal") {
    stage.append(el("div", { class: "col", style: "align-items:center;gap:10px" },
      el("button", { class: "btn primary", type: "button", text: "Open dispute", onclick: () => openDisputeModal() }),
      el("span", { class: "small muted", text: "Esc closes the dialog and focus returns here." })));
    return stage;
  }
  stage.innerHTML = component.snippet;
  if (component.id === "toast") {
    stage.append(el("button", { class: "btn sm", type: "button", text: "Trigger a toast", onclick: () => A.toast("Booking confirmed. Worker arrives by 2:30 PM.", "success") }));
  }
  if (component.id === "tabs") {
    try { A.tabs(stage); } catch { /* illustrative markup only */ }
  }
  stage.querySelectorAll(".switch").forEach((node) => {
    node.addEventListener("click", () => node.setAttribute("aria-checked", node.getAttribute("aria-checked") === "true" ? "false" : "true"));
  });
  stage.querySelectorAll(".dropdown").forEach((dropdown) => {
    const trigger = dropdown.querySelector("[aria-haspopup]");
    const menu = dropdown.querySelector(".dropdown-menu");
    if (!trigger || !menu) return;
    trigger.addEventListener("click", () => {
      const open = menu.hidden;
      menu.hidden = !open;
      trigger.setAttribute("aria-expanded", String(open));
    });
    menu.querySelectorAll("button").forEach((item) => item.addEventListener("click", () => {
      A.toast(`“${item.textContent}” selected in the example`, "info");
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      trigger.focus();
    }));
  });
  const copyTrigger = stage.querySelector('[aria-label="Copy snippet"]');
  if (copyTrigger) copyTrigger.addEventListener("click", () => copyText(component.snippet, "Snippet copied"));
  return stage;
}

function componentPage(main, id) {
  const component = getComponent(id);
  if (!component) { notFoundPage(main, `No component named “${id}”.`); return; }
  const group = COMPONENT_GROUPS.find((g) => g.id === component.group);
  const siblings = componentsByGroup(component.group);
  const index = siblings.findIndex((c) => c.id === id);
  const prev = siblings[index - 1];
  const next = siblings[index + 1];

  main.append(crumb([
    { label: "Components", href: "#/components" },
    { label: group.name, href: `#/components?g=${group.id}` },
    { label: component.name },
  ]));
  main.append(el("div", { class: "detail-head" },
    el("div", {},
      el("div", { class: "eyebrow", text: `${group.name} · ${component.status}` }),
      el("h1", { text: component.name }),
      el("p", { class: "lede", text: component.summary })),
    el("span", { class: "spacer" }),
    el("a", { class: "btn sm", href: "#/components", text: "All components" })));

  const stage = previewStage(component);
  stage.classList.add("theme-" + state.preview);
  if (["table", "sidebar-nav", "breadcrumb", "tabs", "modal"].includes(component.id)) stage.classList.add("align-start");

  const themeButton = (theme) => el("button", {
    class: `btn sm ${state.preview === theme ? "primary" : "ghost"}`,
    type: "button",
    text: theme === "dark" ? "Dark" : "Light",
    onclick: (event) => {
      state.preview = theme;
      stage.classList.remove("theme-dark", "theme-light");
      stage.classList.add("theme-" + theme);
      const tools = event.currentTarget.closest(".preview-tools");
      tools.querySelectorAll("button").forEach((button) => { button.className = "btn sm ghost"; });
      event.currentTarget.className = "btn sm primary";
    },
  });

  const preview = el("div", { class: "preview" },
    el("div", { class: "preview-head" },
      el("span", { text: "Live preview" }),
      el("span", { class: "spacer" }),
      el("div", { class: "preview-tools" }, themeButton("dark"), themeButton("light"))),
    stage);

  const mainCol = el("div", {},
    preview,
    el("div", { style: "margin-top:18px" },
      sectionHead("HTML", "Copy this into a page that already loads the token stylesheet."),
      codeBlock(component.snippet)),
    el("div", { class: "card", style: "margin-top:18px" },
      el("div", { class: "card-head" }, el("h2", { style: "font-size:18px;margin:0", text: "Accessibility" }), el("span", { class: "spacer" }), el("span", { class: "badge green", text: `${component.a11y.length} checks` })),
      el("ul", { class: "a11y-list" }, ...component.a11y.map((note) => el("li", {},
        el("span", { class: "check", html: icon("check", 11) }),
        el("span", { text: note }))))),
    component.notes.length ? el("div", { style: "margin-top:18px" },
      sectionHead("Usage", "Where this component earns its place, and where it does not."),
      el("ul", { class: "usage-list" }, ...component.notes.map((note) => el("li", { text: note })))) : null);

  const related = siblings.filter((c) => c.id !== id).slice(0, 3);
  const side = el("aside", { class: "detail-side" },
    el("div", { class: "card side-card" },
      el("h3", { text: "At a glance" }),
      el("dl", { class: "kv" },
        el("dt", { text: "Group" }), el("dd", { text: group.name }),
        el("dt", { text: "Status" }), el("dd", { text: component.status }),
        el("dt", { text: "Since" }), el("dd", { text: "1.0.0" }),
        el("dt", { text: "A11y notes" }), el("dd", { text: String(component.a11y.length) }))),
    el("div", { class: "card side-card" },
      el("h3", { text: `More in ${group.name}` }),
      el("div", { class: "col", style: "gap:6px" },
        ...related.map((item) => el("a", { class: "small", href: `#/components/${item.id}`, text: item.name })))),
    el("div", { class: "card side-card" },
      el("h3", { text: "Search terms" }),
      el("div", { class: "row wrap", style: "gap:6px" },
        ...component.keywords.map((keyword) => el("span", { class: "tag", text: keyword })))));

  main.append(el("div", { class: "detail-grid" }, mainCol, side));

  const pager = el("div", { class: "pager" });
  if (prev) pager.append(el("a", { href: `#/components/${prev.id}` }, el("span", { class: "p-label", text: "Previous" }), el("span", { text: prev.name })));
  if (next) pager.append(el("a", { href: `#/components/${next.id}`, style: "text-align:right" }, el("span", { class: "p-label", text: "Next" }), el("span", { text: next.name })));
  main.append(pager);
  main.append(docsFooter());
}

/* --------------------------------------------------------------- accessibility */

function accessibilityPage(main) {
  main.append(crumb([{ label: "Getting started", href: "#/" }, { label: "Accessibility" }]));
  main.append(viewHead({
    eyebrow: "Getting started · Accessibility",
    title: "Accessibility",
    lede: "The system does not claim to be accessible because a checklist says so. It ships a fixed set of contrast promises, computes every one of them at load time, and fails the test suite if a token change breaks one.",
  }));

  main.append(el("div", { class: "summary-banner" },
    el("div", { class: "big", text: `${AUDIT.summary.passing} / ${AUDIT.summary.total}` }),
    el("div", {},
      el("p", { text: "Promised pairs passing their declared threshold, across both themes." }),
      el("p", { class: "small muted mb-0", text: `${A11Y_PAIRS.length} pairs per theme. Normal text requires 4.5:1, large text and UI 3:1.` }))));

  for (const theme of ["dark", "light"]) {
    const rows = AUDIT[theme];
    main.append(el("section", { class: "a11y-theme-block" },
      el("h2", {}, `${themeLabel(theme)} theme`, el("span", { class: "pass-pill", text: `${rows.filter((r) => r.passes).length}/${rows.length} pass` })),
      A.dataTable({
        columns: [
          { key: "label", label: "Pair" },
          {
            key: "sample", label: "Sample", render: (row) => el("span", {
              class: "pair-preview",
              style: `color:${row.fg};background:${row.bg};border:1px solid rgba(127,127,127,.35)`,
              text: "Aa sample",
            }),
          },
          { key: "fg", label: "Foreground", render: (row) => el("span", { class: "mono small", text: row.fg }) },
          { key: "bg", label: "Background", render: (row) => el("span", { class: "mono small", text: row.bg }) },
          { key: "ratio", label: "Ratio", align: "right", render: (row) => el("span", { class: "ratio-cell", text: row.ratioText }) },
          { key: "use", label: "Use", render: (row) => el("span", { class: "small muted", text: `${row.use} · ${row.threshold}:1` }) },
          {
            key: "result", label: "Result", align: "center",
            render: (row) => el("span", { class: `badge ${row.passes ? "green" : "red"}`, text: row.passes ? row.level : "Fail" }),
          },
        ],
        rows,
      })));
  }

  main.append(sectionHead("Keyboard and focus", "What is actually wired, not aspirational."));
  main.append(el("div", { class: "feature-grid" },
    el("div", { class: "card feature-card" },
      el("h3", { text: "Focus is never removed" }),
      el("p", { text: "Every interactive element shows the gold focus ring at 11.7:1 on the page background. The ring clears the 3:1 non-text threshold in both themes." })),
    el("div", { class: "card feature-card" },
      el("h3", { text: "Overlays return focus" }),
      el("p", { text: "Modal and dropdown demos move focus into the layer, close on Esc, and put focus back on the trigger that opened them." })),
    el("div", { class: "card feature-card" },
      el("h3", { text: "Reduced motion is global" }),
      el("p", { text: "One media query in the token stylesheet collapses animation and transition duration. This page also skips its own demo animations when the preference is set." }))));

  main.append(sectionHead("What this audit does not cover", "The honest list."));
  main.append(el("div", { class: "card" },
    el("ul", { class: "usage-list" },
      el("li", { text: "Screen-reader announcements. Contrast is measurable in code; an accessible name that makes sense in context is reviewed by a person." }),
      el("li", { text: "Focus order in a client product. The components do not know your DOM order." }),
      el("li", { text: "Cognitive load and reading level. Those are copy decisions, not token decisions." }),
      el("li", { text: "Colour blindness. The components do not use colour as the only carrier of meaning, but the audit cannot prove that for your composition." }))));

  main.append(codeBlock(`import { auditBothThemes } from "./src/audit.js";

const report = auditBothThemes();
console.log(report.summary);
// { total: 22, passing: 22, failing: 0, worst: { ... } }`, { language: "js" }));
  main.append(docsFooter());
}

/* --------------------------------------------------------------- theming */

function themingPage(main) {
  main.append(crumb([{ label: "Getting started", href: "#/" }, { label: "Theming" }]));
  main.append(viewHead({
    eyebrow: "Getting started · Theming",
    title: "Theming",
    lede: "One dark theme, one light theme, and a semantic layer in between. A component never knows which theme is active; it only reads roles that resolve differently.",
  }));

  const layers = [
    ["primitive", "Raw ramps and their hex values. The docs use them for reference; nothing in the component CSS references a primitive directly."],
    ["semantic", "Roles such as text, surface, accent-text and focus. This is the public API of the token package, and the layer the contrast audit checks."],
    ["component", "Component styles read only semantic custom properties. The button does not decide what gold is; it asks for accent."],
  ];
  main.append(el("div", { class: "card", style: "padding:6px 20px" },
    ...layers.map(([name, text]) => el("div", { class: "layer-row" },
      el("div", { class: "l-name", text: `--arv-${name}` }),
      el("p", { text })))));

  main.append(sectionHead("The same card, both themes", "Switching the theme changes only the semantic custom properties."));
  const cardHtml = `
    <div class="row" style="gap:10px">
      <span class="avatar">SG</span>
      <div><div class="name" style="font-weight:600;font-size:13px">Sita Gurung</div>
      <div class="small muted">Verified plumber · Baneshwor</div></div>
    </div>
    <div class="row mt-2" style="gap:8px">
      <span class="badge green">paid</span><span class="badge gold">escrow</span>
    </div>
    <div class="row mt-2"><button class="btn primary sm">Mark complete</button><button class="btn sm">Message</button></div>`;
  main.append(el("div", { class: "theme-preview" },
    el("div", { class: "theme-panel dark-panel theme-dark" },
      el("div", { class: "badge", style: "margin-bottom:12px", text: "dark" }), el("div", { html: cardHtml })),
    el("div", { class: "theme-panel light-panel theme-light" },
      el("div", { class: "badge", style: "margin-bottom:12px", text: "light" }), el("div", { html: cardHtml }))));

  main.append(sectionHead("Apply a theme", "The stylesheet keys off a class, so any subtree can flip independently of the page."));
  main.append(codeBlock(`<html data-theme="dark">
  …
</html>

<script type="module">
  import { resolveTheme, nextTheme, themeClass } from "./src/theme.js";

  let theme = resolveTheme(localStorage.getItem("theme"), false);
  document.documentElement.classList.toggle(themeClass(theme), theme === "light");
  // Persist on toggle, then set data-theme for the colour-scheme hint.
</script>`, { language: "html" }));

  main.append(sectionHead("Generated token CSS", "Emitted from src/tokens.js. The light block only overrides colour, never spacing or type."));
  main.append(codeBlock(themeCSS(), { language: "css" }));
  main.append(el("p", { class: "small muted mt-2", text: `${themeTokenRows("dark").length} semantic colour roles per theme, plus ${TYPE_SCALE.length} type steps, ${SPACING.length} spacing steps, ${RADIUS.length} radii, ${MOTION.durations.length} durations and ${MOTION.easings.length} easings.` }));
  main.append(docsFooter());
}

/* --------------------------------------------------------------- not found */

function notFoundPage(main, message) {
  main.append(viewHead({ eyebrow: "404", title: "That page is not in the docs", lede: message || "The route does not exist. The sidebar has every page." }));
  main.append(el("div", { class: "empty" },
    el("strong", { text: "Try the component index" }),
    el("p", { class: "mb-0", text: "Thirty components, six foundations and one contrast audit." }),
    el("a", { class: "btn primary sm mt-2", href: "#/components", text: "Browse components" })));
  main.append(docsFooter());
}

/* --------------------------------------------------------------- search */

const searchInput = $("#docs-search");
const searchPanel = $("#search-results");

function markTitle(title, query) {
  const fragment = document.createDocumentFragment();
  let cursor = 0;
  for (const [start, end] of matchRanges(title, query)) {
    if (start > cursor) fragment.append(document.createTextNode(title.slice(cursor, start)));
    fragment.append(el("mark", { text: title.slice(start, end), style: "background:var(--gold-soft);color:var(--text);border-radius:3px;padding:0 1px" }));
    cursor = end;
  }
  if (cursor < title.length) fragment.append(document.createTextNode(title.slice(cursor)));
  return fragment;
}

function renderSearch(query) {
  const results = search(SEARCH_INDEX, query, { limit: 8 });
  searchPanel.innerHTML = "";
  if (!query.trim()) { hideSearch(); return; }
  if (!results.length) {
    searchPanel.append(el("div", { class: "result-empty", text: "No matches. Try “contrast”, “tabs” or “focus”." }));
  } else {
    results.forEach((record) => {
      const row = el("a", { class: "result", href: record.href },
        el("span", { class: "result-type", text: record.type }),
        el("span", { class: "result-title" }, markTitle(record.title, query)),
        el("span", { class: "result-sub", text: record.subtitle }));
      row.addEventListener("click", () => { hideSearch(); searchInput.blur(); });
      searchPanel.append(row);
    });
  }
  searchPanel.hidden = false;
  searchInput.setAttribute("aria-expanded", "true");
  state.cursor = -1;
}

function hideSearch() {
  searchPanel.hidden = true;
  searchInput.setAttribute("aria-expanded", "false");
  state.cursor = -1;
}

function moveCursor(delta) {
  const rows = $$(".result", searchPanel);
  if (!rows.length) return;
  state.cursor = (state.cursor + delta + rows.length) % rows.length;
  rows.forEach((row, i) => row.classList.toggle("cursor", i === state.cursor));
  rows[state.cursor].scrollIntoView({ block: "nearest" });
}

searchInput.addEventListener("input", () => renderSearch(searchInput.value));
searchInput.addEventListener("focus", () => { if (searchInput.value.trim()) renderSearch(searchInput.value); });
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") { hideSearch(); searchInput.blur(); return; }
  if (event.key === "ArrowDown") { event.preventDefault(); moveCursor(1); }
  if (event.key === "ArrowUp") { event.preventDefault(); moveCursor(-1); }
  if (event.key === "Enter") {
    const rows = $$(".result", searchPanel);
    const target = rows[state.cursor] || rows[0];
    if (target) { event.preventDefault(); target.click(); }
  }
});
document.addEventListener("click", (event) => {
  if (!event.target.closest || !event.target.closest(".search")) hideSearch();
});
document.addEventListener("keydown", (event) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
  if (event.key === "/" && !typing) {
    event.preventDefault();
    searchInput.focus();
  }
});

/* --------------------------------------------------------------- theme */

function applyTheme(theme, persist = true) {
  state.theme = theme;
  const root = document.documentElement;
  root.classList.toggle("theme-light", theme === "light");
  root.dataset.theme = themeAttribute(theme);
  const toggle = $("#theme-toggle");
  toggle.setAttribute("aria-label", toggleLabel(theme));
  toggle.title = toggleLabel(theme);
  $("#theme-icon").innerHTML = theme === "light" ? PATHS.moon : PATHS.sun;
  if (persist) A.store.set("theme", theme);
}

$("#theme-toggle").addEventListener("click", () => {
  applyTheme(nextTheme(state.theme));
  render();
});

/* --------------------------------------------------------------- routing */

function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [pathPart, queryPart] = raw.split("?");
  const parts = pathPart.split("/").filter(Boolean);
  return { parts, params: new URLSearchParams(queryPart || "") };
}

function setActiveNav(route) {
  let key = "overview";
  if (route.parts[0] === "tokens") key = `tokens/${route.parts[1] || "color"}`;
  else if (route.parts[0] === "accessibility") key = "accessibility";
  else if (route.parts[0] === "theming") key = "theming";
  else if (route.parts[0] === "components") {
    if (route.parts[1]) key = "components";
    else if (route.params.get("g")) key = `components?g=${route.params.get("g")}`;
    else key = "components";
  }
  $$(".nav-item").forEach((item) => {
    const active = item.dataset.nav === key;
    item.classList.toggle("active", active);
    if (active) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
}

function render() {
  const route = parseRoute();
  const main = $("#view");
  main.innerHTML = "";
  setActiveNav(route);
  const first = route.parts[0];
  let title = "Arvion UI";
  if (!first) { overviewPage(main); title = "Overview"; }
  else if (first === "tokens") {
    const id = route.parts[1] || "color";
    title = TOKEN_GROUPS.find((g) => g.id === id)?.name || "Tokens";
    if (id === "color") colorPage(main);
    else if (id === "type") typePage(main);
    else if (id === "spacing") spacingPage(main);
    else if (id === "radius") radiusPage(main);
    else if (id === "motion") motionPage(main);
    else notFoundPage(main, `No foundation named “${id}”.`);
  } else if (first === "components") {
    if (route.parts[1]) {
      const component = getComponent(route.parts[1]);
      title = component ? component.name : "Not found";
      componentPage(main, route.parts[1]);
    } else {
      componentsIndexPage(main, route.params);
      title = "Components";
    }
  } else if (first === "accessibility") { accessibilityPage(main); title = "Accessibility"; }
  else if (first === "theming") { themingPage(main); title = "Theming"; }
  else notFoundPage(main, `“${first}” is not a docs route.`);
  document.title = `${title} — Arvion UI`;
  window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "instant" });
}

/* --------------------------------------------------------------- boot */

applyTheme(state.theme, false);
state.preview = state.theme;
window.addEventListener("hashchange", render);
if (!location.hash) location.hash = "#/";
render();
