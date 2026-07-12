// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { isAuthorizedToApprove, parseApproveCommand } from '../src/approve-command-action.js';
import { resolveActionRoots } from '../src/roots.js';

describe('parseApproveCommand', () => {
  it('matches the bare command and command-with-trailing-words', () => {
    expect(parseApproveCommand('/nema approve')).toBe(true);
    expect(parseApproveCommand('/nema approve — ship it')).toBe(true);
    expect(parseApproveCommand('  /nema approve')).toBe(true);
    expect(parseApproveCommand('LGTM!\n/nema approve\nthanks')).toBe(true);
  });

  it('never triggers on quoted or mid-sentence mentions', () => {
    expect(parseApproveCommand('you could comment /nema approve to promote')).toBe(false);
    expect(parseApproveCommand('what does `/nema approve` do?')).toBe(false);
    expect(parseApproveCommand('/nema approves')).toBe(false);
    expect(parseApproveCommand(undefined)).toBe(false);
    expect(parseApproveCommand('')).toBe(false);
  });
});

describe('isAuthorizedToApprove', () => {
  it('grants approval authority to accounts that could merge anyway', () => {
    expect(isAuthorizedToApprove('admin')).toBe(true);
    expect(isAuthorizedToApprove('maintain')).toBe(true);
    expect(isAuthorizedToApprove('write')).toBe(true);
  });

  it('denies read/none/unknown', () => {
    expect(isAuthorizedToApprove('read')).toBe(false);
    expect(isAuthorizedToApprove('none')).toBe(false);
    expect(isAuthorizedToApprove('triage')).toBe(false);
    expect(isAuthorizedToApprove(undefined)).toBe(false);
  });
});

describe('resolveActionRoots', () => {
  it('defaults the nema root to the git root (single-repo scaffold)', () => {
    const roots = resolveActionRoots({ GITHUB_WORKSPACE: '/w' });
    expect(roots).toEqual({ gitRoot: '/w', nemaRoot: '/w' });
  });

  it('resolves NEMA_ROOT below the git root (monorepo layout)', () => {
    const roots = resolveActionRoots({ GITHUB_WORKSPACE: '/w', NEMA_ROOT: 'apps/docs' });
    expect(roots).toEqual({ gitRoot: '/w', nemaRoot: '/w/apps/docs' });
  });
});
