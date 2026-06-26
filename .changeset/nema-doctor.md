---
"nema": minor
"@getnema/schema": minor
---

Extend `nema doctor` with governance / operator-config checks, complementing its existing
environment diagnostics (Node / git / gh / config / content / gates). In the same report it now
also reports: SSOT content-model validation (new `ContentModelSchema` Zod export from
`@getnema/schema`, plus cross-reference checks for `reviewedRequires` / `boundary` fields — a malformed
model is a hard error), a CI-scope check (parses the workflow YAML and flags `nema check` that runs
only over fixed directories, so PR-changed pages go unvalidated), a promotion-gate check (the
approval workflow is wired with `NEMA_PROMOTE_TOKEN`), and a best-effort branch-protection check via
the `gh` CLI (`--skip-network` to skip). These turn "safety is operator-dependent and unverified"
into checks Nema runs. A non-blocking `doctor` CI job is added.
