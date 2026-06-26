// SPDX-License-Identifier: Apache-2.0
import { type ContentSource, createContentSource } from '@getnema/core';

let cached: Promise<ContentSource> | null = null;

/** Load (and memoize) the content source rooted at the app directory. */
export function getSource(): Promise<ContentSource> {
  if (!cached) cached = createContentSource(process.cwd());
  return cached;
}

/** Normalize a `[[...slug]]` param to a route path (`[]` → `index`). */
export function slugToPath(slug: string[] | undefined): string {
  const joined = (slug ?? []).join('/');
  return joined || 'index';
}
