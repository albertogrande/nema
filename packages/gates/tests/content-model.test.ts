// SPDX-License-Identifier: Apache-2.0
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type ContentSource, type ResolvedConfig, contentSourceFromConfig } from '@getnema/core';
import { CONTENT_MODEL, type ContentModel } from '@getnema/schema';
import { afterAll, describe, expect, it } from 'vitest';
import { createGateContext, runGates } from '../src/index.js';

const TODAY = new Date('2026-06-25T00:00:00Z');

// A deployment profile: adds an `archived` status and a required `audience` field.
const CUSTOM_MODEL: ContentModel = {
  ...CONTENT_MODEL,
  required: [...CONTENT_MODEL.required, 'audience'],
  enums: {
    ...CONTENT_MODEL.enums,
    status: [...(CONTENT_MODEL.enums.status ?? []), 'archived'],
    audience: ['devs', 'ops'],
  },
};

const roots: string[] = [];
function source(frontmatter: string, contentModel?: ContentModel): ContentSource {
  const root = mkdtempSync(join(tmpdir(), 'nema-model-'));
  roots.push(root);
  const docs = join(root, 'docs');
  mkdirSync(docs, { recursive: true });
  writeFileSync(join(docs, 'index.md'), `---\n${frontmatter}\n---\n\n# Home\n\nBody.\n`);
  const config: ResolvedConfig = {
    rootDir: root,
    contentDir: 'docs',
    contentRoot: docs,
    codeRoot: docs,
    reviewSlaDays: 180,
    rootExempt: ['index'],
    baseUrl: '',
    contentModel,
  };
  return contentSourceFromConfig(config);
}
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

function ok(src: ContentSource): boolean {
  return runGates(createGateContext(src, { today: TODAY })).ok;
}

const CUSTOM_PAGE = 'title: Home\nstatus: archived\naudience: devs';

describe('configurable content model', () => {
  it('honors a custom model supplied via config (gates read source.config.contentModel)', () => {
    expect(ok(source(CUSTOM_PAGE, CUSTOM_MODEL))).toBe(true);
  });

  it('rejects the same page under the default model (archived is not a valid status)', () => {
    expect(ok(source(CUSTOM_PAGE, undefined))).toBe(false);
  });

  it('enforces a custom required field', () => {
    expect(ok(source('title: Home\nstatus: archived', CUSTOM_MODEL))).toBe(false);
  });

  it('never loosens the agent-cannot-self-promote invariant', () => {
    // A reviewed page with no human reviewer must fail even under a custom model.
    const reviewed = source(
      'title: Home\nstatus: reviewed\naudience: devs\nlast_reviewed: 2026-01-01\nreview_by: 2026-12-01',
      CUSTOM_MODEL,
    );
    expect(ok(reviewed)).toBe(false);
  });
});
