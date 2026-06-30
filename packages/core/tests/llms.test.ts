// SPDX-License-Identifier: Apache-2.0
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { ContentSource } from '../src/index.js';
import {
  buildLlmsFull,
  buildLlmsIndex,
  buildNav,
  loadPages,
  renderMarkdown,
} from '../src/index.js';

const CONTENT_ROOT = fileURLToPath(new URL('./fixtures/docs', import.meta.url));
const pages = loadPages(CONTENT_ROOT);

function fakeSource(): ContentSource {
  return {
    pages,
    nav: buildNav(pages),
    config: {
      rootDir: '',
      contentDir: 'docs',
      contentRoot: CONTENT_ROOT,
      codeRoot: CONTENT_ROOT,
      reviewSlaDays: 180,
      rootExempt: ['index'],
      baseUrl: '',
    },
    getPage: (p) => pages.find((x) => x.path === p) ?? null,
    search: () => [],
    renderMarkdown,
    provenanceOf: (p) => pages.find((x) => x.path === p)?.provenance ?? null,
  };
}

describe('buildLlmsIndex', () => {
  it('lists every page with a .md link and a trust annotation', () => {
    const out = buildLlmsIndex(fakeSource(), { title: 'Nema Docs', description: 'Hi' });
    expect(out.startsWith('# Nema Docs')).toBe(true);
    expect(out).toContain('> Hi');
    for (const p of pages) expect(out).toContain(`(/md/${p.path})`);
    const bullets = out.split('\n').filter((l) => l.startsWith('- ['));
    expect(bullets.length).toBe(pages.length);
  });

  it('honors an absolute baseUrl', () => {
    const out = buildLlmsIndex(fakeSource(), { baseUrl: 'https://x.dev/' });
    expect(out).toContain('(https://x.dev/md/');
    expect(out).not.toContain('(https://x.dev//md/');
  });
});

describe('buildLlmsFull', () => {
  it('concatenates every page body with a provenance stamp', () => {
    const out = buildLlmsFull(fakeSource(), { title: 'Nema Docs' });
    for (const p of pages) {
      expect(out).toContain(renderMarkdown(p));
      expect(out).toContain(`path: ${p.path}`);
    }
  });
});
