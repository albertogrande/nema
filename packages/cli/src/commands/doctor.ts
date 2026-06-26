// SPDX-License-Identifier: Apache-2.0
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createContentSource, resolveConfig } from '@getnema/core';
import { checkContent } from '@getnema/gates';
import { defineCommand } from 'citty';
import { governanceChecks } from '../doctor/governance.js';
import { type Check, MARK } from '../doctor/types.js';
import { out } from '../util.js';

/** Probe a binary; returns its first stdout line, or null if it is missing/errors. */
function probe(cmd: string, args: string[]): string | null {
  try {
    const stdout = execFileSync(cmd, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return stdout.split('\n')[0]?.trim() ?? '';
  } catch {
    return null;
  }
}

function nodeCheck(): Check {
  const version = process.versions.node;
  const major = Number(version.split('.')[0]);
  return major >= 22
    ? { level: 'ok', label: `Node.js v${version} (>= 22)` }
    : {
        level: 'error',
        label: `Node.js v${version} is too old`,
        fix: 'Nema requires Node 22+ — upgrade Node (e.g. via nvm or your package manager).',
      };
}

function gitCheck(): Check {
  const v = probe('git', ['--version']);
  return v
    ? { level: 'ok', label: v.toLowerCase().startsWith('git') ? v : `git: ${v}` }
    : {
        level: 'error',
        label: 'git not found',
        fix: 'git is required for the producer loop (branch/commit/PR). Install git and retry.',
      };
}

function ghChecks(): Check[] {
  const v = probe('gh', ['--version']);
  if (!v) {
    return [
      {
        level: 'warn',
        label: 'GitHub CLI (gh) not found',
        fix: 'Needed for `nema open-pr` and the approval Action. Install from https://cli.github.com (a local/CI git host works without it).',
      },
    ];
  }
  const authed = probe('gh', ['auth', 'status']) !== null;
  return [
    { level: 'ok', label: `GitHub CLI: ${v}` },
    authed
      ? { level: 'ok', label: 'gh authenticated' }
      : {
          level: 'warn',
          label: 'gh not authenticated',
          fix: 'Run `gh auth login` before `nema open-pr`.',
        },
  ];
}

function configCheck(rootDir: string): Check {
  const found = ['nema.config.ts', 'nema.config.mjs', 'nema.config.js', 'nema.config.json'].find(
    (b) => existsSync(join(rootDir, b)),
  );
  return found
    ? { level: 'ok', label: `config: ${found}` }
    : {
        level: 'warn',
        label: 'no nema.config.* found — using defaults (contentDir: docs)',
        fix: 'Run `nema init` to scaffold a config, or pass the right directory.',
      };
}

export const doctorCommand = defineCommand({
  meta: {
    name: 'doctor',
    description:
      'Diagnose the environment, repo, and governance setup (Node/git/gh/config/content/gates + CI scope, promotion gate, branch protection, content model)',
  },
  args: {
    dir: { type: 'positional', required: false, description: 'Repo root (default: cwd)' },
    'skip-network': {
      type: 'boolean',
      description: 'Skip checks that call the gh CLI over the network (branch protection)',
    },
  },
  async run({ args }) {
    const rootDir = args.dir ? String(args.dir) : process.cwd();
    const checks: Check[] = [nodeCheck(), gitCheck(), ...ghChecks(), configCheck(rootDir)];

    // Content directory + page count.
    const config = await resolveConfig(rootDir);
    const contentRel = relative(rootDir, config.contentRoot) || '.';
    if (!existsSync(config.contentRoot)) {
      checks.push({
        level: 'warn',
        label: `content: ${contentRel}/ does not exist`,
        fix: 'Create it (or fix `contentDir`), then run `nema init` to add a starter page.',
      });
    } else {
      const source = await createContentSource(rootDir);
      const n = source.pages.length;
      checks.push(
        n > 0
          ? { level: 'ok', label: `content: ${contentRel}/ — ${n} page${n === 1 ? '' : 's'}` }
          : {
              level: 'warn',
              label: `content: ${contentRel}/ has no pages`,
              fix: 'Check `contentDir` points at your Markdown, or draft a first page.',
            },
      );

      // Gate summary (only meaningful once there is content).
      if (n > 0) {
        const result = await checkContent(rootDir);
        checks.push(
          result.ok
            ? { level: 'ok', label: `gates: all pass (${n} page${n === 1 ? '' : 's'})` }
            : {
                level: 'warn',
                label: `gates: ${result.errorCount} error(s), ${result.warningCount} warning(s)`,
                fix: 'Run `nema check` to see details, then `nema explain <rule>`.',
              },
        );
      }
    }

    // Governance / operator config the human-approval invariant depends on.
    checks.push(
      ...(await governanceChecks(rootDir, { skipNetwork: Boolean(args['skip-network']) })),
    );

    out(`nema doctor — ${rootDir}\n`);
    for (const c of checks) {
      out(`  ${MARK[c.level]} ${c.label}`);
      if (c.fix) out(`      → ${c.fix}`);
    }

    const errors = checks.filter((c) => c.level === 'error').length;
    const warnings = checks.filter((c) => c.level === 'warn').length;
    out('');
    if (errors > 0) {
      out(`${errors} blocking issue(s), ${warnings} warning(s). Fix the ✗ items above.`);
      process.exitCode = 1;
    } else if (warnings > 0) {
      out(`All required checks passed; ${warnings} warning(s) to review.`);
    } else {
      out('All checks passed. You are ready to draft, check, and propose.');
    }
  },
});
