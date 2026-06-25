#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
import { startHttpServer, startStdioServer } from './server.js';

const rootDir = process.argv[2] ?? process.env.FORGE_ROOT ?? process.cwd();
const port = process.env.FORGE_MCP_PORT ? Number(process.env.FORGE_MCP_PORT) : undefined;
const readOnly = process.env.FORGE_MCP_READONLY === '1';

const start = port
  ? startHttpServer({ rootDir }, { port, readOnly }).then(() => {
      process.stderr.write(
        `forge-mcp (HTTP${readOnly ? ', read-only' : ''}) listening on http://localhost:${port}\n`,
      );
    })
  : startStdioServer({ rootDir });

start.catch((error: unknown) => {
  process.stderr.write(`forge-mcp failed to start: ${String(error)}\n`);
  process.exit(1);
});
