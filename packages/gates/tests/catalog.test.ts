// SPDX-License-Identifier: Apache-2.0
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type ResolvedConfig, contentSourceFromConfig } from '@getnema/core';
import { afterAll, describe, expect, it } from 'vitest';
import {
  RULE_CATALOG,
  RULE_IDS,
  createGateContext,
  formatGateResult,
  formatGateResultJson,
  gateReport,
  runGates,
} from '../src/index.js';

const TODAY = new Date('2026-06-25T00:00:00Z');

function fixture(name: string) {
  const contentRoot = fileURLToPath(new URL(`./fixtures/${name}/docs`, import.meta.url));
  const config: ResolvedConfig = {
    rootDir: fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)),
    contentDir: 'docs',
    contentRoot,
    reviewSlaDays: 180,
    rootExempt: ['index'],
    baseUrl: '',
  };
  return runGates(createGateContext(contentSourceFromConfig(config), { today: TODAY }));
}

describe('rule catalog', () => {
  it('documents every rule id that can fire, with a remediation hint', () => {
    const firedIds = new Set(fixture('dirty').diagnostics.map((d) => d.rule));
    firedIds.add('empty-corpus'); // engine-emitted, never by a rule
    expect(firedIds.size).toBeGreaterThan(5);
    for (const id of firedIds) {
      const doc = RULE_CATALOG[id];
      expect(doc, `rule '${id}' is missing from RULE_CATALOG`).toBeDefined();
      expect(doc!.hint.length, `rule '${id}' has an empty hint`).toBeGreaterThan(0);
      expect(doc!.details.length).toBeGreaterThan(0);
    }
  });

  it('RULE_IDS is sorted and consistent with the catalog keys', () => {
    expect(RULE_IDS).toEqual([...RULE_IDS].sort());
    expect(new Set(RULE_IDS)).toEqual(new Set(Object.keys(RULE_CATALOG)));
  });
});

describe('diagnostic enrichment', () => {
  it('attaches a catalog hint to every diagnostic', () => {
    const result = fixture('dirty');
    expect(result.diagnostics.length).toBeGreaterThan(0);
    for (const d of result.diagnostics) {
      expect(d.hint, `'${d.rule}' diagnostic has no hint`).toBe(RULE_CATALOG[d.rule]?.hint);
    }
  });

  it('reports the number of pages checked', () => {
    const result = fixture('clean');
    expect(result.checked).toBeGreaterThan(0);
    expect(result.ok).toBe(true);
  });
});

describe('empty corpus', () => {
  const dirs: string[] = [];
  afterAll(() => {
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
  });

  it('is a warning (not a silent green), with checked=0', () => {
    const root = mkdtempSync(join(tmpdir(), 'nema-empty-'));
    dirs.push(root);
    mkdirSync(join(root, 'docs'), { recursive: true });
    const config: ResolvedConfig = {
      rootDir: root,
      contentDir: 'docs',
      contentRoot: join(root, 'docs'),
      reviewSlaDays: 180,
      rootExempt: ['index'],
      baseUrl: '',
    };
    const result = runGates(createGateContext(contentSourceFromConfig(config), { today: TODAY }));
    expect(result.checked).toBe(0);
    expect(result.ok).toBe(true); // a warning, so exit stays 0
    expect(result.warningCount).toBe(1);
    expect(result.diagnostics[0]?.rule).toBe('empty-corpus');
    expect(result.diagnostics[0]?.hint).toBeTruthy();
  });
});

describe('formatting', () => {
  it('renders help lines, a page count, and the explain footer', () => {
    const text = formatGateResult(fixture('dirty'));
    expect(text).toContain('      help: ');
    expect(text).toMatch(/· \d+ pages/);
    expect(text).toContain('nema explain <rule>');
  });

  it('shows the page count on a clean pass', () => {
    const text = formatGateResult(fixture('clean'));
    expect(text).toContain('all gates passed');
    expect(text).toMatch(/\(\d+ pages?\)/);
  });

  it('produces a stable JSON report that round-trips', () => {
    const result = fixture('dirty');
    const report = gateReport(result);
    expect(report).toMatchObject({
      ok: false,
      checked: result.checked,
      errorCount: result.errorCount,
      warningCount: result.warningCount,
    });
    const parsed = JSON.parse(formatGateResultJson(result));
    expect(parsed.diagnostics.length).toBe(result.diagnostics.length);
    for (const d of parsed.diagnostics) {
      expect(d).toHaveProperty('rule');
      expect(d).toHaveProperty('severity');
      expect(d).toHaveProperty('path');
      expect(d).toHaveProperty('message');
    }
  });
});
