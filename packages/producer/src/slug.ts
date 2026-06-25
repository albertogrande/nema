// SPDX-License-Identifier: Apache-2.0

/** Lowercase, hyphenated, filesystem/branch-safe slug (max 60 chars). */
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return slug || 'page';
}

/** The conventional draft branch name: `forge/draft/<slug>-<shortsha>`. */
export function draftBranchName(path: string, shortSha: string): string {
  return `forge/draft/${slugify(path)}-${shortSha}`;
}
