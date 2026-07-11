---
title: Getting Started
status: draft
diataxis: tutorial
provenance:
  authored_by: ai
  model:
    name: claude-opus-4-8
    vendor: anthropic
  transitions:
    - to: draft
      by: ai
      ts: 2024-01-02T09:00:00Z
      commit: a1b2c3d
---

# Getting Started

This page is a **draft** — authored by an agent, not yet human-reviewed. Its badge says so.

## The producer loop

1. An agent drafts a page with the MCP write-tools (or `nema draft`).
2. It opens a PR; CI runs `nema check`.
3. A human approves the PR — the only path to `reviewed`.
4. An Action flips `draft → reviewed` and records the transition.

Return to the [overview](index.md) or read the [Reference](reference.md).
