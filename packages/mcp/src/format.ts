// SPDX-License-Identifier: Apache-2.0
import type { SearchHit } from '@getnema/core';
import type { DraftResult } from '@getnema/producer';
import type { PageSummary } from './tools.js';

export function formatPageList(pages: PageSummary[]): string {
  if (pages.length === 0) return 'No pages found.';
  return pages
    .map(
      (p) => `- ${p.path} — ${p.title} [status=${p.status || '?'} diataxis=${p.diataxis ?? '?'}]`,
    )
    .join('\n');
}

export function formatSearchHits(hits: SearchHit[], query: string): string {
  if (hits.length === 0) return `No matches for "${query}".`;
  return hits
    .map((h) => {
      const ref = h.anchor ? `${h.path}#${h.anchor}` : h.path;
      return `## ${h.title}\npath: ${ref}\nscore: ${h.score}\n${h.snippet}…`;
    })
    .join('\n\n');
}

export function formatDraftResult(res: DraftResult): string {
  const head = `Drafted ${res.path} (${res.filePath}).`;
  if (res.ok) {
    return `${head}\n✓ nema check passed for this page. You can now propose_changes.`;
  }
  const lines = res.diagnostics.flatMap((d) => {
    const row = `  ✗ [${d.rule}] ${d.message}`;
    return d.hint ? [row, `      help: ${d.hint}`] : [row];
  });
  return `${head}\nnema check found issues to fix before proposing:\n${lines.join('\n')}`;
}
