<!-- SPDX-License-Identifier: Apache-2.0 -->

# AGENTS.md

This repository is built to be worked on by AI agents. The full, canonical guidance lives in
[CLAUDE.md](CLAUDE.md) and applies to **any** agent, not just Claude.

## The rule that matters most

An agent may only move a documentation page `stub → draft` or `draft → draft`. **Promotion to
`reviewed` requires a human PR approval** and is performed by an automated Action, never by an
agent. Do not hand-edit `status: reviewed` or write `reviewed` provenance.

## Quick reference

- **Author** with the MCP write-tools or `nema draft`; **propose** with `propose_changes` /
  `nema open-pr`. Both seed and respect the `provenance` block.
- **Self-check** with `nema check` before opening a PR — green-before-PR is expected.
- Fill `provenance` honestly: `authored_by`, `model`, structured `sources`. Leave `reviewed`
  transitions to the approval Action.
- Engine packages are renderer-agnostic — no React/Next outside `adapter-fumadocs` and
  `apps/docs`.
- SPDX header on every source file; sign commits (`git commit -s`); don't touch `ee/`.

See [CLAUDE.md](CLAUDE.md) for the full producer loop, provenance schema, and gate rules.
