// SPDX-License-Identifier: Apache-2.0
import { startStdioServer } from '@nema/mcp';
import { defineCommand } from 'citty';

export const mcpCommand = defineCommand({
  meta: {
    name: 'mcp',
    description: 'Start the Nema MCP server over stdio (for `claude mcp add`)',
  },
  args: { dir: { type: 'positional', required: false, description: 'Repo root (default: cwd)' } },
  async run({ args }) {
    const rootDir = args.dir ? String(args.dir) : process.cwd();
    await startStdioServer({ rootDir });
  },
});
