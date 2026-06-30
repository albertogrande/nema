// SPDX-License-Identifier: Apache-2.0
import { detectDrift } from '@getnema/drift';
import type { Diagnostic, GateContext } from '../types.js';

/**
 * Code-drift: a page with a `code:` binding whose bound source has moved past
 * its reviewed baseline. Emitted as a **warning**, not an error — the code
 * legitimately races ahead of the docs, and that is the signal to act on (via
 * `nema drift` / re-drafting), not a reason to fail CI. Informational
 * `no-baseline` findings are left to `nema drift`; the gate reports only real
 * divergence (changed surface, missing source/symbols, an unparsable block).
 */
export function codeDriftRules(ctx: GateContext): Diagnostic[] {
  const report = detectDrift(ctx.pages, ctx.config.codeRoot);
  return report.findings
    .filter((f) => f.actionable)
    .map((f) => ({
      rule: 'code-drift',
      severity: 'warning' as const,
      path: f.path,
      message: f.message,
    }));
}
