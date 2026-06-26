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
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NemaTools, createNemaMcpServer, formatDraftResult } from '../src/index.js';

const CLOCK = () => new Date('2026-06-25T12:00:00Z');

class FakeHost implements NemaHost {
  currentBranch = async () => 'main';
  headSha = async () => 'a'.repeat(40);
  shortSha = async () => 'aaaaaaa';
  createBranch = async () => {};
  checkout = async () => {};
  stage = async () => {};
  commit = async (_m: string, _o?: CommitOptions) => 'b'.repeat(40);
  push = async () => {};
  createPullRequest = async (_i: CreatePullRequestInput): Promise<PullRequestRef> => ({
    number: 1,
    url: 'https://example.test/pull/1',
  });
  merge = async (_pr: number, _o?: MergeOptions) => {};
}

interface StructuredDiagnostic {
  rule: string;
  severity: string;
  path: string;
  message: string;
  hint?: string;
}

let rootDir: string;
let client: Client;

beforeAll(async () => {
  rootDir = mkdtempSync(join(tmpdir(), 'nema-mcp-struct-'));
  const host = new FakeHost();
  await new NemaTools({ rootDir, host, clock: CLOCK }).draftPage({
    path: 'index',
    title: 'Home',
    body: 'Widgets connect to gizmos.',
    model: { name: 'claude-opus-4-8', vendor: 'anthropic' },
  });

  const server = createNemaMcpServer({ rootDir, host, clock: CLOCK });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  client = new Client({ name: 'nema-test-client', version: '0.0.0' });
  await client.connect(clientTransport);
});

afterAll(() => rmSync(rootDir, { recursive: true, force: true }));

describe('check tool', () => {
  it('returns structuredContent an agent can act on (plus text for humans)', async () => {
    const res = await client.callTool({ name: 'check', arguments: {} });
    const sc = res.structuredContent as
      | { ok: boolean; checked: number; diagnostics: StructuredDiagnostic[] }
      | undefined;
    expect(sc).toBeDefined();
    expect(sc!.ok).toBe(true);
    expect(sc!.checked).toBeGreaterThan(0);
    expect(Array.isArray(sc!.diagnostics)).toBe(true);

    const content = res.content as Array<{ type: string; text: string }>;
    expect(content[0]?.text).toContain('nema check');
  });
});

describe('draft_page tool', () => {
  it('returns structured diagnostics with fix hints so the agent can self-correct', async () => {
    const res = await client.callTool({
      name: 'draft_page',
      arguments: {
        path: 'guide/x',
        title: 'X',
        body: 'See [home](/index). A dangling cite[^ghost].',
        model: { name: 'claude-opus-4-8' },
      },
    });
    const sc = res.structuredContent as
      | { path: string; ok: boolean; diagnostics: StructuredDiagnostic[] }
      | undefined;
    expect(sc).toBeDefined();
    expect(sc!.path).toBe('guide/x');
    expect(sc!.ok).toBe(false);
    const footnote = sc!.diagnostics.find((d) => d.rule === 'footnotes');
    expect(footnote?.hint).toBeTruthy();
  });
});

describe('formatDraftResult', () => {
  it('no longer references the old brand and surfaces fix hints', () => {
    const text = formatDraftResult({
      path: 'p',
      filePath: '/p.md',
      ok: false,
      diagnostics: [
        { rule: 'footnotes', severity: 'error', path: 'p', message: 'x', hint: 'do the thing' },
      ],
    });
    expect(text).not.toContain('forge');
    expect(text).toContain('nema check found issues');
    expect(text).toContain('help: do the thing');
  });
});
