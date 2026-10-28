// Compose linter: structural checks plus the mistakes that keep showing up in
// copy-pasted dev stacks. Runs on the parsed YAML, so it needs no Docker daemon.
//
// Severities are deliberate: an unpinned image, a published database port and a
// missing healthcheck are errors; missing resource limits are warnings.

import { parseYaml, YamlError } from "./yaml.js";

const DATABASE_IMAGES = /(^|\/)(postgres|mysql|mariadb|mongo|redis|clickhouse|cockroachdb)(:|\/|$)/i;
const IMAGE_WITH_TAG = /^[^\s:@]+(?::[^\s@]+)?(@sha256:[a-f0-9]+)?$/i;

export function parseImage(image) {
  if (typeof image !== "string" || !image.trim()) return null;
  const value = image.trim();
  if (!IMAGE_WITH_TAG.test(value)) return null;
  const digestIndex = value.indexOf("@");
  const withoutDigest = digestIndex === -1 ? value : value.slice(0, digestIndex);
  const lastColon = withoutDigest.lastIndexOf(":");
  const lastSlash = withoutDigest.lastIndexOf("/");
  const hasTag = lastColon > lastSlash;
  return {
    image: value,
    repository: hasTag ? withoutDigest.slice(0, lastColon) : withoutDigest,
    tag: hasTag ? withoutDigest.slice(lastColon + 1) : null,
    digest: digestIndex === -1 ? null : value.slice(digestIndex + 1),
    pinned: hasTag || digestIndex !== -1,
  };
}

function isDatabase(image) {
  const parsed = parseImage(image);
  return parsed ? DATABASE_IMAGES.test(parsed.repository) : false;
}

function hostPortBound(port) {
  const value = String(port);
  // "127.0.0.1:5432:5432" and "[::1]:5432:5432" are local-only.
  return /^(127\.0\.0\.1|\[::1\]|localhost):/.test(value);
}

function envVarsIn(value, found) {
  if (typeof value === "string") {
    for (const match of value.matchAll(/\$\{([A-Z0-9_]+)(?::-[^}]*)?\}/g)) found.add(match[1]);
    return;
  }
  if (Array.isArray(value)) { for (const entry of value) envVarsIn(entry, found); return; }
  if (value && typeof value === "object") { for (const entry of Object.values(value)) envVarsIn(entry, found); }
}

function envKeys(text) {
  const keys = new Set();
  for (const line of String(text).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Z0-9_]+)=/);
    if (match) keys.add(match[1]);
  }
  return keys;
}

/**
 * Lint one compose file.
 * @returns {{errors: Array, warnings: Array, checks: Array, services: number, stack: string|null}}
 */
export function lintCompose(text, { envExample = "", file = "docker-compose.yml" } = {}) {
  const errors = [];
  const warnings = [];
  const checks = [];
  const add = (level, rule, message) => {
    const item = { rule, message };
    if (level === "error") errors.push(item); else warnings.push(item);
  };
  const pass = (rule) => checks.push({ rule, status: "pass" });

  let doc;
  try {
    doc = parseYaml(text);
  } catch (error) {
    if (error instanceof YamlError) return { file, stack: null, services: 0, errors: [{ rule: "yaml", message: error.message }], warnings, checks, envKeys: new Set() };
    throw error;
  }
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    return { file, stack: null, services: 0, errors: [{ rule: "structure", message: "compose file must be a mapping" }], warnings, checks, envKeys: new Set() };
  }
  if (doc.version) add("warn", "version-key", "top-level version is obsolete in Compose v2");
  if (!doc.services || typeof doc.services !== "object" || Array.isArray(doc.services)) {
    return { file, stack: doc.name ?? null, services: 0, errors: [...errors, { rule: "services", message: "services mapping is missing" }], warnings, checks, envKeys: new Set() };
  }

  const services = Object.entries(doc.services);
  const referencedVolumes = new Set();
  const referencedNetworks = new Set();
  const foundVars = new Set();

  for (const [name, service] of services) {
    if (!service || typeof service !== "object") {
      add("error", "service-shape", `${name}: service must be a mapping`);
      continue;
    }

    const image = parseImage(service.image);
    if (!service.image) add("error", "image", `${name}: image is missing`);
    else if (!image) add("error", "image", `${name}: "${service.image}" is not a valid image reference`);
    else if (!image.pinned) add("error", "unpinned-image", `${name}: image "${service.image}" has no tag; pin a version (no implicit latest)`);
    else if (image.tag === "latest") add("error", "unpinned-image", `${name}: image "${service.image}" uses latest; pin a version`);

    if (!service.healthcheck || !service.healthcheck.test) add("error", "healthcheck", `${name}: no healthcheck.test`);
    else {
      const health = service.healthcheck;
      if (!health.interval || !health.timeout || !health.retries) {
        add("warn", "healthcheck-detail", `${name}: healthcheck is missing interval/timeout/retries`);
      }
    }

    if (!service.restart) add("error", "restart", `${name}: no restart policy`);
    if (!service.mem_limit) add("warn", "resources", `${name}: no mem_limit; one container can take the host down`);
    if (!service.cpus) add("warn", "resources", `${name}: no cpus limit`);

    if (service.privileged === true) add("error", "privileged", `${name}: privileged: true`);
    if (service.network_mode === "host") add("error", "host-network", `${name}: network_mode: host`);

    const ports = Array.isArray(service.ports) ? service.ports : [];
    if (isDatabase(service.image) && ports.length) {
      const exposed = ports.filter((port) => !hostPortBound(port));
      if (exposed.length) add("error", "database-port", `${name}: database publishes host port(s) ${exposed.join(", ")}; keep it internal`);
      else add("warn", "database-port-local", `${name}: database is bound to localhost; remove the port unless you need a host client`);
    }

    const volumes = Array.isArray(service.volumes) ? service.volumes : [];
    for (const volume of volumes) {
      const value = String(volume);
      if (value.startsWith("./") || value.startsWith("../") || value.startsWith("/")) {
        if (!/:ro$/.test(value)) add("error", "bind-mount", `${name}: bind mount "${value}" must be read-only (:ro)`);
      } else {
        const source = value.split(":")[0];
        if (source && !source.startsWith("$")) referencedVolumes.add(source);
      }
    }

    if (Array.isArray(service.networks)) for (const network of service.networks) referencedNetworks.add(String(network));
    else if (service.networks && typeof service.networks === "object") for (const network of Object.keys(service.networks)) referencedNetworks.add(network);

    envVarsIn(service, foundVars);

    if (service.depends_on) {
      for (const [dependency, condition] of Object.entries(service.depends_on)) {
        if (!doc.services[dependency]) add("error", "depends-on", `${name}: depends_on "${dependency}" is not a service`);
        if (condition && typeof condition === "object" && condition.condition && condition.condition !== "service_healthy" && condition.condition !== "service_started") {
          add("warn", "depends-on", `${name}: unusual depends_on condition "${condition.condition}"`);
        }
      }
    }
  }

  const declaredVolumes = new Set(doc.volumes && typeof doc.volumes === "object" ? Object.keys(doc.volumes) : []);
  for (const volume of referencedVolumes) {
    if (!declaredVolumes.has(volume)) add("error", "volume-declaration", `volume "${volume}" is used but not declared under top-level volumes`);
  }
  const declaredNetworks = new Set(doc.networks && typeof doc.networks === "object" ? Object.keys(doc.networks) : []);
  for (const network of referencedNetworks) {
    if (!declaredNetworks.has(network)) add("error", "network-declaration", `network "${network}" is used but not declared under top-level networks`);
  }

  const documented = envKeys(envExample);
  for (const variable of [...foundVars].sort()) {
    if (!documented.has(variable)) add("warn", "env-example", `environment variable ${variable} is not documented in .env.example`);
  }

  if (!errors.length) pass("structure");
  return {
    file,
    stack: doc.name ?? null,
    services: services.length,
    errors,
    warnings,
    checks,
    envKeys: foundVars,
  };
}

export const SEVERITY_ORDER = ["error", "warn", "pass"];
