// SPDX-License-Identifier: Apache-2.0
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { NemaHost } from '@getnema/producer';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NemaTools } from '../src/index.js';

const CLOCK = () => new Date('2026-06-25T12:00:00Z');

// checkCoherence drives git directly (worktrees) and never touches the host.
const noopHost = {} as unknown as NemaHost;

let repo: string;
let tools: NemaTools;
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
  repo = mkdtempSync(join(tmpdir(), 'nema-mcp-coh-'));
  mkdirSync(join(repo, 'docs'), { recursive: true });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 't@example.com');
  git('config', 'user.name', 'Test');
  write('index.md', page('Home', 'See [intro](/intro).'));
  write('intro.md', page('Intro', 'Back [home](/index).'));
  git('add', '-A');
  git('commit', '-qm', 'init');
  tools = new NemaTools({ rootDir: repo, host: noopHost, clock: CLOCK });
});
afterEach(() => rmSync(repo, { recursive: true, force: true }));

describe('check_coherence MCP surface', () => {
  it('reports a slot collision across two draft branches', async () => {
    const branches: Array<[string, string]> = [
      ['nema/draft/a', 'A wrote this'],
      ['nema/draft/b', 'B wrote DIFFERENT'],
    ];
    for (const [name, marker] of branches) {
      git('checkout', '-q', '-b', name);
      write('api/options.md', page('Options', `${marker}. Back [home](/index).`));
      write('index.md', page('Home', 'See [intro](/intro) and [opts](/api/options).'));
      git('add', '-A');
      git('commit', '-qm', name);
      git('checkout', '-q', 'main');
    }
    const result = await tools.checkCoherence();
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.rule === 'slot-collision')).toBe(true);
  });

  it('passes when there are no draft branches', async () => {
    const result = await tools.checkCoherence();
    expect(result.ok).toBe(true);
  });
});
