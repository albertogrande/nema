// SPDX-License-Identifier: Apache-2.0
//
// Two-agent concurrent-authoring demo — the multi-agent moat, end to end and
// self-verifying. It drives the *real* built CLI through three scenarios:
//
//   1. Slot leasing prevents a live clobber: two agents racing for the SAME page
//      resolve to one winner; the loser is refused and picks another page.
//   2. Disjoint concurrent work merges cleanly: two draft branches that own
//      different sections pass `nema coherence`.
//   3. The coherence gate is the backstop: when two branches create the same page
//      without a shared lease, `nema coherence` refuses the merge (slot-collision).
//
// Run from the repo root after `pnpm build`:  node scripts/demo-concurrent.mjs

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'packages', 'cli', 'dist', 'index.js');

let repo;
const log = (m) => process.stdout.write(`${m}\n`);
const git = (...args) => execFileSync('git', args, { cwd: repo, stdio: 'pipe' });

/** Run the CLI; return { code, out }. Never throws on a non-zero exit. */
function nema(args) {
  try {
    const out = execFileSync('node', [CLI, ...args], { cwd: repo, encoding: 'utf8' });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

function assert(cond, msg) {
  if (!cond) {
    log(`\n✗ FAILED: ${msg}`);
    rmSync(repo, { recursive: true, force: true });
    process.exit(1);
  }
  log(`  ✓ ${msg}`);
}

const page = (title, body) => `---\ntitle: ${title}\nstatus: draft\n---\n\n# ${title}\n\n${body}\n`;
const write = (rel, body) => {
  const file = join(repo, 'docs', rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body, 'utf8');
};

repo = mkdtempSync(join(tmpdir(), 'nema-demo-'));
try {
  // ---- base corpus on main ------------------------------------------------
  mkdirSync(join(repo, 'docs'), { recursive: true });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'demo@nema.dev');
  git('config', 'user.name', 'Nema Demo');
  write('index.md', page('Home', 'See [guides](/guides/index) and [api](/api/index).'));
  write('guides/index.md', page('Guides', 'Back [home](/index).'));
  write('api/index.md', page('API', 'Back [home](/index).'));
  git('add', '-A');
  git('commit', '-qm', 'base corpus');

  log('\n[1/3] Slot leasing prevents two live agents clobbering the same page');
  assert(nema(['claim', 'api/options', '--agent', 'agent-a']).code === 0, 'agent-a claims api/options');
  assert(
    nema(['claim', 'api/options', '--agent', 'agent-b']).code === 1,
    'agent-b is REFUSED the same page (lease held by agent-a)',
  );
  assert(
    nema(['claim', 'api/errors', '--agent', 'agent-b']).code === 0,
    'agent-b claims a different page (api/errors) and proceeds',
  );
  nema(['release', 'api/options', '--agent', 'agent-a']);
  nema(['release', 'api/errors', '--agent', 'agent-b']);
  rmSync(join(repo, '.nema'), { recursive: true, force: true });

  log('\n[2/3] Two branches owning different sections merge cleanly');
  git('checkout', '-q', '-b', 'nema/draft/agent-a');
  write('guides/setup.md', page('Setup', 'Back to [guides](/guides/index).'));
  write('guides/index.md', page('Guides', 'Back [home](/index). See [setup](/guides/setup).'));
  git('add', '-A');
  git('commit', '-qm', 'agent-a: guides/setup');
  git('checkout', '-q', 'main');
  git('checkout', '-q', '-b', 'nema/draft/agent-b');
  write('api/errors.md', page('Errors', 'Back to [api](/api/index).'));
  write('api/index.md', page('API', 'Back [home](/index). See [errors](/api/errors).'));
  git('add', '-A');
  git('commit', '-qm', 'agent-b: api/errors');
  git('checkout', '-q', 'main');
  const clean = nema(['coherence']);
  log(clean.out.trimEnd());
  assert(clean.code === 0, 'nema coherence passes — disjoint concurrent work merges');

  log('\n[3/3] The coherence gate catches a collision when leases were skipped');
  git('branch', '-q', '-D', 'nema/draft/agent-a');
  git('branch', '-q', '-D', 'nema/draft/agent-b');
  git('checkout', '-q', '-b', 'nema/draft/agent-a');
  write('api/options.md', page('Options', 'agent-a wrote this. Back [home](/index).'));
  write('index.md', page('Home', 'See [guides](/guides/index), [api](/api/index), [opts](/api/options).'));
  git('add', '-A');
  git('commit', '-qm', 'agent-a: api/options');
  git('checkout', '-q', 'main');
  git('checkout', '-q', '-b', 'nema/draft/agent-b');
  write('api/options.md', page('Options', 'agent-b wrote something ELSE. Back [home](/index).'));
  write('index.md', page('Home', 'See [guides](/guides/index), [api](/api/index), [opts](/api/options).'));
  git('add', '-A');
  git('commit', '-qm', 'agent-b: api/options');
  git('checkout', '-q', 'main');
  const collision = nema(['coherence']);
  log(collision.out.trimEnd());
  assert(collision.code === 1, 'nema coherence FAILS the merge');
  assert(/slot-collision/.test(collision.out), 'it reports a slot-collision on api/options');

  log('\n✓ Demo complete — the multi-agent moat holds end to end.');
} finally {
  rmSync(repo, { recursive: true, force: true });
}
