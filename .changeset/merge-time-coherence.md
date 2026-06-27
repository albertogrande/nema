---
"@getnema/gates": minor
"@getnema/producer": minor
"@getnema/mcp": minor
"@getnema/cli": minor
---

Add merge-time coherence — the second half of the multi-agent moat.

Page-level slot leasing stops two *live* agents clobbering the *same* page; this closes the
remaining gap — two *draft branches* that each pass `nema check` alone but break the corpus when
merged together.

- `@getnema/gates` ships `runCoherenceGate(corpora, { base })`: it 3-way merges the contributing
  corpora against a baseline (a real line-level `diff3`, so independent edits to a shared page —
  e.g. two agents each adding a nav link — merge cleanly the way git would) and validates the
  *merged* doc-graph. It reports `slot-collision` (a page authored on two branches incompatibly)
  and `merge-coherence` (a link or page one branch breaks for another). Both have `nema explain`
  entries.
- `@getnema/producer` adds corpus loaders: `loadCorpusFromDir`, `loadCorpusAtRef` (via an ephemeral
  `git worktree`, so the live tree is untouched), and `listDraftBranches` to discover the open
  `nema/draft/*` refs that would merge into `main`.
- `@getnema/cli` adds `nema coherence` — auto-discovers the open draft branches and checks their
  merge into `main`, or takes explicit directories / git refs (`--base`, `--json`).
- `@getnema/mcp` exposes the `check_coherence` tool so an agent can verify a fleet's branches merge
  cleanly before requesting review.

`pnpm demo:concurrent` drives the whole moat — leasing + coherence — end to end and is exercised in
CI.
