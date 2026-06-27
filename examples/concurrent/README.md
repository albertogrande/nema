<!-- SPDX-License-Identifier: Apache-2.0 -->

# Two-agent concurrent authoring — the multi-agent moat

This walkthrough shows the structural moat end to end: **many of your agents author the same
corpus at once without clobbering each other, and a gate refuses any merge that would break the
doc-graph.** Two halves work together:

- **Page-level slot leasing** (`nema claim` / `release_slot`, `claim_slot`) — stops two *live*
  agents writing the *same* page. Atomic at the filesystem layer; no coordination server.
- **Merge-time coherence** (`nema coherence`, the `check_coherence` MCP tool) — stops two *draft
  branches* from merging into a broken corpus: a page authored on two branches (`slot-collision`)
  or a link/page one branch breaks for another (`merge-coherence`).

Each draft branch is gate-green on its own (`nema check`). Coherence is what proves they still
form a valid corpus *together*.

## Run it automatically (self-verifying)

From the repo root, after `pnpm build`:

```bash
pnpm demo:concurrent
```

The script spins up a throwaway git repo and drives the real CLI through the three scenarios
below, asserting each outcome. It is also exercised in CI, so the moat can't silently regress.

## Run it by hand (two terminals)

Assume a repo with a base corpus on `main` and `nema` on your `PATH`
(`npm i -g @getnema/cli`, or use `npx @getnema/cli`).

### 1. Leasing prevents a live clobber

```bash
# terminal A
nema claim api/options --agent agent-a      # → claimed

# terminal B
nema claim api/options --agent agent-b      # → REFUSED: leased by agent-a
nema claim api/errors  --agent agent-b      # → claimed (a different page)
```

Pass the same `--agent` id to the MCP `draft_page` / `update_page` tools and a write to a page
another agent holds is refused — the lease travels with the write.

### 2. Disjoint concurrent work merges cleanly

Each agent authors on its own `nema/draft/<agent>` branch, touching different sections:

```bash
# agent-a's branch adds guides/setup and links it from the guides index
# agent-b's branch adds api/errors and links it from the api index

nema coherence                               # auto-discovers nema/draft/* branches
# → ✓ all gates passed — the union is a valid doc-graph
```

### 3. The gate is the backstop when leases were skipped

If two branches both create `api/options` (because no one claimed the slot):

```bash
nema coherence
# ✗ [slot-collision] api/options: authored on multiple branches without a shared lease
#     (nema/draft/agent-a, nema/draft/agent-b) — add/add conflict
# → exit 1: the merge is refused
```

`nema coherence` also accepts explicit directories or refs — handy for ad-hoc checks and the
two-worktree demo:

```bash
nema coherence ./checkout-a ./checkout-b --base ./main   # directories
nema coherence nema/draft/agent-a nema/draft/agent-b --base main   # git refs
```

Run `nema explain slot-collision` or `nema explain merge-coherence` for the full remediation.
