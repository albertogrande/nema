---
title: Gates
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
    - id: cli
      title: packages/cli — nema CLI v0.4.0 --help output
      url: https://github.com/albertogrande/nema/blob/main/packages/cli
      kind: reference
      retrieved: '2026-07-11'
  transitions:
    - to: draft
      by: ai
      ts: 2026-07-11T14:43:24.893Z
---

`nema check` validates the corpus against every gate and prints one diagnostic per failure,
each with a `help:` hint. `nema check --json` emits the same report as machine-readable JSON,
and the MCP `check` tool returns it as structured content — the same report for a human and
for an agent in a loop.[^cli]

Run `nema explain <rule>` for any rule's full explanation and fix.

## The rules

| Rule | Checks |
| --- | --- |
| `frontmatter-required` | Required frontmatter is present |
| `enums-valid` | Enum fields use an allowed value |
| `dates-valid` | Date fields are well-formed `YYYY-MM-DD` |
| `empty-corpus` | The corpus is not empty |
| `links-resolve` | Internal links resolve |
| `anchors-resolve` | Link `#anchors` resolve |
| `reachability` | Non-root pages are linked from somewhere (no orphans) |
| `footnotes` | Footnotes are balanced — no dangling or undefined refs |
| `citations` | Footnoted pages cite their sources in a `## Sources` section |
| `provenance-consistency` | Provenance is valid and consistent with status |
| `freshness` | Reviewed pages are fresh: `last_reviewed ≤ today < review_by` |
| `draft-pages-not-reviewed` | No self-promotion to `reviewed` |
| `near-duplicate` | Pages are not near-duplicates (**warns**, never fails) |
| `code-drift` | Docs track their bound code (**warns**, never fails) |
| `slot-collision` | No two branches author the same page |
| `merge-coherence` | The merged doc-graph is coherent |

The last two are merge-time gates: `nema coherence` proves that several draft branches merge
into a valid doc-graph before anything lands. See [Multi-agent authoring](multi-agent.md).

## Severity

A **failing** gate blocks: CI rejects the PR until the diagnostic is fixed. A **warning** gate
(`near-duplicate`, `code-drift`) surfaces the finding without blocking — overlap and staleness
are judgment calls, so a human sees them in review instead of a bot enforcing them.

## The workflow

```bash
nema check            # human-readable report, one hint per failure
nema check --json     # the same report for tooling and agents
nema explain <rule>   # what a rule checks and how to fix it
```

Agents run the same gates in-process at draft time — see
[The producer loop](producer-loop.md) — so most diagnostics never reach a PR.

## Sources

[^cli]: `nema check --help` / `nema explain` (CLI v0.4.0) — https://github.com/albertogrande/nema/blob/main/packages/cli
