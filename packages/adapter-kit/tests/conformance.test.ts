// SPDX-License-Identifier: Apache-2.0
import { fileURLToPath } from 'node:url';
import {
  type ContentSource,
  type NavNode,
  type Page,
  type ResolvedConfig,
  contentSourceFromConfig,
} from '@getnema/core';
import { describe, expect, it } from 'vitest';
import {
  type NavRoute,
  type RendererAdapter,
  assertAdapterConformance,
  noInlineEnums,
  runAdapterConformance,
} from '../src/index.js';

function source(): ContentSource {
  const contentRoot = fileURLToPath(new URL('./fixtures/docs', import.meta.url));
  const config: ResolvedConfig = {
    rootDir: fileURLToPath(new URL('./fixtures', import.meta.url)),
    contentDir: 'docs',
    contentRoot,
    reviewSlaDays: 180,
    rootExempt: ['index'],
    baseUrl: '',
  };
  return contentSourceFromConfig(config);
}

function flattenNav(nav: NavNode[]): NavRoute[] {
  const out: NavRoute[] = [];
  const walk = (nodes: NavNode[]): void => {
    for (const node of nodes) {
      if (node.path) out.push({ path: node.path, title: node.title });
      if (node.items) walk(node.items);
    }
  };
  walk(nav);
  return out;
}

const compliant: RendererAdapter = {
  name: 'compliant',
  toRendererSource: (s) => s.pages,
  markdownRoute: (s, p: Page) => s.renderMarkdown(p),
  navRoutes: (s) => flattenNav(s.nav),
};

const broken: RendererAdapter = {
  name: 'broken',
  toRendererSource: (s) => s.pages,
  markdownRoute: (_s, p: Page) => p.body, // skips the H1 canonicalizer -> breaks parity
  navRoutes: (s) => flattenNav(s.nav),
};

describe('runAdapterConformance', () => {
  it('passes a compliant adapter', () => {
    const result = runAdapterConformance(compliant, source());
    expect(result.failures).toEqual([]);
    expect(result.passed).toBe(true);
    expect(() => assertAdapterConformance(compliant, source())).not.toThrow();
  });

  it('fails an adapter that breaks md-parity', () => {
    const result = runAdapterConformance(broken, source());
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.startsWith('md-parity'))).toBe(true);
    expect(() => assertAdapterConformance(broken, source())).toThrow(/conformance failed/);
  });
});

describe('noInlineEnums', () => {
  it('flags a file that hardcodes a full enum set', () => {
    const enums = { status: ['stub', 'draft', 'reviewed', 'deprecated'] };
    const offenders = noInlineEnums(
      [{ path: 'bad.ts', text: "const S = ['stub', 'draft', 'reviewed', 'deprecated'];" }],
      enums,
    );
    expect(offenders).toHaveLength(1);
    expect(
      noInlineEnums([{ path: 'ok.ts', text: "import { CONTENT_MODEL } from 'x';" }], enums),
    ).toEqual([]);
  });
});
