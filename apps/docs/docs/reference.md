---
title: Reference
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
    - id: apache2
      title: Apache License 2.0
      url: https://www.apache.org/licenses/LICENSE-2.0
      kind: primary
      retrieved: 2024-01-02
---

The moving parts, by name. Start from a task-shaped page if you have a task — this hub is for
looking things up.

## The surfaces

- **[CLI reference](cli.md)** — every `nema` command, grouped by job: set up, author, check,
  ship, trust, scale.
- **[Use it with your agent (MCP)](mcp.md)** — the MCP server, its read and write tools, and
  what is deliberately missing from that surface.
- **[Configuration](configuration.md)** — every `nema.config.ts` key and its default.

## The model

- **[Gates](gates.md)** — every rule `nema check` enforces, what fails vs. what warns, and the
  merge-time gates.
- **[Provenance](provenance.md)** — the block that records who wrote a page, from what, and
  who vouched for it.
- **[The producer loop](producer-loop.md)** — how a page travels from draft to reviewed, and
  the one invariant on that path.

## License

Nema is licensed under Apache-2.0.[^apache2] The engine packages are renderer-agnostic; only
the adapter and this site touch React.

## Sources

[^apache2]: Apache License 2.0 — https://www.apache.org/licenses/LICENSE-2.0
