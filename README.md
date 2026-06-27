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
*yours*. The structural moat is **multi-agent concurrent authoring** — many of your agents working the
same corpus at once without clobbering — something a single closed-agent SaaS cannot follow.

> **Alpha — honest status.** What ships today: an agent writes a page that lands *in your nav, linked,
> and cited*, self-checks against the gates, and opens a PR you approve — rendered live. The
> **multi-agent moat now ships** too: page-level slot leasing stops two live agents clobbering a page,
> and a **merge-time coherence gate** refuses a merge that would break the doc-graph
> (`pnpm demo:concurrent` runs it end to end). A *hosted control plane* remains on the roadmap. APIs
> may change before 0.1.0.

## Quickstart

Stand up a brand-new, agent-native docs site — from nothing to a rendered, provenance-badged page in
about five minutes. **You need Node 22+.** No git, no account, no agent required to get there.

*(Already have docs? Don't scaffold — see [QUICKSTART.md](QUICKSTART.md) to bring an existing repo
under Nema with `nema migrate`.)*

### 1. Scaffold and run

```bash
npx create-nema my-docs --app
cd my-docs
npm install          # npm may print audit warnings — fine for local dev
npm run dev          # → http://localhost:3000
```

Open the URL: your docs render with a **"pending review"** provenance badge and a **`/trust`**
dashboard. That's the idea made concrete — every page shows whether a human has signed off. Confirm
the corpus is valid out of the box:

```bash
nema check           # → all gates passed
```

Everything so far works with **no git, no account, no agent**.

### 2. Add a page — your agent does the writing

Authoring is your agent's job, not yours at a terminal. Point your coding agent (Claude Code shown;
the MCP server is agent-agnostic) at the repo:

```bash
claude mcp add nema -- npx -y @getnema/cli mcp .
```

Then ask it, in plain language:

> Draft a "Getting Started" how-to page, link it from the docs index, and run `nema check`.

Your agent writes the page with a full **provenance block** (`authored_by: ai`, the model, a `draft`
transition), links it into the nav, and self-checks against the gates — fixing whatever they flag.
Reload `localhost:3000` and the page is there, badged *pending review*.

### 3. Ship it for approval

When you're ready to promote a draft to **reviewed**:

```bash
nema open-pr         # the first step that needs git + a GitHub remote + the `gh` CLI
```

A human approves the PR on GitHub — the **only** path to `reviewed`. An Action runs `nema approve`,
flips `draft → reviewed`, stamps freshness, and merges. That approval gate is the one invariant.

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

## Multi-agent concurrent authoring (the moat)

Point a *fleet* of your agents at one corpus. Two mechanisms keep them from stepping on each other:

- **Page-level slot leasing.** `nema claim <path> --agent <id>` (and the `claim_slot` MCP tool)
  reserves a page; a second agent's write to a held page is refused. Acquisition is an atomic
  `O_EXCL` create — racing agents resolve to one winner with no coordination server, and leases
  expire so a dead agent never strands a page. The single-agent path stays lease-free.
- **Merge-time coherence.** Each draft branch is gate-green alone, but merging several can still
  break the corpus. `nema coherence` 3-way merges the open `nema/draft/*` branches against `main`
  and refuses the merge on a **`slot-collision`** (the same page authored on two branches) or
  **`merge-coherence`** failure (a link or page one branch breaks for another). Independent edits to
  a shared page — e.g. two agents each adding a nav link — merge cleanly, exactly as git would.

```bash
nema coherence                         # auto-discover nema/draft/* branches, check vs main
nema coherence ./a ./b --base ./main   # or explicit directories / git refs
```

See [`examples/concurrent`](examples/concurrent) for the two-terminal walkthrough, or run
`pnpm demo:concurrent` for the self-verifying end-to-end demo.

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
gate fires; `nema doctor` preflights Node / git / gh / auth / config; `nema coherence` extends the
gates across draft branches at merge time (see above).

To bootstrap a corpus from existing code, `nema generate <src>` ingests a source repo (package
metadata, README intro, exported symbols) and writes a seeded, gate-green diátaxis doc set — a
factual skeleton your agent then fills with prose through the draft loop. It never writes prose
itself.

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

The structural moat — concurrent authoring with slot-leasing and a merge-time coherence gate — now
ships (see above). What's still ahead, built in the open:

- **A hosted control plane** — optional coordination + cross-repo provenance for teams that want it;
  the open core always runs fully self-hosted, and git stays the source of truth. A robust
  distributed lease (replacing the filesystem lease) lives here.
- **Per-claim provenance** and additional renderer adapters (Starlight/Astro) to prove the
  renderer-agnostic boundary.

## Status

**v0.1 alpha.** The producer loop runs end to end and renders; **multi-agent concurrent authoring
(slot leasing + merge-time coherence) ships** and is exercised in CI. The engine is green (tests,
lint, typecheck, build). Expect breaking changes before 0.1.0.

## Contributing

Contributions are accepted under the [Developer Certificate of Origin](CONTRIBUTING.md) — sign your
commits with `git commit -s`. Start with [CONTRIBUTING.md](CONTRIBUTING.md); see
[GOVERNANCE.md](GOVERNANCE.md) for how decisions get made.

## License

[Apache-2.0](LICENSE). The whole engine is open source. The reserved [`ee/`](ee) directory is out of
scope for the core license and reserved for a future source-available commercial tier.
