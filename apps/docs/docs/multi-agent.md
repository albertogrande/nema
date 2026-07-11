---
title: Multi-agent authoring
status: draft
diataxis: how-to
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
      ts: 2026-07-11T14:43:25.590Z
---

Point one agent at a corpus and the [producer loop](producer-loop.md) is enough. Point a fleet
at it and two new failure modes appear: two agents authoring the same page, and branches that
are each valid alone but break the doc-graph when merged. Nema ships a mechanism for
each.[^cli]

## Slot leasing: one author per page

Before authoring, an agent claims the page's slot:

```bash
nema claim guides/errors --agent writer-1 --branch nema/draft/errors
# ... author, check, open the PR ...
nema release guides/errors --agent writer-1
```

- A claim is a lease tied to a stable `--agent` id. While it's held, write tools
  (`draft_page`, `update_page`) refuse the page for any other agent.
- The `slot-collision` gate fails when two branches author the same page anyway.
- Over MCP the same operations are `claim_slot` and `release_slot`.

## Merge-time coherence

Each draft branch can be green in isolation and still collide at merge time — a deleted page
another branch links to, an orphan created by a moved hub, two near-identical new pages.
`nema coherence` proves the *merged* doc-graph is valid before anything lands:

```bash
nema coherence                 # check all draft branches against main
nema coherence --base <ref>    # a different integration baseline
nema coherence --json          # machine-readable, for CI
```

The `merge-coherence` gate runs this in CI, so a fleet of agents can propose in parallel and
the corpus stays a coherent graph — no slot collisions, no merge-broken links or orphans.

## The pattern

1. Each agent claims its slots, authors on its own `nema/draft/*` branch, and self-checks.
2. `nema coherence` validates the branches together.
3. Humans approve each PR — the [one invariant](producer-loop.md#the-one-invariant) is
   per-page, no matter how many agents are writing.

A runnable walkthrough lives in the repo at
[`examples/concurrent`](https://github.com/albertogrande/nema/tree/main/examples/concurrent).

## Sources

[^cli]: `nema claim|release|coherence --help` (CLI v0.4.0) — https://github.com/albertogrande/nema/blob/main/packages/cli
