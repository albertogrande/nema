---
"@docforge/schema": minor
"@docforge/gates": minor
"@docforge/producer": minor
"@docforge/cli": minor
---

Add `forge migrate` — import an existing Markdown corpus into the Forge model.

`forge migrate [dir]` seeds `status` + an honest human-authored `provenance` block on
every page that lacks one (inferring the title, keeping any valid existing status, and
preserving existing freshness dates), then runs `forge check` to report what legacy content
still needs attention. Idempotent; supports `--dry-run`, `--status draft|reviewed`,
`--reviewer`, and `--content-dir`.

Adds a `migration` review method to the provenance schema; the `draft-pages-not-reviewed`
gate now accepts a human migration (no PR) as valid evidence for a `reviewed` page, alongside
the standard `github-pr-approval`.
