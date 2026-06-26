# @getnema/core

## 0.1.0

### Minor Changes

- 8f3fc5f: Cache the content source and memoize the search index. `contentSourceFromConfig` now caches by
  config + a corpus mtime/size signature, so repeated loads of an unchanged corpus reuse the parsed
  pages and BM25 index (any file change invalidates automatically, so reads still see writes). Search
  is split into `buildSearchIndex` + `searchIndex` — a source builds its index once and reuses it
  across queries. The MCP read path and the gates no longer re-parse the whole corpus on every call.
- 8f3fc5f: Make the content model configurable per deployment. `nema.config.*` may now supply a
  `contentModel` (required fields, enums, dates); it flows through `resolveConfig` into
  `ResolvedConfig.contentModel`, and the gates honor it (`createGateContext` resolves
  `opts.model ?? config.contentModel ??` the bundled SSOT). The agent-may-only-draft invariant
  stays hardcoded and is unaffected.
- 8f3fc5f: Add `buildLlmsIndex()` / `buildLlmsFull()` (and `LlmsOptions`) to generate `llms.txt` and
  `llms-full.txt` from a content source. The index lists every page with its canonical `.md` URL
  annotated with status/author/review state; the full file concatenates every page body
  front-stamped with a provenance comment. The docs app serves these at `/llms.txt` and
  `/llms-full.txt`.
- 9cf5d8c: Add a corpus-wide review trail. New `buildAuditView` in `@getnema/core` flattens every page's
  append-only `provenance.transitions[]` into one sorted, filterable list of lifecycle transitions
  (`{path, to, by, ts, commit?, pr?, method?}`) — a pure projection over the same provenance the gates
  validate, no second source of truth. Surfaced two ways: `nema audit [dir] --actor --status --since
--until [--json]` (corpus-wide "who promoted what, when, in which PR"), and an expandable per-page
  review trail on the `/trust` dashboard. A page's `reviewed_by.method` is attached to its `reviewed`
  transitions, so a `method:'migration'` promotion is visible at a glance — the natural companion to
  the migration-bypass gate.
- 8f3fc5f: Surface provenance on the consumption surfaces.

  Adds `provenanceView()` / `provenanceHeaders()` (and the `ProvenanceView` type) to core: a flat,
  machine-readable view of a page's trust metadata (authored_by, model, reviewer, status, freshness).
  The docs `.md` route now returns ASCII-safe `X-Nema-*` provenance headers plus a `Link: …?meta`
  pointer, and an opt-in `?meta` (or `Accept: application/json`) variant returns the full structured
  record — all without changing the Markdown body, so `.md`/`get_page` parity holds. The MCP server
  gains a `get_provenance` tool that returns the same view, kept separate from `get_page` so the prose
  stays byte-identical.

- 77aa159: Rebrand `docforge` → **Nema**.

  The npm scope becomes `@getnema/*`, the CLI binary becomes `nema` (e.g. `nema check`,
  `nema draft`, `nema approve`), the MCP binary becomes `nema-mcp`, and the config file is
  now `nema.config.{ts,js,mjs,json}`. The commit-trailer key is `Nema-Provenance`, the draft
  PR label is `nema:draft`, and the `FORGE_ROOT` env var is now `NEMA_ROOT`. Internal types
  `ForgeConfig`/`ForgeHost`/`ForgeTools`/`ForgeMcpServer` are renamed to the `Nema*` prefix.

  No behavioral change — this is a pure rename. The enterprise license ref
  (`LicenseRef-Forge-EE-Placeholder`) and the live GitHub repo URLs are intentionally left
  untouched (they track the GitHub-side repo/org move, which is a separate manual step).

### Patch Changes

- 15c90b7: Finalize the package scope ahead of the first npm release. The engine and adapters now publish under
  the `@getnema/*` org scope, the CLI is the unscoped `nema` package (so `npx nema check ./docs`
  works), and the scaffolder is `create-nema` (so `npm create nema` works). The `@nema/*` names were
  always placeholders. No behavior change — package names, dependency references, and imports only.
- Updated dependencies [215d8fd]
- Updated dependencies [77aa159]
- Updated dependencies [15c90b7]
- Updated dependencies [77aa159]
  - @getnema/schema@0.1.0
