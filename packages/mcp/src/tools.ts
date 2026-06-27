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
import { type GateResult, checkContent } from '@getnema/gates';
import {
  type DraftResult,
  GitHubHost,
  type NemaHost,
  ProducerEngine,
  type ProposeResult,
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
}

export interface UpdatePageInput {
  path: string;
  title?: string;
  body?: string;
  frontmatter?: Record<string, unknown>;
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

  // ---- write tools ------------------------------------------------------

  async draftPage(input: DraftPageInput): Promise<DraftResult> {
    // Mirror the CLI's guard (cli/commands/draft.ts): an empty body would write a
    // contentless page the gates can't meaningfully check. Reject it here so the
    // MCP write-path and the CLI behave identically.
    if (!input.body || input.body.trim() === '') {
      throw new Error('body is required — a draft page needs Markdown content');
    }
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
