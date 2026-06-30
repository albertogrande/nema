// SPDX-License-Identifier: Apache-2.0

/**
 * Documentation for one gate rule: the SSOT behind every actionable diagnostic.
 *
 * A diagnostic's `message` says *what* is wrong; the catalog says *how to fix it*
 * (`hint`, shown inline) and *why the gate exists* (`details`, shown by
 * `nema explain <rule>`). Keeping this in one place means the inline help, the
 * `explain` command, and any future docs can never drift from each other.
 */
export interface RuleDoc {
  /** Stable rule id — also the lookup key for `nema explain <id>`. */
  id: string;
  /** Short human title. */
  title: string;
  /** One line: what the gate checks. */
  summary: string;
  /**
   * Short, imperative remediation rendered inline after a diagnostic
   * (the `help:` line, in the spirit of rustc/cargo). Keep it to one sentence.
   */
  hint: string;
  /** Longer guidance for `nema explain <rule>` — why the gate exists and how to satisfy it. */
  details: string;
}

/**
 * Every rule id a {@link Diagnostic} can carry, with its remediation. The keys
 * are the exact `Diagnostic.rule` values emitted by the rules in `./rules/*`,
 * plus `empty-corpus` (emitted by the engine when no pages are found).
 */
export const RULE_CATALOG: Record<string, RuleDoc> = {
  'frontmatter-required': {
    id: 'frontmatter-required',
    title: 'Required frontmatter is present',
    summary: 'Every page must declare the required frontmatter keys (e.g. `title`, `status`).',
    hint: "Add the missing key to the page's YAML frontmatter.",
    details:
      'The content model marks some frontmatter keys as required for every page. A page that ' +
      'omits one cannot be governed (its status/lifecycle is unknown), so the gate fails.\n\n' +
      'Fix: open the page and add the missing key to the `---` frontmatter block, e.g.\n' +
      '  title: Getting started\n  status: draft\n' +
      'The required set is configurable via the content model; the defaults are `title` and `status`.',
  },
  'enums-valid': {
    id: 'enums-valid',
    title: 'Enum fields use an allowed value',
    summary: 'Fields like `status` and `diataxis` must use a value from their allowed set.',
    hint: 'Change the value to one of the allowed options listed in the message.',
    details:
      'Some frontmatter fields are closed enumerations. `status` must be one of ' +
      '`stub | draft | reviewed | deprecated`; `diataxis` must be one of ' +
      '`tutorial | how-to | reference | explanation | overview`.\n\n' +
      'Fix: replace the offending value with one from the allowed set printed in the diagnostic. ' +
      'Note that an agent may never set `status: reviewed` directly — see `draft-pages-not-reviewed`.',
  },
  'dates-valid': {
    id: 'dates-valid',
    title: 'Date fields are well-formed',
    summary: 'Date frontmatter (`last_reviewed`, `review_by`) must be a valid `YYYY-MM-DD` string.',
    hint: 'Write the date as YYYY-MM-DD (e.g. 2026-06-25), unquoted or quoted.',
    details:
      'Freshness governance compares dates lexicographically, which only works for zero-padded ' +
      'ISO-8601 calendar dates (`YYYY-MM-DD`). A malformed or non-calendar date fails the gate.\n\n' +
      'Fix: rewrite the value as a four-digit year, two-digit month, two-digit day — e.g. ' +
      '`2026-06-25`. Avoid locale formats like `06/25/2026` or partial dates like `2026-6`.',
  },
  freshness: {
    id: 'freshness',
    title: 'Reviewed pages are fresh',
    summary:
      'A `reviewed` page must satisfy `last_reviewed ≤ today < review_by` — overdue pages fail.',
    hint:
      'A human re-review (via the approval loop) refreshes these dates; ' +
      'do not hand-edit them on a reviewed page.',
    details:
      'Freshness is the SLA with teeth. For a `reviewed` page the invariant is ' +
      '`last_reviewed ≤ today < review_by`: a missing date, a `last_reviewed` in the future, a ' +
      '`review_by` that has passed (overdue), or `review_by ≤ last_reviewed` all fail.\n\n' +
      'Fix: an overdue page needs a fresh human review — re-approving it through the producer loop ' +
      'restamps `last_reviewed`/`review_by` automatically. As an agent you cannot satisfy this gate ' +
      'by editing dates; surface the page to a human reviewer instead.',
  },
  footnotes: {
    id: 'footnotes',
    title: 'Footnotes are balanced',
    summary: 'Every `[^id]` reference must have a matching `[^id]:` definition, and vice versa.',
    hint: 'Define the referenced footnote, or remove the dangling reference/definition.',
    details:
      'Citations use Markdown footnotes. A reference (`[^src-1]`) with no definition renders as ' +
      'literal text; a definition no one references is dead weight. Both fail the gate.\n\n' +
      'Fix: for a referenced-but-undefined footnote, add a `[^id]: ...` definition (usually under ' +
      '`## Sources`). For a defined-but-unreferenced one, cite it in the prose with `[^id]` or delete it. ' +
      'Code spans are ignored, so example syntax inside backticks is safe.',
  },
  citations: {
    id: 'citations',
    title: 'Footnoted pages cite their sources',
    summary: 'A page that uses footnotes must include a `## Sources` section.',
    hint: 'Add a `## Sources` section listing the footnote definitions.',
    details:
      'Footnotes are how a page carries citations, and citations must be collected somewhere a ' +
      'reader (or an auditing agent) can find them. A page with footnotes but no `## Sources` ' +
      'heading fails.\n\n' +
      'Fix: add a `## Sources` (or deeper) heading and place your `[^id]: ...` definitions under it. ' +
      'If the footnotes back AI-authored claims, also list them as structured `provenance.sources` ' +
      'entries whose `id` matches the footnote (see `provenance-consistency`).',
  },
  'links-resolve': {
    id: 'links-resolve',
    title: 'Internal links resolve',
    summary: 'Every internal Markdown link must point to a real page.',
    hint: 'Fix the link path, or create the page it points to.',
    details:
      'Internal links may be route-absolute (`/guide/intro`) or file-relative (`../intro.md`). The ' +
      'gate resolves each against the corpus; a target that does not exist is a broken link.\n\n' +
      'Fix: correct the path (check the leading slash and any `../` segments), or author the missing ' +
      'page. External links (`http(s):`, `mailto:`, …) are not checked.',
  },
  'anchors-resolve': {
    id: 'anchors-resolve',
    title: 'Link anchors resolve',
    summary: 'A `#anchor` in an internal link must match a heading on the target page.',
    hint: 'Fix the #anchor to match a heading slug, or add the heading.',
    details:
      'A link like `/guide/intro#install` must find a heading on `guide/intro` whose slug is ' +
      '`install`. Heading slugs are lower-cased, with spaces turned to hyphens. A missing anchor fails.\n\n' +
      'Fix: correct the `#anchor` to match an existing heading slug, or add the heading to the target ' +
      'page. Verify the slug — `## Install the CLI` becomes `#install-the-cli`.',
  },
  reachability: {
    id: 'reachability',
    title: 'Pages are reachable',
    summary: 'Every non-entry page must be linked from at least one other page (no orphans).',
    hint: 'Link to the page from another page, or list its path in `rootExempt`.',
    details:
      'An orphan page — reachable by no internal link — is invisible to readers navigating the ' +
      'docs. Entry points are exempt: the root `index`, any per-directory `index`, and paths listed ' +
      'in `rootExempt`.\n\n' +
      'Fix: add a link to the orphan from a relevant page (often a section index). If the page is a ' +
      'deliberate entry point (a landing page reached by URL, not by link), add its route path to ' +
      '`rootExempt` in `nema.config.ts`.',
  },
  'provenance-consistency': {
    id: 'provenance-consistency',
    title: 'Provenance is valid and consistent',
    summary:
      'A `provenance` block must be structurally valid and internally consistent ' +
      '(model set for AI authorship, reviewer + transition for reviewed pages, sources referenced).',
    hint: 'Make the provenance block honest and complete — the message names the exact field.',
    details:
      'The provenance block records the trust chain. The gate enforces: `authored_by != human` ⇒ ' +
      '`model.name` is set; `status: reviewed` ⇒ a `reviewed_by` record AND a `reviewed` transition; ' +
      'every declared `sources[].id` is actually referenced (`[^id]`) in the body.\n\n' +
      'Fix: follow the specific field named in the message. If you authored as `ai`/`mixed`, fill ' +
      '`model.name`. If you cite a source, reference it in the prose. Leave `reviewed_by` and ' +
      '`reviewed` transitions to the human-approval Action — never write them yourself.',
  },
  'draft-pages-not-reviewed': {
    id: 'draft-pages-not-reviewed',
    title: 'No self-promotion to reviewed',
    summary:
      'A page may not be `reviewed` without recorded evidence of a human gate ' +
      '(a `reviewed_by` record and a `reviewed` transition).',
    hint: 'Set the page back to `status: draft`. Promotion to reviewed happens only on human PR approval.',
    details:
      'This is the platform invariant, enforced structurally: an agent may only move a page ' +
      '`stub → draft` or `draft → draft`. A `reviewed` page must carry proof of the human gate — a ' +
      '`provenance.reviewed_by` record and a `reviewed` transition (referencing the approving PR for ' +
      'the `github-pr-approval` method).\n\n' +
      'Fix: if you are authoring, keep `status: draft`; the approval-triggered Action runs ' +
      '`nema approve` to promote it after a human approves the PR. A human importing an existing ' +
      'corpus can assert reviewed pages via `nema migrate` (method `migration`).',
  },
  'code-drift': {
    id: 'code-drift',
    title: 'Docs track their code',
    summary:
      'A page bound to source code (a `code:` block) whose bound code has changed since the ' +
      'page was last reviewed — the docs may now be behind the code.',
    hint: 'Re-read the changed source and update the page, then re-propose; approval re-stamps the baseline.',
    details:
      'A page can declare the code it documents in a frontmatter `code:` block — a list of bindings, ' +
      'each pointing at a source file (and optionally specific exported symbols). On approval Nema ' +
      'stamps a fingerprint of that code as the reviewed baseline. The gate recomputes the fingerprint ' +
      'from the current source and warns when it has moved: the surface changed (`symbols` strategy ' +
      'ignores body-only edits), a tracked symbol is no longer exported, or the source file is gone.\n\n' +
      'This is a **warning**, not an error: code racing ahead of the docs is the normal signal to act ' +
      'on, not a build break. Fix: run `nema drift` to see exactly what moved, update the page from the ' +
      'changed source through the normal draft loop, and re-propose. A human approval re-stamps the ' +
      'baseline — agents never stamp a reviewed baseline themselves. Seed/refresh a baseline on a draft ' +
      'with `nema bind <path> <source>`.',
  },
  'slot-collision': {
    id: 'slot-collision',
    title: 'No two branches author the same page',
    summary:
      'Two or more draft branches created or edited the same page incompatibly — a clobber a ' +
      'page lease would have prevented.',
    hint: 'Have one agent claim the page slot (`nema claim <path>`); rebase the other onto its change.',
    details:
      'This is the merge-time backstop for slot leasing. Page-level leases stop two *live* agents ' +
      'from writing the same page, but a missing or expired lease can still let two draft branches ' +
      'each create or edit the same route — each passes `nema check` alone, then collides on merge.\n\n' +
      'The gate reports the conflicting branches and the kind (`add/add`, `edit/edit`, `edit/delete`). ' +
      'Fix: pick one branch as the authority for that page (claim its slot via `nema claim <path> ' +
      '--agent <id>`), drop or rebase the other branch onto it, and re-run `nema coherence`.',
  },
  'merge-coherence': {
    id: 'merge-coherence',
    title: 'The merged doc-graph is coherent',
    summary:
      'Merging the draft branches must not break the doc-graph — no dangling internal links and ' +
      'no newly orphaned pages in the union.',
    hint: 'Re-point or restore the broken link/page, or coordinate the two branches before merging.',
    details:
      'Each draft branch is gate-green on its own, but merging them can still break the corpus: ' +
      'one branch deletes or renames a page another branch links to (a dangling link), or removes ' +
      'the only inbound link to a page (a fresh orphan). Because every branch passed `nema check` ' +
      'in isolation, any link or reachability error on the *merged* graph is introduced by the merge.\n\n' +
      'Fix: the message carries the underlying breakage (a broken link or an orphan) on the merged ' +
      'route. Restore or re-point the target, or sequence the branches so the dependency lands first, ' +
      'then re-run `nema coherence`.',
  },
  'empty-corpus': {
    id: 'empty-corpus',
    title: 'The corpus is not empty',
    summary: 'No pages were found under the content directory — usually a path/config mistake.',
    hint: 'Point `nema check` at the repo root, or fix `contentDir` in nema.config.ts.',
    details:
      'A check that finds zero pages reports "all gates passed" only vacuously — there was nothing ' +
      'to validate. That is almost always a misconfiguration (the wrong directory, or a `contentDir` ' +
      'that does not match where the Markdown lives), so the gate surfaces it as a warning instead of ' +
      'a silent green.\n\n' +
      'Fix: run `nema check <repo-root>` (not the docs subfolder), or set `contentDir` in ' +
      '`nema.config.ts` to the folder that actually contains your `.md` pages. If an empty corpus is ' +
      'expected (a fresh repo before any pages exist), this warning is safe to ignore.',
  },
};

/** All known rule ids, sorted — used by `nema explain` (no-arg) and "did you mean". */
export const RULE_IDS: string[] = Object.keys(RULE_CATALOG).sort();

/** Look up a rule's documentation, or `undefined` if the id is unknown. */
export function ruleDoc(id: string): RuleDoc | undefined {
  return RULE_CATALOG[id];
}
