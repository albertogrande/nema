// SPDX-License-Identifier: Apache-2.0
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkContent, createFsGitState } from '../src/index.js';

let repo: string;
const docs = (): string => join(repo, 'docs');

function git(...args: string[]): void {
  execFileSync('git', args, { cwd: repo, stdio: 'pipe' });
}

/** A page whose `reviewed` form is asserted only by `reviewed_by.method`. */
function page(status: string, method: string | null): string {
  const reviewed = method ? `\n  reviewed_by:\n    login: someone\n    method: ${method}` : '';
  const to = status === 'reviewed' ? 'reviewed' : 'draft';
  return `---
title: Guide
status: ${status}
last_reviewed: '2026-01-01'
review_by: '2099-01-01'
provenance:
  schema: 1
  authored_by: human
  sources: []${reviewed}
  transitions:
    - to: ${to}
      by: someone
      ts: '2026-01-01T00:00:00Z'
---

# Guide

Linked from [home](/index).
`;
}

function indexLinking(...slugs: string[]): string {
  const links = slugs.map((s) => `[${s}](/${s})`).join(' and ');
  return `---\ntitle: Home\nstatus: draft\n---\n\n# Home\n\nSee ${links}.\n`;
}

const TODAY = new Date('2026-06-25T00:00:00Z');

beforeEach(() => {
  // Force the baseline to HEAD regardless of the ambient CI environment.
  vi.stubEnv('GITHUB_BASE_REF', '');
  vi.stubEnv('NEMA_BASELINE_REF', '');
  repo = mkdtempSync(join(tmpdir(), 'nema-mig-git-'));
  mkdirSync(docs(), { recursive: true });
  writeFileSync(join(docs(), 'index.md'), indexLinking('guide'));
  writeFileSync(join(docs(), 'guide.md'), page('draft', null));
  git('init', '-q');
  git('config', 'user.email', 't@example.com');
  git('config', 'user.name', 'Test');
  git('add', '-A');
  git('commit', '-qm', 'initial: guide committed as draft');
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

describe('migration-bypass — real git baseline (createFsGitState + checkContent)', () => {
  it('blocks a working-tree promotion of an already-tracked page via method:migration', async () => {
    writeFileSync(join(docs(), 'guide.md'), page('reviewed', 'migration'));
    const result = await checkContent(repo, { today: TODAY, gitState: createFsGitState(repo) });
    const fired = result.diagnostics.filter(
      (d) => d.rule === 'draft-pages-not-reviewed' && d.path === 'guide',
    );
    expect(fired).toHaveLength(1);
    expect(result.ok).toBe(false);
  });

  it('allows a genuine first import — an untracked reviewed/migration page', async () => {
    writeFileSync(join(docs(), 'imported.md'), page('reviewed', 'migration'));
    writeFileSync(join(docs(), 'index.md'), indexLinking('guide', 'imported'));
    const result = await checkContent(repo, { today: TODAY, gitState: createFsGitState(repo) });
    const fired = result.diagnostics.filter(
      (d) => d.rule === 'draft-pages-not-reviewed' && d.path === 'imported',
    );
    expect(fired).toHaveLength(0);
  });
});
