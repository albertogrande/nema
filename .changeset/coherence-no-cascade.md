---
"@getnema/gates": patch
---

`nema coherence`: report only the root-cause collision, not derived cascade noise.

When two branches collide on a page (`slot-collision`), that page was being dropped from the
merged graph, which then made the link/reachability pass cry about *every* page that linked to it
(dangling link) or was only reachable through it (fresh orphan) — pure cascade. The gate now keeps
a stand-in (`PageConflict.representative`) for each conflicted page in the graph check, so a
collision surfaces as a single actionable diagnostic instead of a pile of derived `merge-coherence`
errors. Genuine cross-branch breakage (a link a branch breaks without a collision) is still reported.
