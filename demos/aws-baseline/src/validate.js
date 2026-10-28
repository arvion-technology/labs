// Structural validation for the Terraform baseline.
//
// `terraform fmt` and `terraform validate` catch syntax, but they do not know
// our house rules: a database may not be public, a secret may not be a literal,
// every variable needs a description, and an example may only reference modules
// that exist in this repository. Those checks are implemented here so they run
// in CI even when Terraform is not installed.
import {
  parseHcl,
  syntaxIssues,
  variableDefinitions,
  outputDefinitions,
  resourceDefinitions,
  moduleBlocks,
  referencedVariables,
  blocksOfType,
  unquote,
} from "./hcl.js";

export const MODULES = ["network", "ecs-service", "rds", "static-site", "alarms", "budget"];

const has = (files, path) => Object.prototype.hasOwnProperty.call(files, path);
const read = (files, path) => files[path] ?? "";

const REQUIRED_ROOT = [
  "README.md",
  "docs/architecture.md",
  "docs/modules.md",
  "docs/state.md",
  "scripts/validate.mjs",
  ".github/workflows/ci.yml",
  "examples/dev/main.tf",
  "examples/dev/variables.tf",
  "examples/dev/outputs.tf",
  "examples/dev/terraform.tfvars.example",
  "examples/dev/README.md",
  "examples/prod/main.tf",
  "examples/prod/variables.tf",
  "examples/prod/outputs.tf",
  "examples/prod/terraform.tfvars.example",
  "examples/prod/README.md",
];

function checkStyle(files, errors, warnings) {
  for (const [path, content] of Object.entries(files)) {
    if (!path.endsWith(".tf")) continue;
    content.split("\n").forEach((line, index) => {
      const lineNumber = index + 1;
      if (line.includes("\t")) errors.push({ path, line: lineNumber, message: "tabs are not allowed in Terraform files" });
      if (/\s+$/.test(line) && line.trim() !== "") errors.push({ path, line: lineNumber, message: "trailing whitespace" });
      const indent = line.match(/^ */)[0].length;
      if (indent % 2 !== 0) warnings.push({ path, line: lineNumber, message: "indentation is not a multiple of two spaces" });
    });
  }
}

function checkSecrets(files, errors) {
  const secretPatterns = [
    { regex: /password\s*=\s*"([^"$]*?)"/g, message: "password literal in Terraform; pass it through a sensitive variable" },
    { regex: /AKIA[0-9A-Z]{16}/g, message: "AWS access key id committed" },
    { regex: /aws_secret_access_key\s*=\s*"[^"]+"/g, message: "AWS secret key committed" },
  ];
  for (const [path, content] of Object.entries(files)) {
    if (!path.endsWith(".tf") && !path.endsWith(".tfvars.example")) continue;
    for (const { regex, message } of secretPatterns) {
      regex.lastIndex = 0;
      for (const match of content.matchAll(regex)) {
        const value = match[1] || match[0];
        if (/REPLACE|CHANGE|EXAMPLE|your-|xxx/i.test(value)) continue;
        errors.push({ path, message: `${message} ("${match[0].slice(0, 40)}")` });
      }
    }
  }
}

function checkModule(files, name, errors, warnings) {
  const dir = `modules/${name}`;
  for (const file of ["main.tf", "variables.tf", "outputs.tf", "README.md"]) {
    if (!has(files, `${dir}/${file}`)) errors.push({ path: `${dir}/${file}`, message: "required module file is missing" });
  }
  if (!has(files, `${dir}/main.tf`)) return { variables: 0, outputs: 0, resources: 0 };

  const variables = variableDefinitions(read(files, `${dir}/variables.tf`));
  const outputs = outputDefinitions(read(files, `${dir}/outputs.tf`));
  const resources = resourceDefinitions(read(files, `${dir}/main.tf`));

  for (const variable of variables) {
    if (!variable.description) errors.push({ path: `${dir}/variables.tf`, message: `variable "${variable.name}" has no description` });
    if (!variable.type) errors.push({ path: `${dir}/variables.tf`, message: `variable "${variable.name}" has no type` });
  }
  for (const output of outputs) {
    if (!output.description) errors.push({ path: `${dir}/outputs.tf`, message: `output "${output.name}" has no description` });
  }

  // Every var.* used must be declared, and an unused variable is a smell.
  const declared = new Set(variables.map((variable) => variable.name));
  const used = new Set();
  for (const path of Object.keys(files)) {
    if (!path.startsWith(`${dir}/`) || !path.endsWith(".tf") || path.endsWith("variables.tf")) continue;
    for (const variable of referencedVariables(read(files, path))) used.add(variable);
  }
  for (const variable of used) {
    if (!declared.has(variable)) errors.push({ path: `${dir}`, message: `uses var.${variable} but never declares it` });
  }
  for (const variable of declared) {
    if (!used.has(variable)) warnings.push({ path: `${dir}`, message: `declares var.${variable} but never uses it` });
  }

  const readme = read(files, `${dir}/README.md`);
  for (const section of ["## Inputs", "## Outputs"]) {
    if (!readme.includes(section)) errors.push({ path: `${dir}/README.md`, message: `missing "${section}" section` });
  }

  const main = read(files, `${dir}/main.tf`);
  if (name === "rds") {
    if (!/publicly_accessible\s*=\s*false/.test(main)) errors.push({ path: `${dir}/main.tf`, message: "RDS must set publicly_accessible = false" });
    if (!/storage_encrypted\s*=\s*true/.test(main)) errors.push({ path: `${dir}/main.tf`, message: "RDS must set storage_encrypted = true" });
    const password = variables.find((variable) => variable.name === "password");
    if (password && !password.sensitive) errors.push({ path: `${dir}/variables.tf`, message: "the password variable must be sensitive" });
  }
  if (name === "static-site") {
    const parsed = parseHcl(main);
    const block = parsed.blocks.find((entry) => entry.type === "resource" && entry.labels[0] === "aws_s3_bucket_public_access_block");
    if (!block) errors.push({ path: `${dir}/main.tf`, message: "missing aws_s3_bucket_public_access_block" });
    else {
      for (const flag of ["block_public_acls", "block_public_policy", "ignore_public_acls", "restrict_public_buckets"]) {
        if (!new RegExp(`${flag}\\s*=\\s*true`).test(block.source)) {
          errors.push({ path: `${dir}/main.tf`, message: `${flag} must be true` });
        }
      }
    }
    if (/acl\s*=\s*"public-read/.test(main)) errors.push({ path: `${dir}/main.tf`, message: "public bucket ACLs are not allowed" });
  }
  if (name === "ecs-service") {
    if (/cidr_blocks\s*=\s*\["0\.0\.0\.0\/0"\]/.test(main) && /ingress\s*\{/.test(main)) {
      errors.push({ path: `${dir}/main.tf`, message: "the service security group must not allow public ingress" });
    }
    if (/resources\s*=\s*\["\*"\]/.test(main)) errors.push({ path: `${dir}/main.tf`, message: "IAM policy uses a wildcard resource" });
  }
  if (name === "network") {
    const parsed = parseHcl(main);
    if (!blocksOfType(parsed.blocks, "resource").some((entry) => entry.labels[0] === "aws_vpc")) {
      errors.push({ path: `${dir}/main.tf`, message: "network module must create a VPC" });
    }
  }

  return { variables: variables.length, outputs: outputs.length, resources: resources.length };
}

function checkExamples(files, errors) {
  const examples = {};
  for (const environment of ["dev", "prod"]) {
    const dir = `examples/${environment}`;
    const main = read(files, `${dir}/main.tf`);
    const parsed = parseHcl(main);
    const modules = moduleBlocks(main);
    if (!modules.length) errors.push({ path: `${dir}/main.tf`, message: "no module blocks found" });
    for (const module of modules) {
      if (!module.source.startsWith("../../modules/")) {
        errors.push({ path: `${dir}/main.tf`, message: `module "${module.name}" must reference ../../modules/...` });
        continue;
      }
      const moduleName = module.source.replace("../../modules/", "").replace(/\/$/, "");
      if (!MODULES.includes(moduleName)) errors.push({ path: `${dir}/main.tf`, message: `module "${module.name}" points at unknown module "${moduleName}"` });
      if (!has(files, `modules/${moduleName}/main.tf`)) errors.push({ path: `${dir}/main.tf`, message: `module source ${module.source} does not exist` });
    }
    if (!parsed.blocks.some((block) => block.type === "provider")) errors.push({ path: `${dir}/main.tf`, message: "missing provider block" });
    if (!/required_version/.test(main)) errors.push({ path: `${dir}/main.tf`, message: "missing required_version constraint" });
    const variables = new Set(variableDefinitions(read(files, `${dir}/variables.tf`)).map((variable) => variable.name));
    examples[environment] = { modules: modules.length, variables: variables.size };
  }
  return examples;
}

function checkCi(files, errors) {
  const ci = read(files, ".github/workflows/ci.yml");
  if (!ci) return;
  if (!ci.includes("node scripts/validate.mjs")) errors.push({ path: ".github/workflows/ci.yml", message: "CI does not run scripts/validate.mjs" });
  if (!/setup-terraform|hashicorp\/terraform/.test(ci)) errors.push({ path: ".github/workflows/ci.yml", message: "CI does not install Terraform for fmt/validate" });
}

/**
 * Validate a virtual file tree: `{ "path/to/file.tf": "contents" }`.
 * @returns {{ok: boolean, errors: Array, warnings: Array, stats: object}}
 */
export function validateBaseline(files) {
  const errors = [];
  const warnings = [];

  for (const path of REQUIRED_ROOT) {
    if (!has(files, path)) errors.push({ path, message: "required file is missing" });
  }

  for (const [path, content] of Object.entries(files)) {
    if (!path.endsWith(".tf")) continue;
    for (const issue of syntaxIssues(content)) errors.push({ path, message: `HCL syntax: ${issue}` });
  }

  const stats = { modules: 0, variables: 0, outputs: 0, resources: 0, examples: 0, files: Object.keys(files).length };
  for (const name of MODULES) {
    const moduleStats = checkModule(files, name, errors, warnings);
    stats.modules += 1;
    stats.variables += moduleStats.variables;
    stats.outputs += moduleStats.outputs;
    stats.resources += moduleStats.resources;
  }

  const examples = checkExamples(files, errors);
  stats.examples = Object.keys(examples).length;
  stats.exampleModules = examples;

  checkCi(files, errors);
  checkStyle(files, errors, warnings);
  checkSecrets(files, errors);

  return { ok: errors.length === 0, errors, warnings, stats };
}

/** Human-readable report for scripts/validate.mjs. */
export function formatValidation(result, { color = false } = {}) {
  const lines = [];
  const paint = (code, text) => (color ? `\u001b[${code}m${text}\u001b[0m` : text);
  lines.push(`checked ${result.stats.files} files: ${result.stats.modules} modules, ${result.stats.variables} variables, ${result.stats.outputs} outputs, ${result.stats.resources} resources, ${result.stats.examples} examples`);
  for (const warning of result.warnings) lines.push(paint(33, `warn  ${warning.path}: ${warning.message}`));
  for (const error of result.errors) lines.push(paint(31, `error ${error.path}: ${error.message}`));
  lines.push(result.ok ? paint(32, "structural checks passed") : paint(31, `${result.errors.length} structural problem(s)`));
  return lines.join("\n") + "\n";
}

export { unquote };
