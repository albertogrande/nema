# @getnema/mcp

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
- 84ddb1c: Add optional bearer-token auth to the Streamable HTTP MCP server. When `startHttpServer` is given an
  `authToken` (the `nema mcp --http` command reads it from `$NEMA_MCP_TOKEN`, configurable with
  `--auth-token-env`), every HTTP request must send `Authorization: Bearer <token>`; the token is
  SHA-256 hashed at startup and compared in constant time (`crypto.timingSafeEqual`). `/health` stays
  open, and stdio / dev / intentionally-public modes are unaffected. When no token is set the server
  prints a one-line stderr warning that the corpus is served unauthenticated. This is defense-in-depth
  for exposing a private, provenance-bearing corpus to remote agents — not a substitute for a gateway on
  a hostile network.
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
