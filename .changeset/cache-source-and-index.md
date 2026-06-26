---
"@getnema/core": minor
---

Cache the content source and memoize the search index. `contentSourceFromConfig` now caches by
config + a corpus mtime/size signature, so repeated loads of an unchanged corpus reuse the parsed
pages and BM25 index (any file change invalidates automatically, so reads still see writes). Search
is split into `buildSearchIndex` + `searchIndex` — a source builds its index once and reuses it
across queries. The MCP read path and the gates no longer re-parse the whole corpus on every call.
