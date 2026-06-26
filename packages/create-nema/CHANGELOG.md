# create-nema

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
