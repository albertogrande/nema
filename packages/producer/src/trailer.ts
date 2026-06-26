// SPDX-License-Identifier: Apache-2.0
import type { Provenance } from '@getnema/schema';

export const PROVENANCE_TRAILER_KEY = 'Nema-Provenance';

/**
 * Compact, single-line summary of a provenance state for a git commit trailer.
 * This is the tamper-evident layer that ties content+time to author in history;
 * the frontmatter block remains the queryable SSOT.
 */
export function formatProvenanceTrailer(prov: Provenance): string {
  const parts = [`authored_by=${prov.authored_by}`];
  if (prov.model?.name) parts.push(`model=${prov.model.name}`);
  const last = prov.transitions.at(-1);
  if (last) {
    parts.push(`to=${last.to}`, `ts=${last.ts}`);
    if (last.pr != null) parts.push(`pr=${last.pr}`);
  }
  if (prov.reviewed_by) parts.push(`reviewed_by=${prov.reviewed_by.login}`);
  return parts.join('; ');
}

/** Parse a `Nema-Provenance` trailer value back into key/value pairs. */
export function parseProvenanceTrailer(value: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const segment of value.split(';')) {
    const [k, ...rest] = segment.trim().split('=');
    if (k && rest.length) out[k] = rest.join('=');
  }
  return out;
}
