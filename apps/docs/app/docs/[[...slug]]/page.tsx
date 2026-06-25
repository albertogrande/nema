import { getSource, slugToPath } from '@/lib/source';
// SPDX-License-Identifier: Apache-2.0
import { ProvenanceBadge } from '@nema/adapter-fumadocs';
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

  const html = marked.parse(source.renderMarkdown(page), { async: false }) as string;
  const provenance = source.provenanceOf(page.path);
  const mdHref = `/md/${page.path}`;

  return (
    <article>
      <ProvenanceBadge provenance={provenance} />
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: trusted, gate-validated local Markdown */}
      <div className="content" dangerouslySetInnerHTML={{ __html: html }} />
      <hr style={{ borderColor: 'var(--border)', margin: '2rem 0 1rem' }} />
      <p style={{ fontSize: '0.85rem' }}>
        <Link href={mdHref}>View raw Markdown (.md route)</Link>
        {' · '}
        <Link href="/trust">Provenance dashboard</Link>
      </p>
    </article>
  );
}
