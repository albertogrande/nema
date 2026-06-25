// SPDX-License-Identifier: Apache-2.0
import type { Page, ResolvedConfig } from '@nema/core';
import type { ContentModel } from '@nema/schema';

export type Severity = 'error' | 'warning';

export interface Diagnostic {
  /** Stable rule id (e.g. `frontmatter-required`, `freshness`). */
  rule: string;
  severity: Severity;
  /** Page route path (or file) the diagnostic concerns. */
  path: string;
  message: string;
}

export interface GateContext {
  pages: Page[];
  config: ResolvedConfig;
  /** SSOT content model driving frontmatter checks. */
  model: ContentModel;
  /** "Now", as a UTC `YYYY-MM-DD` string — injectable for deterministic tests. */
  today: string;
}

/** A gate rule: a pure function from context to diagnostics. */
export type Rule = (ctx: GateContext) => Diagnostic[];

export interface GateResult {
  diagnostics: Diagnostic[];
  errorCount: number;
  warningCount: number;
  ok: boolean;
}
