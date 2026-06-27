// SPDX-License-Identifier: Apache-2.0
import { defineCommand } from 'citty';
import { approveCommand } from './commands/approve.js';
import { auditCommand } from './commands/audit.js';
import { checkCommand } from './commands/check.js';
import { claimCommand } from './commands/claim.js';
import { coherenceCommand } from './commands/coherence.js';
import { doctorCommand } from './commands/doctor.js';
import { draftCommand } from './commands/draft.js';
import { explainCommand } from './commands/explain.js';
import { generateCommand } from './commands/generate.js';
import { initCommand } from './commands/init.js';
import { mcpCommand } from './commands/mcp.js';
import { migrateCommand } from './commands/migrate.js';
import { openPrCommand } from './commands/open-pr.js';
import { provCommand } from './commands/prov.js';
import { releaseCommand } from './commands/release.js';

export const main = defineCommand({
  meta: {
    name: 'nema',
    version: '0.1.0',
    description: 'Nema — open-source, AI-native documentation platform',
  },
  subCommands: {
    init: initCommand,
    check: checkCommand,
    doctor: doctorCommand,
    explain: explainCommand,
    migrate: migrateCommand,
    generate: generateCommand,
    draft: draftCommand,
    'open-pr': openPrCommand,
    approve: approveCommand,
    claim: claimCommand,
    release: releaseCommand,
    coherence: coherenceCommand,
    prov: provCommand,
    audit: auditCommand,
    mcp: mcpCommand,
  },
});
