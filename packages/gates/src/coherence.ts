// SPDX-License-Identifier: Apache-2.0
import type { Page, ResolvedConfig } from '@getnema/core';
import { CONTENT_MODEL, type ContentModel } from '@getnema/schema';
import { RULE_CATALOG } from './catalog.js';
import { diff3Merge } from './diff3.js';
import { linkRules } from './rules/links.js';
import { reachabilityRules } from './rules/reachability.js';
import type { Diagnostic, GateContext, GateResult } from './types.js';

/**
 * Merge-time coherence — the second half of the multi-agent moat.
 *
 * Page-level slot leasing (`@getnema/producer`) stops two *live* agents from
 * clobbering the *same* page. Branch isolation lets them author *different* pages
 * in parallel. But each branch is gate-checked *alone*, so the corpus that results
 * from *merging* several draft branches can still be broken in ways no single-branch
 * `nema check` can see:
 *
 *   - two branches create the *same* route (a clobber a missing/expired lease let
 *     through) — `slot-collision`;
 *   - one branch deletes or renames a page another branch links to, so the merged
 *     graph has a dangling link or a fresh orphan — `merge-coherence`.
 *
 * This module 3-way merges the contributing corpora against an optional base
 * (`main`) and validates the *merged doc-graph*. Because every contributing branch
 * is individually gate-green before it can merge, any link/reachability breakage on
 * the union is, by construction, introduced *by the merge itself*.
 */

/** One branch's full view of the corpus (its checked-out content). */
export interface LabeledCorpus {
  /** Human label — a branch name or directory, used in collision messages. */
  label: string;
  pages: Page[];
  config: ResolvedConfig;
}

export interface CoherenceOptions {
  /** The integration baseline (typically `main`). Absent ⇒ a pure union of branches. */
  base?: LabeledCorpus;
  /** Override "today" (UTC) for deterministic tests. */
  today?: Date;
  /** Override the content model. */
  model?: ContentModel;
}

/** A page two or more branches changed incompatibly — an unmergeable conflict. */
export interface PageConflict {
  path: string;
  /** Labels of the branches that changed this page. */
  branches: string[];
  /** add/add (both created it), edit/edit (both edited it), or edit/delete. */
  kind: 'add/add' | 'edit/edit' | 'edit/delete';
  /**
   * A stand-in version of the page (one branch's content, normalized). The merge
   * leaves the real page unresolved, but the graph check treats this as present so
   * the *root-cause* collision isn't drowned out by cascade diagnostics — links into
   * the page resolve and it isn't reported as a fresh orphan.
   */
  representative: Page;
}

/** A page one branch moved: same content, new route. Used to enrich a merge-broken
 * link into the *old* route with "it was renamed to X" instead of a bare dead link. */
export interface Rename {
  from: string;
  to: string;
  /** The branch that performed the move. */
  branch: string;
}

export interface MergeResult {
  /** The integrated corpus, with conflicting pages omitted (so downstream link
   * checks surface the resulting holes). File paths are normalized to a virtual
   * root so file-relative links resolve across branches. */
  merged: Page[];
  conflicts: PageConflict[];
  /** Renames (delete-old + add-new-with-same-content) detected per branch. */
  renames: Rename[];
}

/** A virtual, fs-free content root so file-relative links resolve in the union. */
const VIRTUAL_ROOT = '/__nema_merged__';

/** Compare pages by *meaningful* content — provenance timestamps/commits are volatile. */
function contentSignature(p: Page): string {
  return JSON.stringify({
    title: p.title,
    status: p.status,
    diataxis: p.diataxis ?? null,
    body: p.body,
  });
}

function byPath(pages: Page[]): Map<string, Page> {
  return new Map(pages.map((p) => [p.path, p]));
}

function normalize(p: Page): Page {
  return { ...p, filePath: `${VIRTUAL_ROOT}/${p.path}.md` };
}

function toISODateUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type Change =
  | { label: string; kind: 'add' | 'edit'; page: Page; sig: string }
  | { label: string; kind: 'delete' };

/**
 * 3-way merge the corpora against `base`. For each route, decide its fate from how
 * each branch changed it relative to the baseline; record a conflict when branches
 * disagree.
 */
export function mergeCorpora(corpora: LabeledCorpus[], base?: LabeledCorpus): MergeResult {
  const basePages = byPath(base?.pages ?? []);
  const baseSig = new Map<string, string>();
  for (const [path, page] of basePages) baseSig.set(path, contentSignature(page));

  const corpusMaps = corpora.map((c) => ({ label: c.label, map: byPath(c.pages) }));

  // Detect per-branch renames: a baseline page a branch removed, re-appearing under
  // a new route with identical content. Lets the gate point a now-dead link at the
  // new home instead of just flagging it broken.
  const renames: Rename[] = [];
  for (const { label, map } of corpusMaps) {
    const removed = [...basePages.keys()].filter((p) => !map.has(p));
    const added = [...map.keys()].filter((p) => !basePages.has(p));
    const claimed = new Set<string>();
    for (const from of removed) {
      const to = added.find(
        (a) => !claimed.has(a) && contentSignature(map.get(a)!) === baseSig.get(from),
      );
      if (to) {
        claimed.add(to);
        renames.push({ from, to, branch: label });
      }
    }
  }

  const allPaths = new Set<string>(basePages.keys());
  for (const c of corpusMaps) for (const path of c.map.keys()) allPaths.add(path);

  const merged: Page[] = [];
  const conflicts: PageConflict[] = [];

  for (const path of allPaths) {
    const inBase = basePages.has(path);
    const changes: Change[] = [];

    for (const { label, map } of corpusMaps) {
      const page = map.get(path);
      if (!page) {
        if (inBase) changes.push({ label, kind: 'delete' }); // branch removed it
        continue;
      }
      const sig = contentSignature(page);
      if (!inBase) changes.push({ label, kind: 'add', page, sig });
      else if (sig !== baseSig.get(path)) changes.push({ label, kind: 'edit', page, sig });
      // sig === base ⇒ unchanged by this branch
    }

    if (changes.length === 0) {
      // No branch touched it: keep the baseline page if there was one.
      const basePage = basePages.get(path);
      if (basePage) merged.push(normalize(basePage));
      continue;
    }

    const mutations = changes.filter((c) => c.kind !== 'delete') as Extract<
      Change,
      { kind: 'add' | 'edit' }
    >[];
    const deletions = changes.filter((c) => c.kind === 'delete');
    const distinctSigs = new Set(mutations.map((m) => m.sig));

    if (mutations.length > 0 && deletions.length > 0) {
      conflicts.push({
        path,
        branches: changes.map((c) => c.label),
        kind: 'edit/delete',
        representative: normalize(mutations[0]!.page), // the edited side stands in
      });
      continue; // unresolved — omit from the merged graph
    }
    if (mutations.length === 0) {
      continue; // deletions only ⇒ the page is gone from the union
    }
    if (distinctSigs.size === 1) {
      merged.push(normalize(mutations[0]!.page)); // one change, or identical changes
      continue;
    }
    // Several branches changed it differently. With a common ancestor (edit/edit),
    // try a real line-level 3-way merge — independent edits (e.g. each branch adds a
    // nav link) merge cleanly, the way git would. Without one (add/add), it's a true
    // slot collision: two agents created the same page from scratch.
    if (!inBase) {
      conflicts.push({
        path,
        branches: mutations.map((m) => m.label),
        kind: 'add/add',
        representative: normalize(mutations[0]!.page),
      });
      continue;
    }
    const ancestor = basePages.get(path)!.body.split('\n');
    let acc = ancestor;
    let clean = true;
    for (const m of mutations) {
      const r = diff3Merge(ancestor, acc, m.page.body.split('\n'));
      if (!r.clean) {
        clean = false;
        break;
      }
      acc = r.lines;
    }
    if (!clean) {
      conflicts.push({
        path,
        branches: mutations.map((m) => m.label),
        kind: 'edit/edit',
        representative: normalize(mutations[0]!.page),
      });
      continue;
    }
    merged.push(normalize({ ...mutations[0]!.page, body: acc.join('\n') }));
  }

  merged.sort((a, b) => a.path.localeCompare(b.path));
  return { merged, conflicts, renames };
}

/** Build the gate context for the merged doc-graph (virtual root, base config). */
function mergedContext(
  merged: Page[],
  corpora: LabeledCorpus[],
  options: CoherenceOptions,
): GateContext {
  const baseConfig = options.base?.config ?? corpora[0]?.config;
  const config: ResolvedConfig = baseConfig
    ? { ...baseConfig, contentRoot: VIRTUAL_ROOT }
    : {
        rootDir: VIRTUAL_ROOT,
        contentDir: '.',
        contentRoot: VIRTUAL_ROOT,
        codeRoot: VIRTUAL_ROOT,
        reviewSlaDays: 180,
        rootExempt: ['index'],
        baseUrl: '',
      };
  return {
    pages: merged,
    config,
    model: options.model ?? baseConfig?.contentModel ?? CONTENT_MODEL,
    today: toISODateUTC(options.today ?? new Date()),
  };
}

function withHints(diagnostics: Diagnostic[]): Diagnostic[] {
  return diagnostics.map((d) => (d.hint ? d : { ...d, hint: RULE_CATALOG[d.rule]?.hint }));
}

/**
 * Validate that several draft branches can merge into a coherent corpus. Returns a
 * standard {@link GateResult} (so `formatGateResult` / `--json` work unchanged):
 * `slot-collision` errors for unmergeable pages, `merge-coherence` errors for a
 * doc-graph the merge would break.
 */
export function runCoherenceGate(
  corpora: LabeledCorpus[],
  options: CoherenceOptions = {},
): GateResult {
  const { merged, conflicts, renames } = mergeCorpora(corpora, options.base);
  const raw: Diagnostic[] = [];

  // Index renames by the *old* route so a broken link into it can name the new home.
  const renamedFrom = new Map(renames.map((r) => [r.from, r]));
  const renameNote = (message: string): string => {
    const arrow = message.lastIndexOf('-> ');
    if (arrow === -1) return message;
    const target = message
      .slice(arrow + 3)
      .trim()
      .replace(/#.*$/, '')
      .replace(/^\//, '')
      .replace(/\.md$/, '');
    const r = renamedFrom.get(target);
    return r
      ? `${message} — '/${r.from}' was renamed to '/${r.to}' on ${r.branch}; update the link`
      : message;
  };

  for (const c of conflicts) {
    raw.push({
      rule: 'slot-collision',
      severity: 'error',
      path: c.path,
      message:
        'authored on multiple branches without a shared lease ' +
        `(${c.branches.join(', ')}) — ${c.kind} conflict`,
    });
  }

  // Check the graph over the resolved pages PLUS a stand-in for each conflicted page.
  // A `slot-collision` is the root cause; including its representative keeps that
  // collision from cascading into derived `merge-coherence` noise (dangling links to
  // it, or pages orphaned because their only inbound link sat on the conflicted page).
  const graphPages = [...merged, ...conflicts.map((c) => c.representative)].sort((a, b) =>
    a.path.localeCompare(b.path),
  );
  const ctx = mergedContext(graphPages, corpora, options);
  for (const d of [...linkRules(ctx), ...reachabilityRules(ctx)]) {
    raw.push({
      rule: 'merge-coherence',
      severity: 'error',
      path: d.path,
      message: renameNote(`merged doc-graph broken — ${d.message}`),
    });
  }

  const diagnostics = withHints(raw).sort(
    (a, b) => a.path.localeCompare(b.path) || a.rule.localeCompare(b.rule),
  );
  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;
  return { diagnostics, errorCount, warningCount, ok: errorCount === 0, checked: merged.length };
}
