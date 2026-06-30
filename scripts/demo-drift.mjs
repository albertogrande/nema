// SPDX-License-Identifier: Apache-2.0
//
// Docs-stay-fresh demo — the code-drift engine, end to end and self-verifying.
// It drives the *real* built CLI through the lifecycle of a doc bound to code:
//
//   1. `nema bind` seeds a reviewed baseline; `nema drift` is clean.
//   2. A body-only edit to the bound code does NOT drift (the `symbols` strategy
//      fingerprints the API surface, not the implementation).
//   3. A signature change DOES drift: `nema drift --strict` fails and reports it.
//   4. Re-stamping the baseline (the manual equivalent of an approval) clears it.
//   5. Removing a tracked export is reported as a missing symbol.
//
// Run from the repo root after `pnpm build`:  node scripts/demo-drift.mjs

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'packages', 'cli', 'dist', 'index.js');

let repo;
const log = (m) => process.stdout.write(`${m}\n`);

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

const writeFile = (rel, body) => {
  const file = join(repo, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body, 'utf8');
};

const apiSrc = (param, body) =>
  `// the bound source\nexport function greet(name: ${param}): string {\n  return ${body};\n}\n`;

const page = `---
title: API reference
status: draft
diataxis: reference
---

# API reference

\`greet(name)\` returns a greeting.
`;

repo = mkdtempSync(join(tmpdir(), 'nema-drift-'));
try {
  writeFile('src/api.ts', apiSrc('string', '`hello, ${name}`'));
  writeFile('docs/api/reference.md', page);

  log('\n[1/5] Bind the page to its source and stamp a baseline');
  const bound = nema(['bind', 'api/reference', 'src/api.ts', '--symbols', 'greet']);
  log(bound.out.trimEnd());
  assert(bound.code === 0, 'nema bind seeds a baseline for api/reference → src/api.ts');
  const clean = nema(['drift', '--strict']);
  log(clean.out.trimEnd());
  assert(clean.code === 0 && /tracks its code/.test(clean.out), 'nema drift is clean');

  log('\n[2/5] A body-only change does NOT drift (API surface unchanged)');
  writeFile('src/api.ts', apiSrc('string', '`hi there, ${name}!`'));
  const bodyEdit = nema(['drift', '--strict']);
  assert(bodyEdit.code === 0, 'changing the function body alone leaves the page in sync');

  log('\n[3/5] A signature change DOES drift');
  writeFile('src/api.ts', apiSrc('number', '`hello, ${name}`'));
  const drifted = nema(['drift', '--strict']);
  log(drifted.out.trimEnd());
  assert(drifted.code === 1, 'nema drift --strict FAILS once the signature moved');
  assert(/\[changed\]/.test(drifted.out), 'it reports a [changed] binding on api/reference');

  log('\n[4/5] Re-stamping the baseline (the approval re-stamp) clears the drift');
  const restamp = nema(['bind', 'api/reference', 'src/api.ts', '--symbols', 'greet']);
  assert(restamp.code === 0 && /Re-stamped/.test(restamp.out), 'nema bind re-stamps the baseline');
  const cleanAgain = nema(['drift', '--strict']);
  assert(cleanAgain.code === 0, 'nema drift is clean again');

  log('\n[5/5] Removing a tracked export is reported as a missing symbol');
  writeFile('src/api.ts', '// greet is gone\nexport const VERSION = "1";\n');
  const missing = nema(['drift', '--strict']);
  log(missing.out.trimEnd());
  assert(missing.code === 1, 'nema drift --strict FAILS');
  assert(/missing symbols/.test(missing.out), 'it reports the removed `greet` export');

  log('\n✓ Demo complete — the code-drift engine keeps docs honest about the code.');
} finally {
  rmSync(repo, { recursive: true, force: true });
}
