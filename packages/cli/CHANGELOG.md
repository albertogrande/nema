# nema

## 0.2.1

### Patch Changes

- Updated dependencies [6f6253f]
  - @getnema/gates@0.2.1
  - @getnema/mcp@0.2.1
  - @getnema/producer@0.2.1

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
- Updated dependencies [2027945]
- Updated dependencies [2027945]
  - @getnema/gates@0.2.0
  - @getnema/producer@0.2.0
  - @getnema/mcp@0.2.0

## 0.1.2

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

- cbb1759: Make a freshly-scaffolded repo pass the product's own `nema doctor`, and give a scaffolded user's
  agent the rails it was missing:

  - `nema doctor`'s CI-scope check now recognizes the package-manager indirection (`npm run check`,
    `pnpm check`, `yarn check`) that resolves to `nema check` — so the scaffold's own CI step counts
    as gated instead of warning "pull requests are not gated".
  - `create-nema` now ships the human-approval workflow (`.github/workflows/nema-approve.yml`): on a
    human PR approval it promotes the PR's changed draft pages to `reviewed` via the published
    `nema approve`, commits the promotion under `NEMA_PROMOTE_TOKEN` (so the merge respects branch
    protection), and enables auto-merge. This wires doctor's "promotion gate" green.
  - `create-nema` now ships an agent contract (`AGENTS.md`, plus a `CLAUDE.md` pointer) describing the
    draft → PR → approve loop and the one invariant: only a human PR approval promotes a page to
    `reviewed`.

- Updated dependencies [2894302]
  - @getnema/producer@0.1.1
  - @getnema/mcp@0.1.2

## 0.1.1

### Patch Changes

- Updated dependencies [b12c39b]
  - @getnema/mcp@0.1.1

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

- 8f3fc5f: Serve the MCP read tools over Streamable HTTP. Adds `createReadOnlyNemaMcpServer` (only the
  corpus read tools — list_pages / get_page / get_provenance / search / check, with no write or git
  surface) and `startHttpServer`, plus `nema mcp --http [--read-only] [--port]` and the
  `NEMA_MCP_PORT` / `NEMA_MCP_READONLY` env switches on the `nema-mcp` bin. A hosted read-only
  endpoint lets remote agents query a published corpus and its provenance without any ability to
  mutate it.
- 9cf5d8c: Add a corpus-wide review trail. New `buildAuditView` in `@getnema/core` flattens every page's
  append-only `provenance.transitions[]` into one sorted, filterable list of lifecycle transitions
  (`{path, to, by, ts, commit?, pr?, method?}`) — a pure projection over the same provenance the gates
  validate, no second source of truth. Surfaced two ways: `nema audit [dir] --actor --status --since
--until [--json]` (corpus-wide "who promoted what, when, in which PR"), and an expandable per-page
  review trail on the `/trust` dashboard. A page's `reviewed_by.method` is attached to its `reviewed`
  transitions, so a `method:'migration'` promotion is visible at a glance — the natural companion to
  the migration-bypass gate.
- 215d8fd: Extend `nema doctor` with governance / operator-config checks, complementing its existing
  environment diagnostics (Node / git / gh / config / content / gates). In the same report it now
  also reports: SSOT content-model validation (new `ContentModelSchema` Zod export from
  `@getnema/schema`, plus cross-reference checks for `reviewedRequires` / `boundary` fields — a malformed
  model is a hard error), a CI-scope check (parses the workflow YAML and flags `nema check` that runs
  only over fixed directories, so PR-changed pages go unvalidated), a promotion-gate check (the
  approval workflow is wired with `NEMA_PROMOTE_TOKEN`), and a best-effort branch-protection check via
  the `gh` CLI (`--skip-network` to skip). These turn "safety is operator-dependent and unverified"
  into checks Nema runs. A non-blocking `doctor` CI job is added.
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

- 84ddb1c: Add optional bearer-token auth to the Streamable HTTP MCP server. When `startHttpServer` is given an
  `authToken` (the `nema mcp --http` command reads it from `$NEMA_MCP_TOKEN`, configurable with
  `--auth-token-env`), every HTTP request must send `Authorization: Bearer <token>`; the token is
  SHA-256 hashed at startup and compared in constant time (`crypto.timingSafeEqual`). `/health` stays
  open, and stdio / dev / intentionally-public modes are unaffected. When no token is set the server
  prints a one-line stderr warning that the corpus is served unauthenticated. This is defense-in-depth
  for exposing a private, provenance-bearing corpus to remote agents — not a substitute for a gateway on
  a hostile network.
- 15c90b7: Finalize the package scope ahead of the first npm release. The engine and adapters now publish under
  the `@getnema/*` org scope, the CLI is the unscoped `nema` package (so `npx nema check ./docs`
  works), and the scaffolder is `create-nema` (so `npm create nema` works). The `@nema/*` names were
  always placeholders. No behavior change — package names, dependency references, and imports only.
- Updated dependencies [f4fd409]
- Updated dependencies [8f3fc5f]
- Updated dependencies [8f3fc5f]
- Updated dependencies [8f3fc5f]
- Updated dependencies [8f3fc5f]
- Updated dependencies [80d8e6e]
- Updated dependencies [8f3fc5f]
- Updated dependencies [8f3fc5f]
- Updated dependencies [84ddb1c]
- Updated dependencies [9cf5d8c]
- Updated dependencies [215d8fd]
- Updated dependencies [77aa159]
- Updated dependencies [8f3fc5f]
- Updated dependencies [15c90b7]
- Updated dependencies [77aa159]
  - @getnema/gates@0.1.0
  - @getnema/mcp@0.1.0
  - @getnema/core@0.1.0
  - @getnema/producer@0.1.0
  - @getnema/schema@0.1.0
  - @getnema/provenance@0.1.0
