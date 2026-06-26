// SPDX-License-Identifier: Apache-2.0
import { type AuditRow, buildAuditView, createContentSource } from '@getnema/core';
import { defineCommand } from 'citty';
import { out } from '../util.js';

function formatRow(r: AuditRow): string {
  const date = r.ts.slice(0, 10);
  const ref = r.pr != null ? `pr#${r.pr}` : r.commit ? r.commit.slice(0, 7) : '';
  const method = r.method ? ` via ${r.method}` : '';
  return `${date}  ${r.to.padEnd(9)} ${r.path}  — by ${r.by}${method}${ref ? `  ${ref}` : ''}`;
}

export const auditCommand = defineCommand({
  meta: {
    name: 'audit',
    description: 'Corpus-wide review trail: every lifecycle transition across all pages',
  },
  args: {
    dir: { type: 'positional', required: false, description: 'Repo root (default: cwd)' },
    actor: { type: 'string', description: 'Filter by the actor recorded on the transition' },
    status: { type: 'string', description: 'Filter by target status, e.g. reviewed' },
    since: { type: 'string', description: 'Only transitions on/after this date (YYYY-MM-DD)' },
    until: { type: 'string', description: 'Only transitions on/before this date (YYYY-MM-DD)' },
    json: { type: 'boolean', description: 'Emit machine-readable JSON rows' },
  },
  async run({ args }) {
    const rootDir = args.dir ? String(args.dir) : process.cwd();
    const source = await createContentSource(rootDir);
    const rows = buildAuditView(source.pages, {
      actor: args.actor ? String(args.actor) : undefined,
      status: args.status ? String(args.status) : undefined,
      since: args.since ? String(args.since) : undefined,
      until: args.until ? String(args.until) : undefined,
    });

    if (args.json) {
      out(JSON.stringify(rows, null, 2));
      return;
    }
    if (rows.length === 0) {
      out('No transitions match.');
      return;
    }
    for (const r of rows) out(formatRow(r));
    out(`\n${rows.length} transition(s).`);
  },
});
