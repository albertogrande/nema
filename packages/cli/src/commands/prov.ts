// SPDX-License-Identifier: Apache-2.0
import { type Page, createContentSource } from '@getnema/core';
import { defineCommand } from 'citty';
import { errOut, out } from '../util.js';

function printChain(page: Page): void {
  const prov = page.provenance;
  out(`${page.path} — ${page.title} [status=${page.status || '?'}]`);
  if (!prov) {
    out('  (no provenance)');
    return;
  }
  const model = prov.model?.name
    ? ` (model ${prov.model.name}${prov.model.vendor ? `/${prov.model.vendor}` : ''})`
    : '';
  out(`  authored_by: ${prov.authored_by}${model}`);
  if (prov.sources.length) {
    out('  sources:');
    for (const s of prov.sources) {
      out(
        `    - ${s.id} [${s.kind}] ${s.title}${s.url ? ` (${s.url})` : ''}${
          s.retrieved ? ` retrieved ${s.retrieved}` : ''
        }`,
      );
    }
  }
  if (prov.transitions.length) {
    out('  transitions:');
    for (const t of prov.transitions) {
      out(
        `    - ${t.to.padEnd(9)} by ${t.by} ${t.ts}${t.commit ? ` ${t.commit.slice(0, 7)}` : ''}${
          t.pr != null ? ` pr#${t.pr}` : ''
        }`,
      );
    }
  }
  if (prov.reviewed_by) {
    out(
      `  reviewed_by: ${prov.reviewed_by.login} via ${prov.reviewed_by.method}${
        prov.reviewed_by.pr != null ? ` (pr #${prov.reviewed_by.pr})` : ''
      }`,
    );
  }
}

export const provCommand = defineCommand({
  meta: {
    name: 'prov',
    description: 'Print the provenance chain for a page, or filter the corpus',
  },
  args: {
    path: { type: 'positional', required: false, description: 'Page path (omit to filter/list)' },
    filter: {
      type: 'string',
      description: 'authored_by=ai | authored_by=human | authored_by=mixed',
    },
    status: { type: 'string', description: 'Filter by status, e.g. reviewed' },
    dir: { type: 'string', description: 'Repo root (default: cwd)' },
  },
  async run({ args }) {
    const rootDir = args.dir ? String(args.dir) : process.cwd();
    const source = await createContentSource(rootDir);

    if (args.path) {
      const page = source.getPage(String(args.path));
      if (!page) {
        errOut(`No page found for "${args.path}"`);
        process.exitCode = 1;
        return;
      }
      printChain(page);
      return;
    }

    let pages = source.pages;
    if (args.status) pages = pages.filter((p) => p.status === String(args.status));
    if (args.filter) {
      const [key, value] = String(args.filter).split('=');
      if (key === 'authored_by') {
        pages = pages.filter((p) => p.provenance?.authored_by === value);
      }
    }
    if (pages.length === 0) {
      out('No matching pages.');
      return;
    }
    for (const page of pages) printChain(page);
  },
});
