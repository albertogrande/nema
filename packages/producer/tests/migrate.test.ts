// SPDX-License-Identifier: Apache-2.0
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkContent } from '@getnema/gates';
import { readProvenanceFromContent } from '@getnema/provenance';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrateCorpus } from '../src/index.js';

const CLOCK = () => new Date('2026-06-25T12:00:00Z');

let root: string;
let contentRoot: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'nema-migrate-'));
  contentRoot = join(root, 'docs');
  mkdirSync(contentRoot, { recursive: true });
  // A legacy corpus with no Nema frontmatter at all.
  writeFileSync(join(contentRoot, 'index.md'), '# Home\n\nSee the [Guide](guide.md).\n');
  writeFileSync(
    join(contentRoot, 'guide.md'),
    '---\ntitle: The Guide\n---\n\n# The Guide\n\nLegacy content.\n',
  );
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('migrateCorpus', () => {
  it('seeds status + human provenance and is gate-clean', async () => {
    const result = await migrateCorpus({ contentRoot, repoRoot: root, clock: CLOCK });
    expect(result.migrated.map((m) => m.path).sort()).toEqual(['guide', 'index']);
    expect(result.skipped).toEqual([]);

    const guide = readProvenanceFromContent(readFileSync(join(contentRoot, 'guide.md'), 'utf8'));
    expect(guide?.authored_by).toBe('human');
    expect(guide?.reviewed_by?.method).toBe('migration');
    expect(guide?.transitions.at(-1)?.to).toBe('reviewed');

    // Inferred title from the H1 when frontmatter had none.
    const index = readFileSync(join(contentRoot, 'index.md'), 'utf8');
    expect(index).toContain('title: Home');
    expect(index).toContain('status: reviewed');

    const gate = await checkContent(root, { today: CLOCK(), config: { contentDir: 'docs' } });
    expect(gate.diagnostics, JSON.stringify(gate.diagnostics)).toEqual([]);
    expect(gate.ok).toBe(true);
  });

  it('is idempotent (skips already-migrated pages)', async () => {
    const again = await migrateCorpus({ contentRoot, repoRoot: root, clock: CLOCK });
    expect(again.migrated).toEqual([]);
    expect(again.skipped.sort()).toEqual(['guide', 'index']);
  });

  it('can migrate to draft instead of reviewed', async () => {
    const draftRoot = mkdtempSync(join(tmpdir(), 'nema-migrate-draft-'));
    const dc = join(draftRoot, 'docs');
    mkdirSync(dc, { recursive: true });
    writeFileSync(join(dc, 'index.md'), '# Notes\n\nA legacy note.\n');
    const res = await migrateCorpus({
      contentRoot: dc,
      repoRoot: draftRoot,
      status: 'draft',
      clock: CLOCK,
    });
    const prov = readProvenanceFromContent(readFileSync(join(dc, 'index.md'), 'utf8'));
    expect(res.migrated[0]?.status).toBe('draft');
    expect(prov?.reviewed_by).toBeUndefined();
    expect(prov?.transitions.at(-1)?.to).toBe('draft');
    rmSync(draftRoot, { recursive: true, force: true });
  });

  it('respects an existing valid status', async () => {
    const r = mkdtempSync(join(tmpdir(), 'nema-migrate-existing-'));
    const dc = join(r, 'docs');
    mkdirSync(dc, { recursive: true });
    writeFileSync(join(dc, 'index.md'), '---\ntitle: WIP\nstatus: draft\n---\n\nDraft body.\n');
    const res = await migrateCorpus({
      contentRoot: dc,
      repoRoot: r,
      status: 'reviewed',
      clock: CLOCK,
    });
    expect(res.migrated[0]?.status).toBe('draft'); // kept, not forced to reviewed
    rmSync(r, { recursive: true, force: true });
  });
});
