// SPDX-License-Identifier: Apache-2.0
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCommand } from 'citty';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { main } from '../src/main.js';

let rootDir: string;
let captured: string;

async function nema(...rawArgs: string[]): Promise<string> {
  captured = '';
  const original = process.stdout.write.bind(process.stdout);
  process.exitCode = 0;
  process.stdout.write = ((chunk: string) => {
    captured += chunk;
    return true;
  }) as typeof process.stdout.write;
  try {
    await runCommand(main, { rawArgs });
  } finally {
    process.stdout.write = original;
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
