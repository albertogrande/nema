// SPDX-License-Identifier: Apache-2.0

export interface TemplateOptions {
  /** Project name, written into the scaffolded package.json. */
  name: string;
}

/**
 * The files a new Nema docs repo starts with — a working producer loop on the
 * published packages. Pure: returns a `path → content` map with no I/O, so it is
 * trivially testable. The generated `nema check` workflow is the load-bearing
 * piece: its `draft-pages-not-reviewed` gate makes self-promotion impossible.
 */
export function templates(opts: TemplateOptions): Record<string, string> {
  const pkg = {
    name: opts.name,
    version: '0.0.0',
    private: true,
    type: 'module',
    scripts: {
      check: 'nema check',
      draft: 'nema draft',
      'open-pr': 'nema open-pr',
    },
    devDependencies: {
      nema: '^0.1.0-alpha.0',
    },
  };

  return {
    'nema.config.ts': `// SPDX-License-Identifier: Apache-2.0
import type { NemaConfig } from '@getnema/core';

const config: NemaConfig = {
  contentDir: 'docs',
  reviewSlaDays: 180,
};

export default config;
`,
    'docs/index.md': `---
title: Home
status: draft
---

# Home

Welcome to your Nema docs. Draft new pages through the producer loop:
\`nema draft\` (or the MCP write-tools) → \`nema open-pr\` → human approval.
`,
    'package.json': `${JSON.stringify(pkg, null, 2)}\n`,
    '.github/workflows/nema-check.yml': `# SPDX-License-Identifier: Apache-2.0
name: nema check
on:
  pull_request:
  push:
    branches: [main]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install
      - run: npm run check
`,
    '.gitignore': 'node_modules\n',
    'README.md': `# ${opts.name}

Governed documentation, powered by [Nema](https://github.com/albertogrande/nema).

## The producer loop

1. An agent **drafts** a page — \`npm run draft\` or the MCP write-tools — writing \`status: draft\`
   with a seeded provenance block, then self-checks against the gates.
2. **Propose** — \`nema open-pr\` opens a PR labeled \`nema:draft\`.
3. **CI** runs \`nema check\` (the \`nema check\` workflow in this repo) — every gate, including
   \`draft-pages-not-reviewed\`, which makes it impossible to publish an unreviewed page as trusted.
4. **A human approves** the PR. That approval is the only path to \`reviewed\`.

## Use it

\`\`\`sh
npm install
npm run check          # run the gates
\`\`\`

## Let an agent author it (MCP)

Point an MCP-capable agent at this repo:

\`\`\`sh
claude mcp add nema -- npx -y nema mcp .
\`\`\`

The agent can list, search, read, and **draft** pages — but it cannot promote a page to
\`reviewed\`. Only a human PR approval can.
`,
  };
}
