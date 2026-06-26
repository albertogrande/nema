// SPDX-License-Identifier: Apache-2.0
import {
  MATTER_OPTIONS,
  composeContent,
  readProvenanceFromFrontmatter,
  recordTransition,
  seedProvenance,
} from '@getnema/provenance';
import type { ReviewMethod } from '@getnema/schema';
import matter from 'gray-matter';

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface ReviewerRef {
  login: string;
  method?: ReviewMethod;
  pr: number;
}

export interface FlipOptions {
  reviewer: ReviewerRef;
  today: Date;
  reviewSlaDays: number;
  /** SHA of the approving/merge commit, recorded on the reviewed transition. */
  commit?: string;
}

/**
 * Pure transform: flip a page's content from `draft` to `reviewed`. Sets
 * `status`, freshness dates (`last_reviewed = today`, `review_by = today + SLA`),
 * the `reviewed_by` record, and appends a `reviewed` transition. This is what
 * `nema approve` writes after a human approves the PR — never an agent.
 */
export function flipToReviewed(raw: string, opts: FlipOptions): string {
  const { data, content } = matter(raw, MATTER_OPTIONS);
  const fm = { ...((data ?? {}) as Record<string, unknown>) };

  let prov = readProvenanceFromFrontmatter(fm) ?? seedProvenance({ authoredBy: 'ai' });
  prov = {
    ...prov,
    reviewed_by: {
      login: opts.reviewer.login,
      method: opts.reviewer.method ?? 'github-pr-approval',
      pr: opts.reviewer.pr,
    },
  };
  prov = recordTransition(prov, {
    to: 'reviewed',
    by: opts.reviewer.login,
    ts: opts.today.toISOString(),
    commit: opts.commit,
    pr: opts.reviewer.pr,
  });

  fm.status = 'reviewed';
  fm.last_reviewed = toISODate(opts.today);
  fm.review_by = toISODate(addDays(opts.today, opts.reviewSlaDays));
  fm.provenance = prov;

  return composeContent(fm, content);
}
