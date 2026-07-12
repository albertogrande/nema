// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { PROPOSE_TOKEN_ENV, proposeGitConfigArgs, resolveProposeIdentity } from '../src/index.js';

describe('resolveProposeIdentity', () => {
  it('returns null when NEMA_PROPOSE_TOKEN is unset or blank (ambient identity)', () => {
    expect(resolveProposeIdentity({})).toBeNull();
    expect(resolveProposeIdentity({ [PROPOSE_TOKEN_ENV]: '   ' })).toBeNull();
  });

  it('resolves the bot identity with defaults when only the token is set', () => {
    const id = resolveProposeIdentity({ [PROPOSE_TOKEN_ENV]: 'ghp_x' });
    expect(id).toEqual({
      token: 'ghp_x',
      name: 'nema-bot',
      email: 'nema-bot@users.noreply.github.com',
    });
  });

  it('honors NEMA_BOT_NAME / NEMA_BOT_EMAIL overrides', () => {
    const id = resolveProposeIdentity({
      [PROPOSE_TOKEN_ENV]: 'ghp_x',
      NEMA_BOT_NAME: 'docs-bot',
      NEMA_BOT_EMAIL: 'docs-bot@example.com',
    });
    expect(id?.name).toBe('docs-bot');
    expect(id?.email).toBe('docs-bot@example.com');
  });
});

describe('proposeGitConfigArgs', () => {
  it('sets the bot committer and routes credentials through gh, clearing inherited helpers first', () => {
    const id = resolveProposeIdentity({ [PROPOSE_TOKEN_ENV]: 'ghp_x' });
    expect(id).not.toBeNull();
    const args = proposeGitConfigArgs(id!);
    expect(args).toEqual([
      'user.name=nema-bot',
      'user.email=nema-bot@users.noreply.github.com',
      'credential.helper=',
      'credential.helper=!gh auth git-credential',
    ]);
    // The empty helper MUST come before the gh helper: it resets the helper
    // list so the maintainer's own credentials can never answer first.
    expect(args.indexOf('credential.helper=')).toBeLessThan(
      args.indexOf('credential.helper=!gh auth git-credential'),
    );
    // The token itself never appears in argv (it travels via GH_TOKEN env).
    expect(args.join(' ')).not.toContain('ghp_x');
  });
});
