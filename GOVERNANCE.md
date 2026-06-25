<!-- SPDX-License-Identifier: Apache-2.0 -->

# Governance

Forge is in its **founding phase**. Governance is intentionally lightweight and will formalize
as the contributor base grows.

## Roles

- **Maintainers** — listed in [MAINTAINERS.md](MAINTAINERS.md). They review and merge PRs, cut
  releases, and steward the roadmap. In v0.x the founding maintainer holds final say.
- **Contributors** — anyone who submits a PR under the [DCO](CONTRIBUTING.md).

## Decision making

Day-to-day changes proceed by **lazy consensus**: a PR with maintainer approval and green CI may
merge. Substantial or directional changes (new packages, breaking schema changes, the open-core
boundary) are proposed as an issue or discussion first and require explicit maintainer sign-off.

## The open-core boundary

The whole engine is and remains Apache-2.0. The reserved [`ee/`](ee) directory is the only place
where a future source-available commercial tier may live; moving functionality from core into
`ee/` is a directional decision and will never silently relicense existing core code.

## Releases

Versioning and changelogs are managed with [Changesets](https://github.com/changesets/changesets).
Releases are published from `main` with `npm publish --provenance`.
