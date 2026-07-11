---
title: Configuration
status: draft
diataxis: reference
provenance:
  schema: 1
  authored_by: ai
  model:
    name: Claude Fable 5
    vendor: anthropic
    prompt_ref: .claude/skills/docs-author/SKILL.md@56d2810
  sources:
    - id: types
      title: packages/core/src/types.ts — NemaConfig
      url: https://github.com/albertogrande/nema/blob/main/packages/core/src/types.ts
      kind: reference
      retrieved: '2026-07-11'
  transitions:
    - to: draft
      by: ai
      ts: 2026-07-11T14:43:45.218Z
---

A Nema repo is configured by one file at its root: `nema.config.ts`. Every key is optional —
the defaults are the common case.[^types]

```ts
import type { NemaConfig } from '@getnema/core';

const config: NemaConfig = {
  contentDir: 'docs',
  reviewSlaDays: 180,
};

export default config;
```

## Keys

| Key | Default | What it does |
| --- | --- | --- |
| `contentDir` | `docs` | Directory holding `.md` content, relative to the repo root |
| `codeRoot` | `.` | Root that `code:` bindings resolve their `source` paths against — see [Docs from code](docs-from-code.md) |
| `reviewSlaDays` | `180` | Freshness SLA: how far ahead `review_by` is set when a page is approved |
| `rootExempt` | `['index']` | Pages exempt from the `reachability` (orphan) gate |
| `baseUrl` | — | Site base URL, used by adapters |
| `contentModel` | bundled SSOT | Custom content model: required frontmatter fields, enums, date fields |
| `nav` | path-derived tree | Explicit navigation — a `NavNode[]` tree, or a builder `(pages) => NavNode[]` |

## How the pieces read it

- The CLI and the [gates](gates.md) resolve the config from the repo root (`--dir` overrides).
- `reviewSlaDays` drives the `freshness` gate: a reviewed page fails once `review_by` passes.
- `nav` feeds the renderer — this site's sidebar is the default path-derived tree.
- `contentModel` replaces the bundled frontmatter rules when your corpus needs different
  required fields or enums; the gates validate against whichever model is active.

This site's own config is exactly the snippet above — the dogfood corpus runs on defaults.

## Sources

[^types]: `NemaConfig` (packages/core/src/types.ts) — https://github.com/albertogrande/nema/blob/main/packages/core/src/types.ts
