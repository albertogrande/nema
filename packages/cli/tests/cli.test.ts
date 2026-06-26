// SPDX-License-Identifier: Apache-2.0
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCommand } from 'citty';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { main } from '../src/main.js';

let rootDir: string;
let captured: string;
let capturedErr: string;

async function nema(...rawArgs: string[]): Promise<string> {
  captured = '';
  capturedErr = '';
  const originalOut = process.stdout.write.bind(process.stdout);
  const originalErr = process.stderr.write.bind(process.stderr);
  process.exitCode = 0;
  process.stdout.write = ((chunk: string) => {
    captured += chunk;
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string) => {
    capturedErr += chunk;
    return true;
  }) as typeof process.stderr.write;
  try {
    await runCommand(main, { rawArgs });
  } finally {
    process.stdout.write = originalOut;
    process.stderr.write = originalErr;
  }
  return captured;
}

beforeEach(() => {
  rootDir = mkdtempSync(join(tmpdir(), 'nema-cli-'));
});
afterEach(() => {
  rmSync(rootDir, { recursive: true, force: true });
  process.exitCode = 0;
});

describe('nema init + check', () => {
  it('scaffolds a repo and the starter passes check', async () => {
    const init = await nema('init', rootDir);
    expect(init).toContain('nema.config.ts');

    const check = await nema('check', rootDir);
    expect(check).toContain('all gates passed');
    expect(process.exitCode).toBe(0);
  });
});

describe('nema draft + prov', () => {
  it('drafts a page and prints its provenance chain', async () => {
    await nema('init', rootDir);
    const draft = await nema(
      'draft',
      '--dir',
      rootDir,
      '--path',
      'guide/intro',
      '--title',
      'Introduction',
      '--body',
      'Widgets connect to gizmos. See [home](/index).',
      '--diataxis',
      'tutorial',
      '--model-name',
      'claude-opus-4-8',
      '--model-vendor',
      'anthropic',
    );
    expect(draft).toContain('Drafted guide/intro');

    const prov = await nema('prov', 'guide/intro', '--dir', rootDir);
    expect(prov).toContain('authored_by: ai');
    expect(prov).toContain('model claude-opus-4-8/anthropic');
    expect(prov).toContain('draft');
    expect(prov).not.toContain('reviewed_by');
  });
});

describe('nema prov --filter', () => {
  it('lists AI-authored pages', async () => {
    await nema('init', rootDir);
    await nema(
      'draft',
      '--dir',
      rootDir,
      '--path',
      'a',
      '--title',
      'A',
      '--body',
      'Linked from [home](/index).',
      '--model-name',
      'claude-opus-4-8',
    );
    const listed = await nema('prov', '--dir', rootDir, '--filter', 'authored_by=ai');
    expect(listed).toContain('a — A');
  });
});

describe('nema check --json', () => {
  it('emits machine-readable diagnostics with fix hints', async () => {
    await nema('init', rootDir);
    const json = await nema('check', rootDir, '--json');
    const report = JSON.parse(json);
    expect(report).toMatchObject({ ok: true, errorCount: 0 });
    expect(typeof report.checked).toBe('number');
    expect(Array.isArray(report.diagnostics)).toBe(true);
  });
});

describe('nema explain', () => {
  it('explains a known rule', async () => {
    const text = await nema('explain', 'reachability');
    expect(text).toContain('[reachability]');
    expect(text.toLowerCase()).toContain('orphan');
  });

  it('lists all rules when given no argument', async () => {
    const text = await nema('explain');
    expect(text).toContain('reachability');
    expect(text).toContain('frontmatter-required');
  });

  it('suggests the closest rule on a typo and exits non-zero', async () => {
    await nema('explain', 'reachabilty');
    expect(capturedErr).toContain("Did you mean 'reachability'");
    expect(process.exitCode).toBe(1);
  });
});

describe('nema doctor', () => {
  it('reports environment + repo health and passes on a scaffolded repo', async () => {
    await nema('init', rootDir);
    const text = await nema('doctor', rootDir);
    expect(text).toContain('nema doctor');
    expect(text).toContain('Node.js');
    expect(text).toContain('config: nema.config.ts');
    expect(process.exitCode).toBe(0);
  });
});
