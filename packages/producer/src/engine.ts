// SPDX-License-Identifier: Apache-2.0
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { type Diagnostic, checkContent } from '@getnema/gates';
import {
  composeContent,
  readProvenance,
  recordTransition,
  seedProvenance,
} from '@getnema/provenance';
import type { AuthoredBy, ModelInfo, Source } from '@getnema/schema';
import type { NemaHost, PullRequestRef } from './host.js';
import { draftBranchName } from './slug.js';
import { PROVENANCE_TRAILER_KEY, formatProvenanceTrailer } from './trailer.js';
import { type ReviewerRef, addDays, flipToReviewed, toISODate } from './transitions.js';

export interface ProducerConfig {
  rootDir: string;
  /** Absolute path to the content directory (where `.md` pages live). */
  contentRoot: string;
  /** Absolute root that `code:` bindings resolve against. Default `rootDir`. */
  codeRoot?: string;
  host: NemaHost;
  /** Freshness SLA in days. Default 180. */
  reviewSlaDays?: number;
  /** Injectable clock for deterministic behavior. Default `() => new Date()`. */
  clock?: () => Date;
  /** Default PR base branch. Default `main`. */
  base?: string;
}

export interface DraftInput {
  /** Route path (no `.md`), e.g. `guide/intro`. */
  path: string;
  title: string;
  body: string;
  /** Additional frontmatter (diataxis, etc.). `title`/`status`/`provenance` are managed. */
  frontmatter?: Record<string, unknown>;
  authoredBy?: AuthoredBy;
  model?: ModelInfo;
  sources?: Source[];
}

export interface DraftResult {
  path: string;
  filePath: string;
  /** Diagnostics for THIS page from an in-process `nema check`. */
  diagnostics: Diagnostic[];
  ok: boolean;
}

export interface ProposeInput {
  paths: string[];
  title: string;
  summary: string;
  base?: string;
  labels?: string[];
}

export interface ProposeResult {
  branch: string;
  commit: string;
  pullRequest: PullRequestRef;
}

export interface ApproveInput {
  path: string;
  reviewer: ReviewerRef;
  /** SHA recorded on the reviewed transition (defaults to host HEAD). */
  commit?: string;
  today?: Date;
}

export interface ApproveResult {
  path: string;
  filePath: string;
  lastReviewed: string;
  reviewBy: string;
}

/**
 * The producer engine. Drives the v0.1 loop: `draftPage` (write + self-check),
 * `proposeChanges` (branch → trailer commit → push → PR), and `approve`
 * (the human-gated flip to `reviewed`).
 */
export class ProducerEngine {
  constructor(private readonly cfg: ProducerConfig) {}

  private now(): Date {
    return (this.cfg.clock ?? (() => new Date()))();
  }

  private sla(): number {
    return this.cfg.reviewSlaDays ?? 180;
  }

  filePathFor(path: string): string {
    return join(this.cfg.contentRoot, `${path}.md`);
  }

  /** Write a new draft page with seeded provenance, then run gates in-process. */
  async draftPage(input: DraftInput): Promise<DraftResult> {
    const authoredBy = input.authoredBy ?? 'ai';
    let prov = seedProvenance({ authoredBy, model: input.model, sources: input.sources });
    prov = recordTransition(prov, {
      to: 'draft',
      by: authoredBy === 'human' ? 'human' : 'ai',
      ts: this.now().toISOString(),
    });

    const frontmatter = {
      title: input.title,
      status: 'draft',
      ...(input.frontmatter ?? {}),
      provenance: prov,
    };

    const filePath = this.filePathFor(input.path);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, composeContent(frontmatter, input.body), 'utf8');

    const contentDir = relative(this.cfg.rootDir, this.cfg.contentRoot) || '.';
    const result = await checkContent(this.cfg.rootDir, {
      today: this.now(),
      config: { contentDir },
    });
    const diagnostics = result.diagnostics.filter((d) => d.path === input.path);
    return {
      path: input.path,
      filePath,
      diagnostics,
      ok: diagnostics.every((d) => d.severity !== 'error'),
    };
  }

  /** Branch, commit (signed-off + provenance trailer), push, and open a PR. */
  async proposeChanges(input: ProposeInput): Promise<ProposeResult> {
    const { host } = this.cfg;
    const primary = input.paths[0] ?? 'page';
    const shortSha = await host.shortSha();
    const branch = draftBranchName(primary, shortSha);

    await host.createBranch(branch);
    await host.stage(input.paths.map((p) => this.filePathFor(p)));

    // The draft may already be committed (clean working tree). In that case there
    // is nothing to stage, so don't try to make an empty commit — carry the
    // existing HEAD onto the branch instead of dying with "nothing to commit".
    let commit: string;
    if (await host.hasStagedChanges()) {
      const prov = readProvenance(this.filePathFor(primary));
      const trailers: Record<string, string> = {};
      if (prov) trailers[PROVENANCE_TRAILER_KEY] = formatProvenanceTrailer(prov);
      commit = await host.commit(input.title, { signoff: true, trailers });
    } else {
      commit = await host.headSha();
    }

    await host.push(branch, { setUpstream: true });

    const pullRequest = await host.createPullRequest({
      title: input.title,
      body: input.summary,
      base: input.base ?? this.cfg.base ?? 'main',
      head: branch,
      labels: input.labels ?? ['nema:draft'],
    });

    return { branch, commit, pullRequest };
  }

  /**
   * Flip a page `draft → reviewed`. This is the human-gated step: it is run by
   * the approval-triggered Action, carrying the approving reviewer + PR. It only
   * edits the file; staging/committing/merging is the caller's responsibility.
   */
  async approve(input: ApproveInput): Promise<ApproveResult> {
    const filePath = this.filePathFor(input.path);
    const raw = readFileSync(filePath, 'utf8');
    const today = input.today ?? this.now();
    const commit = input.commit ?? (await this.cfg.host.headSha().catch(() => undefined));

    const next = flipToReviewed(raw, {
      reviewer: input.reviewer,
      today,
      reviewSlaDays: this.sla(),
      commit,
      codeRoot: this.cfg.codeRoot ?? this.cfg.rootDir,
    });
    writeFileSync(filePath, next, 'utf8');

    return {
      path: input.path,
      filePath,
      lastReviewed: toISODate(today),
      reviewBy: toISODate(addDays(today, this.sla())),
    };
  }
}
