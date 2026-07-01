# @getnema/gates

## 0.4.0

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

- Updated dependencies [e33dec3]
- Updated dependencies [0841274]
- Updated dependencies [86b3e8f]
  - @getnema/core@0.2.0
  - @getnema/drift@0.2.0
  - @getnema/schema@0.2.0
  - @getnema/provenance@0.1.1

## 0.3.0

### Minor Changes

- 178d8a9: Coherence: a propose-time pre-check and rename-aware diagnostics.

  - **Pre-flight at propose time.** `nema open-pr` and the `propose_changes` MCP tool now run a
    best-effort coherence pre-check first: if another open `nema/draft/*` branch is already authoring
    a page you changed, they print a non-blocking warning (with the colliding page) so the
    `slot-collision` is caught _before_ the PR rather than at merge. Single-agent repos (no other
    draft branches) are unaffected and pay no cost. New export: `precheckProposeCoherence` in
    `@getnema/producer`.
  - **Rename-aware merge diagnostics.** When one branch _moves_ a page (delete old route + add the
    same content at a new route) and another branch still links the old route, the `merge-coherence`
    error now reads `… '/old' was renamed to '/new' on <branch>; update the link` instead of a bare
    dead link. `mergeCorpora` returns the detected `renames`.

## 0.2.1

### Patch Changes

- 6f6253f: `nema coherence`: report only the root-cause collision, not derived cascade noise.

  When two branches collide on a page (`slot-collision`), that page was being dropped from the
  merged graph, which then made the link/reachability pass cry about _every_ page that linked to it
  (dangling link) or was only reachable through it (fresh orphan) — pure cascade. The gate now keeps
  a stand-in (`PageConflict.representative`) for each conflicted page in the graph check, so a
  collision surfaces as a single actionable diagnostic instead of a pile of derived `merge-coherence`
  errors. Genuine cross-branch breakage (a link a branch breaks without a collision) is still reported.

## 0.2.0

### Minor Changes

- f013a04: Add merge-time coherence — the second half of the multi-agent moat.

  Page-level slot leasing stops two _live_ agents clobbering the _same_ page; this closes the
  remaining gap — two _draft branches_ that each pass `nema check` alone but break the corpus when
  merged together.

  - `@getnema/gates` ships `runCoherenceGate(corpora, { base })`: it 3-way merges the contributing
    corpora against a baseline (a real line-level `diff3`, so independent edits to a shared page —
    e.g. two agents each adding a nav link — merge cleanly the way git would) and validates the
    _merged_ doc-graph. It reports `slot-collision` (a page authored on two branches incompatibly)
    and `merge-coherence` (a link or page one branch breaks for another). Both have `nema explain`
    entries.
  - `@getnema/producer` adds corpus loaders: `loadCorpusFromDir`, `loadCorpusAtRef` (via an ephemeral
    `git worktree`, so the live tree is untouched), and `listDraftBranches` to discover the open
    `nema/draft/*` refs that would merge into `main`.
  - `@getnema/cli` adds `nema coherence` — auto-discovers the open draft branches and checks their
    merge into `main`, or takes explicit directories / git refs (`--base`, `--json`).
  - `@getnema/mcp` exposes the `check_coherence` tool so an agent can verify a fleet's branches merge
    cleanly before requesting review.

  `pnpm demo:concurrent` drives the whole moat — leasing + coherence — end to end and is exercised in
  CI.

## 0.1.0

### Minor Changes

- f4fd409: Make `nema check` actionable and machine-readable — for humans and agents.

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

- 8f3fc5f: Make the content model configurable per deployment. `nema.config.*` may now supply a
  `contentModel` (required fields, enums, dates); it flows through `resolveConfig` into
  `ResolvedConfig.contentModel`, and the gates honor it (`createGateContext` resolves
  `opts.model ?? config.contentModel ??` the bundled SSOT). The agent-may-only-draft invariant
  stays hardcoded and is unaffected.
- 80d8e6e: Close the self-asserted `method:'migration'` reviewed bypass. The `draft-pages-not-reviewed` gate
  skipped the PR-evidence requirement for any `reviewed_by.method` other than `github-pr-approval`, so a
  hand-edited page could claim `method:'migration'` and pass as `reviewed` with no approval evidence.

  The gate now takes an injected, git-backed `GitState` (`createFsGitState`): `method:'migration'` is
  trusted only on a genuine first import — a page that already existed at the comparison baseline (the
  PR base branch in CI via `GITHUB_BASE_REF`/`NEMA_BASELINE_REF`, else `HEAD`) without it may not
  acquire it. `nema check` wires this automatically inside a git work tree. The human-approval invariant
  itself is unchanged — only the bypass around it is removed. The rule stays a pure function (the git
  subprocess lives in `git-state-fs.ts`) and is inert when no `GitState` is supplied, so the in-process
  `nema draft` check, non-git contexts, and existing tests behave exactly as before. For full
  enforcement on pull requests, CI must fetch the base branch (e.g. `fetch-depth: 0`); `nema doctor`
  flags when it cannot.

- 77aa159: Add `nema migrate` — import an existing Markdown corpus into the Nema model.

  `nema migrate [dir]` seeds `status` + an honest human-authored `provenance` block on
  every page that lacks one (inferring the title, keeping any valid existing status, and
  preserving existing freshness dates), then runs `nema check` to report what legacy content
  still needs attention. Idempotent; supports `--dry-run`, `--status draft|reviewed`,
  `--reviewer`, and `--content-dir`.

  Adds a `migration` review method to the provenance schema; the `draft-pages-not-reviewed`
  gate now accepts a human migration (no PR) as valid evidence for a `reviewed` page, alongside
  the standard `github-pr-approval`.

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
- Updated dependencies [8f3fc5f]
- Updated dependencies [8f3fc5f]
- Updated dependencies [8f3fc5f]
- Updated dependencies [9cf5d8c]
- Updated dependencies [215d8fd]
- Updated dependencies [77aa159]
- Updated dependencies [8f3fc5f]
- Updated dependencies [15c90b7]
- Updated dependencies [77aa159]
  - @getnema/core@0.1.0
  - @getnema/schema@0.1.0
  - @getnema/provenance@0.1.0
