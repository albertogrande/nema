---
"@getnema/core": minor
"@getnema/mcp": minor
---

Surface provenance on the consumption surfaces.

Adds `provenanceView()` / `provenanceHeaders()` (and the `ProvenanceView` type) to core: a flat,
machine-readable view of a page's trust metadata (authored_by, model, reviewer, status, freshness).
The docs `.md` route now returns ASCII-safe `X-Nema-*` provenance headers plus a `Link: …?meta`
pointer, and an opt-in `?meta` (or `Accept: application/json`) variant returns the full structured
record — all without changing the Markdown body, so `.md`/`get_page` parity holds. The MCP server
gains a `get_provenance` tool that returns the same view, kept separate from `get_page` so the prose
stays byte-identical.
