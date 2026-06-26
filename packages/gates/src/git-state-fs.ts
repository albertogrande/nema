// SPDX-License-Identifier: Apache-2.0
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { readProvenanceFromContent } from '@nema/provenance';
import type { GitState } from './git-state.js';

/** Run `git` with an explicit argument array (never a shell string). */
function git(cwd: string, args: string[]): { status: number; stdout: string } {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  return { status: r.status ?? 1, stdout: r.stdout ?? '' };
}

/** Resolve symlinks where possible so paths share a prefix with the git toplevel. */
function realOrSelf(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}

/**
 * Resolve the baseline ref to compare working-tree pages against, verifying it
 * points at a real commit. Preference order:
 *   1. `NEMA_BASELINE_REF` (explicit override),
 *   2. `origin/<GITHUB_BASE_REF>` then `<GITHUB_BASE_REF>` (a GitHub pull request),
 *   3. `HEAD` (local checks).
 * Returns `undefined` when none resolve (e.g. a repo with no commits yet).
 */
function resolveBaseline(top: string): string | undefined {
  const candidates: string[] = [];
  const explicit = process.env.NEMA_BASELINE_REF?.trim();
  if (explicit) candidates.push(explicit);
  const prBase = process.env.GITHUB_BASE_REF?.trim();
  if (prBase) candidates.push(`origin/${prBase}`, prBase);
  candidates.push('HEAD');

  for (const ref of candidates) {
    if (git(top, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).status === 0) return ref;
  }
  return undefined;
}

/**
 * The real, subprocess-backed `GitState`. Returns `undefined` when `rootDir` is
 * not inside a git work tree or no baseline ref resolves — in which case the
 * migration-method constraint is simply not enforced (it never blocks a non-git
 * context). For full enforcement on pull requests the base branch must be
 * fetched (e.g. `fetch-depth: 0`); otherwise the baseline falls back to `HEAD`,
 * which already contains the PR's changes and cannot catch an in-PR promotion.
 */
export function createFsGitState(rootDir: string): GitState | undefined {
  const top = git(rootDir, ['rev-parse', '--show-toplevel']).stdout.trim();
  if (!top) return undefined;

  const baseline = resolveBaseline(top);
  if (!baseline) return undefined;

  // Normalize through realpath so a repo under a symlinked prefix (e.g. macOS
  // /var → /private/var) still yields a correct repo-relative path for git.
  const realTop = realOrSelf(top);
  const rel = (filePath: string): string => {
    const abs = isAbsolute(filePath) ? filePath : resolve(realTop, filePath);
    return relative(realTop, realOrSelf(abs)).replace(/\\/g, '/');
  };

  return {
    isTrackedAtBaseline(filePath) {
      return git(top, ['cat-file', '-e', `${baseline}:${rel(filePath)}`]).status === 0;
    },
    baselineHadMigrationMethod(filePath) {
      const r = git(top, ['show', `${baseline}:${rel(filePath)}`]);
      if (r.status !== 0) return false;
      return readProvenanceFromContent(r.stdout)?.reviewed_by?.method === 'migration';
    },
  };
}
