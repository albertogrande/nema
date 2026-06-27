// SPDX-License-Identifier: Apache-2.0
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  type LabeledCorpus,
  formatGateResult,
  formatGateResultJson,
  runCoherenceGate,
} from '@getnema/gates';
import { listDraftBranches, loadCorpusAtRef, loadCorpusFromDir } from '@getnema/producer';
import { defineCommand } from 'citty';
import { out } from '../util.js';

function isDir(target: string): boolean {
  try {
    return existsSync(target) && statSync(target).isDirectory();
  } catch {
    return false;
  }
}

/** A target is either a directory (a branch checkout) or a git ref to materialize. */
function loadTarget(rootDir: string, target: string): Promise<LabeledCorpus> {
  return isDir(target) ? loadCorpusFromDir(resolve(target)) : loadCorpusAtRef(rootDir, target);
}

export const coherenceCommand = defineCommand({
  meta: {
    name: 'coherence',
    description:
      'Merge-time coherence: prove several draft branches merge into a valid doc-graph ' +
      '(no slot collisions, no merge-broken links/orphans)',
  },
  args: {
    base: {
      type: 'string',
      description: 'Integration baseline — a dir or git ref (default: main, when auto-discovering)',
    },
    dir: { type: 'string', description: 'Repo root for git refs (default: cwd)' },
    json: { type: 'boolean', description: 'Emit machine-readable JSON diagnostics' },
  },
  async run({ args }) {
    const rootDir = args.dir ? resolve(String(args.dir)) : process.cwd();
    const targets = ((args._ as string[] | undefined) ?? []).map(String);

    let corpora: LabeledCorpus[];
    let base: LabeledCorpus | undefined;

    if (targets.length > 0) {
      // Explicit dirs/refs — the two-terminal demo and ad-hoc checks.
      corpora = await Promise.all(targets.map((t) => loadTarget(rootDir, t)));
      if (args.base) base = await loadTarget(rootDir, String(args.base));
    } else {
      // Auto-discover the open draft branches and check their merge into the base.
      const branches = await listDraftBranches(rootDir);
      if (branches.length === 0) {
        out('✓ nema coherence: no draft branches to merge (nothing to check)');
        return;
      }
      const baseRef = args.base ? String(args.base) : 'main';
      base = await loadCorpusAtRef(rootDir, baseRef);
      corpora = await Promise.all(branches.map((b) => loadCorpusAtRef(rootDir, b)));
      out(`Checking ${branches.length} draft branch(es) against ${baseRef}: ${branches.join(', ')}`);
    }

    if (corpora.length < 2 && !base) {
      out('✓ nema coherence: need at least two corpora (or a base + one branch) to compare');
      return;
    }

    const result = runCoherenceGate(corpora, { base });
    out(
      args.json
        ? formatGateResultJson(result)
        : formatGateResult(result, { command: 'nema coherence' }),
    );
    if (!result.ok) process.exitCode = 1;
  },
});
