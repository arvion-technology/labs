// Motion Lab — gallery and playground.
// The recipe registry, easing maths and snippet builder come from ../src.
import {
  RECIPES, CATEGORIES, getRecipe, recipesByCategory, buildSnippet, categoryMeta,
} from "../src/recipes.js";
import {
  EASINGS, clampDuration, formatDuration, REDUCED_MOTION_CSS,
} from "../src/easing.js";

const $ = A.$, $$ = A.$$, el = A.el;
const prefersReduced = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;
const state = {
  filter: "all",
  selected: "stagger-list",
  duration: 600,
  easing: EASINGS[0].value,
  reduced: prefersReduced,
};

/* --------------------------------------------------------------- preview markup */

function preview(id) {
  switch (id) {
    case "fade-up":
      return `<div class="pv-card a-fade"><div class="pv-line gold"></div><div class="pv-line"></div><div class="pv-line short"></div></div>`;
    case "clip-reveal":
      return `<div class="pv-title a-clip">Reveal this line</div>`;
    case "scale-in":
      return `<div class="pv-card a-scale"><div class="pv-line gold"></div><div class="pv-line"></div><div class="pv-line short"></div></div>`;
    case "blur-in":
      return `<div class="pv-title a-blur">Focus resolves</div>`;
    case "stagger-list":
      return [1, 2, 3, 4].map((n) => `<div class="pv-row a-stagger" style="--i:${n - 1}"><span class="dotmark"></span><span class="bar ${n % 2 ? "gold" : ""}"></span></div>`).join("");
    case "cascade-cards":
      return [1, 2, 3].map((n) => `<div class="pv-card a-cascade" style="--i:${n - 1};padding:7px 9px;width:${190 - n * 16}px"><div class="pv-line"></div></div>`).join("");
    case "timeline-draw":
      return `<div class="pv-tl">
        <div class="tl-step"><div class="tl-mark"><i class="tl-dot"></i><i class="tl-line a-growline"></i></div><span class="tl-label">Requested</span></div>
        <div class="tl-step"><div class="tl-mark"><i class="tl-dot"></i><i class="tl-line a-growline" style="animation-delay:120ms"></i></div><span class="tl-label">Matched</span></div>
        <div class="tl-step"><div class="tl-mark"><i class="tl-dot"></i></div><span class="tl-label">On the way</span></div>
      </div>`;
    case "magnetic-button":
      return `<button class="pv-btn a-magnet" type="button">Hover me</button>`;
    case "press-squish":
      return `<button class="pv-btn a-squish" type="button">Press me</button>`;
    case "shine-sweep":
      return `<button class="pv-btn a-shine" type="button">Primary action</button>`;
    case "icon-morph":
      return `<div class="pv-plus">+</div>`;
    case "skeleton-shimmer":
      return `<div class="pv-skeleton"><div class="sk" style="width:52%"></div><div class="sk" style="width:92%"></div><div class="sk" style="width:74%"></div></div>`;
    case "spinner-orbit":
      return `<div class="pv-spinner"></div>`;
    case "progress-indeterminate":
      return `<div class="pv-mini a-progressbar"><i></i></div>`;
    case "dots-typing":
      return `<div class="pv-dots"><i></i><i></i><i></i></div>`;
    case "page-slide":
      return `<div class="pv-page a-page"><div class="pv-line gold"></div><div class="pv-line"></div><div class="pv-line short"></div></div>`;
    case "modal-pop":
      return `<div class="pv-modal a-modal"><div class="pv-line gold" style="margin-bottom:7px"></div><div class="pv-line"></div><div class="pv-line short"></div></div>`;
    case "accordion-open":
      return `<div class="pv-accordion"><div class="acc-head"><span>Details</span><span>⌄</span></div><div class="acc-body"><div>Panel content expands on the same curve as the chevron.</div></div></div>`;
    case "tab-crossfade":
      return `<div class="pv-tabs"><div class="pv-tabhead"><i class="on"></i><i></i></div><div class="pv-tabpanels"><div></div><div></div></div></div>`;
    case "bar-grow":
      return `<div class="pv-bars">${[34, 52, 44, 70, 62, 86].map((height, index) => `<i class="a-bar" style="--i:${index};height:${height}%"></i>`).join("")}</div>`;
    case "number-roll":
      return `<div class="pv-number">42</div><div class="pv-sub">tabular figures required</div>`;
    case "chart-draw":
      return `<svg class="pv-chart" viewBox="0 0 120 62" role="img" aria-label="Line chart drawing itself"><path class="a-draw" d="M2 52 C 16 46, 20 34, 32 38 S 50 20, 62 26 S 82 10, 96 16 S 110 8, 118 6"/></svg>`;
    default:
      return `<div class="pv-card"><div class="pv-line"></div></div>`;
  }
}

function previewRoot(id) {
  return `<div class="pv">${preview(id)}</div>`;
}

function runPreview(host, id, { animate = true } = {}) {
  host.innerHTML = previewRoot(id);
  host.classList.toggle("reduced", state.reduced);
  host.style.setProperty("--motion-dur", `${state.duration}ms`);
  host.style.setProperty("--motion-ease", state.easing);
  const pv = host.querySelector(".pv");
  if (!pv || !animate) return; // static frame: the gallery and first paint stay readable
  pv.classList.remove("go");
  // Force a layout read so a replay restarts the animation rather than continuing it.
  void pv.offsetWidth;
  pv.classList.add("go");
}

/* --------------------------------------------------------------- controls */

function controlBar({ onReplay } = {}) {
  const duration = el("input", {
    type: "range", min: "120", max: "2000", step: "20", value: String(state.duration),
    "aria-label": "Duration",
    oninput: (event) => {
      state.duration = clampDuration(event.target.value);
      event.target.closest(".stage-controls").querySelector(".val").textContent = formatDuration(state.duration);
      applyTiming();
      if (onReplay) onReplay();
    },
  });
  const easing = el("select", {
    class: "select", "aria-label": "Easing",
    onchange: (event) => { state.easing = event.target.value; applyTiming(); if (onReplay) onReplay(); },
  }, ...EASINGS.map((item) => el("option", { value: item.value, text: item.label, selected: item.value === state.easing ? "" : null })));
  const toggle = el("input", {
    type: "checkbox", "aria-label": "Simulate reduced motion",
    checked: state.reduced ? "" : null,
    onchange: (event) => {
      state.reduced = event.target.checked;
      $$(".stage, .play-stage").forEach((node) => node.classList.toggle("reduced", state.reduced));
      A.toast(state.reduced ? "Reduced motion on: animations collapse to the final state." : "Reduced motion off: animations play.", "info");
    },
  });
  return el("div", { class: "stage-controls" },
    el("label", { class: "speed" }, "Duration", duration, el("span", { class: "val", text: formatDuration(state.duration) })),
    el("label", {}, "Easing", easing),
    el("label", {}, toggle, "Reduced motion"),
    el("span", { class: "spacer" }),
    el("button", { class: "btn sm", type: "button", onclick: () => { if (onReplay) onReplay(); A.toast("Replayed", "info"); }, text: "Replay" }));
}

function applyTiming() {
  $$(".stage, .play-stage").forEach((host) => {
    host.style.setProperty("--motion-dur", `${state.duration}ms`);
    host.style.setProperty("--motion-ease", state.easing);
    const pv = host.querySelector(".pv");
    if (pv) { pv.classList.remove("go"); void pv.offsetWidth; pv.classList.add("go"); }
  });
  $$(".snippet-live").forEach((node) => {
    node.textContent = buildSnippet(getRecipe(state.selected), { durationMs: state.duration, easing: state.easing });
  });
}

/* --------------------------------------------------------------- gallery */

function stageCard() {
  const host = el("div", { class: "stage" });
  const replay = () => runPreview(host, state.selected, { animate: true });
  const card = el("div", { class: "stage-card" },
    el("div", { class: "stage-head" },
      el("span", { text: "Live stage" }),
      el("span", { class: "spacer" }),
      el("span", { class: "badge gold", text: getRecipe(state.selected).name })),
    host,
    controlBar({ onReplay: replay }));
  runPreview(host, state.selected, { animate: false });
  return card;
}

function galleryCard(recipe) {
  const pv = el("div", { class: "pv" });
  const card = el("button", {
    class: "recipe-card", type: "button", "aria-label": `${recipe.name}: open in the playground`,
    onclick: () => { state.selected = recipe.id; location.hash = `#/playground/${recipe.id}`; },
  }, pv,
    el("div", { class: "recipe-body" },
      el("h3", { text: recipe.name }),
      el("p", { text: recipe.summary }),
      el("div", { class: "recipe-foot" }, el("span", { text: "●" }), el("span", { text: categoryMeta(recipe.category).name }))));
  // Cards are static frames; the infinite loading recipes still loop. Motion is
  // reserved for the stage, where the user asked to see it.
  pv.innerHTML = preview(recipe.id);
  pv.style.setProperty("--motion-dur", `${state.duration}ms`);
  pv.style.setProperty("--motion-ease", state.easing);
  return card;
}

function galleryPage(main) {
  main.append(el("section", { class: "lab-hero" },
    el("div", {},
      el("div", { class: "eyebrow" }, "Motion Lab · 22 recipes"),
      el("h1", {}, "Motion that explains, ", el("em", { text: "not decorates." })),
      el("p", { class: "lede" }, "A working gallery of CSS and Web Animations recipes: scroll reveals, staggered lists, magnetic buttons, skeletons and page transitions. Every recipe is copyable, controlled by two custom properties, and has a reduced-motion path."),
      el("div", { class: "lab-facts" },
        el("span", {}, el("b", { text: String(RECIPES.length) }), "recipes"),
        el("span", {}, el("b", { text: String(CATEGORIES.length) }), "categories"),
        el("span", {}, el("b", { text: "0" }), "dependencies"),
        el("span", {}, el("b", { text: "1" }), "global reduced-motion rule"))),
    stageCard()));

  main.append(el("div", { class: "section-head" },
    el("h2", { text: "The recipe index" }),
    el("p", { text: "Every preview is rendered from the registry. Open one to control its duration, change the easing and copy the code." })));
  main.append(el("div", { class: "chips", role: "navigation", "aria-label": "Recipe categories" },
    el("button", { class: `chip ${state.filter === "all" ? "active" : ""}`, type: "button", text: `All ${RECIPES.length}`, onclick: () => { state.filter = "all"; render(); } }),
    ...CATEGORIES.map((category) => el("button", {
      class: `chip ${state.filter === category.id ? "active" : ""}`, type: "button",
      text: `${category.name} ${recipesByCategory(category.id).length}`,
      onclick: () => { state.filter = category.id; render(); },
    }))));

  const grid = el("div", { class: "recipe-grid" });
  recipesByCategory(state.filter).forEach((recipe) => grid.append(galleryCard(recipe)));
  main.append(grid);

  main.append(el("div", { class: "section-head", style: "margin-top:40px" },
    el("h2", { text: "The one rule that is not optional" }),
    el("p", { text: "Reduced motion is a preference, not a nice-to-have. This rule ships with every recipe." })));
  const reduced = el("pre", { class: "code" });
  reduced.innerHTML = `<code>${REDUCED_MOTION_CSS.replace(/</g, "&lt;")}</code>`;
  main.append(reduced);
  main.append(footer());
}

/* --------------------------------------------------------------- playground */

function playgroundPage(main, id) {
  const recipe = getRecipe(id) || getRecipe("fade-up");
  state.selected = recipe.id;
  main.append(el("div", { class: "crumb" }, el("a", { href: "#/", text: "Gallery" }), el("span", { text: "/" }), el("span", { text: recipe.name })));
  main.append(el("div", { class: "play-head" },
    el("h2", { text: recipe.name }),
    el("span", { class: "badge gold", text: categoryMeta(recipe.category).name }),
    el("span", { class: "trigger-pill", text: recipe.trigger }),
    el("span", { style: "flex:1" }),
    el("button", { class: "btn sm", type: "button", text: "Back to gallery", onclick: () => { location.hash = "#/"; } })));

  const host = el("div", { class: "stage play-stage" });
  const code = el("pre", { class: "code" }, el("code", { class: "snippet-live", text: buildSnippet(recipe, { durationMs: state.duration, easing: state.easing }) }));
  const copy = el("button", {
    class: "copy-btn", type: "button", text: "Copy CSS",
    onclick: () => {
      const snippet = buildSnippet(recipe, { durationMs: state.duration, easing: state.easing });
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(snippet).then(() => A.toast("CSS copied", "success")).catch(() => A.toast("Copy blocked", "error"));
      else A.toast("Copy is blocked in this browser", "error");
    },
  });
  const replay = () => runPreview(host, recipe.id, { animate: true });

  main.append(el("div", { class: "play-grid" },
    el("div", {},
      el("div", { class: "stage-card" },
        el("div", { class: "stage-head" }, el("span", { text: "Playground" }), el("span", { class: "spacer" }), el("span", { class: "badge green", text: state.reduced ? "reduced motion" : "motion on" })),
        host,
        controlBar({ onReplay: replay }))),
    el("div", { class: "play-side" },
      el("div", { class: "card" },
        el("h3", { text: "When to use it" }),
        el("p", { text: recipe.summary }),
        el("p", { class: "recipe-note mt-2", text: recipe.note })),
      el("div", { class: "card" },
        el("div", { class: "row", style: "margin-bottom:8px" }, el("h3", { style: "margin:0", text: "CSS" }), el("span", { class: "spacer" }), el("span", { class: "trigger-pill", text: recipe.trigger })),
        el("div", { class: "code-wrap" }, code, copy),
        el("p", { class: "small muted mt-2", text: "The snippet has the current duration and easing baked in. With reduced motion, the animation resolves instantly." })),
      el("div", { class: "play-pager" },
        el("button", { class: "btn sm", type: "button", text: "← Previous", onclick: () => stepRecipe(-1) }),
        el("button", { class: "btn sm", type: "button", text: "Next →", onclick: () => stepRecipe(1) })))));

  runPreview(host, recipe.id, { animate: false });
  main.append(footer());
}

function stepRecipe(direction) {
  const index = RECIPES.findIndex((item) => item.id === state.selected);
  const next = (index + direction + RECIPES.length) % RECIPES.length;
  location.hash = `#/playground/${RECIPES[next].id}`;
}

/* --------------------------------------------------------------- shared */

function footer() {
  return el("footer", { class: "docs-footer", style: "margin-top:48px" },
    el("span", { text: `Motion Lab · ${RECIPES.length} recipes · MIT` }),
    el("span", { style: "flex:1" }),
    el("a", { href: "https://arviontech.net", target: "_blank", rel: "noopener", text: "Arvion Technologies" }),
    el("a", { href: "https://github.com/arvion-technology/motion-lab", target: "_blank", rel: "noopener", text: "Source" }));
}

function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);
  if (parts[0] === "playground") return { view: "playground", id: parts[1] || "fade-up" };
  return { view: "gallery" };
}

function render() {
  const route = parseRoute();
  const main = $("#view");
  main.innerHTML = "";
  $$("[data-nav]").forEach((link) => link.classList.toggle("active", link.dataset.nav === route.view));
  if (route.view === "playground") playgroundPage(main, route.id);
  else galleryPage(main);
  document.title = `${route.view === "playground" ? getRecipe(route.id)?.name || "Playground" : "Gallery"} — Motion Lab`;
  window.scrollTo({ top: 0 });
}

window.addEventListener("hashchange", render);
if (!location.hash) location.hash = "#/";
render();
