// SPDX-License-Identifier: Apache-2.0
import type { Provenance } from '@docforge/schema';
import { describe, expect, it } from 'vitest';
import { type Page, computeTrustReport } from '../src/index.js';

const TODAY = '2026-06-25';

function prov(p: Partial<Provenance> & Pick<Provenance, 'authored_by'>): Provenance {
  return { schema: 1, sources: [], transitions: [], ...p };
}

function mkPage(over: Partial<Page> & Pick<Page, 'path' | 'status'>): Page {
  return {
    title: over.title ?? over.path,
    filePath: `/x/${over.path}.md`,
    frontmatter: over.frontmatter ?? {},
    body: over.body ?? '',
    ...over,
  };
}

describe('computeTrustReport', () => {
  it('reports an empty corpus without dividing by zero', () => {
    const r = computeTrustReport([], { today: TODAY });
    expect(r.total).toBe(0);
    expect(r.reviewedPct).toBe(0);
    expect(r.aiAuthoredPct).toBe(0);
    expect(r.aiUnreviewedCount).toBe(0);
  });

  it('flags AI-authored-but-unreviewed as the hero risk', () => {
    const r = computeTrustReport(
      [
        mkPage({
          path: 'a',
          status: 'draft',
          provenance: prov({ authored_by: 'ai', model: { name: 'm' } }),
        }),
        mkPage({
          path: 'b',
          status: 'draft',
          provenance: prov({ authored_by: 'mixed', model: { name: 'm' } }),
        }),
        mkPage({ path: 'c', status: 'draft', provenance: prov({ authored_by: 'human' }) }),
      ],
      { today: TODAY },
    );
    expect(r.aiAuthoredCount).toBe(2); // ai + mixed
    expect(r.aiUnreviewedCount).toBe(2);
    expect(r.risks.aiUnreviewed.map((p) => p.path)).toEqual(['a', 'b']);
  });

  it('does not count a deprecated AI page as an unreviewed risk', () => {
    const r = computeTrustReport(
      [
        mkPage({
          path: 'old',
          status: 'deprecated',
          provenance: prov({ authored_by: 'ai', model: { name: 'm' } }),
        }),
      ],
      { today: TODAY },
    );
    expect(r.aiUnreviewedCount).toBe(0);
  });

  it('treats a reviewed page past review_by as stale', () => {
    const reviewedBy = { login: 'alberto', method: 'github-pr-approval' as const };
    const r = computeTrustReport(
      [
        mkPage({
          path: 'fresh',
          status: 'reviewed',
          frontmatter: { review_by: '2026-12-01' },
          provenance: prov({
            authored_by: 'human',
            reviewed_by: reviewedBy,
            transitions: [
              { to: 'reviewed', by: 'alberto', ts: '2026-06-01T00:00:00Z', commit: 'abc1234' },
            ],
          }),
        }),
        mkPage({
          path: 'overdue',
          status: 'reviewed',
          frontmatter: { review_by: '2026-01-01' },
          provenance: prov({
            authored_by: 'human',
            reviewed_by: reviewedBy,
            transitions: [
              { to: 'reviewed', by: 'alberto', ts: '2025-07-01T00:00:00Z', commit: 'def5678' },
            ],
          }),
        }),
      ],
      { today: TODAY },
    );
    expect(r.staleCount).toBe(1);
    expect(r.risks.stale.map((p) => p.path)).toEqual(['overdue']);
    expect(r.reviewedCount).toBe(2);
    expect(r.reviewedPct).toBe(100);
  });

  it('distinguishes anchored reviews from merely asserted ones', () => {
    const reviewedBy = { login: 'alberto', method: 'migration' as const };
    const r = computeTrustReport(
      [
        mkPage({
          path: 'anchored',
          status: 'reviewed',
          frontmatter: { review_by: '2026-12-01' },
          provenance: prov({
            authored_by: 'human',
            reviewed_by: reviewedBy,
            transitions: [
              { to: 'reviewed', by: 'alberto', ts: '2026-06-01T00:00:00Z', commit: 'abc1234' },
            ],
          }),
        }),
        mkPage({
          path: 'asserted',
          status: 'reviewed',
          frontmatter: { review_by: '2026-12-01' },
          // reviewer recorded, but no commit on the reviewed transition → unanchored
          provenance: prov({
            authored_by: 'human',
            reviewed_by: reviewedBy,
            transitions: [{ to: 'reviewed', by: 'alberto', ts: '2026-06-01T00:00:00Z' }],
          }),
        }),
      ],
      { today: TODAY },
    );
    expect(r.anchoredCount).toBe(1);
    expect(r.assertedCount).toBe(1);
    expect(r.risks.asserted.map((p) => p.path)).toEqual(['asserted']);
  });

  it('counts statuses and authors, and rounds percentages', () => {
    const r = computeTrustReport(
      [
        mkPage({
          path: 'a',
          status: 'draft',
          provenance: prov({ authored_by: 'ai', model: { name: 'm' } }),
        }),
        mkPage({ path: 'b', status: 'stub' }),
        mkPage({ path: 'c', status: 'draft', provenance: prov({ authored_by: 'human' }) }),
      ],
      { today: TODAY },
    );
    expect(r.byStatus).toEqual({ draft: 2, stub: 1 });
    expect(r.byAuthor).toEqual({ ai: 1, human: 1, mixed: 0, unknown: 1 }); // stub has no provenance
    expect(r.aiAuthoredPct).toBe(33); // 1/3 rounded
  });

  it('is pure: same pages + same today → identical report (CLI/dashboard parity)', () => {
    const pages = [
      mkPage({
        path: 'a',
        status: 'draft',
        provenance: prov({ authored_by: 'ai', model: { name: 'm' } }),
      }),
    ];
    expect(computeTrustReport(pages, { today: TODAY })).toEqual(
      computeTrustReport(pages, { today: TODAY }),
    );
  });
});
