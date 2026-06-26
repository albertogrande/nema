# @getnema/gates

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
