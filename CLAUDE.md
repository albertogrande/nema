<!-- SPDX-License-Identifier: Apache-2.0 -->

# CLAUDE.md — working in the Forge monorepo

Forge is an AI-native documentation platform. **You (an agent) are a primary author of content
in this repo, but you are never the approver.** Read this before drafting or changing docs.

## The one invariant you must never violate

> An agent may only move a page `stub → draft` or `draft → draft`.
> **Every promotion to `reviewed` requires a human PR approval.**

Never hand-edit a page's `status:` to `reviewed`. Never set or backfill a `reviewed` provenance
transition, `reviewed_by`, or `last_reviewed`/`review_by` yourself. The `draft-pages-not-reviewed`
gate and the approval-triggered Action own that transition. A PR that self-promotes will fail CI.

## The producer loop

1. **Draft** via the MCP write-tools (or `forge draft`): writes `path.md` with `status: draft`
   and a seeded `provenance` block, then runs `forge check` in-process so you can self-correct
   *before* opening a PR.
2. **Propose** (`propose_changes` / `forge open-pr`): creates a `forge/draft/<slug>-<sha>` branch,
   commits with a `Forge-Provenance:` trailer, pushes, and opens a PR labeled `forge:draft`.
3. **CI** runs `forge check` — all gates plus `draft-pages-not-reviewed`.
4. **A human approves** the PR in GitHub. ← the gate. Not you.
5. The approval Action runs `forge approve`, which flips `draft → reviewed`, stamps freshness
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

Run `forge check` (or the `check` MCP tool) yourself before proposing. Green-before-PR is the
norm.

## Repo mechanics

- pnpm + Turborepo monorepo, TypeScript ESM-only, `strict`. `pnpm check` = lint + typecheck +
  test + build.
- The engine (`packages/{schema,core,provenance,gates,producer,mcp,cli}`) is renderer-agnostic —
  **never import React/Next there.** Only `adapter-fumadocs` and `apps/docs` may.
- Every source file starts with `// SPDX-License-Identifier: Apache-2.0`.
- Sign commits: `git commit -s`. Conventional Commits. Add a changeset for package-affecting
  changes.
- Do **not** touch `ee/` — reserved, out of scope.
