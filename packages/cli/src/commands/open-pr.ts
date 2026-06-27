// SPDX-License-Identifier: Apache-2.0
import { GitHubHost, precheckProposeCoherence } from '@getnema/producer';
import { defineCommand } from 'citty';
import { draftPaths, errOut, makeEngine, out } from '../util.js';

/**
 * Turn a raw git/gh failure from the producer into an actionable `help:` hint,
 * in the spirit of the gate diagnostics — so `open-pr` *teaches* when the repo
 * isn't ready instead of dumping a stack trace. Returns null when the error is
 * unrecognized (let it surface normally).
 */
export function preconditionHint(message: string): string | null {
  const m = message.toLowerCase();
  const isGhCommand = m.includes('`gh ');

  if (m.includes('not a git repository')) {
    return 'This directory is not a git repository. Run `git init`, add a GitHub remote (`git remote add origin <url>`), and make a first commit.';
  }
  if (m.includes("ambiguous argument 'head'") || m.includes('unknown revision')) {
    return 'This git repository has no commits yet. Make a first commit (`git add -A && git commit -m "init"`) before opening a PR.';
  }
  if (
    m.includes('does not appear to be a git repository') ||
    m.includes('could not read from remote') ||
    m.includes('no configured push destination') ||
    m.includes("'origin'") ||
    (m.includes('`git push') && m.includes('no such remote'))
  ) {
    return 'No reachable GitHub remote named `origin`. Add one with `git remote add origin <url>` and ensure you can push to it.';
  }
  // gh is missing (spawn ENOENT) or unauthenticated.
  if (
    (isGhCommand &&
      (m.includes('enoent') ||
        m.includes('command not found') ||
        m.includes('no such file or directory'))) ||
    m.includes('gh auth login') ||
    m.includes('not logged into') ||
    m.includes('authentication required')
  ) {
    return 'The GitHub CLI is not ready. Install it from https://cli.github.com and run `gh auth login`.';
  }
  if (isGhCommand && (m.includes('http 401') || m.includes('http 403'))) {
    return 'GitHub rejected the request — run `gh auth login` (or check the token/repo permissions).';
  }
  return null;
}

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
    // Non-blocking pre-flight: warn if another open draft branch is already authoring
    // one of these pages, so the collision is caught here rather than at merge time.
    const collisions = await precheckProposeCoherence(rootDir, {
      base: args.base ? String(args.base) : undefined,
    });
    if (collisions.length > 0) {
      errOut('⚠ coherence: another open draft branch is already authoring page(s) you changed:');
      for (const c of collisions) errOut(`    ${c.path}: ${c.message}`);
      errOut('  Proceeding anyway — `nema claim <path> --agent <id>` reserves a page up front.');
    }

    const engine = await makeEngine(rootDir, new GitHubHost(rootDir));
    try {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const hint = preconditionHint(message);
      if (hint) {
        errOut(`open-pr could not run: ${message}`);
        errOut(`  help: ${hint}`);
        process.exitCode = 1;
        return;
      }
      throw error;
    }
  },
});
