---
"@getnema/producer": minor
"@getnema/mcp": minor
"@getnema/cli": minor
---

Add multi-agent concurrent authoring — page-level slot leasing.

Branch isolation already lets agents author *different* pages without clobbering (each
`propose_changes` lands on its own branch). The remaining clobber — two agents writing the
*same* page at once — is now prevented by a lease:

- `@getnema/producer` ships the lease primitive (`acquireLease`/`releaseLease`/`readLease`):
  a tracked file under `.nema/leases/<path>.lease`, acquired with an atomic `O_EXCL` create
  so racing agents resolve to one winner with no coordination server. Leases expire (a dead
  agent never strands a page).
- `@getnema/mcp` exposes `claim_slot` / `release_slot` tools and adds an optional `agent` id
  to `draft_page` / `update_page`; when set, a write to a page another agent holds is refused.
  The single-agent path stays lease-free and backward-compatible.
- `@getnema/cli` adds `nema claim <path> --agent <id>` and `nema release <path> --agent <id>`
  for a two-terminal demonstration of the moat.
