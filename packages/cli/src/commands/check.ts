// SPDX-License-Identifier: Apache-2.0
import {
  checkContent,
  createFsGitState,
  formatGateResult,
  formatGateResultJson,
} from '@getnema/gates';
import { defineCommand } from 'citty';
import { out } from '../util.js';

export const checkCommand = defineCommand({
  meta: { name: 'check', description: 'Validate the docs against all gates' },
  args: {
    dir: { type: 'positional', required: false, description: 'Repo root (default: cwd)' },
    json: {
      type: 'boolean',
      description: 'Emit machine-readable JSON diagnostics (for CI tooling and agents)',
    },
  },
  async run({ args }) {
    const rootDir = args.dir ? String(args.dir) : process.cwd();
    const result = await checkContent(rootDir, { gitState: createFsGitState(rootDir) });
    out(args.json ? formatGateResultJson(result) : formatGateResult(result));
    if (!result.ok) process.exitCode = 1;
  },
});
