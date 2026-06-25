// SPDX-License-Identifier: Apache-2.0
import { startHttpServer, startStdioServer } from '@docforge/mcp';
import { defineCommand } from 'citty';

export const mcpCommand = defineCommand({
  meta: {
    name: 'mcp',
    description: 'Start the Forge MCP server — stdio by default (for `claude mcp add`), or HTTP',
  },
  args: {
    dir: { type: 'positional', required: false, description: 'Repo root (default: cwd)' },
    http: { type: 'boolean', description: 'Serve over Streamable HTTP instead of stdio' },
    port: { type: 'string', description: 'HTTP port (default 3001)' },
    'read-only': {
      type: 'boolean',
      description: 'Expose only the read tools (no write/git) — for a hosted corpus',
    },
  },
  async run({ args }) {
    const rootDir = args.dir ? String(args.dir) : process.cwd();
    if (args.http) {
      const port = args.port ? Number(args.port) : 3001;
      const readOnly = Boolean(args['read-only']);
      await startHttpServer({ rootDir }, { port, readOnly });
      process.stderr.write(
        `forge MCP (HTTP${readOnly ? ', read-only' : ''}) on http://localhost:${port}\n`,
      );
    } else {
      await startStdioServer({ rootDir });
    }
  },
});
