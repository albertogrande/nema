// SPDX-License-Identifier: Apache-2.0
import type { Provenance } from '@getnema/schema';
import { describe, expect, it } from 'vitest';
import { type AuditRow, buildAuditView } from '../src/index.js';
import type { Page } from '../src/types.js';

function page(path: string, prov: Provenance | undefined): Page {
  return {
    path,
    filePath: `/repo/docs/${path}.md`,
    title: path,
    status: prov?.transitions.at(-1)?.to ?? 'draft',
    frontmatter: {},
    provenance: prov,
    body: '',
  };
}

function prov(partial: Partial<Provenance>): Provenance {
  return { schema: 1, authored_by: 'human', sources: [], transitions: [], ...partial };
}

const PAGES: Page[] = [
  page(
    'guide/intro',
    prov({
      transitions: [
        { to: 'draft', by: 'ai', ts: '2026-01-10T00:00:00Z' },
        { to: 'reviewed', by: 'alice', ts: '2026-02-01T00:00:00Z', pr: 42 },
      ],
      reviewed_by: { login: 'alice', method: 'github-pr-approval', pr: 42 },
    }),
  ),
  page(
    'legacy/imported',
    prov({
      transitions: [{ to: 'reviewed', by: 'migration', ts: '2026-03-15T00:00:00Z' }],
      reviewed_by: { login: 'migration', method: 'migration' },
    }),
  ),
  page('orphan', undefined), // no provenance — contributes nothing
];

describe('buildAuditView', () => {
  it('flattens every transition across pages, newest-first', () => {
    const rows = buildAuditView(PAGES);
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.ts.slice(0, 10))).toEqual(['2026-03-15', '2026-02-01', '2026-01-10']);
  });

  it('attaches reviewed_by.method to reviewed transitions only', () => {
    const rows = buildAuditView(PAGES);
    const byPathTo = (path: string, to: string): AuditRow | undefined =>
      rows.find((r) => r.path === path && r.to === to);
    expect(byPathTo('legacy/imported', 'reviewed')?.method).toBe('migration');
    expect(byPathTo('guide/intro', 'reviewed')?.method).toBe('github-pr-approval');
    expect(byPathTo('guide/intro', 'draft')?.method).toBeUndefined();
  });

  it('surfaces the PR on a reviewed transition', () => {
    const reviewed = buildAuditView(PAGES, { status: 'reviewed' });
    expect(reviewed.find((r) => r.path === 'guide/intro')?.pr).toBe(42);
  });

  it('filters by actor', () => {
    expect(buildAuditView(PAGES, { actor: 'alice' }).map((r) => r.path)).toEqual(['guide/intro']);
  });

  it('filters by status (a migration promotion is findable)', () => {
    const rows = buildAuditView(PAGES, { status: 'reviewed' });
    expect(rows).toHaveLength(2);
    expect(rows.some((r) => r.method === 'migration')).toBe(true);
  });

  it('filters by date range (inclusive, on the date part)', () => {
    const rows = buildAuditView(PAGES, { since: '2026-02-01', until: '2026-02-28' });
    expect(rows.map((r) => r.path)).toEqual(['guide/intro']);
  });
});
