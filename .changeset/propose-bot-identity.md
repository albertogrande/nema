---
'@getnema/producer': minor
'@getnema/cli': minor
'@getnema/mcp': patch
---

Bot identity for the propose step — fixes the solo-maintainer deadlock (#93).

The one invariant needs the draft-PR author and the human approver to be different
forge accounts, because GitHub forbids approving your own pull request. When
`nema open-pr` / `propose_changes` run with the maintainer's own `gh` auth — the
default for a solo maintainer driving an agent — the loop deadlocks: nothing can
ever be promoted.

- `NEMA_PROPOSE_TOKEN` (machine-user PAT or GitHub-App installation token): when
  set, propose commits, the branch push, and the PR creation all authenticate as
  the bot, so any human maintainer can approve. `NEMA_BOT_NAME` / `NEMA_BOT_EMAIL`
  override the committer identity (default `nema-bot`).
- `resolveProposeIdentity()` / `GitHubHost(cwd, { identity })` in the producer;
  the CLI and MCP server pick the env up automatically.
- `nema open-pr` prints which identity it proposes with, and warns about the
  deadlock when proposing with the ambient identity.
- `nema doctor` gains a propose-identity governance check: warns when no
  `NEMA_PROPOSE_TOKEN` is set or when it resolves to the same account that
  approves.
