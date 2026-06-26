// SPDX-License-Identifier: Apache-2.0
import type { Provenance } from '@getnema/schema';
import type { Page } from './types.js';

/**
 * A flat, machine-readable view of a page's trust metadata: who authored it,
 * with which model, who reviewed it, plus the page's status and freshness. This
 * is what the `.md` route's `?meta` variant and the MCP `get_provenance` tool
 * return — provenance surfaced where agents (and humans) actually read.
 */
export interface ProvenanceView {
  path: string;
  title: string;
  status: string;
  last_reviewed?: string;
  review_by?: string;
  provenance: Provenance | null;
}

/** Build the provenance view for a page. Pure; no I/O. */
export function provenanceView(page: Page, provenance: Provenance | null): ProvenanceView {
  const fm = page.frontmatter;
  const lastReviewed = typeof fm.last_reviewed === 'string' ? fm.last_reviewed : undefined;
  const reviewBy = typeof fm.review_by === 'string' ? fm.review_by : undefined;
  return {
    path: page.path,
    title: page.title,
    status: page.status,
    ...(lastReviewed ? { last_reviewed: lastReviewed } : {}),
    ...(reviewBy ? { review_by: reviewBy } : {}),
    provenance,
  };
}

/**
 * ASCII-safe scalar HTTP headers describing a page's provenance. The full,
 * structured record (whose source titles may contain non-ASCII text) belongs in
 * the JSON body — never a header value.
 */
export function provenanceHeaders(view: ProvenanceView): Record<string, string> {
  const headers: Record<string, string> = { 'X-Nema-Status': asciiHeader(view.status) };
  const prov = view.provenance;
  if (prov) {
    headers['X-Nema-Authored-By'] = asciiHeader(prov.authored_by);
    if (prov.model?.name) headers['X-Nema-Model'] = asciiHeader(prov.model.name);
    if (prov.reviewed_by?.login) {
      headers['X-Nema-Reviewed-By'] = asciiHeader(prov.reviewed_by.login);
    }
  }
  if (view.last_reviewed) headers['X-Nema-Last-Reviewed'] = view.last_reviewed;
  if (view.review_by) headers['X-Nema-Review-By'] = view.review_by;
  return headers;
}

/** Drop anything outside printable ASCII so a value is always a legal header. */
function asciiHeader(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, '');
}
