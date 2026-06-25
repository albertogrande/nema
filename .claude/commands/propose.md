---
description: Open a Nema draft PR for the current page(s) — branch, provenance-trailer commit, push, and PR.
---

Propose the current draft changes as a PR through the Nema producer loop.

Optional title / summary: $ARGUMENTS

Steps:
1. Confirm `nema check` is green. If not, fix diagnostics first (or hand back to the writer).
2. Use the `propose_changes` MCP tool (or run `nema open-pr`) to:
   - create a `nema/draft/<slug>-<sha>` branch,
   - commit with a `Nema-Provenance:` trailer,
   - push and open a PR labeled `nema:draft`.
3. Report the PR URL.

Do NOT approve or merge. A human reviews and approves; the approval Action performs the
`draft → reviewed` promotion.
