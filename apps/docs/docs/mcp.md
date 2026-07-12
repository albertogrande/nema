---
title: Use it with your agent (MCP)
status: reviewed
diataxis: how-to
provenance:
  schema: 1
  authored_by: ai
  model:
    name: Claude Fable 5
    vendor: anthropic
    prompt_ref: .claude/skills/docs-author/SKILL.md@56d2810
  sources:
    - id: mcp
      title: packages/mcp — MCP server and tool surface
      url: https://github.com/albertogrande/nema/blob/main/packages/mcp
      kind: reference
      retrieved: 2026-07-11
  transitions:
    - to: draft
      by: ai
      ts: 2026-07-11T14:43:44.519Z
    - to: reviewed
      by: albertogrande
      ts: 2026-07-12T06:38:08.735Z
      commit: b0b8b8279cbff1b2310c5e6b837f23bce95a380b
      pr: 92
    - to: draft
      by: ai
      ts: 2026-07-12T07:05:00.000Z
    - to: reviewed
      by: albertogrande
      ts: 2026-07-12T07:16:06.654Z
      commit: a8c222ae5da04392cfbd69f3eb27dec0d416030b
      pr: 97
  reviewed_by:
    login: albertogrande
    method: maintainer-command
    pr: 97
last_reviewed: 2026-07-12
review_by: 2027-01-08
---

Nema is meant to be run *by* your coding agent. The MCP server exposes the whole authoring
surface — reading, searching, drafting, checking, proposing — to any MCP client: Claude Code,
Cursor, or your own pipeline.[^mcp]

## Register the server

```bash
claude mcp add nema -- npx -y @getnema/cli mcp /path/to/your-docs
```

`nema mcp` speaks stdio by default. For a hosted corpus it can serve Streamable HTTP instead:

```bash
nema mcp --http --port 3001        # bearer auth via the NEMA_MCP_TOKEN env var
nema mcp --http --read-only        # read tools only — no write/git surface
```

## The tool surface

**Read** — safe everywhere:

- `list_pages`, `get_page`, `search` — the corpus, one page's raw Markdown, full-text search.
- `get_provenance` — a page's authorship chain, as structured data.
- `check`, `check_coherence`, `drift` — the [gates](gates.md), merge-time coherence, and
  code-drift reports, all as structured diagnostics.
- `find_similar` — near-duplicate detection before drafting something that already exists.

**Write** — the producer loop:

- `draft_page`, `update_page` — author with seeded provenance; the gates run in-process and
  the result returns as structured diagnostics the agent can act on.
- `claim_slot`, `release_slot` — [multi-agent](multi-agent.md) authoring leases.
- `propose_changes`, `request_review` — open the draft PR and ask for a human.

There is deliberately **no promote tool**: an agent cannot flip a page to `reviewed` over MCP.
`update_page` refuses to write that status, and the `draft-pages-not-reviewed` gate backstops
both in CI. Approval stays a human act on the PR — a review approval, or a maintainer's
`/nema approve` comment — see [The producer loop](producer-loop.md#the-one-invariant).

## The contract

The rules an agent must follow — the loop, the provenance duties, the invariant — live in the
repo's [CLAUDE.md](https://github.com/albertogrande/nema/blob/main/CLAUDE.md), so every agent
that reads the repo reads its contract.

## Sources

[^mcp]: MCP server and tool surface (packages/mcp) — https://github.com/albertogrande/nema/blob/main/packages/mcp
