/**
 * The job lifecycle for GharKo Sathi, mirrored from lib/core/state_machine.dart.
 *
 * This is a deliberately explicit table rather than a switch buried in a screen,
 * because the same rules gate the customer app, the worker app and the admin
 * dispute queue. The Dart implementation is the app's copy; this module is the
 * version the JavaScript tests and the case-study site run. Both read
 * test/vectors/job_flow.json, so the two implementations cannot quietly diverge.
 */

export const STATUSES = [
  "draft", "requested", "matching", "matched", "enRoute", "inProgress",
  "completed", "paid", "disputed", "refunded", "cancelled", "closed",
];

/** Every legal edge. Anything not listed here is rejected. */
export const TRANSITIONS = {
  draft: ["requested"],
  requested: ["matching", "cancelled"],
  matching: ["matched", "requested", "cancelled"],
  matched: ["enRoute", "cancelled", "disputed"],
  enRoute: ["inProgress", "cancelled", "disputed"],
  inProgress: ["completed", "disputed"],
  completed: ["paid", "disputed"],
  paid: ["disputed", "closed"],
  disputed: ["refunded", "paid", "closed"],
  refunded: ["closed"],
  cancelled: ["closed"],
  closed: [],
};

/** Guards run after the edge check. They encode the product rules, not UI state. */
export const GUARDS = {
  "matching->matched": (context) => Boolean(context.workerId),
  "completed->paid": (context) => context.escrowHeld === true && context.proofUploaded === true,
  "enRoute->cancelled": (context) => context.feeAccepted === true,
  "matched->cancelled": (context) => context.feeAccepted === true,
  "inProgress->disputed": (context) => Boolean(context.reason),
  "completed->disputed": (context) => Boolean(context.reason),
  "paid->disputed": (context) => Boolean(context.reason) && Boolean(context.withinDisputeWindow),
  "disputed->refunded": (context) => context.reviewComplete === true,
};

export function isStatus(value) {
  return STATUSES.includes(value);
}

export function allowedTargets(from) {
  if (!isStatus(from)) throw new Error(`unknown status "${from}"`);
  return TRANSITIONS[from];
}

export function guardName(from, to) {
  return `${from}->${to}`;
}

/**
 * Can this edge happen? Returns `{ ok, reason }` instead of throwing so screens
 * can render a disabled button with its explanation.
 */
export function canTransition(from, to, context = {}) {
  if (!isStatus(from)) return { ok: false, reason: `unknown status "${from}"` };
  if (!isStatus(to)) return { ok: false, reason: `unknown status "${to}"` };
  const targets = TRANSITIONS[from];
  if (!targets.includes(to)) return { ok: false, reason: `${from} cannot move to ${to}` };
  const guard = GUARDS[guardName(from, to)];
  if (guard && !guard(context)) return { ok: false, reason: `guard failed for ${from} -> ${to}` };
  return { ok: true, reason: "allowed" };
}

/** Apply one transition, returning a new immutable job snapshot. */
export function transition(job, to, context = {}, now = Date.now()) {
  const check = canTransition(job.status, to, context);
  if (!check.ok) throw new Error(`illegal transition: ${check.reason}`);
  const history = [...(job.history || []), { from: job.status, to, at: now, note: context.note || "" }];
  return { ...job, status: to, updatedAt: now, history };
}

/**
 * Run a path from a starting job. Used by the tests and the flow diagram.
 * Returns the final job or throws with the edge that failed.
 */
export function runPath(start, path, contextFor = () => ({}), now = Date.UTC(2026, 9, 28, 9, 0, 0)) {
  return path.reduce((job, to, index) => transition(job, to, contextFor(job, to, index), now + index * 60_000), start);
}

/** A fresh job for the booking screen. */
export function createJob({ id, serviceId, customerId, address = "", createdAt = Date.now() } = {}) {
  return {
    id,
    serviceId,
    customerId,
    address,
    status: "draft",
    workerId: null,
    createdAt,
    updatedAt: createdAt,
    history: [],
  };
}

export function isTerminal(status) {
  return status === "closed";
}

/** Escrow is releasable only from completed, with proof and a held payment. */
export function escrowState(job) {
  if (["disputed", "refunded"].includes(job.status)) return "frozen";
  if (job.status === "paid" || job.status === "closed") return "released";
  if (job.status === "completed") return "releasable";
  return "held";
}

export const FLOWS = {
  happy: ["requested", "matching", "matched", "enRoute", "inProgress", "completed", "paid", "closed"],
  dispute: ["requested", "matching", "matched", "enRoute", "inProgress", "completed", "disputed", "refunded", "closed"],
  cancel: ["requested", "matching", "matched", "cancelled", "closed"],
};
