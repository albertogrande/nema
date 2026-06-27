// SPDX-License-Identifier: Apache-2.0
import { run } from './exec.js';

export interface CommitOptions {
  /** Add a DCO `Signed-off-by` trailer. */
  signoff?: boolean;
  /** Extra git trailers (e.g. `Nema-Provenance`). */
  trailers?: Record<string, string>;
}

/** Thin, injection-safe wrapper over the `git` CLI in a fixed working tree. */
export class GitRunner {
  constructor(private readonly cwd: string) {}

  private async git(args: string[]): Promise<string> {
    const { stdout } = await run('git', args, this.cwd);
    return stdout.trim();
  }

  currentBranch(): Promise<string> {
    return this.git(['rev-parse', '--abbrev-ref', 'HEAD']);
  }

  headSha(): Promise<string> {
    return this.git(['rev-parse', 'HEAD']);
  }

  async shortSha(): Promise<string> {
    return (await this.headSha()).slice(0, 7);
  }

  async createBranch(name: string): Promise<void> {
    await this.git(['checkout', '-b', name]);
  }

  async checkout(name: string): Promise<void> {
    await this.git(['checkout', name]);
  }

  async stage(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    await this.git(['add', '--', ...paths]);
  }

  /**
   * Whether the index has changes to commit (staged vs HEAD). Lets a caller skip
   * an empty commit when the work is already committed, instead of letting `git
   * commit` die with "nothing to commit, working tree clean".
   */
  async hasStagedChanges(): Promise<boolean> {
    // `diff --cached --quiet` exits 1 when there ARE staged changes, 0 when none.
    try {
      await this.git(['diff', '--cached', '--quiet']);
      return false;
    } catch {
      return true;
    }
  }

  async commit(message: string, opts: CommitOptions = {}): Promise<string> {
    const args = ['commit', '-m', message];
    if (opts.signoff) args.push('--signoff');
    for (const [key, value] of Object.entries(opts.trailers ?? {})) {
      args.push('--trailer', `${key}: ${value}`);
    }
    await this.git(args);
    return this.headSha();
  }

  async push(branch: string, opts: { setUpstream?: boolean } = {}): Promise<void> {
    const args = opts.setUpstream ? ['push', '-u', 'origin', branch] : ['push', 'origin', branch];
    await this.git(args);
  }
}
