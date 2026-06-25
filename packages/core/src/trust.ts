// SPDX-License-Identifier: Apache-2.0
import type { Provenance } from '@docforge/schema';
import type { Page } from './types.js';

/**
 * Strength of the review evidence a page carries in its provenance.
 *   - `anchored`: a human review IS recorded AND a `reviewed` transition points
 *     at a commit — the tamper-evident anchor that `forge audit` can later
 *     resolve against git history.
 *   - `asserted`: a human review is claimed, but no `reviewed` transition carries
 *     a commit. The claim is structurally valid yet unanchored — trust it less.
 *   - `none`: the page is not human-reviewed; there is nothing to anchor.
 */
export type ReviewEvidence = 'anchored' | 'asserted' | 'none';

/** The trust signals computed for a single page. */
export interface PageTrust {
  path: string;
  title: string;
  status: string;
  authoredBy: 'ai' | 'human' | 'mixed' | 'unknown';
  /** A human is on record as reviewer (`provenance.reviewed_by` is present). */
  reviewed: boolean;
  /**
   * AI-authored (`ai` or `mixed`) but not human-reviewed — the core governance
   * risk the platform exists to surface. Excludes `deprecated` pages (retired).
   */
  aiUnreviewed: boolean;
  /**
   * A `reviewed` page past its `review_by` (the read-time `stale` the freshness
   * gate enforces: `review_by ≤ today`).
   */
  stale: boolean;
  /** Strength of the review evidence; see {@link ReviewEvidence}. */
  evidence: ReviewEvidence;
}

/**
 * Corpus-level trust posture — the aggregate a docs owner, reviewer, or buyer
 * reads to answer "how much of this content can I trust right now?" in one
 * glance. Pure data; the same report drives both `forge trust` and the
 * `/trust` dashboard so the CLI and the site can never disagree.
 */
export interface TrustReport {
  total: number;
  /** The date the posture was computed against (UTC `YYYY-MM-DD`). */
  today: string;
  /** Count of pages per stored status (`stub`/`draft`/`reviewed`/`deprecated`/…). */
  byStatus: Record<string, number>;
  /** Count of pages per `authored_by` (pages with no provenance count as `unknown`). */
  byAuthor: { ai: number; human: number; mixed: number; unknown: number };
  reviewedCount: number;
  /** Reviewed share of the corpus, 0–100, rounded. */
  reviewedPct: number;
  /** Pages authored wholly or partly by an agent (`ai` + `mixed`). */
  aiAuthoredCount: number;
  /** AI-authored share of the corpus, 0–100, rounded. */
  aiAuthoredPct: number;
  /** Hero risk number: AI-authored pages with no human review. */
  aiUnreviewedCount: number;
  /** Reviewed pages past their `review_by`. */
  staleCount: number;
  /** Reviewed pages whose review is anchored to a commit. */
  anchoredCount: number;
  /** Reviewed pages asserting review with no commit anchor (`forge audit`, next, resolves these). */
  assertedCount: number;
  /** Every page's trust signals, in the corpus's own order. */
  pages: PageTrust[];
  /** The at-risk subsets, pre-filtered so a caller can name the riskiest pages without re-deriving. */
  risks: {
    aiUnreviewed: PageTrust[];
    stale: PageTrust[];
    asserted: PageTrust[];
  };
}

export interface TrustOptions {
  /** Override "today" (UTC `YYYY-MM-DD`). Defaults to the current date. */
  today?: string;
}

function toISODateUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function authoredBy(prov: Provenance | undefined): PageTrust['authoredBy'] {
  return prov?.authored_by ?? 'unknown';
}

/**
 * Classify the review evidence a page carries. A page is `anchored` only when a
 * human reviewer is recorded AND some `reviewed` transition carries a commit —
 * the hash an auditor can resolve. `reviewed_by` without that anchor is merely
 * `asserted`; a page with no reviewer is `none`.
 */
function reviewEvidence(prov: Provenance | undefined): ReviewEvidence {
  if (!prov?.reviewed_by) return 'none';
  const anchored = prov.transitions.some((t) => t.to === 'reviewed' && !!t.commit);
  return anchored ? 'anchored' : 'asserted';
}

function pageTrust(page: Page, today: string): PageTrust {
  const prov = page.provenance;
  const by = authoredBy(prov);
  const reviewed = prov?.reviewed_by != null;
  const isDeprecated = page.status === 'deprecated';

  const reviewBy = page.frontmatter.review_by;
  const stale = page.status === 'reviewed' && typeof reviewBy === 'string' && reviewBy <= today;

  return {
    path: page.path,
    title: page.title,
    status: page.status,
    authoredBy: by,
    reviewed,
    aiUnreviewed: !isDeprecated && (by === 'ai' || by === 'mixed') && !reviewed,
    stale,
    evidence: reviewEvidence(prov),
  };
}

function pct(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

/**
 * Compute the corpus trust posture from loaded pages. Renderer-agnostic and
 * pure (given `today`): the single source of truth behind `forge trust` and the
 * `/trust` dashboard.
 */
export function computeTrustReport(pages: Page[], opts: TrustOptions = {}): TrustReport {
  const today = opts.today ?? toISODateUTC(new Date());
  const rows = pages.map((p) => pageTrust(p, today));

  const byStatus: Record<string, number> = {};
  const byAuthor = { ai: 0, human: 0, mixed: 0, unknown: 0 };
  let reviewedCount = 0;
  let aiAuthoredCount = 0;
  let anchoredCount = 0;
  let assertedCount = 0;

  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    byAuthor[r.authoredBy] += 1;
    if (r.reviewed) reviewedCount += 1;
    if (r.authoredBy === 'ai' || r.authoredBy === 'mixed') aiAuthoredCount += 1;
    if (r.evidence === 'anchored') anchoredCount += 1;
    if (r.evidence === 'asserted') assertedCount += 1;
  }

  const total = rows.length;
  return {
    total,
    today,
    byStatus,
    byAuthor,
    reviewedCount,
    reviewedPct: pct(reviewedCount, total),
    aiAuthoredCount,
    aiAuthoredPct: pct(aiAuthoredCount, total),
    aiUnreviewedCount: rows.filter((r) => r.aiUnreviewed).length,
    staleCount: rows.filter((r) => r.stale).length,
    anchoredCount,
    assertedCount,
    pages: rows,
    risks: {
      aiUnreviewed: rows.filter((r) => r.aiUnreviewed),
      stale: rows.filter((r) => r.stale),
      asserted: rows.filter((r) => r.evidence === 'asserted'),
    },
  };
}
