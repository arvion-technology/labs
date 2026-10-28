/**
 * The recipe registry.
 *
 * Each recipe is a live demo in the gallery (.demo-{id} CSS), a copyable snippet,
 * and one honest note about when not to use it. Snippets use the shared
 * `--motion-dur` and `--motion-ease` custom properties so the duration and easing
 * controls in the playground change the code you copy, not just the preview.
 */

export const CATEGORIES = [
  { id: "reveal", name: "Reveals", blurb: "Content entering the viewport." },
  { id: "lists", name: "Lists", blurb: "Order and sequence across many elements." },
  { id: "buttons", name: "Micro-interactions", blurb: "Direct feedback for a press or hover." },
  { id: "loading", name: "Loading", blurb: "Progress without lying about it." },
  { id: "transitions", name: "Transitions", blurb: "One view becoming another." },
  { id: "data", name: "Data", blurb: "Numbers and charts arriving with meaning." },
];

const recipe = (id, name, category, summary, { css, trigger, note, keywords = [] }) => ({
  id, name, category, summary, css: css.trim(), trigger, note, keywords,
});

export const RECIPES = [
  recipe("fade-up", "Fade up", "reveal",
    "The default reveal: 16px of travel and opacity. Cheap to composite and hard to get wrong.",
    {
      css: `.fade-up {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity var(--motion-dur) var(--motion-ease),
              transform var(--motion-dur) var(--motion-ease);
}
.fade-up.is-in { opacity: 1; transform: none; }`,
      trigger: "IntersectionObserver adds .is-in",
      note: "Use it for content below the first screen. Never animate the hero this way; it delays the one thing the page is for.",
      keywords: ["scroll", "reveal", "observer", "entrance"],
    }),
  recipe("clip-reveal", "Clip reveal", "reveal",
    "A line of text uncovered left to right. The mask does the work; the text never moves.",
    {
      css: `.clip-reveal {
  clip-path: inset(0 100% 0 0);
  transition: clip-path var(--motion-dur) var(--motion-ease);
}
.clip-reveal.is-in { clip-path: inset(0 0 0 0); }`,
      trigger: "class change while the element is in view",
      note: "Clip-path is not always cheap on low-end phones. Test on the devices your audience actually has.",
      keywords: ["clip", "mask", "text", "reveal"],
    }),
  recipe("scale-in", "Scale in", "reveal",
    "A card arrives at 96% and settles. The small scale difference reads as depth without a shadow.",
    {
      css: `.scale-in {
  opacity: 0;
  transform: scale(0.96);
  transition: opacity var(--motion-dur) var(--motion-ease),
              transform var(--motion-dur) var(--motion-ease);
}
.scale-in.is-in { opacity: 1; transform: none; }`,
      trigger: "class change",
      note: "Keep the start scale above 0.94. Below that it reads as a popup, not as content.",
      keywords: ["scale", "card", "depth", "reveal"],
    }),
  recipe("blur-in", "Blur in", "reveal",
    "A short blur that resolves to sharp. Expensive, so use it once per page at most.",
    {
      css: `.blur-in {
  opacity: 0;
  filter: blur(8px);
  transition: opacity var(--motion-dur) var(--motion-ease),
              filter var(--motion-dur) var(--motion-ease);
}
.blur-in.is-in { opacity: 1; filter: blur(0); }`,
      trigger: "class change",
      note: "Filter animation forces repaints. If a screenshot test catches jank, drop the blur before you drop the fade.",
      keywords: ["blur", "focus", "reveal", "expensive"],
    }),

  recipe("stagger-list", "Staggered list", "lists",
    "Rows arrive in sequence with a capped total delay, so a long list does not take forever.",
    {
      css: `.stagger-item {
  opacity: 0;
  transform: translateY(8px);
  animation: stagger-in var(--motion-dur) var(--motion-ease) forwards;
  animation-delay: calc(var(--index) * 60ms);
}
@keyframes stagger-in {
  to { opacity: 1; transform: none; }
}`,
      trigger: "an inline --index per row",
      note: "Cap the total delay. Forty rows at 60ms each is two and a half seconds before the last one appears.",
      keywords: ["stagger", "sequence", "list", "rows"],
    }),
  recipe("cascade-cards", "Cascade cards", "lists",
    "Three cards fan into place. Useful when the group is more important than any single card.",
    {
      css: `.cascade-card {
  opacity: 0;
  transform: translateY(14px) rotate(-1deg);
  animation: cascade-in var(--motion-dur) var(--motion-ease) forwards;
  animation-delay: calc(var(--index) * 90ms);
}
@keyframes cascade-in {
  to { opacity: 1; transform: none; }
}`,
      trigger: "an inline --index per card",
      note: "Do not cascade more than five items. Past that, the user is waiting instead of reading.",
      keywords: ["cards", "cascade", "group", "stagger"],
    }),
  recipe("timeline-draw", "Timeline draw", "lists",
    "The connecting line grows first, then the events land on it.",
    {
      css: `.timeline-line {
  transform: scaleY(0);
  transform-origin: top;
  transition: transform var(--motion-dur) var(--motion-ease);
}
.timeline.is-in .timeline-line { transform: scaleY(1); }
.timeline-dot { animation: dot-in 200ms var(--motion-ease) both; }
@keyframes dot-in { from { transform: scale(0); } to { transform: scale(1); } }`,
      trigger: "IntersectionObserver adds .is-in to the timeline",
      note: "Sequence the line before the dots. Dots appearing on an empty line look like a rendering bug.",
      keywords: ["timeline", "line", "sequence", "draw"],
    }),

  recipe("magnetic-button", "Magnetic button", "buttons",
    "The button leans toward the cursor within a small radius, then springs back.",
    {
      css: `.magnetic {
  transition: transform var(--motion-dur) var(--motion-ease);
  will-change: transform;
}
/* JS sets --mx/--my from pointer distance, capped at 6px. */
.magnetic:hover { transform: translate(var(--mx, 0), var(--my, 0)); }`,
      trigger: "pointermove sets two custom properties",
      note: "Cap the travel at a few pixels. A button that runs away from the cursor is a joke, once.",
      keywords: ["magnetic", "hover", "pointer", "button"],
    }),
  recipe("press-squish", "Press squish", "buttons",
    "A 1.5% scale down on press. It should feel like a physical key, not an animation.",
    {
      css: `.squish { transition: transform 120ms var(--motion-ease); }
.squish:active { transform: scale(0.985); }`,
      trigger: "the :active pseudo-class",
      note: "This one is short on purpose. If the user can perceive it as a sequence, it is too slow.",
      keywords: ["press", "button", "squish", "feedback"],
    }),
  recipe("shine-sweep", "Shine sweep", "buttons",
    "A single highlight crosses a primary button on hover. Once, then it is gone.",
    {
      css: `.shine { position: relative; overflow: hidden; }
.shine::after {
  content: "";
  position: absolute; inset: 0;
  background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,.35) 50%, transparent 65%);
  transform: translateX(-120%);
  transition: transform var(--motion-dur) var(--motion-ease);
}
.shine:hover::after { transform: translateX(120%); }`,
      trigger: ":hover on a hover-capable pointer",
      note: "Only on hover-capable devices. On touch the sweep fires on tap and reads as a glitch.",
      keywords: ["shine", "gradient", "hover", "button"],
    }),
  recipe("icon-morph", "Icon morph", "buttons",
    "A plus rotates into a close icon. One element, one property.",
    {
      css: `.icon-morph { transition: transform var(--motion-dur) var(--motion-ease); }
.icon-morph.is-open { transform: rotate(45deg); }`,
      trigger: "aria-expanded state",
      note: "Rotate a real icon rather than swapping two glyphs; a swap is a flash, not a transition.",
      keywords: ["icon", "rotate", "plus", "close"],
    }),

  recipe("skeleton-shimmer", "Skeleton shimmer", "loading",
    "A gradient moves across a placeholder at the speed of the network, not faster.",
    {
      css: `.skeleton {
  background: linear-gradient(90deg, #1d2740 25%, #27324a 37%, #1d2740 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s linear infinite;
}
@keyframes shimmer { to { background-position: -400% 0; } }`,
      trigger: "infinite loop while loading",
      note: "Match the skeleton to the final content size, or you have added a second layout shift.",
      keywords: ["skeleton", "loading", "shimmer", "placeholder"],
    }),
  recipe("spinner-orbit", "Spinner orbit", "loading",
    "Two dots orbit a ring. A spinner is an apology; keep it under three seconds and say what is loading.",
    {
      css: `.spinner { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.spinner::after { animation: counter-spin 1.4s linear infinite; }`,
      trigger: "infinite loop",
      note: "A spinner with no label is the worst loading state. Add the thing being loaded next to it.",
      keywords: ["spinner", "loading", "orbit", "rotate"],
    }),
  recipe("progress-indeterminate", "Indeterminate progress", "loading",
    "A bar for a wait whose length you genuinely do not know.",
    {
      css: `.indeterminate > i {
  width: 35%;
  animation: indeterminate 1.4s var(--motion-ease) infinite;
}
@keyframes indeterminate {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(380%); }
}`,
      trigger: "infinite loop",
      note: "If you know the percentage, show it. Indeterminate progress is an admission, not a design choice.",
      keywords: ["progress", "indeterminate", "bar", "loading"],
    }),
  recipe("dots-typing", "Typing dots", "loading",
    "Three dots breathe out of phase. Cheap, legible, and honest about not knowing.",
    {
      css: `.typing i { animation: typing 1.1s var(--motion-ease) infinite; }
.typing i:nth-child(2) { animation-delay: 120ms; }
.typing i:nth-child(3) { animation-delay: 240ms; }
@keyframes typing { 0%, 60%, 100% { transform: none; } 30% { transform: translateY(-4px); } }`,
      trigger: "infinite loop",
      note: "Three dots for a chat reply. Not for page load; it reads as a message, not as progress.",
      keywords: ["dots", "typing", "chat", "loading"],
    }),

  recipe("page-slide", "Page slide", "transitions",
    "The next view slides in from the direction of travel. Direction is what makes it legible.",
    {
      css: `.page-enter {
  animation: page-in var(--motion-dur) var(--motion-ease) both;
}
@keyframes page-in {
  from { transform: translateX(24px); opacity: 0; }
  to { transform: none; opacity: 1; }
}`,
      trigger: "route change",
      note: "Respect the back gesture direction. A slide from the right when going back makes the app feel broken.",
      keywords: ["page", "route", "slide", "navigation"],
    }),
  recipe("modal-pop", "Modal pop", "transitions",
    "A dialog arrives at 96% and settles. The backdrop fades, the dialog scales.",
    {
      css: `.modal {
  animation: modal-in 220ms var(--motion-ease) both;
}
@keyframes modal-in {
  from { transform: translateY(12px) scale(0.97); opacity: 0; }
  to { transform: none; opacity: 1; }
}`,
      trigger: "dialog open",
      note: "Move focus into the dialog before it finishes animating. An animation is not a reason to delay accessibility.",
      keywords: ["modal", "dialog", "scale", "overlay"],
    }),
  recipe("accordion-open", "Accordion open", "transitions",
    "Height and opacity together, with the chevron rotating on the same curve.",
    {
      css: `.accordion-panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--motion-dur) var(--motion-ease);
}
.accordion[open] .accordion-panel { grid-template-rows: 1fr; }
.accordion-panel > div { overflow: hidden; }`,
      trigger: "<details> open state",
      note: "Animate grid-template-rows rather than max-height; max-height needs a magic number that is always wrong.",
      keywords: ["accordion", "height", "chevron", "expand"],
    }),
  recipe("tab-crossfade", "Tab crossfade", "transitions",
    "Panels crossfade without moving. The selected tab moves, the content does not.",
    {
      css: `.tab-panel {
  opacity: 0;
  transition: opacity var(--motion-dur) var(--motion-ease);
}
.tab-panel.is-active { opacity: 1; }`,
      trigger: "tab selection",
      note: "Crossfade only when the panels are the same size. A height jump under a fade is worse than no fade.",
      keywords: ["tabs", "fade", "panel", "switch"],
    }),

  recipe("bar-grow", "Bar grow", "data",
    "Bars grow from the baseline in sequence. The chart becomes readable as it arrives.",
    {
      css: `.bar {
  transform: scaleY(0);
  transform-origin: bottom;
  animation: bar-grow var(--motion-dur) var(--motion-ease) forwards;
  animation-delay: calc(var(--index) * 40ms);
}
@keyframes bar-grow { to { transform: scaleY(1); } }`,
      trigger: "chart reveal",
      note: "Do not animate the axis. A moving scale makes the reader doubt the numbers.",
      keywords: ["bar", "chart", "data", "sequence"],
    }),
  recipe("number-roll", "Number roll", "data",
    "A metric rolls from its previous value to the new one. The movement is the change.",
    {
      css: `.number { transition: transform var(--motion-dur) var(--motion-ease); }
/* JS sets translateY to the digit offset; reduced motion jumps to the value. */
.number.tick { transform: translateY(calc(var(--digit) * -1em)); }`,
      trigger: "value change",
      note: "Use tabular figures. A proportional font turns the roll into a jitter.",
      keywords: ["number", "metric", "count", "data"],
    }),
  recipe("chart-draw", "Chart draw", "data",
    "The line draws itself with stroke-dashoffset. One property, no library.",
    {
      css: `.chart-line {
  stroke-dasharray: var(--length);
  stroke-dashoffset: var(--length);
  animation: draw var(--motion-dur) var(--motion-ease) forwards;
}
@keyframes draw { to { stroke-dashoffset: 0; } }`,
      trigger: "chart reveal",
      note: "Measure the path length once (getTotalLength) and cache it. Recomputing every frame is how charts get janky.",
      keywords: ["chart", "svg", "draw", "line"],
    }),
];

export const RECIPE_COUNT = RECIPES.length;

export function getRecipe(id) {
  return RECIPES.find((item) => item.id === id) || null;
}

export function recipesByCategory(category) {
  if (category === "all") return RECIPES;
  return RECIPES.filter((item) => item.category === category);
}

export function categoryMeta(id) {
  return CATEGORIES.find((item) => item.id === id) || null;
}

/** Fill the duration/easing controls into the copyable snippet. */
export function buildSnippet(recipe, { durationMs = 600, easing = "cubic-bezier(0.22, 0.61, 0.36, 1)" } = {}) {
  return recipe.css.replaceAll("var(--motion-dur)", `${durationMs}ms`).replaceAll("var(--motion-ease)", easing);
}

export function recipesUsing(keyword) {
  const needle = keyword.toLowerCase();
  return RECIPES.filter((item) =>
    item.name.toLowerCase().includes(needle)
    || item.summary.toLowerCase().includes(needle)
    || item.keywords.some((word) => word.includes(needle)));
}
