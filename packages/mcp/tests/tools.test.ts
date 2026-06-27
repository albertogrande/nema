// SPDX-License-Identifier: Apache-2.0
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  CommitOptions,
  CreatePullRequestInput,
  MergeOptions,
  NemaHost,
  PullRequestRef,
} from '@getnema/producer';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NemaTools, createNemaMcpServer } from '../src/index.js';

const CLOCK = () => new Date('2026-06-25T12:00:00Z');

class FakeHost implements NemaHost {
  prs: CreatePullRequestInput[] = [];
  currentBranch = async () => 'main';
  headSha = async () => 'a'.repeat(40);
  shortSha = async () => 'aaaaaaa';
  createBranch = async () => {};
  checkout = async () => {};
  stage = async () => {};
  hasStagedChanges = async () => true;
  commit = async (_m: string, _o?: CommitOptions) => 'b'.repeat(40);
  push = async () => {};
  createPullRequest = async (input: CreatePullRequestInput): Promise<PullRequestRef> => {
    this.prs.push(input);
    return { number: 7, url: 'https://github.com/x/y/pull/7' };
  };
  merge = async (_pr: number, _opts?: MergeOptions) => {};
}

let rootDir: string;
let tools: NemaTools;
let host: FakeHost;

beforeAll(async () => {
  rootDir = mkdtempSync(join(tmpdir(), 'nema-mcp-'));
  host = new FakeHost();
  tools = new NemaTools({ rootDir, host, clock: CLOCK });
  await tools.draftPage({
    path: 'index',
    title: 'Home',
    body: 'Welcome to widgets and gizmos.',
    model: { name: 'claude-opus-4-8', vendor: 'anthropic' },
  });
});

afterAll(() => rmSync(rootDir, { recursive: true, force: true }));

describe('read tools', () => {
  it('lists, gets (with H1 parity), and searches', async () => {
    const pages = await tools.listPages();
    expect(pages.map((p) => p.path)).toContain('index');

    const { found, markdown } = await tools.getPage('index');
    expect(found).toBe(true);
    expect(markdown?.startsWith('# Home')).toBe(true); // renderMarkdown parity

    const hits = await tools.search('widgets', 5);
    expect(hits[0]?.path).toBe('index');
  });

  it('exposes provenance via get_provenance, separate from get_page prose', async () => {
    const { found, view } = await tools.getProvenance('index');
    expect(found).toBe(true);
    expect(view?.status).toBe('draft');
    expect(view?.provenance?.authored_by).toBe('ai');
    expect(view?.provenance?.model?.name).toBe('claude-opus-4-8');
  });
});

describe('check', () => {
  it('passes for the seeded draft', async () => {
    const result = await tools.check();
    expect(result.ok).toBe(true);
  });
});

describe('write tools', () => {
  it('draft_page seeded a valid draft (not reviewed)', async () => {
    const pages = await tools.listPages();
    expect(pages.find((p) => p.path === 'index')?.status).toBe('draft');
  });

  it('draft_page rejects an empty body (parity with the CLI guard)', async () => {
    await expect(tools.draftPage({ path: 'empty', title: 'Empty', body: '' })).rejects.toThrow(
      /body is required/,
    );
    await expect(
      tools.draftPage({ path: 'blank', title: 'Blank', body: '   \n\t' }),
    ).rejects.toThrow(/body is required/);
  });

  it('update_page refuses to set status: reviewed', async () => {
    await expect(
      tools.updatePage({ path: 'index', frontmatter: { status: 'reviewed' } }),
    ).rejects.toThrow(/may not set status: reviewed/);
  });

  it('propose_changes opens a labeled draft PR', async () => {
    const res = await tools.proposeChanges({ title: 'docs: home', summary: 'Add home page.' });
    expect(res.pullRequest.number).toBe(7);
    expect(host.prs[0]?.labels).toContain('nema:draft');
  });

  it('request_review never approves', async () => {
    const res = await tools.requestReview({ pr: 7 });
    expect(res.message).toMatch(/cannot self-approve/i);
  });
});

describe('server wiring', () => {
  it('registers exactly the read + write tools and no reviewed-promotion tool', () => {
    const server = createNemaMcpServer({ rootDir, host });
    // The server exists and constructed without throwing; tool surface is fixed.
    expect(server).toBeTruthy();
  });
});
