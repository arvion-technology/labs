/**
 * Listing search and filters. The Expo app runs the same rules locally against
 * the offline cache while the network request is in flight, so the result count
 * does not flicker between two different filter implementations.
 */

export const CATEGORIES = [
  "mobiles", "electronics", "furniture", "fashion", "vehicles", "home", "hobbies",
];

export function normalise(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function matchesQuery(listing, query) {
  const needle = normalise(query);
  if (!needle) return true;
  const haystack = normalise([listing.title, listing.description, listing.category, listing.location].join(" "));
  return needle.split(/\s+/).filter(Boolean).every((term) => haystack.includes(term));
}

export function withinPrice(listing, { minPrice = 0, maxPrice = Infinity } = {}) {
  return listing.price >= minPrice && listing.price <= maxPrice;
}

export function withinDistance(listing, maxDistance = Infinity) {
  return listing.distanceKm <= maxDistance;
}

const SORTERS = {
  newest: (a, b) => b.createdAt - a.createdAt,
  priceAsc: (a, b) => a.price - b.price,
  priceDesc: (a, b) => b.price - a.price,
  nearest: (a, b) => a.distanceKm - b.distanceKm,
  relevance: (a, b) => (b.relevance ?? 0) - (a.relevance ?? 0) || b.createdAt - a.createdAt,
};

export function sortListings(listings, sort = "newest") {
  const sorter = SORTERS[sort];
  if (!sorter) throw new Error(`unknown sort "${sort}"`);
  return [...listings].sort(sorter);
}

export function applyFilters(listings, filters = {}) {
  const {
    query = "", category = "all", minPrice = 0, maxPrice = Infinity,
    maxDistance = Infinity, sort = "relevance", verifiedOnly = false,
  } = filters;
  if (category !== "all" && !CATEGORIES.includes(category)) {
    throw new Error(`unknown category "${category}"`);
  }
  const filtered = listings.filter((listing) => {
    if (category !== "all" && listing.category !== category) return false;
    if (!matchesQuery(listing, query)) return false;
    if (!withinPrice(listing, { minPrice, maxPrice })) return false;
    if (!withinDistance(listing, maxDistance)) return false;
    if (verifiedOnly && !listing.sellerVerified) return false;
    return true;
  });
  return sortListings(filtered, sort);
}

export function facetCounts(listings, filters = {}) {
  const counts = { all: 0 };
  for (const category of CATEGORIES) counts[category] = 0;
  for (const listing of listings) {
    if (!matchesQuery(listing, filters.query || "")) continue;
    counts.all += 1;
    if (counts[listing.category] !== undefined) counts[listing.category] += 1;
  }
  return counts;
}

/** Search suggestions from listing titles, cheapest source of discovery offline. */
export function suggestions(listings, prefix, limit = 6) {
  const needle = normalise(prefix);
  if (needle.length < 2) return [];
  const seen = new Set();
  const out = [];
  for (const listing of listings) {
    const words = normalise(listing.title).split(/\s+/).filter(Boolean);
    for (const word of words) {
      if (word.startsWith(needle) && !seen.has(word)) {
        seen.add(word);
        out.push(word);
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}
