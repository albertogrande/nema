// SPDX-License-Identifier: Apache-2.0
import { isValidISODate } from '@getnema/schema';
import type { Diagnostic, GateContext } from '../types.js';

/** Required fields present, enum values valid, date fields well-formed. */
export function frontmatterRules(ctx: GateContext): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const page of ctx.pages) {
    const fm = page.frontmatter;

    for (const key of ctx.model.required) {
      const v = fm[key];
      if (v == null || v === '') {
        out.push({
          rule: 'frontmatter-required',
          severity: 'error',
          path: page.path,
          message: `missing required frontmatter key '${key}'`,
        });
      }
    }

    for (const [key, allowed] of Object.entries(ctx.model.enums)) {
      const v = fm[key];
      if (v != null && !allowed.includes(String(v))) {
        out.push({
          rule: 'enums-valid',
          severity: 'error',
          path: page.path,
          message: `'${key}=${String(v)}' is not one of [${allowed.join(', ')}]`,
        });
      }
    }

    for (const key of ctx.model.dates) {
      const v = fm[key];
      if (v != null && !isValidISODate(String(v))) {
        out.push({
          rule: 'dates-valid',
          severity: 'error',
          path: page.path,
          message: `${key} '${String(v)}' is not a valid YYYY-MM-DD date`,
        });
      }
    }
  }
  return out;
}
