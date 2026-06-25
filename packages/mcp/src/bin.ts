#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
import { startStdioServer } from './server.js';

const rootDir = process.argv[2] ?? process.env.NEMA_ROOT ?? process.cwd();

startStdioServer({ rootDir }).catch((error: unknown) => {
  process.stderr.write(`nema-mcp failed to start: ${String(error)}\n`);
  process.exit(1);
});
