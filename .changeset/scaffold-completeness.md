---
"create-nema": minor
"@getnema/cli": patch
---

Make a freshly-scaffolded repo pass the product's own `nema doctor`, and give a scaffolded user's
agent the rails it was missing:

- `nema doctor`'s CI-scope check now recognizes the package-manager indirection (`npm run check`,
  `pnpm check`, `yarn check`) that resolves to `nema check` — so the scaffold's own CI step counts
  as gated instead of warning "pull requests are not gated".
- `create-nema` now ships the human-approval workflow (`.github/workflows/nema-approve.yml`): on a
  human PR approval it promotes the PR's changed draft pages to `reviewed` via the published
  `nema approve`, commits the promotion under `NEMA_PROMOTE_TOKEN` (so the merge respects branch
  protection), and enables auto-merge. This wires doctor's "promotion gate" green.
- `create-nema` now ships an agent contract (`AGENTS.md`, plus a `CLAUDE.md` pointer) describing the
  draft → PR → approve loop and the one invariant: only a human PR approval promotes a page to
  `reviewed`.
