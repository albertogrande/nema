---
"@getnema/producer": patch
---

`nema generate`: follow `export *` barrel re-exports when reading a source repo.

The export extractor previously read only the *direct* exports of the entry file, so a
package whose entry is a pure re-export barrel (`export * from './x.js'` — the common
monorepo shape) yielded an empty API reference table. `generate` now resolves and follows
star re-exports (with bounded depth and cycle protection), flattening the real exports into
the table; `export * as ns from './x'` is kept as a single namespace export. Named
re-exports (`export { A } from './x'`) already worked.
