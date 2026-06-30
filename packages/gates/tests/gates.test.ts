// SPDX-License-Identifier: Apache-2.0
import { fileURLToPath } from 'node:url';
import { type ResolvedConfig, contentSourceFromConfig } from '@getnema/core';
import { describe, expect, it } from 'vitest';
import { createGateContext, formatGateResult, runGates } from '../src/index.js';

const TODAY = new Date('2026-06-25T00:00:00Z');

function sourceFor(name: string) {
  const contentRoot = fileURLToPath(new URL(`./fixtures/${name}/docs`, import.meta.url));
  const config: ResolvedConfig = {
    rootDir: fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)),
    contentDir: 'docs',
    contentRoot,
    codeRoot: contentRoot,
    reviewSlaDays: 180,
    rootExempt: ['index'],
    baseUrl: '',
  };
  return contentSourceFromConfig(config);
}

function rulesFired(name: string): Set<string> {
  const result = runGates(createGateContext(sourceFor(name), { today: TODAY }));
  return new Set(result.diagnostics.map((d) => d.rule));
}

describe('clean corpus', () => {
  it('passes all gates', () => {
    const result = runGates(createGateContext(sourceFor('clean'), { today: TODAY }));
    expect(result.diagnostics, formatGateResult(result)).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

describe('dirty corpus', () => {
  const fired = rulesFired('dirty');

  it('fails overall', () => {
    const result = runGates(createGateContext(sourceFor('dirty'), { today: TODAY }));
    expect(result.ok).toBe(false);
    expect(result.errorCount).toBeGreaterThan(0);
  });

  it.each([
    'frontmatter-required',
    'enums-valid',
    'dates-valid',
    'freshness',
    'footnotes',
    'links-resolve',
    'anchors-resolve',
    'reachability',
    'provenance-consistency',
    'draft-pages-not-reviewed',
  ])('fires rule %s', (rule) => {
    expect(fired).toContain(rule);
  });
});

describe('reviewed invariant', () => {
  it('blocks a self-promoted reviewed page (no human approval evidence)', () => {
    const result = runGates(createGateContext(sourceFor('dirty'), { today: TODAY }));
    const overdue = result.diagnostics.filter(
      (d) => d.path === 'overdue' && d.rule === 'draft-pages-not-reviewed',
    );
    expect(overdue.length).toBeGreaterThan(0);
  });
});
