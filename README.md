<!-- SPDX-License-Identifier: Apache-2.0 -->

# Forge

**Let agents write your docs. Keep humans the approval gate.**

Your agents are already writing documentation — faster than anyone can eyeball-review it. Forge
makes that output **safe to ship**: every page records what wrote it, from which sources, and which
human approved it, as queryable, git-diffable data in the repo you already have. No page reaches
`reviewed` without a human PR approval, and CI enforces it.

> **Alpha · source-only.** Build from source (`pnpm install && pnpm build`); not published to npm
> yet. The name and the `@docforge/*` package scope are **provisional** and may change before
> 0.1.0. APIs are unstable. Issues and feedback are very welcome.

**→ [Quickstart: your existing docs, governed in 10 minutes](QUICKSTART.md)**
&nbsp;·&nbsp; **[Live demo](https://docforge-docs.vercel.app/docs)** · [trust dashboard](https://docforge-docs.vercel.app/trust)

## Why Forge

Letting an agent *read* your docs is largely solved (Mintlify, Context7, Fern). The next problem is
already here: agents *writing* docs — and nothing open makes that output safe to merge.

Forge is that missing layer: an open, self-hostable pipeline that keeps agent-written docs
**structured, provenance-tracked, and human-gated**, in plain Markdown, in your own repo. It sits
*under* your existing site generator — Docusaurus, Starlight, Fumadocs, or just a `docs/` folder —
rather than replacing it.

**The one guarantee:** an agent can draft a page and open a PR, but only a **human approval** can
promote it to `reviewed`. That's enforced structurally, not by convention. The agent write-tools
refuse to even try —

```text
agents may not set status: reviewed — promotion happens only via human PR approval
```

— and, independently, a CI gate (`draft-pages-not-reviewed`) fails any page that reaches `reviewed`
without a recorded human approval. Belt and suspenders: the trust boundary holds even if one layer
is bypassed.

## The producer loop

```
1. An agent drafts a page through the MCP write-tools (status: draft, seeded provenance).
2. It opens a PR on a forge/draft/* branch with a Forge-Provenance commit trailer.
3. CI runs `forge check` — every gate must pass; a PR may not self-promote to `reviewed`.
4. A human approves the PR in GitHub.  ← the approval gate
5. An Action runs `forge approve`: flips draft→reviewed, stamps freshness dates,
   appends a provenance transition, and merges.
```

The result is a page whose entire authorship chain — *AI-authored → which model → which sources →
which human reviewer → timestamps and commits* — is recorded as queryable, git-diffable data. That
record lives in three places that must agree: the frontmatter `provenance` block (what the gates
read and the badge renders), a tamper-**evident** `Forge-Provenance:` git commit trailer, and the
GitHub PR-approval event the Action copies from.

## See it for real

- **[Live demo + trust dashboard](https://docforge-docs.vercel.app/trust)** — every page renders its
  own provenance badge; the dashboard lists the whole corpus by trust state (reviewed / draft / stale).
- **Forge dogfoods itself.** This repo's own docs are authored through the producer loop and gated
  in CI on every push — the product validates its own docs with its own gates.
- **Bring your existing docs.** `forge migrate ./my-docs` seeds honest provenance on every page and
  runs the gates, so you can see what's broken or stale today.

## Onboarding existing docs

Already have a Markdown docs repo? `forge migrate` seeds `status` + an honest human-authored
`provenance` block on every page (keeping any status and freshness dates you already have), then
runs the gates so you can see what needs attention:

```bash
forge migrate ./my-docs --dry-run     # preview
forge migrate ./my-docs               # write provenance + report remaining gate issues
```

Migration records a **bulk human assertion** — the person running it vouches for the corpus
(`reviewed_by.method: migration`). That's deliberately distinct from per-page PR approval: it gets
legacy content into the model honestly, without pretending each page was individually re-reviewed.

## Status — what's shipped, what's next

**v0.1 alpha — source-only, not on npm yet.** The engine is feature-complete *for v0.1* and green
(tests, lint, typecheck, build); the producer loop runs end to end. Expect breaking changes.

**Shipped today:** the producer loop · a suite of content gates (frontmatter, freshness,
links/anchors, citations, reachability, provenance consistency, and the human-approval invariant) ·
**page-level** provenance-as-data · the MCP read + write server · the `forge` CLI · `forge migrate` ·
a renderer-agnostic core with a conformance-tested Fumadocs adapter.

**Planned (not yet shipped):** per-claim provenance · cryptographic signing / attestation as a
managed tier (today's trail is tamper-*evident* via git, not signed) · additional renderer adapters
(Starlight/Astro) · configurable content profiles · a GitHub App for multi-repo setup. See
[the build plan](sharded-roaming-valiant.md) for the full deferred list and reasoning.

## Architecture

A pnpm + Turborepo monorepo. The trust engine is **renderer-agnostic**: the core packages
(`schema, core, provenance, gates, producer, mcp`) read content files directly and never import a
renderer. Only `adapter-fumadocs` and `apps/docs` touch React/Next — which is exactly what lets
Forge govern docs in any stack instead of locking you into ours.

```
schema ◄─ core ◄─ adapter-kit ◄─ adapter-fumadocs ◄─ apps/docs
   ▲        ▲  ▲                   └──────── React/Next lives ONLY here ────────┘
provenance ─┤  └─ gates ◄─ producer ◄─ mcp ◄─ cli
            └─────────────── renderer-agnostic engine ───────────────┘
```

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

## Should you use Forge yet?

**Skip it** if you ship a handful of docs and one person reviews them all — just write Markdown and
commit. Forge earns its keep when **volume outgrows eyeball review**, **more than one person or agent
produces**, and **someone is accountable** for accuracy. That's the wedge.

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm check     # lint + typecheck + test + build
```

Requires Node 22+ and pnpm (the repo pins `pnpm@11` via `packageManager`; Corepack will use it).

## License

[Apache-2.0](LICENSE). The whole engine is open source. The reserved [`ee/`](ee) directory is out of
scope for the core license and reserved for a future source-available commercial tier.

Contributions are accepted under the [Developer Certificate of Origin](CONTRIBUTING.md) — sign your
commits with `git commit -s`.
