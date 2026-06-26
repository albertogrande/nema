import { getSource, slugToPath } from '@/lib/source';
// SPDX-License-Identifier: Apache-2.0
import { ProvenanceBadge } from '@getnema/adapter-fumadocs';
import { getTableOfContents } from 'fumadocs-core/server';
import { DocsBody, DocsPage } from 'fumadocs-ui/page';
import { marked } from 'marked';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const source = await getSource();
  return source.pages.map((p) => ({ slug: p.path === 'index' ? [] : p.path.split('/') }));
}

export default async function DocPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const source = await getSource();
  const page = source.getPage(slugToPath(slug));
  if (!page) notFound();

  // renderMarkdown is the parity source (same bytes the .md route serves); the HTML
  // and the table of contents are derived from it for the human-facing view.
  const markdown = source.renderMarkdown(page);
  const html = marked.parse(markdown, { async: false }) as string;
  const toc = getTableOfContents(markdown);
  const provenance = source.provenanceOf(page.path);

  return (
    <DocsPage toc={toc}>
      <DocsBody>
        <ProvenanceBadge provenance={provenance} />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: trusted, gate-validated local Markdown */}
        <div dangerouslySetInnerHTML={{ __html: html }} />
        <hr />
        <p style={{ fontSize: '0.85rem', color: 'var(--color-fd-muted-foreground)' }}>
          <Link href={`/md/${page.path}`}>View raw Markdown (.md route)</Link>
          {' · '}
          <Link href="/trust">Provenance dashboard</Link>
        </p>
      </DocsBody>
    </DocsPage>
  );
}
