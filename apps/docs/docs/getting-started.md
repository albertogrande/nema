---
title: Getting Started
status: draft
diataxis: tutorial
provenance:
  schema: 1
  authored_by: ai
  model:
    name: Claude Fable 5
    vendor: anthropic
    prompt_ref: .claude/skills/docs-author/SKILL.md@56d2810
  sources:
    - id: quickstart
      title: QUICKSTART.md — bring an existing repo under Nema
      url: https://github.com/albertogrande/nema/blob/main/QUICKSTART.md
      kind: primary
      retrieved: 2026-07-11
  transitions:
    - to: draft
      by: ai
      ts: 2024-01-02T09:00:00Z
      commit: a1b2c3d
---

From nothing to a rendered, provenance-badged docs site in about five minutes — then your
agent takes over the writing. You need **Node 22+**. No git, no account, no agent required
for the first step.

## 1. Scaffold and run

```bash
npx create-nema my-docs --app
cd my-docs
npm install
npm run dev          # → http://localhost:3000
```

Your docs render with a **pending review** provenance badge on every draft page and a
`/trust` dashboard showing the whole corpus's trust state. Confirm the corpus is valid out of
the box:

```bash
nema check           # → all gates passed
```

## 2. Add a page — your agent does the writing

Authoring is your agent's job, not yours at a terminal. Register the MCP server with your
coding agent (Claude Code shown; the server is [agent-agnostic](mcp.md)):

```bash
claude mcp add nema -- npx -y @getnema/cli mcp .
```

Then ask it, in plain language:

> Draft a "Getting Started" how-to page, link it from the docs index, and run `nema check`.

The agent writes the page with a full [provenance](provenance.md) block, links it into the
corpus, and self-checks against the [gates](gates.md) — fixing whatever they flag. Reload and
the page is there, badged *pending review*.

## 3. Ship it for approval

```bash
nema open-pr         # the first step that needs git, a GitHub remote, and the gh CLI
```

A human approves the PR — the **only** path to `reviewed`. An Action flips
`draft → reviewed`, stamps freshness dates, and merges. That approval gate is the one
invariant of [the producer loop](producer-loop.md).

## Where to next

- **Already have docs?** [Migrate an existing corpus](migrate.md) with `nema migrate`.[^quickstart]
- **Documenting a codebase?** [Generate seeded drafts from its public API](docs-from-code.md).
- **Running several agents?** [Multi-agent authoring](multi-agent.md) keeps them coherent.
- **Everything else** — the [Reference](reference.md).

## Sources

[^quickstart]: QUICKSTART.md — bring an existing repo under Nema — https://github.com/albertogrande/nema/blob/main/QUICKSTART.md
