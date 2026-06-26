// SPDX-License-Identifier: Apache-2.0
import { GitHubHost } from '@getnema/producer';
import { defineCommand } from 'citty';
import { draftPaths, errOut, makeEngine, out } from '../util.js';

export const openPrCommand = defineCommand({
  meta: {
    name: 'open-pr',
    description: 'Open a draft PR: branch, provenance-trailer commit, push, PR (requires gh)',
  },
  args: {
    title: { type: 'string', required: true },
    summary: { type: 'string', required: true },
    paths: {
      type: 'string',
      description: 'Comma-separated pages to propose (default: all drafts)',
    },
    base: { type: 'string', description: 'Base branch (default: main)' },
    dir: { type: 'string', description: 'Repo root (default: cwd)' },
  },
  async run({ args }) {
    const rootDir = args.dir ? String(args.dir) : process.cwd();
    const paths = args.paths
      ? String(args.paths)
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
      : await draftPaths(rootDir);
    if (paths.length === 0) {
      errOut('No draft pages to propose.');
      process.exitCode = 1;
      return;
    }
    const engine = await makeEngine(rootDir, new GitHubHost(rootDir));
    const res = await engine.proposeChanges({
      paths,
      title: String(args.title),
      summary: String(args.summary),
      base: args.base ? String(args.base) : undefined,
    });
    out(`Opened ${res.pullRequest.url}`);
    out(`  branch: ${res.branch}`);
    out(`  commit: ${res.commit.slice(0, 7)}`);
    out('A human must approve the PR — agents cannot self-approve.');
  },
});
