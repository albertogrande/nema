// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { createContentSource, resolveConfig } from '@getnema/core';
import {
  formatProvenanceTrailer,
  GitHubHost,
  PROVENANCE_TRAILER_KEY,
  ProducerEngine,
  run,
} from '@getnema/producer';
import { readProvenance } from '@getnema/provenance';
import { fileToRoute, planApprovals } from './plan.js';

function log(message: string): void {
  process.stdout.write(`[nema-approve-command] ${message}\n`);
}

interface CommentEvent {
  action?: string;
  issue?: { number?: number; pull_request?: unknown };
  comment?: { body?: string; user?: { login?: string } };
}

/**
 * Whether a comment body issues the approval command. The command must start a
 * line (so quoting or discussing "/nema approve" mid-sentence never triggers),
 * and may carry trailing words ("/nema approve — ship it").
 */
export function parseApproveCommand(body: string | undefined): boolean {
  if (!body) return false;
  return body.split('\n').some((line) => /^\s*\/nema\s+approve\b/.test(line));
}

/**
 * Whether a repo permission level carries approval authority. `admin` and
 * `write` (which GitHub's permission endpoint also reports for `maintain`) are
 * the accounts that could merge anyway; `read`/`none` may not approve.
 */
export function isAuthorizedToApprove(permission: string | undefined): boolean {
  return permission === 'admin' || permission === 'write' || permission === 'maintain';
}

/**
 * The solo-maintainer approval gate: an explicit `/nema approve` comment on a
 * draft PR by a user with write/admin permission promotes the PR's draft pages
 * to `reviewed` (method `maintainer-command`) and merges.
 *
 * This exists because GitHub forbids review-approving your own pull request:
 * when an agent proposes under the maintainer's identity, the maintainer can
 * never submit an approving review — but their permission-checked, attributable
 * command on the PR is the same human gate, recorded honestly in provenance.
 */
export async function runApproveCommandAction(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const eventPath = env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new Error('GITHUB_EVENT_PATH is not set — not in a GitHub Actions run');
  const event = JSON.parse(readFileSync(eventPath, 'utf8')) as CommentEvent;

  if (!event.issue?.pull_request) {
    log('comment is not on a pull request — nothing to do');
    return;
  }
  if (!parseApproveCommand(event.comment?.body)) {
    log('comment does not issue `/nema approve` — nothing to do');
    return;
  }
  const pr = event.issue.number;
  const reviewer = event.comment?.user?.login;
  if (pr == null || !reviewer) throw new Error('could not determine PR number or commenter');

  const repoRoot = env.GITHUB_WORKSPACE ?? process.cwd();

  // The command carries approval authority only from accounts that could merge
  // anyway. Everyone else gets a log line, not a promotion.
  const { stdout: permissionOut } = await run(
    'gh',
    ['api', `repos/{owner}/{repo}/collaborators/${reviewer}/permission`, '-q', '.permission'],
    repoRoot,
  );
  const permission = permissionOut.trim();
  if (!isAuthorizedToApprove(permission)) {
    log(`@${reviewer} has "${permission}" permission — not authorized to approve; ignoring`);
    return;
  }

  // Never run the promotion against a fork head: the push target and the code
  // in the working tree must both belong to this repository.
  const { stdout: prInfoOut } = await run(
    'gh',
    ['pr', 'view', String(pr), '--json', 'isCrossRepository,headRefName,state'],
    repoRoot,
  );
  const prInfo = JSON.parse(prInfoOut) as {
    isCrossRepository?: boolean;
    headRefName?: string;
    state?: string;
  };
  if (prInfo.isCrossRepository) {
    log(`PR #${pr} comes from a fork — refusing to promote across repositories`);
    return;
  }
  if (prInfo.state !== 'OPEN') {
    log(`PR #${pr} is ${prInfo.state ?? 'unknown'} — nothing to promote`);
    return;
  }
  const branch = prInfo.headRefName;
  if (!branch) throw new Error(`could not determine the head branch of PR #${pr}`);

  // Move the working tree to the PR branch. The action's own code was built
  // from the default branch BEFORE this checkout, so PR content is data, not
  // code we execute.
  await run('gh', ['pr', 'checkout', String(pr)], repoRoot);

  const config = await resolveConfig(repoRoot);
  const { stdout } = await run(
    'gh',
    ['pr', 'view', String(pr), '--json', 'files', '-q', '.files[].path'],
    repoRoot,
  );
  const changedFiles = stdout
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const source = await createContentSource(repoRoot);
  const changedRoutes = changedFiles
    .map((f) => fileToRoute(f, config.contentRoot, repoRoot))
    .filter((r): r is string => r != null);
  const toFlip = planApprovals(changedRoutes, source.pages);

  if (toFlip.length === 0) {
    log('no draft pages in this PR to promote');
    return;
  }

  const host = new GitHubHost(repoRoot);
  const engine = new ProducerEngine({
    rootDir: repoRoot,
    contentRoot: config.contentRoot,
    codeRoot: config.codeRoot,
    host,
    reviewSlaDays: config.reviewSlaDays,
  });
  const headSha = await host.headSha();

  for (const route of toFlip) {
    await engine.approve({
      path: route,
      reviewer: { login: reviewer, pr, method: 'maintainer-command' },
      commit: headSha,
    });
    log(`promoted ${route} → reviewed`);
  }

  await host.stage(toFlip.map((r) => engine.filePathFor(r)));
  const prov = readProvenance(engine.filePathFor(toFlip[0]!));
  const trailers: Record<string, string> = {};
  if (prov) trailers[PROVENANCE_TRAILER_KEY] = formatProvenanceTrailer(prov);
  await host.commit(
    `docs: promote ${toFlip.join(', ')} to reviewed (\`/nema approve\` by @${reviewer})`,
    { signoff: true, trailers },
  );
  await host.push(branch);

  // Prefer auto-merge (waits on required checks); on repos without branch
  // protection / auto-merge, fall back to a direct squash merge.
  try {
    await host.merge(pr, { method: 'squash', auto: true });
    log(`enabled auto-merge for PR #${pr} — it merges once checks pass`);
  } catch {
    await host.merge(pr, { method: 'squash' });
    log(`merged PR #${pr}`);
  }

  await run(
    'gh',
    [
      'pr',
      'comment',
      String(pr),
      '--body',
      `✅ Promoted ${toFlip.length} page(s) to \`reviewed\` on behalf of @${reviewer} (method: \`maintainer-command\`): ${toFlip.join(', ')}.`,
    ],
    repoRoot,
  );
}

// Entry point when executed as the action's main script.
if (import.meta.url === `file://${process.argv[1]}`) {
  runApproveCommandAction().catch((error: unknown) => {
    process.stderr.write(`[nema-approve-command] failed: ${String(error)}\n`);
    process.exit(1);
  });
}
