// SPDX-License-Identifier: Apache-2.0
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type ResolvedConfig, resolveConfig } from '@getnema/core';
import { PROPOSE_TOKEN_ENV, run } from '@getnema/producer';
import { CONTENT_MODEL, type ContentModel, ContentModelSchema } from '@getnema/schema';
import { load } from 'js-yaml';
import type { Check } from './types.js';

/**
 * The governance / operator-config half of `nema doctor`: the setup the
 * human-approval invariant silently depends on. Read-only — never mutates. A
 * malformed content model is a hard error; everything else is advisory.
 */
export async function governanceChecks(
  rootDir: string,
  opts: { skipNetwork?: boolean } = {},
): Promise<Check[]> {
  const checks: Check[] = [];
  checks.push(...(await contentModelChecks(rootDir)));
  checks.push(ciScopeCheck(rootDir));
  checks.push(promoteTokenCheck(rootDir));
  if (!opts.skipNetwork) {
    checks.push(await branchProtectionCheck(rootDir));
    checks.push(await proposeIdentityCheck(rootDir));
  }
  return checks;
}

// ── content model (SSOT) ─────────────────────────────────────────────────────

export async function contentModelChecks(rootDir: string): Promise<Check[]> {
  let config: ResolvedConfig;
  try {
    config = await resolveConfig(rootDir);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return [
      {
        level: 'error',
        label: `content model: nema.config failed to load — ${detail}`,
        fix: 'Fix the syntax/exports of nema.config.*.',
      },
    ];
  }

  const custom = config.contentModel != null;
  const model: ContentModel = config.contentModel ?? CONTENT_MODEL;
  const parsed = ContentModelSchema.safeParse(model);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => ({
      level: 'error' as const,
      label: `content model invalid at ${i.path.join('.') || '(root)'}: ${i.message}`,
      fix: 'Fix contentModel in nema.config (required / enums / dates / reviewedRequires / boundary).',
    }));
  }

  const out: Check[] = [];
  const declared = new Set<string>([
    ...model.required,
    ...model.dates,
    ...Object.keys(model.enums),
  ]);
  const known = new Set<string>([...declared, 'title', 'status', 'diataxis', 'provenance']);

  for (const field of model.reviewedRequires) {
    if (!known.has(field)) {
      out.push({
        level: 'warn',
        label: `content model: reviewedRequires references "${field}", which is not a declared field`,
      });
    }
  }
  model.boundary.forEach((b, i) => {
    if (!known.has(b.when.field)) {
      out.push({
        level: 'warn',
        label: `content model: boundary[${i}].when.field "${b.when.field}" is not a declared field`,
      });
    }
    if (!known.has(b.require.field)) {
      out.push({
        level: 'warn',
        label: `content model: boundary[${i}].require.field "${b.require.field}" is not a declared field`,
      });
    }
    const values = model.enums[b.when.field];
    if (values && !values.includes(b.when.equals)) {
      out.push({
        level: 'warn',
        label: `content model: boundary[${i}].when.equals "${b.when.equals}" is not a value of enum "${b.when.field}"`,
      });
    }
  });

  if (out.length === 0) {
    out.push({
      level: 'ok',
      label: custom ? 'content model: custom model is well-formed' : 'content model: bundled SSOT',
    });
  }
  return out;
}

// ── CI scope ─────────────────────────────────────────────────────────────────

// Recognize a `nema check` invocation in any of the forms CI uses: the binary
// directly, the built CLI entrypoint, a `cli ... check` dev invocation, or the
// package-manager indirection (`npm run check` / `pnpm check` / `yarn check`)
// that the scaffold's `"check": "nema check"` script resolves to.
const CHECK_RE =
  /\bnema\s+check\b|index\.js\s+check\b|\bcli\b[^\n]*\bcheck\b|\b(?:npm\s+run|pnpm(?:\s+run)?|yarn(?:\s+run)?)\s+check\b/;
const DIFF_RE = /changed|diff|\$\{\{/;
const FIXED_RE = /examples\/|apps\/|\bdocs\b/;

/** Every `run:` command string across all jobs/steps of a parsed workflow. */
function runCommands(doc: unknown): string[] {
  const out: string[] = [];
  const jobs = (doc as { jobs?: Record<string, unknown> } | null)?.jobs;
  if (!jobs || typeof jobs !== 'object') return out;
  for (const job of Object.values(jobs)) {
    const steps = (job as { steps?: unknown[] })?.steps;
    if (!Array.isArray(steps)) continue;
    for (const step of steps) {
      const cmd = (step as { run?: unknown })?.run;
      if (typeof cmd === 'string') out.push(cmd);
    }
  }
  return out;
}

export function ciScopeCheck(rootDir: string): Check {
  const dir = join(rootDir, '.github', 'workflows');
  if (!existsSync(dir)) {
    return {
      level: 'warn',
      label: 'ci scope: no .github/workflows — CI does not run nema check on pull requests',
      fix: 'Add a workflow that runs `nema check` on pull_request.',
    };
  }

  const files = readdirSync(dir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  const runs: string[] = [];
  for (const file of files) {
    try {
      runs.push(...runCommands(load(readFileSync(join(dir, file), 'utf8'))));
    } catch {
      // Unparseable workflow — skip rather than crash the doctor.
    }
  }

  const checkRuns = runs.filter((r) => CHECK_RE.test(r));
  if (checkRuns.length === 0) {
    return {
      level: 'warn',
      label: 'ci scope: no workflow runs `nema check` — pull requests are not gated',
      fix: 'Add a `nema check` step to CI on pull_request.',
    };
  }

  const scoped = checkRuns.some((r) => DIFF_RE.test(r));
  const fixedOnly = !scoped && checkRuns.every((r) => FIXED_RE.test(r));
  if (fixedOnly) {
    return {
      level: 'warn',
      label:
        'ci scope: `nema check` runs only over fixed directories — PR-changed pages elsewhere go unvalidated',
      fix: 'Run `nema check` over PR-changed paths (or the whole content dir) on pull_request.',
    };
  }

  return {
    level: 'ok',
    label: `ci scope: \`nema check\` runs in CI (${checkRuns.length} invocation(s))`,
  };
}

// ── promotion gate ───────────────────────────────────────────────────────────

export function promoteTokenCheck(rootDir: string): Check {
  const dir = join(rootDir, '.github', 'workflows');
  if (!existsSync(dir)) {
    return {
      level: 'warn',
      label: 'promotion gate: no .github/workflows — the human promotion gate is not wired',
      fix: 'Add the approval workflow (pull_request_review → nema approve).',
    };
  }

  const files = readdirSync(dir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  let approval: string | undefined;
  for (const file of files) {
    const raw = readFileSync(join(dir, file), 'utf8');
    if (/pull_request_review/.test(raw) && /approve-action|nema\s+approve|approve\.js/.test(raw)) {
      approval = raw;
      break;
    }
  }

  if (!approval) {
    return {
      level: 'warn',
      label: 'promotion gate: no approval-triggered workflow found',
      fix: 'Add an approval Action so a human PR approval promotes draft → reviewed.',
    };
  }
  if (!/NEMA_PROMOTE_TOKEN/.test(approval)) {
    return {
      level: 'warn',
      label: 'promotion gate: approval workflow does not reference NEMA_PROMOTE_TOKEN',
      fix: 'Use NEMA_PROMOTE_TOKEN so the promotion push re-triggers CI and respects branch protection.',
    };
  }
  return { level: 'ok', label: 'promotion gate: approval workflow wired with NEMA_PROMOTE_TOKEN' };
}

// ── propose identity (author ≠ approver) ────────────────────────────────────

export interface ProposeIdentityFacts {
  /** Whether NEMA_PROPOSE_TOKEN is set at all. */
  tokenSet: boolean;
  /** Login of the ambient `gh` identity (the likely approver), if resolvable. */
  userLogin: string | null;
  /** Login the propose token authenticates as, if resolvable. */
  tokenLogin: string | null;
  /** Whether a `/nema approve` comment-command workflow is wired (solo mode). */
  commandWorkflowWired?: boolean;
}

/**
 * Pure decision core of the propose-identity check: the one invariant needs
 * the draft-PR author and the human approver to be DIFFERENT forge accounts,
 * because GitHub forbids approving your own PR. A solo maintainer whose agent
 * proposes with their own token deadlocks the loop (issue #93).
 */
export function assessProposeIdentity(facts: ProposeIdentityFacts): Check {
  const approver = facts.userLogin ? `@${facts.userLogin}` : 'your gh identity';
  if (!facts.tokenSet) {
    if (facts.commandWorkflowWired) {
      return {
        level: 'ok',
        label: `propose identity: solo mode — draft PRs authored by ${approver}, approved via the \`/nema approve\` comment-command (native review approvals need ${PROPOSE_TOKEN_ENV})`,
      };
    }
    return {
      level: 'warn',
      label: `propose identity: draft PRs will be authored by ${approver} — an author cannot approve their own PR, so a solo maintainer cannot promote anything`,
      fix: `Wire the \`/nema approve\` comment-command workflow (solo mode, zero setup), or set ${PROPOSE_TOKEN_ENV} to a machine-user/App token so proposals are authored by a bot you can approve.`,
    };
  }
  if (facts.tokenLogin && facts.userLogin && facts.tokenLogin === facts.userLogin) {
    return {
      level: 'warn',
      label: `propose identity: ${PROPOSE_TOKEN_ENV} authenticates as ${approver} — the same account that approves, so the deadlock remains`,
      fix: `Point ${PROPOSE_TOKEN_ENV} at a DIFFERENT account (machine user or GitHub App), not your own PAT.`,
    };
  }
  if (!facts.tokenLogin) {
    return {
      level: 'ok',
      label: `propose identity: ${PROPOSE_TOKEN_ENV} set (identity not user-resolvable — typical for GitHub-App installation tokens)`,
    };
  }
  return {
    level: 'ok',
    label: `propose identity: proposals authored as @${facts.tokenLogin}, distinct from ${approver}`,
  };
}

/** Resolve the facts via `gh` (network), then assess. */
export async function proposeIdentityCheck(
  rootDir: string,
  env: Record<string, string | undefined> = process.env,
): Promise<Check> {
  const token = env[PROPOSE_TOKEN_ENV]?.trim();
  const login = async (extraEnv?: Record<string, string>): Promise<string | null> => {
    try {
      const { stdout } = await run(
        'gh',
        ['api', 'user', '-q', '.login'],
        rootDir,
        extraEnv ? { env: extraEnv } : {},
      );
      return stdout.trim() || null;
    } catch {
      return null;
    }
  };
  const userLogin = await login();
  const tokenLogin = token ? await login({ GH_TOKEN: token }) : null;
  return assessProposeIdentity({
    tokenSet: Boolean(token),
    userLogin,
    tokenLogin,
    commandWorkflowWired: approveCommandWorkflowWired(rootDir),
  });
}

/** Whether a `/nema approve` comment-command (issue_comment) workflow is wired. */
export function approveCommandWorkflowWired(rootDir: string): boolean {
  const dir = join(rootDir, '.github', 'workflows');
  if (!existsSync(dir)) return false;
  const files = readdirSync(dir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  return files.some((file) => {
    const raw = readFileSync(join(dir, file), 'utf8');
    return /issue_comment/.test(raw) && /\/nema\s+approve/.test(raw);
  });
}

// ── branch protection (best-effort via gh) ───────────────────────────────────

export async function branchProtectionCheck(rootDir: string, branch = 'main'): Promise<Check> {
  let repo: string;
  try {
    const { stdout } = await run(
      'gh',
      ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'],
      rootDir,
    );
    repo = stdout.trim();
  } catch {
    return {
      level: 'warn',
      label: 'branch protection: not verified (gh unavailable/unauthenticated or no GitHub remote)',
      fix: 'Ensure the default branch requires the nema check before merge.',
    };
  }
  if (!repo) {
    return { level: 'warn', label: 'branch protection: could not determine the GitHub repository' };
  }

  try {
    const { stdout } = await run(
      'gh',
      ['api', `repos/${repo}/branches/${branch}/protection`],
      rootDir,
    );
    if (!/required_status_checks/.test(stdout)) {
      return {
        level: 'warn',
        label: `branch protection: "${branch}" has protection but no required status checks`,
        fix: 'Require the nema check as a status check before merge.',
      };
    }
    return { level: 'ok', label: `branch protection: "${branch}" requires status checks` };
  } catch {
    return {
      level: 'warn',
      label: `branch protection: "${branch}" is not protected (or unreadable)`,
      fix: 'Protect the default branch and require the nema check, so the human-approval gate cannot be bypassed by a direct push.',
    };
  }
}
