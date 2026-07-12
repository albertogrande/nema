// SPDX-License-Identifier: Apache-2.0
import { resolve } from 'node:path';

export interface ActionRoots {
  /** The git repository root — where `git`/`gh` run and changed-file paths resolve. */
  gitRoot: string;
  /** The Nema repo root (nema.config.*) — the git root, or NEMA_ROOT below it. */
  nemaRoot: string;
}

/**
 * Resolve the two roots an approval action works with. In a single-repo scaffold
 * they coincide; in a monorepo the corpus lives below the git root (e.g. this
 * repo's `apps/docs`), so workflows set `NEMA_ROOT` to that subdirectory.
 * Changed-file paths from the PR are git-root-relative either way.
 */
export function resolveActionRoots(env: NodeJS.ProcessEnv = process.env): ActionRoots {
  const gitRoot = env.GITHUB_WORKSPACE ?? process.cwd();
  const sub = env.NEMA_ROOT?.trim();
  return { gitRoot, nemaRoot: sub ? resolve(gitRoot, sub) : gitRoot };
}
