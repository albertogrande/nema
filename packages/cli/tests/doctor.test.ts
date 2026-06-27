// SPDX-License-Identifier: Apache-2.0
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ciScopeCheck, contentModelChecks, promoteTokenCheck } from '../src/doctor/governance.js';

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'nema-doctor-'));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function workflow(name: string, lines: string[]): void {
  const dir = join(root, '.github', 'workflows');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), lines.join('\n'));
}

describe('nema doctor — ci scope', () => {
  it('warns when `nema check` covers only fixed directories (parsing run: steps, not comments)', () => {
    workflow('ci.yml', [
      'jobs:',
      '  gates:',
      '    steps:',
      '      # nema check should also cover PR-changed pages',
      '      - run: node packages/cli/dist/index.js check examples/minimal',
      '      - run: node packages/cli/dist/index.js check apps/docs',
    ]);
    expect(ciScopeCheck(root).level).toBe('warn');
  });

  it('counts the scaffold CI step `npm run check` (resolves to `nema check`)', () => {
    workflow('nema-check.yml', [
      'jobs:',
      '  check:',
      '    steps:',
      '      - run: npm install',
      '      - run: npm run check',
    ]);
    expect(ciScopeCheck(root).level).toBe('ok');
  });

  it('also recognizes pnpm/yarn check invocations', () => {
    workflow('pnpm.yml', ['jobs:', '  check:', '    steps:', '      - run: pnpm check']);
    expect(ciScopeCheck(root).level).toBe('ok');
    rmSync(join(root, '.github'), { recursive: true, force: true });
    workflow('yarn.yml', ['jobs:', '  check:', '    steps:', '      - run: yarn check']);
    expect(ciScopeCheck(root).level).toBe('ok');
  });

  it('passes when a check is scoped to changed content', () => {
    workflow('ci.yml', [
      'jobs:',
      '  gates:',
      '    steps:',
      '      - run: nema check ${{ steps.changed.outputs.paths }}',
    ]);
    expect(ciScopeCheck(root).level).toBe('ok');
  });

  it('warns when there is no workflows directory', () => {
    expect(ciScopeCheck(root).level).toBe('warn');
  });
});

describe('nema doctor — promotion gate', () => {
  it('is ok when the approval workflow is wired with NEMA_PROMOTE_TOKEN', () => {
    workflow('approve.yml', [
      'on:',
      '  pull_request_review:',
      'jobs:',
      '  promote:',
      '    steps:',
      '      - run: node approve-action.js',
      '        env:',
      '          GH_TOKEN: ${{ secrets.NEMA_PROMOTE_TOKEN }}',
    ]);
    expect(promoteTokenCheck(root).level).toBe('ok');
  });

  it('warns when the approval workflow lacks NEMA_PROMOTE_TOKEN', () => {
    workflow('approve.yml', [
      'on:',
      '  pull_request_review:',
      'jobs:',
      '  promote:',
      '    steps:',
      '      - run: node approve-action.js',
    ]);
    expect(promoteTokenCheck(root).level).toBe('warn');
  });

  it('warns when there is no approval-triggered workflow', () => {
    workflow('ci.yml', ['jobs: {}']);
    expect(promoteTokenCheck(root).level).toBe('warn');
  });
});

describe('nema doctor — content model', () => {
  it('passes on defaults (bundled SSOT content model)', async () => {
    const checks = await contentModelChecks(root);
    expect(checks.every((c) => c.level !== 'error')).toBe(true);
    expect(checks.some((c) => c.level === 'ok')).toBe(true);
  });

  it('errors on a structurally invalid custom content model', async () => {
    writeFileSync(
      join(root, 'nema.config.json'),
      JSON.stringify({
        contentModel: { required: [], enums: {}, dates: [], reviewedRequires: [], boundary: [] },
      }),
    );
    const checks = await contentModelChecks(root);
    expect(checks.some((c) => c.level === 'error')).toBe(true);
  });

  it('warns on a custom model whose boundary points at an undeclared field', async () => {
    writeFileSync(
      join(root, 'nema.config.json'),
      JSON.stringify({
        contentModel: {
          required: ['title', 'status'],
          enums: { status: ['draft', 'reviewed'] },
          dates: [],
          reviewedRequires: [],
          boundary: [
            { when: { field: 'nope', equals: 'x' }, require: { field: 'title', in: ['a'] } },
          ],
        },
      }),
    );
    const checks = await contentModelChecks(root);
    expect(checks.some((c) => c.level === 'warn')).toBe(true);
  });
});
