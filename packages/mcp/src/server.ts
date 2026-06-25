// SPDX-License-Identifier: Apache-2.0
import { type Server, createServer } from 'node:http';
import { formatGateResult } from '@docforge/gates';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { formatDraftResult, formatPageList, formatSearchHits } from './format.js';
import {
  type DraftPageInput,
  NemaTools,
  type NemaToolsConfig,
  type UpdatePageInput,
} from './tools.js';

interface ToolText {
  [x: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

function text(value: string, isError = false): ToolText {
  return { content: [{ type: 'text', text: value }], ...(isError ? { isError: true } : {}) };
}

const sourceShape = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url().optional(),
  kind: z.enum(['primary', 'secondary', 'reference']).optional(),
  retrieved: z.string().optional(),
});

const modelShape = z.object({
  name: z.string(),
  vendor: z.string().optional(),
  prompt_ref: z.string().optional(),
});

/**
 * The corpus read tools: list / get / provenance / search / check. These need
 * only a filesystem content source — no git or `gh` — so they are safe to expose
 * over a network in the read-only server.
 */
function registerReadTools(server: McpServer, tools: ForgeTools): void {
  server.registerTool(
    'list_pages',
    {
      title: 'List pages',
      description: 'List every documentation page with path, title, status, and diataxis genre.',
      inputSchema: {},
    },
    async () => text(formatPageList(await tools.listPages())),
  );

  server.registerTool(
    'get_page',
    {
      title: 'Get a page',
      description:
        'Return the canonical Markdown of a page by path (the ".md" suffix and leading slash are optional).',
      inputSchema: { path: z.string().describe('Page path, e.g. guide/intro') },
    },
    async ({ path }) => {
      const { found, markdown } = await tools.getPage(path);
      return found && markdown != null
        ? text(markdown)
        : text(`No page found for "${path}". Use list_pages to see valid paths.`, true);
    },
  );

  server.registerTool(
    'get_provenance',
    {
      title: 'Get page provenance',
      description:
        'Return the trust metadata for a page as JSON: who authored it (ai/human/mixed), the model, ' +
        'the human reviewer, cited sources, and the status/freshness dates. Complements get_page, ' +
        'which returns the prose.',
      inputSchema: { path: z.string().describe('Page path, e.g. guide/intro') },
    },
    async ({ path }) => {
      const { found, view } = await tools.getProvenance(path);
      return found && view
        ? text(JSON.stringify(view, null, 2))
        : text(`No page found for "${path}". Use list_pages to see valid paths.`, true);
    },
  );

  server.registerTool(
    'search',
    {
      title: 'Search the docs',
      description:
        'Full-text BM25 search. Returns best-matching pages with a snippet and a deep-link anchor.',
      inputSchema: {
        query: z.string().describe('Search terms'),
        limit: z.number().int().min(1).max(25).optional().describe('Max results (default 8)'),
      },
    },
    async ({ query, limit }) =>
      text(formatSearchHits(await tools.search(query, limit ?? 8), query)),
  );

  server.registerTool(
    'check',
    {
      title: 'Run nema check',
      description: 'Validate the whole corpus against all gates and return diagnostics.',
      inputSchema: {},
    },
    async () => {
      const result = await tools.check();
      return text(formatGateResult(result), !result.ok);
    },
  );
}

/**
 * The producer write tools. Crucially, NONE of these can promote a page to
 * `reviewed` — that authority belongs to the human PR approval alone. They drive
 * git/`gh`, so they are only registered on the full (local) server.
 */
function registerWriteTools(server: McpServer, tools: ForgeTools): void {
  server.registerTool(
    'draft_page',
    {
      title: 'Draft a new page',
      description:
        'Create a NEW page with status: draft and a seeded provenance block, then run nema check ' +
        'and return diagnostics so you can self-correct. You may only create drafts — never reviewed.',
      inputSchema: {
        path: z.string().describe('Route path without .md, e.g. guide/intro'),
        title: z.string(),
        body: z.string().describe('Markdown body (cite with footnotes + a ## Sources section)'),
        diataxis: z.enum(['tutorial', 'how-to', 'reference', 'explanation', 'overview']).optional(),
        model: modelShape.optional().describe('Your model id/vendor — required for AI authorship'),
        sources: z.array(sourceShape).optional(),
      },
    },
    async (input) => {
      const res = await tools.draftPage(input as DraftPageInput);
      return text(formatDraftResult(res), !res.ok);
    },
  );

  server.registerTool(
    'update_page',
    {
      title: 'Update a draft page',
      description:
        'Update an existing DRAFT page body/frontmatter and re-run nema check. Cannot set status: reviewed.',
      inputSchema: {
        path: z.string(),
        title: z.string().optional(),
        body: z.string().optional(),
        frontmatter: z.record(z.any()).optional(),
      },
    },
    async (input) => {
      try {
        const { result } = await tools.updatePage(input as UpdatePageInput);
        return text(formatGateResult(result), !result.ok);
      } catch (e) {
        return text((e as Error).message, true);
      }
    },
  );

  server.registerTool(
    'propose_changes',
    {
      title: 'Open a draft PR',
      description:
        'Open a PR for the draft pages: create a nema/draft/* branch, commit with a Nema-Provenance ' +
        'trailer (signed off), push, and open a PR labeled nema:draft. Requires the gh CLI.',
      inputSchema: {
        title: z.string(),
        summary: z.string(),
        paths: z.array(z.string()).optional().describe('Pages to propose (default: all drafts)'),
      },
    },
    async (input) => {
      try {
        const r = await tools.proposeChanges(input);
        return text(
          `Opened ${r.pullRequest.url} (branch ${r.branch}, commit ${r.commit.slice(0, 7)}). ` +
            'A human must approve the PR — agents cannot self-approve.',
        );
      } catch (e) {
        return text((e as Error).message, true);
      }
    },
  );

  server.registerTool(
    'request_review',
    {
      title: 'Request human review',
      description:
        'Signal that a draft PR is ready for human review. This does not and cannot approve.',
      inputSchema: { pr: z.number().int().optional(), note: z.string().optional() },
    },
    async (input) => text((await tools.requestReview(input)).message),
  );
}

/**
 * Build the full Forge MCP server: read tools expose the corpus; write tools
 * drive the producer loop. There is NO tool that promotes a page to `reviewed`.
 */
export function createForgeMcpServer(cfg: ForgeToolsConfig): McpServer {
  const tools = new ForgeTools(cfg);
  const server = new McpServer({ name: 'forge', version: '0.1.0' });
  registerReadTools(server, tools);
  registerWriteTools(server, tools);
  return server;
}

/**
 * Build a read-only Forge MCP server — only the corpus read tools, with no write
 * or git/`gh` surface. Safe to expose over a network so remote agents can query a
 * published corpus (and its provenance) without any ability to mutate it.
 */
export function createReadOnlyForgeMcpServer(cfg: ForgeToolsConfig): McpServer {
  const tools = new ForgeTools(cfg);
  const server = new McpServer({ name: 'forge', version: '0.1.0' });
  registerReadTools(server, tools);
  return server;
}

/** Start the Nema MCP server over stdio. */
export async function startStdioServer(cfg: NemaToolsConfig): Promise<void> {
  const server = createNemaMcpServer(cfg);
  await server.connect(new StdioServerTransport());
}

export interface HttpServerOptions {
  port: number;
  /** Expose only the read tools (no write/git surface). */
  readOnly?: boolean;
}

/**
 * Start the Forge MCP server over Streamable HTTP. Stateless with plain JSON
 * responses, so it is simple to host and to call. Pair `readOnly` with a hosted
 * deployment to publish a queryable, provenance-bearing corpus to remote agents.
 *
 * Security: this serves the corpus to anyone who can reach the port. Front it
 * with auth (a bearer token / gateway) before exposing a private corpus.
 */
export async function startHttpServer(
  cfg: ForgeToolsConfig,
  opts: HttpServerOptions,
): Promise<Server> {
  const mcp = opts.readOnly ? createReadOnlyForgeMcpServer(cfg) : createForgeMcpServer(cfg);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await mcp.connect(transport);

  const http = createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok');
      return;
    }
    transport.handleRequest(req, res).catch((error: unknown) => {
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain' });
      res.end(`MCP transport error: ${String(error)}`);
    });
  });

  await new Promise<void>((resolve) => http.listen(opts.port, resolve));
  return http;
}
