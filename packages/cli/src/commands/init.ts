// SPDX-License-Identifier: Apache-2.0
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineCommand } from 'citty';
import { out } from '../util.js';

const CONFIG = `// SPDX-License-Identifier: Apache-2.0
import type { NemaConfig } from '@getnema/core';

const config: NemaConfig = {
  contentDir: 'docs',
  reviewSlaDays: 180,
};

export default config;
`;

const INDEX = `---
title: Home
status: draft
---

# Home

Welcome to your Nema docs. Draft new pages through the producer loop:
\`nema draft\` (or the MCP write-tools) → \`nema open-pr\` → human approval.
`;

export const initCommand = defineCommand({
  meta: { name: 'init', description: 'Scaffold nema.config.ts and a docs/ directory' },
  args: { dir: { type: 'positional', required: false, description: 'Repo root (default: cwd)' } },
  async run({ args }) {
    const rootDir = args.dir ? String(args.dir) : process.cwd();

    const configPath = join(rootDir, 'nema.config.ts');
    if (existsSync(configPath)) {
      out(`exists  ${configPath}`);
    } else {
      writeFileSync(configPath, CONFIG, 'utf8');
      out(`created ${configPath}`);
    }

    const docsDir = join(rootDir, 'docs');
    mkdirSync(docsDir, { recursive: true });
    const indexPath = join(docsDir, 'index.md');
    if (existsSync(indexPath)) {
      out(`exists  ${indexPath}`);
    } else {
      writeFileSync(indexPath, INDEX, 'utf8');
      out(`created ${indexPath}`);
    }

    out('Done. Try: nema check');
  },
});
