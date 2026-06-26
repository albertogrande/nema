// SPDX-License-Identifier: Apache-2.0
import type { Page, ResolvedConfig } from '@nema/core';
import { CONTENT_MODEL, type Provenance } from '@nema/schema';
import { describe, expect, it } from 'vitest';
import type { GitState } from '../src/git-state.js';
import { draftNotReviewedRules } from '../src/rules/draft-not-reviewed.js';
import type { GateContext } from '../src/types.js';

const CONFIG: ResolvedConfig = {
  rootDir: '/repo',
  contentDir: 'docs',
  contentRoot: '/repo/docs',
  reviewSlaDays: 180,
  rootExempt: ['index'],
  baseUrl: '',
};

/** A `reviewed` page whose only review evidence is a self-asserted `method:migration`. */
function migrationReviewedPage(): Page {
  const provenance: Provenance = {
    schema: 1,
    authored_by: 'human',
    sources: [],
    reviewed_by: { login: 'someone', method: 'migration' },
    transitions: [{ to: 'reviewed', by: 'someone', ts: '2026-01-01T00:00:00Z' }],
  };
  return {
    path: 'guide/intro',
    filePath: '/repo/docs/guide/intro.md',
    title: 'Intro',
    status: 'reviewed',
    frontmatter: {},
    provenance,
    body: '',
  };
}

function ctx(gitState?: GitState): GateContext {
  return {
    pages: [migrationReviewedPage()],
    config: CONFIG,
    model: CONTENT_MODEL,
    today: '2026-06-25',
    gitState,
  };
}

function stubGit(tracked: boolean, hadMigration: boolean): GitState {
  return {
    isTrackedAtBaseline: () => tracked,
    baselineHadMigrationMethod: () => hadMigration,
  };
}

describe('migration-bypass constraint (draft-pages-not-reviewed)', () => {
  it('blocks method:migration introduced onto a page that already existed without it', () => {
    const diags = draftNotReviewedRules(ctx(stubGit(true, false)));
    expect(diags).toHaveLength(1);
    expect(diags[0]?.rule).toBe('draft-pages-not-reviewed');
    expect(diags[0]?.path).toBe('guide/intro');
  });

  it('allows a genuine first import (page absent from the baseline)', () => {
    expect(draftNotReviewedRules(ctx(stubGit(false, false)))).toEqual([]);
  });

  it('allows an idempotent re-check (baseline already carried method:migration)', () => {
    expect(draftNotReviewedRules(ctx(stubGit(true, true)))).toEqual([]);
  });

  it('is inert without git state (in-process draft check, non-git contexts, unit tests)', () => {
    expect(draftNotReviewedRules(ctx(undefined))).toEqual([]);
  });
});
