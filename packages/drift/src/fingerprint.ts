// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CodeBinding, FingerprintStrategy } from '@getnema/schema';
import { extractExports, symbolSignature } from './symbols.js';

/** Bump when the fingerprint algorithm changes, so old baselines re-stamp on review. */
const FINGERPRINT_VERSION = 'v1';

const CODE_FILE_RE = /\.[mc]?[jt]sx?$/;

/** The strategy a binding resolves to: explicit, else inferred from the source extension. */
export function resolveStrategy(binding: CodeBinding): FingerprintStrategy {
  if (binding.strategy) return binding.strategy;
  return CODE_FILE_RE.test(binding.source) ? 'symbols' : 'file';
}

export interface BindingFingerprint {
  /** `sha256:…`, or `null` when the source is missing. */
  fingerprint: string | null;
  strategy: FingerprintStrategy;
  /** True when the bound source file does not exist under `codeRoot`. */
  missing: boolean;
  /** Symbol names that were requested via `symbols:` but not found among the exports. */
  missingSymbols: string[];
  /** Symbol names actually folded into the fingerprint. */
  trackedSymbols: string[];
}

function sha256(s: string): string {
  return `sha256:${createHash('sha256').update(s).digest('hex')}`;
}

/** Normalize file content so reformatting (CRLF, trailing spaces) is not drift. */
function normalizeFile(s: string): string {
  return s
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd()) // not `/\s+$/` — keep it linear over file input
    .join('\n')
    .trim();
}

/**
 * Compute the current fingerprint of a binding's source code. Pure read — never
 * writes. Resolves `binding.source` against `codeRoot` (absolute).
 */
export function fingerprintBinding(binding: CodeBinding, codeRoot: string): BindingFingerprint {
  const strategy = resolveStrategy(binding);
  const abs = resolve(codeRoot, binding.source);
  if (!existsSync(abs)) {
    return { fingerprint: null, strategy, missing: true, missingSymbols: [], trackedSymbols: [] };
  }
  const src = readFileSync(abs, 'utf8');

  if (strategy === 'file') {
    return {
      fingerprint: sha256(`${FINGERPRINT_VERSION}\nfile\n${normalizeFile(src)}`),
      strategy,
      missing: false,
      missingSymbols: [],
      trackedSymbols: [],
    };
  }

  // strategy === 'symbols'
  const exported = new Set(extractExports(src).map((e) => e.name));
  const requested =
    binding.symbols && binding.symbols.length > 0 ? binding.symbols : [...exported].sort();
  const missingSymbols = requested.filter((n) => !exported.has(n)).sort();
  const tracked = requested.filter((n) => exported.has(n)).sort();

  const lines = tracked.map((n) => `${n}::${symbolSignature(src, n) ?? n}`);
  return {
    fingerprint: sha256(`${FINGERPRINT_VERSION}\nsymbols\n${lines.join('\n')}`),
    strategy,
    missing: false,
    missingSymbols,
    trackedSymbols: tracked,
  };
}
