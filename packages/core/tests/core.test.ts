// SPDX-License-Identifier: Apache-2.0
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  anchorFor,
  buildNav,
  findPage,
  headingSlugs,
  loadPages,
  navPaths,
  renderMarkdown,
  search,
  tokenize,
} from '../src/index.js';

const CONTENT_ROOT = fileURLToPath(new URL('./fixtures/docs', import.meta.url));
const pages = loadPages(CONTENT_ROOT);

describe('loadPages', () => {
  it('loads and normalizes every page, sorted by path', () => {
    expect(pages.map((p) => p.path)).toEqual(['guide/index', 'guide/intro', 'index']);
  });
  it('parses nested provenance via the schema', () => {
    const intro = findPage(pages, 'guide/intro');
    expect(intro?.provenance?.authored_by).toBe('ai');
    expect(intro?.provenance?.model?.name).toBe('claude-opus-4-8');
    expect(intro?.provenance?.transitions[0]?.to).toBe('draft');
  });
  it('falls back to path for a missing title', () => {
    expect(findPage(pages, 'index')?.title).toBe('Home');
  });
});

describe('findPage', () => {
  it('resolves with index fallback, leading slash, and .md suffix', () => {
    expect(findPage(pages, '/guide')?.path).toBe('guide/index');
    expect(findPage(pages, 'guide/intro.md')?.path).toBe('guide/intro');
    expect(findPage(pages, '')?.path).toBe('index');
    expect(findPage(pages, 'nope')).toBeNull();
  });
});

describe('renderMarkdown', () => {
  it('prepends an H1 only when the body lacks one', () => {
    const intro = findPage(pages, 'guide/intro')!;
    expect(renderMarkdown(intro).startsWith('# Introduction\n')).toBe(true);
    const guide = findPage(pages, 'guide/index')!; // body already starts with "# Guide"
    expect(renderMarkdown(guide).startsWith('# Guide')).toBe(true);
    expect(renderMarkdown(guide).match(/^# Guide/gm)?.length).toBe(1);
  });
});

describe('search (BM25)', () => {
  it('returns scored, sorted hits with resolving anchors', () => {
    const hits = search(pages, 'widget threshold', 5);
    expect(hits.length).toBeGreaterThan(0);
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i]!.score).toBeLessThanOrEqual(hits[i - 1]!.score);
    }
    const top = hits[0]!;
    expect(top.path).toBe('guide/intro');
    if (top.anchor) {
      expect(headingSlugs(findPage(pages, top.path)!.body).has(top.anchor)).toBe(true);
    }
  });
  it('returns nothing for an empty query', () => {
    expect(search(pages, '   ')).toEqual([]);
  });
});

describe('anchors', () => {
  it('tokenizes to lowercase alphanumeric runs', () => {
    expect(tokenize('Widget-Threshold 42!')).toEqual(['widget', 'threshold', '42']);
  });
  it('finds the heading in effect at an offset', () => {
    const intro = findPage(pages, 'guide/intro')!;
    const idx = intro.body.indexOf('throughput');
    expect(anchorFor(intro.body, idx)).toBe('configuration');
  });
});

describe('buildNav', () => {
  it('builds a hierarchical tree from page paths', () => {
    const nav = buildNav(pages);
    const paths = navPaths(nav);
    expect(paths.has('index')).toBe(true);
    expect(paths.has('guide/index')).toBe(true);
    expect(paths.has('guide/intro')).toBe(true);
    const guideNode = nav.find((n) => n.path === 'guide/index');
    expect(guideNode?.title).toBe('Guide');
    expect(guideNode?.items?.some((i) => i.path === 'guide/intro')).toBe(true);
  });
});
