// SPDX-License-Identifier: Apache-2.0
import { getSource } from '@/lib/source';
import { provenanceBadgeProps } from '@docforge/adapter-fumadocs';
import { type PageTrust, computeTrustReport } from '@docforge/core';
import Link from 'next/link';

/** The single most important risk flag for a page, or null when it's clean. */
function riskOf(t: PageTrust): { label: string; tone: 'risk' | 'warn' } | null {
  if (t.aiUnreviewed) return { label: 'AI · unreviewed', tone: 'risk' };
  if (t.stale) return { label: 'stale', tone: 'risk' };
  if (t.evidence === 'asserted') return { label: 'unanchored', tone: 'warn' };
  return null;
}

export default async function TrustPage() {
  const source = await getSource();
  const report = computeTrustReport(source.pages);
  const trustByPath = new Map(report.pages.map((t) => [t.path, t]));

  const rows = source.pages.map((page) => ({
    page,
    prov: page.provenance ?? null,
    badge: provenanceBadgeProps(page.provenance ?? null),
    risk: riskOf(trustByPath.get(page.path)!),
  }));

  return (
    <article>
      <h1>Trust posture</h1>
      <p style={{ color: 'var(--muted)' }}>
        The whole corpus at a glance — read straight from the provenance the gates validate. The
        same numbers come from <code>forge trust</code>; the CLI and this page share one function,
        so they can never disagree.
      </p>

      <div className="scorecard">
        <div className="stat">
          <span className="stat-num">{report.total}</span>
          <span className="stat-label">pages</span>
        </div>
        <div className="stat">
          <span className="stat-num">{report.reviewedPct}%</span>
          <span className="stat-label">
            reviewed ({report.reviewedCount}/{report.total})
          </span>
        </div>
        <div className="stat">
          <span className="stat-num">{report.aiAuthoredPct}%</span>
          <span className="stat-label">
            AI-authored ({report.aiAuthoredCount}/{report.total})
          </span>
        </div>
        <div className={`stat${report.aiUnreviewedCount > 0 ? ' stat--risk' : ''}`}>
          <span className="stat-num">{report.aiUnreviewedCount}</span>
          <span className="stat-label">AI, not reviewed</span>
        </div>
        <div className={`stat${report.staleCount > 0 ? ' stat--risk' : ''}`}>
          <span className="stat-num">{report.staleCount}</span>
          <span className="stat-label">stale / overdue</span>
        </div>
        <div className={`stat${report.assertedCount > 0 ? ' stat--warn' : ''}`}>
          <span className="stat-num">
            {report.anchoredCount}/{report.reviewedCount}
          </span>
          <span className="stat-label">review anchored to a commit</span>
        </div>
      </div>

      {report.assertedCount > 0 && (
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
          <strong>Anchored</strong> means a page&rsquo;s <code>reviewed</code> transition points at
          a commit — the tamper-evident hash. Resolving those anchors against git history is{' '}
          <code>forge audit</code> (next release).
        </p>
      )}

      <table className="trust-table">
        <thead>
          <tr>
            <th>Page</th>
            <th>Status</th>
            <th>Authored by</th>
            <th>Model</th>
            <th>Reviewer</th>
            <th>Risk</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ page, prov, badge, risk }) => (
            <tr key={page.path}>
              <td>
                <Link href={page.path === 'index' ? '/docs' : `/docs/${page.path}`}>
                  {page.title}
                </Link>
              </td>
              <td>
                <span className={`forge-badge forge-badge--${badge.tone}`}>
                  {page.status || '—'}
                </span>
              </td>
              <td>{prov?.authored_by ?? '—'}</td>
              <td>{prov?.model?.name ?? '—'}</td>
              <td>{prov?.reviewed_by?.login ? `@${prov.reviewed_by.login}` : '—'}</td>
              <td>
                {risk ? (
                  <span className={`forge-badge forge-badge--${risk.tone}`}>{risk.label}</span>
                ) : (
                  <span style={{ color: 'var(--muted)' }}>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
