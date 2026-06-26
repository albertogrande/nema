<!-- SPDX-License-Identifier: Apache-2.0 -->

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/nema-wordmark-dark.svg">
    <img alt="Nema" src="assets/nema-wordmark.svg" width="300">
  </picture>
</p>

<p align="center">
  <strong>The governance layer for AI-written documentation</strong><br>
  <sub>Agents draft · humans approve · provenance is git-diffable data</sub>
</p>

<p align="center">
  <a href="QUICKSTART.md">Quickstart</a> &nbsp;·&nbsp;
  <a href="https://getnema.vercel.app/docs">Live demo</a> &nbsp;·&nbsp;
  <a href="https://getnema.vercel.app/trust">Trust dashboard</a> &nbsp;·&nbsp;
  <a href="#architecture">Architecture</a> &nbsp;·&nbsp;
  <a href="CLAUDE.md">Agent contract</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: Apache-2.0" src="https://img.shields.io/badge/license-Apache--2.0-1b1b1f?style=flat-square&labelColor=1b1b1f"></a>
  <img alt="Status: alpha" src="https://img.shields.io/badge/status-alpha-d99a06?style=flat-square&labelColor=1b1b1f">
  <img alt="Node 22+" src="https://img.shields.io/badge/node-22%2B-1b1b1f?style=flat-square&labelColor=1b1b1f">
  <img alt="MCP server" src="https://img.shields.io/badge/MCP-server-1b1b1f?style=flat-square&labelColor=1b1b1f">
  <img alt="TypeScript ESM-only" src="https://img.shields.io/badge/TypeScript-ESM--only-1b1b1f?style=flat-square&labelColor=1b1b1f">
</p>

<hr>

Nema is the open-source governance layer for AI-written documentation.\
Agents are the primary producers and consumers of content; **a human approval is the only path to `reviewed`.** Every page carries a git-diffable record of who or what wrote it, from which sources, and who signed off.

The market has solved letting an agent *read* your docs. Nema is the open, self-hostable pipeline that makes agent-*written* docs **safe to ship** — structured, provenance-tracked, and human-gated. That trust layer is the point.

> **Alpha — source-only.** Clone and build it (`pnpm install && pnpm build`); not yet published to npm. APIs are unstable and may change before 0.1.0. Feedback and issues very welcome.

## Key capabilities

| Capability | What it gives you |
|---|---|
| **Human-gated by design** | An agent may only move a page `stub → draft → draft`. Promotion to `reviewed` requires a human PR approval and is performed by an Action — never by an agent, and CI fails any PR that self-promotes. |
| **Provenance as data** | Every page records `authored_by`, `model`, **structured** `sources`, and review transitions — queryable and git-diffable, not free-text footnotes. |
| **Actionable, machine-readable gates** | `nema check` reports every failure with a rustc-style `help:` hint; `--json` emits a stable report for CI and agents; `nema explain <rule>` and `nema doctor` round out the loop. |
| **Agent-native producer loop** | MCP write-tools (returning structured content) or the `nema` CLI take a page `draft → branch → PR → approve → merge`, with a `Nema-Provenance` commit trailer. |
| **Bring your own Markdown** | `nema migrate` onboards an existing docs repo (Docusaurus, Starlight, or a plain `docs/` folder) **in place**, keeping your statuses and freshness dates. |
| **Renderer-agnostic engine** | The core reads content files directly and never imports a renderer; ship to the Fumadocs/Next reference site or anything else. |

## What you can build

| Use case | What it's for |
|---|---|
| **Docs that drift** | Let agents keep reference docs current; humans approve, and freshness SLAs flag what's gone stale |
| **Multi-author corpora** | When volume outgrows eyeball review and more than one person *or agent* produces content |
| **Auditable / compliance docs** | A provenance chain per page: which model, which sources, which reviewer, which commit |
| **Trust dashboards** | Render the provenance as a reader-facing view of what's AI-written and what a human verified |

## Get the CLI

Nema is source-only during alpha — build the `nema` binary once:

```bash
git clone https://github.com/albertogrande/nema
cd nema && pnpm install && pnpm build
# put `nema` on your PATH for this shell:
alias nema="node $(pwd)/packages/cli/dist/index.js"
nema --help
nema doctor          # verify Node, git, gh + auth, and your config are good to go
```

Requires **Node 22+** and **pnpm** (`corepack enable` provides the pinned `pnpm@11`).

## Set it up with an AI agent

Nema is built to be run *by* coding agents. Two ways in:

**1. Register the MCP server** so your agent (Claude Code, Codex, …) can author through Nema:

```bash
claude mcp add nema -- node /path/to/nema/packages/cli/dist/index.js mcp /path/to/your-docs
```

The agent contract — the producer loop, the provenance schema, and the one invariant an agent must never violate — lives in [CLAUDE.md](CLAUDE.md) and applies to any agent via [AGENTS.md](AGENTS.md).

**2. Or have an agent set it up from scratch.** Paste this into any agent that can read a URL and run a shell command:

```text
Help me govern my docs with Nema.

1. Read the contract at CLAUDE.md and the Quickstart at QUICKSTART.md in
   https://github.com/albertogrande/nema
2. Build the CLI, then run `nema migrate ./my-docs --dry-run` against my docs
   and show me what the gates report.
3. Register the Nema MCP server, draft one new page through the producer loop,
   and open the PR — but stop before approval, because that's mine to give.
```

## The producer loop

```
1. An agent drafts a page through the MCP write-tools (status: draft, seeded provenance).
2. It opens a PR on a nema/draft/* branch with a Nema-Provenance commit trailer.
3. CI runs `nema check` — all gates pass; a PR may not self-promote to `reviewed`.
4. A human approves the PR in GitHub.  ← the approval gate
5. An Action runs `nema approve`: flips draft→reviewed, stamps freshness dates,
   appends a provenance transition, and merges.
```

The result is a page whose entire authorship chain — *AI-authored → which model → which sources → which human reviewer → timestamps and commits* — is recorded as queryable, git-diffable data.

## What the gates catch

`nema check` runs every gate and tells you exactly what to fix — for a human at a terminal and for an agent in a loop:

```text
nema check — 6 error(s), 0 warning(s) · 2 pages
  ✗ [links-resolve] guide/intro: broken internal link -> ./missing.md
      help: Fix the link path, or create the page it points to.
  ✗ [reachability] guide/intro: orphan — not linked from any other page
      help: Link to the page from another page, or list its path in `rootExempt`.
  ✗ [draft-pages-not-reviewed] index: status=reviewed without recorded human approval
      help: Set the page back to `status: draft`. Promotion happens only on human PR approval.

Run `nema explain <rule>` for why a gate fires and how to fix it.
```

- `nema check --json` — the same diagnostics as a stable machine-readable report, for CI tooling and agents.
- `nema explain <rule>` — what a gate checks and how to satisfy it (`links-resolve`, `freshness`, `provenance-consistency`, …).
- `nema doctor` — a Node / git / gh / auth / config / content preflight, each with its own fix hint.

## Onboarding existing docs

Already have a Markdown docs repo? `nema migrate` seeds `status` + an honest human-authored `provenance` block on every page (keeping existing status and freshness dates), then runs the gates so you can see what needs attention:

```bash
nema migrate ./my-docs --dry-run     # preview
nema migrate ./my-docs               # write provenance + report remaining gate issues
```

See the [Quickstart](QUICKSTART.md) for the full onboarding walkthrough.

## Architecture

A pnpm + Turborepo monorepo. The engine is **renderer-agnostic**: the moat packages (`schema, core, provenance, gates, producer, mcp`) read content files directly and never import a renderer. Only `adapter-fumadocs` and `apps/docs` touch React/Next.

| Package | Responsibility |
|---|---|
| [`@getnema/schema`](packages/schema) | SSOT content model + Zod + provenance shapes |
| [`@getnema/core`](packages/core) | load / getPage / search (BM25) / renderMarkdown / nav |
| [`@getnema/provenance`](packages/provenance) | read / merge / recordTransition / verify |
| [`@getnema/gates`](packages/gates) | validation rules behind `nema check` |
| [`@getnema/producer`](packages/producer) | draft → branch → PR → approve → state-flip |
| [`@getnema/mcp`](packages/mcp) | MCP server: read tools + write tools |
| [`nema`](packages/cli) | the `nema` binary |
| [`@getnema/adapter-kit`](packages/adapter-kit) | core↔adapter contract + conformance suite |
| [`@getnema/adapter-fumadocs`](packages/adapter-fumadocs) | reference renderer (Next/React) |
| [`@getnema/actions`](packages/actions) | composite GitHub Actions |

## Security & governance

- **Human approval is the gate** — agents author and propose; the `draft → reviewed` flip is owned by the approval Action, and the `draft-pages-not-reviewed` gate rejects any PR that backfills `reviewed` without a recorded human approval.
- **Provenance is verifiable** — the `provenance-consistency` gate checks that `reviewed ⇒ reviewed_by + a transition`, that non-human authorship sets `model.name`, and that every cited source is referenced.
- **Gates fail closed in CI** — `nema check` runs frontmatter, freshness, citation/footnote, link + anchor, reachability, and provenance gates; overdue freshness and dangling links are errors, not warnings.
- **Subprocess safety** — Nema runs `git` and `gh` on the producer path; argument construction and untrusted-input handling there are explicitly in scope for [SECURITY.md](SECURITY.md).
- **Scoped writes** — the MCP server's write tools are confined to the configured content root; path traversal and provenance forgery are first-class security concerns.

## Status

**v0.1 alpha — source-only, not on npm yet.** The engine is feature-complete and green (tests, lint, typecheck, build); the producer loop runs end to end. Expect breaking changes. See [the build plan](sharded-roaming-valiant.md).

## Build and test

```bash
pnpm install
pnpm build
pnpm test
pnpm check     # lint + typecheck + test + build — green-before-PR is the norm
```

## Docs

- [Quickstart](QUICKSTART.md) — your existing docs, governed in 10 minutes
- [Agent contract](CLAUDE.md) — the producer loop, provenance schema, and gate rules
- [Build plan](sharded-roaming-valiant.md) — what's shipped and what's deferred
- [Live demo](https://getnema.vercel.app/docs) · [Trust dashboard](https://getnema.vercel.app/trust)

## Contributing

Contributions are accepted under the [Developer Certificate of Origin](CONTRIBUTING.md) — sign your commits with `git commit -s`. Start with [CONTRIBUTING.md](CONTRIBUTING.md) for where to file what, and [GOVERNANCE.md](GOVERNANCE.md) for how decisions get made.

## License

[Apache-2.0](LICENSE). The whole engine is open source. The reserved [`ee/`](ee) directory is out of scope for the core license and reserved for a future source-available commercial tier.
