// SPDX-License-Identifier: Apache-2.0
import { resolve } from 'node:path';
import { acquireLease } from '@getnema/producer';
import { defineCommand } from 'citty';
import { out } from '../util.js';

export const claimCommand = defineCommand({
  meta: {
    name: 'claim',
    description: 'Claim the authoring slot for a page (multi-agent concurrency lease)',
  },
  args: {
    path: { type: 'positional', required: true, description: 'Page route without .md' },
    agent: { type: 'string', required: true, description: 'Your stable agent id' },
    dir: { type: 'string', description: 'Repo root (default: cwd)' },
    branch: { type: 'string', description: 'Branch you are authoring on' },
  },
  run({ args }) {
    const rootDir = args.dir ? resolve(String(args.dir)) : process.cwd();
    const res = acquireLease({
      rootDir,
      path: String(args.path),
      agent: String(args.agent),
      branch: args.branch ? String(args.branch) : undefined,
    });
    if (res.ok) {
      out(
        `Slot "${args.path}" ${res.alreadyHeld ? 'already held by' : 'claimed for'} "${args.agent}".`,
      );
      return;
    }
    out(
      `Slot "${args.path}" is leased by "${res.lease.agent}" (since ${res.lease.ts}). ` +
        'Choose another page or wait for it to release.',
    );
    process.exitCode = 1;
  },
});
