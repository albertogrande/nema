# Nema¹ — open-source, AI-native docs platform · v0.1 build plan

> ¹ **Name is a placeholder.** Working scope `@getnema/*`, CLI binary `nema`. Pick the real
> name (check npm + GitHub org + domain availability) before the first publish; renaming
> pre-publish is cheap. Everything below is renameable.

## Context

We're starting a **new, clean, public repo** for an open-source product: an **AI-native
documentation platform** where *agents are the primary producers and consumers of content and
humans are the approval gate*. Docs-as-product: versioned, traceable.

It exists because the market has solved "let an agent *read* your docs" (Mintlify, Context7,
Fern) but no one ships an **open, self-hostable pipeline that makes agent-*written* docs safe to
ship**: structured + provenance-tracked + human-gated, in plain Markdown, in your own repo. That
trust/governance layer is the white space and the moat. Mintlify markets it but can't ship it
(SaaS-locked, trust-thin).

The existing `developer-marketing-handbook` repo is **not** thrown away — it pioneered the
proven patterns (SSOT content model, dual-enforcer gates, cross-surface parity, freshness SLA
with teeth, a read-only MCP server, an AI authoring pipeline). We **port and generalize** those
into a renderer-agnostic TypeScript core, and the handbook becomes a future reference/demo
corpus. The intended outcome of v0.1: a working end-to-end demo — *an agent drafts a page → it
opens a PR → CI gates pass → a human approves → status flips draft→reviewed and the transition is
recorded as provenance.*

## Locked decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Open-core boundary | **Whole engine is OSS.** Commercial tier (hosting, SSO, governance dashboards, managed/signed attestation, support) comes later in a reserved `ee/` dir. |
| 2 | License | **Apache-2.0** for core (patent grant); SPDX headers + REUSE compliance; `ee/` reserved for a later source-available license without relicensing core. |
| 3 | First milestone | **Producer loop + provenance MVP** (this plan). |
| 4 | Renderer | **Renderer-agnostic core + Fumadocs (Next.js/React) reference adapter.** Core never imports a renderer; a Starlight/Astro adapter can be added later without touching core. |
| 5 | v0.1 trust level | **GitHub PR-approval event + immutable commit trailer + frontmatter record.** Cryptographic signing deferred to a commercial "managed attestation." |
| 6 | v0.1 content model | **Generic, domain-neutral default** (`title, status, diataxis, last_reviewed, review_by, provenance`). Drop handbook-isms (`umbrella`, `is_it_devrel`). Configurable "profile" abstraction lands in v0.2. |
| 7 | Producer mechanism | **GitHub-first.** Local MCP write-tools shell to `git`/`gh`; a `NemaHost` interface hedges GitLab/Gitea/GitHub-App later. |

## Architecture — monorepo

**Tooling:** pnpm 9 workspaces + Turborepo 2 · Node 22 LTS floor (test 22 + 24) · TypeScript
5.6+, ESM-only, `module: nodenext`, `strict` + `noUncheckedIndexedAccess` · **tsup** builds ·
**Vitest** · **Biome** (lint+format; fall back to eslint flat + prettier only if a type-aware
rule is needed) · **Changesets** for versioning/release (not semantic-release — wrong fit for a
workspace) · Conventional Commits + commitlint for history hygiene · `npm publish --provenance`.

```
nema/  (repo root — Apache-2.0)
├─ packages/
│  ├─ schema/            @getnema/schema      SSOT content model + Zod + provenance shapes (leaf; Zod only)
│  ├─ core/              @getnema/core        renderer-agnostic engine: load/getPage/search/renderMarkdown
│  ├─ provenance/        @getnema/provenance  provenance record: read/merge/recordTransition/verify
│  ├─ gates/             @getnema/gates       validation rules (TS) + engine behind `nema check`
│  ├─ mcp/               @getnema/mcp         MCP server: read tools + WRITE tools (the moat surface)
│  ├─ producer/          @getnema/producer    draft→branch→PR→approve→state-flip; NemaHost interface
│  ├─ cli/               nema         the `nema` binary
│  ├─ adapter-kit/       @getnema/adapter-kit core↔adapter contract + conformance test suite
│  ├─ adapter-fumadocs/  @getnema/adapter-fumadocs   v1 reference renderer (Next/React/Fumadocs)
│  └─ actions/           @getnema/actions     composite GH Actions (gate, approval→flip, freshness)
├─ apps/docs/            dogfood site (Fumadocs), authored THROUGH the producer loop · private:true
├─ examples/minimal/     tiny content repo (core+mcp+gates, no renderer) for E2E tests
├─ ee/                   RESERVED, empty in v0.x — future source-available tier (own LICENSE placeholder)
├─ create-nema/      `npm create nema` scaffolder (v0.2)
├─ .changeset/ · .github/workflows/ · turbo.json · pnpm-workspace.yaml · tsconfig.base.json
└─ LICENSE (Apache-2.0) · NOTICE · REUSE.toml · governance files
```

**Dependency graph (acyclic).** Moat packages — `schema, core, provenance, gates, producer,
mcp` — are **entirely framework-agnostic and read content files directly**; no renderer
dependency anywhere in that set. Only `adapter-fumadocs` and `apps/docs` touch React/Next.

```
schema ◄─ core ◄─ adapter-kit ◄─ adapter-fumadocs ◄─ apps/docs
   ▲        ▲  ▲
provenance ─┤  └─ gates ◄─ producer ◄─ mcp ◄─ cli
```

## What we port from the handbook (and how it changes)

Reuse the proven logic; generalize away handbook-specifics; move Python → TypeScript so there's
one language across engine + agents + MCP.

| Source (absolute path) | Becomes | Change |
|---|---|---|
| `…/developer-marketing-handbook/mcp/handbook.mjs` | `@getnema/core` | `loadPages/getPage/searchHandbook` (BM25 + `github-slugger` anchors) ported ~verbatim; add `renderMarkdown` (the "prepend H1 only if missing" canonicalizer) as the single parity source both MCP and the `.md` route call. |
| `…/scripts/check_content_quality.py` | `@getnema/gates` rules | Footnote integrity, citation discipline (`## Sources`), freshness SLA with teeth (`last_reviewed ≤ today < review_by`, overdue **fails**), reachability — each a TS rule returning structured diagnostics. |
| `…/scripts/check_frontmatter.py` | `@getnema/gates` rules | `frontmatter-required`, `enums-valid`, `dates-valid`. |
| `…/scripts/check_links.py` | `@getnema/gates` rule | `links-resolve` + `anchors-resolve`. |
| `…/scripts/check_parity.mjs` | `@getnema/adapter-kit` | Becomes the **adapter conformance suite** (md-parity, nav coverage, anchor resolution) + a `no-inline-enums` gate. |
| `…/schema/content-model.json` + `…/src/content.config.ts` | `@getnema/schema` | The SSOT-consumed-by-Zod pattern + `superRefine` boundary mechanism, generalized to a domain-neutral base model (profile mechanism deferred to v0.2). |
| `…/.claude/agents/*`, `skills/*`, `CLAUDE.md`, `.github/workflows/*` | repo `.claude/`, `@getnema/actions`, `create-nema` templates | Generalized + extended to document the producer loop and provenance rules for agents. |

## The producer loop (v0.1)

**Mechanism = local MCP write-tools (drafting) + GitHub Action (gating & approval-recording).**
A GitHub App is the multi-tenant upgrade, pre-wired via `NemaHost`, shipped later in `ee/`.

```
1. Agent (MCP)  draft_page({path, frontmatter, body})
   → producer writes path.md with status:draft + seeded provenance; `nema check` runs in-proc;
     diagnostics returned so the agent self-corrects BEFORE opening a PR.
2. Agent (MCP)  propose_changes({title, summary})
   → git checkout -b nema/draft/<slug>-<sha>;  commit --trailer "Nema-Provenance: …";
     git push;  gh pr create --label nema:draft.
3. CI (@getnema/actions)  nema check  → all gates + `draft-pages-not-reviewed`
     (a PR may not introduce status:reviewed by itself).  Optional AI editorial review.
4. HUMAN approves the PR in GitHub.  ← the approval gate (reuse GitHub review; no custom UI in v0.1)
5. on pull_request_review==approved → Action runs `nema approve`:
     flips status draft→reviewed; sets last_reviewed=today, review_by=today+SLA;
     appends a provenance transition (reviewer login, ts, commit, pr) + commit trailer; merges.
```

**Provenance recorded in three layers, each doing one job:** (1) **frontmatter `provenance`
block** — canonical, queryable, git-diffable SSOT (what gates read and the UI badge renders); (2)
**git commit trailer** `Nema-Provenance:` on the transition commit — ties content hash to author
+ time, tamper-evident in history; (3) **the GitHub PR-approval event** — the authority the
Action copies into (1)+(2). No sidecar in v0.1 (one SSOT; sidecar reserved only if per-claim data
later bloats frontmatter).

**Lifecycle state machine:** `stub → draft → reviewed`, plus computed `stale` (when
`review_by < today`) and human-set terminal `deprecated`. **Invariant: an agent may only traverse
`stub→draft` and `draft→draft`; every promotion to `reviewed` requires a human PR approval** —
enforced structurally by the `draft-pages-not-reviewed` gate + the approval-triggered Action.

## Provenance-as-data (v0.1 = page-level; per-claim deferred to v0.3)

Frontmatter-primary, Markdown-native, git-diffable. Validated by `ProvenanceSchema` (Zod, in
`@getnema/schema`) + a `provenance-consistency` gate (`reviewed ⇒ reviewed_by + a reviewed
transition`; `authored_by≠human ⇒ model.name set`; every `sources[].id` referenced).

```yaml
provenance:
  schema: 1
  authored_by: ai              # ai | human | mixed
  model: { name: claude-opus-4-8, vendor: anthropic, prompt_ref: .claude/skills/docs-author/SKILL.md@<sha> }
  reviewed_by: { login: alberto, method: github-pr-approval, pr: 42 }
  sources:                     # STRUCTURED, not free-text footnotes
    - { id: src-x, title: "…", url: https://…, kind: primary, retrieved: 2026-06-20 }
  transitions:
    - { to: draft,    by: ai,      ts: 2026-06-20T14:02:00Z, commit: 0b05f2a }
    - { to: reviewed, by: alberto, ts: 2026-06-23T09:10:00Z, commit: 8f51078, pr: 42 }
```

Query via `nema prov <path>` and `nema prov --filter authored_by=ai --status reviewed` (the
dogfood site renders a `/trust` dashboard generalizing the handbook's `/system`).
`@getnema/provenance.toC2PAManifest()` ships as a **typed mapping stub** (page-level → C2PA
assertions) so the data model is attestation-ready; actual signing is the deferred commercial
feature.

## Core ↔ adapter contract (`@getnema/adapter-kit`)

Core hands an adapter a `ContentSource` (`{ pages, getPage, search, renderMarkdown, nav,
provenanceOf, config }`). An adapter implements `RendererAdapter` (`toRendererSource`,
`markdownRoute` — **must return `src.renderMarkdown(page)` verbatim**, `navRoutes`, optional
`provenanceUI`). The contract's teeth: `defineAdapterConformanceTests(adapter)` — the generalized
`check_parity.mjs` — runs in each adapter's CI and asserts **md-parity**, **nav coverage**
(bidirectional), and **anchor resolution** (`github-slugger`). v0.1 Fumadocs adapter: render
pages + `.md` route + nav tree + a `<ProvenanceBadge>` reading `provenanceOf`.

## Repo scaffolding & OSS best practices

- **Licensing:** root `LICENSE`=Apache-2.0, `NOTICE`, per-file SPDX headers, `REUSE.toml` +
  `reuse` check in CI. `ee/` ships empty with a placeholder license note + a `CONTRIBUTING.md`
  clause that `ee/` is out of scope for the core DCO. **DCO (`Signed-off-by`)**, not a CLA.
- **Governance files:** `README`, `CONTRIBUTING` (DCO + `ee/` boundary), `CODE_OF_CONDUCT`
  (Contributor Covenant 2.1), `SECURITY` (private advisories), issue/PR templates (PR template
  dogfoods the loop: "did `nema check` pass / is this `draft` not `reviewed`?"), `GOVERNANCE`,
  `MAINTAINERS`, Changesets `CHANGELOG`.
- **Agent/Claude scaffolding:** `AGENTS.md` + `CLAUDE.md` (ported, now documenting the producer
  loop + provenance rules), `.claude/agents/{writer,editor}.md`, `.claude/skills/docs-author/`,
  `.claude/commands/{draft,propose}.md` wrapping the MCP write-tools. Shipped both in-repo and as
  `create-nema` templates.
- **CI matrix:** `{os:[ubuntu,macos], node:[22,24]}` test/build; `lint`+`typecheck`; a `gates`
  job running `nema check` against `apps/docs` + `examples/minimal` (dogfooding in CI); the
  Changesets release job on `main`.

## Build order (v0.1)

1. **Scaffold** the monorepo: pnpm workspace, Turborepo, `tsconfig.base`, Biome, Vitest, root
   `LICENSE`/`NOTICE`/REUSE/SPDX, governance + `.claude/` + `AGENTS.md`/`CLAUDE.md`, `ee/` stub.
2. **`@getnema/schema`** — domain-neutral base model + Zod `buildSchema()` + `ProvenanceSchema`
   + `LIFECYCLE_STATES`.
3. **`@getnema/core`** — port `loadPages/getPage/search` + add `renderMarkdown`, `resolveConfig`
   (`nema.config.ts`), `nav` builder. Unit tests on the ported BM25/anchor logic.
4. **`@getnema/provenance`** — record types, `readProvenance/recordTransition/verify`,
   frontmatter writer, `toC2PAManifest` stub.
5. **`@getnema/gates`** — port all handbook rules to TS + `provenance-consistency` +
   `draft-pages-not-reviewed`; `runGates()` returning structured diagnostics.
6. **`@getnema/producer`** — `NemaHost` interface, `LocalGitHost` + `GitHubHost` (`gh`),
   `ProducerEngine` (draft→branch→commit-with-trailer→push→PR) and `approve` (state-flip +
   provenance).
7. **`@getnema/mcp`** — read tools (ported) + write tools `draft_page`/`update_page`/
   `propose_changes`/`check`/`request_review` over `@modelcontextprotocol/sdk` (stdio).
8. **`nema`** — `nema init/check/draft/open-pr/approve/prov/mcp` (citty).
9. **`@getnema/adapter-kit`** + **`@getnema/adapter-fumadocs`** (minimal render + `.md` route +
   nav + badge) + conformance tests.
10. **`@getnema/actions`** — gate workflow, approval→flip workflow, freshness watch.
11. **`apps/docs`** authored through the loop + **`examples/minimal`** E2E fixture.

## Verification (the v0.1 acceptance demo)

End-to-end, from a real agent:
1. Register the MCP server (`nema mcp` / `claude mcp add`); from Claude Code call `draft_page`
   then `propose_changes` → a `nema/draft/*` branch + a PR open with `status: draft` and a seeded
   provenance block + a `Nema-Provenance` commit trailer.
2. CI runs `nema check`: all gates pass; the `draft-pages-not-reviewed` gate confirms the PR
   does **not** self-promote to `reviewed`.
3. A human approves the PR in GitHub → the Action runs `nema approve` → frontmatter flips
   `draft→reviewed`, `last_reviewed`/`review_by` set, a `reviewed` transition + trailer appended,
   PR merged.
4. `nema prov <path>` prints the full chain (ai-authored → model → sources → human reviewer →
   timestamps/commits); the Fumadocs `/trust` view renders the badge.
5. CI green proves dogfooding: the product validates its own docs with its own gates.

Also: unit tests (BM25/anchors/gates), adapter **conformance tests** green for Fumadocs, and
`reuse lint` + typecheck + Biome clean.

## Confirm at scaffold time

- **Repo location** — propose a sibling dir, e.g. `/Users/alberto/Documents/Code/nema`
  (placeholder), fresh `git init`, new GitHub repo. Adjust on approval.
- **Name** — placeholder `@getnema/*` / `nema` until you pick + verify availability; rename
  before first publish.

## Deferred (named, with reason)

Per-claim provenance + structured-sources-replace-footnotes (v0.3) · Starlight/Astro adapter
(v0.3, proves the boundary) · configurable profiles (v0.2) · cryptographic signing / signed C2PA
/ SLSA (commercial "managed attestation") · GitHub App + HTTP/SSE MCP transport (multi-tenant,
`ee/`) · `create-nema` polish (v0.2) · MDX-components-as-data, i18n provenance, multi-repo
federation (post-1.0).
