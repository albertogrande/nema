---
title: Migrating an existing corpus
status: reviewed
diataxis: how-to
provenance:
  schema: 1
  authored_by: ai
  model:
    name: Claude Fable 5
    vendor: anthropic
    prompt_ref: .claude/skills/docs-author/SKILL.md@56d2810
  sources:
    - id: cli
      title: packages/cli — nema CLI v0.4.0 --help output
      url: https://github.com/albertogrande/nema/blob/main/packages/cli
      kind: reference
      retrieved: 2026-07-11
  transitions:
    - to: draft
      by: ai
      ts: 2026-07-11T14:43:45.590Z
    - to: reviewed
      by: albertogrande
      ts: 2026-07-12T06:38:08.736Z
      commit: b0b8b8279cbff1b2310c5e6b837f23bce95a380b
      pr: 92
  reviewed_by:
    login: albertogrande
    method: maintainer-command
    pr: 92
last_reviewed: 2026-07-12
review_by: 2027-01-08
---

Already have a docs folder? `nema migrate` brings an existing Markdown corpus under the Nema
model without rewriting a word: it seeds `status` and a `provenance` block on every page that
lacks them, and leaves everything else alone.[^cli]

## Run it

```bash
nema migrate --dry-run     # preview: what would be stamped, page by page
nema migrate               # write the frontmatter
nema check                 # confirm the migrated corpus passes the gates
```

## What gets seeded

- **`status`** — by default, migrated pages become `reviewed`: a human is running the
  migration and vouching for the existing content, recorded as
  `reviewed_by: { method: migration }`. Pass `--status draft` for corpora nobody wants to
  vouch for yet.
- **`provenance`** — `authored_by: human` with a transition trail starting at the migration.
- **Freshness dates** — `last_reviewed` / `review_by` per the SLA, so the `freshness` gate has
  a baseline to hold reviewed pages to.

## Flags

| Flag | What it does |
| --- | --- |
| `--status reviewed\|draft` | Status for pages that have none (default `reviewed`) |
| `--reviewer <login>` | Login recorded on migrated reviewed pages (default: git user) |
| `--content-dir <dir>` | Override the content directory |
| `--sla-days <n>` | Freshness SLA for reviewed pages (default 180) |
| `--dry-run` | Preview without writing files |

## After the migration

The corpus behaves like any Nema repo: agents author new pages through the
[producer loop](producer-loop.md), the [gates](gates.md) hold every PR, and the migrated
pages' `migration` review method stays visible in [provenance](provenance.md) — an honest
record that their trust came from an import, not a PR review.

## Sources

[^cli]: `nema migrate --help` (CLI v0.4.0) — https://github.com/albertogrande/nema/blob/main/packages/cli
