---
"@getnema/gates": minor
"@getnema/producer": minor
"@getnema/mcp": minor
"@getnema/cli": minor
---

Coherence: a propose-time pre-check and rename-aware diagnostics.

- **Pre-flight at propose time.** `nema open-pr` and the `propose_changes` MCP tool now run a
  best-effort coherence pre-check first: if another open `nema/draft/*` branch is already authoring
  a page you changed, they print a non-blocking warning (with the colliding page) so the
  `slot-collision` is caught *before* the PR rather than at merge. Single-agent repos (no other
  draft branches) are unaffected and pay no cost. New export: `precheckProposeCoherence` in
  `@getnema/producer`.
- **Rename-aware merge diagnostics.** When one branch *moves* a page (delete old route + add the
  same content at a new route) and another branch still links the old route, the `merge-coherence`
  error now reads `… '/old' was renamed to '/new' on <branch>; update the link` instead of a bare
  dead link. `mergeCorpora` returns the detected `renames`.
