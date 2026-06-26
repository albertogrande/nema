// SPDX-License-Identifier: Apache-2.0
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ProvenanceSchema } from '@getnema/schema';
import matter from 'gray-matter';
import { JSON_SCHEMA, load as loadYaml } from 'js-yaml';
import type { Page } from './types.js';

/**
 * Parse frontmatter with js-yaml's JSON schema so values stay primitive — most
 * importantly, ISO dates/datetimes remain STRINGS instead of being coerced to
 * `Date` objects (which would break date-string validation downstream).
 */
const MATTER_OPTIONS = {
  engines: {
    yaml: (input: string): object => (loadYaml(input, { schema: JSON_SCHEMA }) as object) ?? {},
  },
} as const;

/** Recursively collect absolute paths of every `.md` file under `dir`. */
export function walkMarkdown(dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const name of entries) {
      if (name.startsWith('.')) continue;
      const full = join(current, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (st.isFile() && name.endsWith('.md')) out.push(full);
    }
  };
  walk(dir);
  return out.sort();
}

/** Normalize an absolute file path to a route path (no leading slash, no `.md`). */
export function toRoutePath(contentRoot: string, filePath: string): string {
  return relative(contentRoot, filePath).replace(/\\/g, '/').replace(/\.md$/, '');
}

/** Parse a single Markdown file into a `Page`. */
export function parsePage(contentRoot: string, filePath: string): Page {
  const raw = readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw, MATTER_OPTIONS);
  const frontmatter = (data ?? {}) as Record<string, unknown>;
  const path = toRoutePath(contentRoot, filePath);

  let provenance: Page['provenance'];
  if (frontmatter.provenance != null) {
    const parsed = ProvenanceSchema.safeParse(frontmatter.provenance);
    if (parsed.success) provenance = parsed.data;
  }

  return {
    path,
    filePath,
    title: typeof frontmatter.title === 'string' && frontmatter.title ? frontmatter.title : path,
    status: typeof frontmatter.status === 'string' ? frontmatter.status : '',
    diataxis: typeof frontmatter.diataxis === 'string' ? frontmatter.diataxis : undefined,
    frontmatter,
    provenance,
    body: content.replace(/^\n+/, ''),
  };
}

/** Load and parse every page under `contentRoot`, sorted by route path. */
export function loadPages(contentRoot: string): Page[] {
  return walkMarkdown(contentRoot)
    .map((file) => parsePage(contentRoot, file))
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** Resolve a page by route path, with `/index` fallback. The `.md` suffix and
 * leading slash are tolerated. */
export function findPage(pages: Page[], path: string): Page | null {
  const want = path.trim().replace(/^\//, '').replace(/\/$/, '').replace(/\.md$/, '');
  return (
    pages.find((p) => p.path === want) ??
    pages.find((p) => p.path === `${want}/index`) ??
    (want === '' ? (pages.find((p) => p.path === 'index') ?? null) : null)
  );
}
