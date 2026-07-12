---
'@getnema/adapter-fumadocs': minor
---

New `docHref(href, pagePath, basePath?)`: map corpus-style relative `.md`
links (with `./`/`../` segments and `#anchors`) to canonical rendered
routes. Page bodies link the way agents read them — relative `.md` paths —
and emitting those verbatim in HTML 404s from the docs index and yields
non-canonical URLs elsewhere. The raw `.md`/MCP surfaces keep the verbatim
links (agent parity); only the human-facing HTML rewrites them.
