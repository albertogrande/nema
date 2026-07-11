---
'@getnema/schema': minor
'@getnema/gates': minor
'@getnema/cli': minor
'create-nema': minor
---

Solo-maintainer approval: the `/nema approve` comment-command (#93).

GitHub forbids review-approving your own pull request, so when an agent
proposes under the maintainer's identity the review button never appears —
the solo maintainer could never promote anything. An explicit, permission-
checked `/nema approve` comment on the PR is the same human gate, recorded
honestly:

- schema: new `maintainer-command` review method; the `draft-pages-not-reviewed`
  gate requires it to carry a PR-referencing `reviewed` transition, exactly like
  `github-pr-approval`.
- cli: `nema approve --method maintainer-command`; `nema doctor`'s
  propose-identity check now recognizes a wired comment-command workflow as a
  valid solo mode instead of warning.
- create-nema: scaffolded repos ship `.github/workflows/nema-approve-command.yml`
  out of the box — commenting `/nema approve` (write/admin only, fork-guarded)
  promotes the PR's draft pages and merges. Zero setup for solo maintainers.
