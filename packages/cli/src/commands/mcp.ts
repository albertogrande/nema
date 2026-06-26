// SPDX-License-Identifier: Apache-2.0
import { startHttpServer, startStdioServer } from '@getnema/mcp';
import { defineCommand } from 'citty';

export const mcpCommand = defineCommand({
  meta: {
    name: 'mcp',
    description: 'Start the Nema MCP server — stdio by default (for `claude mcp add`), or HTTP',
  },
  args: {
    dir: { type: 'positional', required: false, description: 'Repo root (default: cwd)' },
    http: { type: 'boolean', description: 'Serve over Streamable HTTP instead of stdio' },
    port: { type: 'string', description: 'HTTP port (default 3001)' },
    'read-only': {
      type: 'boolean',
      description: 'Expose only the read tools (no write/git) — for a hosted corpus',
    },
    'auth-token-env': {
      type: 'string',
      description:
        'Env var holding the HTTP bearer token (default NEMA_MCP_TOKEN; unset ⇒ no auth)',
    },
  },
  async run({ args }) {
    const rootDir = args.dir ? String(args.dir) : process.cwd();
    if (args.http) {
      const port = args.port ? Number(args.port) : 3001;
      const readOnly = Boolean(args['read-only']);
      const tokenEnv = args['auth-token-env'] ? String(args['auth-token-env']) : 'NEMA_MCP_TOKEN';
      const authToken = process.env[tokenEnv] || undefined;
      await startHttpServer({ rootDir }, { port, readOnly, authToken });
      process.stderr.write(
        `nema MCP (HTTP${readOnly ? ', read-only' : ''}${authToken ? ', authenticated' : ''}) on http://localhost:${port}\n`,
      );
    } else {
      await startStdioServer({ rootDir });
    }
  },
});
