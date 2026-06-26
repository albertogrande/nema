// SPDX-License-Identifier: Apache-2.0
import type { Provenance } from '@getnema/schema';
import type { ReactElement } from 'react';
import { provenanceBadgeProps } from './badge.js';

export interface ProvenanceBadgeComponentProps {
  provenance: Provenance | null;
}

/**
 * A small badge rendering a page's trust state (AI draft / reviewed-by-human),
 * reading the same provenance the gates validate. Style via the
 * `nema-badge`/`nema-badge--<tone>` class names.
 */
export function ProvenanceBadge({ provenance }: ProvenanceBadgeComponentProps): ReactElement {
  const props = provenanceBadgeProps(provenance);
  return (
    <span
      className={`nema-badge nema-badge--${props.tone}`}
      data-authored-by={props.authoredBy}
      data-reviewed={props.reviewed ? 'true' : 'false'}
    >
      {props.label}
      {props.model ? ` · ${props.model}` : ''}
    </span>
  );
}
