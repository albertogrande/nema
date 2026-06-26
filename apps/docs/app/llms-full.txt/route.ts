import { getSource } from '@/lib/source';
// SPDX-License-Identifier: Apache-2.0
import { buildLlmsFull } from '@getnema/core';

export const dynamic = 'force-static';

export async function GET() {
  const source = await getSource();
  const body = buildLlmsFull(source, {
    title: 'Nema Docs',
    description:
      'Documentation authored through the Nema producer loop — every page carries provenance.',
  });
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
