// SPDX-License-Identifier: Apache-2.0
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCoherenceGate } from '@getnema/gates';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listDraftBranches, loadCorpusAtRef, precheckProposeCoherence } from '../src/index.js';

let repo: string;
const git = (...args: string[]): void => {
  execFileSync('git', args, { cwd: repo, stdio: 'pipe' });
};
const write = (rel: string, body: string): void => {
  const file = join(repo, 'docs', rel);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, body, 'utf8');
};
const page = (title: string, body: string): string =>
  `---\ntitle: ${title}\nstatus: draft\n---\n\n# ${title}\n\n${body}\n`;

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'nema-prod-coh-'));
  mkdirSync(join(repo, 'docs'), { recursive: true });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 't@example.com');
  git('config', 'user.name', 'Test');
  write('index.md', page('Home', 'See [intro](/intro).'));
  write('intro.md', page('Intro', 'Back [home](/index).'));
  git('add', '-A');
  git('commit', '-qm', 'init');
});
afterEach(() => rmSync(repo, { recursive: true, force: true }));

describe('producer coherence helpers (real git)', () => {
  it('discovers nema/draft/* branches and loads each corpus at its ref', async () => {
    git('checkout', '-q', '-b', 'nema/draft/a');
    write('index.md', page('Home', 'See [intro](/intro) and [opts](/api/options).'));
    write('api/options.md', page('Options', 'Back [home](/index).'));
    git('add', '-A');
    git('commit', '-qm', 'draft a');
    git('checkout', '-q', 'main');

    const branches = await listDraftBranches(repo);
    expect(branches).toContain('nema/draft/a');

    const corpus = await loadCorpusAtRef(repo, 'nema/draft/a');
    expect(corpus.pages.map((p) => p.path).sort()).toEqual(['api/options', 'index', 'intro']);
    // The live tree is untouched by the worktree load.
    expect(execFileSync('git', ['status', '--porcelain'], { cwd: repo }).toString()).toBe('');
  });

  it('passes coherence when two branches own disjoint pages', async () => {
    git('checkout', '-q', '-b', 'nema/draft/a');
    write('a.md', page('A', 'Back [home](/index).'));
    write('index.md', page('Home', 'See [intro](/intro) and [a](/a).'));
    git('add', '-A');
    git('commit', '-qm', 'a');
    git('checkout', '-q', 'main');
    git('checkout', '-q', '-b', 'nema/draft/b');
    write('b.md', page('B', 'Back [home](/index).'));
    git('add', '-A');
    git('commit', '-qm', 'b');
    git('checkout', '-q', 'main');

    const base = await loadCorpusAtRef(repo, 'main');
    const corpora = await Promise.all(
      (await listDraftBranches(repo)).map((b) => loadCorpusAtRef(repo, b)),
    );
    const result = runCoherenceGate(corpora, { base });
    // a/b are disjoint files; the index edit on `a` merges cleanly over base.
    expect(result.diagnostics.filter((d) => d.rule === 'slot-collision')).toEqual([]);
  });

  it('flags a slot collision when two branches create the same page differently', async () => {
    git('checkout', '-q', '-b', 'nema/draft/a');
    write('api/options.md', page('Options', 'A wrote this. Back [home](/index).'));
    write('index.md', page('Home', 'See [intro](/intro) and [opts](/api/options).'));
    git('add', '-A');
    git('commit', '-qm', 'a');
    git('checkout', '-q', 'main');
    git('checkout', '-q', '-b', 'nema/draft/b');
    write('api/options.md', page('Options', 'B wrote DIFFERENT. Back [home](/index).'));
    write('index.md', page('Home', 'See [intro](/intro) and [opts](/api/options).'));
    git('add', '-A');
    git('commit', '-qm', 'b');
    git('checkout', '-q', 'main');

    const base = await loadCorpusAtRef(repo, 'main');
    const corpora = await Promise.all(
      (await listDraftBranches(repo)).map((b) => loadCorpusAtRef(repo, b)),
    );
    const result = runCoherenceGate(corpora, { base });
    expect(
      result.diagnostics.some((d) => d.rule === 'slot-collision' && d.path === 'api/options'),
    ).toBe(true);
    expect(result.ok).toBe(false);
  });

  it('precheck warns when the working tree collides with an open draft branch', async () => {
    // Another agent already proposed api/options on its own branch.
    git('checkout', '-q', '-b', 'nema/draft/other');
    write('api/options.md', page('Options', 'other agent wrote this. Back [home](/index).'));
    git('add', '-A');
    git('commit', '-qm', 'other: api/options');
    git('checkout', '-q', 'main');
    // Our working tree (uncommitted) authors the same page differently.
    write('api/options.md', page('Options', 'WE wrote something else. Back [home](/index).'));

    const collisions = await precheckProposeCoherence(repo);
    expect(collisions.some((d) => d.path === 'api/options')).toBe(true);
  });

  it('precheck is silent (empty) when there are no other draft branches', async () => {
    write('api/options.md', page('Options', 'Back [home](/index).'));
    expect(await precheckProposeCoherence(repo)).toEqual([]);
  });
});
