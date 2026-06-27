---
"@getnema/cli": patch
"@getnema/producer": patch
---

Fix three first-hour producer-loop footguns:

- `nema open-pr` now catches an unready repo (no git, no commits, no `origin` remote, or a missing/
  unauthenticated `gh`) and prints an actionable `help:` hint instead of a raw stack trace, matching
  the gate diagnostics' teaching style.
- `nema open-pr` no longer dies with "nothing to commit, working tree clean" when the draft is
  already committed — the producer engine detects the clean index and carries the existing HEAD onto
  the PR branch instead of attempting an empty commit.
- `nema draft` without `--model-name` now writes `authored_by: human` (a human is drafting from the
  CLI) so the page passes the `provenance-consistency` gate. `authored_by: ai` is recorded only when
  model info is supplied.
