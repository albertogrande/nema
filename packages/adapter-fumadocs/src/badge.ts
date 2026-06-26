// SPDX-License-Identifier: Apache-2.0
import type { Provenance } from '@getnema/schema';

export type BadgeTone = 'reviewed' | 'draft' | 'ai';

export interface ProvenanceBadgeProps {
  authoredBy: 'ai' | 'human' | 'mixed' | 'unknown';
  reviewed: boolean;
  reviewer?: string;
  model?: string;
  label: string;
  tone: BadgeTone;
}

/**
 * Pure projection of provenance → badge props. Kept framework-free so it is
 * testable without React; the `<ProvenanceBadge>` component is a thin view.
 */
export function provenanceBadgeProps(provenance: Provenance | null): ProvenanceBadgeProps {
  if (!provenance) {
    return { authoredBy: 'unknown', reviewed: false, label: 'No provenance', tone: 'draft' };
  }
  const reviewed = provenance.reviewed_by != null;
  const label = reviewed
    ? `Reviewed by ${provenance.reviewed_by?.login}`
    : provenance.authored_by === 'ai'
      ? 'AI draft — pending review'
      : 'Draft — pending review';
  return {
    authoredBy: provenance.authored_by,
    reviewed,
    reviewer: provenance.reviewed_by?.login,
    model: provenance.model?.name,
    label,
    tone: reviewed ? 'reviewed' : provenance.authored_by === 'ai' ? 'ai' : 'draft',
  };
}
