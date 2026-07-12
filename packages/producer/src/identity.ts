// SPDX-License-Identifier: Apache-2.0

/**
 * Bot identity for the propose step.
 *
 * The one invariant assumes two DISTINCT forge identities: the PR author (an
 * agent) and the approver (a human). When `nema open-pr` runs with the
 * maintainer's own `gh` auth — the default for a solo maintainer driving an
 * agent — the draft PR is authored by the very account that must approve it,
 * and GitHub forbids approving your own pull request. The loop deadlocks.
 *
 * Setting NEMA_PROPOSE_TOKEN to a machine-user PAT or GitHub-App installation
 * token fixes this at the root: the branch push and the PR creation
 * authenticate as the bot, so the PR is authored by the bot and any human
 * maintainer — including a solo one — can approve it. Symmetric with
 * NEMA_PROMOTE_TOKEN, which the approval Action already uses on the other side
 * of the gate.
 */

/** Env var holding the bot token used to author draft PRs. */
export const PROPOSE_TOKEN_ENV = 'NEMA_PROPOSE_TOKEN';
/** Optional env overrides for the bot's git committer identity. */
export const BOT_NAME_ENV = 'NEMA_BOT_NAME';
export const BOT_EMAIL_ENV = 'NEMA_BOT_EMAIL';

const DEFAULT_BOT_NAME = 'nema-bot';
const DEFAULT_BOT_EMAIL = 'nema-bot@users.noreply.github.com';

export interface ProposeIdentity {
  /** The bot token (value of {@link PROPOSE_TOKEN_ENV}). Never log it. */
  token: string;
  /** Git committer name for propose commits. */
  name: string;
  /** Git committer email for propose commits. */
  email: string;
}

/**
 * Resolve the propose identity from the environment, or `null` when no
 * NEMA_PROPOSE_TOKEN is set (proposals then use the ambient git/gh identity).
 */
export function resolveProposeIdentity(
  env: Record<string, string | undefined> = process.env,
): ProposeIdentity | null {
  const token = env[PROPOSE_TOKEN_ENV]?.trim();
  if (!token) return null;
  return {
    token,
    name: env[BOT_NAME_ENV]?.trim() || DEFAULT_BOT_NAME,
    email: env[BOT_EMAIL_ENV]?.trim() || DEFAULT_BOT_EMAIL,
  };
}

/**
 * Per-invocation `git -c` config entries for proposing as the bot: commit
 * author/committer become the bot, and pushes authenticate with the bot token
 * through `gh`'s credential helper (which honors GH_TOKEN). The leading empty
 * `credential.helper=` clears inherited helpers so the ambient (human)
 * credentials can never answer the prompt first.
 */
export function proposeGitConfigArgs(identity: ProposeIdentity): string[] {
  return [
    `user.name=${identity.name}`,
    `user.email=${identity.email}`,
    'credential.helper=',
    'credential.helper=!gh auth git-credential',
  ];
}
