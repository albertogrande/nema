# @getnema/schema

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
