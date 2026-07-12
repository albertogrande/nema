---
title: Docs from code
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
      ts: 2026-07-11T14:43:25.241Z
    - to: reviewed
      by: albertogrande
      ts: 2026-07-12T06:38:08.732Z
      commit: b0b8b8279cbff1b2310c5e6b837f23bce95a380b
      pr: 92
  reviewed_by:
    login: albertogrande
    method: maintainer-command
    pr: 92
last_reviewed: 2026-07-12
review_by: 2027-01-08
---

Docs that describe code should start from the code and notice when the code moves. Nema ships
both halves: `nema generate` scaffolds draft pages from a repo's public surface, and
`nema bind` + `nema drift` keep shipped pages honest about it.[^cli]

## Cold start: `nema generate`

```bash
nema generate ../your-repo --model-name <model-id> --model-vendor <vendor>
```

`generate` reads the source repo's public API and writes seeded `draft` pages — export tables,
an install snippet, a factual skeleton. **It never invents prose**; explaining the code is your
agent's job, on top of the generated skeleton. Useful flags:

- `--dry-run` — preview what would be written, without writing.
- `--content-dir <dir>` — override where pages land.
- Omit `--model-name` to record the scaffold as `authored_by: human`.

## Binding: `nema bind`

A page binds to the source it documents via a `code:` block in its frontmatter:

```bash
nema bind api/reference src/index.ts --symbols createClient,defineConfig
```

- `--symbols` — track specific exports (default: all).
- `--strategy symbols | file` — fingerprint the export signatures, or the whole file.
- Paths resolve against `codeRoot` from [configuration](configuration.md).

Binding stamps a **drift baseline**: a fingerprint of the public surface at the moment the
page was last reviewed. Agents may add or refresh bindings on a *draft*; the reviewed baseline
is re-stamped only on human approval, exactly like `reviewed` status itself.

## Detection: `nema drift`

```bash
nema drift             # list pages whose bound source moved past the baseline
nema drift --strict    # exit non-zero when anything drifted (for CI)
nema drift --json      # machine-readable, for agents
```

When the code's public surface moves past a page's reviewed baseline, the `code-drift` gate
**warns** (it never fails) and `nema drift` lists the stale pages. The fix is the
[producer loop](producer-loop.md): re-draft the page from the changed source and send it back
through human approval.

## Sources

[^cli]: `nema generate|bind|drift --help` (CLI v0.4.0) — https://github.com/albertogrande/nema/blob/main/packages/cli
