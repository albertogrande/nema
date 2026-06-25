<!-- SPDX-License-Identifier: Apache-2.0 -->

# Forge

> **Name is a placeholder.** Working scope `@docforge/*`, CLI binary `forge`. The real
> name will be chosen (npm + GitHub org + domain checked) before the first publish.

**Forge is an open-source, AI-native documentation platform** where agents are the primary
producers and consumers of content and **humans are the approval gate**. Docs-as-product:
structured, versioned, provenance-tracked, in plain Markdown, in your own repo.

The market has solved letting an agent *read* your docs. Forge is the open, self-hostable
pipeline that makes agent-*written* docs **safe to ship**: structured + provenance-tracked +
human-gated. That trust/governance layer is the point.

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

## Architecture

A pnpm + Turborepo monorepo. The engine is **renderer-agnostic**: the moat packages
(`schema, core, provenance, gates, producer, mcp`) read content files directly and never import
a renderer. Only `adapter-fumadocs` and `apps/docs` touch React/Next.

| Package | Responsibility |
|---|---|
| [`@docforge/schema`](packages/schema) | SSOT content model + Zod + provenance shapes |
| [`@docforge/core`](packages/core) | load / getPage / search (BM25) / renderMarkdown / nav |
| [`@docforge/provenance`](packages/provenance) | read / merge / recordTransition / verify |
| [`@docforge/gates`](packages/gates) | validation rules behind `forge check` |
| [`@docforge/producer`](packages/producer) | draft → branch → PR → approve → state-flip |
| [`@docforge/mcp`](packages/mcp) | MCP server: read tools + write tools |
| [`@docforge/cli`](packages/cli) | the `forge` binary |
| [`@docforge/adapter-kit`](packages/adapter-kit) | core↔adapter contract + conformance suite |
| [`@docforge/adapter-fumadocs`](packages/adapter-fumadocs) | reference renderer (Next/React) |
| [`@docforge/actions`](packages/actions) | composite GitHub Actions |

## Status

**v0.1 — pre-release, under active construction.** See [the build plan](sharded-roaming-valiant.md).

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm check     # lint + typecheck + test + build
```

Requires Node 22+ and pnpm 9+.

## License

[Apache-2.0](LICENSE). The whole engine is open source. The reserved [`ee/`](ee) directory is
out of scope for the core license and reserved for a future source-available commercial tier.

Contributions are accepted under the [Developer Certificate of Origin](CONTRIBUTING.md) — sign
your commits with `git commit -s`.
