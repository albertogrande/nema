---
title: Provenance
status: draft
diataxis: explanation
provenance:
  schema: 1
  authored_by: ai
  model:
    name: Claude Fable 5
    vendor: anthropic
    prompt_ref: .claude/skills/docs-author/SKILL.md@56d2810
  sources:
    - id: schema
      title: packages/schema/src/provenance.ts — provenance schema
      url: https://github.com/albertogrande/nema/blob/main/packages/schema/src/provenance.ts
      kind: reference
      retrieved: 2026-07-11
  transitions:
    - to: draft
      by: ai
      ts: 2026-07-11T14:43:24.484Z
    - to: reviewed
      by: albertogrande
      ts: 2026-07-12T06:38:08.739Z
      commit: b0b8b8279cbff1b2310c5e6b837f23bce95a380b
      pr: 92
    - to: draft
      by: ai
      ts: 2026-07-12T07:05:00.000Z
---

Every page carries a `provenance` block in its frontmatter: who authored it, with which model,
from which sources, and who signed off. It is structured, git-diffable data — not a free-text
footnote — and the `provenance-consistency` gate validates it on every check.[^schema]

## The block

```yaml
provenance:
  authored_by: ai            # ai | human | mixed
  model:
    name: <model id>         # required whenever authored_by is not human
    vendor: <vendor>
    prompt_ref: <skill/prompt reference>
  sources:
    - id: quickstart
      title: QUICKSTART.md
      url: https://github.com/albertogrande/nema/blob/main/QUICKSTART.md
      kind: primary          # primary | secondary | reference
      retrieved: 2026-07-11
  transitions:
    - { to: draft, by: ai, ts: 2026-07-11T10:00:00Z, commit: abc1234 }
    - { to: reviewed, by: alice, ts: 2026-07-12T09:00:00Z, pr: 42 }
```

- **`authored_by`** — `ai`, `human`, or `mixed`. AI authorship requires `model.name`.
- **`sources`** — structured citations. Every `sources[].id` must be referenced in the body as
  a `[^id]` footnote, and vice versa.
- **`transitions`** — the lifecycle trail. A `reviewed` page must have a `reviewed` transition
  and a `reviewed_by` record; only the approval Actions write those. The `reviewed_by.method`
  says how the human gate was recorded: `github-pr-approval` (a review approval),
  `maintainer-command` (an explicit `/nema approve` comment by a maintainer — the solo path), or
  `migration` (a human asserting an imported corpus).

## Reading the trail

- The `/trust` dashboard renders the whole corpus's provenance live: status, author,
  model, reviewer, and the transition history per page.
- `nema prov <path>` prints one page's chain; `nema prov --filter authored_by=ai` or
  `--status reviewed` filters the corpus.
- `nema audit` lists every lifecycle transition across all pages, filterable by `--actor`,
  `--status`, `--since`, and `--until` — the review trail as one table.

## Why it matters

When an agent wrote the page, "trust me" is not an answer. Provenance makes trust checkable:
anyone can see that a human approved the exact bytes on the page, and every claim's backing
source is recorded next to the content it supports. The [producer loop](producer-loop.md)
writes this record; nothing else does.

## Sources

[^schema]: Provenance schema (packages/schema) — https://github.com/albertogrande/nema/blob/main/packages/schema/src/provenance.ts
