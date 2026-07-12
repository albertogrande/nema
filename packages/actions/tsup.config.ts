// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/approve-action.ts', 'src/approve-command-action.ts'],
  format: ['esm'],
  // No code splitting: the action entrypoints carry a run-when-executed guard
  // comparing import.meta.url to argv[1]; a shared chunk would swallow the
  // module body and the script would exit silently without running.
  splitting: false,
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node22',
});
