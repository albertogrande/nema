// SPDX-License-Identifier: Apache-2.0

/**
 * The dependency ranges the scaffold pins for the `@getnema/*` packages, in one
 * place so the minimal and app templates can never drift apart. These must track
 * the versions we publish: the packages are *not* lockstep (the CLI and engine
 * release on different lines), and a caret range on a `0.x` version pins the
 * *minor* — so `^0.3.0` caps at `0.3.x` and silently hands new users an older
 * line than the release they should get (missing `generate`, `claim`, `release`,
 * `coherence`, `drift`, ...). When a release bumps a package's minor, bump its
 * pin here too — the `scaffold.test.ts` guard reads the live workspace versions
 * and **fails CI** if any pin would cap below what ships, so a stale pin can't
 * reach npm.
 */
export const NEMA_DEP_VERSIONS = {
  '@getnema/cli': '^0.4.0',
  '@getnema/core': '^0.2.0',
  '@getnema/schema': '^0.2.0',
  '@getnema/adapter-fumadocs': '^0.1.0',
} as const;

export interface TemplateOptions {
  /** Project name, written into the scaffolded package.json. */
  name: string;
  /**
   * Also emit a rendering Fumadocs app (Next.js) so day-1 `npm run dev` opens a
   * browser on a badged, rendered page. When false (default) the scaffold is the
   * minimal checkable producer-loop repo.
   */
  app?: boolean;
}

/**
 * The files a new Nema docs repo starts with — a working producer loop on the
 * published packages. Pure: returns a `path → content` map with no I/O, so it is
 * trivially testable. The generated `nema check` workflow is the load-bearing
 * piece: its `draft-pages-not-reviewed` gate makes self-promotion impossible.
 *
 * With `app: true` the map is the superset that also renders: a minimal Next +
 * Fumadocs app wired to `@getnema/adapter-fumadocs`, mirroring the `apps/docs`
 * dogfood tree on the *published* packages (no source build, no `workspace:*`).
 */
export function templates(opts: TemplateOptions): Record<string, string> {
  const base = baseTemplates(opts);
  return opts.app ? { ...base, ...appTemplates(opts) } : base;
}

/** The minimal checkable producer-loop repo (no renderer). */
function baseTemplates(opts: TemplateOptions): Record<string, string> {
  const pkg = {
    name: opts.name,
    version: '0.0.0',
    private: true,
    type: 'module',
    scripts: {
      check: 'nema check',
      draft: 'nema draft',
      'open-pr': 'nema open-pr',
    },
    devDependencies: {
      '@getnema/cli': NEMA_DEP_VERSIONS['@getnema/cli'],
      '@getnema/core': NEMA_DEP_VERSIONS['@getnema/core'],
    },
  };

  return {
    'nema.config.ts': NEMA_CONFIG,
    'docs/index.md': DOCS_INDEX,
    'package.json': `${JSON.stringify(pkg, null, 2)}\n`,
    '.github/workflows/nema-check.yml': NEMA_CHECK_WORKFLOW,
    '.github/workflows/nema-approve.yml': NEMA_APPROVE_WORKFLOW,
    'AGENTS.md': AGENTS_CONTRACT,
    'CLAUDE.md': CLAUDE_POINTER,
    '.gitignore': 'node_modules\n',
    'README.md': `# ${opts.name}

Governed documentation, powered by [Nema](https://github.com/albertogrande/nema).

## The producer loop

1. An agent **drafts** a page — \`npm run draft\` or the MCP write-tools — writing \`status: draft\`
   with a seeded provenance block, then self-checks against the gates.
2. **Propose** — \`nema open-pr\` opens a PR labeled \`nema:draft\`.
3. **CI** runs \`nema check\` (the \`nema check\` workflow in this repo) — every gate, including
   \`draft-pages-not-reviewed\`, which makes it impossible to publish an unreviewed page as trusted.
4. **A human approves** the PR. That approval is the only path to \`reviewed\`.

## Use it

\`\`\`sh
npm install
npm run check          # run the gates
\`\`\`

## Let an agent author it (MCP)

Point an MCP-capable agent at this repo:

\`\`\`sh
claude mcp add nema -- npx -y @getnema/cli mcp .
\`\`\`

The agent can list, search, read, and **draft** pages — but it cannot promote a page to
\`reviewed\`. Only a human PR approval can.
`,
  };
}

/**
 * The additional / overriding files for a rendering app. Mirrors `apps/docs`,
 * but on the published packages and with `dev`/`build`/`start` scripts so a
 * stranger lands on `localhost:3000` with no source build.
 */
function appTemplates(opts: TemplateOptions): Record<string, string> {
  const pkg = {
    name: opts.name,
    version: '0.0.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      check: 'nema check',
      draft: 'nema draft',
      'open-pr': 'nema open-pr',
    },
    dependencies: {
      '@getnema/adapter-fumadocs': NEMA_DEP_VERSIONS['@getnema/adapter-fumadocs'],
      '@getnema/core': NEMA_DEP_VERSIONS['@getnema/core'],
      '@getnema/schema': NEMA_DEP_VERSIONS['@getnema/schema'],
      'fumadocs-core': '^15.8.5',
      'fumadocs-ui': '^15.8.5',
      marked: '^14.1.4',
      next: '^15.1.3',
      react: '^19.0.0',
      'react-dom': '^19.0.0',
    },
    devDependencies: {
      '@getnema/cli': NEMA_DEP_VERSIONS['@getnema/cli'],
      '@tailwindcss/postcss': '^4.3.1',
      '@types/node': '^22.10.2',
      '@types/react': '^19.0.1',
      '@types/react-dom': '^19.0.2',
      tailwindcss: '^4.3.1',
      typescript: '^5.7.2',
    },
  };

  return {
    'package.json': `${JSON.stringify(pkg, null, 2)}\n`,
    '.gitignore': 'node_modules\n.next\nnext-env.d.ts\n',
    'README.md': `# ${opts.name}

An AI-native, self-hostable docs site, powered by [Nema](https://github.com/albertogrande/nema).
Your agents draft pages, a human approves every one, provenance is native — and it renders through
[Fumadocs](https://fumadocs.dev).

## Day one

\`\`\`sh
npm install
npm run dev            # → http://localhost:3000
\`\`\`

You land on a rendered page carrying an **"AI draft · pending review"** badge — proof the page was
agent-authored and not yet human-approved. The \`/trust\` route is the provenance dashboard.

## The producer loop

1. An agent **drafts** a page — \`npm run draft\` or the MCP write-tools — writing \`status: draft\`
   with a seeded provenance block, then self-checks against the gates.
2. **Propose** — \`nema open-pr\` opens a PR labeled \`nema:draft\`.
3. **CI** runs \`nema check\` — every gate, including \`draft-pages-not-reviewed\`, which makes it
   impossible to publish an unreviewed page as trusted.
4. **A human approves** the PR. That approval is the only path to \`reviewed\`.

## Let your agents author it (MCP)

\`\`\`sh
claude mcp add nema -- npx -y @getnema/cli mcp .
\`\`\`

Agents can list, search, read, and **draft** pages — but cannot promote a page to \`reviewed\`.
Only a human PR approval can.
`,
    'next.config.mjs': `// SPDX-License-Identifier: Apache-2.0
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@getnema/core',
    '@getnema/schema',
    '@getnema/provenance',
    '@getnema/adapter-fumadocs',
  ],
};

export default nextConfig;
`,
    'postcss.config.mjs': `// SPDX-License-Identifier: Apache-2.0
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
`,
    'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "noEmit": true,
    "allowJs": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "skipLibCheck": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`,
    'next-env.d.ts': `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
`,
    'app/layout.tsx': `// SPDX-License-Identifier: Apache-2.0
import { RootProvider } from 'fumadocs-ui/provider';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: '${opts.name}',
  description: 'An AI-native docs site authored through the Nema producer loop.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
`,
    'app/page.tsx': `// SPDX-License-Identifier: Apache-2.0
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/docs');
}
`,
    'app/globals.css': `/* SPDX-License-Identifier: Apache-2.0 */
@import "tailwindcss";
@import "fumadocs-ui/css/neutral.css";
@import "fumadocs-ui/css/preset.css";

/* Nema provenance badge + trust dashboard. */
.nema-badge {
  display: inline-block;
  font-size: 0.75rem;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  border: 1px solid var(--color-fd-border);
  margin-bottom: 1rem;
}
.nema-badge--reviewed {
  background: #10301c;
  border-color: #1f7a44;
  color: #7ee2a8;
}
.nema-badge--ai {
  background: #2a2410;
  border-color: #7a6a1f;
  color: #e2cf7e;
}
.nema-badge--draft {
  background: #20242b;
  color: var(--color-fd-muted-foreground);
}

.trust-table {
  width: 100%;
  border-collapse: collapse;
}
.trust-table th,
.trust-table td {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-fd-border);
  font-size: 0.9rem;
}
.trust-table th {
  color: var(--color-fd-muted-foreground);
}
`,
    'app/docs/layout.tsx': `import { getPageTree } from '@/lib/tree';
// SPDX-License-Identifier: Apache-2.0
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';

export default async function DocsRootLayout({ children }: { children: ReactNode }) {
  const tree = await getPageTree();
  return (
    <DocsLayout tree={tree} nav={{ title: '${opts.name}' }} links={[{ text: 'Trust', url: '/trust' }]}>
      {children}
    </DocsLayout>
  );
}
`,
    'app/docs/[[...slug]]/page.tsx': `import { getSource, slugToPath } from '@/lib/source';
// SPDX-License-Identifier: Apache-2.0
import { ProvenanceBadge } from '@getnema/adapter-fumadocs';
import { getTableOfContents } from 'fumadocs-core/server';
import { DocsBody, DocsPage } from 'fumadocs-ui/page';
import { marked } from 'marked';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const source = await getSource();
  return source.pages.map((p) => ({ slug: p.path === 'index' ? [] : p.path.split('/') }));
}

export default async function DocPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const source = await getSource();
  const page = source.getPage(slugToPath(slug));
  if (!page) notFound();

  // renderMarkdown is the parity source (same bytes the .md route serves); the HTML
  // and the table of contents are derived from it for the human-facing view.
  const markdown = source.renderMarkdown(page);
  const html = marked.parse(markdown, { async: false }) as string;
  const toc = getTableOfContents(markdown);
  const provenance = source.provenanceOf(page.path);

  return (
    <DocsPage toc={toc}>
      <DocsBody>
        <ProvenanceBadge provenance={provenance} />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: trusted, gate-validated local Markdown */}
        <div dangerouslySetInnerHTML={{ __html: html }} />
        <hr />
        <p style={{ fontSize: '0.85rem', color: 'var(--color-fd-muted-foreground)' }}>
          <Link href={\`/md/\${page.path}\`}>View raw Markdown (.md route)</Link>
          {' · '}
          <Link href="/trust">Provenance dashboard</Link>
        </p>
      </DocsBody>
    </DocsPage>
  );
}
`,
    'app/trust/page.tsx': `import { getSource } from '@/lib/source';
// SPDX-License-Identifier: Apache-2.0
import { provenanceBadgeProps } from '@getnema/adapter-fumadocs';
import Link from 'next/link';

/** Render the commit/PR reference on a transition, if any. */
function transitionRef(t: { pr?: number; commit?: string }): string {
  if (t.pr != null) return \` (pr #\${t.pr})\`;
  if (t.commit) return \` (\${t.commit.slice(0, 7)})\`;
  return '';
}

export default async function TrustPage() {
  const source = await getSource();
  const rows = source.pages.map((page) => {
    const prov = page.provenance ?? null;
    return { page, prov, badge: provenanceBadgeProps(prov) };
  });

  return (
    <main style={{ maxWidth: 920, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <h1>Provenance dashboard</h1>
      <p style={{ color: 'var(--color-fd-muted-foreground)' }}>
        Every page&rsquo;s authorship chain — who/what authored it, which model, and whether a human
        has reviewed it — read straight from the provenance the gates validate.
      </p>
      <table className="trust-table">
        <thead>
          <tr>
            <th>Page</th>
            <th>Status</th>
            <th>Authored by</th>
            <th>Model</th>
            <th>Reviewer</th>
            <th>Review trail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ page, prov, badge }) => (
            <tr key={page.path}>
              <td>
                <Link href={page.path === 'index' ? '/docs' : \`/docs/\${page.path}\`}>
                  {page.title}
                </Link>
              </td>
              <td>
                <span className={\`nema-badge nema-badge--\${badge.tone}\`}>{page.status || '—'}</span>
              </td>
              <td>{prov?.authored_by ?? '—'}</td>
              <td>{prov?.model?.name ?? '—'}</td>
              <td>{prov?.reviewed_by?.login ? \`@\${prov.reviewed_by.login}\` : '—'}</td>
              <td>
                {prov && prov.transitions.length > 0 ? (
                  <details>
                    <summary>
                      {prov.transitions.length} event{prov.transitions.length === 1 ? '' : 's'}
                    </summary>
                    <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1rem', fontSize: '0.8rem' }}>
                      {prov.transitions.map((t) => (
                        <li key={\`\${t.ts}-\${t.to}\`}>
                          {t.ts.slice(0, 10)} → <strong>{t.to}</strong> by {t.by}
                          {transitionRef(t)}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: '2rem', fontSize: '0.85rem' }}>
        <Link href="/docs">← Back to docs</Link>
      </p>
    </main>
  );
}
`,
    'app/api/search/route.ts': `import { getSource } from '@/lib/source';
// SPDX-License-Identifier: Apache-2.0
import type { SortedResult } from 'fumadocs-core/search';

export const dynamic = 'force-dynamic';

function docUrl(path: string): string {
  return path === 'index' ? '/docs' : \`/docs/\${path}\`;
}

/**
 * Reader-facing search: serves the Nema BM25 index (the same one the MCP
 * \`search\` tool uses) in the shape Fumadocs' default search dialog expects, so
 * the \`Cmd/Ctrl+K\` UI is backed by our engine rather than a duplicate index.
 */
export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams.get('query')?.trim() ?? '';
  if (!query) {
    return new Response('[]', { headers: { 'content-type': 'application/json; charset=utf-8' } });
  }

  const source = await getSource();
  const results: SortedResult[] = [];
  for (const hit of source.search(query, 12)) {
    const url = hit.anchor ? \`\${docUrl(hit.path)}#\${hit.anchor}\` : docUrl(hit.path);
    results.push({ id: hit.path, url, type: 'page', content: hit.title });
    if (hit.snippet) {
      results.push({ id: \`\${hit.path}#snippet\`, url, type: 'text', content: hit.snippet });
    }
  }
  return new Response(JSON.stringify(results), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
`,
    'app/md/[...slug]/route.ts': `import { getSource, slugToPath } from '@/lib/source';
// SPDX-License-Identifier: Apache-2.0
import { provenanceHeaders, provenanceView } from '@getnema/core';

export async function generateStaticParams() {
  const source = await getSource();
  return source.pages.map((p) => ({ slug: p.path.split('/') }));
}

/**
 * The \`.md\` route: serves the canonical Markdown verbatim, byte-identical to the
 * MCP \`get_page\` tool — both go through \`renderMarkdown\`. This is the parity the
 * adapter conformance suite guards. Provenance rides on response headers and an
 * opt-in \`?meta\` JSON variant, never in the body (which would break that parity).
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const source = await getSource();
  const page = source.getPage(slugToPath(slug));
  if (!page) return new Response('Not found', { status: 404 });

  const view = provenanceView(page, source.provenanceOf(page.path));

  // Opt-in structured variant for agents that want the full record.
  const accept = request.headers.get('accept') ?? '';
  if (new URL(request.url).searchParams.has('meta') || accept.includes('application/json')) {
    return new Response(JSON.stringify(view, null, 2), {
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }

  // Body is byte-identical to renderMarkdown(page); provenance rides on headers.
  return new Response(source.renderMarkdown(page), {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      link: \`</md/\${page.path}?meta>; rel="describedby"\`,
      ...provenanceHeaders(view),
    },
  });
}
`,
    'lib/source.ts': `// SPDX-License-Identifier: Apache-2.0
import { type ContentSource, createContentSource } from '@getnema/core';

let cached: Promise<ContentSource> | null = null;

/** Load (and memoize) the content source rooted at the app directory. */
export function getSource(): Promise<ContentSource> {
  if (!cached) cached = createContentSource(process.cwd());
  return cached;
}

/** Normalize a \`[[...slug]]\` param to a route path (\`[]\` → \`index\`). */
export function slugToPath(slug: string[] | undefined): string {
  const joined = (slug ?? []).join('/');
  return joined || 'index';
}
`,
    'lib/tree.ts': `// SPDX-License-Identifier: Apache-2.0
import type { NavNode } from '@getnema/core';
import type * as PageTree from 'fumadocs-core/page-tree';
import { getSource } from './source';

function docUrl(path: string): string {
  return path === 'index' ? '/docs' : \`/docs/\${path}\`;
}

function toNodes(nodes: NavNode[]): PageTree.Node[] {
  return nodes.map((node): PageTree.Node => {
    if (node.items && node.items.length > 0) {
      return {
        type: 'folder',
        name: node.title,
        ...(node.path ? { index: { type: 'page', name: node.title, url: docUrl(node.path) } } : {}),
        children: toNodes(node.items),
      };
    }
    return { type: 'page', name: node.title, url: docUrl(node.path ?? node.title) };
  });
}

/** Build the Fumadocs page tree from the Nema nav (renderer-agnostic core data). */
export async function getPageTree(): Promise<PageTree.Root> {
  const source = await getSource();
  return { name: 'Documentation', children: toNodes(source.nav) };
}
`,
  };
}

const NEMA_CONFIG = `// SPDX-License-Identifier: Apache-2.0
import type { NemaConfig } from '@getnema/core';

const config: NemaConfig = {
  contentDir: 'docs',
  reviewSlaDays: 180,
};

export default config;
`;

const DOCS_INDEX = `---
title: Home
status: draft
---

# Home

Welcome to your Nema docs. Draft new pages through the producer loop:
\`nema draft\` (or the MCP write-tools) → \`nema open-pr\` → human approval.
`;

const NEMA_CHECK_WORKFLOW = `# SPDX-License-Identifier: Apache-2.0
name: nema check
on:
  pull_request:
  push:
    branches: [main]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install
      - run: npm run check
`;

/**
 * The human-approval gate as a GitHub Action. When a maintainer approves a docs
 * PR, this promotes the PR's changed draft pages to `reviewed` (via the published
 * `nema approve`), commits the promotion, and enables auto-merge — the ONLY path
 * to `reviewed`. The promotion push uses NEMA_PROMOTE_TOKEN (a PAT/App token), so
 * it re-triggers CI and the merge waits on a real status check instead of
 * bypassing branch protection.
 */
const NEMA_APPROVE_WORKFLOW = `# SPDX-License-Identifier: Apache-2.0
name: nema approve
# The human approval gate: when a maintainer approves a docs PR, promote its
# draft pages to reviewed and merge. This is the only path to \`reviewed\`.
on:
  pull_request_review:
    types: [submitted]

permissions:
  contents: write
  pull-requests: write

jobs:
  promote:
    name: promote draft → reviewed
    if: github.event.review.state == 'approved'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \${{ github.event.pull_request.head.ref }}
          fetch-depth: 0
          # NEMA_PROMOTE_TOKEN: a PAT (or GitHub App installation token) with
          # contents:write + pull-requests:write, allowed to push to the protected
          # branch. Unlike GITHUB_TOKEN, a push authenticated with it re-triggers CI on
          # the promotion commit, so auto-merge waits on a real status check rather than
          # bypassing branch protection. Add it under Settings → Secrets → Actions.
          token: \${{ secrets.NEMA_PROMOTE_TOKEN }}
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install
      - name: Configure git identity
        run: |
          git config user.name "nema-bot"
          git config user.email "nema-bot@users.noreply.github.com"
      - name: Promote approved draft pages and merge
        env:
          GH_TOKEN: \${{ secrets.NEMA_PROMOTE_TOKEN }}
          PR: \${{ github.event.pull_request.number }}
          REVIEWER: \${{ github.event.review.user.login }}
        run: |
          set -euo pipefail
          # The draft .md files this PR changes (under docs/), turned into route paths.
          mapfile -t files < <(gh pr view "$PR" --json files -q '.files[].path' \\
            | grep -E '^docs/.*\\.md$' || true)
          if [ "\${#files[@]}" -eq 0 ]; then
            echo "No docs/*.md changes in this PR — nothing to promote."
            exit 0
          fi
          head_sha="$(git rev-parse HEAD)"
          # The routes currently in \`status: draft\` (printed as "<route> — ... [status=draft]").
          draft_routes="$(npx -y @getnema/cli prov --status draft 2>/dev/null | sed -E 's/ —.*//' || true)"
          promoted=0
          for f in "\${files[@]}"; do
            # docs/foo/bar.md -> foo/bar
            route="\${f#docs/}"; route="\${route%.md}"
            if printf '%s\\n' "$draft_routes" | grep -qxF "$route"; then
              npx -y @getnema/cli approve --path "$route" --reviewer "$REVIEWER" --pr "$PR" --commit "$head_sha"
              git add -- "$f"
              promoted=$((promoted+1))
            fi
          done
          if [ "$promoted" -eq 0 ]; then
            echo "No draft pages to promote."
            exit 0
          fi
          git commit -s -m "docs: promote approved pages to reviewed (approved by @$REVIEWER)"
          git push origin "HEAD:\${{ github.event.pull_request.head.ref }}"
          # Enable auto-merge: completes once the re-triggered nema check passes.
          gh pr merge "$PR" --squash --auto
`;

/**
 * The agent contract shipped into a scaffolded repo. It gives a stranger's agent
 * the rails the MCP tools alone don't: the draft → PR → human-approve loop and
 * the one invariant (only a human PR approval promotes a page to `reviewed`).
 */
const AGENTS_CONTRACT = `<!-- SPDX-License-Identifier: Apache-2.0 -->
# Agent contract

This repository is governed by **Nema**. Agents author documentation; **a human approves every
page.** Follow this contract.

## The one invariant — never break it

> An agent may move a page to **\`draft\`**. **Only a human PR approval** may promote a page to
> **\`reviewed\`**. Never set \`status: reviewed\` yourself, and never merge your own PR.

## The producer loop

1. **Draft.** Create or edit a page with \`status: draft\` and a complete \`provenance\` block —
   use the \`draft_page\` MCP tool, or run \`nema draft --path <route> --title <t> --diataxis <genre>
   --body "<markdown>"\`. When you author the page, record yourself: pass \`--model-name <id>\`
   (and \`--model-vendor\`) so provenance shows \`authored_by: ai\` with your model.
2. **Self-check.** Run \`nema check\` (or the \`check\` MCP tool) and fix **every** diagnostic
   before proposing. \`nema explain <rule>\` says why a gate fires and how to fix it.
3. **Propose.** Run \`nema open-pr --title <t> --summary <s>\` to open a PR labeled \`nema:draft\`.
   Requires git + a GitHub remote + an authenticated \`gh\` (\`nema doctor\` verifies this).
4. **Stop.** Report the PR and any open decisions. **Do not approve or merge** — that is the
   human's gate. The \`nema approve\` workflow promotes the page to \`reviewed\` only after a human
   approves the PR.

## Useful commands

- \`nema doctor\` — check the environment + governance wiring (CI, promotion gate, branch protection).
- \`nema check\` — run every gate over the docs.
- \`nema prov <route>\` — show a page's provenance / status.

## Connect an agent over MCP

\`\`\`sh
claude mcp add nema -- npx -y @getnema/cli mcp .
\`\`\`

**Restart your agent session after adding the server.** MCP clients bind their tools at session
start, so the Nema tools won't appear in an already-running session. (No restart? Use the
equivalent CLI verbs \`nema draft\`, \`nema check\`, \`nema open-pr\`; they do the same work.)

The MCP server lets an agent list, search, read, **draft**, and **propose** — but it exposes **no**
tool that promotes a page to \`reviewed\`. Only a human PR approval can.
`;

const CLAUDE_POINTER = `<!-- SPDX-License-Identifier: Apache-2.0 -->
# CLAUDE.md

This repository is governed by **Nema**. The agent contract — the draft → PR → human-approve loop
and the invariant that **only a human PR approval promotes a page to \`reviewed\`** — lives in
[\`AGENTS.md\`](AGENTS.md). Read it first, then follow it.
`;
