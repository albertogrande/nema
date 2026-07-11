// SPDX-License-Identifier: Apache-2.0
'use client';

import { useState } from 'react';

/** A one-line shell command with a `$` prompt and a copy affordance. */
export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable (permissions, http) — the text is selectable anyway.
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-sm border border-fd-border bg-fd-card px-4 py-3 text-sm">
      <span aria-hidden className="select-none text-[#fb923c]">
        $
      </span>
      <code className="flex-1 overflow-x-auto whitespace-nowrap">{command}</code>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 text-xs text-fd-muted-foreground transition-colors hover:text-fd-foreground"
        aria-label={`Copy command: ${command}`}
      >
        {copied ? '[copied]' : '[copy]'}
      </button>
    </div>
  );
}
