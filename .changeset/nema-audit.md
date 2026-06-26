---
"@getnema/core": minor
"nema": minor
---

Add a corpus-wide review trail. New `buildAuditView` in `@getnema/core` flattens every page's
append-only `provenance.transitions[]` into one sorted, filterable list of lifecycle transitions
(`{path, to, by, ts, commit?, pr?, method?}`) — a pure projection over the same provenance the gates
validate, no second source of truth. Surfaced two ways: `nema audit [dir] --actor --status --since
--until [--json]` (corpus-wide "who promoted what, when, in which PR"), and an expandable per-page
review trail on the `/trust` dashboard. A page's `reviewed_by.method` is attached to its `reviewed`
transitions, so a `method:'migration'` promotion is visible at a glance — the natural companion to
the migration-bypass gate.
