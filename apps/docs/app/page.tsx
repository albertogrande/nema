// SPDX-License-Identifier: Apache-2.0
import Link from 'next/link';
import type { ReactNode } from 'react';
import { CopyCommand } from '@/components/copy-command';

export const metadata = {
  title: 'Nema — your coding agents write the docs, you approve the PR',
  description:
    'Your coding agents write the docs; you approve the PR. Open-source docs platform with human-gated review, git-diffable provenance, gate checks, and code-drift tracking.',
};

const GITHUB_URL = 'https://github.com/albertogrande/nema';

/** Lowercase wordmark with the orange terminal-block from the brand lockup. */
function Wordmark() {
  return (
    <span className="inline-flex items-baseline gap-[0.2em] font-semibold tracking-tight">
      nema
      <span aria-hidden className="inline-block h-[0.72em] w-[0.5em] bg-[#fb923c]" />
    </span>
  );
}

function SectionLabel({ index, children }: { index: string; children: ReactNode }) {
  return (
    <p className="mb-8 text-xs uppercase tracking-[0.2em] text-fd-muted-foreground">
      <span className="text-[#fb923c]">{index}</span> / {children}
    </p>
  );
}

/* ── terminal ──────────────────────────────────────────────────────────── */

function Prompt({ children }: { children: ReactNode }) {
  return (
    <div>
      <span className="select-none text-[#fb923c]">$ </span>
      <span className="text-fd-foreground">{children}</span>
    </div>
  );
}

function Out({ children }: { children: ReactNode }) {
  return (
    <div className="text-fd-muted-foreground">
      {'  '}
      {children}
    </div>
  );
}

function Comment({ children }: { children: ReactNode }) {
  return <div className="pt-5 text-fd-muted-foreground/70 first:pt-0"># {children}</div>;
}

function Ok() {
  return <span className="text-emerald-600 dark:text-emerald-400">✓</span>;
}

/* ── diff ──────────────────────────────────────────────────────────────── */

function DiffLine({ kind, children }: { kind?: '+' | '-'; children: ReactNode }) {
  const tone =
    kind === '+'
      ? 'text-emerald-700 dark:text-emerald-400'
      : kind === '-'
        ? 'text-red-600 dark:text-red-400'
        : 'text-fd-muted-foreground';
  return (
    <div className={tone}>
      <span className="select-none">{kind ?? ' '} </span>
      {children}
    </div>
  );
}

/* ── page ──────────────────────────────────────────────────────────────── */

const FEATURES: { token: string; title: string; body: string }[] = [
  {
    token: 'authored_by: ai',
    title: 'Agents author, humans approve',
    body: 'Point Claude Code, Cursor, or your own pipeline at the repo. Every page records who — and what — wrote it, and nothing ships without a human PR approval.',
  },
  {
    token: 'nema check',
    title: 'Green before the PR',
    body: 'Broken links, orphans, stale frontmatter, self-promotion — every diagnostic carries a fix hint an agent can act on, on the CLI or over MCP.',
  },
  {
    token: 'provenance:',
    title: 'Authorship as git-diffable data',
    body: 'Model, sources, reviewer, and every status transition live in frontmatter — structured and queryable, not free-text footnotes.',
  },
  {
    token: 'nema generate',
    title: 'Docs from your code',
    body: 'Reads a codebase’s public API and scaffolds seeded drafts — a factual skeleton your agent fleshes out. It never invents prose.',
  },
  {
    token: 'nema drift',
    title: 'Honest about the code',
    body: 'Bind a page to the source it documents. The moment the public surface moves past the reviewed baseline, the page is flagged stale.',
  },
  {
    token: 'slot leasing',
    title: 'A fleet, one corpus',
    body: 'Multi-agent authoring without clobbering: slot leases plus a merge-time coherence gate keep parallel agents out of each other’s pages.',
  },
];

export default function Home() {
  return (
    <div className="font-mono text-fd-foreground antialiased">
      {/* nav */}
      <header className="border-b border-fd-border">
        <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6 text-sm">
          <Link href="/" className="text-base">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-6 text-fd-muted-foreground">
            <Link href="/docs" className="transition-colors hover:text-fd-foreground">
              docs
            </Link>
            <Link href="/trust" className="transition-colors hover:text-fd-foreground">
              trust
            </Link>
            <a
              href={GITHUB_URL}
              rel="noreferrer noopener"
              className="transition-colors hover:text-fd-foreground"
            >
              github ↗
            </a>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        {/* hero */}
        <section className="py-20 sm:py-28">
          <p className="mb-6 text-xs uppercase tracking-[0.2em] text-fd-muted-foreground">
            open source · self-hostable · apache-2.0 · alpha
          </p>
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-[2.6rem] sm:leading-[1.15]">
            Your coding agents write the docs.
            <br />
            You approve the PR.
            <span
              aria-hidden
              className="nema-cursor ml-2 inline-block h-[0.85em] w-[0.5em] translate-y-[0.08em] bg-[#fb923c]"
            />
          </h1>
          <p className="mt-8 max-w-2xl text-sm leading-relaxed text-fd-muted-foreground sm:text-base">
            Nema is an open-source, self-hostable docs platform built for agent authorship. Your
            agents draft, link, and maintain pages with full context of the corpus — and nothing
            reaches <code className="text-fd-foreground">reviewed</code> without a human PR
            approval. Provenance is git-diffable data, not a footnote.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4 text-sm">
            <Link
              href="/docs"
              className="rounded-sm bg-fd-primary px-5 py-2.5 text-fd-primary-foreground transition-opacity hover:opacity-85"
            >
              read the docs →
            </Link>
            <a
              href={GITHUB_URL}
              rel="noreferrer noopener"
              className="rounded-sm border border-fd-border px-5 py-2.5 transition-colors hover:bg-fd-accent"
            >
              github ↗
            </a>
            <Link
              href="/trust"
              className="text-fd-muted-foreground underline underline-offset-4 transition-colors hover:text-fd-foreground"
            >
              see the live /trust dashboard
            </Link>
          </div>
          <div className="mt-10 max-w-2xl">
            <CopyCommand command="npx create-nema my-docs --app" />
            <p className="mt-3 text-xs text-fd-muted-foreground">
              node 22+ · no git, no account, no agent required to get to a rendered site
            </p>
          </div>
        </section>

        {/* problem */}
        <section className="border-t border-fd-border py-20">
          <SectionLabel index="00">the problem</SectionLabel>
          <h2 className="max-w-2xl text-2xl font-semibold tracking-tight">
            Agents made shipping fast. Docs didn’t get faster.
          </h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-sm border border-fd-border bg-fd-border sm:grid-cols-3">
            <div className="bg-fd-background p-6">
              <p className="text-xs text-[#fb923c]">the current way</p>
              <p className="mt-3 text-[13px] leading-relaxed text-fd-muted-foreground">
                Your agents ship code faster than anyone documents it. So you ask them to write the
                docs too — and commit whatever comes out.
              </p>
            </div>
            <div className="bg-fd-background p-6">
              <p className="text-xs text-[#fb923c]">the limitation</p>
              <p className="mt-3 text-[13px] leading-relaxed text-fd-muted-foreground">
                Raw agent output has no review gate, no record of which model or sources produced
                it, and no check that links resolve or that the code still matches.
              </p>
            </div>
            <div className="bg-fd-background p-6">
              <p className="text-xs text-[#fb923c]">the pain</p>
              <p className="mt-3 text-[13px] leading-relaxed text-fd-muted-foreground">
                You choose between reviewing every word yourself or publishing pages nobody can
                vouch for. Most teams quietly choose neither — and the docs rot.
              </p>
            </div>
          </div>
        </section>

        {/* producer loop */}
        <section className="border-t border-fd-border py-20">
          <SectionLabel index="01">the producer loop</SectionLabel>
          <h2 className="max-w-2xl text-2xl font-semibold tracking-tight">
            Draft → check → propose → a human approves.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-fd-muted-foreground">
            The whole loop is designed to be driven by an agent — except the last step, which is
            designed so it can’t be.
          </p>
          <div className="mt-10 overflow-hidden rounded-sm border border-fd-border bg-fd-card">
            <div className="flex items-center justify-between border-b border-fd-border px-4 py-2.5 text-xs text-fd-muted-foreground">
              <span>~/my-docs</span>
              <span aria-hidden className="tracking-widest">
                ○ ○ ○
              </span>
            </div>
            <div className="overflow-x-auto p-5 text-[13px] leading-relaxed sm:text-sm">
              <div className="min-w-max space-y-1 whitespace-pre">
                <Comment>1 — the agent authors, with seeded provenance</Comment>
                <Prompt>nema draft guides/getting-started</Prompt>
                <Out>
                  <Ok /> guides/getting-started.md · status: draft · authored_by: ai
                </Out>

                <Comment>2 — self-check against the same gates CI runs</Comment>
                <Prompt>nema check</Prompt>
                <Out>
                  <Ok /> frontmatter <Ok /> links <Ok /> citations <Ok /> reachability <Ok />{' '}
                  provenance
                </Out>
                <Out>all gates passed</Out>

                <Comment>3 — branch, provenance trailer, pull request</Comment>
                <Prompt>nema open-pr</Prompt>
                <Out>
                  <span className="text-[#fb923c]">→</span> PR #42 · nema:draft · awaiting human
                  approval
                </Out>

                <Comment>4 — a human approves the PR. the only path to `reviewed`.</Comment>
                <Out>
                  <Ok /> nema approve · draft → reviewed · freshness stamped · merged
                </Out>
              </div>
            </div>
          </div>
        </section>

        {/* features */}
        <section className="border-t border-fd-border py-20">
          <SectionLabel index="02">what you get</SectionLabel>
          <div className="grid gap-px overflow-hidden rounded-sm border border-fd-border bg-fd-border sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.token} className="bg-fd-background p-6">
                <p className="text-xs text-[#fb923c]">{f.token}</p>
                <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-fd-muted-foreground">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* the invariant */}
        <section className="border-t border-fd-border py-20">
          <SectionLabel index="03">the one invariant</SectionLabel>
          <div className="rounded-sm border border-fd-border">
            <dl className="divide-y divide-fd-border text-sm">
              <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <dt>
                  stub <span className="text-fd-muted-foreground">→</span> draft
                </dt>
                <dd className="text-fd-muted-foreground">
                  agent · <span className="text-emerald-600 dark:text-emerald-400">allowed</span>
                </dd>
              </div>
              <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <dt>
                  draft <span className="text-fd-muted-foreground">→</span> draft
                </dt>
                <dd className="text-fd-muted-foreground">
                  agent · <span className="text-emerald-600 dark:text-emerald-400">allowed</span>
                </dd>
              </div>
              <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <dt>
                  draft <span className="text-fd-muted-foreground">→</span> reviewed
                </dt>
                <dd>
                  <span className="text-[#fb923c]">human PR approval only</span>
                </dd>
              </div>
            </dl>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-fd-muted-foreground">
            Enforced in CI by the <code>draft-pages-not-reviewed</code> gate. A PR that
            self-promotes fails.
          </p>
        </section>

        {/* provenance diff */}
        <section className="border-t border-fd-border py-20">
          <SectionLabel index="04">provenance</SectionLabel>
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Approval is a diff.</h2>
              <p className="mt-4 text-sm leading-relaxed text-fd-muted-foreground">
                When a human approves the PR, an Action runs <code>nema approve</code>: the status
                flips, freshness dates are stamped, and a <code>reviewed</code> transition lands in
                the page’s history. Who wrote it, which model, from which sources, who signed off —
                auditable in <code>git log</code>, rendered live on the{' '}
                <Link href="/trust" className="text-fd-foreground underline underline-offset-4">
                  /trust
                </Link>{' '}
                dashboard.
              </p>
            </div>
            <div className="overflow-x-auto rounded-sm border border-fd-border bg-fd-card p-5 text-[13px] leading-relaxed">
              <div className="min-w-max whitespace-pre">
                <DiffLine>
                  <span className="text-fd-muted-foreground/70"># guides/getting-started.md</span>
                </DiffLine>
                <DiffLine kind="-">status: draft</DiffLine>
                <DiffLine kind="+">status: reviewed</DiffLine>
                <DiffLine kind="+">last_reviewed: 2026-07-11</DiffLine>
                <DiffLine kind="+">review_by: 2026-10-09</DiffLine>
                <DiffLine kind="+">reviewed_by: {'{ login: alice }'}</DiffLine>
                <DiffLine>provenance:</DiffLine>
                <DiffLine>{'  authored_by: ai'}</DiffLine>
                <DiffLine>{'  model: { name: claude-sonnet-5, vendor: anthropic }'}</DiffLine>
                <DiffLine>{'  sources:'}</DiffLine>
                <DiffLine>{'    - { id: api-ref, kind: code, retrieved: 2026-07-08 }'}</DiffLine>
                <DiffLine>{'  transitions:'}</DiffLine>
                <DiffLine>{'    - { to: draft, by: ai, ts: 2026-07-08 }'}</DiffLine>
                <DiffLine kind="+">{'    - { to: reviewed, by: human, pr: 42 }'}</DiffLine>
              </div>
            </div>
          </div>
        </section>

        {/* bring your own agent */}
        <section className="border-t border-fd-border py-20">
          <SectionLabel index="05">bring your own agent</SectionLabel>
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight">Agent-agnostic over MCP.</h2>
            <p className="mt-4 text-sm leading-relaxed text-fd-muted-foreground">
              Register the MCP server against any Nema repo — Claude Code, Cursor, or your own
              pipeline. Your agent can search the corpus, read pages, and draft. It cannot approve.
              The contract it follows is <code>CLAUDE.md</code>, checked into the repo.
            </p>
            <div className="mt-8">
              <CopyCommand command="claude mcp add nema -- npx -y @getnema/cli mcp ." />
            </div>
          </div>
        </section>
      </main>

      {/* footer */}
      <footer className="border-t border-fd-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-10 text-xs text-fd-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            <Wordmark /> · apache-2.0 · your agents, your corpus, your infra
          </p>
          <div className="flex items-center gap-5">
            <Link href="/docs" className="transition-colors hover:text-fd-foreground">
              docs
            </Link>
            <Link href="/trust" className="transition-colors hover:text-fd-foreground">
              trust
            </Link>
            <a href="/llms.txt" className="transition-colors hover:text-fd-foreground">
              llms.txt
            </a>
            <a
              href={GITHUB_URL}
              rel="noreferrer noopener"
              className="transition-colors hover:text-fd-foreground"
            >
              github ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
