// GharKo Sathi — case-study site.
// Screens, metrics, lifecycle and queue all come from ../src, the modules the
// tests exercise. This file renders; it does not re-implement the logic.
import {
  PRODUCT, SCREENS, ROLES, ARCHITECTURE_NOTES, CODE_HIGHLIGHTS,
} from "../src/product-data.js";
import { appMetrics, screensByRole, architectureFacts } from "../src/app-metrics.js";
import {
  FLOWS, STATUSES, TRANSITIONS, GUARDS, canTransition, transition, createJob, escrowState,
} from "../src/state-machine.js";
import { createQueue } from "../src/offline-queue.js";

const $ = A.$, $$ = A.$$, el = A.el;
const metrics = appMetrics();
const facts = architectureFacts();

/* --------------------------------------------------------------- utilities */

function escapeHTML(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function codeBlock(code, caption = "") {
  const pre = el("pre", { class: "code" });
  pre.innerHTML = `<code>${escapeHTML(code)}</code>`;
  return el("div", {}, caption ? el("div", { class: "small muted mb-1", text: caption }) : null, pre);
}

function sectionHead(title, description) {
  return el("div", { class: "section-head" }, el("h2", { text: title }), description ? el("p", { text: description }) : null);
}

function statCard(label, value, sub, tone = "gold") {
  return el("div", { class: "card" },
    el("div", { class: "stat" },
      el("div", { class: "stat-label", text: label }),
      el("div", { class: `stat-value ${tone}`, text: value }),
      el("div", { class: "small muted", text: sub })));
}

/* --------------------------------------------------------------- phone UI */

function uiItem(item) {
  switch (item.kind) {
    case "logo":
      return el("div", {},
        el("div", { class: "g-logo", text: item.text }),
        el("div", { class: "g-center", text: "Home services, verified." }));
    case "text":
      return el("div", { class: "g-center muted", text: item.text });
    case "progress":
      return el("div", {},
        el("div", { class: "g-progress-label" }, el("span", { text: item.label }), el("span", { text: `${item.value}%` })),
        el("div", { class: "g-progress" }, el("i", { style: `width:${item.value}%` })));
    case "search":
      return el("div", { class: "g-search" }, el("span", { text: "⌕" }), el("span", { text: item.text }));
    case "tiles":
      return el("div", { class: "g-tiles" }, ...item.items.map((label) => el("div", { class: "g-tile", text: label })));
    case "card":
      return el("div", { class: "g-card" }, el("b", { text: item.title }), el("span", { text: item.meta }));
    case "field":
      return el("div", { class: "g-field" }, el("label", { text: item.label }), el("span", { text: item.value }));
    case "slots":
      return el("div", { class: "g-slots" }, ...item.items.map((label, index) => el("span", { class: index === 0 ? "on" : "", text: label })));
    case "price":
      return el("div", { class: "g-price" }, el("span", { text: item.label }), el("b", { text: item.value }));
    case "cta":
      return el("div", { class: "g-cta", text: item.text });
    case "worker":
      return el("div", { class: "g-worker" },
        el("span", { class: "av", text: "SG" }),
        el("div", {}, el("b", { text: item.name }), el("span", { text: item.meta })),
        el("span", { class: "badge green", text: item.badge }));
    case "stats":
      return el("div", { class: "g-stats" }, ...item.items.map(([value, label]) =>
        el("div", {}, el("b", { text: value }), el("span", { text: label }))));
    case "steps":
      return el("div", { class: "g-steps" }, ...item.items.map((label, index) =>
        el("div", { class: index < item.active ? "done" : index === item.active ? "on" : "" }, el("i"), label)));
    case "upload":
      return el("div", { class: "g-upload" }, el("span", { text: "▧" }), el("span", { text: item.label }), el("em", { text: item.status }));
    case "warning":
      return el("div", { class: "g-warning", text: item.text });
    case "timeline":
      return el("div", { class: "g-timeline" }, ...item.items.map(([label, state]) =>
        el("div", { class: state === "done" ? "done" : state === "current" ? "now" : "" }, el("i"), label)));
    case "queue":
      return el("div", { class: "g-queue" }, el("span", { text: "◷" }), el("span", { text: item.text }));
    case "balance":
      return el("div", { class: "g-balance" },
        el("label", { text: item.label }), el("b", { text: item.value }), el("span", { text: item.meta }));
    case "rows":
      return el("div", { class: "g-rows" }, ...item.items.map(([label, value]) =>
        el("div", {}, el("span", { text: label }), el("span", { text: value }))));
    default:
      return null;
  }
}

function phone(screen) {
  return el("div", { class: `gphone ${screen.role === "worker" ? "is-worker" : ""}` },
    el("div", { class: "gphone-screen" },
      el("div", { class: "g-status" }, el("span", { text: screen.ui.status }), el("span", { text: "▮▮ 4G" })),
      el("div", { class: "g-appbar" }, el("span", { class: "back", text: "‹" }), el("span", { text: screen.ui.header })),
      el("div", { class: "g-body" }, ...screen.ui.body.map(uiItem)),
      el("div", { class: "g-tabs" }, ...screen.ui.footer.map((label) => el("span", { text: label })))));
}

/* --------------------------------------------------------------- overview */

function heroCluster() {
  const byId = (id) => SCREENS.find((screen) => screen.id === id);
  return el("div", { class: "phone-cluster", "aria-hidden": "true" },
    el("div", { class: "pos-a" }, phone(byId("services"))),
    el("div", { class: "pos-b" }, phone(byId("tracking"))),
    el("div", { class: "pos-c" }, phone(byId("wallet"))),
    el("div", { class: "cluster-tag" }, el("span", { class: "badge green" }, el("span", { class: "dot pulse" }), "escrow held"), el("span", { text: "one job, three screens" })));
}

function overviewPage(main) {
  main.append(el("section", { class: "case-hero" },
    el("div", {},
      el("div", { class: "eyebrow", text: "Flutter case study · live product" }),
      el("h1", {}, "Verified workers, ", el("em", { text: "held money" }), ", and a queue that survives a basement."),
      el("p", { class: "lede", text: PRODUCT.summary }),
      el("div", { class: "hero-actions" },
        el("a", { class: "btn primary", href: "#/screens", text: "See the eight screens" }),
        el("a", { class: "btn", href: "#/flow", text: "Inspect the lifecycle" })),
      el("div", { class: "case-meta" },
        el("span", {}, el("b", { text: "Flutter" }), " · Material 3"),
        el("span", {}, el("b", { text: "Live at" }), " gharkosewa.com"),
        el("span", {}, el("b", { text: String(metrics.screens) }), " screens in this sample"),
        el("span", {}, el("b", { text: "MIT" }), " licensed"))),
    heroCluster()));

  main.append(el("div", { class: "stat-row" },
    statCard("Screens", String(metrics.screens), "Customer and worker flows"),
    statCard("Lifecycle states", String(metrics.statuses), `${metrics.transitions} legal edges`, "blue"),
    statCard("Guarded transitions", String(metrics.guardedTransitions), "Escrow, KYC, disputes", "green"),
    statCard("Architecture decisions", String(facts.adrs), "Recorded as short ADRs")));

  main.append(el("section", { class: "section" },
    sectionHead("Three things that were actually hard", "A polished screen is not the interesting part. These three rules are."),
    el("div", { class: "problem-grid" },
      el("div", { class: "card problem-card" },
        el("div", { class: "tagline" }, "KYC GATE"),
        el("h3", { text: "A worker cannot be matched before verification" }),
        el("p", { text: "KYC is a five-state machine of its own. The matching repository filters on Worker.isVerified, so a screen cannot show an unverified worker as bookable, and a rejected application can resubmit without recapturing documents." })),
      el("div", { class: "card problem-card" },
        el("div", { class: "tagline" }, "ESCROW"),
        el("h3", { text: "The money is derived from the job, not stored twice" }),
        el("p", { text: "Held, releasable, released and frozen are computed from the job status. The wallet and the job timeline read the same value, which is why the app cannot show a released payment on a job that is still open." })),
      el("div", { class: "card problem-card" },
        el("div", { class: "tagline" }, "OFFLINE"),
        el("h3", { text: "A status change made without signal still applies once" }),
        el("p", { text: "Every mutation carries an idempotency key. The queue is ordered, stops at the first failure, persists through a process kill and retries with exponential backoff. A later update never overtakes an earlier one." })))));

  main.append(el("section", { class: "section" },
    sectionHead("Architecture", "Core logic has no Flutter imports, which is why it can be tested without a device."),
    el("div", { class: "arch-grid" },
      el("div", { class: "card arch-card" },
        el("h3", { text: "Repository layout" }),
        el("div", { class: "arch-tree" },
          "lib/\n",
          "├── main.dart, app.dart      ", el("b", { text: "app shell" }), "\n",
          "├── router.dart              ", el("b", { text: "named routes" }), "\n",
          "├── theme/                   ", el("b", { text: "tokens → Material 3" }), "\n",
          "├── core/\n",
          "│   ├── models.dart\n",
          "│   ├── state_machine.dart   ", el("b", { text: "pure Dart" }), "\n",
          "│   ├── offline_queue.dart   ", el("b", { text: "pure Dart" }), "\n",
          "│   ├── repository.dart\n",
          "│   └── mock_data.dart\n",
          "└── screens/                 ", el("b", { text: "8 screens" }))),
      el("div", { class: "code-card card" },
        el("div", { class: "cc-head" }, el("h3", { text: CODE_HIGHLIGHTS[0].title }), el("span", { class: "file", text: CODE_HIGHLIGHTS[0].file })),
        codeBlock(CODE_HIGHLIGHTS[0].code)))));

  main.append(el("div", { class: "product-banner" },
    el("div", {},
      el("h3", { text: "The product is live. This repository is the architecture sample." }),
      el("p", { text: "GharKo Sathi runs at gharkosewa.com. This repo mirrors the structure and the two hard pieces of logic; it is not the App Store binary and there is no store link to claim." })),
    el("a", { class: "btn primary sm", href: "https://gharkosewa.com", target: "_blank", rel: "noopener", text: "Open the product ↗" })));

  main.append(footer());
}

/* --------------------------------------------------------------- screens */

let roleFilter = "all";

function renderScreensPage(main) {
  main.append(el("div", { class: "crumb" }, el("a", { href: "#/overview", text: "Overview" }), el("span", { text: "/" }), el("span", { text: "Screens" })));
  main.append(el("div", { class: "section-head" },
    el("h2", { text: "Eight screens, two roles" }),
    el("p", { text: "Each frame is rendered from the screen record used by the tests: the header, body items and tab bar all come from src/product-data.js. The worker flow is one screen because KYC gates the rest." })));

  const chips = el("div", { class: "chips" }, ...ROLES.map((role) =>
    el("button", {
      class: `chip ${roleFilter === role.id ? "active" : ""}`,
      type: "button",
      text: role.id === "all" ? `${role.label} (${SCREENS.length})` : `${role.label} (${screensByRole(role.id).length})`,
      onclick: () => { roleFilter = role.id; render(); },
    })));
  main.append(chips);

  const grid = el("div", { class: "screen-grid" });
  for (const screen of screensByRole(roleFilter)) {
    grid.append(el("div", { class: "screen-cell" },
      phone(screen),
      el("div", { class: "screen-meta" },
        el("h3", {}, screen.name, el("span", { class: "badge", text: screen.role })),
        el("span", { class: "route", text: screen.route }),
        el("p", { text: screen.summary }))));
  }
  main.append(grid);
  main.append(footer());
}

/* --------------------------------------------------------------- lifecycle */

function flowPage(main) {
  main.append(el("div", { class: "crumb" }, el("a", { href: "#/overview", text: "Overview" }), el("span", { text: "/" }), el("span", { text: "Lifecycle" })));
  main.append(el("div", { class: "section-head" },
    el("h2", { text: "The job lifecycle, with the branches that matter" }),
    el("p", { text: `${metrics.statuses} states and ${metrics.transitions} legal edges. The happy path is the long horizontal line; disputes, cancellation and refunds are the parts that make the state machine worth having.` })));

  const strip = el("div", { class: "flow-strip" });
  FLOWS.happy.forEach((status, index) => {
    strip.append(el("div", { class: `flow-node ${index === 0 ? "start" : ""}` },
      el("b", { text: status }),
      el("span", { text: index === 0 ? "customer taps request" : `from ${FLOWS.happy[index - 1]}` })));
    if (index < FLOWS.happy.length - 1) strip.append(el("div", { class: "flow-arrow", text: "→" }));
  });
  main.append(strip);

  main.append(el("div", { class: "flow-branch" },
    el("span", { text: "Branches:" }),
    ...["matched → disputed", "inProgress → disputed", "completed → disputed", "disputed → refunded", "matched → cancelled"].map((branch) => el("span", { class: "pill", text: branch })),
    el("span", { class: "pill red", text: "paid → disputed (window)" })));

  const queueState = createQueue();
  const jobState = { job: createJob({ id: "GK-2481", serviceId: "svc_plumbing", customerId: "c_demo" }), online: false, log: [] };
  jobState.job = transition(jobState.job, "requested", {}, Date.UTC(2026, 9, 28, 9, 0));
  jobState.job = transition(jobState.job, "matching", {}, Date.UTC(2026, 9, 28, 9, 1));

  const queueList = el("div", { class: "queue-list" });
  const log = el("div", { class: "flow-log" });
  const queueStatus = el("div", { class: "small muted", text: "" });

  function renderQueue() {
    queueList.innerHTML = "";
    if (queueState.isDrained()) {
      queueList.append(el("div", { class: "queue-empty", text: "No queued operations. The next status change is saved here when offline." }));
    } else {
      queueState.pending().forEach((operation) => {
        queueList.append(el("div", { class: "queue-op pending" },
          el("code", { text: operation.key }),
          el("span", { text: operation.type }),
          el("span", { class: "status", text: `${operation.attempts} attempts` })));
      });
    }
    queueStatus.textContent = `${queueState.size()} queued · ${jobState.online ? "online" : "offline"} · job is ${jobState.job.status}`;
  }

  function advance() {
    const next = { requested: "matching", matching: "matched", matched: "enRoute", enRoute: "inProgress", inProgress: "completed", completed: "paid", paid: "closed" }[jobState.job.status];
    if (!next) { jobState.log.push(`${jobState.job.status}: terminal for this demo`); log.textContent = jobState.log.join("\n"); return; }
    const key = `${jobState.job.id}:${next}`;
    const added = queueState.enqueue({ key, type: "job.status", payload: { status: next }, createdAt: Date.now() }).added;
    if (!added) { jobState.log.push(`${key}: duplicate ignored`); log.textContent = jobState.log.join("\n"); return; }
    jobState.log.push(`${key}: queued${jobState.online ? " and sent immediately" : " (offline)"}`);
    if (jobState.online) {
      const result = queueState.flush((operation) => {
        const target = operation.payload.status;
        const workerId = target === "matched" ? "w_sita" : jobState.job.workerId;
        const context = { workerId, feeAccepted: true, reason: "the tap still drips", withinDisputeWindow: true, reviewComplete: true };
        if (target === "paid") jobState.job = { ...jobState.job, proofUploaded: true };
        try {
          jobState.job = transition(jobState.job, target, context, Date.now());
          jobState.log.push(`sent ${key} → ${target}`);
          return true;
        } catch (error) {
          jobState.log.push(`rejected ${key}: ${error.message}`);
          return false;
        }
      });
      if (result.exhausted) jobState.log.push("queue exhausted — user must resolve");
    }
    log.textContent = jobState.log.join("\n");
    renderQueue();
  }

  function toggle() {
    jobState.online = !jobState.online;
    if (jobState.online) {
      const result = queueState.flush((operation) => {
        const target = operation.payload.status;
        const workerId = target === "matched" ? "w_sita" : jobState.job.workerId;
        if (target === "paid") jobState.job = { ...jobState.job, proofUploaded: true };
        try {
          jobState.job = transition(jobState.job, target, { workerId, feeAccepted: true, reason: "the tap still drips", withinDisputeWindow: true, reviewComplete: true }, Date.now());
          jobState.log.push(`connection restored: sent ${operation.key} → ${target}`);
          return true;
        } catch (error) {
          jobState.log.push(`connection restored: rejected ${operation.key} (${error.message})`);
          return false;
        }
      });
      if (result.remaining === 0) jobState.log.push("queue drained");
    } else {
      jobState.log.push("connection lost: updates will queue");
    }
    log.textContent = jobState.log.join("\n");
    renderQueue();
  }

  renderQueue();

  main.append(el("div", { class: "flow-grid" },
    el("div", { class: "card queue-card" },
      el("h3", { text: "Offline queue, live" }),
      el("p", { text: "Advance the job while offline. Then reconnect and watch the queued operations flush in order. This is the same queue module the Dart tests cover." }),
      el("div", { class: "queue-actions" },
        el("button", { class: "btn sm primary", type: "button", text: "Advance status", onclick: advance }),
        el("button", { class: "btn sm", type: "button", text: "Toggle connection", onclick: toggle })),
      queueList,
      queueStatus,
      log),
    el("div", { class: "card queue-card" },
      el("h3", { text: "Escrow states are derived" }),
      el("p", { text: "The wallet never stores a second balance. These rows are computed by escrowState() from the same status values." }),
      A.dataTable({
        columns: [
          { key: "status", label: "Job status", render: (row) => el("span", { class: "mono", text: row.status }) },
          { key: "escrow", label: "Escrow", render: (row) => el("span", { class: `escrow-badge escrow-${row.escrow}`, text: row.escrow }) },
          { key: "meaning", label: "Meaning", render: (row) => el("span", { class: "small muted", text: row.meaning }) },
        ],
        rows: [
          { status: "matched", escrow: escrowState({ status: "matched" }), meaning: "Held until completion is confirmed." },
          { status: "completed", escrow: escrowState({ status: "completed" }), meaning: "Releasable once the customer confirms." },
          { status: "paid", escrow: escrowState({ status: "paid" }), meaning: "Released to the worker." },
          { status: "disputed", escrow: escrowState({ status: "disputed" }), meaning: "Frozen while both sides respond." },
        ],
      }),
      el("p", { class: "small muted", style: "margin-top:12px", text: `${GUARDS ? Object.keys(GUARDS).length : 0} guarded edges, including completion → paid and the dispute window.` }))));
  main.append(footer());
}

/* --------------------------------------------------------------- footer */

function footer() {
  return el("footer", { class: "case-footer" },
    el("span", { text: `GharKo Sathi case study · ${metrics.screens} screens · ${facts.routes} routes · MIT` }),
    el("span", { class: "spacer" }),
    el("a", { href: "https://gharkosewa.com", target: "_blank", rel: "noopener", text: "Live product" }),
    el("a", { href: "../docs/architecture.md", text: "Architecture" }),
    el("a", { href: "https://arviontech.net", target: "_blank", rel: "noopener", text: "Arvion Technologies" }));
}

/* --------------------------------------------------------------- routing */

const POSITIONS = Object.fromEntries(STATUSES.map((status) => [status, status]));

function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, "");
  return raw.split("/").filter(Boolean)[0] || "overview";
}

function setNav(view) {
  $$("[data-nav]").forEach((link) => link.classList.toggle("active", link.dataset.nav === view));
}

function render() {
  const view = parseRoute();
  const main = $("#view");
  main.innerHTML = "";
  setNav(view);
  if (view === "screens") renderScreensPage(main);
  else if (view === "flow") flowPage(main);
  else overviewPage(main);
  document.title = `${view === "overview" ? "Case study" : view === "screens" ? "Screens" : "Lifecycle"} — GharKo Sathi`;
  window.scrollTo({ top: 0 });
}

window.addEventListener("hashchange", render);
if (!location.hash) location.hash = "#/overview";
render();

// Keep the "active" tab honest after a deep link.
A.markActiveNav();
