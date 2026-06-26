// SPDX-License-Identifier: Apache-2.0
import { readFileSync, writeFileSync } from 'node:fs';
import type { Provenance } from '@getnema/schema';
import matter from 'gray-matter';
import { MATTER_OPTIONS, dumpFrontmatter } from './yaml.js';

/**
 * Return new file content with the `provenance` block set in frontmatter,
 * preserving the body and all other frontmatter keys. Frontmatter is
 * re-serialized; values stay primitive and lines are not wrapped.
 */
export function setProvenanceInContent(raw: string, provenance: Provenance): string {
  const { data, content } = matter(raw, MATTER_OPTIONS);
  const next = { ...(data as Record<string, unknown>), provenance };
  const yaml = dumpFrontmatter(next);
  const body = content.replace(/^\n+/, '');
  return `---\n${yaml}---\n\n${body}\n`.replace(/\n+$/, '\n');
}

/** Build full file content from frontmatter + body (used when creating a page). */
export function composeContent(frontmatter: Record<string, unknown>, body: string): string {
  const yaml = dumpFrontmatter(frontmatter);
  return `---\n${yaml}---\n\n${body.replace(/^\n+/, '').replace(/\n+$/, '')}\n`;
}

/** Write the provenance block back into a file on disk. */
export function writeProvenance(filePath: string, provenance: Provenance): void {
  const raw = readFileSync(filePath, 'utf8');
  writeFileSync(filePath, setProvenanceInContent(raw, provenance), 'utf8');
}
