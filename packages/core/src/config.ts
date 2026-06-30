// SPDX-License-Identifier: Apache-2.0
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { createJiti } from 'jiti';
import type { NemaConfig, ResolvedConfig } from './types.js';

export const DEFAULT_CONFIG: Required<Omit<NemaConfig, 'nav' | 'contentModel'>> = {
  contentDir: 'docs',
  codeRoot: '.',
  reviewSlaDays: 180,
  rootExempt: ['index'],
  baseUrl: '',
};

/** Identity helper for typed config files: `export default defineConfig({...})`. */
export function defineConfig(config: NemaConfig): NemaConfig {
  return config;
}

const CONFIG_BASENAMES = [
  'nema.config.ts',
  'nema.config.mjs',
  'nema.config.js',
  'nema.config.json',
];

/** Locate and load the config file under `rootDir`, or return `{}` if none. */
export async function loadConfigFile(rootDir: string): Promise<NemaConfig> {
  for (const basename of CONFIG_BASENAMES) {
    const filePath = join(rootDir, basename);
    if (!existsSync(filePath)) continue;
    if (basename.endsWith('.json')) {
      return JSON.parse(readFileSync(filePath, 'utf8')) as NemaConfig;
    }
    const jiti = createJiti(import.meta.url);
    const mod = await jiti.import<NemaConfig>(filePath, { default: true });
    return mod ?? {};
  }
  return {};
}

/** Merge defaults + an optional config file into a fully resolved config. */
export async function resolveConfig(
  rootDir: string,
  overrides: NemaConfig = {},
): Promise<ResolvedConfig> {
  const root = isAbsolute(rootDir) ? rootDir : resolve(process.cwd(), rootDir);
  const fileConfig = await loadConfigFile(root);
  const merged = { ...DEFAULT_CONFIG, ...fileConfig, ...overrides };
  return {
    rootDir: root,
    contentDir: merged.contentDir,
    contentRoot: resolve(root, merged.contentDir),
    codeRoot: resolve(root, merged.codeRoot),
    reviewSlaDays: merged.reviewSlaDays,
    rootExempt: merged.rootExempt,
    baseUrl: merged.baseUrl,
    contentModel: merged.contentModel,
    nav: merged.nav,
  };
}
