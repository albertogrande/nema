# create-nema

## 0.3.1

### Patch Changes

- ac44cba: Scaffold no longer hands new users an old CLI. The generated `package.json` pinned
  `@getnema/cli` at `^0.1.0`, which caps at the `0.1.x` line — so a freshly scaffolded
  repo silently installed an old CLI and never saw `generate`, `claim`, `release`, or
  `coherence`. The CLI is published ahead of the engine packages, so it now pins `^0.3.0`
  while `core`/`schema`/`adapter-fumadocs` stay `^0.1.0` (their real current line). Both
  the minimal and `--app` templates now read their `@getnema/*` ranges from a single
  `NEMA_DEP_VERSIONS` map so the two can't drift apart, and a scaffold test pins the CLI
  floor at 0.3.

  The scaffolded `AGENTS.md` now also reminds agents to **restart their session after
  `claude mcp add`** — MCP clients bind tools at session start, so a running agent won't
  see the Nema tools until it restarts (or falls back to the equivalent CLI verbs).

- 2dcd5ee: Bump the scaffold's `@getnema/*` pins to the versions this release publishes
  (`cli ^0.4.0`, `core`/`schema ^0.2.0`) so a clean-env `npx create-nema` installs
  the current line instead of an older one. A caret range on a `0.x` version pins
  the _minor_, so the previous `^0.3.0`/`^0.1.0` pins would have capped new users
  below the 0.4/0.2 release.

  The `scaffold.test.ts` guard now reads the live workspace versions and fails CI
  if any pin would cap below what ships — so a stale pin can no longer reach npm.

## 0.3.0

### Minor Changes

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

## 0.2.0

### Minor Changes

- b12c39b: Phase 0 day-1 experience: `create-nema --app` scaffolds a rendering Fumadocs app (Next.js) on the
  published packages, so a stranger goes `npx create-nema my-docs --app` → `npm install` → `npm run dev`
  → a badged, rendered page with no source build. The MCP registration hint now uses
  `npx -y @getnema/cli` (the package that actually publishes). The MCP `draft_page` tool rejects an empty
  body, matching the CLI guard, so the write-path behaves identically across CLI and MCP.

## 0.1.0

### Minor Changes

- 8f3fc5f: Add `create-nema` — `npm create nema my-docs` scaffolds a new Nema-governed docs repo:
  `nema.config.ts`, a starter `docs/index.md`, a `package.json` wired to `nema`, a
  `nema check` CI workflow (the gate that enforces the no-self-promotion invariant), and a README
  explaining the producer loop and MCP setup.

### Patch Changes

- 15c90b7: Finalize the package scope ahead of the first npm release. The engine and adapters now publish under
  the `@getnema/*` org scope, the CLI is the unscoped `nema` package (so `npx nema check ./docs`
  works), and the scaffolder is `create-nema` (so `npm create nema` works). The `@nema/*` names were
  always placeholders. No behavior change — package names, dependency references, and imports only.
