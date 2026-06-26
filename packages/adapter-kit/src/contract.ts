// SPDX-License-Identifier: Apache-2.0
import type { ContentSource, Page } from '@getnema/core';
import type { Provenance } from '@getnema/schema';

/** A flattened nav entry an adapter exposes to its renderer. */
export interface NavRoute {
  path: string;
  title: string;
}

/**
 * The contract every renderer adapter implements. Core hands the adapter a
 * `ContentSource` (plain data + pure functions); the adapter projects it into
 * its renderer's world. `TRendererSource` is the adapter-specific shape.
 *
 * The one inviolable clause: `markdownRoute` MUST return
 * `src.renderMarkdown(page)` verbatim, so the rendered `.md` route and the MCP
 * `get_page` tool are byte-identical. The conformance suite enforces this.
 */
export interface RendererAdapter<TRendererSource = unknown> {
  /** Adapter id, e.g. `fumadocs`. */
  readonly name: string;
  /** Project the content source into the renderer's source shape. */
  toRendererSource(src: ContentSource): TRendererSource;
  /** The raw Markdown for a page's `.md` route. MUST be `src.renderMarkdown(page)`. */
  markdownRoute(src: ContentSource, page: Page): string;
  /** The flattened navigation routes the renderer should expose. */
  navRoutes(src: ContentSource): NavRoute[];
  /** Optional UI projection for a page's provenance (e.g. badge props). */
  provenanceUI?(provenance: Provenance | null): unknown;
}
