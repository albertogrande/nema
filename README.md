<!-- SPDX-License-Identifier: Apache-2.0 -->

# Nema

> **Alpha — source-only.** Clone and build it (`pnpm install && pnpm build`); not yet published
> to npm. APIs are unstable and may change before 0.1.0. Feedback and issues very welcome.

**Nema is an open-source, AI-native documentation platform** where agents are the primary
producers and consumers of content and **humans are the approval gate**. Docs-as-product:
structured, versioned, provenance-tracked, in plain Markdown, in your own repo.

The market has solved letting an agent *read* your docs. Nema is the open, self-hostable
pipeline that makes agent-*written* docs **safe to ship**: structured + provenance-tracked +
human-gated. That trust/governance layer is the point.

**→ [Quickstart: your existing docs, governed in 10 minutes](QUICKSTART.md)**
&nbsp;·&nbsp; **[Live demo](https://getnema.vercel.app/docs)** ([trust dashboard](https://getnema.vercel.app/trust))

## The producer loop

```
1. An agent drafts a page through the MCP write-tools (status: draft, seeded provenance).
2. It opens a PR on a nema/draft/* branch with a Nema-Provenance commit trailer.
3. CI runs `nema check` — all gates pass; a PR may not self-promote to `reviewed`.
4. A human approves the PR in GitHub.  ← the approval gate
5. An Action runs `nema approve`: flips draft→reviewed, stamps freshness dates,
   appends a provenance transition, and merges.
```

The result is a documentation page whose entire authorship chain — *AI-authored → which model
→ which sources → which human reviewer → timestamps and commits* — is recorded as queryable,
git-diffable data.

## Onboarding existing docs

Already have a Markdown docs repo? `nema migrate` seeds `status` + an honest human-authored
`provenance` block on every page (keeping existing status and freshness dates), then runs the
gates so you can see what needs attention:

```bash
nema migrate ./my-docs --dry-run     # preview
nema migrate ./my-docs               # write provenance + report remaining gate issues
```

## Architecture

A pnpm + Turborepo monorepo. The engine is **renderer-agnostic**: the moat packages
(`schema, core, provenance, gates, producer, mcp`) read content files directly and never import
a renderer. Only `adapter-fumadocs` and `apps/docs` touch React/Next.

| Package | Responsibility |
|---|---|
| [`@nema/schema`](packages/schema) | SSOT content model + Zod + provenance shapes |
| [`@nema/core`](packages/core) | load / getPage / search (BM25) / renderMarkdown / nav |
| [`@nema/provenance`](packages/provenance) | read / merge / recordTransition / verify |
| [`@nema/gates`](packages/gates) | validation rules behind `nema check` |
| [`@nema/producer`](packages/producer) | draft → branch → PR → approve → state-flip |
| [`@nema/mcp`](packages/mcp) | MCP server: read tools + write tools |
| [`@nema/cli`](packages/cli) | the `nema` binary |
| [`@nema/adapter-kit`](packages/adapter-kit) | core↔adapter contract + conformance suite |
| [`@nema/adapter-fumadocs`](packages/adapter-fumadocs) | reference renderer (Next/React) |
| [`@nema/actions`](packages/actions) | composite GitHub Actions |

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
