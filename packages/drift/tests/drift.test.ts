// SPDX-License-Identifier: Apache-2.0
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { detectDrift, detectPageDrift, readCodeBindings, stampBindings } from '../src/detect.js';
import { fingerprintBinding, resolveStrategy } from '../src/fingerprint.js';
import { extractExports, symbolSignature } from '../src/symbols.js';

describe('extractExports', () => {
  it('finds inline and listed exports', () => {
    const src = `
      export function createServer(opts: Opts): Server {}
      export const VERSION = '1';
      class Hidden {}
      export { Hidden as Server };
    `;
    const names = extractExports(src)
      .map((e) => e.name)
      .sort();
    expect(names).toEqual(['Server', 'VERSION', 'createServer']);
  });
});

describe('symbolSignature', () => {
  it('drops the body of a function but keeps params/return', () => {
    const a = symbolSignature('export function f(a: number): string { return ""; }', 'f');
    const b = symbolSignature('export function f(a: number): string { return "changed"; }', 'f');
    expect(a).toBe(b); // body change ⇒ same signature
  });

  it('changes when a parameter type changes', () => {
    const a = symbolSignature('export function f(a: number): string { return ""; }', 'f');
    const b = symbolSignature('export function f(a: string): string { return ""; }', 'f');
    expect(a).not.toBe(b);
  });

  it('keeps the member block of an interface', () => {
    const a = symbolSignature('export interface I { a: number }', 'I');
    const b = symbolSignature('export interface I { a: number; b: string }', 'I');
    expect(a).not.toBe(b);
  });

  it('is whitespace-insensitive', () => {
    const a = symbolSignature('export function f(a: number): void {}', 'f');
    const b = symbolSignature('export   function   f(  a:number ) : void {}', 'f');
    expect(a).toBe(b);
  });

  it('returns null for an undeclared symbol', () => {
    expect(symbolSignature('export const x = 1;', 'y')).toBeNull();
  });
});

describe('fingerprint + detect', () => {
  let dir: string;
  const file = (rel: string, body: string) => writeFileSync(join(dir, rel), body, 'utf8');

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'nema-drift-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('infers strategy from extension', () => {
    expect(resolveStrategy({ id: 'a', source: 'x.ts' })).toBe('symbols');
    expect(resolveStrategy({ id: 'a', source: 'x.md' })).toBe('file');
    expect(resolveStrategy({ id: 'a', source: 'x.md', strategy: 'symbols' })).toBe('symbols');
  });

  it('body edits do not drift; signature edits do', () => {
    file('api.ts', 'export function f(a: number): void { return; }');
    const binding = { id: 'cb', source: 'api.ts' };
    const baseline = fingerprintBinding(binding, dir).fingerprint!;

    file('api.ts', 'export function f(a: number): void { console.log(a); }');
    expect(fingerprintBinding(binding, dir).fingerprint).toBe(baseline);

    file('api.ts', 'export function f(a: string): void { return; }');
    expect(fingerprintBinding(binding, dir).fingerprint).not.toBe(baseline);
  });

  it('detects changed, missing-source, missing-symbols, no-baseline', () => {
    file('api.ts', 'export function f(a: number): void {}\nexport const V = 1;');
    const fp = fingerprintBinding({ id: 'cb', source: 'api.ts' }, dir).fingerprint!;

    // changed
    const changed = detectPageDrift(
      {
        path: 'p',
        status: 'reviewed',
        frontmatter: { code: [{ id: 'cb', source: 'api.ts', fingerprint: 'sha256:stale' }] },
      },
      dir,
    );
    expect(changed[0]?.reason).toBe('changed');

    // current (no finding)
    const clean = detectPageDrift(
      {
        path: 'p',
        status: 'reviewed',
        frontmatter: { code: [{ id: 'cb', source: 'api.ts', fingerprint: fp }] },
      },
      dir,
    );
    expect(clean).toEqual([]);

    // no-baseline
    const nb = detectPageDrift(
      { path: 'p', status: 'draft', frontmatter: { code: [{ id: 'cb', source: 'api.ts' }] } },
      dir,
    );
    expect(nb[0]?.reason).toBe('no-baseline');
    expect(nb[0]?.actionable).toBe(false);

    // missing-source
    const ms = detectPageDrift(
      {
        path: 'p',
        status: 'reviewed',
        frontmatter: { code: [{ id: 'cb', source: 'gone.ts', fingerprint: 'sha256:x' }] },
      },
      dir,
    );
    expect(ms[0]?.reason).toBe('missing-source');

    // missing-symbols
    const msym = detectPageDrift(
      {
        path: 'p',
        status: 'reviewed',
        frontmatter: {
          code: [{ id: 'cb', source: 'api.ts', symbols: ['gone'], fingerprint: 'sha256:x' }],
        },
      },
      dir,
    );
    expect(msym[0]?.reason).toBe('missing-symbols');
    expect(msym[0]?.symbols).toEqual(['gone']);
  });

  it('stampBindings refreshes the baseline to current', () => {
    file('api.ts', 'export const V = 1;');
    const [stamped] = stampBindings([{ id: 'cb', source: 'api.ts' }], dir, '2026-06-30');
    expect(stamped?.fingerprint).toMatch(/^sha256:/);
    expect(stamped?.fingerprinted_at).toBe('2026-06-30');

    const clean = detectPageDrift(
      { path: 'p', status: 'reviewed', frontmatter: { code: [stamped] } },
      dir,
    );
    expect(clean).toEqual([]);
  });

  it('detectDrift aggregates per-corpus counts', () => {
    file('a.ts', 'export const A = 1;');
    const report = detectDrift(
      [
        {
          path: 'p1',
          status: 'reviewed',
          frontmatter: { code: [{ id: 'cb', source: 'a.ts', fingerprint: 'sha256:stale' }] },
        },
        { path: 'p2', status: 'reviewed', frontmatter: {} }, // no bindings
      ],
      dir,
    );
    expect(report.checked).toBe(1);
    expect(report.drifted).toBe(1);
  });

  it('flags an invalid code block', () => {
    const out = detectPageDrift(
      { path: 'p', status: 'draft', frontmatter: { code: [{ source: 'a.ts' }] } },
      '/tmp',
    );
    expect(out[0]?.reason).toBe('invalid-binding');
  });
});

describe('readCodeBindings', () => {
  it('returns empty when absent, error when invalid', () => {
    expect(readCodeBindings({}).bindings).toEqual([]);
    expect(readCodeBindings({ code: [{ id: 'a', source: 's' }] }).bindings).toHaveLength(1);
    expect(readCodeBindings({ code: 'nope' }).error).toBeDefined();
  });
});
