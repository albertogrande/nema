// SPDX-License-Identifier: Apache-2.0
import { z } from 'zod';
import { isoDate } from './dates.js';

/**
 * How a code binding's fingerprint is computed:
 * - `symbols` — hash the *signatures* of the exported symbols of the bound
 *   source (the public API). Drift fires when the surface changes, not when a
 *   comment moves. The default for `.ts`/`.js` sources.
 * - `file` — hash the whole (normalized) file content. The default for any
 *   other source. Drift fires on any substantive change.
 */
export const FINGERPRINT_STRATEGIES = ['symbols', 'file'] as const;
export type FingerprintStrategy = (typeof FINGERPRINT_STRATEGIES)[number];

/**
 * A binding from a documentation page to the source code it documents. Lives in
 * frontmatter under `code:` as a list. The `fingerprint` is the reviewed
 * baseline — the shape of the bound code at the time a human last approved the
 * page; drift is detected by recomputing it from the current source and
 * comparing. Agents may add/seed bindings on a draft; the baseline is
 * re-stamped only on human approval (like the freshness dates).
 */
export const CodeBindingSchema = z.object({
  /** Stable id, unique within the page (e.g. `cb-server`). */
  id: z.string().min(1),
  /** Repo-relative path to the bound source file (resolved against `codeRoot`). */
  source: z.string().min(1),
  /** Optional subset of exported symbol names to track. Empty/absent ⇒ all exports. */
  symbols: z.array(z.string().min(1)).optional(),
  /** Fingerprint strategy. Absent ⇒ inferred from the source extension. */
  strategy: z.enum(FINGERPRINT_STRATEGIES).optional(),
  /** Reviewed baseline fingerprint (e.g. `sha256:…`). Absent ⇒ no baseline yet. */
  fingerprint: z.string().min(1).optional(),
  /** Date the baseline was stamped. */
  fingerprinted_at: isoDate.optional(),
});
export type CodeBinding = z.infer<typeof CodeBindingSchema>;

/** The frontmatter `code:` block: a list of bindings. */
export const CodeBindingsSchema = z.array(CodeBindingSchema);
