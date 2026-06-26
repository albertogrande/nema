# Nema — Session Handoff

_Last updated: 2026-06-26_

This session took Nema from "P0 idea" to **published on npm (0.1.0) and working end-to-end**.
This doc is the pick-up point for the next session.

---

## TL;DR — current state

- **`nema@0.1.0` is live on npm.** A clean-machine trial passes:
  ```
  npm create nema my-docs
  cd my-docs && npm install
  npm run check    →  ✓ nema check: all gates passed (1 page)
  ```
- **`main` is green** and all of P0 + P1 (audit) + the scope rename are merged.
- Three small **cleanup items remain** (below). None block usage; #1 is worth doing soon
  because the release workflow currently red-fails on every push.

---

## What shipped this session

| Area | What | PRs (merged) |
|---|---|---|
| **P0 — moat hardening** | I1 migration-bypass gate fix · I2 HTTP-MCP bearer auth · I3 `nema doctor` governance checks | [#12], [#13], [#14] |
| **P1 — surface governance** | I4 corpus-wide review trail (`nema audit` + `/trust` trail) | [#15] |
| **Scope finalize** | `@nema/*` → `@getnema/*`; CLI → `@getnema/cli` (bin stays `nema`); scaffolder `create-nema` | [#16], [#23] |
| **Publish (I6)** | enable release · 0.1.0-not-1.0.0 · NPM_TOKEN env · drop provenance · pnpm publish · create-nema 0.1.1 | [#17]–[#24] |

[#12]: https://github.com/albertogrande/nema/pull/12
[#13]: https://github.com/albertogrande/nema/pull/13
[#14]: https://github.com/albertogrande/nema/pull/14
[#15]: https://github.com/albertogrande/nema/pull/15
[#16]: https://github.com/albertogrande/nema/pull/16
[#17]: https://github.com/albertogrande/nema/pull/17
[#23]: https://github.com/albertogrande/nema/pull/23
[#24]: https://github.com/albertogrande/nema/pull/24

### What these features are (one-liner each)
- **I1 — migration-bypass fix** (`@getnema/gates`): the `draft-pages-not-reviewed` gate skipped
  PR-evidence for `reviewed_by.method:'migration'`, letting a hand-edited page self-promote to
  `reviewed`. Now an injected git-backed `GitState` (`createFsGitState`) trusts `migration` only on a
  genuine first import. **Caveat:** full PR enforcement needs CI to fetch the base branch
  (`fetch-depth: 0`, added to the gates job); the broader "check PR-changed pages in CI" is a TODO.
- **I2 — MCP bearer auth** (`@getnema/mcp`): optional `Authorization: Bearer` (SHA-256, constant-time)
  on the HTTP transport via `$NEMA_MCP_TOKEN`; `/health` open; stdio/dev unaffected.
- **I3 — `nema doctor`**: extended the existing env doctor with governance checks (SSOT
  `ContentModelSchema` validation, CI-scope, promote-token, branch-protection). Read-only.
- **I4 — `nema audit`** (`@getnema/core` `buildAuditView`): flattens every page's
  `provenance.transitions[]` into a filterable corpus-wide trail; `method:'migration'` is shown so a
  suspicious promotion is visible. Plus an expandable `/trust` "Review trail" column.

---

## Published to npm (0.1.0)

Scope `@getnema` (org `getnema`, owner grandetemprado). All `0.1.0` except `create-nema@0.1.1`:

```
@getnema/cli (bin: nema) · create-nema · @getnema/core · @getnema/schema · @getnema/provenance
@getnema/gates · @getnema/mcp · @getnema/producer · @getnema/adapter-kit · @getnema/adapter-fumadocs
```

Install: `npm i -g @getnema/cli` → `nema`. Scaffold: `npm create nema`. (Private/unpublished:
`@getnema/docs`, `@getnema/actions`, `@getnema/example-minimal`.)

---

## Remaining cleanup (prioritized)

### 1. Release idempotency — DO FIRST
`package.json` `"release"` is currently `pnpm -r publish --no-git-checks --access public`. pnpm
**errors (E403 "cannot publish over previously published versions")** when it re-hits an
already-published package, so **every push to `main` now red-fails the Release workflow**.
- **Fix:** revert `"release": "changeset publish"`. The crash that forced the pnpm switch is gone
  (it was the blocked `nema` name + provenance, both resolved); `changeset publish` queries npm first
  and cleanly *skips* already-published versions.

### 2. README / QUICKSTART rewrite
Lead with the real, working flow: `npm create nema` and `npm i -g @getnema/cli` (bin `nema`).
**Do NOT pitch `npx nema`** — the unscoped `nema` name is permanently npm-blocked (similarity filter).

### 3. npm Trusted Publishing
Switch CI from the token to OIDC trusted publishing (per package, on npmjs.com → package settings →
trusted publisher = this repo's `Release` workflow). Restores **provenance** and lets us **drop the
`NPM_TOKEN` secret** (it's a 30-day token, expires ~2026-07-26). `release.yml` already has
`id-token: write`.

---

## P2 backlog (from the OmniGraph borrow analysis)

- **I5 — Policy-as-code gate bundle**: a Zod-validated per-repo policy that activates the dormant
  `warning` severity (engine has `warningCount`; no rule emits 'warning'). Per-path severity tiers for
  discretionary gates (links/reachability). **Ring-fence:** the agent→reviewed invariant + migration
  constraint stay hardcoded; freshness may be re-tiered per-path but **never** a global off switch.
- **I7 — Agent "operate Nema" setup skill** (mostly repackaging CLAUDE.md + the loop; gated on npm,
  now unblocked).
- **I8 — Cookbooks / domain starter packs** (content-model + pages + tuned policy per vertical).

Also worth doing: finish the I1 story by running `nema check` over **PR-changed pages** in CI (the
dogfood job still only checks `examples/minimal` + `apps/docs`; `nema doctor` already *warns* about
this).

---

## Context / gotchas for next session

- **Merge flow:** branch protection requires an approving review, but the solo owner authors the PRs
  and can't self-approve → merges use GitHub's **"Merge without waiting for requirements (bypass
  rules)"** checkbox. Legitimate for a one-maintainer repo. ("Allow GitHub Actions to create and
  approve pull requests" is enabled in repo settings — needed for the changesets Version PR.)
- **The invariant is sacred:** agents move pages `stub→draft`/`draft→draft` only; `→reviewed` needs a
  human PR approval. See `CLAUDE.md`. Never self-promote.
- **Publish learnings** (all resolved, but for the record):
  1. `changesets/action` only uses token auth when it finds an env var literally named `NPM_TOKEN`
     (not just `NODE_AUTH_TOKEN`), else it falls back to OIDC trusted publishing.
  2. `NPM_CONFIG_PROVENANCE: true` triggers a `changesets@2.31.0` crash (`TypeError ...
     isAlreadyPublishedError`) on first publish — off for now; comes back via Trusted Publishing.
  3. Unscoped short names (`nema`) are blocked by npm's similarity filter → scoped or distinct names.
- **Verify locally before pushing:** `pnpm build && pnpm typecheck && pnpm test` (21 test suites);
  lint with `pnpm exec biome check packages apps` (root `pnpm lint` also scans `.claude/worktrees`
  which may contain unrelated errors).
