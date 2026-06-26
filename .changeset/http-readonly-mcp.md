---
"@getnema/mcp": minor
"nema": minor
---

Serve the MCP read tools over Streamable HTTP. Adds `createReadOnlyNemaMcpServer` (only the
corpus read tools — list_pages / get_page / get_provenance / search / check, with no write or git
surface) and `startHttpServer`, plus `nema mcp --http [--read-only] [--port]` and the
`NEMA_MCP_PORT` / `NEMA_MCP_READONLY` env switches on the `nema-mcp` bin. A hosted read-only
endpoint lets remote agents query a published corpus and its provenance without any ability to
mutate it.
