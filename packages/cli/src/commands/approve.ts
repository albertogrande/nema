// SPDX-License-Identifier: Apache-2.0
import { LocalGitHost } from '@getnema/producer';
import { defineCommand } from 'citty';
import { makeEngine, out } from '../util.js';

export const approveCommand = defineCommand({
  meta: {
    name: 'approve',
    description:
      'Promote a page draft → reviewed (run by the approval Action after a human approves)',
  },
  args: {
    path: { type: 'string', required: true, description: 'Route path of the approved page' },
    reviewer: { type: 'string', required: true, description: 'Approving reviewer login' },
    pr: { type: 'string', required: true, description: 'Approving PR number' },
    commit: { type: 'string', description: 'SHA to record on the reviewed transition' },
    'sla-days': { type: 'string', description: 'Override review SLA in days' },
    dir: { type: 'string', description: 'Repo root (default: cwd)' },
  },
  async run({ args }) {
    const rootDir = args.dir ? String(args.dir) : process.cwd();
    const reviewSlaDays = args['sla-days'] ? Number(args['sla-days']) : undefined;
    const engine = await makeEngine(rootDir, new LocalGitHost(rootDir), { reviewSlaDays });
    const res = await engine.approve({
      path: String(args.path),
      reviewer: { login: String(args.reviewer), pr: Number(args.pr) },
      commit: args.commit ? String(args.commit) : undefined,
    });
    out(`Promoted ${res.path} → reviewed`);
    out(`  last_reviewed: ${res.lastReviewed}`);
    out(`  review_by:     ${res.reviewBy}`);
  },
});
