// SPDX-License-Identifier: Apache-2.0
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fingerprintBinding } from '@getnema/drift';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkContent } from '../src/index.js';

/**
 * Integration coverage for the `code-drift` gate over a real on-disk corpus:
 * it must surface drift as a non-blocking warning inside `nema check`, and stay
 * silent when the bound code matches its baseline.
 */
describe('code-drift gate', () => {
  let root: string;
  const writeDoc = (body: string) => {
    mkdirSync(join(root, 'docs'), { recursive: true });
    writeFileSync(join(root, 'docs', 'index.md'), body, 'utf8');
  };
  const writeSrc = (body: string) => writeFileSync(join(root, 'api.ts'), body, 'utf8');

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'nema-gate-drift-'));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const docWith = (fingerprint: string) =>
    `---
title: Home
status: draft
code:
  - id: cb-api
    source: api.ts
    fingerprint: ${fingerprint}
---

# Home

Docs.
`;

  it('warns (not errors) when bound code has drifted', async () => {
    writeSrc('export function f(a: number): void {}');
    writeDoc(docWith('sha256:stale'));

    const result = await checkContent(root);
    const drift = result.diagnostics.filter((d) => d.rule === 'code-drift');
    expect(drift).toHaveLength(1);
    expect(drift[0]?.severity).toBe('warning');
    expect(drift[0]?.path).toBe('index');
    expect(result.ok).toBe(true); // a warning never fails the build
    expect(result.warningCount).toBeGreaterThan(0);
  });

  it('stays silent when the baseline matches the current code', async () => {
    writeSrc('export function f(a: number): void {}');
    const fp = fingerprintBinding({ id: 'cb-api', source: 'api.ts' }, root).fingerprint!;
    writeDoc(docWith(fp));

    const result = await checkContent(root);
    expect(result.diagnostics.filter((d) => d.rule === 'code-drift')).toEqual([]);
  });
});
