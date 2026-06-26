// SPDX-License-Identifier: Apache-2.0
import type { Provenance } from '@getnema/schema';
import { describe, expect, it } from 'vitest';
import { type Page, provenanceHeaders, provenanceView } from '../src/index.js';

function page(overrides: Partial<Page> = {}): Page {
  return {
    path: 'guide/intro',
    filePath: '/abs/guide/intro.md',
    title: 'Intro',
    status: 'reviewed',
    frontmatter: { last_reviewed: '2026-01-01', review_by: '2026-07-01' },
    body: '# Intro\n\nHi.',
    ...overrides,
  };
}

const aiProv: Provenance = {
  schema: 1,
  authored_by: 'ai',
  model: { name: 'claude-opus-4-8', vendor: 'anthropic' },
  reviewed_by: { login: 'alice', method: 'github-pr-approval', pr: 7 },
  sources: [],
  transitions: [],
};

describe('provenanceView', () => {
  it('flattens page + provenance into a machine-readable view', () => {
    const view = provenanceView(page(), aiProv);
    expect(view).toMatchObject({
      path: 'guide/intro',
      title: 'Intro',
      status: 'reviewed',
      last_reviewed: '2026-01-01',
      review_by: '2026-07-01',
    });
    expect(view.provenance?.authored_by).toBe('ai');
  });

  it('omits freshness fields when absent and carries null provenance', () => {
    const view = provenanceView(page({ frontmatter: {} }), null);
    expect(view.last_reviewed).toBeUndefined();
    expect(view.review_by).toBeUndefined();
    expect(view.provenance).toBeNull();
  });
});

describe('provenanceHeaders', () => {
  it('emits ASCII-safe scalar headers, never the full record', () => {
    const headers = provenanceHeaders(provenanceView(page(), aiProv));
    expect(headers).toMatchObject({
      'X-Nema-Status': 'reviewed',
      'X-Nema-Authored-By': 'ai',
      'X-Nema-Model': 'claude-opus-4-8',
      'X-Nema-Reviewed-By': 'alice',
      'X-Nema-Last-Reviewed': '2026-01-01',
      'X-Nema-Review-By': '2026-07-01',
    });
    // The structured record is never inlined into a header.
    expect(JSON.stringify(headers)).not.toContain('sources');
  });

  it('strips non-ASCII so values are always legal HTTP headers', () => {
    const headers = provenanceHeaders(
      provenanceView(page(), { ...aiProv, model: { name: 'modèl–✓x' } }),
    );
    expect(headers['X-Nema-Model']).toBe('modlx');
  });

  it('includes only the status header when there is no provenance', () => {
    const headers = provenanceHeaders(
      provenanceView(page({ status: 'draft', frontmatter: {} }), null),
    );
    expect(headers).toEqual({ 'X-Nema-Status': 'draft' });
  });
});
