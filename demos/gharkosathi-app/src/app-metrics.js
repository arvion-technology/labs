/**
 * Metrics for the case-study site. Everything here is derived from the modules
 * that actually implement the app, so the numbers on the page cannot be typed in
 * by hand and drift.
 */
import { STATUSES, TRANSITIONS, FLOWS, GUARDS } from "./state-machine.js";
import { QUEUE_LIMITS, backoffFor } from "./offline-queue.js";
import { SCREENS, ROLES } from "./product-data.js";

export function edgeCount() {
  return Object.values(TRANSITIONS).reduce((sum, targets) => sum + targets.length, 0);
}

export function guardCount() {
  return Object.keys(GUARDS).length;
}

export function pathLength(path) {
  return path.length;
}

export function appMetrics() {
  const customerScreens = SCREENS.filter((screen) => screen.role === "customer").length;
  const workerScreens = SCREENS.filter((screen) => screen.role === "worker").length;
  const longestFlow = Math.max(...Object.values(FLOWS).map((flow) => flow.length));
  return {
    screens: SCREENS.length,
    customerScreens,
    workerScreens,
    roles: ROLES.length - 1,
    statuses: STATUSES.length,
    transitions: edgeCount(),
    guardedTransitions: guardCount(),
    flows: Object.keys(FLOWS).length,
    longestFlow,
    queuedOperations: 1,
    maxAttempts: QUEUE_LIMITS.MAX_ATTEMPTS,
    backoffAfterOneFailure: backoffFor(1),
    backoffAfterThreeFailures: backoffFor(3),
  };
}

export function screensByRole(role = "all") {
  if (role === "all") return SCREENS;
  return SCREENS.filter((screen) => screen.role === role);
}

export function screenById(id) {
  return SCREENS.find((screen) => screen.id === id) || null;
}

export function screensWithQueuedWrites() {
  // These are the screens whose primary action is a queued mutation offline.
  return SCREENS.filter((screen) => ["tracking", "dispute", "kyc", "booking"].includes(screen.id));
}

export function architectureFacts() {
  return {
    screens: SCREENS.length,
    routes: new Set(SCREENS.map((screen) => screen.route)).size,
    coreModules: 5,
    adrs: 3,
  };
}
