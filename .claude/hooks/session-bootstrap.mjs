import { execSync } from 'node:child_process';
// SPDX-License-Identifier: Apache-2.0
//
// SessionStart hook — make `nema check` usable in fresh sessions (e.g. Claude Code on the
// web, where the repo is cloned into a clean container). It ensures dependencies are
// installed and the CLI is built, then steps aside.
//
// Best-effort and idempotent: it never fails the session, and it skips any step whose
// artifacts already exist (so warm repos start instantly). Anything printed to stdout is
// added to the session context. Wired via .claude/settings.json (SessionStart).
import { existsSync } from 'node:fs';

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

const notes = [];

if (!existsSync('node_modules')) {
  notes.push(
    run('pnpm install --frozen-lockfile')
      ? 'installed dependencies'
      : 'dependency install failed — run `pnpm install`',
  );
}

// Build just the CLI and its dependencies (turbo handles ordering + caching) so the agent
// can run `nema check` without a manual build. Cheaper than building the whole monorepo.
if (existsSync('node_modules') && !existsSync('packages/cli/dist/index.js')) {
  notes.push(
    run('pnpm exec turbo run build --filter=@getnema/cli')
      ? 'built the nema CLI'
      : 'CLI build skipped — run `pnpm build` before `nema check`',
  );
}

if (notes.length) {
  console.log(`[nema bootstrap] ${notes.join('; ')}.`);
}
