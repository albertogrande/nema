// SPDX-License-Identifier: Apache-2.0
import { type CodeBinding, CodeBindingsSchema } from '@getnema/schema';
import { fingerprintBinding } from './fingerprint.js';

/** The minimal page shape drift needs — `@getnema/core`'s `Page` satisfies it. */
export interface DriftPage {
  path: string;
  status: string;
  frontmatter: Record<string, unknown>;
}

/** Why a binding is flagged. Only `actionable` reasons mean "the docs are now behind the code". */
export type DriftReason =
  | 'changed' // bound code's surface changed since the reviewed baseline
  | 'missing-source' // the bound source file no longer exists
  | 'missing-symbols' // a tracked symbol is no longer exported
  | 'no-baseline' // bound, but no reviewed baseline to compare against yet
  | 'invalid-binding'; // the `code:` block did not parse

export type DriftFinding = {
  path: string;
  bindingId: string;
  source: string;
  strategy: string;
  reason: DriftReason;
  /** True for reasons that represent real doc/code divergence (not just info). */
  actionable: boolean;
  /** The reviewed baseline fingerprint, when one exists. */
  baseline?: string;
  /** The freshly computed fingerprint, when the source exists. */
  current?: string;
  /** Symbol names involved (for `missing-symbols`). */
  symbols?: string[];
  message: string;
};

export type DriftReport = {
  findings: DriftFinding[];
  /** Pages that carry at least one `code:` binding. */
  checked: number;
  /** Pages with at least one actionable finding. */
  drifted: number;
};

/**
 * Parse a page's frontmatter `code:` block into validated bindings. Returns the
 * bindings (empty when there is no block) and an `error` string when a present
 * block fails to validate.
 */
export function readCodeBindings(frontmatter: Record<string, unknown>): {
  bindings: CodeBinding[];
  error?: string;
} {
  const raw = frontmatter.code;
  if (raw == null) return { bindings: [] };
  const parsed = CodeBindingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { bindings: [], error: parsed.error.issues[0]?.message ?? 'invalid code binding' };
  }
  return { bindings: parsed.data };
}

/** Detect drift for a single page. Empty array ⇒ the page's bindings are all current. */
export function detectPageDrift(page: DriftPage, codeRoot: string): DriftFinding[] {
  const { bindings, error } = readCodeBindings(page.frontmatter);
  if (error) {
    return [
      {
        path: page.path,
        bindingId: '(code)',
        source: '',
        strategy: '',
        reason: 'invalid-binding',
        actionable: true,
        message: `invalid \`code:\` block — ${error}`,
      },
    ];
  }

  const out: DriftFinding[] = [];
  for (const binding of bindings) {
    const fp = fingerprintBinding(binding, codeRoot);
    const base = {
      path: page.path,
      bindingId: binding.id,
      source: binding.source,
      strategy: fp.strategy,
    };

    if (fp.missing) {
      out.push({
        ...base,
        reason: 'missing-source',
        actionable: true,
        baseline: binding.fingerprint,
        message: `bound source not found: ${binding.source}`,
      });
      continue;
    }
    if (fp.missingSymbols.length > 0) {
      out.push({
        ...base,
        reason: 'missing-symbols',
        actionable: true,
        baseline: binding.fingerprint,
        current: fp.fingerprint ?? undefined,
        symbols: fp.missingSymbols,
        message: `no longer exported by ${binding.source}: ${fp.missingSymbols.join(', ')}`,
      });
      // missing symbols also change the fingerprint; don't double-report as `changed`.
      continue;
    }
    if (!binding.fingerprint) {
      out.push({
        ...base,
        reason: 'no-baseline',
        actionable: false,
        current: fp.fingerprint ?? undefined,
        message: 'no reviewed baseline yet — stamp one with `nema bind` or on approval',
      });
      continue;
    }
    if (fp.fingerprint !== binding.fingerprint) {
      out.push({
        ...base,
        reason: 'changed',
        actionable: true,
        baseline: binding.fingerprint,
        current: fp.fingerprint ?? undefined,
        message: `${binding.source} changed since last review — page may be out of date`,
      });
    }
  }
  return out;
}

/** Detect drift across a corpus. */
export function detectDrift(pages: DriftPage[], codeRoot: string): DriftReport {
  const findings: DriftFinding[] = [];
  let checked = 0;
  const driftedPaths = new Set<string>();

  for (const page of pages) {
    if (page.frontmatter.code == null) continue;
    checked++;
    for (const f of detectPageDrift(page, codeRoot)) {
      findings.push(f);
      if (f.actionable) driftedPaths.add(f.path);
    }
  }
  return { findings, checked, drifted: driftedPaths.size };
}

/**
 * Return a copy of `bindings` with each baseline re-stamped to the current
 * source fingerprint and `fingerprinted_at` set to `today`. Bindings whose
 * source is missing keep their prior baseline (we can't fingerprint nothing).
 * This is what `nema bind` and the approval flip call — never an agent flipping
 * a page to `reviewed`.
 */
export function stampBindings(
  bindings: CodeBinding[],
  codeRoot: string,
  today: string,
): CodeBinding[] {
  return bindings.map((binding) => {
    const fp = fingerprintBinding(binding, codeRoot);
    if (fp.missing || fp.fingerprint == null) return binding;
    return { ...binding, fingerprint: fp.fingerprint, fingerprinted_at: today };
  });
}
