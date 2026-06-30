// SPDX-License-Identifier: Apache-2.0
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative } from 'node:path';
import { type RepoExport, extractExports, fingerprintBinding } from '@getnema/drift';
import { composeContent, recordTransition, seedProvenance } from '@getnema/provenance';
import type { AuthoredBy, CodeBinding, ModelInfo, Source } from '@getnema/schema';

export type { RepoExport };

/**
 * `nema generate` — lay the rails for "docs from your code". This module is a
 * deterministic scaffolder: it reads a source repo (package metadata, README,
 * exported symbols), plans a small diátaxis doc set, and writes seeded `draft`
 * pages whose bodies are a *factual skeleton* extracted from the code — section
 * headings, an export table, install snippet — with provenance pointing at the
 * real source files. It never writes prose: the explanatory text is left to the
 * user's own agent, which fills the skeleton through the existing draft loop.
 */

/** The facts read out of a source repo — the "context bundle", inline for now. */
export interface IngestedRepo {
  name: string;
  description?: string;
  /** First prose paragraph of the README, if any. */
  readmeIntro?: string;
  /** Repo-relative path of the README that was read. */
  readmeFile?: string;
  /** Repo-relative path of the entry source file that was read. */
  entryFile?: string;
  exports: RepoExport[];
}

const README_CANDIDATES = ['README.md', 'readme.md', 'Readme.md'];
const ENTRY_CANDIDATES = [
  'source/index.ts',
  'src/index.ts',
  'index.ts',
  'source/index.js',
  'src/index.js',
  'index.js',
];

/** First non-empty, non-heading, non-badge paragraph of a README. */
function readmeIntro(markdown: string): string | undefined {
  const blocks = markdown.split(/\n\s*\n/);
  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;
    if (block.startsWith('#')) continue; // heading
    if (block.startsWith('<')) continue; // html / logo
    if (/^[![]/.test(block)) continue; // shields / image-only
    return block.replace(/\s+/g, ' ').trim();
  }
  return undefined;
}

function firstExisting(repoDir: string, candidates: string[]): string | undefined {
  for (const rel of candidates) {
    if (existsSync(join(repoDir, rel))) return rel;
  }
  return undefined;
}

/** Read a source repo into the facts `generate` needs. Pure read, no writes. */
export function ingestRepo(repoDir: string): IngestedRepo {
  let name = repoDir.split(/[/\\]/).filter(Boolean).pop() ?? 'project';
  let description: string | undefined;
  const pkgPath = join(repoDir, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
        name?: string;
        description?: string;
      };
      if (pkg.name) name = pkg.name;
      if (pkg.description) description = pkg.description;
    } catch {
      // ignore an unparseable package.json — fall back to the directory name
    }
  }

  const readmeFile = firstExisting(repoDir, README_CANDIDATES);
  const intro = readmeFile
    ? readmeIntro(readFileSync(join(repoDir, readmeFile), 'utf8'))
    : undefined;

  const entryFile = firstExisting(repoDir, ENTRY_CANDIDATES);
  const exports = entryFile ? extractExports(readFileSync(join(repoDir, entryFile), 'utf8')) : [];

  return { name, description, readmeIntro: intro, readmeFile, entryFile, exports };
}

/** A planned page to scaffold. */
export interface GeneratePlanEntry {
  /** Route path (no `.md`), e.g. `api/reference`. */
  path: string;
  title: string;
  diataxis: string;
  body: string;
  sources: Source[];
}

function sourcesSection(sources: Source[]): string {
  if (sources.length === 0) return '';
  const lines = sources.map((s) => `[^${s.id}]: ${s.title}${s.url ? ` — ${s.url}` : ''}`);
  return `\n\n## Sources\n\n${lines.join('\n')}`;
}

const TODO = '<!-- TODO(agent): write this section from the cited source -->';

/**
 * Plan a small diátaxis doc set from the ingested facts: an overview index, a
 * getting-started tutorial, and an API reference seeded with the real export
 * table. Each page carries a footnote to every source it declares (so the
 * provenance-consistency and footnotes gates stay green).
 */
export function planDocs(repo: IngestedRepo): GeneratePlanEntry[] {
  const readmeSrc: Source | undefined = repo.readmeFile
    ? { id: 'readme', title: `${repo.name} — ${repo.readmeFile}`, kind: 'primary' }
    : undefined;
  const entrySrc: Source | undefined = repo.entryFile
    ? { id: 'exports', title: `${repo.name} — ${repo.entryFile}`, kind: 'primary' }
    : undefined;

  const entries: GeneratePlanEntry[] = [];

  // 1. Overview index — links the rest so nothing orphans.
  {
    const sources = readmeSrc ? [readmeSrc] : [];
    const intro = repo.readmeIntro
      ? `${repo.readmeIntro}${readmeSrc ? '[^readme]' : ''}`
      : `${repo.description ?? `Documentation for \`${repo.name}\`.`}${readmeSrc ? '[^readme]' : ''}`;
    const body =
      `# ${repo.name}\n\n${intro}\n\n` +
      '## Documentation\n\n' +
      '- [Getting started](getting-started.md) — install and first use.\n' +
      '- [API reference](api/reference.md) — every export.' +
      sourcesSection(sources);
    entries.push({ path: 'index', title: repo.name, diataxis: 'overview', body, sources });
  }

  // 2. Getting started — install + a stubbed first-use the agent completes.
  {
    const sources = readmeSrc ? [readmeSrc] : [];
    const ref = readmeSrc ? '[^readme]' : '';
    const body =
      '# Getting started\n\n' +
      `Install \`${repo.name}\`:${ref}\n\n` +
      '```sh\n' +
      `npm install ${repo.name}\n` +
      '```\n\n' +
      '## First request\n\n' +
      `${TODO}` +
      sourcesSection(sources);
    entries.push({
      path: 'getting-started',
      title: 'Getting started',
      diataxis: 'tutorial',
      body,
      sources,
    });
  }

  // 3. API reference — the real export table, descriptions left to the agent.
  {
    const sources = entrySrc ? [entrySrc] : [];
    const ref = entrySrc ? '[^exports]' : '';
    const rows =
      repo.exports.length > 0
        ? repo.exports.map((e) => `| \`${e.name}\` | ${e.kind} | ${TODO} |`).join('\n')
        : `| | | ${TODO} |`;
    const body =
      '# API reference\n\n' +
      `\`${repo.name}\` exports the following.${ref}\n\n` +
      '| Export | Kind | Description |\n| --- | --- | --- |\n' +
      `${rows}` +
      sourcesSection(sources);
    entries.push({
      path: 'api/reference',
      title: 'API reference',
      diataxis: 'reference',
      body,
      sources,
    });
  }

  return entries;
}

export interface GenerateOptions {
  /** Absolute path to the source code repo to read. */
  repoDir: string;
  /** Absolute path to the Nema content directory to write pages into. */
  contentRoot: string;
  /**
   * Absolute `codeRoot` the generated `code:` bindings resolve against. When set
   * AND the source entry file lives under it (the monorepo / docs-beside-code
   * case), the API reference page is bound to that file with a stamped baseline,
   * so the generated docs are drift-tracked from birth. When the source is
   * outside `codeRoot` (a cross-repo generate), no binding is emitted.
   */
  codeRoot?: string;
  /** Model recorded as the author. When omitted, pages are seeded `authored_by: human`. */
  model?: ModelInfo;
  /** Preview without writing files. */
  dryRun?: boolean;
  clock?: () => Date;
}

export interface GeneratedPage {
  path: string;
  title: string;
}

export interface GenerateResult {
  repo: IngestedRepo;
  pages: GeneratedPage[];
}

/**
 * Generate a Nema doc skeleton from a source repo: ingest → plan → write seeded
 * `draft` pages. Mirrors `migrateCorpus` — it only writes files; running the
 * gates and opening a PR are the caller's job.
 */
export function generateCorpus(opts: GenerateOptions): GenerateResult {
  const now = (opts.clock ?? (() => new Date()))();
  // No model named ⇒ a human ran the scaffolder; claim human authorship rather
  // than a phantom model (the agent that fills the prose stamps itself later).
  const authoredBy: AuthoredBy = opts.model ? 'ai' : 'human';

  const repo = ingestRepo(opts.repoDir);
  const binding = entryBinding(repo, opts, now);
  const pages: GeneratedPage[] = [];

  for (const entry of planDocs(repo)) {
    let prov = seedProvenance({ authoredBy, model: opts.model, sources: entry.sources });
    prov = recordTransition(prov, {
      to: 'draft',
      by: authoredBy === 'human' ? 'human' : 'ai',
      ts: now.toISOString(),
    });

    const frontmatter: Record<string, unknown> = {
      title: entry.title,
      status: 'draft',
      diataxis: entry.diataxis,
      // The API reference documents the entry file's exports — bind it so drift
      // tracks the code from the moment the skeleton is written.
      ...(binding && entry.path === 'api/reference' ? { code: [binding] } : {}),
      provenance: prov,
    };

    if (!opts.dryRun) {
      const filePath = join(opts.contentRoot, `${entry.path}.md`);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, composeContent(frontmatter, entry.body), 'utf8');
    }
    pages.push({ path: entry.path, title: entry.title });
  }

  return { repo, pages };
}

/**
 * Build a drift binding for the API reference page from the source entry file —
 * but only when a `codeRoot` is given and the entry file actually lives under it
 * (so the stored `source` is a valid repo-relative path the gate can resolve).
 * Returns `undefined` for a cross-repo generate, where binding into the source
 * tree would just produce a dangling `missing-source` warning.
 */
function entryBinding(
  repo: IngestedRepo,
  opts: GenerateOptions,
  now: Date,
): CodeBinding | undefined {
  if (!opts.codeRoot || !repo.entryFile || repo.exports.length === 0) return undefined;
  const entryAbs = join(opts.repoDir, repo.entryFile);
  const source = relative(opts.codeRoot, entryAbs);
  if (source.startsWith('..') || isAbsolute(source)) return undefined;

  const fp = fingerprintBinding({ id: 'cb-exports', source }, opts.codeRoot);
  if (fp.missing || fp.fingerprint == null) return undefined;
  return {
    id: 'cb-exports',
    source,
    fingerprint: fp.fingerprint,
    fingerprinted_at: now.toISOString().slice(0, 10),
  };
}
