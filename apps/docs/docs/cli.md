---
title: CLI reference
status: draft
diataxis: reference
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
      retrieved: '2026-07-11'
  transitions:
    - to: draft
      by: ai
      ts: 2026-07-11T14:43:44.865Z
---

Everything the platform does is reachable from one binary. Run `nema <command> --help` for
flags; this table is the map.[^cli]

## Set up

| Command | What it does |
| --- | --- |
| `nema init` | Scaffold `nema.config.ts` and a `docs/` directory |
| `nema migrate` | Import an existing Markdown corpus into the Nema model — see [Migrating](migrate.md) |
| `nema doctor` | Diagnose the environment, repo, and governance setup |

## Author

| Command | What it does |
| --- | --- |
| `nema draft` | Create a draft page with seeded provenance, then check it |
| `nema generate <repo>` | Scaffold a docs skeleton from a source repo — see [Docs from code](docs-from-code.md) |
| `nema similar` | Find pages similar to a page or `--query` text, before you draft a duplicate |

## Check

| Command | What it does |
| --- | --- |
| `nema check` | Validate the docs against [all gates](gates.md); `--json` for machines |
| `nema explain [rule]` | What a rule checks and how to fix it; no argument lists all rules |
| `nema drift` | Report pages whose bound source code changed since last review |

## Ship

| Command | What it does |
| --- | --- |
| `nema open-pr` | Open the draft PR: branch, provenance-trailer commit, push, PR (requires `gh`) |
| `nema approve` | Promote `draft → reviewed` — run by the approval Action, not by hand |

## Trust

| Command | What it does |
| --- | --- |
| `nema prov [path]` | Print a page's provenance chain, or filter the corpus |
| `nema audit` | Corpus-wide review trail: every lifecycle transition, filterable |
| `nema bind <path> <source>` | Bind a page to the code it documents and stamp a drift baseline |

## Scale

| Command | What it does |
| --- | --- |
| `nema claim` / `nema release` | Lease / release a page's authoring slot — see [Multi-agent](multi-agent.md) |
| `nema coherence` | Prove draft branches merge into a valid doc-graph |
| `nema mcp` | Start the MCP server (stdio, or `--http`) — see [Use with your agent](mcp.md) |

## Sources

[^cli]: `nema --help` (CLI v0.4.0) — https://github.com/albertogrande/nema/blob/main/packages/cli
