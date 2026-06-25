// SPDX-License-Identifier: Apache-2.0
import type { Page } from './types.js';

/**
 * Canonical Markdown for a page: prepend an H1 from the title ONLY if the body
 * does not already begin with one. This is the single source of parity — both
 * the MCP `get_page` tool and an adapter's `.md` route MUST return exactly this,
 * so the two surfaces never diverge (and a page never shows a duplicated H1).
 */
export function renderMarkdown(page: Page): string {
  const needsTitle = Boolean(page.title) && !/^\s*#\s/.test(page.body);
  return needsTitle ? `# ${page.title}\n\n${page.body}` : page.body;
}
