// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { type Provenance, ProvenanceSchema } from '@getnema/schema';
import matter from 'gray-matter';
import { MATTER_OPTIONS } from './yaml.js';

/** Read + validate provenance from an already-parsed frontmatter object. */
export function readProvenanceFromFrontmatter(
  frontmatter: Record<string, unknown>,
): Provenance | null {
  if (frontmatter.provenance == null) return null;
  const parsed = ProvenanceSchema.safeParse(frontmatter.provenance);
  return parsed.success ? parsed.data : null;
}

/** Read + validate provenance from raw file content (frontmatter + body). */
export function readProvenanceFromContent(raw: string): Provenance | null {
  const { data } = matter(raw, MATTER_OPTIONS);
  return readProvenanceFromFrontmatter((data ?? {}) as Record<string, unknown>);
}

/** Read + validate provenance from a file on disk. */
export function readProvenance(filePath: string): Provenance | null {
  return readProvenanceFromContent(readFileSync(filePath, 'utf8'));
}
