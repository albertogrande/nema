<!-- SPDX-License-Identifier: Apache-2.0 -->

# Contributing to Nema

Thanks for your interest in contributing. This page is the practical how-to; the legal and
mechanical basics follow below.

## Start in the right place

| I want to… | Go to | Notes |
|---|---|---|
| **Report a bug** or wrong behavior | **[Open an issue](../../issues/new/choose)** → Bug report | Concrete and reproducible. A maintainer triages it. |
| **Request a feature / share an idea** | **[Open an issue](../../issues/new/choose)** → Feature request | Describe the problem first, then the shape you'd want. |
| **Author or revise a docs page** | The **[producer loop](#dogfooding-the-producer-loop)** | An agent drafts → you approve. Never hand-promote to `reviewed`. See [CLAUDE.md](CLAUDE.md). |
| **Fix a typo, wording, or bump a dep** | **A pull request** (trivial fast-lane) | No prior issue needed — see below. |
| **Change engine code** | **A pull request** | Keep it focused; add a changeset for package-affecting changes. |
| **Report a security vulnerability** | **[SECURITY.md](SECURITY.md)** | Do **not** open a public issue. |

### When can I just open a PR?

The **trivial fast-lane** — open directly, no prior issue needed: typo and wording fixes, doc
corrections, dependency bumps, comment fixes, obvious one-line CI tweaks. Anything more
substantial is best filed as an issue first, so the *why* is agreed before the *how* is reviewed.

> **The founding maintainer** follows a separate internal process and isn't bound by the intake
> rules above. Everyone is bound by review, green CI, and the `draft-pages-not-reviewed` gate.

## Developer Certificate of Origin (DCO)

We use the [DCO](https://developercertificate.org/), **not** a CLA. By signing off on your
commits you certify that you wrote the patch or otherwise have the right to submit it under the
project's license.

Sign off every commit:

```bash
git commit -s -m "feat(core): add nav builder"
```

This appends a `Signed-off-by: Your Name <you@example.com>` trailer. Please sign off every commit
(a DCO check is on the alpha roadmap; for now it is expected but not yet machine-enforced).

## The `ee/` boundary

The reserved [`ee/`](ee) directory is **out of scope** for this repository's Apache-2.0 license
and for the core DCO. It is empty in v0.x and reserved for a future source-available commercial
tier. Do not contribute code to `ee/`; PRs touching it will be declined.

## Commit conventions

- **[Conventional Commits](https://www.conventionalcommits.org/)** — `type(scope): subject`. We
  follow this convention; it is not yet machine-enforced (commitlint is on the roadmap).
- Add a **[Changeset](https://github.com/changesets/changesets)** for any change that affects a
  published package: `pnpm changeset`.

## Dogfooding the producer loop

Documentation under `apps/docs/` is authored **through the producer loop** — an agent drafts,
CI gates, a human approves. When you change docs, the PR template asks:

- Did `nema check` pass?
- Is this page `draft` (not self-promoted to `reviewed`)?

## Local development

```bash
pnpm install
pnpm check        # lint + typecheck + test + build — must be green before you open a PR
```

- TypeScript, ESM-only, `strict` + `noUncheckedIndexedAccess`.
- [Biome](https://biomejs.dev/) for lint + format: `pnpm lint`, `pnpm format`.
- [Vitest](https://vitest.dev/) for tests.
- License headers: every source file carries an SPDX Apache-2.0 license header comment;
  `reuse lint` runs in CI.

## Reporting security issues

Please do **not** open public issues for vulnerabilities. See [SECURITY.md](SECURITY.md).
