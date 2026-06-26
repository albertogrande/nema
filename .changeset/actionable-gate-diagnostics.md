---
"@getnema/gates": minor
"nema": minor
"@getnema/mcp": minor
---

Make `nema check` actionable and machine-readable — for humans and agents.

Gate failures are now teaching moments. A new rule catalog (`RULE_CATALOG` in `@getnema/gates`) is
the single source of truth for every gate's title, one-line fix hint, and long-form explanation.
`runGates` enriches each `Diagnostic` with its `hint`, and the text report renders it as a
rustc/cargo-style `help:` line plus a "run `nema explain <rule>`" footer.

- **`nema check --json`** emits a stable, machine-readable report (`gateReport()` / `GateReportJson`):
  `{ ok, checked, errorCount, warningCount, diagnostics: [{ rule, severity, path, message, hint }] }`
  — for CI tooling and agents.
- **`nema explain <rule>`** prints what a gate checks and how to fix it (à la `rustc --explain`),
  suggests the closest rule on a typo, and lists every rule when given no argument.
- **`nema doctor`** preflights the environment and repo (Node, git, gh + auth, config, content
  directory, gate summary) with a fix hint on every non-green check.
- **MCP `check` and `draft_page`** now return MCP `structuredContent` (the same diagnostics and
  fix hints) alongside the text, so an agent can act on the exact rule/path/hint instead of parsing
  prose.
- **`nema check` no longer reports a false green** on a missing or empty content directory — it
  surfaces an `empty-corpus` warning and always prints the number of pages checked.
- Fixed a stale-brand string in the MCP draft feedback ("forge check" → "nema check").

`Diagnostic` gains an optional `hint`; `GateResult` gains `checked` (the number of pages scanned).
