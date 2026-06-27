# create-nema

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
