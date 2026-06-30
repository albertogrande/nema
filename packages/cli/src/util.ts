// SPDX-License-Identifier: Apache-2.0
import { createContentSource, resolveConfig } from '@getnema/core';
import { type NemaHost, ProducerEngine } from '@getnema/producer';

export function out(message: string): void {
  process.stdout.write(`${message}\n`);
}

export function errOut(message: string): void {
  process.stderr.write(`${message}\n`);
}

export async function makeEngine(
  rootDir: string,
  host: NemaHost,
  opts: { reviewSlaDays?: number } = {},
): Promise<ProducerEngine> {
  const config = await resolveConfig(rootDir);
  return new ProducerEngine({
    rootDir,
    contentRoot: config.contentRoot,
    codeRoot: config.codeRoot,
    host,
    reviewSlaDays: opts.reviewSlaDays,
  });
}

/** Route paths of all pages currently in `draft`/`stub` (the proposable set). */
export async function draftPaths(rootDir: string): Promise<string[]> {
  const source = await createContentSource(rootDir);
  return source.pages.filter((p) => p.status === 'draft' || p.status === 'stub').map((p) => p.path);
}
