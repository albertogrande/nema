---
'@getnema/cli': minor
---

Harden the approval flow after a human approves (#96): the approval actions
treat the merge as best-effort — the durable outcome is the promotion, so a
blocked merge (checks pending, repo auto-merge disabled) is reported in the
confirmation comment instead of failing the run. `nema doctor` gains a repo
auto-merge governance check and the docs spell out the protected-branch
requirements (`NEMA_PROMOTE_TOKEN` + "Allow auto-merge").
