// SPDX-License-Identifier: Apache-2.0
import type { NavNode, Page } from './types.js';

/** Turn a path segment into a human-readable title (`getting-started` → `Getting Started`). */
export function humanize(segment: string): string {
  return segment
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * Build a hierarchical navigation tree from page paths. A `dir/index` page
 * becomes the section node for `dir`; other pages become leaves. Sections are
 * created on demand from intermediate path segments.
 */
export function buildNav(pages: Page[]): NavNode[] {
  const rootItems: NavNode[] = [];
  const dirNodes = new Map<string, { node: NavNode; items: NavNode[] }>();

  const itemsForDir = (dirParts: string[]): NavNode[] => {
    if (dirParts.length === 0) return rootItems;
    const key = dirParts.join('/');
    const existing = dirNodes.get(key);
    if (existing) return existing.items;
    const parentItems = itemsForDir(dirParts.slice(0, -1));
    const items: NavNode[] = [];
    const node: NavNode = { title: humanize(dirParts[dirParts.length - 1]!), items };
    parentItems.push(node);
    dirNodes.set(key, { node, items });
    return items;
  };

  for (const page of [...pages].sort((a, b) => a.path.localeCompare(b.path))) {
    const parts = page.path.split('/');
    const last = parts[parts.length - 1]!;

    if (last === 'index' && parts.length > 1) {
      const dirParts = parts.slice(0, -1);
      itemsForDir(dirParts);
      const entry = dirNodes.get(dirParts.join('/'));
      if (entry) {
        entry.node.path = page.path;
        entry.node.title = page.title;
      }
    } else if (last === 'index' && parts.length === 1) {
      rootItems.unshift({ title: page.title, path: page.path });
    } else {
      itemsForDir(parts.slice(0, -1)).push({ title: page.title, path: page.path });
    }
  }

  return rootItems;
}

/** Flatten a nav tree to the set of page paths it references. */
export function navPaths(nav: NavNode[]): Set<string> {
  const out = new Set<string>();
  const walk = (nodes: NavNode[]): void => {
    for (const node of nodes) {
      if (node.path) out.add(node.path);
      if (node.items) walk(node.items);
    }
  };
  walk(nav);
  return out;
}
