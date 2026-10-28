/**
 * A small TTL cache with a stale fallback. The Expo app shows cached listings
 * while the network request is in flight; if the request fails, the stale copy is
 * better than an empty screen, as long as the UI says it is stale.
 */
export function createCache({ ttlMs = 60_000, now = () => Date.now() } = {}) {
  const entries = new Map();

  return {
    set(key, value, at = now()) {
      entries.set(key, { value, storedAt: at });
      return value;
    },

    /** Fresh copy or null. */
    get(key) {
      const entry = entries.get(key);
      if (!entry) return null;
      if (now() - entry.storedAt > ttlMs) return null;
      return entry.value;
    },

    /** Cached copy regardless of age, with its age in ms. */
    stale(key) {
      const entry = entries.get(key);
      if (!entry) return null;
      return { value: entry.value, ageMs: now() - entry.storedAt };
    },

    /** get(), else stale() tagged as stale, else null — the read path the app uses. */
    read(key) {
      const fresh = this.get(key);
      if (fresh !== null) return { value: fresh, stale: false, ageMs: 0 };
      const old = this.stale(key);
      if (old) return { value: old.value, stale: true, ageMs: old.ageMs };
      return { value: null, stale: false, ageMs: 0 };
    },

    invalidate(key) { return entries.delete(key); },
    clear() { entries.clear(); },
    size() { return entries.size; },
    keys() { return [...entries.keys()]; },
  };
}

/**
 * Wrap an async source: return the cached value immediately (fresh or stale) and
 * refresh in the background. This is the behaviour the feed needs: no spinner on
 * a screen that already has content.
 */
export async function cachedFetch(cache, key, fetchFn, onUpdate) {
  const cached = cache.read(key);
  const request = fetchFn().then((value) => {
    cache.set(key, value);
    if (onUpdate) onUpdate(cache.read(key));
    return value;
  });
  return { cached: cached.value, stale: cached.stale, request };
}
