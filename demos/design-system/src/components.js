/**
 * Component registry: the single source for the docs site, the search index,
 * and the tests. Snippets are the copyable form, they must be valid, complete
 * HTML fragments with no build-time templating.
 */

export const COMPONENT_GROUPS = [
  { id: "actions", name: "Actions", blurb: "Things the user presses." },
  { id: "forms", name: "Forms", blurb: "Input, validation and the states around them." },
  { id: "feedback", name: "Feedback", blurb: "Status, loading and empty states." },
  { id: "data", name: "Data display", blurb: "Records, counts and identity." },
  { id: "navigation", name: "Navigation", blurb: "Moving between views without losing place." },
  { id: "overlays", name: "Overlays", blurb: "Layers on top of the page. Keyboard handled." },
];

const component = (id, name, group, summary, { snippet, a11y, notes = [], keywords = [] }) => ({
  id, name, group, summary, snippet: snippet.trim(), a11y, notes, keywords,
  status: "stable",
});

export const COMPONENTS = [
  component("button", "Button", "actions",
    "Four weights for four levels of intent: primary, default, blue action, danger. Sizes and an icon-only variant.",
    {
      snippet: `<button class="btn primary">Book a worker</button>
<button class="btn">Save draft</button>
<button class="btn blue sm">Confirm</button>
<button class="btn danger sm">Cancel job</button>`,
      a11y: [
        "Use a real <button>, not a styled div. Space and Enter work for free and screen readers announce the role.",
        "Never remove the focus ring. The token package supplies a 3:1 gold ring on every background it ships.",
        "Disabled buttons are removed from the tab order by the browser; explain why the action is unavailable next to the button.",
      ],
      notes: ["One primary button per view. If two compete, the second is default weight."],
      keywords: ["cta", "action", "press", "submit"],
    }),

  component("icon-button", "Icon button", "actions",
    "A square button for a single, well-understood action. Always carries a text label for assistive technology.",
    {
      snippet: `<button class="btn icon" aria-label="Copy snippet">
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6">
    <rect x="5" y="5" width="8" height="8" rx="2" /><path d="M11 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h1" />
  </svg>
</button>`,
      a11y: [
        "aria-label is mandatory; an icon alone has no accessible name.",
        "Mark the SVG aria-hidden=\"true\" so the label is not announced twice.",
        "Minimum hit area is 34px (the .icon size). On touch surfaces use .btn.icon with extra padding.",
      ],
      keywords: ["icon", "square", "toolbar", "copy"],
    }),

  component("input", "Input", "forms",
    "Single-line text. Label sits above the field, always visible; placeholders are examples, not labels.",
    {
      snippet: `<label class="field" for="worker-name">Worker name
  <input class="input" id="worker-name" name="worker" placeholder="Sita Gurung" autocomplete="name" />
  <span class="hint">As it appears on their citizenship document.</span>
</label>`,
      a11y: [
        "A <label for> keeps the name visible and clickable; a placeholder disappears as soon as the user types.",
        "Set the right autocomplete token (name, tel, postal-code) so mobile keyboards and password managers help.",
        "Errors belong next to the field as text, not as colour alone.",
      ],
      notes: ["Required fields are marked in the label, not only by an asterisk."],
      keywords: ["text", "field", "form", "label"],
    }),

  component("textarea", "Textarea", "forms",
    "Multi-line free text with the same label, hint and error contract as the input.",
    {
      snippet: `<label class="field" for="job-note">What needs fixing?
  <textarea class="textarea" id="job-note" placeholder="Kitchen tap drips when the hot water runs."></textarea>
  <span class="hint">Add a photo after submitting if it helps.</span>
</label>`,
      a11y: [
        "Keep the label associated even when a fieldset groups several controls.",
        "Autosize only if the text remains scrollable; a textarea that grows without a limit pushes the submit button off screen.",
      ],
      keywords: ["multiline", "notes", "message"],
    }),

  component("select", "Select", "forms",
    "Native select with a styled control. Native is the accessible default; custom menus have to re-implement all of it.",
    {
      snippet: `<label class="field" for="service">Service
  <select class="select" id="service">
    <option>Plumbing</option>
    <option>Electrical</option>
    <option>Deep cleaning</option>
  </select>
</label>`,
      a11y: [
        "Keep <select> and <option>; the platform picker is better on mobile than any custom listbox.",
        "Do not use a placeholder option as the label. Give the field a real label.",
      ],
      keywords: ["dropdown", "choice", "option", "picker"],
    }),

  component("checkbox", "Checkbox", "forms",
    "Independent boolean choices. For a group, use a fieldset with a legend.",
    {
      snippet: `<label class="check"><input type="checkbox" checked /> Send me job updates</label>
<label class="check"><input type="checkbox" /> Include a maintenance reminder</label>`,
      a11y: [
        "Wrap the input and the label text in one <label>, so the text is part of the hit target.",
        "The visible focus ring is on the native input; do not hide it.",
      ],
      keywords: ["boolean", "toggle", "multiple", "check"],
    }),

  component("radio", "Radio group", "forms",
    "One choice from a short, visible list. Not for navigation between pages.",
    {
      snippet: `<fieldset class="field">
  <legend>When should the worker arrive?</legend>
  <label class="check"><input type="radio" name="arrival" value="now" checked /> Within two hours</label>
  <label class="check"><input type="radio" name="arrival" value="morning" /> Tomorrow morning</label>
</fieldset>`,
      a11y: [
        "The legend is the group's accessible name; without it each option is read alone.",
        "Arrow keys move between radios when they share a name. Keep the native grouping.",
      ],
      keywords: ["choice", "option", "exclusive"],
    }),

  component("switch", "Switch", "forms",
    "An immediate on/off change applied without a save button. Announce the resulting state, not the action.",
    {
      snippet: `<div class="row">
  <button class="switch" role="switch" aria-checked="true" aria-label="Available for new jobs"></button>
  <span>Available for new jobs</span>
</div>`,
      a11y: [
        "role=\"switch\" plus aria-checked is the only state a screen reader can report here.",
        "The label describes what is on, not what clicking does: \"Available for new jobs\", not \"Turn on availability\".",
      ],
      notes: ["Switches take effect immediately. If the change needs a save, use a checkbox."],
      keywords: ["toggle", "on off", "setting", "boolean"],
    }),

  component("slider", "Slider", "forms",
    "A bounded numeric choice where the exact value matters less than the range.",
    {
      snippet: `<label class="field" for="radius">Search radius
  <input class="slider" id="radius" type="range" min="1" max="20" value="6" />
  <span class="hint"><output for="radius">6 km</output> around Kathmandu</span>
</label>`,
      a11y: [
        "A native range input gets keyboard control and value announcements; label it with <label for>.",
        "Mirror the value in text with <output> so it is readable without dragging.",
      ],
      keywords: ["range", "number", "distance"],
    }),

  component("search", "Search field", "forms",
    "Search input with a magnifier affordance and a clear button. Submits on Enter, filters as you type only when the result set is local.",
    {
      snippet: `<div class="search">
  <input class="input" type="search" placeholder="Search jobs, workers, invoices" aria-label="Search" />
</div>`,
      a11y: [
        "type=\"search\" adds a clear affordance in some browsers; still provide a visible clear button in the app.",
        "Announce the result count in a live region after filtering, or the user cannot tell that anything happened.",
      ],
      keywords: ["find", "filter", "query"],
    }),

  component("form-field", "Form field", "forms",
    "The label, hint and error pattern in one block. Use it for every form control so spacing and error placement are consistent.",
    {
      snippet: `<div class="field">
  <label for="phone">Mobile number</label>
  <input class="input" id="phone" type="tel" inputmode="numeric" placeholder="98XXXXXXXX" aria-describedby="phone-hint phone-error" aria-invalid="true" />
  <span class="hint" id="phone-hint">The worker calls this number before arriving.</span>
  <span class="error-text" id="phone-error">Enter a 10-digit Nepali mobile number.</span>
</div>`,
      a11y: [
        "aria-describedby links hint and error text to the input; without it the error is visual only.",
        "aria-invalid=\"true\" is the state a screen reader announces. Update it as the user corrects the value.",
        "Put the error after the hint in the DOM so it is read in the order the user needs it.",
      ],
      keywords: ["validation", "label", "error", "hint"],
    }),

  component("alert", "Inline alert", "feedback",
    "A persistent message attached to the page or a form. Use a toast only when the message can disappear.",
    {
      snippet: `<div class="alert info" role="status">
  <strong>Escrow protected.</strong> The worker is paid after you mark the job complete.
</div>
<div class="alert warn" role="alert">
  <strong>KYC expiring.</strong> Upload a new citizenship scan before 12 Nov.
</div>`,
      a11y: [
        "role=\"alert\" interrupts the screen reader, so reserve it for errors that need immediate attention.",
        "Do not rely on the tint. The icon and the first words carry the meaning.",
      ],
      keywords: ["banner", "notice", "warning", "message"],
    }),

  component("toast", "Toast", "feedback",
    "A transient confirmation of an action that already happened. Fires from A.toast in demo code; the markup is the visual contract.",
    {
      snippet: `<div class="toast ok" role="status">
  <span class="dot" style="color: var(--green)"></span>
  <span>Booking confirmed. Worker arrives by 2:30 PM.</span>
</div>`,
      a11y: [
        "Put the toast region in the DOM once, with aria-live=\"polite\"; mount messages inside it.",
        "Never put the only copy of important information in a toast. It disappears.",
        "Give the user at least five seconds, or a dismiss button, for anything longer than one line.",
      ],
      keywords: ["notification", "snackbar", "transient", "success"],
    }),

  component("spinner", "Spinner", "feedback",
    "Indeterminate progress for waits under a few seconds. Longer than that, show what is happening.",
    {
      snippet: `<span class="spinner" role="status" aria-label="Loading bookings"></span>
<span class="spinner lg" aria-hidden="true"></span>`,
      a11y: [
        "role=\"status\" with a label gives the loading state a name; a bare spinning element announces nothing.",
        "Respect prefers-reduced-motion: the token package stops the rotation and holds a static ring.",
      ],
      keywords: ["loading", "progress", "wait", "busy"],
    }),

  component("skeleton", "Skeleton", "feedback",
    "Shape-matched placeholders for a first load. Faster than a spinner because the layout does not jump.",
    {
      snippet: `<div class="col" style="gap:10px">
  <div class="skeleton" style="height:14px;width:42%"></div>
  <div class="skeleton" style="height:14px;width:88%"></div>
  <div class="skeleton" style="height:14px;width:64%"></div>
</div>`,
      a11y: [
        "Hide the skeleton from assistive technology (aria-hidden) and expose one busy status for the region.",
        "Match the final text block's dimensions, otherwise the skeleton causes a second layout shift.",
      ],
      keywords: ["placeholder", "loading", "shimmer"],
    }),

  component("progress", "Progress bar", "feedback",
    "Determinate progress with a label. Colour carries emphasis; the number carries the truth.",
    {
      snippet: `<div class="row" style="justify-content:space-between;margin-bottom:6px">
  <span class="small">KYC review</span><span class="small mono">2 of 3</span>
</div>
<div class="progress" role="progressbar" aria-valuenow="66" aria-valuemin="0" aria-valuemax="100" aria-label="KYC review">
  <i style="width:66%"></i>
</div>`,
      a11y: [
        "The progressbar role needs aria-valuenow, min and max, plus a label. A div with a width is not progress.",
        "If the value changes while the user is on the page, keep aria-valuenow in sync or the announcement is stale.",
      ],
      keywords: ["meter", "completion", "percentage"],
    }),

  component("empty-state", "Empty state", "feedback",
    "The screen after a filter returns nothing, or before the first record exists. It should say what to do next.",
    {
      snippet: `<div class="empty">
  <strong>No bookings yet</strong>
  <p class="mb-0">When you book a worker, the job appears here with its escrow status.</p>
  <button class="btn primary sm mt-2">Browse services</button>
</div>`,
      a11y: [
        "The heading inside the empty state should be a real heading if the region has one; do not rely on bold text alone.",
        "Distinguish \"nothing yet\" from \"nothing matched\" in the copy. The user needs to know which action fixes it.",
      ],
      keywords: ["zero", "none", "blank", "no results"],
    }),

  component("badge", "Badge", "data",
    "A tiny status label. Five semantic tones plus a neutral default.",
    {
      snippet: `<span class="badge green"><span class="dot pulse"></span> live</span>
<span class="badge gold">escrow held</span>
<span class="badge blue">matched</span>
<span class="badge red">disputed</span>
<span class="badge purple">KYC review</span>`,
      a11y: [
        "Badge text is small. Keep the label to one or two words and never make the badge the only place a status is explained.",
        "The pulsing dot animates; it is decorative, so mark it aria-hidden if the badge has text.",
      ],
      keywords: ["status", "pill", "label", "tone"],
    }),

  component("tag", "Tag", "data",
    "A removable or selectable attribute. Tags describe content; badges describe state.",
    {
      snippet: `<span class="tag">Plumbing</span>
<span class="tag selected">Emergency</span>
<span class="tag">Baneshwor <button class="tag-x" aria-label="Remove Baneshwor filter">&times;</button></span>`,
      a11y: [
        "A remove control inside a tag needs its own accessible label that names the tag.",
        "Do not use a tag as a button without the button role and keyboard handling, or use a real button.",
      ],
      keywords: ["chip", "filter", "attribute", "removable"],
    }),

  component("avatar", "Avatar", "data",
    "Person or organisation identity: image, initials fallback, and a stacked group with a +N overflow.",
    {
      snippet: `<div class="stack">
  <span class="avatar">SG</span>
  <span class="avatar blue">RK</span>
  <span class="avatar green">DM</span>
  <span class="avatar purple">+4</span>
</div>`,
      a11y: [
        "Initials are decorative when the name is adjacent; otherwise give the avatar an aria-label with the full name.",
        "Never encode status in the avatar colour alone. Use a badge with text.",
      ],
      keywords: ["person", "initials", "profile", "stack"],
    }),

  component("card", "Card", "data",
    "The default surface for a group of related content. One idea per card, no nested cards.",
    {
      snippet: `<div class="card">
  <div class="card-head"><h3>Deep cleaning, 2 BHK</h3><span class="spacer"></span><span class="badge green">paid</span></div>
  <p>Booked for Saturday, 9:00 AM. Escrow releases when you mark the job complete.</p>
  <div class="row"><span class="small muted">Total</span><span class="spacer"></span><strong>NPR 3,200</strong></div>
</div>`,
      a11y: [
        "A card is not a control. If the whole card is clickable, wrap the title in a link and make the link's target fill the card with a positioned pseudo-element.",
        "Use a real heading for the card title so heading navigation works.",
      ],
      keywords: ["panel", "surface", "container"],
    }),

  component("stat", "Stat", "data",
    "A single number with a label, an optional delta and a sparkline. Tabular figures keep columns aligned.",
    {
      snippet: `<div class="stat">
  <div class="stat-label">Jobs completed</div>
  <div class="row" style="align-items:baseline;gap:10px">
    <div class="stat-value gold">1,284</div>
    <span class="stat-delta up">▲ 12.4%</span>
  </div>
  <span class="small muted">vs previous 30 days</span>
</div>`,
      a11y: [
        "The delta arrow is decorative; include a plus or minus sign in the text so the direction survives without colour.",
        "Write the comparison window next to the number. A delta with no baseline is a rumour.",
      ],
      keywords: ["metric", "kpi", "number", "delta"],
    }),

  component("table", "Table", "data",
    "Dense records with a sticky header, right-aligned numbers and row hover. Scrolls horizontally instead of squashing.",
    {
      snippet: `<div class="table-wrap">
  <table class="table">
    <thead><tr><th>Job</th><th>Worker</th><th class="num">Amount</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td class="strong">#GK-2481</td><td>Sita Gurung</td><td class="num">NPR 3,200</td><td><span class="badge green">paid</span></td></tr>
      <tr><td class="strong">#GK-2480</td><td>Ramesh Karki</td><td class="num">NPR 1,850</td><td><span class="badge gold">escrow</span></td></tr>
    </tbody>
  </table>
</div>`,
      a11y: [
        "Use <th scope=\"col\"> so each cell is announced with its column name.",
        "Right-align numbers and use tabular figures; the eye compares a column faster than it reads a row.",
        "A horizontally scrolling table needs a visible cue or a shadow edge, or the user never discovers the extra column.",
      ],
      keywords: ["grid", "records", "list", "data"],
    }),

  component("tabs", "Tabs", "navigation",
    "Sibling views at the same level. Tabs do not nest, and a tab is not a link to another page.",
    {
      snippet: `<div class="tabs" role="tablist" aria-label="Job details">
  <button class="tab active" role="tab" aria-selected="true" data-tab="timeline">Timeline</button>
  <button class="tab" role="tab" aria-selected="false" data-tab="payment">Payment</button>
</div>
<div data-tab-panel="timeline">Timeline content.</div>
<div data-tab-panel="payment" hidden>Payment content.</div>`,
      a11y: [
        "Roving tabindex: only the active tab is in the tab order, and left/right arrows move between tabs.",
        "Each tab needs aria-controls and each panel needs role=\"tabpanel\" and a label.",
        "If the views are URL-addressable, use links and let the router own the state.",
      ],
      keywords: ["sections", "switcher", "panels"],
    }),

  component("breadcrumb", "Breadcrumb", "navigation",
    "Location in a hierarchy, not a substitute for the browser Back button.",
    {
      snippet: `<nav class="breadcrumb" aria-label="Breadcrumb">
  <a href="#">Jobs</a><span aria-hidden="true">/</span>
  <a href="#">#GK-2481</a><span aria-hidden="true">/</span>
  <span aria-current="page">Dispute</span>
</nav>`,
      a11y: [
        "The nav needs an aria-label; \"Breadcrumb\" is the conventional one.",
        "Mark the current page with aria-current=\"page\" and render it as text, not a link.",
      ],
      keywords: ["path", "hierarchy", "location"],
    }),

  component("sidebar-nav", "Sidebar nav", "navigation",
    "Primary navigation for an app shell. The active item is marked with a background and a border, not colour alone.",
    {
      snippet: `<nav class="col" aria-label="Workspace" style="gap:4px">
  <span class="nav-label">Workspace</span>
  <a class="nav-item active" href="#jobs" aria-current="page"><span class="nav-dot"></span>Jobs</a>
  <a class="nav-item" href="#workers"><span class="nav-dot"></span>Workers</a>
  <a class="nav-item" href="#wallet"><span class="nav-dot"></span>Wallet</a>
</nav>`,
      a11y: [
        "Use a real nav element with a label; there can be more than one nav on a page.",
        "The active item gets aria-current=\"page\" and a visible non-colour cue.",
        "Keep the same order on every screen. Reordering navigation by usage is disorienting.",
      ],
      keywords: ["menu", "app shell", "primary", "side"],
    }),

  component("pagination", "Pagination", "navigation",
    "Page controls for a table or list. Show the total, not only the page number.",
    {
      snippet: `<nav class="pagination" aria-label="Bookings pages">
  <button class="btn sm" disabled>Previous</button>
  <span class="small muted">Page <b>2</b> of 14 · 268 bookings</span>
  <button class="btn sm">Next</button>
</nav>`,
      a11y: [
        "The nav label should name the collection: \"Bookings pages\".",
        "Disable Previous on the first page rather than hiding it, so the layout does not jump.",
        "Announce the new page number and result count after navigation; the DOM swap alone is silent.",
      ],
      keywords: ["pages", "next", "previous", "paging"],
    }),

  component("dropdown", "Dropdown menu", "navigation",
    "A short list of actions attached to a trigger. Closes on Esc and on outside click; returns focus to the trigger.",
    {
      snippet: `<div class="dropdown">
  <button class="btn" aria-haspopup="menu" aria-expanded="false">More actions</button>
  <div class="dropdown-menu" role="menu" hidden>
    <button role="menuitem">Reschedule</button>
    <button role="menuitem">Message worker</button>
    <button role="menuitem" class="danger">Open dispute</button>
  </div>
</div>`,
      a11y: [
        "aria-haspopup and aria-expanded on the trigger; the menu needs role=\"menu\" and each item role=\"menuitem\".",
        "Esc closes and returns focus to the trigger. Arrow keys move within the menu.",
        "Menus are not for navigation to other pages; use links for that.",
      ],
      keywords: ["menu", "actions", "overflow", "popover"],
    }),

  component("tooltip", "Tooltip", "overlays",
    "A short clarification on hover or focus. Not a place for essential information, and never the only label.",
    {
      snippet: `<button class="btn sm tooltip" data-tip="Escrow releases after the job is marked complete">Escrow held</button>
<span class="tooltip" data-tip="Updated 4 minutes ago" tabindex="0">sync status</span>`,
      a11y: [
        "Tooltips must open on focus as well as hover, and close on Esc.",
        "Do not put interactive content inside a tooltip, and do not use it to label an icon button.",
        "On touch, a tooltip on hover is unreachable. The information must also be in the page.",
      ],
      keywords: ["hint", "hover", "help", "title"],
    }),

  component("modal", "Modal dialog", "overlays",
    "A blocking task. Focus is trapped inside, Esc closes, and the trigger gets focus back. Never nest one modal in another.",
    {
      snippet: `<button class="btn" id="open-dispute">Open dispute</button>
<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="dispute-title" hidden>
  <div class="modal">
    <h3 id="dispute-title">Open a dispute</h3>
    <p>The escrow stays held until both sides respond. This usually takes two working days.</p>
    <div class="row" style="justify-content:flex-end"><button class="btn sm">Cancel</button><button class="btn primary sm">Open dispute</button></div>
  </div>
</div>`,
      a11y: [
        "aria-modal=\"true\" plus aria-labelledby is the minimum. Focus must move into the dialog when it opens.",
        "Trap Tab inside the dialog while it is open; Esc closes it and focus returns to the trigger.",
        "For destructive confirmation, make the safe action the default focus and name the consequence in the button.",
      ],
      keywords: ["dialog", "overlay", "confirm", "focus trap"],
    }),
];

export const COMPONENT_COUNT = COMPONENTS.length;

export function getComponent(id) {
  return COMPONENTS.find((c) => c.id === id) || null;
}

export function componentsByGroup(group) {
  return COMPONENTS.filter((c) => c.group === group);
}

export function groupMeta(id) {
  return COMPONENT_GROUPS.find((g) => g.id === id) || null;
}

/** Records for the docs search index. */
export function componentSearchRecords() {
  return COMPONENTS.map((c) => ({
    id: `component-${c.id}`,
    type: "component",
    title: c.name,
    subtitle: groupMeta(c.group)?.name || c.group,
    text: [c.summary, ...c.notes, ...c.a11y, c.snippet].join(" "),
    tags: [c.id, c.group, ...c.keywords],
    href: `#/components/${c.id}`,
  }));
}
