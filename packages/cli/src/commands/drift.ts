// SPDX-License-Identifier: Apache-2.0
import { createContentSource } from '@getnema/core';
import { type DriftReason, detectDrift } from '@getnema/drift';
import { defineCommand } from 'citty';
import { out } from '../util.js';

const REASON_LABEL: Record<DriftReason, string> = {
  changed: 'changed',
  'missing-source': 'missing source',
  'missing-symbols': 'missing symbols',
  'no-baseline': 'no baseline',
  'invalid-binding': 'invalid binding',
};

export const driftCommand = defineCommand({
  meta: {
    name: 'drift',
    description: 'Report doc pages whose bound source code has changed since last review',
  },
  args: {
    dir: { type: 'positional', required: false, description: 'Repo root (default: cwd)' },
    json: {
      type: 'boolean',
      description: 'Emit machine-readable JSON (for CI tooling and agents)',
    },
    strict: { type: 'boolean', description: 'Exit non-zero when any page has drifted (for CI)' },
  },
  async run({ args }) {
    const rootDir = args.dir ? String(args.dir) : process.cwd();
    const source = await createContentSource(rootDir);
    const report = detectDrift(source.pages, source.config.codeRoot);

    if (args.json) {
      out(JSON.stringify(report, null, 2));
      if (args.strict && report.drifted > 0) process.exitCode = 1;
      return;
    }

    if (report.checked === 0) {
      out('nema drift — no pages declare a `code:` binding.');
      out('  Bind a page to its source with `nema bind <path> <source>`.');
      return;
    }

    out(
      `nema drift — ${report.drifted} drifted page(s), ${report.findings.length} finding(s) · ` +
        `${report.checked} bound page(s)`,
    );

    if (report.findings.length === 0) {
      out('  ✓ every bound page tracks its code');
      return;
    }

    let current = '';
    for (const f of report.findings) {
      if (f.path !== current) {
        current = f.path;
        out(`\n  ${f.path}`);
      }
      const glyph = f.actionable ? '✗' : '•';
      out(`    ${glyph} [${REASON_LABEL[f.reason]}] ${f.bindingId}: ${f.message}`);
    }
    out('\nRun `nema explain code-drift` for how to resolve drift.');

    if (args.strict && report.drifted > 0) process.exitCode = 1;
  },
});
