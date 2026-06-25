import { getSource } from '@/lib/source';
// SPDX-License-Identifier: Apache-2.0
import type { NavNode } from '@nema/core';
import Link from 'next/link';

function NavList({ nodes }: { nodes: NavNode[] }) {
  return (
    <>
      {nodes.map((node) => {
        if (node.items && node.items.length > 0) {
          return (
            <div key={node.title}>
              {node.path ? (
                <Link href={`/docs/${node.path === 'index' ? '' : node.path}`} className="section">
                  {node.title}
                </Link>
              ) : (
                <div className="section">{node.title}</div>
              )}
              <NavList nodes={node.items} />
            </div>
          );
        }
        if (!node.path) return null;
        const href = node.path === 'index' ? '/docs' : `/docs/${node.path}`;
        return (
          <Link key={node.path} href={href}>
            {node.title}
          </Link>
        );
      })}
    </>
  );
}

export async function Sidebar() {
  const source = await getSource();
  return (
    <aside className="sidebar">
      <h1>
        <Link href="/docs">Nema Docs</Link>
      </h1>
      <nav>
        <NavList nodes={source.nav} />
        <div className="section">Trust</div>
        <Link href="/trust">Provenance dashboard</Link>
      </nav>
    </aside>
  );
}
