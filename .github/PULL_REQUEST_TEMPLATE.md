<!-- SPDX-License-Identifier: Apache-2.0 -->

## What & why

<!-- What does this change and why? Link issues. -->

## Checklist

- [ ] `pnpm check` is green (lint + typecheck + test + build)
- [ ] Commits are signed off (`git commit -s`, DCO)
- [ ] Conventional Commit messages
- [ ] Added a changeset if a published package changed (`pnpm changeset`)
- [ ] SPDX header on any new source files
- [ ] Did not touch `ee/`

## If this PR changes docs (the producer loop)

- [ ] `forge check` passed
- [ ] Pages are **`draft`**, not self-promoted to `reviewed` (promotion happens on human approval)
- [ ] The `provenance` block is filled honestly (`authored_by`, `model`, structured `sources`)
