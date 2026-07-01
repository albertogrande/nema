# @getnema/producer

## 0.4.0

### Minor Changes

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

- 045020b: Surface near-duplicates at draft time, not just via a separate check.

  `draftPage` now returns `similar` — the existing pages a new draft most closely resembles (TF-IDF
  similarity ≥ 0.4), most similar first. The near-duplicate _gate_ only warns on one side of a pair
  and at a stricter threshold, so an agent could miss that its fresh page duplicates an existing one;
  the draft result now tells it directly. `draft_page` (MCP) includes `similar` in its
  structuredContent and prose, and `nema draft` prints the heads-up — so "update the existing page
  instead of writing a duplicate" reaches the author the moment they write, without a separate
  `find_similar` call.

### Patch Changes

- cf8644c: `nema generate`: follow `export *` barrel re-exports when reading a source repo.

  The export extractor previously read only the _direct_ exports of the entry file, so a
  package whose entry is a pure re-export barrel (`export * from './x.js'` — the common
  monorepo shape) yielded an empty API reference table. `generate` now resolves and follows
  star re-exports (with bounded depth and cycle protection), flattening the real exports into
  the table; `export * as ns from './x'` is kept as a single namespace export. Named
  re-exports (`export { A } from './x'`) already worked.

- Updated dependencies [e33dec3]
- Updated dependencies [0841274]
- Updated dependencies [86b3e8f]
  - @getnema/core@0.2.0
  - @getnema/gates@0.4.0
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

### Patch Changes

- Updated dependencies [178d8a9]
  - @getnema/gates@0.3.0

## 0.2.1

### Patch Changes

- Updated dependencies [6f6253f]
  - @getnema/gates@0.2.1

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

- 2027945: Add multi-agent concurrent authoring — page-level slot leasing.

  Branch isolation already lets agents author _different_ pages without clobbering (each
  `propose_changes` lands on its own branch). The remaining clobber — two agents writing the
  _same_ page at once — is now prevented by a lease:

  - `@getnema/producer` ships the lease primitive (`acquireLease`/`releaseLease`/`readLease`):
    a tracked file under `.nema/leases/<path>.lease`, acquired with an atomic `O_EXCL` create
    so racing agents resolve to one winner with no coordination server. Leases expire (a dead
    agent never strands a page).
  - `@getnema/mcp` exposes `claim_slot` / `release_slot` tools and adds an optional `agent` id
    to `draft_page` / `update_page`; when set, a write to a page another agent holds is refused.
    The single-agent path stays lease-free and backward-compatible.
  - `@getnema/cli` adds `nema claim <path> --agent <id>` and `nema release <path> --agent <id>`
    for a two-terminal demonstration of the moat.

- 2027945: Add `nema generate <source-repo>` — docs-from-code, on rails.

  `generate` is a deterministic scaffolder: it ingests a source repo (package metadata,
  README intro, and the exported symbols of the entry file), plans a small diátaxis doc set
  (overview + getting-started + API reference), and writes seeded `draft` pages whose bodies
  are a factual skeleton extracted from the code — an export table, install snippet, section
  stubs — with provenance pointing at the real source files. It never writes prose: the
  explanatory text is left to the user's own agent, which fills the skeleton through the
  existing draft loop. The generated corpus is gate-green out of the box (`nema check`).

  With `--model-name`, pages are seeded `authored_by: ai`; without it, `authored_by: human`
  (a human ran the scaffolder; the agent that fills the prose stamps itself later).

### Patch Changes

- Updated dependencies [f013a04]
  - @getnema/gates@0.2.0

## 0.1.1

### Patch Changes

- 2894302: Fix three first-hour producer-loop footguns:

  - `nema open-pr` now catches an unready repo (no git, no commits, no `origin` remote, or a missing/
    unauthenticated `gh`) and prints an actionable `help:` hint instead of a raw stack trace, matching
    the gate diagnostics' teaching style.
  - `nema open-pr` no longer dies with "nothing to commit, working tree clean" when the draft is
    already committed — the producer engine detects the clean index and carries the existing HEAD onto
    the PR branch instead of attempting an empty commit.
  - `nema draft` without `--model-name` now writes `authored_by: human` (a human is drafting from the
    CLI) so the page passes the `provenance-consistency` gate. `authored_by: ai` is recorded only when
    model info is supplied.

## 0.1.0

### Minor Changes

- 8f3fc5f: Add a GitLab `NemaHost`. `GitLabHost` creates and merges merge requests via the `glab` CLI
  (`glabMrCreateArgs` / `glabMergeArgs`, which — like the GitHub builders — never force-merge past
  failing checks; `auto` maps to merge-when-pipeline-succeeds). The producer engine needs no changes
  to support it, proving the host abstraction is nema-agnostic.
- 8f3fc5f: Harden the approval gate: merge promotions through branch protection instead of `gh pr merge --admin`.

  Adds `NemaHost.merge(pr, opts)` — built on a pure `ghMergeArgs` helper that never emits `--admin` —
  and switches the approval Action to a `GitHubHost` with auto-merge. The promotion commit is pushed
  under a dedicated `NEMA_PROMOTE_TOKEN` so it re-triggers CI, then GitHub auto-merge completes the
  squash merge once the required checks pass. A page now reaches `reviewed` only when both a human
  approval and a green promotion build are present — no admin override, no weakened branch protection.

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
- Updated dependencies [f4fd409]
- Updated dependencies [8f3fc5f]
- Updated dependencies [8f3fc5f]
- Updated dependencies [80d8e6e]
- Updated dependencies [8f3fc5f]
- Updated dependencies [9cf5d8c]
- Updated dependencies [215d8fd]
- Updated dependencies [77aa159]
- Updated dependencies [8f3fc5f]
- Updated dependencies [15c90b7]
- Updated dependencies [77aa159]
  - @getnema/gates@0.1.0
  - @getnema/core@0.1.0
  - @getnema/schema@0.1.0
  - @getnema/provenance@0.1.0
