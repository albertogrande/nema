import { getSource, slugToPath } from '@/lib/source';
// SPDX-License-Identifier: Apache-2.0
import { provenanceHeaders, provenanceView } from '@getnema/core';

export async function generateStaticParams() {
  const source = await getSource();
  return source.pages.map((p) => ({ slug: p.path.split('/') }));
}

/**
 * The `.md` route: serves the canonical Markdown verbatim, byte-identical to the
 * MCP `get_page` tool — both go through `renderMarkdown`. This is the parity the
 * adapter conformance suite guards. Provenance rides on response headers and an
 * opt-in `?meta` JSON variant, never in the body (which would break that parity).
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const source = await getSource();
  const page = source.getPage(slugToPath(slug));
  if (!page) return new Response('Not found', { status: 404 });

  const view = provenanceView(page, source.provenanceOf(page.path));

  // Opt-in structured variant for agents that want the full record.
  const accept = request.headers.get('accept') ?? '';
  if (new URL(request.url).searchParams.has('meta') || accept.includes('application/json')) {
    return new Response(JSON.stringify(view, null, 2), {
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }

  // Body is byte-identical to renderMarkdown(page); provenance rides on headers.
  return new Response(source.renderMarkdown(page), {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      link: `</md/${page.path}?meta>; rel="describedby"`,
      ...provenanceHeaders(view),
    },
  });
}
