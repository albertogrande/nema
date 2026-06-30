// SPDX-License-Identifier: Apache-2.0
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { afterAll, describe, expect, it } from 'vitest';
import { createNemaMcpServer, createReadOnlyNemaMcpServer } from '../src/index.js';

const roots: string[] = [];
function root(): string {
  const d = mkdtempSync(join(tmpdir(), 'nema-mcp-ro-'));
  roots.push(d);
  return d;
}
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

async function toolNames(server: McpServer): Promise<string[]> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'test', version: '0' });
  await client.connect(clientTransport);
  const { tools } = await client.listTools();
  await client.close();
  return tools.map((t) => t.name).sort();
}

describe('read-only MCP server', () => {
  it('exposes only the corpus read tools — no write/git surface', async () => {
    const names = await toolNames(createReadOnlyNemaMcpServer({ rootDir: root() }));
    expect(names).toEqual(['check', 'drift', 'get_page', 'get_provenance', 'list_pages', 'search']);
  });

  it('the full server additionally exposes the write tools', async () => {
    const names = await toolNames(createNemaMcpServer({ rootDir: root() }));
    for (const w of ['draft_page', 'update_page', 'propose_changes', 'request_review']) {
      expect(names).toContain(w);
    }
  });
});
