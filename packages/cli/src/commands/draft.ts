// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { LocalGitHost } from '@getnema/producer';
import { defineCommand } from 'citty';
import { errOut, makeEngine, out } from '../util.js';

export const draftCommand = defineCommand({
  meta: {
    name: 'draft',
    description: 'Create a new draft page with seeded provenance, then check it',
  },
  args: {
    path: {
      type: 'string',
      required: true,
      description: 'Route path without .md, e.g. guide/intro',
    },
    title: { type: 'string', required: true },
    body: { type: 'string', description: 'Markdown body (or use --body-file)' },
    'body-file': { type: 'string', description: 'Read the body from a file' },
    diataxis: {
      type: 'string',
      description: 'tutorial | how-to | reference | explanation | overview',
    },
    'model-name': {
      type: 'string',
      description: 'Authoring model id (required for AI authorship)',
    },
    'model-vendor': { type: 'string' },
    dir: { type: 'string', description: 'Repo root (default: cwd)' },
  },
  async run({ args }) {
    const rootDir = args.dir ? String(args.dir) : process.cwd();
    const body = args['body-file']
      ? readFileSync(String(args['body-file']), 'utf8')
      : (args.body ?? '');
    if (!body) {
      errOut('Provide --body or --body-file');
      process.exitCode = 1;
      return;
    }
    const model = args['model-name']
      ? {
          name: String(args['model-name']),
          vendor: args['model-vendor'] ? String(args['model-vendor']) : undefined,
        }
      : undefined;

    const engine = await makeEngine(rootDir, new LocalGitHost(rootDir));
    const res = await engine.draftPage({
      path: String(args.path),
      title: String(args.title),
      body,
      frontmatter: args.diataxis ? { diataxis: String(args.diataxis) } : undefined,
      // No model means a human is drafting from the CLI: record `authored_by: human`
      // so the page is valid. `authored_by: ai` requires `provenance.model.name`,
      // which we only have when --model-name is supplied.
      authoredBy: model ? 'ai' : 'human',
      model,
    });
    out(`Drafted ${res.path} -> ${res.filePath}`);
    if (res.ok) {
      out('✓ nema check passed for this page. Next: nema open-pr');
    } else {
      out('nema check found issues:');
      for (const d of res.diagnostics) out(`  ✗ [${d.rule}] ${d.message}`);
      process.exitCode = 1;
    }
  },
});
