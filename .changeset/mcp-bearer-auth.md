---
"@getnema/mcp": minor
"nema": patch
---

Add optional bearer-token auth to the Streamable HTTP MCP server. When `startHttpServer` is given an
`authToken` (the `nema mcp --http` command reads it from `$NEMA_MCP_TOKEN`, configurable with
`--auth-token-env`), every HTTP request must send `Authorization: Bearer <token>`; the token is
SHA-256 hashed at startup and compared in constant time (`crypto.timingSafeEqual`). `/health` stays
open, and stdio / dev / intentionally-public modes are unaffected. When no token is set the server
prints a one-line stderr warning that the corpus is served unauthenticated. This is defense-in-depth
for exposing a private, provenance-bearing corpus to remote agents — not a substitute for a gateway on
a hostile network.
