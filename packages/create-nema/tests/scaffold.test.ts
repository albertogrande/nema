// SPDX-License-Identifier: Apache-2.0
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { scaffold } from '../src/scaffold.js';
import { templates } from '../src/templates.js';

const roots: string[] = [];
function newDir(): string {
  const d = mkdtempSync(join(tmpdir(), 'create-nema-'));
  roots.push(d);
  return d;
}
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

describe('templates', () => {
  it('emits the producer-loop files with the project name', () => {
    const files = templates({ name: 'my-docs' });
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining([
        'nema.config.ts',
        'docs/index.md',
        'package.json',
        '.github/workflows/nema-check.yml',
        'README.md',
        '.gitignore',
      ]),
    );
    expect(files['package.json']).toContain('"name": "my-docs"');
    expect(files['package.json']).toContain('nema');
    expect(files['docs/index.md']).toContain('status: draft');
    // The gate that enforces the invariant must be wired into CI.
    expect(files['.github/workflows/nema-check.yml']).toContain('nema check');
  });
});

describe('scaffold', () => {
  it('writes every template file into the target dir', () => {
    const dir = newDir();
    const res = scaffold({ target: dir, name: 'my-docs' });
    expect(res.created).toContain('nema.config.ts');
    expect(existsSync(join(dir, 'docs/index.md'))).toBe(true);
    expect(readFileSync(join(dir, 'package.json'), 'utf8')).toContain('my-docs');
  });

  it('skips existing files unless force is set', () => {
    const dir = newDir();
    scaffold({ target: dir, name: 'x' });
    const again = scaffold({ target: dir, name: 'x' });
    expect(again.created).toEqual([]);
    expect(again.skipped).toContain('nema.config.ts');
    const forced = scaffold({ target: dir, name: 'x', force: true });
    expect(forced.created).toContain('nema.config.ts');
  });
});
