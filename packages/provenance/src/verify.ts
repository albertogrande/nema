// SPDX-License-Identifier: Apache-2.0
import type { Provenance } from '@getnema/schema';

export interface ProvenanceIssue {
  rule: string;
  message: string;
}

export interface VerifyContext {
  /** The page's stored `status`, used to check reviewed-page invariants. */
  status?: string;
  /** The page body, used to check that every source id is referenced. */
  body?: string;
}

/** Footnote reference ids present in a body (e.g. `[^src-x]` → `src-x`). */
function referencedFootnoteIds(body: string): Set<string> {
  const ids = new Set<string>();
  for (const m of body.matchAll(/\[\^([^\]]+)\](?!:)/g)) ids.add(m[1]!);
  return ids;
}

/**
 * Structural provenance invariants (the heart of the `provenance-consistency`
 * gate):
 *   - `authored_by !== human` ⇒ `model.name` must be set.
 *   - `status === reviewed` ⇒ a human `reviewed_by` AND a `reviewed` transition.
 *   - every `sources[].id` must be referenced from the body (when body given).
 */
export function verifyProvenance(prov: Provenance, ctx: VerifyContext = {}): ProvenanceIssue[] {
  const issues: ProvenanceIssue[] = [];

  if (prov.authored_by !== 'human' && !prov.model?.name) {
    issues.push({
      rule: 'model-required',
      message: `authored_by='${prov.authored_by}' requires provenance.model.name to be set`,
    });
  }

  if (ctx.status === 'reviewed') {
    if (!prov.reviewed_by) {
      issues.push({
        rule: 'reviewed-needs-reviewer',
        message: 'status=reviewed requires provenance.reviewed_by',
      });
    }
    if (!prov.transitions.some((t) => t.to === 'reviewed')) {
      issues.push({
        rule: 'reviewed-needs-transition',
        message: 'status=reviewed requires a recorded `reviewed` transition',
      });
    }
  }

  if (ctx.body != null && prov.sources.length > 0) {
    const referenced = referencedFootnoteIds(ctx.body);
    for (const source of prov.sources) {
      if (!referenced.has(source.id)) {
        issues.push({
          rule: 'source-unreferenced',
          message: `source '${source.id}' is declared but never referenced ([^${source.id}]) in the body`,
        });
      }
    }
  }

  return issues;
}
