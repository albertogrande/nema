// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from 'react';

/** Terminal window chrome for the landing-page walkthroughs. */
export function Terminal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-fd-border bg-fd-card shadow-sm">
      <div className="flex items-center justify-between border-b border-fd-border px-4 py-2.5 font-mono text-xs text-fd-muted-foreground">
        <span>{title}</span>
        <span aria-hidden className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-fd-border bg-fd-accent" />
          <span className="h-2.5 w-2.5 rounded-full border border-fd-border bg-fd-accent" />
          <span className="h-2.5 w-2.5 rounded-full border border-fd-border bg-fd-accent" />
        </span>
      </div>
      <div className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed sm:text-sm">
        <div className="min-w-max space-y-1 whitespace-pre">{children}</div>
      </div>
    </div>
  );
}

export function Prompt({ children }: { children: ReactNode }) {
  return (
    <div>
      <span className="select-none text-nema-accent">$ </span>
      <span className="text-fd-foreground">{children}</span>
    </div>
  );
}

export function Out({ children }: { children: ReactNode }) {
  return (
    <div className="text-fd-muted-foreground">
      {'  '}
      {children}
    </div>
  );
}

export function Comment({ children }: { children: ReactNode }) {
  return <div className="pt-5 text-fd-muted-foreground/70 first:pt-0"># {children}</div>;
}

export function Ok() {
  return <span className="text-emerald-600 dark:text-emerald-400">✓</span>;
}
