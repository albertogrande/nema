---
title: The producer loop
status: reviewed
diataxis: explanation
provenance:
  schema: 1
  authored_by: ai
  model:
    name: Claude Fable 5
    vendor: anthropic
    prompt_ref: .claude/skills/docs-author/SKILL.md@56d2810
  sources:
    - id: contract
      title: CLAUDE.md — the agent contract
      url: https://github.com/albertogrande/nema/blob/main/CLAUDE.md
      kind: reference
      retrieved: 2026-07-11
  transitions:
    - to: draft
      by: ai
      ts: 2026-07-11T14:42:52.134Z
    - to: reviewed
      by: albertogrande
      ts: 2026-07-12T06:38:08.738Z
      commit: b0b8b8279cbff1b2310c5e6b837f23bce95a380b
      pr: 92
  reviewed_by:
    login: albertogrande
    method: maintainer-command
    pr: 92
last_reviewed: 2026-07-12
review_by: 2027-01-08
---

Every page on this site is written through the same loop: an agent authors, the gates check,
and a human approves. The loop is the write path for the whole corpus — there is no other way
content ships.[^contract]

## The five steps

1. **Draft** — an agent creates or updates a page with the `draft_page` / `update_page` MCP
   tools (or `nema draft` on the CLI). The page lands with `status: draft` and a seeded
   `provenance` block, and the gates run in-process so the agent can self-correct immediately.
2. **Check** — `nema check` validates the corpus against [every gate](gates.md): frontmatter,
   links, citations, reachability, provenance consistency, and more. Each diagnostic carries a
   fix hint. Green-before-PR is the norm.
3. **Propose** — `nema open-pr` (or the `propose_changes` tool) creates a `nema/draft/<slug>`
   branch, commits with a `Nema-Provenance:` trailer, pushes, and opens a PR labeled
   `nema:draft`.
4. **A human approves** the PR in GitHub. This is the gate. Not the agent.
5. **Promote** — the approval Action runs `nema approve`, which flips `draft → reviewed`,
   stamps freshness dates, appends a `reviewed` transition, and merges.

## The one invariant

An agent may move a page `stub → draft` or `draft → draft`. **Every promotion to `reviewed`
requires a human PR approval.** The invariant is enforced in three places:

- the `draft-pages-not-reviewed` gate fails any PR that self-promotes,
- the `update_page` tool refuses to write `status: reviewed`,
- there is no promote tool on the MCP surface at all.

## Updating an existing page

`draft → draft` edits are always allowed: an agent revises a draft, re-runs `nema check`, and
the PR review happens once, at the end. Editing a `reviewed` page means re-drafting it — the
page drops back to `draft` and earns its `reviewed` status again through a human approval.

See [Getting Started](getting-started.md) to run the loop yourself, or
[Provenance](provenance.md) for what gets recorded at each step.

## Sources

[^contract]: The agent contract (CLAUDE.md) — https://github.com/albertogrande/nema/blob/main/CLAUDE.md
