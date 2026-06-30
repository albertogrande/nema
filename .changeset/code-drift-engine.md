---
"@getnema/drift": minor
"@getnema/schema": minor
"@getnema/core": minor
"@getnema/gates": minor
"@getnema/producer": minor
"@getnema/mcp": minor
"@getnema/cli": minor
"@getnema/actions": patch
---

Code-drift engine — docs that stay honest about the code they document.

A page can now declare the source code it documents in a frontmatter `code:` block (a list of
bindings, each pointing at a source file and optionally specific exported symbols). Nema
fingerprints that code's **public surface** — the `symbols` strategy ignores implementation-body
edits and reformatting, so only a changed signature, a removed export, or a deleted source counts as
drift (a `file` strategy hashes whole non-code files).

- **New `@getnema/drift` package** — symbol/signature extraction (shared with `nema generate`),
  fingerprint strategies, and `detectDrift` over a corpus.
- **`nema drift [dir] [--json] [--strict]`** — report pages whose bound code moved past its reviewed
  baseline; `--strict` exits non-zero for CI.
- **`nema bind <path> <source> [--symbols] [--strategy]`** — bind a page and stamp a baseline;
  re-binding the same id+source refreshes it.
- **`code-drift` gate** — surfaces drift inside `nema check` as a **warning** (never a build break),
  with `nema explain code-drift`.
- **`drift` MCP tool** — returns the structured drift report so an agent can find and re-draft
  stale pages. Exposed on the read-only server too.
- **Approval re-stamps the baseline** — `nema approve` (and the approval Action) stamp the current
  code fingerprint when a human promotes a page, exactly as they stamp the freshness dates. Agents
  never stamp a reviewed baseline.
- **`codeRoot` config** — the root that `code:` bindings resolve against (default the repo root).
- **`nema generate` seeds a binding** — when the source entry file lives under `codeRoot`
  (docs-beside-code), the generated API reference page is bound to it with a stamped baseline, so
  generated docs are drift-tracked from birth. Cross-repo generates emit no binding.

Run `pnpm demo:drift` for the self-verifying end-to-end walkthrough.
