#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
import { basename, resolve } from 'node:path';
import { scaffold } from './scaffold.js';

const positional = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const flags = process.argv.slice(2).filter((a) => a.startsWith('-'));
const target = positional[0] ?? '.';
const name = basename(resolve(target));
const force = flags.includes('--force');
const app = flags.includes('--app');

try {
  const result = scaffold({ target, name, force, app });
  for (const f of result.created) process.stdout.write(`  created  ${f}\n`);
  for (const f of result.skipped) process.stdout.write(`  skipped  ${f} (exists, use --force)\n`);
  const cd = target === '.' ? '' : `  cd ${target}\n`;
  // The app scaffold's payoff is a rendered page in the browser, so the last
  // step is `npm run dev` → a URL; the minimal scaffold ends at the gates.
  const lastSteps = app
    ? '  npm install\n  npm run dev          # → http://localhost:3000\n'
    : '  npm install\n  npm run check\n';
  process.stdout.write(`\n✓ Nema docs scaffolded in ${result.dir}\n\nNext:\n${cd}${lastSteps}`);
} catch (error) {
  process.stderr.write(`create-nema failed: ${(error as Error).message}\n`);
  process.exit(1);
}
