// SPDX-License-Identifier: Apache-2.0
import { checkContent, formatGateResult } from '@nema/gates';
import { defineCommand } from 'citty';
import { out } from '../util.js';

export const checkCommand = defineCommand({
  meta: { name: 'check', description: 'Validate the docs against all gates' },
  args: {
    dir: { type: 'positional', required: false, description: 'Repo root (default: cwd)' },
  },
  async run({ args }) {
    const rootDir = args.dir ? String(args.dir) : process.cwd();
    const result = await checkContent(rootDir);
    out(formatGateResult(result));
    if (!result.ok) process.exitCode = 1;
  },
});
