// Compose Cookbook demo.
//
// The catalog data in stacks-data.js is generated from the compose files in the
// repository. The validation panel is not decoration: it runs the same linter
// (../src/lint.js) the CLI uses, against the same YAML string shown in the panel.
import { STACKS } from "./stacks-data.js";
import { lintCompose } from "../src/lint.js";
import { parseYaml } from "../src/yaml.js";

const $ = A.$, el = A.el, fmt = A.fmt;

const RULES = [
  { id: "yaml", label: "YAML parses as a compose document", kinds: ["yaml", "structure", "services", "service-shape"] },
  { id: "images", label: "Every image has a pinned tag", kinds: ["image", "unpinned-image"] },
  { id: "healthcheck", label: "Every service has a healthcheck", kinds: ["healthcheck"] },
  { id: "restart", label: "Restart policies are set", kinds: ["restart"] },
  { id: "database-port", label: "Databases do not publish host ports", kinds: ["database-port"] },
  { id: "bind-mount", label: "Bind mounts are read-only", kinds: ["bind-mount"] },
  { id: "declarations", label: "Volumes and networks are declared", kinds: ["volume-declaration", "network-declaration", "depends-on"] },
  { id: "env", label: ".env.example documents each variable", kinds: ["env-example"] },
];

const state = { slug: null, tab: "compose" };

const bySlug = (slug) => STACKS.find((stack) => stack.slug === slug) ?? STACKS[0];
const envPairs = (envExample) => String(envExample ?? "").split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#") && line.includes("="))
  .map((line) => {
    const index = line.indexOf("=");
    return { key: line.slice(0, index), value: line.slice(index + 1) };
  });

/* ------------------------------------------------------------------ sidebar */

function renderList() {
  const list = STACKS;
  $("#top-stats").textContent = `${list.length} stacks · ${list.reduce((sum, stack) => sum + stack.services.length, 0)} services`;
  $("#stack-list").replaceChildren(...list.map((stack, index) =>
    el("div", {
      class: `stack-item ${stack.slug === state.slug ? "active" : ""}`,
      role: "button", tabindex: "0",
      onclick: () => openStack(stack.slug),
      onkeydown: (event) => { if (event.key === "Enter") openStack(stack.slug); },
    },
      el("span", { class: "num", text: String(index + 1).padStart(2, "0") }),
      el("span", { text: stack.title }),
      el("span", { class: "n", text: `${stack.services.length} svc` }))));
}

/* -------------------------------------------------------------------- detail */

function renderTopology(stack) {
  const doc = parseYaml(stack.compose);
  const networks = Object.keys(doc?.networks ?? {});
  $("#topo-network").textContent = networks.length ? `network: ${networks.join(", ")}` : "no network declared";
  $("#topo-sub").textContent = `${stack.services.length} service${stack.services.length === 1 ? "" : "s"}${networks.length ? " on a private bridge network" : ""}`;

  const nodes = [];
  stack.services.forEach((service, index) => {
    if (index > 0) nodes.push(el("span", { class: "topo-link", text: "⇄", title: "same compose network" }));
    nodes.push(el("div", { class: "svc-node" },
      el("div", { class: "svc-name" },
        el("span", { class: "dot", style: "color:var(--green)" }),
        el("span", { text: service.name })),
      el("div", { class: "svc-image", title: service.image, text: service.image }),
      el("div", { class: "svc-meta" },
        el("span", { text: service.healthcheck ? "healthcheck" : "no healthcheck" }),
        service.ports.length ? el("span", { text: `${service.ports.length} port${service.ports.length === 1 ? "" : "s"}` }) : el("span", { text: "internal" }),
        service.memLimit ? el("span", { class: "mono", text: service.memLimit }) : null)));
  });
  $("#topology").replaceChildren(...nodes);

  $("#service-table").replaceChildren(A.dataTable({
    columns: [
      { label: "Service", render: (service) => el("span", { class: "strong", text: service.name }) },
      { label: "Image", render: (service) => el("span", { class: "mono small muted", text: service.image }) },
      { label: "Health", width: "90px", render: (service) => service.healthcheck ? el("span", { class: "badge green", text: "check" }) : el("span", { class: "badge red", text: "none" }) },
      { label: "Ports", width: "180px", render: (service) => el("span", { class: "mono small", text: service.ports.length ? service.ports.join(", ") : "internal only" }) },
      { label: "Memory", width: "80px", align: "right", render: (service) => el("span", { class: "mono small muted", text: service.memLimit ?? ", " }) },
    ],
    rows: stack.services,
  }));
}

function renderChecks(stack) {
  const lint = lintCompose(stack.compose, { envExample: stack.envExample });
  const statusFor = (rule) => {
    const errors = lint.errors.filter((issue) => rule.kinds.includes(issue.rule));
    if (errors.length) return { status: "fail", detail: errors[0].message };
    const warnings = lint.warnings.filter((issue) => rule.kinds.includes(issue.rule));
    if (warnings.length) return { status: "warn", detail: warnings[0].message };
    return { status: "pass", detail: null };
  };

  const rows = RULES.map((rule) => {
    const result = statusFor(rule);
    return el("div", { class: `check-row ${result.status}`, title: result.detail ?? "" },
      el("span", { class: "check-mark", text: result.status === "pass" ? "✓" : result.status === "warn" ? "!" : "✕" }),
      el("span", { text: rule.label }),
      el("span", { class: "rule", text: rule.id }));
  });

  // Surface any warning that is not covered by one of the headline rules.
  const covered = new Set(RULES.flatMap((rule) => rule.kinds));
  for (const issue of [...lint.errors, ...lint.warnings]) {
    if (covered.has(issue.rule)) continue;
    rows.push(el("div", { class: "check-row warn" },
      el("span", { class: "check-mark", text: "!" }),
      el("span", { text: issue.message }),
      el("span", { class: "rule", text: issue.rule })));
  }

  $("#check-list").replaceChildren(...rows);
  const failed = lint.errors.length > 0;
  const warned = lint.warnings.length > 0;
  const badge = $("#check-status");
  badge.textContent = failed ? "FAIL" : warned ? "WARN" : "PASS";
  badge.className = `badge ${failed ? "red" : warned ? "gold" : "green"}`;
}

function renderEnv(stack) {
  const pairs = envPairs(stack.envExample);
  $("#env-keys").replaceChildren(...(pairs.length
    ? pairs.map((pair) => el("div", { class: "env-row" },
      el("code", { text: pair.key }),
      el("span", { class: "spacer" }),
      el("span", { class: "val", title: pair.value, text: pair.value || "(empty)" })))
    : [el("div", { class: "small muted", text: "This stack needs no variables." })]));
  const commands = [`cd stacks/${stack.slug}`, "cp .env.example .env", "docker compose up -d", "docker compose ps"];
  $("#run-commands").replaceChildren(...commands.map((command) => el("code", { text: command })));
  return commands;
}

function renderCode(stack) {
  const content = state.tab === "compose" ? stack.compose : stack.envExample;
  $("#yaml-view").textContent = content;
  $("#file-lines").textContent = `${content.split("\n").length} lines`;
  document.querySelectorAll("#file-tabs .tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.file === state.tab));
  $("#copy-file").textContent = state.tab === "compose" ? "Copy" : "Copy";
}

function render(stack) {
  $("#stack-title").textContent = stack.title;
  $("#stack-path").textContent = `stacks/${stack.slug}`;
  $("#stack-summary").textContent = stack.summary;
  $("#stack-tags").replaceChildren(...stack.tags.map((tag) => el("span", { class: "badge", text: tag })));
  renderTopology(stack);
  renderChecks(stack);
  const commands = renderEnv(stack);
  renderCode(stack);
  $("#copy-run").onclick = () => copy(commands.join("\n"), "commands");
  $("#copy-stack").onclick = () => copy(stack.compose, "docker-compose.yml");
  $("#copy-file").onclick = () => copy(state.tab === "compose" ? stack.compose : stack.envExample, `stacks/${stack.slug}/${state.tab === "compose" ? "docker-compose.yml" : ".env.example"}`);
  window.currentCommands = commands;
}

/* ------------------------------------------------------------------- copy */

async function copy(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    A.toast(`Copied ${label}`, "success", 1600);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    try {
      document.execCommand("copy");
      A.toast(`Copied ${label}`, "success", 1600);
    } catch {
      A.toast("Clipboard is blocked in this browser", "error");
    } finally {
      area.remove();
    }
  }
}

/* ---------------------------------------------------------------- routing */

function openStack(slug) {
  state.slug = slug;
  state.tab = "compose";
  if (location.hash !== `#${slug}`) history.replaceState(null, "", `#${slug}`);
  render(bySlug(slug));
  renderList();
  window.scrollTo({ top: 0 });
}

function route() {
  const requested = (location.hash || "#postgres").slice(1);
  openStack(STACKS.some((stack) => stack.slug === requested) ? requested : STACKS[0].slug);
}

function wire() {
  $("#file-tabs").addEventListener("click", (event) => {
    const tab = event.target.closest("[data-file]");
    if (!tab) return;
    state.tab = tab.dataset.file;
    renderCode(bySlug(state.slug));
  });
  window.addEventListener("hashchange", route);
}

wire();
route();
