import { getPageTree } from '@/lib/tree';
// SPDX-License-Identifier: Apache-2.0
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';

export default async function DocsRootLayout({ children }: { children: ReactNode }) {
  const tree = await getPageTree();
  return (
    <DocsLayout
      tree={tree}
      nav={{ title: 'Forge Docs' }}
      links={[{ text: 'Trust', url: '/trust' }]}
    >
      {children}
    </DocsLayout>
  );
}
