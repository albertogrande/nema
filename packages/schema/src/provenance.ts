// SPDX-License-Identifier: Apache-2.0
import { z } from 'zod';
import { isoDate } from './dates.js';
import { LIFECYCLE_STATES } from './lifecycle.js';

/** Who authored the content. */
export const AUTHORED_BY = ['ai', 'human', 'mixed'] as const;
export type AuthoredBy = (typeof AUTHORED_BY)[number];

/** Kind of a cited source. Structured — replaces free-text footnotes as the SSOT. */
export const SOURCE_KINDS = ['primary', 'secondary', 'reference'] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

/**
 * How a human review was recorded. `github-pr-approval` is the standard loop;
 * `migration` marks a page that a human asserted as reviewed when importing an
 * existing corpus with `forge migrate` (no PR — the migrating human is the gate).
 */
export const REVIEW_METHODS = ['github-pr-approval', 'migration'] as const;
export type ReviewMethod = (typeof REVIEW_METHODS)[number];

export const ModelInfoSchema = z.object({
  name: z.string().min(1),
  vendor: z.string().min(1).optional(),
  prompt_ref: z.string().min(1).optional(),
});
export type ModelInfo = z.infer<typeof ModelInfoSchema>;

export const ReviewedBySchema = z.object({
  login: z.string().min(1),
  method: z.enum(REVIEW_METHODS),
  pr: z.number().int().positive().optional(),
});
export type ReviewedBy = z.infer<typeof ReviewedBySchema>;

export const SourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url().optional(),
  kind: z.enum(SOURCE_KINDS).default('reference'),
  retrieved: isoDate.optional(),
});
export type Source = z.infer<typeof SourceSchema>;

export const TransitionSchema = z.object({
  to: z.enum(LIFECYCLE_STATES),
  by: z.string().min(1),
  ts: z.string().datetime({ offset: true }),
  commit: z.string().min(1).optional(),
  pr: z.number().int().positive().optional(),
});
export type Transition = z.infer<typeof TransitionSchema>;

/**
 * Page-level provenance — the canonical, queryable, git-diffable record of how
 * a page came to be. Lives in frontmatter under `provenance:`.
 */
export const ProvenanceSchema = z.object({
  schema: z.literal(1).default(1),
  authored_by: z.enum(AUTHORED_BY),
  model: ModelInfoSchema.optional(),
  reviewed_by: ReviewedBySchema.optional(),
  sources: z.array(SourceSchema).default([]),
  transitions: z.array(TransitionSchema).default([]),
});
export type Provenance = z.infer<typeof ProvenanceSchema>;
/** Input shape before defaults are applied (what a writer must supply). */
export type ProvenanceInput = z.input<typeof ProvenanceSchema>;
