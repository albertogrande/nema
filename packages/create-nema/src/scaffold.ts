// SPDX-License-Identifier: Apache-2.0
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { type TemplateOptions, templates } from './templates.js';

export interface ScaffoldOptions extends TemplateOptions {
  /** Target directory (created if needed). */
  target: string;
  /** Overwrite existing files. Default false (existing files are skipped). */
  force?: boolean;
}

export interface ScaffoldResult {
  dir: string;
  created: string[];
  skipped: string[];
}

/** Write the starter files into the target directory. */
export function scaffold(opts: ScaffoldOptions): ScaffoldResult {
  const dir = resolve(opts.target);
  const created: string[] = [];
  const skipped: string[] = [];
  for (const [rel, content] of Object.entries(templates({ name: opts.name, app: opts.app }))) {
    const abs = join(dir, rel);
    if (existsSync(abs) && !opts.force) {
      skipped.push(rel);
      continue;
    }
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content, 'utf8');
    created.push(rel);
  }
  return { dir, created, skipped };
}
