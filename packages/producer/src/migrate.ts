// SPDX-License-Identifier: Apache-2.0
import { writeFileSync } from 'node:fs';
import { type Page, loadPages } from '@getnema/core';
import { composeContent, recordTransition, seedProvenance } from '@getnema/provenance';
import { type LifecycleState, isLifecycleState } from '@getnema/schema';
import { run } from './exec.js';
import { addDays, toISODate } from './transitions.js';

export interface MigrateOptions {
  /** Absolute path to the content directory to migrate. */
  contentRoot: string;
  /** Repo root, used to read each file's last-commit date from git. */
  repoRoot: string;
  /** Status to assign pages that lack a valid lifecycle status. Default `reviewed`. */
  status?: 'reviewed' | 'draft';
  /** Login recorded as the migrating human for `reviewed` pages. Default `migration`. */
  reviewer?: string;
  /** Freshness SLA in days for migrated `reviewed` pages. Default 180. */
  reviewSlaDays?: number;
  /** Preview without writing. */
  dryRun?: boolean;
  clock?: () => Date;
}

export interface MigratedPage {
  path: string;
  title: string;
  status: LifecycleState;
}

export interface MigrateResult {
  migrated: MigratedPage[];
  /** Pages skipped because they already carry a `provenance` block. */
  skipped: string[];
}

/** First Markdown H1 in a body, if any. */
function firstH1(body: string): string | null {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1]!.trim() : null;
}

function humanize(segment: string): string {
  return segment.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Best title for a page: frontmatter title, else first H1, else the humanized slug. */
function inferTitle(page: Page): string {
  const t = page.frontmatter.title;
  if (typeof t === 'string' && t.trim()) return t.trim();
  return firstH1(page.body) ?? humanize(page.path.split('/').pop() ?? page.path);
}

async function gitLastCommitISO(filePath: string, repoRoot: string): Promise<string | null> {
  try {
    const { stdout } = await run('git', ['log', '-1', '--format=%cI', '--', filePath], repoRoot);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Import an existing Markdown corpus into the Nema model: for every page that
 * lacks a `provenance` block, infer a title, assign a lifecycle status (keeping
 * any valid existing one), and seed an honest human-authored provenance block —
 * stamping `reviewed` pages with a `migration` review record and freshness dates.
 * Idempotent: pages that already have provenance are skipped.
 */
export async function migrateCorpus(opts: MigrateOptions): Promise<MigrateResult> {
  const now = (opts.clock ?? (() => new Date()))();
  const defaultStatus = opts.status ?? 'reviewed';
  const sla = opts.reviewSlaDays ?? 180;
  const reviewer = opts.reviewer ?? 'migration';

  const migrated: MigratedPage[] = [];
  const skipped: string[] = [];

  for (const page of loadPages(opts.contentRoot)) {
    if (page.frontmatter.provenance != null) {
      skipped.push(page.path);
      continue;
    }

    const existing = page.frontmatter.status;
    const status: LifecycleState = isLifecycleState(existing) ? existing : defaultStatus;
    const title = inferTitle(page);
    const ts = (await gitLastCommitISO(page.filePath, opts.repoRoot)) ?? now.toISOString();

    let provenance = seedProvenance({ authoredBy: 'human' });
    if (status === 'reviewed') {
      provenance = { ...provenance, reviewed_by: { login: reviewer, method: 'migration' } };
    }
    provenance = recordTransition(provenance, { to: status, by: reviewer, ts });

    const frontmatter: Record<string, unknown> = { ...page.frontmatter, title, status };
    if (status === 'reviewed') {
      // Preserve any existing freshness dates (so genuinely overdue pages stay
      // overdue); only stamp them when missing, treating migration as the review.
      if (frontmatter.last_reviewed == null) frontmatter.last_reviewed = toISODate(now);
      if (frontmatter.review_by == null) frontmatter.review_by = toISODate(addDays(now, sla));
    }
    frontmatter.provenance = provenance;

    if (!opts.dryRun) {
      writeFileSync(page.filePath, composeContent(frontmatter, page.body), 'utf8');
    }
    migrated.push({ path: page.path, title, status });
  }

  return { migrated, skipped };
}
