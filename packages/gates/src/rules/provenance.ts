import { verifyProvenance } from '@getnema/provenance';
// SPDX-License-Identifier: Apache-2.0
import { ProvenanceSchema } from '@getnema/schema';
import type { Diagnostic, GateContext } from '../types.js';

/**
 * Provenance consistency: when a page carries a `provenance` block it must be
 * structurally valid and internally consistent (model set for AI authorship,
 * reviewer + transition for reviewed pages, every source referenced).
 */
export function provenanceRules(ctx: GateContext): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const page of ctx.pages) {
    const raw = page.frontmatter.provenance;
    if (raw == null) continue;

    const parsed = ProvenanceSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        out.push({
          rule: 'provenance-consistency',
          severity: 'error',
          path: page.path,
          message: `invalid provenance: ${issue.path.join('.')} ${issue.message}`,
        });
      }
      continue;
    }

    for (const issue of verifyProvenance(parsed.data, { status: page.status, body: page.body })) {
      out.push({
        rule: 'provenance-consistency',
        severity: 'error',
        path: page.path,
        message: issue.message,
      });
    }
  }
  return out;
}
