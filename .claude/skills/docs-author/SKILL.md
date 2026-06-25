---
name: docs-author
description: Author a Forge documentation page end-to-end through the producer loop — draft with seeded provenance, self-check against the gates, and open a PR. Use when creating or substantially revising a docs page in a Forge repo.
---

# docs-author

Author a documentation page the Forge way: structured, provenance-tracked, human-gated.

## Procedure

1. **Scope** the page: its path, its diataxis genre (tutorial / how-to / reference / explanation
   / overview), and its parent (what links to it).
2. **Gather sources** as structured records — each `{ id, title, url, kind, retrieved }`. Prefer
   primary sources. You will reference these by `id`.
3. **Draft** with the `draft_page` MCP tool (or `forge draft --path <p>`). Provide:
   - frontmatter: `title`, `status: draft`, `diataxis`.
   - body in Markdown; cite with footnotes `[^id]` and a `## Sources` section.
   - The tool seeds the `provenance` block — fill `model` and `sources` accurately.
4. **Self-check**: run the `check` tool / `forge check`. Fix every diagnostic. Common ones:
   - undefined or unused footnotes → align `[^id]` refs with `## Sources`.
   - unresolved links/anchors → fix the target.
   - orphan → link the new page from its parent.
5. **Propose**: `propose_changes` / `forge open-pr` with a clear title and summary. This opens a
   `forge/draft/*` PR with a `Forge-Provenance` commit trailer.

## Never

- Never set `status: reviewed` or author a `reviewed` provenance transition. A human approves the
  PR; an Action performs the promotion. Your job ends at a green draft PR.

## Provenance block shape

```yaml
provenance:
  schema: 1
  authored_by: ai            # ai | human | mixed
  model: { name: <model-id>, vendor: <vendor>, prompt_ref: .claude/skills/docs-author/SKILL.md@<sha> }
  sources:
    - { id: src-x, title: "…", url: https://…, kind: primary, retrieved: <YYYY-MM-DD> }
  transitions:
    - { to: draft, by: ai, ts: <iso8601>, commit: <sha> }
```
