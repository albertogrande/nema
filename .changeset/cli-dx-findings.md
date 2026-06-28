---
"@getnema/cli": patch
---

Fix five DX findings from the `nema-demo` pass:

- `nema init <dir>` now scaffolds a target directory that doesn't exist yet (`mkdir -p` before the
  first write) instead of crashing with a raw `ENOENT ... nema.config.ts` from `writeFileSync`.
- `nema coherence --json` now emits a parseable JSON document on every path — including the no-op
  cases (no draft branches, too few corpora) and the not-a-git-repo error — so agents orchestrating
  merges can branch on `ok`/`diagnostics` instead of pattern-matching a human string.
- `nema coherence` outside a git repository now teaches in the house style
  (`coherence could not run: ... help: ...`) instead of leaking a raw `git for-each-ref` failure
  and an internal `dist/` stack trace.
- `nema --version` (and every `--help` header) now reports the real package version sourced from
  `package.json`, not the stale hardcoded `0.1.0`.
- `nema prov <dir>` now treats a directory positional as a repo to list — matching the positional
  semantics of `audit`/`check`/`migrate`/`doctor` — instead of failing with `No page found`.
