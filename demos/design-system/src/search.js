/**
 * Documentation search. Small enough to run over an in-memory array on every
 * keystroke; the point is ranking, not scale.
 *
 * Ranking rules, in order:
 *   exact title            100
 *   title prefix            60
 *   title contains          40
 *   tag exact               30
 *   tag contains            18
 *   subtitle contains       12
 *   body term hit            8 per term
 *   all query terms present   6 bonus
 * Ties break by record order, which keeps navigation stable between keystrokes.
 */

function normalise(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9#._-]+/g, " ")
    .trim();
}

function terms(query) {
  return normalise(query).split(" ").filter(Boolean);
}

export function search(index, query, { limit = 12 } = {}) {
  const parts = terms(query);
  if (!parts.length) return [];
  const folded = index.map((record) => {
    const title = normalise(record.title);
    return {
      record,
      title,
      titleWords: new Set(title.split(" ")),
      subtitle: normalise(record.subtitle),
      text: normalise(record.text),
      tags: (record.tags || []).map(normalise),
    };
  });

  const scored = [];
  folded.forEach((entry, order) => {
    let score = 0;
    let matched = 0;
    for (const term of parts) {
      let termScore = 0;
      if (entry.title === term) termScore = Math.max(termScore, 120);
      else if (entry.titleWords.has(term)) termScore = Math.max(termScore, 90);
      else if (entry.title.startsWith(term)) termScore = Math.max(termScore, 60);
      else if (entry.title.includes(term)) termScore = Math.max(termScore, 40);

      const tagExact = entry.tags.some((tag) => tag === term);
      const tagPartial = entry.tags.some((tag) => tag.includes(term));
      if (tagExact) termScore = Math.max(termScore, 30);
      else if (tagPartial) termScore = Math.max(termScore, 18);

      if (entry.subtitle.includes(term)) termScore = Math.max(termScore, 12);
      if (entry.text.includes(term)) termScore += 8;

      if (termScore > 0) { matched++; score += termScore; }
    }
    if (matched === parts.length && parts.length > 1) score += 6;
    if (score > 0) scored.push({ ...entry.record, score, order });
  });

  return scored
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map(({ order, score, ...record }) => ({ ...record, score }));
}

/** Return the matched substring ranges for a <mark> renderer on titles. */
export function matchRanges(text, query) {
  const needle = normalise(query);
  if (!needle) return [];
  const haystack = normalise(text);
  const ranges = [];
  for (const term of needle.split(" ").filter(Boolean)) {
    let from = 0;
    for (;;) {
      const at = haystack.indexOf(term, from);
      if (at === -1) break;
      ranges.push([at, at + term.length]);
      from = at + term.length;
    }
  }
  return ranges.sort((a, b) => a[0] - b[0]);
}
