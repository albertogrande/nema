---
"@docforge/mcp": minor
"@docforge/cli": minor
---

Serve the MCP read tools over Streamable HTTP. Adds `createReadOnlyForgeMcpServer` (only the
corpus read tools — list_pages / get_page / get_provenance / search / check, with no write or git
surface) and `startHttpServer`, plus `forge mcp --http [--read-only] [--port]` and the
`FORGE_MCP_PORT` / `FORGE_MCP_READONLY` env switches on the `docforge-mcp` bin. A hosted read-only
endpoint lets remote agents query a published corpus and its provenance without any ability to
mutate it.
