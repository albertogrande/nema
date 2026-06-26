---
"@getnema/schema": minor
"@getnema/core": minor
"@getnema/gates": minor
"@getnema/provenance": minor
"@getnema/producer": minor
"@getnema/mcp": minor
"nema": minor
"@getnema/actions": minor
"@getnema/adapter-kit": minor
"@getnema/adapter-fumadocs": minor
---

Rebrand `docforge` → **Nema**.

The npm scope becomes `@getnema/*`, the CLI binary becomes `nema` (e.g. `nema check`,
`nema draft`, `nema approve`), the MCP binary becomes `nema-mcp`, and the config file is
now `nema.config.{ts,js,mjs,json}`. The commit-trailer key is `Nema-Provenance`, the draft
PR label is `nema:draft`, and the `FORGE_ROOT` env var is now `NEMA_ROOT`. Internal types
`ForgeConfig`/`ForgeHost`/`ForgeTools`/`ForgeMcpServer` are renamed to the `Nema*` prefix.

No behavioral change — this is a pure rename. The enterprise license ref
(`LicenseRef-Forge-EE-Placeholder`) and the live GitHub repo URLs are intentionally left
untouched (they track the GitHub-side repo/org move, which is a separate manual step).
