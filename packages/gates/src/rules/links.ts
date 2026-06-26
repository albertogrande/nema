// SPDX-License-Identifier: Apache-2.0
import { dirname, relative, resolve } from 'node:path';
import { type Page, findPage, headingSlugs } from '@getnema/core';
import { extractLinks } from '../markdown.js';
import type { Diagnostic, GateContext } from '../types.js';

const EXTERNAL_RE = /^(https?:|mailto:|tel:|ftp:)/i;

/** Resolve an internal link (route-absolute `/x` or file-relative `../x.md`) to a page. */
export function resolveLinkTarget(fromPage: Page, linkPath: string, ctx: GateContext): Page | null {
  if (linkPath.startsWith('/')) return findPage(ctx.pages, linkPath);
  const absTarget = resolve(dirname(fromPage.filePath), linkPath);
  const routeRel = relative(ctx.config.contentRoot, absTarget)
    .replace(/\\/g, '/')
    .replace(/\.md$/, '');
  return findPage(ctx.pages, routeRel);
}

/** Internal links resolve to a page, and `#anchors` resolve to a real heading. */
export function linkRules(ctx: GateContext): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const page of ctx.pages) {
    for (const raw of extractLinks(page.body)) {
      const link = raw.trim();
      if (!link || EXTERNAL_RE.test(link)) continue;

      const hashIdx = link.indexOf('#');
      const targetPath = hashIdx === -1 ? link : link.slice(0, hashIdx);
      const anchor = hashIdx === -1 ? '' : link.slice(hashIdx + 1);

      const target = targetPath === '' ? page : resolveLinkTarget(page, targetPath, ctx);
      if (!target) {
        out.push({
          rule: 'links-resolve',
          severity: 'error',
          path: page.path,
          message: `broken internal link -> ${link}`,
        });
        continue;
      }
      if (anchor && !headingSlugs(target.body).has(anchor)) {
        out.push({
          rule: 'anchors-resolve',
          severity: 'error',
          path: page.path,
          message: `link -> ${link} has no matching heading #${anchor} in ${target.path}`,
        });
      }
    }
  }
  return out;
}
