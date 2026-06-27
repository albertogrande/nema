// SPDX-License-Identifier: Apache-2.0
import { resolve } from 'node:path';
import { releaseLease } from '@getnema/producer';
import { defineCommand } from 'citty';
import { out } from '../util.js';

export const releaseCommand = defineCommand({
  meta: {
    name: 'release',
    description: 'Release a page authoring slot you hold',
  },
  args: {
    path: { type: 'positional', required: true, description: 'Page route without .md' },
    agent: { type: 'string', required: true, description: 'Your stable agent id' },
    dir: { type: 'string', description: 'Repo root (default: cwd)' },
  },
  run({ args }) {
    const rootDir = args.dir ? resolve(String(args.dir)) : process.cwd();
    const { released } = releaseLease({
      rootDir,
      path: String(args.path),
      agent: String(args.agent),
    });
    if (released) {
      out(`Released slot "${args.path}".`);
      return;
    }
    out(`Slot "${args.path}" is not held by "${args.agent}" (nothing released).`);
    process.exitCode = 1;
  },
});
