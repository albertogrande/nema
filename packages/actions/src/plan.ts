// SPDX-License-Identifier: Apache-2.0
import { relative, resolve } from 'node:path';
import type { Page } from '@getnema/core';

/**
 * Map a repo-relative changed file to a content route path, or `null` if it is
 * not a Markdown file under the content directory.
 */
export function fileToRoute(file: string, contentRoot: string, repoRoot: string): string | null {
  if (!file.endsWith('.md')) return null;
  const abs = resolve(repoRoot, file);
  const rel = relative(contentRoot, abs);
  if (rel.startsWith('..')) return null;
  return rel.replace(/\\/g, '/').replace(/\.md$/, '');
}

/**
 * The pages an approval should promote: those changed in the PR that are
 * currently `draft`. (Pages already `reviewed`, or changed outside the content
 * dir, are left alone.) This is the deterministic core of the approval Action.
 */
export function planApprovals(changedRoutePaths: string[], pages: Page[]): string[] {
  const changed = new Set(changedRoutePaths);
  return pages.filter((p) => changed.has(p.path) && p.status === 'draft').map((p) => p.path);
}
