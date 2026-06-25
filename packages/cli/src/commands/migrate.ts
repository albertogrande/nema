// SPDX-License-Identifier: Apache-2.0
import { resolve } from 'node:path';
import { resolveConfig } from '@docforge/core';
import { checkContent, formatGateResult } from '@docforge/gates';
import { migrateCorpus } from '@docforge/producer';
import { defineCommand } from 'citty';
import { out } from '../util.js';

export const migrateCommand = defineCommand({
  meta: {
    name: 'migrate',
    description:
      'Import an existing Markdown corpus into the Forge model (seed status + provenance)',
  },
  args: {
    dir: { type: 'positional', required: false, description: 'Repo root (default: cwd)' },
    status: {
      type: 'string',
      description: 'Status for status-less pages: reviewed | draft (default reviewed)',
    },
    reviewer: {
      type: 'string',
      description: 'Login recorded for migrated reviewed pages (default: git user / "migration")',
    },
    'content-dir': {
      type: 'string',
      description: 'Override the content directory (relative to repo root)',
    },
    'sla-days': {
      type: 'string',
      description: 'Freshness SLA in days for reviewed pages (default 180)',
    },
    'dry-run': { type: 'boolean', description: 'Preview without writing files' },
  },
  async run({ args }) {
    const rootDir = args.dir ? String(args.dir) : process.cwd();
    const config = await resolveConfig(rootDir);
    const contentDir = args['content-dir'] ? String(args['content-dir']) : config.contentDir;
    const contentRoot = resolve(rootDir, contentDir);

    const status = args.status === 'draft' ? 'draft' : 'reviewed';
    const dryRun = Boolean(args['dry-run']);
    const reviewSlaDays = args['sla-days'] ? Number(args['sla-days']) : config.reviewSlaDays;

    const result = await migrateCorpus({
      contentRoot,
      repoRoot: rootDir,
      status,
      reviewer: args.reviewer ? String(args.reviewer) : undefined,
      reviewSlaDays,
      dryRun,
    });

    const verb = dryRun ? 'Would migrate' : 'Migrated';
    out(
      `${verb} ${result.migrated.length} page(s); skipped ${result.skipped.length} (already have provenance).`,
    );
    for (const p of result.migrated) out(`  + ${p.path} [${p.status}] — ${p.title}`);

    if (dryRun) return;

    out('\nRunning forge check on the migrated corpus…');
    const gate = await checkContent(rootDir, { config: { contentDir } });
    out(formatGateResult(gate));
    if (!gate.ok) {
      out('\nSome legacy content still needs attention (e.g. orphans, dead links, unknown enums).');
      process.exitCode = 1;
    }
  },
});
