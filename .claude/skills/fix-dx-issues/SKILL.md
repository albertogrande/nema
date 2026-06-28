---
name: fix-dx-issues
description: Triage and fix DX findings filed by the nema-demo DX pass. Use when asked to "check and fix the DX issues", to work through open `nema:dx-finding` issues, or to act on developer-experience friction reported from the demo repo.
---

# Fix DX issues

The sibling repo `nema-demo` periodically does a **DX pass** — using nema as a fresh user —
and files the friction it finds as issues here, labeled `nema:dx-finding`. This skill
triages and fixes them. **You open PRs; a human approves and merges. That's the gate.**

## Steps

1. **List the work.**
   `gh issue list --label nema:dx-finding --state open --json number,title,body`
   (no label match yet? `gh issue list --state open --search "[DX]"`.)
2. **Triage.** Group related findings; order by severity (🔴 > 🟠 > 🟡). Skip anything
   out of scope (`ee/`).
3. **Reproduce before fixing.** Build the CLI (`pnpm install && pnpm build`) and run the
   issue's repro against `node packages/cli/dist/index.js <…>`. If it no longer reproduces,
   comment that on the issue and close it — don't fix phantoms.
4. **Fix in the right package** — `schema / core / provenance / gates / producer / mcp / cli`,
   or `adapter-*` / `apps` for rendering. Follow `CLAUDE.md`:
   - the engine stays renderer-agnostic — no React/Next outside `adapter-fumadocs` / `apps`;
   - SPDX header on every new source file; ESM-only; `strict`;
   - **never** hand-set `status: reviewed` or backfill a `reviewed` transition.
5. **Verify.** `pnpm check` (lint + typecheck + test + build) and dogfood
   `node packages/cli/dist/index.js check examples/minimal`. Add or extend a test that pins
   the bug. Add a changeset for any package-affecting change.
6. **Open a PR** per fix (or per tight group): branch off `main`, `git commit -s`
   (Conventional Commits), body `Closes #<n>`. Do **not** merge — leave it for human approval.
7. After a fix merges to `main`, run the [`docs-freshness`](../docs-freshness/SKILL.md) skill
   per `CLAUDE.md`.

Keep PRs small and reviewable — one DX finding fixed cleanly beats a sweeping refactor. A
clean merge here is the cue to run the next DX pass in `nema-demo`.
