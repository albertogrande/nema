// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from 'react';

/** Mono section index + sans heading, the landing page's recurring header pattern. */
export function SectionHeading({
  index,
  label,
  title,
  lede,
}: {
  index: string;
  label: string;
  title?: ReactNode;
  lede?: ReactNode;
}) {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-fd-muted-foreground">
        <span className="text-nema-accent">{index}</span> / {label}
      </p>
      {title ? (
        <h2 className="mt-6 max-w-2xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {title}
        </h2>
      ) : null}
      {lede ? (
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-fd-muted-foreground sm:text-base">
          {lede}
        </p>
      ) : null}
    </div>
  );
}
