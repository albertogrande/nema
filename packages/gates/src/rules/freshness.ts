// SPDX-License-Identifier: Apache-2.0
import { isValidISODate } from '@getnema/schema';
import type { Diagnostic, GateContext } from '../types.js';

/**
 * Freshness SLA with teeth. For `reviewed` pages, the invariant is
 * `last_reviewed ≤ today < review_by`: missing dates, a future `last_reviewed`,
 * a passed `review_by` (overdue), or `review_by ≤ last_reviewed` all FAIL.
 * ISO date strings compare correctly lexicographically.
 */
export function freshnessRules(ctx: GateContext): Diagnostic[] {
  const out: Diagnostic[] = [];
  const today = ctx.today;

  for (const page of ctx.pages) {
    const fm = page.frontmatter;
    const lr = fm.last_reviewed != null ? String(fm.last_reviewed) : undefined;
    const rb = fm.review_by != null ? String(fm.review_by) : undefined;
    const lrValid = lr != null && isValidISODate(lr);
    const rbValid = rb != null && isValidISODate(rb);

    if (page.status === 'reviewed') {
      if (lr == null) {
        out.push(err(page.path, 'status=reviewed requires last_reviewed'));
      }
      if (rb == null) {
        out.push(err(page.path, 'status=reviewed requires review_by'));
      }
      if (rbValid && rb <= today) {
        out.push(err(page.path, `review_by ${rb} has passed — page is overdue for review`));
      }
    }

    if (lrValid && lr > today) {
      out.push(err(page.path, `last_reviewed ${lr} is in the future`));
    }
    if (lrValid && rbValid && rb <= lr) {
      out.push(err(page.path, `review_by ${rb} must be after last_reviewed ${lr}`));
    }
  }
  return out;
}

function err(path: string, message: string): Diagnostic {
  return { rule: 'freshness', severity: 'error', path, message };
}
