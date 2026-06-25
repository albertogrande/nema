---
"@docforge/core": minor
"@docforge/cli": minor
---

Add the **trust posture** — a corpus-level read of how much content can be trusted right now.

`computeTrustReport(pages)` in `@docforge/core` aggregates the provenance the gates already
validate into one report: reviewed %, AI-authored %, per-status/per-author counts, the
**AI-authored-but-never-human-reviewed** count (the headline governance risk), the stale/overdue
count, and how many reviewed pages anchor their review to a commit. It is renderer-agnostic and
pure (given `today`), so the new `forge trust` CLI command and the `/trust` dashboard render from
the *same* function and can never disagree.

`forge trust [dir]` prints the scorecard; `--json` emits the full report for CI; `--strict` exits
non-zero when any governance risk exists (unreviewed AI pages, stale pages, or reviewed-but-
unanchored pages), so a team can fail the build on it.

The score keys off recorded review evidence (`provenance.reviewed_by` + a `reviewed` transition),
not the self-asserted `status` string — so hand-editing a page to `status: reviewed` cannot
inflate the trust score (and still fails `forge check`). Reviews are reported as **anchored** (the
`reviewed` transition points at a commit) vs **asserted** (claimed without a commit anchor);
resolving those anchors against git history is `forge audit` (next release).
