// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { draftNotReviewedRules } from '../src/rules/draft-not-reviewed.js';
import type { GateContext } from '../src/types.js';

function ctxWith(provenance: unknown): GateContext {
  return {
    pages: [
      {
        path: 'guide',
        filePath: '/repo/docs/guide.md',
        title: 'Guide',
        status: 'reviewed',
        body: '',
        provenance,
      },
    ],
  } as unknown as GateContext;
}

describe('draft-pages-not-reviewed — maintainer-command evidence', () => {
  it('accepts a reviewed page approved via /nema approve with a PR-referencing transition', () => {
    const diags = draftNotReviewedRules(
      ctxWith({
        authored_by: 'ai',
        reviewed_by: { login: 'alice', method: 'maintainer-command', pr: 92 },
        transitions: [
          { to: 'draft', by: 'ai', ts: '2026-07-11T10:00:00Z' },
          { to: 'reviewed', by: 'alice', ts: '2026-07-11T12:00:00Z', pr: 92 },
        ],
      }),
    );
    expect(diags).toEqual([]);
  });

  it('rejects maintainer-command without a reviewed transition referencing the PR', () => {
    const diags = draftNotReviewedRules(
      ctxWith({
        authored_by: 'ai',
        reviewed_by: { login: 'alice', method: 'maintainer-command', pr: 92 },
        transitions: [
          { to: 'draft', by: 'ai', ts: '2026-07-11T10:00:00Z' },
          { to: 'reviewed', by: 'alice', ts: '2026-07-11T12:00:00Z' },
        ],
      }),
    );
    expect(diags).toHaveLength(1);
    expect(diags[0]?.message).toContain('maintainer-command');
    expect(diags[0]?.message).toContain('referencing the PR');
  });
});
