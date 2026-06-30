// SPDX-License-Identifier: Apache-2.0
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkContent } from '@getnema/gates';
import { readProvenanceFromContent } from '@getnema/provenance';
import { afterAll, describe, expect, it } from 'vitest';
import {
  type CommitOptions,
  type CreatePullRequestInput,
  type MergeOptions,
  type NemaHost,
  ProducerEngine,
  type PullRequestRef,
  draftBranchName,
  flipToReviewed,
  slugify,
} from '../src/index.js';

const CLOCK = () => new Date('2026-06-25T12:00:00Z');

class FakeHost implements NemaHost {
  branch = 'main';
  staged: string[] = [];
  commits: Array<{ message: string; opts?: CommitOptions }> = [];
  pushed: string[] = [];
  prs: CreatePullRequestInput[] = [];
  currentBranch = async () => this.branch;
  headSha = async () => 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  shortSha = async () => 'aaaaaaa';
  createBranch = async (name: string) => {
    this.branch = name;
  };
  checkout = async (name: string) => {
    this.branch = name;
  };
  /** When false, simulate an already-committed (clean) working tree. */
  staged_pending = true;
  stage = async (paths: string[]) => {
    this.staged.push(...paths);
  };
  hasStagedChanges = async () => this.staged_pending;
  commit = async (message: string, opts?: CommitOptions) => {
    this.commits.push({ message, opts });
    return 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  };
  push = async (branch: string) => {
    this.pushed.push(branch);
  };
  createPullRequest = async (input: CreatePullRequestInput): Promise<PullRequestRef> => {
    this.prs.push(input);
    return { number: 42, url: 'https://github.com/x/y/pull/42' };
  };
  merged: Array<{ pr: number; opts?: MergeOptions }> = [];
  merge = async (pr: number, opts?: MergeOptions) => {
    this.merged.push({ pr, opts });
  };
}

const tmpRoots: string[] = [];
function newRepo(): { rootDir: string; contentRoot: string } {
  const rootDir = mkdtempSync(join(tmpdir(), 'nema-'));
  tmpRoots.push(rootDir);
  return { rootDir, contentRoot: join(rootDir, 'docs') };
}

afterAll(() => {
  for (const r of tmpRoots) rmSync(r, { recursive: true, force: true });
});

describe('slug + branch', () => {
  it('slugifies and names draft branches', () => {
    expect(slugify('Guide/Intro Page!')).toBe('guide-intro-page');
    expect(draftBranchName('guide/intro', 'abc1234')).toBe('nema/draft/guide-intro-abc1234');
  });
});

describe('draftPage', () => {
  it('writes a draft with seeded provenance that passes gates', async () => {
    const { rootDir, contentRoot } = newRepo();
    const engine = new ProducerEngine({ rootDir, contentRoot, host: new FakeHost(), clock: CLOCK });
    const res = await engine.draftPage({
      path: 'index',
      title: 'Home',
      body: 'Welcome to the docs.',
      model: { name: 'claude-opus-4-8', vendor: 'anthropic' },
    });
    expect(res.ok).toBe(true);
    expect(res.diagnostics).toEqual([]);
    const prov = readProvenanceFromContent(readFileSync(res.filePath, 'utf8'));
    expect(prov?.authored_by).toBe('ai');
    expect(prov?.transitions[0]?.to).toBe('draft');
    expect(prov?.transitions.some((t) => t.to === 'reviewed')).toBe(false);
  });
});

describe('proposeChanges', () => {
  it('branches, commits with a provenance trailer + signoff, pushes, and opens a PR', async () => {
    const { rootDir, contentRoot } = newRepo();
    const host = new FakeHost();
    const engine = new ProducerEngine({ rootDir, contentRoot, host, clock: CLOCK });
    await engine.draftPage({
      path: 'index',
      title: 'Home',
      body: 'Welcome.',
      model: { name: 'claude-opus-4-8' },
    });
    const res = await engine.proposeChanges({
      paths: ['index'],
      title: 'docs: add home page',
      summary: 'Initial home page.',
    });
    expect(res.branch).toBe('nema/draft/index-aaaaaaa');
    expect(host.pushed).toContain(res.branch);
    expect(res.pullRequest.number).toBe(42);
    expect(host.prs[0]?.labels).toContain('nema:draft');
    const commit = host.commits[0];
    expect(commit?.opts?.signoff).toBe(true);
    expect(commit?.opts?.trailers?.['Nema-Provenance']).toContain('authored_by=ai');
  });

  it('skips the commit and carries HEAD when the draft is already committed (clean tree)', async () => {
    const { rootDir, contentRoot } = newRepo();
    const host = new FakeHost();
    host.staged_pending = false; // working tree clean: nothing to commit
    const engine = new ProducerEngine({ rootDir, contentRoot, host, clock: CLOCK });
    await engine.draftPage({
      path: 'index',
      title: 'Home',
      body: 'Welcome.',
      model: { name: 'claude-opus-4-8' },
    });
    const res = await engine.proposeChanges({
      paths: ['index'],
      title: 'docs: add home page',
      summary: 'Initial home page.',
    });
    // No empty commit was attempted; the existing HEAD is carried onto the PR.
    expect(host.commits).toEqual([]);
    expect(res.commit).toBe(await host.headSha());
    expect(host.pushed).toContain(res.branch);
    expect(res.pullRequest.number).toBe(42);
  });
});

describe('approve (the human-gated flip)', () => {
  it('flips draft → reviewed and the result satisfies all gates', async () => {
    const { rootDir, contentRoot } = newRepo();
    const engine = new ProducerEngine({ rootDir, contentRoot, host: new FakeHost(), clock: CLOCK });
    await engine.draftPage({
      path: 'index',
      title: 'Home',
      body: 'Welcome.',
      model: { name: 'claude-opus-4-8' },
    });

    const res = await engine.approve({
      path: 'index',
      reviewer: { login: 'alberto', pr: 42 },
      commit: 'ccccccc',
    });
    expect(res.lastReviewed).toBe('2026-06-25');
    expect(res.reviewBy).toBe('2026-12-22'); // +180 days

    const content = readFileSync(res.filePath, 'utf8');
    const prov = readProvenanceFromContent(content);
    expect(prov?.reviewed_by?.login).toBe('alberto');
    expect(prov?.transitions.at(-1)?.to).toBe('reviewed');

    const result = await checkContent(rootDir, { today: CLOCK(), config: { contentDir: 'docs' } });
    expect(result.diagnostics, JSON.stringify(result.diagnostics)).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

describe('flipToReviewed (pure)', () => {
  it('is a pure content transform', () => {
    const raw = [
      '---',
      'title: X',
      'status: draft',
      'provenance:',
      '  authored_by: ai',
      '  model:',
      '    name: m',
      '  transitions:',
      '    - to: draft',
      '      by: ai',
      '      ts: 2026-06-20T14:02:00Z',
      '---',
      '',
      'Body.',
      '',
    ].join('\n');
    const out = flipToReviewed(raw, {
      reviewer: { login: 'alberto', pr: 7 },
      today: new Date('2026-06-25T00:00:00Z'),
      reviewSlaDays: 90,
      commit: 'deadbee',
    });
    expect(out).toContain('status: reviewed');
    expect(out).toContain('review_by: 2026-09-23');
    expect(out).toContain('Body.');
  });
});

describe('flipToReviewed re-stamps code bindings', () => {
  it('stamps the current code fingerprint as the reviewed baseline', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nema-flip-drift-'));
    try {
      writeFileSync(join(dir, 'api.ts'), 'export function f(a: number): void {}', 'utf8');
      const raw = [
        '---',
        'title: T',
        'status: draft',
        'code:',
        '  - id: cb-api',
        '    source: api.ts',
        'provenance:',
        '  authored_by: ai',
        '  model:',
        '    name: m',
        '  transitions:',
        '    - to: draft',
        '      by: ai',
        '      ts: 2026-06-20T14:02:00Z',
        '---',
        '',
        'Body.',
        '',
      ].join('\n');

      const out = flipToReviewed(raw, {
        reviewer: { login: 'alberto', pr: 7 },
        today: new Date('2026-06-25T00:00:00Z'),
        reviewSlaDays: 90,
        codeRoot: dir,
      });

      expect(out).toMatch(/fingerprint: sha256:/);
      expect(out).toContain('fingerprinted_at: 2026-06-25');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('leaves bindings untouched when no codeRoot is given', () => {
    const raw = [
      '---',
      'title: T',
      'status: draft',
      'code:',
      '  - id: cb-api',
      '    source: api.ts',
      '---',
      '',
      'Body.',
      '',
    ].join('\n');
    const out = flipToReviewed(raw, {
      reviewer: { login: 'alberto', pr: 7 },
      today: new Date('2026-06-25T00:00:00Z'),
      reviewSlaDays: 90,
    });
    expect(out).not.toMatch(/fingerprint:/);
  });
});
