---
"@getnema/core": patch
"@getnema/schema": patch
"@getnema/provenance": patch
"@getnema/gates": patch
"@getnema/producer": patch
"@getnema/mcp": patch
"@getnema/adapter-kit": patch
"@getnema/adapter-fumadocs": patch
"nema": patch
"create-nema": patch
---

Finalize the package scope ahead of the first npm release. The engine and adapters now publish under
the `@getnema/*` org scope, the CLI is the unscoped `nema` package (so `npx nema check ./docs`
works), and the scaffolder is `create-nema` (so `npm create nema` works). The `@nema/*` names were
always placeholders. No behavior change — package names, dependency references, and imports only.
