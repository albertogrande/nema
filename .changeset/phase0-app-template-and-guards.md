---
"create-nema": minor
"@getnema/mcp": patch
---

Phase 0 day-1 experience: `create-nema --app` scaffolds a rendering Fumadocs app (Next.js) on the
published packages, so a stranger goes `npx create-nema my-docs --app` → `npm install` → `npm run dev`
→ a badged, rendered page with no source build. The MCP registration hint now uses
`npx -y @getnema/cli` (the package that actually publishes). The MCP `draft_page` tool rejects an empty
body, matching the CLI guard, so the write-path behaves identically across CLI and MCP.
