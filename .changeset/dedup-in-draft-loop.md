---
"@getnema/producer": minor
"@getnema/mcp": minor
"@getnema/cli": minor
---

Surface near-duplicates at draft time, not just via a separate check.

`draftPage` now returns `similar` — the existing pages a new draft most closely resembles (TF-IDF
similarity ≥ 0.4), most similar first. The near-duplicate *gate* only warns on one side of a pair
and at a stricter threshold, so an agent could miss that its fresh page duplicates an existing one;
the draft result now tells it directly. `draft_page` (MCP) includes `similar` in its
structuredContent and prose, and `nema draft` prints the heads-up — so "update the existing page
instead of writing a duplicate" reaches the author the moment they write, without a separate
`find_similar` call.
