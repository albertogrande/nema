// SPDX-License-Identifier: Apache-2.0
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  type GateReportJson,
  type LabeledCorpus,
  formatGateResult,
  formatGateResultJson,
  runCoherenceGate,
} from '@getnema/gates';
import { listDraftBranches, loadCorpusAtRef, loadCorpusFromDir } from '@getnema/producer';
import { defineCommand } from 'citty';
import { errOut, out } from '../util.js';

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

/**
 * A no-op run (nothing to merge) as a machine-readable report, so `--json` always
 * emits a parseable document — agents orchestrating merges can branch on `ok`/`diagnostics`
 * instead of pattern-matching a human string.
 */
function noopReport(note: string): GateReportJson & { note: string } {
  return { ok: true, checked: 0, errorCount: 0, warningCount: 0, diagnostics: [], note };
}

/** A pre-condition failure (e.g. not in a git repo) as a machine-readable report. */
function errorReport(message: string, hint: string): GateReportJson {
  return {
    ok: false,
    checked: 0,
    errorCount: 1,
    warningCount: 0,
    diagnostics: [{ rule: 'coherence', severity: 'error', path: '.', message, hint }],
  };
}

/** Emit a coherence outcome as JSON or the human string, honoring `--json` on every path. */
function emit(json: boolean, report: GateReportJson & { note?: string }, human: string): void {
  out(json ? JSON.stringify(report, null, 2) : human);
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
    const json = Boolean(args.json);

    let corpora: LabeledCorpus[];
    let base: LabeledCorpus | undefined;

    try {
      if (targets.length > 0) {
        // Explicit dirs/refs — the two-terminal demo and ad-hoc checks.
        corpora = await Promise.all(targets.map((t) => loadTarget(rootDir, t)));
        if (args.base) base = await loadTarget(rootDir, String(args.base));
      } else {
        // Auto-discover the open draft branches and check their merge into the base.
        const branches = await listDraftBranches(rootDir);
        if (branches.length === 0) {
          emit(
            json,
            noopReport('no draft branches to merge'),
            '✓ nema coherence: no draft branches to merge (nothing to check)',
          );
          return;
        }
        const baseRef = args.base ? String(args.base) : 'main';
        base = await loadCorpusAtRef(rootDir, baseRef);
        corpora = await Promise.all(branches.map((b) => loadCorpusAtRef(rootDir, b)));
        if (!json) {
          out(
            `Checking ${branches.length} draft branch(es) against ${baseRef}: ${branches.join(', ')}`,
          );
        }
      }
    } catch (error) {
      // Reframe the most common pre-condition failure (no git repo) in the house style
      // instead of leaking a raw `git …` failure and an internal stack trace.
      const message = error instanceof Error ? error.message : String(error);
      if (/not a git repository/i.test(message)) {
        const hint =
          'coherence compares git refs — run it inside a git repository, or pass explicit directories/refs as arguments.';
        if (json) {
          out(JSON.stringify(errorReport('not a git repository', hint), null, 2));
        } else {
          errOut('coherence could not run: this directory is not a git repository.');
          errOut(`  help: ${hint}`);
        }
        process.exitCode = 1;
        return;
      }
      throw error;
    }

    if (corpora.length < 2 && !base) {
      emit(
        json,
        noopReport('need at least two corpora (or a base + one branch) to compare'),
        '✓ nema coherence: need at least two corpora (or a base + one branch) to compare',
      );
      return;
    }

    const result = runCoherenceGate(corpora, { base });
    out(
      json ? formatGateResultJson(result) : formatGateResult(result, { command: 'nema coherence' }),
    );
    if (!result.ok) process.exitCode = 1;
  },
});
