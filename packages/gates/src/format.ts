// SPDX-License-Identifier: Apache-2.0
import type { Diagnostic, GateResult } from './types.js';

function pages(n: number): string {
  return `${n} page${n === 1 ? '' : 's'}`;
}

/** Render a gate result as a plain-text report (for the CLI / CI logs). */
export function formatGateResult(result: GateResult, opts: { command?: string } = {}): string {
  const command = opts.command ?? 'nema check';
  if (result.diagnostics.length === 0) {
    return `✓ ${command}: all gates passed (${pages(result.checked)})`;
  }

  const lines: string[] = [];
  for (const d of result.diagnostics) {
    const mark = d.severity === 'error' ? '✗' : '⚠';
    lines.push(`  ${mark} [${d.rule}] ${d.path}: ${d.message}`);
    if (d.hint) lines.push(`      help: ${d.hint}`);
  }

  const summary = `${result.errorCount} error(s), ${result.warningCount} warning(s) · ${pages(
    result.checked,
  )}`;
  return [
    `${command} — ${summary}`,
    ...lines,
    '',
    'Run `nema explain <rule>` for why a gate fires and how to fix it.',
  ].join('\n');
}

/** One diagnostic in the machine-readable report — a stable, documented shape. */
export interface DiagnosticJson {
  rule: string;
  severity: Diagnostic['severity'];
  path: string;
  message: string;
  hint?: string;
}

/** The machine-readable report — a stable shape, decoupled from internal types. */
export interface GateReportJson {
  ok: boolean;
  checked: number;
  errorCount: number;
  warningCount: number;
  diagnostics: DiagnosticJson[];
}

/** The stable object behind `nema check --json` (and the MCP `check` tool's structured output). */
export function gateReport(result: GateResult): GateReportJson {
  return {
    ok: result.ok,
    checked: result.checked,
    errorCount: result.errorCount,
    warningCount: result.warningCount,
    diagnostics: result.diagnostics.map((d) => ({
      rule: d.rule,
      severity: d.severity,
      path: d.path,
      message: d.message,
      ...(d.hint ? { hint: d.hint } : {}),
    })),
  };
}

/** Render a gate result as machine-readable JSON (for CI tooling and agents). */
export function formatGateResultJson(result: GateResult): string {
  return JSON.stringify(gateReport(result), null, 2);
}
