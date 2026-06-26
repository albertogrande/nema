---
"@getnema/core": minor
---

Add `buildLlmsIndex()` / `buildLlmsFull()` (and `LlmsOptions`) to generate `llms.txt` and
`llms-full.txt` from a content source. The index lists every page with its canonical `.md` URL
annotated with status/author/review state; the full file concatenates every page body
front-stamped with a provenance comment. The docs app serves these at `/llms.txt` and
`/llms-full.txt`.
