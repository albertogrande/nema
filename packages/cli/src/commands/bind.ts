// SPDX-License-Identifier: Apache-2.0
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveConfig } from '@getnema/core';
import { fingerprintBinding, readCodeBindings } from '@getnema/drift';
import { MATTER_OPTIONS, composeContent } from '@getnema/provenance';
import { FINGERPRINT_STRATEGIES, type FingerprintStrategy } from '@getnema/schema';
import { defineCommand } from 'citty';
import matter from 'gray-matter';
import { errOut, out } from '../util.js';

/** A url/filesystem-safe id base derived from a source path: `src/server.ts` → `cb-server`. */
function deriveId(source: string): string {
  const file = source.split(/[/\\]/).pop() ?? source;
  const dot = file.lastIndexOf('.');
  const stem = dot > 0 ? file.slice(0, dot) : file;
  // split on non-alphanumerics (linear; no `$`-anchored backtracking on input)
  const slug =
    stem
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .join('-') || 'binding';
  return `cb-${slug}`;
}

/** First `cb-slug`, `cb-slug-2`, … not already taken. */
function freeId(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export const bindCommand = defineCommand({
  meta: {
    name: 'bind',
    description: 'Bind a doc page to the source code it documents and stamp a drift baseline',
  },
  args: {
    path: {
      type: 'positional',
      required: true,
      description: 'Page route path (e.g. api/reference)',
    },
    source: {
      type: 'positional',
      required: true,
      description: 'Source file, relative to codeRoot',
    },
    symbols: {
      type: 'string',
      description: 'Comma-separated export names to track (default: all)',
    },
    strategy: {
      type: 'string',
      description: `Fingerprint strategy: ${FINGERPRINT_STRATEGIES.join(' | ')}`,
    },
    id: { type: 'string', description: 'Binding id (default: derived from the source filename)' },
    dir: { type: 'string', description: 'Repo root (default: cwd)' },
  },
  async run({ args }) {
    const rootDir = args.dir ? String(args.dir) : process.cwd();
    const config = await resolveConfig(rootDir);

    const filePath = join(config.contentRoot, `${String(args.path)}.md`);
    if (!existsSync(filePath)) {
      errOut(`No page found at ${String(args.path)} (${filePath})`);
      process.exitCode = 1;
      return;
    }

    let strategy: FingerprintStrategy | undefined;
    if (args.strategy) {
      if (!FINGERPRINT_STRATEGIES.includes(String(args.strategy) as FingerprintStrategy)) {
        errOut(
          `Invalid --strategy "${String(args.strategy)}". Use: ${FINGERPRINT_STRATEGIES.join(' | ')}`,
        );
        process.exitCode = 1;
        return;
      }
      strategy = String(args.strategy) as FingerprintStrategy;
    }

    const raw = readFileSync(filePath, 'utf8');
    const { data, content } = matter(raw, MATTER_OPTIONS);
    const fm = { ...((data ?? {}) as Record<string, unknown>) };
    const { bindings } = readCodeBindings(fm);

    const taken = new Set(bindings.map((b) => b.id));
    const source = String(args.source);

    // Resolve the binding id and whether this is a fresh bind or a re-stamp of an
    // existing one. Re-binding the same id+source refreshes the baseline (the manual
    // equivalent of the approval re-stamp); an explicit --id pointing at a different
    // source is a mistake we refuse rather than silently clobber.
    let id = args.id ? String(args.id) : deriveId(source);
    let existing = bindings.find((b) => b.id === id);
    if (existing && existing.source !== source) {
      if (args.id) {
        errOut(`Binding id "${id}" already exists for a different source (${existing.source}).`);
        process.exitCode = 1;
        return;
      }
      id = freeId(deriveId(source), taken);
      existing = undefined;
    }

    const symbols = args.symbols
      ? String(args.symbols)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;

    const binding = {
      id,
      source,
      ...(symbols ? { symbols } : {}),
      ...(strategy ? { strategy } : {}),
    };
    const fp = fingerprintBinding(binding, config.codeRoot);
    if (fp.missing) {
      errOut(`Bound source not found under codeRoot: ${source} (looked in ${config.codeRoot})`);
      process.exitCode = 1;
      return;
    }
    if (fp.missingSymbols.length > 0) {
      errOut(`These symbols are not exported by ${source}: ${fp.missingSymbols.join(', ')}`);
      process.exitCode = 1;
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const stamped = {
      ...binding,
      fingerprint: fp.fingerprint ?? undefined,
      fingerprinted_at: today,
    };
    fm.code = existing ? bindings.map((b) => (b.id === id ? stamped : b)) : [...bindings, stamped];
    writeFileSync(filePath, composeContent(fm, content), 'utf8');

    const verb = existing ? 'Re-stamped' : 'Bound';
    out(`${verb} ${String(args.path)} → ${source} [${fp.strategy}] as ${id}`);
    out(`  baseline stamped ${today} (${fp.trackedSymbols.length || 'all'} symbol(s))`);
    out('  Run `nema drift` to see when the bound code moves past this baseline.');
  },
});
