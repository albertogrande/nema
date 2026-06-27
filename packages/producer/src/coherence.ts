// SPDX-License-Identifier: Apache-2.0
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { createContentSource } from '@getnema/core';
import type { LabeledCorpus } from '@getnema/gates';
import { run } from './exec.js';

/**
 * Materialize the corpora the merge-time coherence gate validates. A "corpus" is
 * one branch's full checked-out content; these helpers load it from a directory,
 * from a git ref (via an ephemeral worktree so nothing in the live tree moves), or
 * by discovering the open `nema/draft/*` branches that would merge into a base.
 */

/** Load a directory as a labeled corpus (each dir = one branch checkout). */
export async function loadCorpusFromDir(dir: string, label?: string): Promise<LabeledCorpus> {
  const source = await createContentSource(dir);
  return { label: label ?? basename(dir), pages: source.pages, config: source.config };
}

/**
 * Check out `ref` into a throwaway worktree, run `fn` against it, and always clean
 * up. Uses `git worktree` so the caller's working tree and branch are untouched —
 * the realistic merge-time path, where CI inspects several refs at once.
 */
export async function withWorktree<T>(
  rootDir: string,
  ref: string,
  fn: (worktreeDir: string) => Promise<T>,
): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), 'nema-wt-'));
  await run('git', ['worktree', 'add', '--detach', '--quiet', dir, ref], rootDir);
  try {
    return await fn(dir);
  } finally {
    try {
      await run('git', ['worktree', 'remove', '--force', dir], rootDir);
    } catch {
      rmSync(dir, { recursive: true, force: true });
    }
  }
}

/** Load the corpus at a git ref (branch, tag, or sha) without disturbing the tree. */
export function loadCorpusAtRef(rootDir: string, ref: string): Promise<LabeledCorpus> {
  return withWorktree(rootDir, ref, (dir) => loadCorpusFromDir(dir, ref));
}

/**
 * Discover the draft branches that would merge into a base — local and
 * `origin/`-remote `nema/draft/*` refs, de-duplicated by short name. These are the
 * corpora a pre-merge coherence check validates against `main`.
 */
export async function listDraftBranches(rootDir: string): Promise<string[]> {
  const { stdout } = await run(
    'git',
    [
      'for-each-ref',
      '--format=%(refname:short)',
      'refs/heads/nema/draft',
      'refs/remotes/origin/nema/draft',
    ],
    rootDir,
  );
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of stdout.split('\n')) {
    const ref = raw.trim();
    if (!ref) continue;
    const short = ref.replace(/^origin\//, '');
    if (seen.has(short)) continue;
    seen.add(short);
    out.push(ref); // keep the resolvable ref (may be origin/-prefixed)
  }
  return out;
}
