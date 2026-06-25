// SPDX-License-Identifier: Apache-2.0
import { defineCommand } from 'citty';
import { approveCommand } from './commands/approve.js';
import { checkCommand } from './commands/check.js';
import { draftCommand } from './commands/draft.js';
import { initCommand } from './commands/init.js';
import { mcpCommand } from './commands/mcp.js';
import { migrateCommand } from './commands/migrate.js';
import { openPrCommand } from './commands/open-pr.js';
import { provCommand } from './commands/prov.js';

export const main = defineCommand({
  meta: {
    name: 'forge',
    version: '0.1.0',
    description: 'Forge — open-source, AI-native documentation platform',
  },
  subCommands: {
    init: initCommand,
    check: checkCommand,
    migrate: migrateCommand,
    draft: draftCommand,
    'open-pr': openPrCommand,
    approve: approveCommand,
    prov: provCommand,
    mcp: mcpCommand,
  },
});
