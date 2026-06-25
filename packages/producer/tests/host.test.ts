// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { LocalGitHost, ghMergeArgs } from '../src/index.js';

describe('ghMergeArgs', () => {
  it('squash-merges by default and never bypasses checks with --admin', () => {
    const args = ghMergeArgs(42);
    expect(args).toEqual(['pr', 'merge', '42', '--squash']);
    expect(args).not.toContain('--admin');
  });

  it('enables auto-merge when requested so it waits on required checks', () => {
    const args = ghMergeArgs(42, { method: 'squash', auto: true });
    expect(args).toEqual(['pr', 'merge', '42', '--squash', '--auto']);
    expect(args).not.toContain('--admin');
  });

  it('honors the merge method', () => {
    expect(ghMergeArgs(7, { method: 'rebase' })).toEqual(['pr', 'merge', '7', '--rebase']);
  });
});

describe('LocalGitHost.merge', () => {
  it('refuses to merge (no forge PR surface)', async () => {
    await expect(new LocalGitHost('/tmp').merge(1)).rejects.toThrow(/cannot merge/i);
  });
});
