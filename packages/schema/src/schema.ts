// SPDX-License-Identifier: Apache-2.0
import { z } from 'zod';
import { isoDate } from './dates.js';
import { CONTENT_MODEL, type ContentModel } from './model.js';
import { ProvenanceSchema } from './provenance.js';

/**
 * Build the frontmatter validation schema from the SSOT content model. The
 * model — not this code — is the single source of truth for enums, required
 * fields, date fields, and cross-field boundaries.
 *
 * `title` is always a non-empty string; every `enums` key becomes a Zod enum;
 * every `dates` field becomes a validated `YYYY-MM-DD`; `provenance` is the
 * provenance block. Fields not in `required` are optional. Unknown keys pass
 * through (renderers/profiles may add their own).
 */
export function buildFrontmatterSchema(model: ContentModel = CONTENT_MODEL) {
  const required = new Set(model.required);
  const shape: Record<string, z.ZodTypeAny> = {};

  shape.title = z.string().min(1);

  for (const [key, values] of Object.entries(model.enums)) {
    if (values.length === 0) continue;
    shape[key] = z.enum(values as [string, ...string[]]);
  }

  for (const key of model.dates) {
    shape[key] = isoDate;
  }

  shape.provenance = ProvenanceSchema;

  for (const key of Object.keys(shape)) {
    if (!required.has(key)) {
      shape[key] = (shape[key] as z.ZodTypeAny).optional();
    }
  }

  return z
    .object(shape)
    .passthrough()
    .superRefine((data, ctx) => {
      const record = data as Record<string, unknown>;

      // status=reviewed requires the freshness fields.
      if (record.status === 'reviewed') {
        for (const key of model.reviewedRequires) {
          if (record[key] == null) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [key],
              message: `status=reviewed requires '${key}'`,
            });
          }
        }
      }

      // Cross-field boundary invariants.
      for (const rule of model.boundary) {
        const lhs = record[rule.when.field];
        const rhs = record[rule.require.field];
        if (lhs === rule.when.equals && rhs != null && !rule.require.in.includes(String(rhs))) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [rule.require.field],
            message:
              `${rule.require.field}='${String(rhs)}' is inconsistent with ` +
              `${rule.when.field}='${rule.when.equals}' (allowed: ${rule.require.in.join(', ')})`,
          });
        }
      }
    });
}

/** The default frontmatter schema, built from the bundled content model. */
export const FrontmatterSchema = buildFrontmatterSchema();
export type Frontmatter = z.infer<typeof FrontmatterSchema>;
