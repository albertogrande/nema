// SPDX-License-Identifier: Apache-2.0
import { resolveConfig } from './config.js';
import { findPage, loadPages } from './load.js';
import { buildNav } from './nav.js';
import { renderMarkdown } from './render.js';
import { search } from './search.js';
import type { ContentSource, ForgeConfig, ResolvedConfig } from './types.js';

/** Build a `ContentSource` from an already-resolved config (synchronous load). */
export function contentSourceFromConfig(config: ResolvedConfig): ContentSource {
  const pages = loadPages(config.contentRoot);
  const nav = config.nav
    ? typeof config.nav === 'function'
      ? config.nav(pages)
      : config.nav
    : buildNav(pages);

  return {
    pages,
    nav,
    config,
    getPage: (path) => findPage(pages, path),
    search: (query, limit) => search(pages, query, limit),
    renderMarkdown,
    provenanceOf: (path) => findPage(pages, path)?.provenance ?? null,
  };
}

/**
 * Load a `ContentSource` for a repo: resolve config (incl. `docforge.config.*`),
 * then load and index every page. This is the main entry point for adapters,
 * the MCP server, and the CLI.
 */
export async function createContentSource(
  rootDir: string,
  overrides?: ForgeConfig,
): Promise<ContentSource> {
  const config = await resolveConfig(rootDir, overrides);
  return contentSourceFromConfig(config);
}
