// SPDX-License-Identifier: Apache-2.0
import type { ContentModel, Provenance } from '@getnema/schema';

/** A loaded documentation page. Domain-neutral. */
export interface Page {
  /** Normalized route path: no leading slash, no `.md` suffix (e.g. `guide/intro`). */
  path: string;
  /** Absolute path to the source `.md` file. */
  filePath: string;
  title: string;
  status: string;
  diataxis?: string;
  /** Raw parsed frontmatter (all keys, unvalidated). */
  frontmatter: Record<string, unknown>;
  /** Parsed provenance block, if present and valid. */
  provenance?: Provenance;
  /** Markdown body with frontmatter stripped. */
  body: string;
}

export interface SearchHit {
  path: string;
  title: string;
  score: number;
  /** ~200-char prose excerpt around the first matched term. */
  snippet: string;
  /** Heading slug for a deep link, or `''` if the hit is above the first heading. */
  anchor: string;
}

/** A node in the navigation tree. A node may be a page, a section, or both. */
export interface NavNode {
  title: string;
  /** Route path if this node corresponds to a page. */
  path?: string;
  /** Child nodes if this node is a section. */
  items?: NavNode[];
}

/**
 * The contract Core hands to an adapter. Renderer-agnostic: everything here is
 * plain data and pure functions; no framework types leak through.
 */
export interface ContentSource {
  pages: Page[];
  getPage(path: string): Page | null;
  search(query: string, limit?: number): SearchHit[];
  renderMarkdown(page: Page): string;
  nav: NavNode[];
  provenanceOf(path: string): Provenance | null;
  config: ResolvedConfig;
}

/** User-facing configuration (from `nema.config.{ts,js,mjs,json}`). */
export interface NemaConfig {
  /** Directory holding `.md` content, relative to repo root. Default `docs`. */
  contentDir?: string;
  /** Freshness SLA in days — how far ahead `review_by` is set on approval. Default 180. */
  reviewSlaDays?: number;
  /** Pages exempt from the orphan/reachability check. Default `['index']`. */
  rootExempt?: string[];
  /** Optional site base URL (used by adapters). */
  baseUrl?: string;
  /** Custom content model (required fields, enums, dates). Defaults to the bundled SSOT. */
  contentModel?: ContentModel;
  /** Explicit navigation, as a tree or a builder. Defaults to a path-derived tree. */
  nav?: NavNode[] | ((pages: Page[]) => NavNode[]);
}

/** Configuration after defaults are applied and paths resolved. */
export interface ResolvedConfig {
  rootDir: string;
  contentDir: string;
  /** Absolute path to the content directory. */
  contentRoot: string;
  reviewSlaDays: number;
  rootExempt: string[];
  baseUrl: string;
  /** Resolved content model; gates fall back to the bundled SSOT when unset. */
  contentModel?: ContentModel;
  nav?: NavNode[] | ((pages: Page[]) => NavNode[]);
}
