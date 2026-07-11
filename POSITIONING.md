<!-- SPDX-License-Identifier: Apache-2.0 -->

# Nema positioning canvas

Internal reference for how Nema is positioned and messaged — the source of truth behind the
README hero, the GitHub repo description, and any landing copy. Built with the
[Fletch PMM](https://www.fletchpmm.com/) framework: positioning decomposes into **market
elements** (persona, company type, context, problem) and **product elements** (category,
capability, feature, benefit), and the message anchors on **one concrete use case** — not a
category or a vision statement.

This is a repo doc, not a `docs/` corpus page — it carries no frontmatter and never renders on
the docs site. Every claim below must stay backed by shipped code (see the
[`readme-pmm`](.claude/skills/readme-pmm/SKILL.md) skill for the honesty rules). Last full pass:
2026-07-11, against v0.4.

## Market elements

| Element | Position |
| --- | --- |
| **Company type** | OSS maintainers and small product-engineering teams — no technical writer, no DevRel; docs are owned "by default." |
| **Persona (champion)** | The engineer or tech lead who runs coding agents (Claude Code, Cursor) daily and is the person docs complaints land on. Close to the pain, not the budget. |
| **Context** | Agents made shipping code fast; docs didn't get faster. The team already trusts agents to write *code* under PR review, but has no equivalent workflow for docs. |
| **Problem** | You can't let an agent write your docs without choosing between two bad options: review every word yourself, or publish text nobody can vouch for. So the docs stay unwritten or stale. |

## Alternatives (what the champion does today, and where it breaks)

Internal reasoning only — never name these in the README; differentiation lands in reader terms.

1. **Status quo** — docs rot or never exist. The accepted pain.
2. **Paste-and-pray** — ask an agent to write docs, commit the output. No review gate, no record
   of which model or sources produced what, no checks. *This is the real competitor.*
3. **Docs-as-code platforms** — built around a human author; nothing about agent workflows,
   provenance, or agents overwriting each other.
4. **CI lint layer** (prose linters, link checkers) — checks style and syntax, not trust: can't
   say who wrote a page, whether a human signed off, or whether the code moved on.

## Product elements

**Category:** *open-source docs platform* — a noun the visitor already knows. Deliberately not an
invented category ("AI-native docs platform") and no era-claims ("for the agentic era"); Fletch's
rule is that new-category framing makes early-stage messaging unevaluatable.

| Capability (what you do) | Feature (mechanism, code-verified) | Benefit (so what) |
| --- | --- | --- |
| Agents author, you approve | Producer loop; approval Action flips `draft → reviewed`; invariant enforced in three places (the `draft-pages-not-reviewed` gate, `update_page` refusing `reviewed`, no promote MCP tool) | Docs get written; your job shrinks to one PR approval |
| Trust is checkable | Provenance blocks (model, sources, transitions), `/trust` dashboard, `nema prov` / `nema audit` | Anyone can see who wrote a page and who vouched for it |
| Agents self-correct pre-PR | `nema check`: 11 failing gates + structured diagnostics with a fix hint per failure | Broken links, orphans, and self-promotion never reach the PR |
| Docs track the code | `code:` bindings with symbol-signature fingerprints, `nema drift`; `nema generate` scaffolds drafts from a repo's exports without inventing prose | Staleness is detected, not remembered |
| Scale to a fleet | Slot leasing + merge-time coherence gate | Multiple agents, one corpus, no clobbering |

## Anchor use case

Candidates considered: **(A)** agents write and maintain your docs, you approve the PR;
**(B)** docs-from-code cold start (`nema generate`); **(C)** multi-agent fleet authoring.

**Anchored on A.** It is the use case the entire architecture defends (the one invariant), it is
the recurring daily job rather than a one-time event, and B and C both serve it — B is how the
loop cold-starts, C is how it scales. Refusing to pick one means losing to whoever is more
specific.

## Messaging decisions

**Hero header (chosen — use-case-led):**

> **Your coding agents write the docs. You approve the PR.**

Options rejected: problem-led ("AI-written docs your readers can actually trust" — assumes the
visitor already got burned) and capability-led ("Turn your coding agent into your docs team" —
over-promises for an alpha).

**Subheader:** states the category + how, in one breath — open-source, self-hostable docs
platform built for agent authorship; gates check every draft; provenance is git-diffable data.

**Page structure** (Fletch: Hero → Problem → Solution intro → Value props):

1. Hero: header, subheader, badge row.
2. Visual proof: the `/trust` dashboard screenshot — agent-drafted pages awaiting human review
   is the anchor use case made visible. Keep above the fold.
3. Problem: three sentences, "Why Nema exists."
4. Solution intro: one paragraph — point your agents at the repo; gates check; you approve.
5. Value props: five feature-forward bullets, ranked by the anchor use case —
   author/approve → gate-checked → provenance → docs-track-code (generate + bind + drift merged
   into one story) → multi-agent. "Renderer-agnostic / self-hostable" lives in the subheader and
   intro, not the bullet list — it's a deployment property, not a use-case payoff.
6. Quickstart (unchanged — ~3–5 min to a rendered, provenance-badged page is real and verified).

**Standing rules:**

- No competitor names, no "vs X" tables — differentiation in reader terms only.
- No vision/era words ("AI-native", "agentic era", "category-defining").
- Every command, flag, and claim must match the shipped surface; when the surface moves, this
  canvas and the README move together (see `docs-freshness`).

**GitHub repo description (kept in sync with the hero):**

> Your coding agents write the docs; you approve the PR. Open-source docs platform with
> human-gated review, git-diffable provenance, gate checks, and code-drift tracking.

## Homepage (apps/docs root, getnema.vercel.app)

The landing page (`apps/docs/app/page.tsx`) follows Fletch's top-half template — Hero → Problem →
Solution intro → Value props — with the flexible bottom half used for differentiation proof.
Page metadata mirrors the GitHub repo description.

1. **Hero** — the canonical header/subheader (above), eyebrow badges
   (`open source · self-hostable · apache-2.0 · alpha`), `npx create-nema my-docs --app`
   copy-command, docs/GitHub CTAs. No customer logos at alpha — credibility is the OSS badges
   and the live `/trust` dashboard.
2. **Problem (`00`)** — Fletch's current-way / limitation / pain triad: agents ship code faster
   than anyone documents it → raw agent output has no gate, no record, no checks → review every
   word or vouch for nothing, so docs rot.
3. **Solution intro (`01 / the producer loop`)** — draft → check → propose → a human approves,
   rendered as a terminal walkthrough. Signature line: "The whole loop is designed to be driven
   by an agent — except the last step, which is designed so it can't be."
4. **Value props (`03 / what you get`)** — six feature tiles in canvas order: `authored_by: ai` →
   `nema check` → `provenance:` → `nema generate` → `nema drift` → `slot leasing`. (The grid keeps
   generate and drift as separate tiles; the README merges them into one bullet — a prose
   constraint, not a positioning difference.)
5. **Bottom half** — the invariant table (`02`), "Approval is a diff" provenance diff (`04`),
   bring-your-own-agent over MCP (`05`), footer.
