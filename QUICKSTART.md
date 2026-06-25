<!-- SPDX-License-Identifier: Apache-2.0 -->

# Quickstart — your existing docs, governed in 10 minutes

Forge turns a plain-Markdown docs repo into **governed, provenance-tracked content**: every page
carries an honest record of who/what authored it and whether a human reviewed it, the gates keep
it valid, and agents can safely draft new pages because a human approval is the only path to
`reviewed`.

This guide takes an **existing** docs repo from "a folder of Markdown" to "Forge-governed" — then
shows the ongoing loop. (Greenfield? Jump to [Starting from scratch](#starting-from-scratch).)

> **Alpha — source-only.** Forge isn't on npm yet, so you build the CLI from source (one time).
> npm install is coming; everything below works today.

## Prerequisites

- **Node 22+** and **pnpm** (`corepack enable` will provide it).
- A git repo whose docs are Markdown files (any layout — Docusaurus, Starlight, Mintlify-from-git,
  or just a `docs/` folder).

## 1. Get the CLI (one time)

```bash
git clone https://github.com/albertogrande/docforge
cd docforge && pnpm install && pnpm build
# put `forge` on your PATH for this shell:
alias forge="node $(pwd)/packages/cli/dist/index.js"
forge --help
```

## 2. Onboard your existing docs — `forge migrate`

Point Forge at your repo. `migrate` infers a title for each page, keeps any status/freshness dates
you already have, and seeds an honest `authored_by: human` provenance block. **Preview first:**

```bash
forge migrate /path/to/your-docs --dry-run
```

If your Markdown lives somewhere other than `docs/`, point at it:

```bash
forge migrate /path/to/your-docs --content-dir content   # e.g. Docusaurus/Starlight
```

Happy with the preview? Run it for real — it writes the provenance blocks and then runs the gates
to tell you exactly what legacy content still needs attention:

```bash
forge migrate /path/to/your-docs
```

```text
Migrated 34 page(s); skipped 0 (already have provenance).
  + foundations/positioning [reviewed] — Positioning for developers
  ...
Running forge check on the migrated corpus…
forge check — 1 error(s), 0 warning(s)
  ✗ [links-resolve] foundations/content-model: broken internal link -> ../missing.md
```

That one finding is a *real* broken link in your content — Forge just surfaced it. Fix what it
reports, re-run `forge check`, and your corpus is green.

Options: `--status draft|reviewed` (default `reviewed` for status-less pages — existing statuses
are always kept), `--reviewer <login>`, `--sla-days N`. `migrate` is idempotent: pages that
already have provenance are skipped, so it's safe to re-run.

## 3. See what you've got

```bash
forge trust /path/to/your-docs                          # corpus trust posture (the scorecard)
forge check /path/to/your-docs                          # all gates
forge prov /path/to/your-docs --status reviewed         # the provenance chain, per page
forge prov /path/to/your-docs --filter authored_by=ai   # everything an agent wrote
```

`forge trust` is the one-glance answer to "how much of this can I trust?" — reviewed %, AI-authored
%, and the counts that matter: **AI-authored-but-unreviewed**, stale/overdue, and how many reviews
are anchored to a commit. Add `--strict` to fail CI on governance risk, or `--json` to pipe it.

For a reader-facing view, the reference site renders the same provenance as a trust dashboard —
see the live demo: **[the `/trust` dashboard](https://docforge-docs.vercel.app/trust)** (and a
page with its [provenance badge](https://docforge-docs.vercel.app/docs/getting-started)).

## 4. The ongoing loop

Now new docs get written the Forge way — agents draft, you approve:

1. **Register the MCP server** so your agent (e.g. Claude Code) can author through Forge:
   ```bash
   claude mcp add forge -- node /path/to/docforge/packages/cli/dist/index.js mcp /path/to/your-docs
   ```
2. **An agent drafts** a page (`draft_page` / `forge draft`) — it writes `status: draft` with a
   seeded provenance block and self-checks against the gates.
3. **It opens a PR** (`propose_changes` / `forge open-pr`) on a `forge/draft/*` branch with a
   `Forge-Provenance` commit trailer. CI runs `forge check`; a PR may **not** self-promote to
   `reviewed`.
4. **You approve** the PR in GitHub — the only path to `reviewed`. An Action runs `forge approve`,
   flips `draft → reviewed`, stamps freshness dates, records the transition, and merges.

The full agent contract lives in [CLAUDE.md](CLAUDE.md).

## Should you use Forge yet?

**Skip it** if you ship a handful of docs and one person reviews them all — just write Markdown and
commit. Forge earns its keep when **volume outgrows eyeball review**, **more than one person/agent
produces**, and **someone is accountable** for accuracy (e.g. developer docs that drift faster than
your team can keep up). That's the wedge.

## Starting from scratch

No existing docs? Scaffold a fresh Forge repo:

```bash
forge init ./my-docs    # creates docforge.config.ts + docs/index.md
forge check ./my-docs
```

Then jump to step 4 and let an agent draft your first pages.

---

See the [README](README.md) for architecture and the [build plan](sharded-roaming-valiant.md) for
what's shipped and what's deferred.
