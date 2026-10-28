/**
 * Offline-first mutation queue, mirrored from lib/core/offline_queue.dart.
 *
 * Field workers lose signal in stairwells and basements. A job status change made
 * offline has to survive the app being killed and must apply exactly once, in
 * order. The queue stores idempotency keys, deduplicates retries by key, and
 * stops at the first failure so a later update cannot overtake an earlier one.
 */

const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;

export function backoffFor(attempts) {
  if (attempts <= 0) return 0;
  return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** (attempts - 1));
}

export function createQueue(initial = []) {
  const operations = initial.map((operation) => ({ attempts: 0, createdAt: 0, ...operation }));
  const keys = new Set(operations.map((operation) => operation.key));

  return {
    /** Add an operation. A repeated key is a no-op, which is what makes retries safe. */
    enqueue({ key, type, payload = {}, createdAt = 0 }) {
      if (!key) throw new Error("offline operation needs a key");
      if (keys.has(key)) return { added: false, reason: "duplicate", size: operations.length };
      keys.add(key);
      operations.push({ key, type, payload, attempts: 0, createdAt });
      return { added: true, reason: "queued", size: operations.length };
    },

    size() { return operations.length; },

    pending() { return operations.map((operation) => ({ ...operation })); },

    /** Highest-signal check for the UI badge: are we waiting on the network? */
    isDrained() { return operations.length === 0; },

    first() { return operations[0] ? { ...operations[0] } : null; },

    /**
     * Attempt to send queued work in order. The handler returns truthy on success
     * or throws (or returns false) on failure. A failure stops the flush.
     *
     * Returns a summary instead of throwing, because callers are usually
     * background tasks and the UI only needs the counts.
     */
    flush(handler) {
      let sent = 0;
      const failed = [];
      while (operations.length) {
        const operation = operations[0];
        operation.attempts += 1;
        let ok = false;
        try { ok = handler(operation) !== false; } catch { ok = false; }
        if (ok) {
          operations.shift();
          keys.delete(operation.key);
          sent += 1;
        } else {
          failed.push({ ...operation });
          break;
        }
      }
      const retryInMs = operations.length ? backoffFor(operations[0].attempts) : 0;
      const exhausted = operations.length > 0 && operations[0].attempts >= MAX_ATTEMPTS;
      return { sent, failed, remaining: operations.length, retryInMs, exhausted };
    },

    /** Drop an operation that will never succeed (for example after a 422). */
    discard(key) {
      const index = operations.findIndex((operation) => operation.key === key);
      if (index === -1) return false;
      keys.delete(key);
      operations.splice(index, 1);
      return true;
    },

    serialize() {
      return JSON.stringify(operations.map((operation) => ({ ...operation })));
    },

    restore(serialized) {
      const parsed = JSON.parse(serialized);
      if (!Array.isArray(parsed)) throw new Error("serialized queue must be an array");
      operations.length = 0;
      keys.clear();
      parsed.forEach((operation) => {
        keys.add(operation.key);
        operations.push({ attempts: 0, createdAt: 0, ...operation });
      });
      return operations.length;
    },
  };
}

export const QUEUE_LIMITS = { MAX_ATTEMPTS, BASE_BACKOFF_MS, MAX_BACKOFF_MS };
