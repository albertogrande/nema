// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { createContentSource, resolveConfig } from '@getnema/core';
import {
  GitHubHost,
  PROVENANCE_TRAILER_KEY,
  ProducerEngine,
  formatProvenanceTrailer,
  run,
} from '@getnema/producer';
import { readProvenance } from '@getnema/provenance';
import { fileToRoute, planApprovals } from './plan.js';

function log(message: string): void {
  process.stdout.write(`[nema-approve] ${message}\n`);
}

interface ReviewEvent {
  action?: string;
  review?: { state?: string; user?: { login?: string } };
  pull_request?: { number?: number; head?: { ref?: string } };
}

/**
 * The approval → flip Action. Triggered on `pull_request_review` == approved, it
 * promotes the PR's draft pages to `reviewed` (freshness dates, reviewed_by, a
 * reviewed transition + provenance trailer), then merges. This is the ONLY place
 * a page becomes `reviewed`, and it runs only because a human approved.
 */
export async function runApproveAction(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const eventPath = env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new Error('GITHUB_EVENT_PATH is not set — not in a GitHub Actions run');
  const event = JSON.parse(readFileSync(eventPath, 'utf8')) as ReviewEvent;

  if (event.review?.state !== 'approved') {
    log(`review state is "${event.review?.state}", not "approved" — nothing to do`);
    return;
  }

  const pr = event.pull_request?.number;
  const reviewer = event.review?.user?.login ?? env.GITHUB_ACTOR;
  if (pr == null || !reviewer) throw new Error('could not determine PR number or reviewer');

  const repoRoot = env.GITHUB_WORKSPACE ?? process.cwd();
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
    host,
    reviewSlaDays: config.reviewSlaDays,
  });
  const headSha = await host.headSha();

  for (const route of toFlip) {
    await engine.approve({ path: route, reviewer: { login: reviewer, pr }, commit: headSha });
    log(`promoted ${route} → reviewed`);
  }

  await host.stage(toFlip.map((r) => engine.filePathFor(r)));
  const prov = readProvenance(engine.filePathFor(toFlip[0]!));
  const trailers: Record<string, string> = {};
  if (prov) trailers[PROVENANCE_TRAILER_KEY] = formatProvenanceTrailer(prov);
  await host.commit(`docs: promote ${toFlip.join(', ')} to reviewed (approved by @${reviewer})`, {
    signoff: true,
    trailers,
  });

  const branch = event.pull_request?.head?.ref ?? (await host.currentBranch());
  await host.push(branch);
  // The promotion commit is pushed under NEMA_PROMOTE_TOKEN (a PAT/App token), so —
  // unlike a GITHUB_TOKEN-authored push — it re-triggers CI. We then enable auto-merge,
  // which completes the squash merge through normal branch protection once those required
  // checks pass. No `--admin`, no bypass: a human approval AND a green promotion build are
  // both required for a page to reach `reviewed`.
  await host.merge(pr, { method: 'squash', auto: true });
  log(`enabled auto-merge for PR #${pr} — it merges once the promotion build passes`);
}

// Entry point when executed as the action's main script.
if (import.meta.url === `file://${process.argv[1]}`) {
  runApproveAction().catch((error: unknown) => {
    process.stderr.write(`[nema-approve] failed: ${String(error)}\n`);
    process.exit(1);
  });
}
