// SPDX-License-Identifier: Apache-2.0
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { NemaHost } from '@getnema/producer';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NemaTools } from '../src/index.js';

const CLOCK = () => new Date('2026-06-25T12:00:00Z');

class FakeHost implements NemaHost {
  currentBranch = async () => 'main';
  headSha = async () => 'a'.repeat(40);
  shortSha = async () => 'aaaaaaa';
  createBranch = async () => {};
  checkout = async () => {};
  stage = async () => {};
  hasStagedChanges = async () => true;
  commit = async () => 'b'.repeat(40);
  push = async () => {};
  createPullRequest = async () => ({ number: 1, url: 'https://github.com/x/y/pull/1' });
  merge = async () => {};
}

let rootDir: string;
let tools: NemaTools;

beforeEach(() => {
  rootDir = mkdtempSync(join(tmpdir(), 'nema-slots-'));
  tools = new NemaTools({ rootDir, host: new FakeHost(), clock: CLOCK });
});
afterEach(() => rmSync(rootDir, { recursive: true, force: true }));

const draft = (path: string, agent?: string) =>
  tools.draftPage({
    path,
    title: path,
    body: `Body for ${path}.`,
    model: { name: 'claude-opus-4-8', vendor: 'anthropic' },
    agent,
  });

describe('slot leasing (the multi-agent moat)', () => {
  it('two agents author different pages concurrently — neither is refused', async () => {
    await draft('api/options', 'agent-a');
    await draft('api/errors', 'agent-b');
    // Both writes landed (no clobber) — branch isolation + per-page leases.
    expect((await tools.listPages()).map((p) => p.path).sort()).toEqual([
      'api/errors',
      'api/options',
    ]);
    expect(tools.slotFor('api/options')?.agent).toBe('agent-a');
    expect(tools.slotFor('api/errors')?.agent).toBe('agent-b');
  });

  it('refuses a second agent writing a page the first holds', async () => {
    expect(tools.claimSlot({ path: 'api/options', agent: 'agent-a' }).ok).toBe(true);
    await expect(draft('api/options', 'agent-b')).rejects.toThrow(/leased by agent "agent-a"/);
  });

  it('lets the same agent keep authoring its own claimed page', async () => {
    tools.claimSlot({ path: 'api/options', agent: 'agent-a' });
    await expect(draft('api/options', 'agent-a')).resolves.toHaveProperty('path', 'api/options');
  });

  it('frees the page after release so another agent can take it', async () => {
    tools.claimSlot({ path: 'api/options', agent: 'agent-a' });
    expect(tools.releaseSlot({ path: 'api/options', agent: 'agent-a' }).released).toBe(true);
    await expect(draft('api/options', 'agent-b')).resolves.toHaveProperty('path', 'api/options');
    expect(tools.slotFor('api/options')?.agent).toBe('agent-b');
  });

  it('single-agent path stays lease-free (no agent id ⇒ no slot guard)', async () => {
    await expect(draft('api/options')).resolves.toHaveProperty('path', 'api/options');
    expect(tools.slotFor('api/options')).toBeNull();
  });
});
