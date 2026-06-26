// SPDX-License-Identifier: Apache-2.0
import type { NavRoute, RendererAdapter } from '@getnema/adapter-kit';
import type { ContentSource, NavNode, Page } from '@getnema/core';
import { type ProvenanceBadgeProps, provenanceBadgeProps } from './badge.js';

/** A page shaped for Fumadocs' page tree. */
export interface FumadocsPage {
  url: string;
  slugs: string[];
  title: string;
  data: { title: string; status: string; diataxis?: string };
}

export interface FumadocsSource {
  pages: FumadocsPage[];
}

function flattenNav(nav: NavNode[]): NavRoute[] {
  const out: NavRoute[] = [];
  const walk = (nodes: NavNode[]): void => {
    for (const node of nodes) {
      if (node.path) out.push({ path: node.path, title: node.title });
      if (node.items) walk(node.items);
    }
  };
  walk(nav);
  return out;
}

/**
 * The v0.1 reference adapter. Projects the content source into a Fumadocs-shaped
 * page tree + nav, serves the canonical `.md` route verbatim (parity), and maps
 * provenance to badge props. Wiring into an actual Next/Fumadocs app is a thin
 * layer on top of this.
 */
export const fumadocsAdapter: RendererAdapter<FumadocsSource> = {
  name: 'fumadocs',

  toRendererSource(src: ContentSource): FumadocsSource {
    return {
      pages: src.pages.map((p: Page) => ({
        url: `/${p.path}`,
        slugs: p.path.split('/'),
        title: p.title,
        data: { title: p.title, status: p.status, diataxis: p.diataxis },
      })),
    };
  },

  markdownRoute(src: ContentSource, page: Page): string {
    // MUST be verbatim — this is the parity guarantee the conformance suite checks.
    return src.renderMarkdown(page);
  },

  navRoutes(src: ContentSource): NavRoute[] {
    return flattenNav(src.nav);
  },

  provenanceUI(provenance): ProvenanceBadgeProps {
    return provenanceBadgeProps(provenance);
  },
};
