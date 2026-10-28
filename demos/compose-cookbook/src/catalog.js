// Stack metadata and derivation used by the CLI validator, the tests and the
// generated demo data. Files on disk stay the single source of truth.

import { parseYaml } from "./yaml.js";
import { lintCompose } from "./lint.js";

export const STACK_META = Object.freeze({
  postgres: { title: "Postgres", tags: ["database", "postgres", "dev"] },
  "postgres-backup": { title: "Postgres + backups", tags: ["database", "backup", "production-shaped"] },
  redis: { title: "Redis", tags: ["cache", "redis", "dev"] },
  minio: { title: "MinIO", tags: ["object-storage", "s3", "dev"] },
  mailpit: { title: "Mailpit", tags: ["email", "smtp", "testing"] },
  prometheus: { title: "Prometheus", tags: ["observability", "metrics", "dev"] },
  "grafana-stack": { title: "Grafana + Prometheus", tags: ["observability", "dashboards", "dev"] },
  "kafka-lite": { title: "Kafka (lite)", tags: ["messaging", "kafka", "dev"] },
  rabbitmq: { title: "RabbitMQ", tags: ["messaging", "amqp", "dev"] },
  "nginx-proxy": { title: "nginx reverse proxy", tags: ["proxy", "tls", "edge"] },
  "sonarqube-lite": { title: "SonarQube (lite)", tags: ["code-quality", "ci", "dev"] },
  "localstack-lite": { title: "LocalStack (lite)", tags: ["aws", "emulation", "testing"] },
});

/** First prose paragraph of a README, used as the catalog summary. */
export function summarise(readme) {
  const lines = String(readme ?? "").split(/\r?\n/);
  const paragraph = [];
  let seenHeading = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (paragraph.length) break;
      continue;
    }
    if (trimmed.startsWith("#")) {
      if (paragraph.length) break;
      seenHeading = true;
      continue;
    }
    if (!seenHeading) continue;
    paragraph.push(trimmed);
  }
  return paragraph.join(" ").replace(/\s+/g, " ").trim();
}

/** Service summary rows for the demo and docs. */
export function serviceSummary(composeText) {
  const doc = parseYaml(composeText);
  const services = doc?.services ?? {};
  return Object.entries(services).map(([name, service]) => ({
    name,
    image: service.image ?? null,
    ports: Array.isArray(service.ports) ? service.ports.map(String) : [],
    healthcheck: Boolean(service.healthcheck?.test),
    restart: service.restart ?? null,
    dependsOn: service.depends_on ? Object.keys(service.depends_on) : [],
    volumes: Array.isArray(service.volumes) ? service.volumes.map(String) : [],
    memLimit: service.mem_limit ?? null,
  }));
}

/**
 * Build one catalog entry from the files on disk.
 * @param {{slug: string, compose: string, envExample: string, readme: string}} input
 */
export function extractStack({ slug, compose, envExample, readme }) {
  const meta = STACK_META[slug] ?? { title: slug, tags: [] };
  const lint = lintCompose(compose, { envExample, file: `stacks/${slug}/docker-compose.yml` });
  return {
    slug,
    title: meta.title,
    tags: [...meta.tags],
    summary: summarise(readme),
    services: serviceSummary(compose),
    compose,
    envExample,
    readme,
    envKeys: [...lint.envKeys].sort(),
    lint: {
      errors: lint.errors,
      warnings: lint.warnings,
      checks: lint.checks,
    },
  };
}

const META_ORDER = Object.keys(STACK_META);

/** Build the whole catalog in curated order so the demo and README agree. */
export function buildCatalog(files) {
  return files
    .map((file) => extractStack(file))
    .sort((a, b) => META_ORDER.indexOf(a.slug) - META_ORDER.indexOf(b.slug));
}
