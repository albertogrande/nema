// SPDX-License-Identifier: Apache-2.0
import type { NavNode } from '@getnema/core';
import type * as PageTree from 'fumadocs-core/page-tree';
import { getSource } from './source';

function docUrl(path: string): string {
  return path === 'index' ? '/docs' : `/docs/${path}`;
}

function toNodes(nodes: NavNode[]): PageTree.Node[] {
  return nodes.map((node): PageTree.Node => {
    if (node.items && node.items.length > 0) {
      return {
        type: 'folder',
        name: node.title,
        ...(node.path ? { index: { type: 'page', name: node.title, url: docUrl(node.path) } } : {}),
        children: toNodes(node.items),
      };
    }
    return { type: 'page', name: node.title, url: docUrl(node.path ?? node.title) };
  });
}

/** Build the Fumadocs page tree from the Nema nav (renderer-agnostic core data). */
export async function getPageTree(): Promise<PageTree.Root> {
  const source = await getSource();
  return { name: 'Documentation', children: toNodes(source.nav) };
}
