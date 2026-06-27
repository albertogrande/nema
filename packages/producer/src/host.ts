// SPDX-License-Identifier: Apache-2.0
import { run } from './exec.js';
import { type CommitOptions, GitRunner } from './git.js';

export interface PullRequestRef {
  number: number;
  url: string;
}

export interface CreatePullRequestInput {
  title: string;
  body: string;
  base: string;
  head: string;
  labels?: string[];
}

export interface MergeOptions {
  /** Merge strategy. Defaults to 'squash'. */
  method?: 'merge' | 'squash' | 'rebase';
  /**
   * Enable the nema's auto-merge: complete the merge only once required status
   * checks pass. This is how a promotion commit merges WITHOUT bypassing branch
   * protection — we never use an admin override.
   */
  auto?: boolean;
}

/**
 * The host abstraction over git + a code-forge's PR surface. v0.1 ships a
 * local git host and a GitHub (`gh`) host; a GitHub-App / GitLab / Gitea host
 * can be added later without touching the producer engine.
 */
export interface NemaHost {
  currentBranch(): Promise<string>;
  headSha(): Promise<string>;
  shortSha(): Promise<string>;
  createBranch(name: string): Promise<void>;
  checkout(name: string): Promise<void>;
  stage(paths: string[]): Promise<void>;
  /** Whether the index has staged changes to commit (false ⇒ working tree clean). */
  hasStagedChanges(): Promise<boolean>;
  commit(message: string, opts?: CommitOptions): Promise<string>;
  push(branch: string, opts?: { setUpstream?: boolean }): Promise<void>;
  createPullRequest(input: CreatePullRequestInput): Promise<PullRequestRef>;
  /**
   * Merge a pull request through the nema, respecting branch protection.
   * Never bypasses required checks (no admin override); pair with `auto` when
   * the merge must wait for a freshly-triggered CI run on the latest commit.
   */
  merge(pr: number, opts?: MergeOptions): Promise<void>;
}

/** Git-only host. PR creation is unsupported — use {@link GitHubHost}. */
export class LocalGitHost implements NemaHost {
  protected readonly git: GitRunner;
  constructor(readonly cwd: string) {
    this.git = new GitRunner(cwd);
  }
  currentBranch = () => this.git.currentBranch();
  headSha = () => this.git.headSha();
  shortSha = () => this.git.shortSha();
  createBranch = (name: string) => this.git.createBranch(name);
  checkout = (name: string) => this.git.checkout(name);
  stage = (paths: string[]) => this.git.stage(paths);
  hasStagedChanges = () => this.git.hasStagedChanges();
  commit = (message: string, opts?: CommitOptions) => this.git.commit(message, opts);
  push = (branch: string, opts?: { setUpstream?: boolean }) => this.git.push(branch, opts);

  createPullRequest(_input: CreatePullRequestInput): Promise<PullRequestRef> {
    return Promise.reject(
      new Error('LocalGitHost cannot open pull requests; use GitHubHost (requires the `gh` CLI)'),
    );
  }

  merge(_pr: number, _opts?: MergeOptions): Promise<void> {
    return Promise.reject(
      new Error('LocalGitHost cannot merge pull requests; use GitHubHost (requires the `gh` CLI)'),
    );
  }
}

/**
 * Build the `gh pr merge` argv. Deliberately never emits `--admin`: a promotion
 * merge must satisfy the same required checks as any other PR.
 */
export function ghMergeArgs(pr: number, opts: MergeOptions = {}): string[] {
  const method = opts.method ?? 'squash';
  const args = ['pr', 'merge', String(pr), `--${method}`];
  if (opts.auto) args.push('--auto');
  return args;
}

/** GitHub host: git operations plus PR creation/merge through the `gh` CLI. */
export class GitHubHost extends LocalGitHost {
  override async createPullRequest(input: CreatePullRequestInput): Promise<PullRequestRef> {
    const args = [
      'pr',
      'create',
      '--title',
      input.title,
      '--body',
      input.body,
      '--base',
      input.base,
      '--head',
      input.head,
    ];
    for (const label of input.labels ?? []) args.push('--label', label);

    const { stdout } = await run('gh', args, this.cwd);
    const url = stdout.trim().split('\n').filter(Boolean).pop() ?? '';
    const number = Number.parseInt(url.split('/').pop() ?? '', 10);
    return { number: Number.isFinite(number) ? number : 0, url };
  }

  override async merge(pr: number, opts: MergeOptions = {}): Promise<void> {
    await run('gh', ghMergeArgs(pr, opts), this.cwd);
  }
}

/**
 * Build the `glab mr create` argv (GitLab's merge requests). `--yes` skips the
 * interactive prompt so it runs unattended.
 */
export function glabMrCreateArgs(input: CreatePullRequestInput): string[] {
  const args = [
    'mr',
    'create',
    '--title',
    input.title,
    '--description',
    input.body,
    '--source-branch',
    input.head,
    '--target-branch',
    input.base,
    '--yes',
  ];
  for (const label of input.labels ?? []) args.push('--label', label);
  return args;
}

/**
 * Build the `glab mr merge` argv. Like {@link ghMergeArgs} it never force-merges
 * past failing checks; `auto` maps to GitLab's merge-when-pipeline-succeeds.
 */
export function glabMergeArgs(mr: number, opts: MergeOptions = {}): string[] {
  const args = ['mr', 'merge', String(mr), '--yes'];
  if (opts.method === 'squash') args.push('--squash');
  else if (opts.method === 'rebase') args.push('--rebase');
  if (opts.auto) args.push('--when-pipeline-succeeds');
  return args;
}

/**
 * GitLab host: git operations plus merge-request create/merge through the `glab`
 * CLI. Proves the producer engine is forge-agnostic — it touches only the
 * {@link NemaHost} interface, never a GitHub specific.
 */
export class GitLabHost extends LocalGitHost {
  override async createPullRequest(input: CreatePullRequestInput): Promise<PullRequestRef> {
    const { stdout } = await run('glab', glabMrCreateArgs(input), this.cwd);
    const url = stdout.trim().split('\n').filter(Boolean).pop() ?? '';
    const number = Number.parseInt(url.split('/').pop() ?? '', 10);
    return { number: Number.isFinite(number) ? number : 0, url };
  }

  override async merge(mr: number, opts: MergeOptions = {}): Promise<void> {
    await run('glab', glabMergeArgs(mr, opts), this.cwd);
  }
}
