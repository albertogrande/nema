# @getnema/actions

## 0.1.5

### Patch Changes

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

- Updated dependencies [e33dec3]
- Updated dependencies [0841274]
- Updated dependencies [045020b]
- Updated dependencies [cf8644c]
  - @getnema/core@0.2.0
  - @getnema/gates@0.4.0
  - @getnema/schema@0.2.0
  - @getnema/producer@0.4.0
  - @getnema/provenance@0.1.1

## 0.1.4

### Patch Changes

- Updated dependencies [178d8a9]
  - @getnema/gates@0.3.0
  - @getnema/producer@0.3.0

## 0.1.3

### Patch Changes

- Updated dependencies [6f6253f]
  - @getnema/gates@0.2.1
  - @getnema/producer@0.2.1

## 0.1.2

### Patch Changes

- Updated dependencies [f013a04]
- Updated dependencies [2027945]
- Updated dependencies [2027945]
  - @getnema/gates@0.2.0
  - @getnema/producer@0.2.0

## 0.1.1

### Patch Changes

- Updated dependencies [2894302]
  - @getnema/producer@0.1.1

## 0.1.0

### Minor Changes

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

- 8f3fc5f: Harden the approval gate: merge promotions through branch protection instead of `gh pr merge --admin`.

  Adds `NemaHost.merge(pr, opts)` — built on a pure `ghMergeArgs` helper that never emits `--admin` —
  and switches the approval Action to a `GitHubHost` with auto-merge. The promotion commit is pushed
  under a dedicated `NEMA_PROMOTE_TOKEN` so it re-triggers CI, then GitHub auto-merge completes the
  squash merge once the required checks pass. A page now reaches `reviewed` only when both a human
  approval and a green promotion build are present — no admin override, no weakened branch protection.

- Updated dependencies [f4fd409]
- Updated dependencies [8f3fc5f]
- Updated dependencies [8f3fc5f]
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
  - @getnema/producer@0.1.0
  - @getnema/schema@0.1.0
  - @getnema/provenance@0.1.0
