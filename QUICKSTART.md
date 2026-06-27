<!-- SPDX-License-Identifier: Apache-2.0 -->

# Quickstart — your existing docs, governed in 10 minutes

Nema turns a plain-Markdown docs repo into **governed, provenance-tracked content**: every page
carries an honest record of who/what authored it and whether a human reviewed it, the gates keep
it valid, and agents can safely draft new pages because a human approval is the only path to
`reviewed`.

This guide takes an **existing** docs repo from "a folder of Markdown" to "Nema-governed" — then
shows the ongoing loop. (Greenfield? Jump to [Starting from scratch](#starting-from-scratch).)

> **Alpha.** Nema is on npm and works today (`@getnema/cli`, `create-nema`); APIs may still shift
> before 1.0.

## Prerequisites

- **Node 22+** (npm ships with it). Add the `gh` CLI + auth if you want the PR/approve loop.
- A git repo whose docs are Markdown files (any layout — Docusaurus, Starlight, Mintlify-from-git,
  or just a `docs/` folder).

## 1. Get the CLI

Nema is on npm — no clone, no build:

```bash
# install so `nema` is on your PATH:
npm install -g @getnema/cli
nema --help
nema doctor          # verify Node, git, gh + auth, and your config are good to go

# …or run any command one-off without installing:
npx @getnema/cli doctor
```

## 2. Onboard your existing docs — `nema migrate`

Point Nema at your repo. `migrate` infers a title for each page, keeps any status/freshness dates
you already have, and seeds an honest `authored_by: human` provenance block. **Preview first:**

```bash
nema migrate /path/to/your-docs --dry-run
```

If your Markdown lives somewhere other than `docs/`, point at it:

```bash
nema migrate /path/to/your-docs --content-dir content   # e.g. Docusaurus/Starlight
```

Happy with the preview? Run it for real — it writes the provenance blocks and then runs the gates
to tell you exactly what legacy content still needs attention:

```bash
nema migrate /path/to/your-docs
```

```text
Migrated 34 page(s); skipped 0 (already have provenance).
  + foundations/positioning [reviewed] — Positioning for developers
  ...
Running nema check on the migrated corpus…
nema check — 1 error(s), 0 warning(s) · 34 pages
  ✗ [links-resolve] foundations/content-model: broken internal link -> ../missing.md
      help: Fix the link path, or create the page it points to.

Run `nema explain <rule>` for why a gate fires and how to fix it.
```

That one finding is a *real* broken link in your content — Nema just surfaced it, with a hint on
how to fix it. Fix what it reports, re-run `nema check`, and your corpus is green.

Options: `--status draft|reviewed` (default `reviewed` for status-less pages — existing statuses
are always kept), `--reviewer <login>`, `--sla-days N`. `migrate` is idempotent: pages that
already have provenance are skipped, so it's safe to re-run.

## 3. See what you've got

```bash
nema check /path/to/your-docs                          # all gates (with fix hints)
nema check /path/to/your-docs --json                   # same gates, machine-readable (CI / agents)
nema explain reachability                              # what a gate checks + how to fix it
nema prov /path/to/your-docs --status reviewed         # the provenance chain, per page
nema prov /path/to/your-docs --filter authored_by=ai   # everything an agent wrote
```

For a reader-facing view, the reference site renders the same provenance as a trust dashboard —
see the live demo: **[the `/trust` dashboard](https://getnema.vercel.app/trust)** (and a
page with its [provenance badge](https://getnema.vercel.app/docs/getting-started)).

## 4. The ongoing loop

Now new docs get written the Nema way — agents draft, you approve:

1. **Register the MCP server** so your agent (e.g. Claude Code) can author through Nema —
   no clone, no build, straight from npm:
   ```bash
   claude mcp add nema -- npx -y @getnema/cli mcp /path/to/your-docs
   ```
2. **An agent drafts** a page (`draft_page` / `nema draft`) — it writes `status: draft` with a
   seeded provenance block and self-checks against the gates.
3. **It opens a PR** (`propose_changes` / `nema open-pr`) on a `nema/draft/*` branch with a
   `Nema-Provenance` commit trailer. CI runs `nema check`; a PR may **not** self-promote to
   `reviewed`.
4. **You approve** the PR in GitHub — the only path to `reviewed`. An Action runs `nema approve`,
   flips `draft → reviewed`, stamps freshness dates, records the transition, and merges.

The full agent contract lives in [CLAUDE.md](CLAUDE.md).

## Should you use Nema yet?

**Skip it** if you ship a handful of docs and one person reviews them all — just write Markdown and
commit. Nema earns its keep when **volume outgrows eyeball review**, **more than one person/agent
produces**, and **someone is accountable** for accuracy (e.g. developer docs that drift faster than
your team can keep up). That's the wedge.

## Starting from scratch

No existing docs? Scaffold a fresh, **renderable** Nema site and open it in the browser:

```bash
npx create-nema my-docs --app              # Nema repo + a Fumadocs app
cd my-docs && npm install && npm run dev   # → http://localhost:3000 — a badged, rendered page
```

Want docs-only (no renderer — bring your own)? Drop `--app` (`npx create-nema my-docs`) for a minimal
repo that ends at `nema check`. Either way, jump to step 4 and let an agent draft your first pages.

---

See the [README](README.md) for architecture and the [build plan](sharded-roaming-valiant.md) for
what's shipped and what's deferred.
