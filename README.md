<!-- SPDX-License-Identifier: Apache-2.0 -->

# Forge

> **Alpha — source-only.** Clone and build it (`pnpm install && pnpm build`); not yet published
> to npm. The name (`Forge` / `docforge` / the `@docforge/*` package scope) is **provisional** and
> may change before 0.1.0. APIs are unstable. Feedback and issues very welcome.

**Forge is an open-source, AI-native documentation platform** where agents are the primary
producers and consumers of content and **humans are the approval gate**. Docs-as-product:
structured, versioned, provenance-tracked, in plain Markdown, in your own repo.

The market has solved letting an agent *read* your docs. Forge is the open, self-hostable
pipeline that makes agent-*written* docs **safe to ship**: structured + provenance-tracked +
human-gated. That trust/governance layer is the point.

**→ [Quickstart: your existing docs, governed in 10 minutes](QUICKSTART.md)**
&nbsp;·&nbsp; **[Live demo](https://docforge-docs.vercel.app/docs)** ([trust dashboard](https://docforge-docs.vercel.app/trust))

## The producer loop

```
1. An agent drafts a page through the MCP write-tools (status: draft, seeded provenance).
2. It opens a PR on a forge/draft/* branch with a Forge-Provenance commit trailer.
3. CI runs `forge check` — all gates pass; a PR may not self-promote to `reviewed`.
4. A human approves the PR in GitHub.  ← the approval gate
5. An Action runs `forge approve`: flips draft→reviewed, stamps freshness dates,
   appends a provenance transition, and merges.
```

The result is a documentation page whose entire authorship chain — *AI-authored → which model
→ which sources → which human reviewer → timestamps and commits* — is recorded as queryable,
git-diffable data.

## Trust posture

That per-page data rolls up into a **corpus-level trust posture** — the one view that answers "how
much of this content can I trust right now?" `forge trust` (and the [`/trust`
dashboard](https://docforge-docs.vercel.app/trust), which renders the *same* numbers from the same
function) reports it:

```text
docforge — trust posture (42 pages, as of 2026-06-25)

  status       reviewed 31 · draft 9 · stub 1 · deprecated 1
  authored     ai 24 · mixed 6 · human 12 · unknown 0
  reviewed     74%  (31/42)
  ai-authored  71%  (30/42)

  ⚠ ai-authored, not human-reviewed  3      ← the headline governance risk
  ⚠ stale (review_by passed)         2
  review evidence: 31/31 anchored to a commit
```

The score keys off recorded review evidence (a human `reviewed_by` + a `reviewed` transition), **not
the self-asserted `status` string** — so you can't inflate the trust score by hand-editing a page to
`status: reviewed` (and that edit still fails `forge check`). Reviews are reported as *anchored* (the
transition points at a commit) vs *asserted*; resolving those anchors against git history is `forge
audit` (next). Use `forge trust --strict` in CI to fail the build on governance risk.

## Onboarding existing docs

Already have a Markdown docs repo? `forge migrate` seeds `status` + an honest human-authored
`provenance` block on every page (keeping existing status and freshness dates), then runs the
gates so you can see what needs attention:

```bash
forge migrate ./my-docs --dry-run     # preview
forge migrate ./my-docs               # write provenance + report remaining gate issues
```

## Architecture

A pnpm + Turborepo monorepo. The engine is **renderer-agnostic**: the moat packages
(`schema, core, provenance, gates, producer, mcp`) read content files directly and never import
a renderer. Only `adapter-fumadocs` and `apps/docs` touch React/Next.

| Package | Responsibility |
|---|---|
| [`@docforge/schema`](packages/schema) | SSOT content model + Zod + provenance shapes |
| [`@docforge/core`](packages/core) | load / getPage / search (BM25) / renderMarkdown / nav / trust report |
| [`@docforge/provenance`](packages/provenance) | read / merge / recordTransition / verify |
| [`@docforge/gates`](packages/gates) | validation rules behind `forge check` |
| [`@docforge/producer`](packages/producer) | draft → branch → PR → approve → state-flip |
| [`@docforge/mcp`](packages/mcp) | MCP server: read tools + write tools |
| [`@docforge/cli`](packages/cli) | the `forge` binary |
| [`@docforge/adapter-kit`](packages/adapter-kit) | core↔adapter contract + conformance suite |
| [`@docforge/adapter-fumadocs`](packages/adapter-fumadocs) | reference renderer (Next/React) |
| [`@docforge/actions`](packages/actions) | composite GitHub Actions |

## Status

**v0.1 alpha — source-only, not on npm yet.** The engine is feature-complete and green (tests,
lint, typecheck, build); the producer loop runs end to end. Expect breaking changes. See
[the build plan](sharded-roaming-valiant.md).

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm check     # lint + typecheck + test + build
```

Requires Node 22+ and pnpm (the repo pins `pnpm@11` via `packageManager`; Corepack will use it).

## License

[Apache-2.0](LICENSE). The whole engine is open source. The reserved [`ee/`](ee) directory is
out of scope for the core license and reserved for a future source-available commercial tier.

Contributions are accepted under the [Developer Certificate of Origin](CONTRIBUTING.md) — sign
your commits with `git commit -s`.
