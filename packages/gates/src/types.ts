// SPDX-License-Identifier: Apache-2.0
import type { Page, ResolvedConfig } from '@nema/core';
import type { ContentModel } from '@nema/schema';
import type { GitState } from './git-state.js';

export type Severity = 'error' | 'warning';

export interface Diagnostic {
  /** Stable rule id (e.g. `frontmatter-required`, `freshness`). Also the key for `nema explain`. */
  rule: string;
  severity: Severity;
  /** Page route path (or file) the diagnostic concerns. */
  path: string;
  message: string;
  /**
   * Short, actionable remediation ("how to fix this"), rendered inline as a
   * `help:` line. Populated from the rule catalog during {@link runGates} unless
   * a rule sets a more specific hint itself.
   */
  hint?: string;
}

export interface GateContext {
  pages: Page[];
  config: ResolvedConfig;
  /** SSOT content model driving frontmatter checks. */
  model: ContentModel;
  /** "Now", as a UTC `YYYY-MM-DD` string — injectable for deterministic tests. */
  today: string;
  /**
   * Optional git facts for the `migration` review-method check. Absent ⇒ that
   * check is skipped, so the rule stays inert in non-git / in-process contexts.
   */
  gitState?: GitState;
}

/** A gate rule: a pure function from context to diagnostics. */
export type Rule = (ctx: GateContext) => Diagnostic[];

export interface GateResult {
  diagnostics: Diagnostic[];
  errorCount: number;
  warningCount: number;
  ok: boolean;
  /** Number of pages the gates ran over. Zero is surfaced as an `empty-corpus` warning. */
  checked: number;
}
