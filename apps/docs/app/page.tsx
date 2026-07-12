// SPDX-License-Identifier: Apache-2.0
import Link from 'next/link';
import type { ReactNode } from 'react';
import { CopyCommand } from '@/components/copy-command';
import { DiffBlock, DiffLine } from '@/components/diff-block';
import { Reveal } from '@/components/reveal';
import { SectionHeading } from '@/components/section-heading';
import { Comment, Ok, Out, Prompt, Terminal } from '@/components/terminal';
import { Wordmark } from '@/components/wordmark';

export const metadata = {
  title: 'Nema — your coding agents write the docs, you approve the PR',
  description:
    'Your coding agents write the docs; you approve the PR. Open-source docs platform with human-gated review, git-diffable provenance, gate checks, and code-drift tracking.',
};

const GITHUB_URL = 'https://github.com/albertogrande/nema';

const BADGES = ['open source', 'self-hostable', 'apache-2.0', 'alpha'];

const LOOP_STEPS: { title: string; body: string; gate?: boolean }[] = [
  {
    title: 'agent drafts',
    body: 'The agent authors the page — status: draft, provenance seeded from the first commit.',
  },
  {
    title: 'gates check',
    body: 'nema check runs the same gates CI will, with a fix hint per diagnostic to self-correct against.',
  },
  {
    title: 'agent proposes',
    body: 'A branch, a provenance trailer, and a pull request labeled nema:draft.',
  },
  {
    title: 'a human approves',
    body: 'The only path to reviewed. The loop is designed to be driven by an agent — except this step, which is designed so it can’t be.',
    gate: true,
  },
];

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

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: 'Do I need a coding agent to use Nema?',
    a: (
      <>
        No. <code>npx create-nema my-docs --app</code> gets you a rendered docs site with no git, no
        account, and no agent. Agents are how pages get authored and maintained at scale — humans
        write too, and provenance records it either way (<code>authored_by</code>: <code>ai</code>,{' '}
        <code>human</code>, or <code>mixed</code>).
      </>
    ),
  },
  {
    q: 'Which agents does it work with?',
    a: (
      <>
        Any MCP client — Claude Code, Cursor, or your own pipeline driving the CLI. The contract the
        agent follows is a <code>CLAUDE.md</code> checked into the repo.
      </>
    ),
  },
  {
    q: 'What stops an agent from approving its own page?',
    a: (
      <>
        The invariant is enforced in three places: the <code>draft-pages-not-reviewed</code> gate
        fails any PR that self-promotes, the MCP write tools refuse to set <code>reviewed</code>,
        and there is no promote tool to call. The only path to <code>reviewed</code> is a human PR
        approval.
      </>
    ),
  },
  {
    q: 'What happens if nobody approves a draft?',
    a: (
      <>
        It stays a draft — rendered with its draft provenance badge, never claiming review. The{' '}
        <Link href="/trust" className="underline underline-offset-4">
          /trust
        </Link>{' '}
        dashboard shows exactly what is waiting on a human.
      </>
    ),
  },
  {
    q: 'Is it really self-hostable? What’s the license?',
    a: (
      <>
        Apache-2.0, and the corpus is plain markdown with YAML frontmatter in your own git repo. The
        site is a Next.js app you can deploy anywhere; the engine underneath is renderer-agnostic.
      </>
    ),
  },
  {
    q: 'How production-ready is it?',
    a: (
      <>
        Nema is v0.4, alpha. The invariant, the gates, and the approval Action are CI-enforced and
        dogfooded on this repo’s own docs — but expect the surface to keep moving.
      </>
    ),
  },
];

/* ── invariant diagram ─────────────────────────────────────────────────── */

function StateNode({ children, highlight = false }: { children: ReactNode; highlight?: boolean }) {
  return (
    <div
      className={`rounded-md border px-6 py-3 font-mono text-sm ${
        highlight
          ? 'border-nema-accent/60 bg-nema-accent/5 font-semibold text-nema-accent'
          : 'border-fd-border bg-fd-card'
      }`}
    >
      {children}
    </div>
  );
}

function StateEdge({ label, gate = false }: { label: string; gate?: boolean }) {
  const labelClass = gate
    ? 'rounded-full border border-nema-accent/50 px-2.5 py-0.5 text-nema-accent'
    : 'text-fd-muted-foreground';
  return (
    <div className="flex items-center py-1 sm:flex-1 sm:py-0">
      <div className="flex items-center gap-2 sm:hidden">
        <span aria-hidden className={gate ? 'text-nema-accent' : 'text-fd-muted-foreground'}>
          ↓
        </span>
        <span className={`font-mono text-[11px] uppercase tracking-wider ${labelClass}`}>
          {label}
        </span>
      </div>
      <div aria-hidden className="hidden w-full items-center sm:flex">
        <span className={`h-px flex-1 ${gate ? 'bg-nema-accent/70' : 'bg-fd-border'}`} />
        <span
          className={`mx-1.5 text-center font-mono text-[11px] uppercase tracking-wider ${labelClass}`}
        >
          {label}
        </span>
        <span className={`h-px flex-1 ${gate ? 'bg-nema-accent/70' : 'bg-fd-border'}`} />
        <span
          className={`border-y-4 border-l-[6px] border-y-transparent ${
            gate ? 'border-l-nema-accent' : 'border-l-fd-muted-foreground/60'
          }`}
        />
      </div>
    </div>
  );
}

/* ── page ──────────────────────────────────────────────────────────────── */

export default function Home() {
  return (
    <div className="bg-fd-background font-sans text-fd-foreground antialiased">
      {/* nav */}
      <header className="sticky top-0 z-40 border-b border-fd-border/80 bg-fd-background/80 backdrop-blur-md">
        <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" aria-label="Nema home" className="text-fd-foreground">
            <Wordmark className="h-4" />
          </Link>
          <div className="flex items-center gap-6 font-mono text-sm text-fd-muted-foreground">
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
        <section className="pb-20 pt-16 sm:pb-28 sm:pt-24">
          <div className="flex flex-wrap gap-2">
            {BADGES.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-fd-border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-fd-muted-foreground"
              >
                {badge}
              </span>
            ))}
          </div>
          <h1 className="mt-8 max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.5rem]">
            Your coding agents write the docs.
            <br />
            You approve the PR.
            <span
              aria-hidden
              className="nema-cursor ml-2 inline-block h-[0.8em] w-[0.45em] translate-y-[0.08em] bg-nema-brand"
            />
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-relaxed text-fd-muted-foreground sm:text-lg">
            Nema is an open-source, self-hostable docs platform built for agent authorship. Your
            agents draft, link, and maintain pages with full context of the corpus — and nothing
            reaches{' '}
            <code className="font-mono text-sm text-fd-foreground sm:text-base">reviewed</code>{' '}
            without a human PR approval. Provenance is git-diffable data, not a footnote.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/docs"
              className="rounded-md bg-fd-primary px-6 py-3 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-85"
            >
              Read the docs →
            </Link>
            <a
              href={GITHUB_URL}
              rel="noreferrer noopener"
              className="rounded-md border border-fd-border px-6 py-3 text-sm font-medium transition-colors hover:bg-fd-accent"
            >
              GitHub ↗
            </a>
            <Link
              href="/trust"
              className="text-sm text-fd-muted-foreground underline underline-offset-4 transition-colors hover:text-fd-foreground"
            >
              see the live /trust dashboard
            </Link>
          </div>
          <div className="mt-12 max-w-xl">
            <CopyCommand command="npx create-nema my-docs --app" />
            <p className="mt-3 font-mono text-xs text-fd-muted-foreground">
              node 22+ · no git, no account, no agent required to get to a rendered site
            </p>
          </div>
        </section>

        {/* 00 / problem */}
        <section className="border-t border-fd-border py-20 sm:py-24">
          <SectionHeading
            index="00"
            label="the problem"
            title="Agents made shipping fast. Docs didn’t get faster."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {(
              [
                {
                  label: 'the current way',
                  body: 'Your agents ship code faster than anyone documents it. So you ask them to write the docs too — and commit whatever comes out.',
                },
                {
                  label: 'the limitation',
                  body: 'Raw agent output has no review gate, no record of which model or sources produced it, and no check that links resolve or that the code still matches.',
                },
                {
                  label: 'the pain',
                  body: 'You choose between reviewing every word yourself or publishing pages nobody can vouch for. Most teams quietly choose neither — and the docs rot.',
                },
              ] as const
            ).map((card, i) => (
              <Reveal
                key={card.label}
                delay={i * 80}
                className="rounded-lg border border-fd-border bg-fd-card/50 p-6 transition-colors hover:border-nema-accent/40"
              >
                <p className="font-mono text-xs text-nema-accent">{card.label}</p>
                <p className="mt-3 text-sm leading-relaxed text-fd-muted-foreground">{card.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* 01 / producer loop */}
        <section className="border-t border-fd-border py-20 sm:py-24">
          <SectionHeading
            index="01"
            label="the producer loop"
            title="Draft → check → propose → a human approves."
          />
          <div className="mt-12 grid items-start gap-10 lg:grid-cols-[2fr_3fr] lg:gap-14">
            <Reveal>
              <ol className="space-y-0">
                {LOOP_STEPS.map((step, i) => (
                  <li key={step.title} className="relative flex gap-5 pb-8 last:pb-0">
                    {i < LOOP_STEPS.length - 1 ? (
                      <span
                        aria-hidden
                        className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-fd-border"
                      />
                    ) : null}
                    <span
                      className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border font-mono text-xs ${
                        step.gate
                          ? 'border-nema-accent/60 bg-nema-accent/5 text-nema-accent'
                          : 'border-fd-border bg-fd-card text-fd-muted-foreground'
                      }`}
                    >
                      {`0${i + 1}`}
                    </span>
                    <div className="pt-1">
                      <h3
                        className={`font-mono text-sm ${
                          step.gate ? 'font-semibold text-nema-accent' : 'text-fd-foreground'
                        }`}
                      >
                        {step.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-fd-muted-foreground">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </Reveal>
            <Reveal delay={120}>
              <Terminal title="~/my-docs">
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
                  <span className="text-nema-accent">→</span> PR #42 · nema:draft · awaiting human
                  approval
                </Out>

                <Comment>4 — a human approves the PR. the only path to `reviewed`.</Comment>
                <Out>
                  <Ok /> nema approve · draft → reviewed · freshness stamped · merged
                </Out>
              </Terminal>
            </Reveal>
          </div>
        </section>

        {/* 02 / features */}
        <section className="border-t border-fd-border py-20 sm:py-24">
          <SectionHeading index="02" label="what you get" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <Reveal
                key={feature.token}
                delay={(i % 3) * 80}
                className="group rounded-lg border border-fd-border bg-fd-card/50 p-6 transition-all hover:-translate-y-0.5 hover:border-nema-accent/40 hover:shadow-sm"
              >
                <p className="font-mono text-xs text-nema-accent">{feature.token}</p>
                <h3 className="mt-3 text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
                  {feature.body}
                </p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* 03 / the invariant */}
        <section className="border-t border-fd-border py-20 sm:py-24">
          <SectionHeading
            index="03"
            label="the one invariant"
            title="The one transition an agent can’t make."
          />
          <Reveal className="mt-10">
            <div className="rounded-lg border border-fd-border bg-fd-card/50 p-6 sm:p-10">
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
                <StateNode>stub</StateNode>
                <StateEdge label="agent" />
                <StateNode>draft</StateNode>
                <StateEdge label="human approval" gate />
                <StateNode highlight>reviewed</StateNode>
              </div>
              <p className="mt-8 text-center font-mono text-xs leading-relaxed text-fd-muted-foreground">
                agent territory: <code>stub → draft</code>, <code>draft → draft</code> — redraft as
                often as it likes.
                <br className="hidden sm:block" /> <code>draft → reviewed</code> happens on{' '}
                <span className="text-nema-accent">human PR approval only</span>.
              </p>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-fd-muted-foreground">
              Enforced three ways: the <code>draft-pages-not-reviewed</code> gate fails any PR that
              self-promotes, the MCP write tools refuse <code>reviewed</code>, and no promote tool
              exists to call.
            </p>
          </Reveal>
        </section>

        {/* 04 / provenance */}
        <section className="border-t border-fd-border py-20 sm:py-24">
          <SectionHeading index="04" label="provenance" />
          <div className="mt-10 grid items-start gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Approval is a diff.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-fd-muted-foreground sm:text-base">
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
            <Reveal delay={100}>
              <DiffBlock>
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
              </DiffBlock>
            </Reveal>
          </div>
        </section>

        {/* 05 / bring your own agent */}
        <section className="border-t border-fd-border py-20 sm:py-24">
          <SectionHeading
            index="05"
            label="bring your own agent"
            title="Agent-agnostic over MCP."
            lede={
              <>
                Register the MCP server against any Nema repo — Claude Code, Cursor, or your own
                pipeline. Your agent can search the corpus, read pages, and draft. It cannot
                approve. The contract it follows is <code>CLAUDE.md</code>, checked into the repo.
              </>
            }
          />
          <div className="mt-8 max-w-xl">
            <CopyCommand command="claude mcp add nema -- npx -y @getnema/cli mcp ." />
          </div>
        </section>

        {/* 06 / faq */}
        <section className="border-t border-fd-border py-20 sm:py-24">
          <SectionHeading index="06" label="faq" title="Common questions." />
          <div className="mt-8 max-w-3xl">
            {FAQ.map((item) => (
              <details key={item.q} className="group border-b border-fd-border py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-sm font-medium sm:text-base [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span
                    aria-hidden
                    className="shrink-0 font-mono text-lg text-nema-accent transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fd-muted-foreground">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* get started */}
        <section className="border-t border-fd-border py-24 sm:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Start in a minute.
              <span
                aria-hidden
                className="nema-cursor ml-2 inline-block h-[0.75em] w-[0.42em] translate-y-[0.06em] bg-nema-brand"
              />
            </h2>
            <p className="mt-4 text-fd-muted-foreground">
              One command to a rendered site. Add your agent when you’re ready.
            </p>
            <div className="mx-auto mt-8 max-w-xl text-left">
              <CopyCommand command="npx create-nema my-docs --app" />
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/docs"
                className="rounded-md bg-fd-primary px-6 py-3 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-85"
              >
                Read the docs →
              </Link>
              <a
                href={GITHUB_URL}
                rel="noreferrer noopener"
                className="rounded-md border border-fd-border px-6 py-3 text-sm font-medium transition-colors hover:bg-fd-accent"
              >
                GitHub ↗
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* footer */}
      <footer className="border-t border-fd-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-10 font-mono text-xs text-fd-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            <Wordmark className="h-3 text-fd-foreground" />
            <span>· apache-2.0 · your agents, your corpus, your infra</span>
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
