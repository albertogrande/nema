// SPDX-License-Identifier: Apache-2.0
import type { ReviewMethod } from '@getnema/schema';
import type { Page } from './types.js';

/** One row of the audit view: a single lifecycle transition recorded on a page. */
export interface AuditRow {
  path: string;
  title: string;
  /** Lifecycle state this transition moved the page TO. */
  to: string;
  /** Actor recorded on the transition (free-text at the gate layer; forge-bound by the Action). */
  by: string;
  /** ISO timestamp of the transition. */
  ts: string;
  commit?: string;
  pr?: number;
  /** For `reviewed` transitions, the page's review method (github-pr-approval | migration). */
  method?: ReviewMethod;
}

export interface AuditFilter {
  /** Keep only transitions whose recorded actor equals this. */
  actor?: string;
  /** Keep only transitions whose target status equals this (e.g. `reviewed`). */
  status?: string;
  /** Inclusive lower bound on the transition date (YYYY-MM-DD; compared on the date part of ts). */
  since?: string;
  /** Inclusive upper bound on the transition date (YYYY-MM-DD). */
  until?: string;
}

function matches(row: AuditRow, filter: AuditFilter): boolean {
  if (filter.actor && row.by !== filter.actor) return false;
  if (filter.status && row.to !== filter.status) return false;
  const date = row.ts.slice(0, 10);
  if (filter.since && date < filter.since) return false;
  if (filter.until && date > filter.until) return false;
  return true;
}

/**
 * Flatten every page's append-only `provenance.transitions[]` into a single,
 * corpus-wide review trail — the "who promoted what, when, in which PR" view that
 * `nema audit` and the /trust dashboard expose. A pure projection over the same
 * provenance the gates validate (no second source of truth), sorted newest-first.
 * The page's `reviewed_by.method` is attached to its `reviewed` transitions, so a
 * `method:'migration'` promotion is visible at a glance.
 */
export function buildAuditView(pages: Page[], filter: AuditFilter = {}): AuditRow[] {
  const rows: AuditRow[] = [];
  for (const page of pages) {
    const prov = page.provenance;
    if (!prov) continue;
    const method = prov.reviewed_by?.method;
    for (const t of prov.transitions) {
      rows.push({
        path: page.path,
        title: page.title,
        to: t.to,
        by: t.by,
        ts: t.ts,
        ...(t.commit ? { commit: t.commit } : {}),
        ...(t.pr != null ? { pr: t.pr } : {}),
        ...(t.to === 'reviewed' && method ? { method } : {}),
      });
    }
  }
  return rows
    .filter((r) => matches(r, filter))
    .sort(
      (a, b) =>
        b.ts.localeCompare(a.ts) || a.path.localeCompare(b.path) || a.to.localeCompare(b.to),
    );
}
