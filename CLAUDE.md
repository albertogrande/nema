<!-- SPDX-License-Identifier: Apache-2.0 -->

# CLAUDE.md — working in the Nema monorepo

Nema is an AI-native documentation platform. **You (an agent) are a primary author of content
in this repo, but you are never the approver.** Read this before drafting or changing docs.

## The one invariant you must never violate

> An agent may only move a page `stub → draft` or `draft → draft`.
> **Every promotion to `reviewed` requires a human PR approval.**

Never hand-edit a page's `status:` to `reviewed`. Never set or backfill a `reviewed` provenance
transition, `reviewed_by`, or `last_reviewed`/`review_by` yourself. The `draft-pages-not-reviewed`
gate and the approval-triggered Action own that transition. A PR that self-promotes will fail CI.

## The producer loop

1. **Draft** via the MCP write-tools (or `nema draft`): writes `path.md` with `status: draft`
   and a seeded `provenance` block, then runs `nema check` in-process so you can self-correct
   *before* opening a PR.
2. **Propose** (`propose_changes` / `nema open-pr`): creates a `nema/draft/<slug>-<sha>` branch,
   commits with a `Nema-Provenance:` trailer, pushes, and opens a PR labeled `nema:draft`.
3. **CI** runs `nema check` — all gates plus `draft-pages-not-reviewed`.
4. **A human approves** the PR in GitHub. ← the gate. Not you.
5. The approval Action runs `nema approve`, which flips `draft → reviewed`, stamps freshness
   dates, appends a `reviewed` transition, and merges.

## Provenance rules (what you ARE responsible for)

When you author, fill the `provenance` block honestly:

- `authored_by: ai` (or `mixed` if a human co-wrote).
- `model: { name, vendor, prompt_ref }` — your actual model id and the skill/prompt ref.
- `sources` — **structured** entries (`id, title, url, kind, retrieved`), not free-text
  footnotes. Every footnote/citation you make must map to a `sources[].id`.
- A `transitions` entry `{ to: draft, by: ai, ts, commit }` is seeded for you; leave `reviewed`
  transitions to the approval Action.

The `provenance-consistency` gate checks: `reviewed ⇒ reviewed_by + a reviewed transition`;
`authored_by ≠ human ⇒ model.name set`; every `sources[].id` is referenced.

## Content rules the gates enforce

- **Frontmatter**: required fields present, enums valid, dates valid `YYYY-MM-DD`.
- **Freshness**: for `reviewed` pages, `last_reviewed ≤ today < review_by`. Overdue **fails**.
- **Citations**: if you use footnotes, include a `## Sources` section; no dangling/undefined
  footnotes.
- **Links**: internal links and `#anchors` must resolve.
- **Reachability**: non-root pages must be linked from somewhere (no orphans).
- **Code-drift**: a page may bind to the source it documents via a frontmatter `code:` block. When
  that code's public surface moves past the page's reviewed baseline, the `code-drift` gate
  **warns** (never fails) and `nema drift` lists the stale pages. You may add/refresh bindings on a
  draft (`nema bind <path> <source>`) and re-draft from the changed source — but the reviewed
  baseline is re-stamped **only** on human approval, exactly like `reviewed` itself. Never stamp it.

Run `nema check` (or the `check` MCP tool) yourself before proposing. Green-before-PR is the
norm. Every diagnostic carries a `help:` hint; run `nema explain <rule>` for the full fix. The
`check` and `draft_page` MCP tools also return the diagnostics as structured `structuredContent`
(`{ rule, severity, path, message, hint }`), so you can act on the exact failure instead of
parsing text. `nema check --json` gives the same machine-readable report on the CLI.

## Repo mechanics

- pnpm + Turborepo monorepo, TypeScript ESM-only, `strict`. `pnpm check` = lint + typecheck +
  test + build.
- The engine (`packages/{schema,core,provenance,gates,producer,mcp,cli}`) is renderer-agnostic —
  **never import React/Next there.** Only `adapter-fumadocs` and `apps/docs` may.
- Every source file starts with an SPDX Apache-2.0 license header comment.
- Sign commits: `git commit -s`. Conventional Commits. Add a changeset for package-affecting
  changes.
- Do **not** touch `ee/` — reserved, out of scope.
- **After every merge to `main`, run the [`docs-freshness`](.claude/skills/docs-freshness/SKILL.md)
  skill** — the README, QUICKSTART, and `docs/` must stay in sync with the shipped code (we dogfood
  the freshness contract on our own repo). Scope it to the merge delta; never self-promote a page to
  `reviewed`.
- **DX findings from `nema-demo`** land here as `nema:dx-finding` issues. Work them with the
  [`fix-dx-issues`](.claude/skills/fix-dx-issues/SKILL.md) skill: triage → reproduce → fix → PR
  for human approval. (The demo files them; this repo fixes them. Merging is the gate.)
