// SPDX-License-Identifier: Apache-2.0
import { type ContentSource, headingSlugs } from '@getnema/core';
import type { RendererAdapter } from './contract.js';

export interface ConformanceResult {
  passed: boolean;
  failures: string[];
  checks: { pages: number; navRoutes: number };
}

/**
 * The adapter conformance suite — the contract's teeth. Asserts, against a real
 * content source:
 *   - **md-parity**: `markdownRoute` returns `renderMarkdown` verbatim;
 *   - **h1-canonical**: every rendered page begins with exactly one title H1;
 *   - **nav-coverage** (bidirectional): every non-home page is in the nav, and
 *     every nav entry maps to a real page;
 *   - **anchor-resolution**: search deep-link anchors resolve to real headings.
 */
export function runAdapterConformance(
  adapter: RendererAdapter,
  source: ContentSource,
): ConformanceResult {
  const failures: string[] = [];

  for (const page of source.pages) {
    const got = adapter.markdownRoute(source, page);
    const want = source.renderMarkdown(page);
    if (got !== want) {
      failures.push(`md-parity: ${adapter.name}.markdownRoute(${page.path}) !== renderMarkdown`);
    }
    if (page.title) {
      if (!/^\s*#\s/.test(got)) {
        failures.push(`h1-canonical: ${page.path} render does not begin with an H1`);
      }
      const dup = got.split('\n').filter((l) => l.trim() === `# ${page.title}`).length;
      if (dup > 1) failures.push(`h1-canonical: ${page.path} render has a duplicated H1`);
    }
  }

  const routes = adapter.navRoutes(source);
  const navSet = new Set(routes.map((r) => r.path));
  const pagePaths = new Set(source.pages.map((p) => p.path));
  for (const path of pagePaths) {
    if (path !== 'index' && !navSet.has(path)) {
      failures.push(`nav-coverage: page "${path}" is not in the nav`);
    }
  }
  for (const route of navSet) {
    if (!pagePaths.has(route)) failures.push(`nav-coverage: nav entry "${route}" has no page`);
  }

  for (const page of source.pages) {
    for (const hit of source.search(page.title, 5)) {
      if (!hit.anchor) continue;
      const target = source.getPage(hit.path);
      if (target && !headingSlugs(target.body).has(hit.anchor)) {
        failures.push(`anchor-resolution: dead deep-link anchor ${hit.path}#${hit.anchor}`);
      }
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    checks: { pages: source.pages.length, navRoutes: routes.length },
  };
}

/** Throwing variant for use inside a test (`it('conforms', () => assert...)`). */
export function assertAdapterConformance(adapter: RendererAdapter, source: ContentSource): void {
  const result = runAdapterConformance(adapter, source);
  if (!result.passed) {
    throw new Error(
      `Adapter "${adapter.name}" conformance failed:\n${result.failures.map((f) => `  - ${f}`).join('\n')}`,
    );
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The `no-inline-enums` parity check: flag any file that hardcodes a full enum
 * set that should instead be consumed from the SSOT content model.
 */
export function noInlineEnums(
  files: Array<{ path: string; text: string }>,
  enums: Record<string, string[]>,
): string[] {
  const out: string[] = [];
  for (const { path, text } of files) {
    for (const [key, values] of Object.entries(enums)) {
      if (values.length < 2) continue;
      for (const match of text.matchAll(/\[[^\]]*\]/g)) {
        const segment = match[0];
        if (values.every((v) => new RegExp(`['"\`]${escapeRegex(v)}['"\`]`).test(segment))) {
          out.push(`${path}: inlines the '${key}' enum — consume the content model instead`);
          break;
        }
      }
    }
  }
  return out;
}
