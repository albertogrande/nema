# @getnema/schema

## 0.2.0

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

## 0.1.0

### Minor Changes

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

- 15c90b7: Finalize the package scope ahead of the first npm release. The engine and adapters now publish under
  the `@getnema/*` org scope, the CLI is the unscoped `nema` package (so `npx nema check ./docs`
  works), and the scaffolder is `create-nema` (so `npm create nema` works). The `@nema/*` names were
  always placeholders. No behavior change — package names, dependency references, and imports only.
