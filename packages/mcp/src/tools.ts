// SPDX-License-Identifier: Apache-2.0
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import {
  type ContentSource,
  type Page,
  type ProvenanceView,
  type SearchHit,
  createContentSource,
  provenanceView,
  resolveConfig,
} from '@getnema/core';
import { type GateResult, checkContent, runCoherenceGate } from '@getnema/gates';
import {
  type AcquireLeaseResult,
  type DraftResult,
  GitHubHost,
  type Lease,
  type NemaHost,
  ProducerEngine,
  type ProposeResult,
  acquireLease,
  listDraftBranches,
  loadCorpusAtRef,
  precheckProposeCoherence,
  readLease,
  releaseLease,
} from '@getnema/producer';
import { MATTER_OPTIONS, composeContent } from '@getnema/provenance';
import type { ModelInfo, Source } from '@getnema/schema';
import matter from 'gray-matter';

export interface NemaToolsConfig {
  rootDir: string;
  /** Host for PR operations. Defaults to a GitHub (`gh`) host on the repo. */
  host?: NemaHost;
  reviewSlaDays?: number;
  clock?: () => Date;
}

export interface PageSummary {
  path: string;
  title: string;
  status: string;
  diataxis?: string;
}

export interface DraftPageInput {
  path: string;
  title: string;
  body: string;
  diataxis?: string;
  model?: ModelInfo;
  sources?: Source[];
  /** Stable agent id. When set, the write is refused if another agent holds the page. */
  agent?: string;
}

export interface UpdatePageInput {
  path: string;
  title?: string;
  body?: string;
  frontmatter?: Record<string, unknown>;
  /** Stable agent id. When set, the write is refused if another agent holds the page. */
  agent?: string;
}

export interface ProposeInput {
  title: string;
  summary: string;
  paths?: string[];
}

/**
 * The Nema tool surface — read tools and the write tools that make up the moat.
 * Pure async methods returning structured data; the MCP server is a thin
 * adapter over this class (which keeps it unit-testable without a transport).
 */
export class NemaTools {
  constructor(private readonly cfg: NemaToolsConfig) {}

  private now(): Date {
    return (this.cfg.clock ?? (() => new Date()))();
  }

  private source(): Promise<ContentSource> {
    return createContentSource(this.cfg.rootDir);
  }

  private async engine(): Promise<ProducerEngine> {
    const config = await resolveConfig(this.cfg.rootDir);
    return new ProducerEngine({
      rootDir: this.cfg.rootDir,
      contentRoot: config.contentRoot,
      host: this.cfg.host ?? new GitHubHost(this.cfg.rootDir),
      reviewSlaDays: this.cfg.reviewSlaDays,
      clock: this.cfg.clock,
    });
  }

  // ---- read tools -------------------------------------------------------

  async listPages(): Promise<PageSummary[]> {
    const source = await this.source();
    return source.pages.map((p: Page) => ({
      path: p.path,
      title: p.title,
      status: p.status,
      diataxis: p.diataxis,
    }));
  }

  async getPage(path: string): Promise<{ found: boolean; markdown: string | null }> {
    const source = await this.source();
    const page = source.getPage(path);
    return page
      ? { found: true, markdown: source.renderMarkdown(page) }
      : { found: false, markdown: null };
  }

  /**
   * The trust metadata for a page — kept separate from {@link getPage} so the
   * `get_page` markdown stays byte-identical to the `.md` route (the parity the
   * conformance suite guards).
   */
  async getProvenance(path: string): Promise<{ found: boolean; view: ProvenanceView | null }> {
    const source = await this.source();
    const page = source.getPage(path);
    if (!page) return { found: false, view: null };
    return { found: true, view: provenanceView(page, source.provenanceOf(page.path)) };
  }

  async search(query: string, limit = 8): Promise<SearchHit[]> {
    const source = await this.source();
    return source.search(query, limit);
  }

  async check(): Promise<GateResult> {
    return checkContent(this.cfg.rootDir, { today: this.now() });
  }

  /**
   * Merge-time coherence — the second half of the moat. Validate that the open
   * draft branches (or explicit refs) merge into a coherent doc-graph: no two
   * branches authoring the same page, no merge-broken links or fresh orphans.
   * Materializes each ref in an ephemeral worktree, so the live tree is untouched.
   */
  async checkCoherence(input: { base?: string; refs?: string[] } = {}): Promise<GateResult> {
    const rootDir = this.cfg.rootDir;
    const refs =
      input.refs && input.refs.length > 0 ? input.refs : await listDraftBranches(rootDir);
    const base = await loadCorpusAtRef(rootDir, input.base ?? 'main');
    const corpora = await Promise.all(refs.map((r) => loadCorpusAtRef(rootDir, r)));
    return runCoherenceGate(corpora, { base, today: this.now() });
  }

  // ---- slot leasing (the multi-agent moat) ------------------------------

  /**
   * Claim the authoring slot for a page so concurrent agents don't clobber it.
   * Atomic at the filesystem layer — two agents racing for the same page resolve
   * to one winner. Returns `ok: false` with the current holder on a live lease.
   */
  claimSlot(input: { path: string; agent: string; branch?: string }): AcquireLeaseResult {
    return acquireLease({ rootDir: this.cfg.rootDir, ...input });
  }

  /** Release a slot you hold. */
  releaseSlot(input: { path: string; agent: string }): { released: boolean } {
    return releaseLease({ rootDir: this.cfg.rootDir, ...input });
  }

  /** The current lease for a page, or null if the slot is free. */
  slotFor(path: string): Lease | null {
    return readLease(this.cfg.rootDir, path);
  }

  /**
   * Refuse a write when another agent holds the page; otherwise take/refresh the
   * lease so a concurrent writer is blocked. No-op when `agent` is unset (the
   * single-agent path stays lease-free and backward-compatible).
   */
  private guardSlot(path: string, agent: string | undefined): void {
    if (!agent) return;
    const res = this.claimSlot({ path, agent });
    if (!res.ok) {
      throw new Error(
        `page "${path}" is leased by agent "${res.lease.agent}" (since ${res.lease.ts}) — ` +
          'claim a different page or wait for the lease to release.',
      );
    }
  }

  // ---- write tools ------------------------------------------------------

  async draftPage(input: DraftPageInput): Promise<DraftResult> {
    // Mirror the CLI's guard (cli/commands/draft.ts): an empty body would write a
    // contentless page the gates can't meaningfully check. Reject it here so the
    // MCP write-path and the CLI behave identically.
    if (!input.body || input.body.trim() === '') {
      throw new Error('body is required — a draft page needs Markdown content');
    }
    this.guardSlot(input.path, input.agent);
    const engine = await this.engine();
    return engine.draftPage({
      path: input.path,
      title: input.title,
      body: input.body,
      frontmatter: input.diataxis ? { diataxis: input.diataxis } : undefined,
      authoredBy: 'ai',
      model: input.model,
      sources: input.sources,
    });
  }

  async updatePage(input: UpdatePageInput): Promise<{ filePath: string; result: GateResult }> {
    this.guardSlot(input.path, input.agent);
    const engine = await this.engine();
    const filePath = engine.filePathFor(input.path);
    if (!existsSync(filePath)) {
      throw new Error(`no such page: ${input.path}`);
    }
    const { data, content } = matter(readFileSync(filePath, 'utf8'), MATTER_OPTIONS);
    const fm = { ...((data ?? {}) as Record<string, unknown>) };

    if (input.frontmatter) {
      if (input.frontmatter.status === 'reviewed') {
        throw new Error(
          'agents may not set status: reviewed — promotion happens only via human PR approval',
        );
      }
      Object.assign(fm, input.frontmatter);
    }
    if (input.title) fm.title = input.title;

    writeFileSync(filePath, composeContent(fm, input.body ?? content), 'utf8');
    return { filePath, result: await this.check() };
  }

  /**
   * Non-blocking pre-flight for {@link proposeChanges}: pages the working tree
   * changed that another open draft branch is already authoring (a merge-time
   * `slot-collision` waiting to happen). Best-effort — empty when nothing is
   * concurrent. The server surfaces these as a warning; it never blocks the propose.
   */
  async proposeCoherenceWarnings(): Promise<string[]> {
    const collisions = await precheckProposeCoherence(this.cfg.rootDir);
    return collisions.map((c) => `${c.path}: ${c.message}`);
  }

  async proposeChanges(input: ProposeInput): Promise<ProposeResult> {
    const engine = await this.engine();
    let paths = input.paths;
    if (!paths || paths.length === 0) {
      const source = await this.source();
      paths = source.pages
        .filter((p) => p.status === 'draft' || p.status === 'stub')
        .map((p) => p.path);
    }
    if (paths.length === 0) throw new Error('no draft pages to propose');
    return engine.proposeChanges({ paths, title: input.title, summary: input.summary });
  }

  async requestReview(input: { pr?: number; note?: string }): Promise<{
    message: string;
    pr?: number;
  }> {
    const where = input.pr != null ? ` on PR #${input.pr}` : '';
    return {
      pr: input.pr,
      message:
        `Human review requested${where}. A human must approve the PR in GitHub; on approval the ` +
        'Nema Action runs `nema approve` to promote draft→reviewed. Agents cannot self-approve.' +
        (input.note ? `\nNote: ${input.note}` : ''),
    };
  }
}
