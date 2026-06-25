---
description: Draft a new Nema docs page (status:draft + seeded provenance) and self-check it against the gates.
---

Draft a new documentation page through the Nema producer loop.

Topic / brief: $ARGUMENTS

Steps:
1. Decide the page path and diataxis genre, and which existing page will link to it.
2. Gather structured sources (`id, title, url, kind, retrieved`).
3. Use the `draft_page` MCP tool (or run `nema draft`) to write the page with `status: draft`
   and a complete `provenance` block (`authored_by: ai`, your `model`, the `sources`).
4. Run `nema check` (or the `check` tool) and fix every diagnostic.

Do NOT promote to `reviewed` — that is the human approval gate. Stop at a green draft and report
the path plus any remaining decisions for the human.
