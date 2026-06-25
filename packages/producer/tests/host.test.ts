// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  GitLabHost,
  LocalGitHost,
  ghMergeArgs,
  glabMergeArgs,
  glabMrCreateArgs,
} from '../src/index.js';

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

describe('glabMergeArgs', () => {
  it('squash-merges via glab with the prompt skipped, no auto by default', () => {
    expect(glabMergeArgs(5, { method: 'squash' })).toEqual([
      'mr',
      'merge',
      '5',
      '--yes',
      '--squash',
    ]);
  });

  it('waits for the pipeline when auto is set (never force-merges)', () => {
    expect(glabMergeArgs(5, { method: 'squash', auto: true })).toEqual([
      'mr',
      'merge',
      '5',
      '--yes',
      '--squash',
      '--when-pipeline-succeeds',
    ]);
  });
});

describe('glabMrCreateArgs', () => {
  it('targets source/target branches and carries labels', () => {
    expect(
      glabMrCreateArgs({
        title: 'T',
        body: 'B',
        base: 'main',
        head: 'forge/draft/x',
        labels: ['forge:draft'],
      }),
    ).toEqual([
      'mr',
      'create',
      '--title',
      'T',
      '--description',
      'B',
      '--source-branch',
      'forge/draft/x',
      '--target-branch',
      'main',
      '--yes',
      '--label',
      'forge:draft',
    ]);
  });
});

describe('GitLabHost', () => {
  it('implements the ForgeHost surface (create + merge) without engine changes', () => {
    const host = new GitLabHost('/tmp');
    expect(typeof host.createPullRequest).toBe('function');
    expect(typeof host.merge).toBe('function');
  });
});
