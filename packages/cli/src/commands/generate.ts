// SPDX-License-Identifier: Apache-2.0
import { resolve } from 'node:path';
import { resolveConfig } from '@getnema/core';
import { checkContent, formatGateResult } from '@getnema/gates';
import { generateCorpus } from '@getnema/producer';
import type { ModelInfo } from '@getnema/schema';
import { defineCommand } from 'citty';
import { out } from '../util.js';

export const generateCommand = defineCommand({
  meta: {
    name: 'generate',
    description: 'Scaffold a docs skeleton from a source repo (docs-from-code, on rails)',
  },
  args: {
    source: {
      type: 'positional',
      required: true,
      description: 'Path to the source code repo to read',
    },
    dir: {
      type: 'string',
      description: 'Nema repo root to write pages into (default: cwd)',
    },
    'content-dir': {
      type: 'string',
      description: 'Override the content directory (relative to repo root)',
    },
    'model-name': {
      type: 'string',
      description: 'Model id to record as author (sets authored_by: ai). Omit ⇒ authored_by: human',
    },
    'model-vendor': {
      type: 'string',
      description: 'Model vendor recorded alongside --model-name',
    },
    'dry-run': { type: 'boolean', description: 'Preview without writing files' },
  },
  async run({ args }) {
    const repoDir = resolve(String(args.source));
    const rootDir = args.dir ? resolve(String(args.dir)) : process.cwd();
    const config = await resolveConfig(rootDir);
    const contentDir = args['content-dir'] ? String(args['content-dir']) : config.contentDir;
    const contentRoot = resolve(rootDir, contentDir);
    const dryRun = Boolean(args['dry-run']);

    const model: ModelInfo | undefined = args['model-name']
      ? {
          name: String(args['model-name']),
          ...(args['model-vendor'] ? { vendor: String(args['model-vendor']) } : {}),
        }
      : undefined;

    const result = generateCorpus({
      repoDir,
      contentRoot,
      codeRoot: config.codeRoot,
      model,
      dryRun,
    });

    const verb = dryRun ? 'Would generate' : 'Generated';
    out(
      `${verb} ${result.pages.length} page(s) from ${result.repo.name} ` +
        `(${result.repo.exports.length} export(s) found).`,
    );
    for (const p of result.pages) out(`  + ${p.path} — ${p.title}`);

    if (dryRun) return;

    out('\nThe pages are seeded drafts — point your agent at the source to fill the skeletons.');
    out('Running nema check on the generated corpus…');
    const gate = await checkContent(rootDir, { config: { contentDir } });
    out(formatGateResult(gate));
    if (!gate.ok) process.exitCode = 1;
  },
});
