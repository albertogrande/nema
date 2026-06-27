// SPDX-License-Identifier: Apache-2.0
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { type ResolvedConfig, loadPages } from '@getnema/core';
import { afterEach, describe, expect, it } from 'vitest';
import { type LabeledCorpus, mergeCorpora, runCoherenceGate } from '../src/index.js';

const TODAY = new Date('2026-06-25T00:00:00Z');
const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

/** Write a set of `path -> markdown` files into a temp dir and load it as a corpus. */
function corpus(label: string, files: Record<string, string>): LabeledCorpus {
  const root = mkdtempSync(join(tmpdir(), `nema-coh-${label}-`));
  dirs.push(root);
  for (const [route, md] of Object.entries(files)) {
    const file = join(root, `${route}.md`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, md, 'utf8');
  }
  const config: ResolvedConfig = {
    rootDir: root,
    contentDir: '.',
    contentRoot: root,
    reviewSlaDays: 180,
    rootExempt: ['index'],
    baseUrl: '',
  };
  return { label, pages: loadPages(root), config };
}

const page = (title: string, body: string) =>
  `---\ntitle: ${title}\nstatus: draft\n---\n\n# ${title}\n\n${body}\n`;

describe('merge-time coherence gate', () => {
  it('passes when two branches own different sections (disjoint edits)', () => {
    const base = corpus('base', {
      index: page('Home', 'See [guides](/guides/index) and [api](/api/index).'),
      'guides/index': page('Guides', 'Back [home](/index).'),
      'api/index': page('API', 'Back [home](/index).'),
    });
    const a = corpus('feat-a', {
      index: page('Home', 'See [guides](/guides/index) and [api](/api/index).'),
      'guides/index': page('Guides', 'Back [home](/index). See [setup](/guides/setup).'),
      'guides/setup': page('Setup', 'Back to [guides](/guides/index).'),
      'api/index': page('API', 'Back [home](/index).'),
    });
    const b = corpus('feat-b', {
      index: page('Home', 'See [guides](/guides/index) and [api](/api/index).'),
      'guides/index': page('Guides', 'Back [home](/index).'),
      'api/index': page('API', 'Back [home](/index). See [errors](/api/errors).'),
      'api/errors': page('Errors', 'Back to [api](/api/index).'),
    });
    const result = runCoherenceGate([a, b], { base, today: TODAY });
    expect(result.diagnostics, JSON.stringify(result.diagnostics)).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('cleanly merges independent edits to the *same* shared page (diff3, like git)', () => {
    // Both branches add a nav link to the index — at different anchors, so the
    // line-level merge resolves them, exactly as a real `git merge` would.
    const indexBody = (extra: { afterGuide?: string; atEnd?: string }) =>
      [
        '# Home',
        '',
        '- [guide](/guide)',
        ...(extra.afterGuide ? [extra.afterGuide] : []),
        '',
        'More below.',
        ...(extra.atEnd ? [extra.atEnd] : []),
      ].join('\n');
    const fm = (body: string) => `---\ntitle: Home\nstatus: draft\n---\n\n${body}\n`;
    const base = corpus('base', {
      index: fm(indexBody({})),
      guide: page('Guide', 'Back [home](/index).'),
    });
    const a = corpus('feat-a', {
      index: fm(indexBody({ afterGuide: '- [api a](/api-a)' })),
      guide: page('Guide', 'Back [home](/index).'),
      'api-a': page('API A', 'Back [home](/index).'),
    });
    const b = corpus('feat-b', {
      index: fm(indexBody({ atEnd: '- [api b](/api-b)' })),
      guide: page('Guide', 'Back [home](/index).'),
      'api-b': page('API B', 'Back [home](/index).'),
    });
    const { merged, conflicts } = mergeCorpora([a, b], base);
    expect(conflicts, JSON.stringify(conflicts)).toEqual([]);
    const mergedIndex = merged.find((p) => p.path === 'index')!;
    expect(mergedIndex.body).toContain('/api-a'); // A's link survived
    expect(mergedIndex.body).toContain('/api-b'); // B's link survived
    const result = runCoherenceGate([a, b], { base, today: TODAY });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
  });

  it('flags a slot-collision when two branches create the same route differently', () => {
    const base = corpus('base', { index: page('Home', 'Welcome.') });
    const a = corpus('feat-a', {
      index: page('Home', 'Welcome. [Options](/api/options).'),
      'api/options': page('Options', 'A wrote this. Back [home](/index).'),
    });
    const b = corpus('feat-b', {
      index: page('Home', 'Welcome. [Options](/api/options).'),
      'api/options': page('Options', 'B wrote something else. Back [home](/index).'),
    });
    const result = runCoherenceGate([a, b], { base, today: TODAY });
    const collision = result.diagnostics.filter((d) => d.rule === 'slot-collision');
    expect(collision).toHaveLength(1);
    expect(collision[0]!.path).toBe('api/options');
    expect(collision[0]!.message).toMatch(/feat-a/);
    expect(collision[0]!.message).toMatch(/feat-b/);
    expect(result.ok).toBe(false);
  });

  it('reports only the root-cause collision, not derived merge-coherence cascade', () => {
    // Both branches create api/options differently (a collision) AND both link it
    // from the index the same way. A naive union would omit the conflicted page and
    // then also cry "broken link /api/options" + "orphan" — pure cascade noise.
    const base = corpus('base', { index: page('Home', 'Welcome.') });
    const a = corpus('feat-a', {
      index: page('Home', 'Welcome. See [options](/api/options).'),
      'api/options': page('Options', 'A wrote this. Back [home](/index).'),
    });
    const b = corpus('feat-b', {
      index: page('Home', 'Welcome. See [options](/api/options).'),
      'api/options': page('Options', 'B wrote ELSE. Back [home](/index).'),
    });
    const result = runCoherenceGate([a, b], { base, today: TODAY });
    expect(result.diagnostics.filter((d) => d.rule === 'slot-collision')).toHaveLength(1);
    // The collision is the only diagnostic — no derived merge-coherence noise.
    expect(result.diagnostics.filter((d) => d.rule === 'merge-coherence')).toEqual([]);
  });

  it('does not flag a collision when both branches add identical content', () => {
    const identical = page('Shared', 'Same bytes. Back [home](/index).');
    const base = corpus('base', { index: page('Home', '[Shared](/shared).') });
    const a = corpus('feat-a', { index: page('Home', '[Shared](/shared).'), shared: identical });
    const b = corpus('feat-b', { index: page('Home', '[Shared](/shared).'), shared: identical });
    const result = runCoherenceGate([a, b], { base, today: TODAY });
    expect(result.diagnostics.filter((d) => d.rule === 'slot-collision')).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('flags a merge-broken link when one branch deletes a page another still links', () => {
    const base = corpus('base', {
      index: page('Home', 'See [legacy](/legacy).'),
      legacy: page('Legacy', 'Back [home](/index).'),
    });
    // Branch A removes legacy (and the link to it) — green on its own.
    const a = corpus('feat-a', { index: page('Home', 'Cleaned up.') });
    // Branch B adds a new page that links to legacy — green on its own (legacy exists in B).
    const b = corpus('feat-b', {
      index: page('Home', 'See [legacy](/legacy) and [more](/more).'),
      legacy: page('Legacy', 'Back [home](/index).'),
      more: page('More', 'See [legacy](/legacy). Back [home](/index).'),
    });
    const result = runCoherenceGate([a, b], { base, today: TODAY });
    const broken = result.diagnostics.filter((d) => d.rule === 'merge-coherence');
    expect(broken.length, JSON.stringify(result.diagnostics)).toBeGreaterThan(0);
    expect(broken.some((d) => d.message.includes('/legacy'))).toBe(true);
    expect(result.ok).toBe(false);
  });

  it('notes a rename when one branch moves a page another branch still links', () => {
    const oldContent = page('Reference', 'Back [home](/index).');
    const base = corpus('base', {
      index: page('Home', 'See [guide](/guide) and [ref](/reference).'),
      guide: page('Guide', 'Back [home](/index).'),
      reference: oldContent,
    });
    // Branch A moves reference -> api/reference (same content) and updates its own link.
    const a = corpus('feat-a', {
      index: page('Home', 'See [guide](/guide) and [ref](/api/reference).'),
      guide: page('Guide', 'Back [home](/index).'),
      'api/reference': oldContent,
    });
    // Branch B doesn't know about the move and adds a link to the OLD path from guide.
    const b = corpus('feat-b', {
      index: page('Home', 'See [guide](/guide) and [ref](/reference).'),
      guide: page('Guide', 'See [the reference](/reference). Back [home](/index).'),
      reference: oldContent,
    });
    const result = runCoherenceGate([a, b], { base, today: TODAY });
    const broken = result.diagnostics.filter((d) => d.rule === 'merge-coherence');
    expect(broken.length, JSON.stringify(result.diagnostics)).toBeGreaterThan(0);
    expect(broken.some((d) => /renamed to '\/api\/reference' on feat-a/.test(d.message))).toBe(
      true,
    );
  });

  it('flags an edit/delete conflict', () => {
    const base = corpus('base', {
      index: page('Home', '[Doc](/doc).'),
      doc: page('Doc', 'Original. Back [home](/index).'),
    });
    const a = corpus('feat-a', {
      index: page('Home', '[Doc](/doc).'),
      doc: page('Doc', 'Edited by A. Back [home](/index).'),
    });
    const b = corpus('feat-b', { index: page('Home', 'Removed the doc link.') });
    const result = runCoherenceGate([a, b], { base, today: TODAY });
    const conflict = result.diagnostics.find(
      (d) => d.rule === 'slot-collision' && d.path === 'doc',
    );
    expect(conflict?.message).toMatch(/edit\/delete/);
  });

  it('mergeCorpora keeps an untouched baseline page and a single branch edit', () => {
    const base = corpus('base', {
      index: page('Home', '[a](/a) [b](/b)'),
      a: page('A', 'orig a'),
      b: page('B', 'orig b'),
    });
    const a = corpus('feat-a', {
      index: page('Home', '[a](/a) [b](/b)'),
      a: page('A', 'edited a'),
      b: page('B', 'orig b'),
    });
    const { merged, conflicts } = mergeCorpora([a], base);
    expect(conflicts).toEqual([]);
    expect(merged.find((p) => p.path === 'a')?.body).toContain('edited a');
    expect(merged.find((p) => p.path === 'b')?.body).toContain('orig b');
  });

  it('works without a base (pure union of branches)', () => {
    const a = corpus('feat-a', {
      index: page('Home', '[a](/a)'),
      a: page('A', 'Back [home](/index).'),
    });
    const b = corpus('feat-b', {
      index: page('Home', '[a](/a)'),
      a: page('A', 'Back [home](/index).'),
    });
    const result = runCoherenceGate([a, b], { today: TODAY });
    expect(result.ok).toBe(true);
  });
});
