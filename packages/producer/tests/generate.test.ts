// SPDX-License-Identifier: Apache-2.0
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkContent } from '@getnema/gates';
import { readProvenanceFromContent } from '@getnema/provenance';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { generateCorpus, ingestRepo, planDocs } from '../src/index.js';

const CLOCK = () => new Date('2026-06-25T12:00:00Z');

let repoDir: string;

beforeAll(() => {
  repoDir = mkdtempSync(join(tmpdir(), 'nema-generate-src-'));
  mkdirSync(join(repoDir, 'source'), { recursive: true });
  writeFileSync(
    join(repoDir, 'package.json'),
    JSON.stringify({ name: 'ky', description: 'Tiny & elegant HTTP client based on Fetch.' }),
  );
  writeFileSync(
    join(repoDir, 'README.md'),
    '# ky\n\n[![badge](x)](y)\n\nKy is a tiny and elegant HTTP client based on the Fetch API.\n',
  );
  writeFileSync(
    join(repoDir, 'source/index.ts'),
    [
      "export {default} from './core/Ky.js';",
      "export type {Options, Hooks} from './types/options.js';",
      'export class HTTPError extends Error {}',
      'export function isHTTPError(x: unknown): boolean { return false; }',
    ].join('\n'),
  );
});

afterAll(() => rmSync(repoDir, { recursive: true, force: true }));

describe('ingestRepo', () => {
  it('reads name/description, README intro, and exported symbols', () => {
    const repo = ingestRepo(repoDir);
    expect(repo.name).toBe('ky');
    expect(repo.description).toContain('elegant');
    expect(repo.readmeIntro).toBe('Ky is a tiny and elegant HTTP client based on the Fetch API.');
    const names = repo.exports.map((e) => e.name);
    expect(names).toContain('HTTPError');
    expect(names).toContain('isHTTPError');
    expect(names).toContain('Options');
    expect(names).not.toContain('default'); // a default re-export carries no useful name
  });
});

describe('planDocs', () => {
  it('plans an overview + tutorial + reference, each footnoting its sources', () => {
    const entries = planDocs(ingestRepo(repoDir));
    expect(entries.map((e) => e.path)).toEqual(['index', 'getting-started', 'api/reference']);
    const ref = entries.find((e) => e.path === 'api/reference');
    expect(ref?.body).toContain('`HTTPError`');
    // Every declared source id is referenced by a footnote (provenance-consistency gate).
    for (const e of entries) {
      for (const s of e.sources) expect(e.body).toContain(`[^${s.id}]`);
    }
  });
});

describe('generateCorpus', () => {
  it('writes seeded ai drafts that are gate-clean', async () => {
    const root = mkdtempSync(join(tmpdir(), 'nema-generate-out-'));
    const contentRoot = join(root, 'docs');
    mkdirSync(contentRoot, { recursive: true });

    const result = generateCorpus({
      repoDir,
      contentRoot,
      model: { name: 'claude-opus-4-8', vendor: 'anthropic' },
      clock: CLOCK,
    });
    expect(result.pages.map((p) => p.path)).toEqual(['index', 'getting-started', 'api/reference']);

    const prov = readProvenanceFromContent(readFileSync(join(contentRoot, 'index.md'), 'utf8'));
    expect(prov?.authored_by).toBe('ai');
    expect(prov?.model?.name).toBe('claude-opus-4-8');
    expect(prov?.transitions.at(-1)?.to).toBe('draft');

    const gate = await checkContent(root, { today: CLOCK(), config: { contentDir: 'docs' } });
    expect(gate.diagnostics, JSON.stringify(gate.diagnostics)).toEqual([]);
    expect(gate.ok).toBe(true);

    rmSync(root, { recursive: true, force: true });
  });

  it('seeds human authorship when no model is named', () => {
    const root = mkdtempSync(join(tmpdir(), 'nema-generate-human-'));
    const contentRoot = join(root, 'docs');
    mkdirSync(contentRoot, { recursive: true });
    generateCorpus({ repoDir, contentRoot, clock: CLOCK });
    const prov = readProvenanceFromContent(readFileSync(join(contentRoot, 'index.md'), 'utf8'));
    expect(prov?.authored_by).toBe('human');
    rmSync(root, { recursive: true, force: true });
  });
});
