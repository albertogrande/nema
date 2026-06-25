// SPDX-License-Identifier: Apache-2.0
import rawModel from '../content-model.json' with { type: 'json' };

/** A cross-field invariant: when one field equals a value, another must be in a set. */
export interface BoundaryRule {
  when: { field: string; equals: string };
  require: { field: string; in: string[] };
}

/**
 * The SSOT content model. Drives the Zod schema AND the gates so the two can
 * never drift. Domain-neutral — extend `enums`/`required` per deployment, but
 * never re-declare these values inline elsewhere.
 */
export interface ContentModel {
  required: string[];
  enums: Record<string, string[]>;
  dates: string[];
  reviewedRequires: string[];
  boundary: BoundaryRule[];
}

export const CONTENT_MODEL: ContentModel = {
  required: rawModel.required,
  enums: rawModel.enums,
  dates: rawModel.dates,
  reviewedRequires: rawModel.reviewedRequires,
  boundary: (rawModel.boundary ?? []) as BoundaryRule[],
};
