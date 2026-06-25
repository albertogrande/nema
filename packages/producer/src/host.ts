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

/**
 * The host abstraction over git + a code-forge's PR surface. v0.1 ships a
 * local git host and a GitHub (`gh`) host; a GitHub-App / GitLab / Gitea host
 * can be added later without touching the producer engine.
 */
export interface ForgeHost {
  currentBranch(): Promise<string>;
  headSha(): Promise<string>;
  shortSha(): Promise<string>;
  createBranch(name: string): Promise<void>;
  checkout(name: string): Promise<void>;
  stage(paths: string[]): Promise<void>;
  commit(message: string, opts?: CommitOptions): Promise<string>;
  push(branch: string, opts?: { setUpstream?: boolean }): Promise<void>;
  createPullRequest(input: CreatePullRequestInput): Promise<PullRequestRef>;
}

/** Git-only host. PR creation is unsupported — use {@link GitHubHost}. */
export class LocalGitHost implements ForgeHost {
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
  commit = (message: string, opts?: CommitOptions) => this.git.commit(message, opts);
  push = (branch: string, opts?: { setUpstream?: boolean }) => this.git.push(branch, opts);

  createPullRequest(_input: CreatePullRequestInput): Promise<PullRequestRef> {
    return Promise.reject(
      new Error('LocalGitHost cannot open pull requests; use GitHubHost (requires the `gh` CLI)'),
    );
  }
}

/** GitHub host: git operations plus PR creation through the `gh` CLI. */
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
}
