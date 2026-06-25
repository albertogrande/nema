// SPDX-License-Identifier: Apache-2.0
import type { Diagnostic, GateContext } from '../types.js';

/**
 * The platform invariant, enforced structurally: a page may not be `reviewed`
 * unless its provenance carries evidence of a human gate — a `reviewed_by`
 * record AND a `reviewed` transition. The agent-facing surfaces (MCP write-tools,
 * `forge draft`) never write either, so an agent cannot self-promote.
 *
 * Two recognized forms of evidence:
 *   - `github-pr-approval` — the standard loop; the `reviewed` transition must
 *     reference the approving PR (`pr`).
 *   - `migration` — a human importing an existing corpus with `forge migrate`
 *     asserted the page as reviewed; no PR is required (the migrating human is
 *     the gate).
 */
export function draftNotReviewedRules(ctx: GateContext): Diagnostic[] {
  const out: Diagnostic[] = [];
  const err = (path: string, message: string): Diagnostic => ({
    rule: 'draft-pages-not-reviewed',
    severity: 'error',
    path,
    message,
  });

  for (const page of ctx.pages) {
    if (page.status !== 'reviewed') continue;
    const prov = page.provenance;

    if (!prov?.reviewed_by) {
      out.push(
        err(
          page.path,
          'status=reviewed without recorded human approval (provenance.reviewed_by) — ' +
            'agents may not self-promote; promotion happens on PR approval or via forge migrate',
        ),
      );
      continue;
    }
    if (!prov.transitions.some((t) => t.to === 'reviewed')) {
      out.push(err(page.path, 'status=reviewed requires a recorded `reviewed` transition'));
      continue;
    }
    if (
      prov.reviewed_by.method === 'github-pr-approval' &&
      !prov.transitions.some((t) => t.to === 'reviewed' && t.pr != null)
    ) {
      out.push(
        err(page.path, 'github-pr-approval requires a `reviewed` transition referencing the PR'),
      );
    }
  }
  return out;
}
