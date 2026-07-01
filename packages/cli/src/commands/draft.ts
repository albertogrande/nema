// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { LocalGitHost } from '@getnema/producer';
import type { Source } from '@getnema/schema';
import { defineCommand } from 'citty';
import { errOut, makeEngine, out } from '../util.js';

/**
 * Parse repeatable `--source "<id>=<ref>"` flags into provenance `Source`
 * entries. `<ref>` becomes the source title; an `http(s)` ref is also recorded
 * as its `url`. The `id` is explicit (not derived) so the author can cite it:
 * every `sources[].id` must be referenced from the body as `[^id]`, or the
 * `provenance-consistency` gate fails. That coupling is intentional — a source
 * the page never cites isn't really a source.
 *
 * citty yields a string for one flag and a string[] for several, so both are
 * accepted. Throws on a malformed spec or a duplicate id.
 */
export function parseSourceArgs(raw: string | string[] | undefined): Source[] {
  if (raw === undefined) return [];
  const specs = Array.isArray(raw) ? raw : [raw];
  const sources: Source[] = [];
  const seen = new Set<string>();
  for (const spec of specs) {
    const eq = spec.indexOf('=');
    const id = eq < 0 ? '' : spec.slice(0, eq).trim();
    const ref = eq < 0 ? '' : spec.slice(eq + 1).trim();
    if (!id || !ref) {
      throw new Error(`--source must be "<id>=<ref>" (got "${spec}")`);
    }
    if (seen.has(id)) throw new Error(`duplicate --source id "${id}"`);
    seen.add(id);
    const isUrl = /^https?:\/\//i.test(ref);
    sources.push({ id, title: ref, kind: 'reference', ...(isUrl ? { url: ref } : {}) });
  }
  return sources;
}

/**
 * Ensure every `--source` has a footnote definition in the body, so an author
 * who cites `[^id]` in their prose doesn't also trip the `footnotes` gate
 * (referenced-but-never-defined). Mirrors what `nema generate` emits: a
 * `## Sources` section of `[^id]: title — url` lines. Definitions already
 * present in the body are left untouched, and an existing `## Sources` heading
 * is reused rather than duplicated. The author still owns the *reference* — a
 * source that is never cited (`[^id]`) is caught by `provenance-consistency`.
 */
export function withSourceFootnotes(body: string, sources: Source[]): string {
  if (sources.length === 0) return body;
  const missing = sources.filter(
    (s) => !new RegExp(`^\\[\\^${s.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]:`, 'm').test(body),
  );
  if (missing.length === 0) return body;
  const defs = missing
    .map((s) => `[^${s.id}]: ${s.title}${s.url && s.url !== s.title ? ` — ${s.url}` : ''}`)
    .join('\n');
  const sep = body.endsWith('\n') ? '' : '\n';
  return /^##\s+Sources\s*$/m.test(body)
    ? `${body}${sep}${defs}\n`
    : `${body}${sep}\n## Sources\n\n${defs}\n`;
}

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
    source: {
      type: 'string',
      description:
        'Cite a backing source as "<id>=<ref>" (repeatable). <ref> is the title; an http(s) <ref> is also its url. Reference each id in the body as [^id].',
    },
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
    let sources: Source[];
    try {
      sources = parseSourceArgs(args.source as string | string[] | undefined);
    } catch (err) {
      errOut((err as Error).message);
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
      body: withSourceFootnotes(body, sources),
      frontmatter: args.diataxis ? { diataxis: String(args.diataxis) } : undefined,
      // No model means a human is drafting from the CLI: record `authored_by: human`
      // so the page is valid. `authored_by: ai` requires `provenance.model.name`,
      // which we only have when --model-name is supplied.
      authoredBy: model ? 'ai' : 'human',
      model,
      sources,
    });
    out(`Drafted ${res.path} -> ${res.filePath}`);
    if (res.ok) {
      out('✓ nema check passed for this page. Next: nema open-pr');
    } else {
      out('nema check found issues:');
      for (const d of res.diagnostics) out(`  ✗ [${d.rule}] ${d.message}`);
      process.exitCode = 1;
    }
    if (res.similar.length > 0) {
      out('\n⚠ similar existing pages — consider updating one instead of duplicating:');
      for (const s of res.similar) out(`    ${s.score.toFixed(2)}  ${s.path} — ${s.title}`);
    }
  },
});
