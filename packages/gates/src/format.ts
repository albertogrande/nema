// SPDX-License-Identifier: Apache-2.0
import type { GateResult } from './types.js';

/** Render a gate result as a plain-text report (for the CLI / CI logs). */
export function formatGateResult(result: GateResult): string {
  if (result.diagnostics.length === 0) return '✓ nema check: all gates passed';

  const lines = result.diagnostics.map((d) => {
    const mark = d.severity === 'error' ? '✗' : '⚠';
    return `  ${mark} [${d.rule}] ${d.path}: ${d.message}`;
  });
  const summary = `${result.errorCount} error(s), ${result.warningCount} warning(s)`;
  return [`nema check — ${summary}`, ...lines].join('\n');
}
