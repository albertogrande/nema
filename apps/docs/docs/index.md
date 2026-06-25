---
title: Nema Docs
status: reviewed
diataxis: overview
last_reviewed: 2024-01-01
review_by: 2099-01-01
provenance:
  authored_by: ai
  model:
    name: claude-opus-4-8
    vendor: anthropic
  reviewed_by:
    login: alberto
    method: github-pr-approval
    pr: 1
  transitions:
    - to: draft
      by: ai
      ts: 2024-01-01T10:00:00Z
      commit: 0b05f2a
    - to: reviewed
      by: alberto
      ts: 2024-01-01T12:00:00Z
      commit: 8f51078
      pr: 1
---

# Nema Docs

This very site is **dogfooding** Nema: each page is authored by an agent, carries a provenance
block, and is gated by `nema check` — and the badge above shows its trust state.

Start with [Getting Started](getting-started.md), or see the [Reference](reference.md).

Every page also has a raw `.md` route that is byte-identical to what an agent gets from the MCP
`get_page` tool — that parity is enforced by the adapter conformance suite.
