// SPDX-License-Identifier: Apache-2.0
import { join } from 'node:path';
import type { Page } from '@getnema/core';
import { describe, expect, it } from 'vitest';
import { fileToRoute, planApprovals } from '../src/index.js';

const REPO = '/repo';
const CONTENT = join(REPO, 'docs');

function page(path: string, status: string): Page {
  return {
    path,
    filePath: join(CONTENT, `${path}.md`),
    title: path,
    status,
    frontmatter: {},
    body: '',
  };
}

describe('fileToRoute', () => {
  it('maps content markdown files to routes', () => {
    expect(fileToRoute('docs/guide.md', CONTENT, REPO)).toBe('guide');
    expect(fileToRoute('docs/a/b.md', CONTENT, REPO)).toBe('a/b');
  });
  it('ignores non-markdown and out-of-tree files', () => {
    expect(fileToRoute('docs/guide.txt', CONTENT, REPO)).toBeNull();
    expect(fileToRoute('README.md', CONTENT, REPO)).toBeNull();
    expect(fileToRoute('src/x.md', CONTENT, REPO)).toBeNull();
  });
});

describe('planApprovals', () => {
  const pages = [page('index', 'draft'), page('guide', 'draft'), page('ref', 'reviewed')];

  it('promotes only changed draft pages', () => {
    expect(planApprovals(['guide'], pages)).toEqual(['guide']);
  });
  it('never promotes an already-reviewed page', () => {
    expect(planApprovals(['ref'], pages)).toEqual([]);
  });
  it('ignores changed routes that are not pages', () => {
    expect(planApprovals(['nonexistent'], pages)).toEqual([]);
  });
  it('handles multiple changed drafts', () => {
    expect(planApprovals(['index', 'guide', 'ref'], pages).sort()).toEqual(['guide', 'index']);
  });
});
