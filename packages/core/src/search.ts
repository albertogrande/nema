// SPDX-License-Identifier: Apache-2.0
import GithubSlugger from 'github-slugger';
import type { Page, SearchHit } from './types.js';

/** Tokenize to lowercase `[a-z0-9]+` runs. */
export function tokenize(text: string): string[] {
  return String(text).toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

const HEADING_RE = /^#{1,6}\s+(.+)$/gm;

/**
 * The heading slug in effect at character offset `idx` — the most recent
 * heading at or before `idx`, slugged with `github-slugger` in document order
 * (so dedup numbering matches a real Markdown renderer). `''` if `idx` is above
 * the first heading.
 */
export function anchorFor(body: string, idx: number): string {
  const slugger = new GithubSlugger();
  let last = '';
  for (const m of body.matchAll(HEADING_RE)) {
    if (m.index !== undefined && m.index > idx) break;
    last = slugger.slug(m[1]!.trim());
  }
  return last;
}

/** Every heading slug in a body, in document order (with dedup numbering). */
export function headingSlugs(body: string): Set<string> {
  const slugger = new GithubSlugger();
  const slugs = new Set<string>();
  for (const m of body.matchAll(HEADING_RE)) slugs.add(slugger.slug(m[1]!.trim()));
  return slugs;
}

const K1 = 1.5;
const B = 0.75;

interface Indexed {
  page: Page;
  tf: Map<string, number>;
  len: number;
}

/**
 * BM25 full-text search over pages, with the title weighted (counted twice).
 * Standard parameters k1=1.5, b=0.75. Returns hits sorted by descending score,
 * each with a snippet and a deep-link anchor.
 */
export function search(pages: Page[], query: string, limit = 8): SearchHit[] {
  const terms = [...new Set(tokenize(query))];
  if (terms.length === 0) return [];

  const docs: Indexed[] = pages.map((page) => {
    const tokens = tokenize(`${page.title} ${page.title} ${page.body}`);
    const tf = new Map<string, number>();
    for (const tok of tokens) tf.set(tok, (tf.get(tok) ?? 0) + 1);
    return { page, tf, len: tokens.length };
  });

  const n = docs.length;
  const avgLen = docs.reduce((s, d) => s + d.len, 0) / (n || 1);

  const idf = new Map<string, number>();
  for (const t of terms) {
    const df = docs.filter((d) => d.tf.has(t)).length;
    idf.set(t, Math.log(1 + (n - df + 0.5) / (df + 0.5)));
  }

  const results: SearchHit[] = [];
  for (const d of docs) {
    let score = 0;
    for (const t of terms) {
      const f = d.tf.get(t) ?? 0;
      if (!f) continue;
      score += (idf.get(t) ?? 0) * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.len) / avgLen)));
    }
    if (score <= 0) continue;

    const bodyLower = d.page.body.toLowerCase();
    const hits = terms.map((t) => bodyLower.indexOf(t)).filter((i) => i >= 0);
    const idx = hits.length ? Math.min(...hits) : 0;
    const start = Math.max(0, idx - 60);
    const snippet = d.page.body
      .slice(start, start + 200)
      .replace(/\s+/g, ' ')
      .trim();

    results.push({
      path: d.page.path,
      title: d.page.title,
      score: Number(score.toFixed(4)),
      snippet,
      anchor: anchorFor(d.page.body, idx),
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
