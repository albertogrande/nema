import { getSource } from '@/lib/source';
// SPDX-License-Identifier: Apache-2.0
import { provenanceBadgeProps } from '@nema/adapter-fumadocs';
import Link from 'next/link';

export default async function TrustPage() {
  const source = await getSource();
  const rows = source.pages.map((page) => {
    const prov = page.provenance ?? null;
    return { page, prov, badge: provenanceBadgeProps(prov) };
  });

  return (
    <main style={{ maxWidth: 920, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <h1>Provenance dashboard</h1>
      <p style={{ color: 'var(--color-fd-muted-foreground)' }}>
        Every page&rsquo;s authorship chain — who/what authored it, which model, and whether a human
        has reviewed it — read straight from the provenance the gates validate.
      </p>
      <table className="trust-table">
        <thead>
          <tr>
            <th>Page</th>
            <th>Status</th>
            <th>Authored by</th>
            <th>Model</th>
            <th>Reviewer</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ page, prov, badge }) => (
            <tr key={page.path}>
              <td>
                <Link href={page.path === 'index' ? '/docs' : `/docs/${page.path}`}>
                  {page.title}
                </Link>
              </td>
              <td>
                <span className={`nema-badge nema-badge--${badge.tone}`}>{page.status || '—'}</span>
              </td>
              <td>{prov?.authored_by ?? '—'}</td>
              <td>{prov?.model?.name ?? '—'}</td>
              <td>{prov?.reviewed_by?.login ? `@${prov.reviewed_by.login}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: '2rem', fontSize: '0.85rem' }}>
        <Link href="/docs">← Back to docs</Link>
      </p>
    </main>
  );
}
