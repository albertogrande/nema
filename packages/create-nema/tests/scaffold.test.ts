// SPDX-License-Identifier: Apache-2.0
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { scaffold } from '../src/scaffold.js';
import { NEMA_DEP_VERSIONS, templates } from '../src/templates.js';

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
        '.github/workflows/nema-approve.yml',
        'AGENTS.md',
        'CLAUDE.md',
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

  it('pins @getnema/cli to a range that reaches the current release, not an old one', () => {
    // Regression for the DX finding: `^0.1.0` caps @getnema/cli at 0.1.x, so a
    // freshly scaffolded repo silently installs an old CLI and never sees
    // generate/claim/release/coherence. The CLI is published ahead of the engine
    // packages, so its range must not sit below the current major.minor.
    const cliRange = NEMA_DEP_VERSIONS['@getnema/cli'];
    const [major = 0, minor = 0] = cliRange.replace(/^\^/, '').split('.').map(Number);
    // Floor must reach 0.3 (where generate/claim/release/coherence landed).
    expect(major > 0 || (major === 0 && minor >= 3)).toBe(true);

    // Both the minimal (devDep) and app (devDep) templates must carry that range.
    const minimal = templates({ name: 'my-docs' });
    const app = templates({ name: 'my-docs', app: true });
    expect(minimal['package.json']).toContain(`"@getnema/cli": "${cliRange}"`);
    expect(app['package.json']).toContain(`"@getnema/cli": "${cliRange}"`);
  });

  it('reminds agents to restart their session after `claude mcp add`', () => {
    // DX finding #5: MCP tools bind at session start, so a running agent won't
    // see them until it restarts. The scaffolded contract must say so.
    const agents = templates({ name: 'my-docs' })['AGENTS.md'] ?? '';
    expect(agents.toLowerCase()).toContain('restart');
  });

  it('ships the human-approval (promotion) workflow so `nema doctor` passes', () => {
    const files = templates({ name: 'my-docs' });
    const approve = files['.github/workflows/nema-approve.yml'];
    // doctor's promoteTokenCheck requires: pull_request_review trigger,
    // a nema approve reference, and NEMA_PROMOTE_TOKEN.
    expect(approve).toContain('pull_request_review');
    expect(approve).toContain('nema');
    expect(approve).toContain('approve');
    expect(approve).toContain('NEMA_PROMOTE_TOKEN');
  });

  it('ships an agent contract describing the draft → PR → approve loop and the invariant', () => {
    const files = templates({ name: 'my-docs' });
    const agents = files['AGENTS.md'] ?? '';
    expect(agents).toContain('draft');
    expect(agents).toContain('reviewed');
    // The invariant: only a human PR approval promotes to reviewed.
    expect(agents.toLowerCase()).toContain('human');
    // CLAUDE.md points at AGENTS.md.
    expect(files['CLAUDE.md']).toContain('AGENTS.md');
  });

  it('emits a rendering Fumadocs app with --app, on published packages', () => {
    const files = templates({ name: 'my-docs', app: true });
    // The render path a stranger lands on day-1.
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining([
        'next.config.mjs',
        'tsconfig.json',
        'app/layout.tsx',
        'app/docs/[[...slug]]/page.tsx',
        'app/trust/page.tsx',
        'lib/source.ts',
        'lib/tree.ts',
      ]),
    );
    // npm run dev must exist, and deps must resolve from npm (no workspace:*).
    expect(files['package.json']).toContain('"dev": "next dev"');
    expect(files['package.json']).toContain('"@getnema/adapter-fumadocs": "^0.1.0"');
    expect(files['package.json']).not.toContain('workspace:*');
    // The rendered page carries the provenance badge.
    expect(files['app/docs/[[...slug]]/page.tsx']).toContain('ProvenanceBadge');
    // Escaped template literals survived as real JS template syntax, not interpolated away.
    expect(files['app/docs/[[...slug]]/page.tsx']).toContain('`/md/${page.path}`');
    expect(files['lib/tree.ts']).toContain('`/docs/${path}`');
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
