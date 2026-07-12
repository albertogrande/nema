// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/approve-action.ts', 'src/approve-command-action.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node22',
});
