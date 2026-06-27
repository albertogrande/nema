---
name: docs-freshness
description: After a merge to main, review the README, QUICKSTART, and docs/ against the code that just landed and flag/fix any drift. Use right after merging a PR to main, or when asked whether the docs still match the shipped code.
---

# docs-freshness

**The norm:** after **every merge to `main`**, the user-facing docs must stay in sync with the code
that just shipped. Stale docs are the exact failure NEMA exists to prevent — we dogfood it on our own
repo. Run this skill after each merge (or wire it into CI; see Activation).

Scope of "the docs": **`README.md`**, **`QUICKSTART.md`**, and **`docs/`** (the rendered site
content). Commands, flags, package names, code snippets, and the "what's shipped vs deferred" claims
must match the merged code.

## Procedure

1. **Get the merge delta.** Diff what just landed:
   `git diff <previous-main>..main --stat` and read the changed source/CLI/MCP files. Focus on
   anything that changes a **public surface**: CLI commands/flags, MCP tools, package names,
   config keys, the producer loop, gate behavior.
2. **Map surface → docs.** For each changed surface, find where the docs describe it:
   - new/changed CLI command or flag → `README.md` + `QUICKSTART.md` command blocks.
   - new/changed MCP tool → the "ongoing loop" / MCP sections.
   - shipped a previously-deferred feature → the "what's shipped vs deferred" notes
     (`README.md`, the build plan) must move it from deferred to shipped.
   - renamed package / changed install → every `npm install` / `npx` snippet.
3. **Verify, don't assume.** Run the documented commands' `--help` (or read the command source) and
   confirm the docs match reality. Every snippet a reader would copy must actually work.
4. **Flag or fix.**
   - **Trivial drift** (a flag name, a snippet, a shipped/deferred flip): fix it directly. If it's a
     `docs/` *page*, go through the producer loop (`draft`/`update_page` → `nema check` → PR) — never
     hand-promote to `reviewed`. README/QUICKSTART are plain repo files; edit + PR normally.
   - **Substantive gap** (a whole feature undocumented, a restructure): open an issue or a draft PR
     and summarize what's missing; don't silently paper over it.
5. **Report.** A short note: what changed in the merge, what docs you touched, what still needs
   attention. If nothing drifted, say so in one line.

## Rules

- **Read-only against truth = the code.** The code that merged is ground truth; the docs conform to
  it, never the reverse.
- **Verify before asserting** a command/snippet is correct — run `--help` or read the source.
- **Never self-promote** a `docs/` page to `reviewed` — that stays a human PR approval.
- Keep it **cheap**: scope to the merge delta, not a full docs re-audit every time.

## Activation (deferred)

- [ ] Wire this into CI: a job on push to `main` that runs the skill and opens a drift PR if the docs
      no longer match the shipped surface. Until then, run it by hand after each merge.
