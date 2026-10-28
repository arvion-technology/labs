// AWS Baseline demo application.
//
// PROJECT_DATA is generated from the real .tf files by scripts/build-data.mjs.
// This file only renders it: no Terraform is evaluated in the browser.
import { PROJECT_DATA, SOURCE_HASH } from "./data.js";

const { el, $, fmt } = A;

const state = {
  view: "module",
  moduleName: "network",
  exampleName: "prod",
  tab: "overview",
};

const escapeHtml = (text) => String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const HCL_TOKEN = /(#[^\n]*|"(?:\\.|[^"\\])*"|\b(?:resource|variable|output|module|provider|terraform|locals|data|true|false|null|for|in|dynamic|content|count|required_version|required_providers|source)\b|\b\d+(?:\.\d+)?\b)/g;

function highlightHcl(code) {
  let html = "";
  let last = 0;
  for (const match of code.matchAll(HCL_TOKEN)) {
    html += escapeHtml(code.slice(last, match.index));
    const token = match[0];
    const kind = token.startsWith("#") ? "tf-comment"
      : token.startsWith('"') ? "tf-string"
        : /^\d/.test(token) ? "tf-number" : "tf-keyword";
    html += `<span class="${kind}">${escapeHtml(token)}</span>`;
    last = match.index + token.length;
  }
  return html + escapeHtml(code.slice(last));
}

const currentModule = () => PROJECT_DATA.modules.find((module) => module.name === state.moduleName) || PROJECT_DATA.modules[0];
const currentExample = () => PROJECT_DATA.examples.find((example) => example.name === state.exampleName) || PROJECT_DATA.examples[0];

/* -------------------------------------------------------------- sidebars */

function renderModuleList() {
  $("#module-count").textContent = String(PROJECT_DATA.modules.length);
  $("#module-list").replaceChildren(...PROJECT_DATA.modules.map((module) =>
    el("button", {
      class: "picker-item" + (state.view === "module" && module.name === state.moduleName ? " active" : ""),
      onclick: () => selectModule(module.name),
    },
    el("span", {},
      el("span", { class: "picker-name", text: module.name }),
      el("span", { class: "picker-key", text: `modules/${module.name}` })),
    el("span", { class: "picker-count", text: `${module.resources.length}r` }))));
}

function renderExampleList() {
  $("#example-list").replaceChildren(...PROJECT_DATA.examples.map((example) =>
    el("button", {
      class: "picker-item" + (state.view === "example" && example.name === state.exampleName ? " active" : ""),
      onclick: () => selectExample(example.name),
    },
    el("span", {},
      el("span", { class: "picker-name", text: `examples/${example.name}` }),
      el("span", { class: "picker-key", text: `${example.modules.length} modules wired` })),
    el("span", { class: "picker-count", text: example.name === "prod" ? "multi-az" : "cheap" }))));
}

function renderDocs() {
  $("#doc-list").replaceChildren(...PROJECT_DATA.docs.map((doc) =>
    el("a", {
      class: "doc-link",
      href: `https://github.com/arvion-technology/aws-baseline/blob/main/${doc.file}`,
      target: "_blank",
      rel: "noopener",
    },
    el("span", { text: doc.title || doc.file }),
    el("span", { class: "doc-file", text: doc.file }))));
}

/* ---------------------------------------------------------------- detail */

function renderTabs() {
  const tabs = state.view === "module"
    ? [
      ["overview", "Overview"],
      ["inputs", `Inputs (${currentModule().inputs.length})`],
      ["outputs", `Outputs (${currentModule().outputs.length})`],
      ["source", "Source"],
    ]
    : [
      ["wiring", "Wiring"],
      ["variables", `Variables (${currentExample().variables.length})`],
      ["source", "Source"],
    ];
  if (!tabs.some(([id]) => id === state.tab)) state.tab = tabs[0][0];
  $("#detail-tabs").replaceChildren(...tabs.map(([id, label]) =>
    el("button", {
      class: "tab" + (state.tab === id ? " active" : ""),
      onclick: () => { state.tab = id; renderDetail(); },
    }, label)));
}

function statCard(label, value, sub) {
  return el("div", { class: "card" },
    el("div", { class: "stat" },
      el("div", { class: "stat-label", text: label }),
      el("div", { class: "stat-value", text: value }),
      el("div", { class: "small muted", text: sub })));
}

function moduleOverview(module) {
  const typeCounts = module.resources.reduce((counts, resource) => {
    counts[resource.type] = (counts[resource.type] || 0) + 1;
    return counts;
  }, {});
  const types = Object.entries(typeCounts).sort((left, right) => right[1] - left[1]);
  return el("div", {},
    el("p", { class: "module-description", text: module.description }),
    el("div", { class: "overview-grid" },
      statCard("Resources", String(module.resources.length), "Terraform resources"),
      statCard("Inputs", String(module.inputs.length), `${module.inputs.filter((input) => input.required).length} required`),
      statCard("Outputs", String(module.outputs.length), "consumed by the root module"),
      statCard("Resource types", String(types.length), "distinct AWS resource types")),
    el("div", { class: "card-head", style: "margin:16px 0 8px" },
      el("div", { class: "card-title", style: "font-size:13px" }, "Resource types"),
      el("span", { class: "spacer" }),
      el("span", { class: "small muted" }, `source: modules/${module.name}/main.tf`)),
    el("div", { class: "type-list" }, ...types.map(([type, count]) =>
      el("div", { class: "type-row" }, el("span", { text: type }), el("span", { class: "badge", text: `${count}×` })))));
}

function inputsTable(module) {
  const wrap = el("div", { class: "table-scroll" },
    A.dataTable({
      columns: [
        { key: "name", label: "Input", render: (row) => el("span", { class: "mono", text: row.name }) },
        { key: "type", label: "Type", render: (row) => el("span", { class: "mono muted", text: row.type }) },
        {
          key: "default",
          label: "Default",
          render: (row) => (row.required
            ? el("span", { class: "badge gold", text: "required" })
            : el("span", { class: "mono muted", text: row.default.length > 28 ? row.default.slice(0, 28) + "…" : row.default })),
        },
        { key: "description", label: "Description", render: (row) => el("span", { class: "small", text: row.description }) },
      ],
      rows: module.inputs,
    }));
  return wrap;
}

function outputsTable(module) {
  return el("div", { class: "table-scroll" },
    A.dataTable({
      columns: [
        { key: "name", label: "Output", render: (row) => el("span", { class: "mono", text: row.name }) },
        { key: "description", label: "Description", render: (row) => el("span", { class: "small", text: row.description }) },
        { key: "value", label: "Value", render: (row) => el("span", { class: "mono muted", text: row.value }) },
      ],
      rows: module.outputs,
    }));
}

function sourceView(source, caption) {
  return el("div", {},
    el("div", { class: "row", style: "margin-bottom:8px" },
      el("span", { class: "small muted", text: caption }),
      el("span", { class: "spacer" }),
      el("span", { class: "badge mono", text: ".tf" })),
    el("pre", { class: "code code-view" }, el("code", { html: highlightHcl(source) })));
}

function exampleWiring(example) {
  return el("div", {},
    el("p", { class: "module-description", text: example.description }),
    el("div", { class: "row", style: "margin-bottom:10px" },
      el("span", { class: "badge green", text: `${example.modules.length} modules` }),
      el("span", { class: "badge", text: `${example.variables.length} root variables` }),
      el("span", { class: "badge", text: `${example.outputs.length} outputs` })),
    el("div", { class: "wiring-grid" },
      ...example.modules.map((module) =>
        el("div", { class: "wiring-card" },
          el("div", { class: "wiring-name", text: module.name }),
          el("div", { class: "wiring-source", text: module.source }),
          el("div", { class: "wiring-inputs" },
            ...Object.keys(module.inputs).map((input) => el("span", { text: input })))))));
}

function exampleVariables(example) {
  return el("div", { class: "table-scroll" },
    A.dataTable({
      columns: [
        { key: "name", label: "Variable", render: (row) => el("span", { class: "mono", text: row.name }) },
        { key: "type", label: "Type", render: (row) => el("span", { class: "mono muted", text: row.type }) },
        { key: "description", label: "Description", render: (row) => el("span", { class: "small", text: row.description }) },
      ],
      rows: example.variables,
    }));
}

function renderDetail() {
  const module = currentModule();
  const example = currentExample();
  if (state.view === "module") {
    $("#detail-title").textContent = module.title || module.name;
    $("#detail-sub").textContent = `modules/${module.name} · ${module.resources.length} resources · ${module.inputs.length} inputs`;
  } else {
    $("#detail-title").textContent = `examples/${example.name}`;
    $("#detail-sub").textContent = `${example.modules.length} module blocks · ${example.sourcePreview.split("\n").length}+ lines`;
  }
  renderTabs();

  let body;
  if (state.view === "module") {
    if (state.tab === "inputs") body = inputsTable(module);
    else if (state.tab === "outputs") body = outputsTable(module);
    else if (state.tab === "source") body = sourceView(module.sourcePreview, `modules/${module.name}/main.tf (first 90 lines)`);
    else body = moduleOverview(module);
  } else if (state.tab === "variables") body = exampleVariables(example);
  else if (state.tab === "source") body = sourceView(example.sourcePreview, `examples/${example.name}/main.tf (first 90 lines)`);
  else body = exampleWiring(example);

  $("#detail-body").replaceChildren(body);
}

/* --------------------------------------------------------------- actions */

function setHash(hash) {
  history.replaceState(null, "", `#${hash}`);
}

function selectModule(name) {
  state.view = "module";
  state.moduleName = name;
  state.tab = "overview";
  renderModuleList();
  renderExampleList();
  renderDetail();
  setHash(name);
}

function selectExample(name) {
  state.view = "example";
  state.exampleName = name;
  state.tab = "wiring";
  renderModuleList();
  renderExampleList();
  renderDetail();
  setHash(`example-${name}`);
}

/* ------------------------------------------------------------------ boot */

function applyHash() {
  const hash = location.hash.replace("#", "");
  if (!hash) return;
  if (hash.startsWith("example-")) {
    const name = hash.slice("example-".length);
    if (PROJECT_DATA.examples.some((example) => example.name === name)) {
      state.view = "example";
      state.exampleName = name;
      state.tab = "wiring";
    }
    return;
  }
  if (PROJECT_DATA.modules.some((module) => module.name === hash)) {
    state.view = "module";
    state.moduleName = hash;
    state.tab = "overview";
  }
}

function init() {
  applyHash();
  const totalResources = PROJECT_DATA.modules.reduce((sum, module) => sum + module.resources.length, 0);
  $("#modules-badge").textContent = `${PROJECT_DATA.modules.length} modules`;
  $("#resources-badge").textContent = `${totalResources} resources`;
  $("#hash-badge").textContent = `data ${SOURCE_HASH.slice(0, 10)}`;
  renderModuleList();
  renderExampleList();
  renderDocs();
  renderDetail();
}

init();
