// SPDX-License-Identifier: Apache-2.0

/**
 * A read-only view of the git facts the `draft-pages-not-reviewed` gate needs to
 * tell a *legitimate first-import migration* apart from a *self-asserted
 * promotion* of an already-existing page. It is injected into the gate context
 * so the rule stays a pure function: unit tests supply a scripted stub, and the
 * real subprocess-backed implementation lives in `git-state-fs.ts`.
 *
 * "Baseline" is the ref a page's current frontmatter is compared against — the
 * pull-request base branch in CI (so a promotion committed *inside* a PR is still
 * caught, because the base never carried it), falling back to `HEAD` locally.
 */
export interface GitState {
  /** Did this page's file already exist at the comparison baseline? */
  isTrackedAtBaseline(filePath: string): boolean;
  /** Did the page's baseline content already record `reviewed_by.method === 'migration'`? */
  baselineHadMigrationMethod(filePath: string): boolean;
}
