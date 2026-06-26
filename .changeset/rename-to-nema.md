---
"@getnema/schema": major
"@getnema/core": major
"@getnema/gates": major
"@getnema/provenance": major
"@getnema/producer": major
"@getnema/mcp": major
"nema": major
"@getnema/actions": major
"@getnema/adapter-kit": major
"@getnema/adapter-fumadocs": major
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
