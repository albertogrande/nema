// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from 'react';

/** A rendered git-diff panel (the provenance "approval is a diff" visual). */
export function DiffBlock({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-fd-border bg-fd-card p-5 font-mono text-[13px] leading-relaxed shadow-sm">
      <div className="min-w-max whitespace-pre">{children}</div>
    </div>
  );
}

export function DiffLine({ kind, children }: { kind?: '+' | '-'; children: ReactNode }) {
  const tone =
    kind === '+'
      ? 'text-emerald-700 dark:text-emerald-400'
      : kind === '-'
        ? 'text-red-600 dark:text-red-400'
        : 'text-fd-muted-foreground';
  return (
    <div className={tone}>
      <span className="select-none">{kind ?? ' '} </span>
      {children}
    </div>
  );
}
