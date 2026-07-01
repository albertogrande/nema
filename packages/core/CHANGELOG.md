# @getnema/core

## 0.2.0

### Minor Changes

- e33dec3: Authoring intelligence — near-duplicate detection so agents write a page that
  _fits_ instead of re-documenting a topic that already has one.

  - **`@getnema/core` similarity engine** — TF-IDF cosine over the corpus
    (`findSimilar`, `findSimilarToText`, `nearDuplicates`), reusing the same linear
    tokenizer as search. Similarity weights rare, topic-defining vocabulary and
    ignores common filler.
  - **`near-duplicate` gate** — `nema check` warns (never fails) when two pages
    exceed a similarity threshold, with `nema explain near-duplicate`. Tuned for
    precision: real corpora of distinct pages sit well below it.
  - **`nema similar <path>` / `nema similar --query "<text>"`** — see what already
    covers a topic before drafting (`--json`, `--limit`, `--min-score`).
  - **`find_similar` MCP tool** — the same check for agents, returning ranked hits
    as structured content. Exposed on the read-only server too.

- 0841274: Code-drift engine — docs that stay honest about the code they document.

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

### Patch Changes

- Updated dependencies [0841274]
  - @getnema/schema@0.2.0

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
