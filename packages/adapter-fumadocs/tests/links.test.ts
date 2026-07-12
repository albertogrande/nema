// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { docHref } from '../src/links.js';

describe('docHref — corpus .md links → rendered routes', () => {
  it('rewrites a sibling link from the index page (the /docs 404 case)', () => {
    expect(docHref('getting-started.md', 'index')).toBe('/docs/getting-started');
    expect(docHref('reference.md', 'index')).toBe('/docs/reference');
  });

  it('rewrites sibling links from a flat page and keeps anchors', () => {
    expect(docHref('multi-agent.md', 'gates')).toBe('/docs/multi-agent');
    expect(docHref('producer-loop.md#the-one-invariant', 'mcp')).toBe(
      '/docs/producer-loop#the-one-invariant',
    );
  });

  it('resolves nested and ../ paths against the linking page directory', () => {
    expect(docHref('errors.md', 'guides/setup')).toBe('/docs/guides/errors');
    expect(docHref('../reference.md', 'guides/setup')).toBe('/docs/reference');
    expect(docHref('./intro.md', 'guides/setup')).toBe('/docs/guides/intro');
  });

  it('maps index.md to the docs root', () => {
    expect(docHref('index.md', 'getting-started')).toBe('/docs');
  });

  it('passes through absolute paths, full URLs, anchors, and non-md links', () => {
    expect(docHref('/trust', 'index')).toBe('/trust');
    expect(docHref('https://example.com/x.md', 'index')).toBe('https://example.com/x.md');
    expect(docHref('#sources', 'index')).toBe('#sources');
    expect(docHref('mailto:a@b.c', 'index')).toBe('mailto:a@b.c');
    expect(docHref('image.png', 'index')).toBe('image.png');
  });
});
