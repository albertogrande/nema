<!-- SPDX-License-Identifier: Apache-2.0 -->

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/nema-wordmark-dark.svg">
    <img alt="Nema" src="assets/nema-wordmark.svg" width="300">
  </picture>
</p>

<p align="center">
  <strong>The open, AI-native docs platform for the agentic era</strong><br>
  <sub>Your agents write the docs · a human approves every page · provenance is git-diffable data</sub>
</p>

<p align="center">
  <a href="#quickstart">Quickstart</a> &nbsp;·&nbsp;
  <a href="#why-not-mintlify--why-not-diy">Why Nema</a> &nbsp;·&nbsp;
  <a href="#the-producer-loop">Producer loop</a> &nbsp;·&nbsp;
  <a href="#architecture">Architecture</a> &nbsp;·&nbsp;
  <a href="CLAUDE.md">Agent contract</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: Apache-2.0" src="https://img.shields.io/badge/license-Apache--2.0-1b1b1f?style=flat-square&labelColor=1b1b1f"></a>
  <img alt="Status: alpha" src="https://img.shields.io/badge/status-alpha-d99a06?style=flat-square&labelColor=1b1b1f">
  <img alt="Node 22+" src="https://img.shields.io/badge/node-22%2B-1b1b1f?style=flat-square&labelColor=1b1b1f">
  <img alt="MCP server" src="https://img.shields.io/badge/MCP-server-1b1b1f?style=flat-square&labelColor=1b1b1f">
</p>

<hr>

**Nema is the open, self-hostable docs platform built for the agentic era.** Point your own coding
agents at it and they write, slot, link, and maintain your docs — a human approves every page, and
each one carries a git-diffable record of who wrote it, from which sources, and who signed off. It
renders through [Fumadocs](https://fumadocs.dev), so you're never locked into one vendor's closed agent
or closed SaaS.

Mintlify is a docs platform built *pre-agent* — it bolts one closed agent onto a closed SaaS. Nema is
built **agent-native from the ground up**: the agents are *yours*, the corpus is *yours*, the infra is
*yours*. The structural goal is **multi-agent concurrent authoring** — many of your agents working the
same corpus at once without clobbering — something a single closed-agent SaaS cannot follow.

> **Alpha — honest status.** What ships today: an agent writes a page that lands *in your nav, linked,
> and cited*, self-checks against the gates, and opens a PR you approve — rendered live. The
> **multi-agent moat (concurrent authoring, slot-leasing, merge-time coherence) is on the roadmap, not
> yet shipped** — we won't claim a "fleet" until the demo runs. APIs may change before 0.1.0.

## Quickstart

Stand up a brand-new, agent-native docs site for your project — from nothing to a rendered,
provenance-badged page in about five minutes. No clone, no source build. **You need Node 22+.**

### 1. Scaffold it

```bash
npx create-nema my-docs --app
```

Writes a small **Next + Fumadocs** app: a `docs/` folder with one seeded page, a `nema.config.ts`, the
gates wired as a GitHub Action, and a `/trust` provenance dashboard.

### 2. Run it

```bash
cd my-docs
npm install          # npm may print audit warnings — fine for local dev
npm run dev          # → http://localhost:3000
```

Open the URL. You land on your rendered docs home carrying a **"pending review"** provenance badge,
with a **`/trust`** dashboard alongside. That's the idea made concrete: every page shows whether a
human has signed off.

### 3. Add your first page

Your agents normally do this for you over MCP (next section) — the CLI does the same thing, so you can
see the loop right now:

```bash
nema draft --path guides/getting-started --title "Getting Started" \
  --diataxis how-to --model-name claude-opus-4-8 --model-vendor anthropic \
  --body "Install it, then run it."
```

Nema writes the page with a full **provenance block** (`authored_by: ai`, the model, a `draft`
transition) and immediately runs the gates — which catch that nothing links to it yet:

```text
✗ [reachability] guides/getting-started: orphan — not linked from any other page
    help: Link to the page from another page, or list its path in `rootExempt`.
```

That's the gates **teaching** you what a coherent corpus needs — not a wall you fight. Add a link to
`guides/getting-started` from `docs/index.md`, then:

### 4. Confirm it's clean

```bash
nema check           # re-run every gate
```

Green. Your site runs locally and your first page is valid — drafted by an agent, provenance recorded,
not yet human-approved. Promoting it to `reviewed` happens **only** through a human PR approval — which
is where your agents come in. ↓

## Point your agent at it

Nema is built to be run *by* coding agents (Claude Code, Cursor, your own pipeline — the MCP interface
is agent-agnostic). Register the server straight from npm:

```bash
claude mcp add nema -- npx -y @getnema/cli mcp /path/to/your-docs
```

Your agent can now list, search, read, and **draft** pages with full corpus context — but it **cannot**
promote a page to `reviewed`. Only your PR approval can. The contract every agent must follow lives in
[CLAUDE.md](CLAUDE.md) (and applies via [AGENTS.md](AGENTS.md)).

## Why not Mintlify / why not DIY?

- **vs Mintlify.** Mintlify runs *its* one agent behind a closed SaaS for ~$300/mo. Nema runs *your*
  agents, on infra you control, with your provenance as data in your repo. If you want one vendor to do
  everything and you're fine with its agent, Mintlify is a fine choice — we don't pursue that market.
  We're for teams that won't route doc-authoring through a closed single-vendor system.
- **vs DIY (GitHub + Fumadocs).** DIY is genuinely right for most small teams — and we'll say so. Fuma
  is excellent and a PR is a fine gate. But GitHub + Fuma gives your agents **zero** corpus context:
  they write in a vacuum, and you spend review time cleaning up duplicate pages, broken links, orphans,
  and misfiled nav. Nema gives the agent the context to write a page that *fits* — not one you clean up.
- **vs do nothing.** The honest, most common alternative. Teams are annoyed, not blocked. The reason to
  move now is the window: establish an open, agent-native docs workflow before the market consolidates
  to one-closed-agent-per-team and migrating out gets painful.

## The producer loop

```
1. An agent drafts a page with full corpus context (status: draft, seeded provenance).
2. It opens a PR on a nema/draft/* branch with a Nema-Provenance commit trailer.
3. CI runs `nema check` — every gate passes; a PR may not self-promote to `reviewed`.
4. A human approves the PR in GitHub.  ← the approval gate, the one invariant
5. An Action runs `nema approve`: flips draft→reviewed, stamps freshness, records the
   provenance transition, and merges.
```

The result: a page whose entire authorship chain — *AI-authored → which model → which sources → which
human reviewer → timestamps and commits* — is recorded as queryable, git-diffable data.

## Provenance as data

Every page records `authored_by`, `model`, **structured** `sources`, review `transitions`, and the
reviewer — queryable and git-diffable, not free-text footnotes. Git blame tells you who committed the
bytes; Nema tells you what the agent cited and that a human signed off. The `/trust` route renders this
as a reader-facing dashboard. *(Durable substrate — the long-term audit/compliance surface — not the
day-one hook.)*

## What the gates catch

`nema check` runs every gate and tells you exactly what to fix — for a human at a terminal and for an
agent in a loop:

```text
nema check — 3 error(s), 0 warning(s) · 2 pages
  ✗ [links-resolve] guide/intro: broken internal link -> ./missing.md
      help: Fix the link path, or create the page it points to.
  ✗ [reachability] guide/intro: orphan — not linked from any other page
      help: Link to the page from another page, or list its path in `rootExempt`.
  ✗ [draft-pages-not-reviewed] index: status=reviewed without recorded human approval
      help: Set the page back to `status: draft`. Promotion happens only on human PR approval.
```

`--json` emits a stable machine-readable report for CI and agents; `nema explain <rule>` says why a
gate fires; `nema doctor` preflights Node / git / gh / auth / config.

## Architecture

A pnpm + Turborepo monorepo. The engine is **renderer-agnostic**: the core packages
(`schema, core, provenance, gates, producer, mcp`) read content files directly and never import a
renderer. Only `adapter-fumadocs` and the app template touch React/Next.

| Package | Responsibility |
|---|---|
| [`@getnema/schema`](packages/schema) | SSOT content model + Zod + provenance shapes |
| [`@getnema/core`](packages/core) | load / getPage / search (BM25) / renderMarkdown / nav |
| [`@getnema/provenance`](packages/provenance) | read / merge / recordTransition / verify |
| [`@getnema/gates`](packages/gates) | validation rules behind `nema check` |
| [`@getnema/producer`](packages/producer) | draft → branch → PR → approve → state-flip |
| [`@getnema/mcp`](packages/mcp) | MCP server: read tools + write tools |
| [`@getnema/cli`](packages/cli) | the `nema` binary |
| [`@getnema/adapter-kit`](packages/adapter-kit) | core↔adapter contract + conformance suite |
| [`@getnema/adapter-fumadocs`](packages/adapter-fumadocs) | reference renderer (Next/React) |
| [`create-nema`](packages/create-nema) | `npx create-nema [--app]` scaffolder |

## On the roadmap (not yet shipped)

The structural moat. We build it in the open and won't market it as done until it runs clean:

- **Multi-agent concurrent authoring** — two+ of your agents on one corpus at once, with slot-leasing
  so they don't clobber and a merge-time coherence gate that refuses a broken doc-graph.
- **A hosted control plane** — optional coordination + cross-repo provenance for teams that want it;
  the open core always runs fully self-hosted, and git stays the source of truth.

## Status

**v0.1 alpha.** The single-agent producer loop runs end to end and renders; the engine is green
(tests, lint, typecheck, build). Expect breaking changes. The multi-agent moat is in active design.

## Contributing

Contributions are accepted under the [Developer Certificate of Origin](CONTRIBUTING.md) — sign your
commits with `git commit -s`. Start with [CONTRIBUTING.md](CONTRIBUTING.md); see
[GOVERNANCE.md](GOVERNANCE.md) for how decisions get made.

## License

[Apache-2.0](LICENSE). The whole engine is open source. The reserved [`ee/`](ee) directory is out of
scope for the core license and reserved for a future source-available commercial tier.
