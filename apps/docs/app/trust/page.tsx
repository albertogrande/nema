import { getSource } from '@/lib/source';
// SPDX-License-Identifier: Apache-2.0
import { provenanceBadgeProps } from '@getnema/adapter-fumadocs';
import Link from 'next/link';

/** Render the commit/PR reference on a transition, if any. */
function transitionRef(t: { pr?: number; commit?: string }): string {
  if (t.pr != null) return ` (pr #${t.pr})`;
  if (t.commit) return ` (${t.commit.slice(0, 7)})`;
  return '';
}

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
            <th>Review trail</th>
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
              <td>
                {prov && prov.transitions.length > 0 ? (
                  <details>
                    <summary>
                      {prov.transitions.length} event{prov.transitions.length === 1 ? '' : 's'}
                    </summary>
                    <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1rem', fontSize: '0.8rem' }}>
                      {prov.transitions.map((t) => (
                        <li key={`${t.ts}-${t.to}`}>
                          {t.ts.slice(0, 10)} → <strong>{t.to}</strong> by {t.by}
                          {transitionRef(t)}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  '—'
                )}
              </td>
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
