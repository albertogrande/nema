// SPDX-License-Identifier: Apache-2.0
import {
  type PageTrust,
  type TrustReport,
  computeTrustReport,
  createContentSource,
} from '@docforge/core';
import { defineCommand } from 'citty';
import { out } from '../util.js';

function countsLine(record: Record<string, number>, order: readonly string[]): string {
  const keys = [
    ...order.filter((k) => k in record),
    ...Object.keys(record).filter((k) => !order.includes(k)),
  ];
  return keys.map((k) => `${k} ${record[k]}`).join(' · ') || '—';
}

function listRisk(label: string, rows: PageTrust[], detail: (p: PageTrust) => string): void {
  if (rows.length === 0) return;
  out(`  ⚠ ${label}  ${rows.length}`);
  for (const p of rows) out(`      - ${p.path}  ${detail(p)}`);
}

function printReport(report: TrustReport): void {
  out(
    `docforge — trust posture (${report.total} page${report.total === 1 ? '' : 's'}, as of ${report.today})`,
  );
  out('');
  out(`  status       ${countsLine(report.byStatus, ['reviewed', 'draft', 'stub', 'deprecated'])}`);
  out(`  authored     ${countsLine(report.byAuthor, ['ai', 'mixed', 'human', 'unknown'])}`);
  out(`  reviewed     ${report.reviewedPct}%  (${report.reviewedCount}/${report.total})`);
  out(`  ai-authored  ${report.aiAuthoredPct}%  (${report.aiAuthoredCount}/${report.total})`);
  out('');

  if (report.aiUnreviewedCount + report.staleCount + report.assertedCount === 0) {
    out('  ✓ no governance risks: no unreviewed AI pages, nothing stale, every review anchored.');
  } else {
    listRisk(
      'ai-authored, not human-reviewed',
      report.risks.aiUnreviewed,
      (p) => `(${p.authoredBy})`,
    );
    listRisk('stale (review_by passed)', report.risks.stale, () => '');
    listRisk(
      'reviewed, not anchored to a commit',
      report.risks.asserted,
      () => '→ `forge audit` (next) resolves anchors against git',
    );
  }

  if (report.reviewedCount > 0) {
    out('');
    out(`  review evidence: ${report.anchoredCount}/${report.reviewedCount} anchored to a commit`);
  }
}

export const trustCommand = defineCommand({
  meta: {
    name: 'trust',
    description:
      'Show the corpus trust posture (reviewed %, AI-authored, unreviewed & stale risks)',
  },
  args: {
    dir: { type: 'positional', required: false, description: 'Repo root (default: cwd)' },
    json: { type: 'boolean', description: 'Emit the full report as JSON' },
    strict: {
      type: 'boolean',
      description:
        'Exit non-zero if any governance risk exists (unreviewed AI, stale, or unanchored review)',
    },
  },
  async run({ args }) {
    const rootDir = args.dir ? String(args.dir) : process.cwd();
    const source = await createContentSource(rootDir);
    const report = computeTrustReport(source.pages);

    if (args.json) {
      out(JSON.stringify(report, null, 2));
    } else {
      printReport(report);
    }

    if (args.strict) {
      const risks = report.aiUnreviewedCount + report.staleCount + report.assertedCount;
      if (risks > 0) process.exitCode = 1;
    }
  },
});
