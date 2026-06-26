// SPDX-License-Identifier: Apache-2.0
import { type Server, createServer } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { type GateResult, formatGateResult, gateReport } from '@nema/gates';
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
 * Structured-output shapes. Tools that report gate results expose them as MCP
 * `structuredContent` (not just prose) so an agent can act on the exact rule,
 * path, and remediation hint instead of parsing a string.
 */
const diagnosticShape = z.object({
  rule: z.string(),
  severity: z.enum(['error', 'warning']),
  path: z.string(),
  message: z.string(),
  hint: z.string().optional(),
});

const gateReportShape = {
  ok: z.boolean(),
  checked: z.number().int(),
  errorCount: z.number().int(),
  warningCount: z.number().int(),
  diagnostics: z.array(diagnosticShape),
};

/** A tool response carrying both the human text and validated structured content. */
function gateResponse(result: GateResult): ToolText {
  return {
    content: [{ type: 'text', text: formatGateResult(result) }],
    structuredContent: gateReport(result),
    ...(result.ok ? {} : { isError: true }),
  };
}

const draftResultShape = {
  path: z.string(),
  filePath: z.string(),
  ok: z.boolean(),
  diagnostics: z.array(diagnosticShape),
};

/**
 * The corpus read tools: list / get / provenance / search / check. These need
 * only a filesystem content source — no git or `gh` — so they are safe to expose
 * over a network in the read-only server.
 */
function registerReadTools(server: McpServer, tools: NemaTools): void {
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
      description:
        'Validate the whole corpus against all gates. Returns structured diagnostics ' +
        '(rule, severity, path, message, and a remediation hint) as structuredContent, plus a text summary.',
      inputSchema: {},
      outputSchema: gateReportShape,
    },
    async () => gateResponse(await tools.check()),
  );
}

/**
 * The producer write tools. Crucially, NONE of these can promote a page to
 * `reviewed` — that authority belongs to the human PR approval alone. They drive
 * git/`gh`, so they are only registered on the full (local) server.
 */
function registerWriteTools(server: McpServer, tools: NemaTools): void {
  server.registerTool(
    'draft_page',
    {
      title: 'Draft a new page',
      description:
        'Create a NEW page with status: draft and a seeded provenance block, then run nema check ' +
        'and return diagnostics so you can self-correct. Structured diagnostics (with fix hints) are ' +
        'returned as structuredContent. You may only create drafts — never reviewed.',
      inputSchema: {
        path: z.string().describe('Route path without .md, e.g. guide/intro'),
        title: z.string(),
        body: z.string().describe('Markdown body (cite with footnotes + a ## Sources section)'),
        diataxis: z.enum(['tutorial', 'how-to', 'reference', 'explanation', 'overview']).optional(),
        model: modelShape.optional().describe('Your model id/vendor — required for AI authorship'),
        sources: z.array(sourceShape).optional(),
      },
      outputSchema: draftResultShape,
    },
    async (input) => {
      const res = await tools.draftPage(input as DraftPageInput);
      return {
        content: [{ type: 'text', text: formatDraftResult(res) }],
        structuredContent: {
          path: res.path,
          filePath: res.filePath,
          ok: res.ok,
          diagnostics: res.diagnostics,
        },
        ...(res.ok ? {} : { isError: true }),
      };
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
 * Build the full Nema MCP server: read tools expose the corpus; write tools
 * drive the producer loop. There is NO tool that promotes a page to `reviewed`.
 */
export function createNemaMcpServer(cfg: NemaToolsConfig): McpServer {
  const tools = new NemaTools(cfg);
  const server = new McpServer({ name: 'nema', version: '0.1.0' });
  registerReadTools(server, tools);
  registerWriteTools(server, tools);
  return server;
}

/**
 * Build a read-only Nema MCP server — only the corpus read tools, with no write
 * or git/`gh` surface. Safe to expose over a network so remote agents can query a
 * published corpus (and its provenance) without any ability to mutate it.
 */
export function createReadOnlyNemaMcpServer(cfg: NemaToolsConfig): McpServer {
  const tools = new NemaTools(cfg);
  const server = new McpServer({ name: 'nema', version: '0.1.0' });
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
 * Start the Nema MCP server over Streamable HTTP. Stateless with plain JSON
 * responses, so it is simple to host and to call. Pair `readOnly` with a hosted
 * deployment to publish a queryable, provenance-bearing corpus to remote agents.
 *
 * Security: this serves the corpus to anyone who can reach the port. Front it
 * with auth (a bearer token / gateway) before exposing a private corpus.
 */
export async function startHttpServer(
  cfg: NemaToolsConfig,
  opts: HttpServerOptions,
): Promise<Server> {
  const mcp = opts.readOnly ? createReadOnlyNemaMcpServer(cfg) : createNemaMcpServer(cfg);
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
