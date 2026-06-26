---
"@getnema/gates": minor
"nema": patch
---

Close the self-asserted `method:'migration'` reviewed bypass. The `draft-pages-not-reviewed` gate
skipped the PR-evidence requirement for any `reviewed_by.method` other than `github-pr-approval`, so a
hand-edited page could claim `method:'migration'` and pass as `reviewed` with no approval evidence.

The gate now takes an injected, git-backed `GitState` (`createFsGitState`): `method:'migration'` is
trusted only on a genuine first import — a page that already existed at the comparison baseline (the
PR base branch in CI via `GITHUB_BASE_REF`/`NEMA_BASELINE_REF`, else `HEAD`) without it may not
acquire it. `nema check` wires this automatically inside a git work tree. The human-approval invariant
itself is unchanged — only the bypass around it is removed. The rule stays a pure function (the git
subprocess lives in `git-state-fs.ts`) and is inert when no `GitState` is supplied, so the in-process
`nema draft` check, non-git contexts, and existing tests behave exactly as before. For full
enforcement on pull requests, CI must fetch the base branch (e.g. `fetch-depth: 0`); `nema doctor`
flags when it cannot.
