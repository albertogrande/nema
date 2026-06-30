<!-- SPDX-License-Identifier: Apache-2.0 -->

# Docs that stay fresh — the code-drift engine

This walkthrough shows how Nema keeps a page honest about the **code it documents**. A page
declares the source it tracks in a frontmatter `code:` block; Nema fingerprints that code's *public
surface* and stamps it as a baseline when a human approves the page. When the code later moves past
that baseline, `nema drift` tells you exactly which pages are now behind — and the agent fixes them
through the normal draft loop.

The key property: drift tracks the **API surface**, not the implementation. Reformatting or a change
inside a function body is *not* drift; a changed parameter type, a new/removed export, or a deleted
source file *is*.

## Run it automatically (self-verifying)

From the repo root, after `pnpm build`:

```bash
pnpm demo:drift
```

The script spins up a throwaway repo and drives the real CLI through the full lifecycle below,
asserting each outcome. It is also exercised in CI, so the engine can't silently regress.

## Run it by hand

Assume a repo with `docs/` content and `src/` code, and `nema` on your `PATH`
(`npm i -g @getnema/cli`, or use `npx @getnema/cli`).

### 1. Bind a page to its source and stamp a baseline

```bash
nema bind api/reference src/api.ts --symbols greet
# → Bound api/reference → src/api.ts [symbols] as cb-api
#   baseline stamped 2026-06-30 (1 symbol(s))

nema drift
# → nema drift — 0 drifted page(s) · 1 bound page(s)
#   ✓ every bound page tracks its code
```

`--symbols` narrows the binding to specific exports (omit it to track the whole module's surface).
The strategy is inferred from the extension — `symbols` for `.ts`/`.js`, `file` for anything else;
override with `--strategy`. Bindings resolve their `source` against `codeRoot` (default the repo
root; set it in `nema.config.ts` for a docs-beside-monorepo layout).

### 2. A body-only change does not drift

Edit the *implementation* of `greet` — its return expression, internal logic — and:

```bash
nema drift --strict      # → exit 0: the API surface is unchanged
```

### 3. A signature change drifts

Change `greet`'s parameter or return type, remove it, or delete the file:

```bash
nema drift --strict
# nema drift — 1 drifted page(s), 1 finding(s) · 1 bound page(s)
#   api/reference
#     ✗ [changed] cb-api: src/api.ts changed since last review — page may be out of date
# → exit 1
```

`--json` emits the same report machine-readably for CI and agents; the `drift` MCP tool returns it
as `structuredContent` so an agent can act on the exact binding. `nema check` also surfaces drift —
as a **warning**, never a build break: code racing ahead of the docs is the signal to act on, not a
reason to fail CI.

### 4. Fix through the loop; approval re-stamps the baseline

The agent re-reads the changed source, updates the page, and re-proposes. A **human approves** the
PR — the only path to `reviewed` — and the approval Action re-stamps the baseline to the
now-current code, exactly as it stamps the freshness dates. Drift is clear again until the code
next moves. (To refresh a baseline by hand on a draft, re-run `nema bind` with the same id+source.)

Run `nema explain code-drift` for the full remediation.
