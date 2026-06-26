---
"@getnema/producer": minor
"@getnema/actions": patch
---

Harden the approval gate: merge promotions through branch protection instead of `gh pr merge --admin`.

Adds `NemaHost.merge(pr, opts)` — built on a pure `ghMergeArgs` helper that never emits `--admin` —
and switches the approval Action to a `GitHubHost` with auto-merge. The promotion commit is pushed
under a dedicated `NEMA_PROMOTE_TOKEN` so it re-triggers CI, then GitHub auto-merge completes the
squash merge once the required checks pass. A page now reaches `reviewed` only when both a human
approval and a green promotion build are present — no admin override, no weakened branch protection.
