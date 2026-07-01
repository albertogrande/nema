---
"create-nema": patch
---

Scaffold no longer hands new users an old CLI. The generated `package.json` pinned
`@getnema/cli` at `^0.1.0`, which caps at the `0.1.x` line — so a freshly scaffolded
repo silently installed an old CLI and never saw `generate`, `claim`, `release`, or
`coherence`. The CLI is published ahead of the engine packages, so it now pins `^0.3.0`
while `core`/`schema`/`adapter-fumadocs` stay `^0.1.0` (their real current line). Both
the minimal and `--app` templates now read their `@getnema/*` ranges from a single
`NEMA_DEP_VERSIONS` map so the two can't drift apart, and a scaffold test pins the CLI
floor at 0.3.

The scaffolded `AGENTS.md` now also reminds agents to **restart their session after
`claude mcp add`** — MCP clients bind tools at session start, so a running agent won't
see the Nema tools until it restarts (or falls back to the equivalent CLI verbs).
