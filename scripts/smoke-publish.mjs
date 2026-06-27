// SPDX-License-Identifier: Apache-2.0
//
// Phase 0 release smoke-test — proves a stranger's day-1 flow works from the
// *published artifacts*, with NO source build and NO registry copy of @getnema/*.
//
// It validates exactly what we're about to ship, before we ship it:
//   1. build every package
//   2. `npm pack` every publishable package into real tarballs
//   3. run `create-nema --app` straight from its tarball (no clone)
//   4. point the scaffold's @getnema/* deps at those tarballs (npm `overrides`,
//      so even transitive @getnema deps resolve to the packed artifacts)
//   5. `npm install` + `next build` — the day-1 `npm run dev` compile path
//
// Any failure exits non-zero. This is what CI runs against the publish candidates;
// post-publish the same flow works as a plain `npx create-nema --app` + install.
//
// Usage:  node scripts/smoke-publish.mjs  [--keep]   (--keep leaves temp dirs)

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const KEEP = process.argv.includes('--keep');
const step = (n, msg) => console.log(`\n→ [${n}] ${msg}`);
const run = (cmd, args, cwd = ROOT) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });

const cleanup = [];
process.on('exit', () => {
  if (KEEP) return;
  for (const d of cleanup) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {}
  }
});

// 1. build everything (so dist/ exists in every tarball)
step(1, 'pnpm -r build');
run('pnpm', ['-r', 'build']);

// 2. pack every publishable package into real tarballs
step(2, 'npm pack each publishable package');
const tarDir = mkdtempSync(join(tmpdir(), 'nema-tarballs-'));
cleanup.push(tarDir);
const tarballs = {}; // name -> absolute .tgz path
for (const entry of readdirSync(join(ROOT, 'packages'))) {
  const dir = join(ROOT, 'packages', entry);
  const pj = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  if (pj.private) continue;
  run('npm', ['pack', '--pack-destination', tarDir], dir);
  // npm's tarball name: scope-stripped, '/' -> '-', then -<version>.tgz
  const file = `${pj.name.replace(/^@/, '').replace('/', '-')}-${pj.version}.tgz`;
  tarballs[pj.name] = join(tarDir, file);
  console.log(`   packed ${pj.name} -> ${file}`);
}
if (!tarballs['create-nema']) throw new Error('create-nema did not pack');

// 3. scaffold an app straight from the create-nema tarball (no clone, no build)
step(3, 'create-nema --app from the tarball');
const proj = mkdtempSync(join(tmpdir(), 'nema-smoke-'));
cleanup.push(proj);
const appDir = join(proj, 'my-docs');
// `--package <tgz> create-nema` (not a bare tarball positional, which npx tries to exec).
run('npx', ['-y', '--package', tarballs['create-nema'], 'create-nema', appDir, '--app']);

// 4. resolve every @getnema/* dependency (direct AND transitive) to the tarballs
step(4, 'pin @getnema/* to the packed tarballs (npm overrides)');
const apjPath = join(appDir, 'package.json');
const apj = JSON.parse(readFileSync(apjPath, 'utf8'));
const fileSpec = (name) => `file:${tarballs[name]}`;
for (const sec of ['dependencies', 'devDependencies']) {
  for (const name of Object.keys(apj[sec] ?? {})) {
    if (tarballs[name]) apj[sec][name] = fileSpec(name);
  }
}
// overrides force transitive @getnema deps (e.g. adapter-fumadocs -> core) to the tarballs too.
apj.overrides = Object.fromEntries(Object.keys(tarballs).map((n) => [n, fileSpec(n)]));
writeFileSync(apjPath, `${JSON.stringify(apj, null, 2)}\n`);

// 5. install + build — the compile path behind day-1 `npm run dev`
step(5, 'npm install + next build');
run('npm', ['install', '--no-audit', '--no-fund'], appDir);
run('npm', ['run', 'build'], appDir);

console.log(
  '\n✅ smoke-publish: a stranger goes tarball → scaffold → install → build with no source checkout.',
);
