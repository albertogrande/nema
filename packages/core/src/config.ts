// SPDX-License-Identifier: Apache-2.0
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { createJiti } from 'jiti';
import type { ForgeConfig, ResolvedConfig } from './types.js';

export const DEFAULT_CONFIG: Required<Omit<ForgeConfig, 'nav'>> = {
  contentDir: 'docs',
  reviewSlaDays: 180,
  rootExempt: ['index'],
  baseUrl: '',
};

/** Identity helper for typed config files: `export default defineConfig({...})`. */
export function defineConfig(config: ForgeConfig): ForgeConfig {
  return config;
}

const CONFIG_BASENAMES = [
  'docforge.config.ts',
  'docforge.config.mjs',
  'docforge.config.js',
  'docforge.config.json',
];

/** Locate and load the config file under `rootDir`, or return `{}` if none. */
export async function loadConfigFile(rootDir: string): Promise<ForgeConfig> {
  for (const basename of CONFIG_BASENAMES) {
    const filePath = join(rootDir, basename);
    if (!existsSync(filePath)) continue;
    if (basename.endsWith('.json')) {
      return JSON.parse(readFileSync(filePath, 'utf8')) as ForgeConfig;
    }
    const jiti = createJiti(import.meta.url);
    const mod = await jiti.import<ForgeConfig>(filePath, { default: true });
    return mod ?? {};
  }
  return {};
}

/** Merge defaults + an optional config file into a fully resolved config. */
export async function resolveConfig(
  rootDir: string,
  overrides: ForgeConfig = {},
): Promise<ResolvedConfig> {
  const root = isAbsolute(rootDir) ? rootDir : resolve(process.cwd(), rootDir);
  const fileConfig = await loadConfigFile(root);
  const merged = { ...DEFAULT_CONFIG, ...fileConfig, ...overrides };
  return {
    rootDir: root,
    contentDir: merged.contentDir,
    contentRoot: resolve(root, merged.contentDir),
    reviewSlaDays: merged.reviewSlaDays,
    rootExempt: merged.rootExempt,
    baseUrl: merged.baseUrl,
    nav: merged.nav,
  };
}
