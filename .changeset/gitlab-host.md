---
"@docforge/producer": minor
---

Add a GitLab `ForgeHost`. `GitLabHost` creates and merges merge requests via the `glab` CLI
(`glabMrCreateArgs` / `glabMergeArgs`, which — like the GitHub builders — never force-merge past
failing checks; `auto` maps to merge-when-pipeline-succeeds). The producer engine needs no changes
to support it, proving the host abstraction is forge-agnostic.
