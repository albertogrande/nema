// SPDX-License-Identifier: Apache-2.0

/**
 * Map a corpus-style Markdown link to its rendered route.
 *
 * Page bodies link to each other the way agents read them — relative `.md`
 * paths (`getting-started.md`, `../guides/x.md#anchor`). The raw `.md` and MCP
 * surfaces serve those verbatim (agent parity), but the human-facing HTML must
 * rewrite them to canonical routes: a relative href emitted as-is resolves
 * against the browser URL, which 404s from the index (`/docs` has no trailing
 * slash) and yields non-canonical `/docs/x.md` URLs everywhere else.
 *
 * Only relative links ending in `.md` (with an optional `#anchor`) are
 * rewritten; absolute paths, full URLs, mailto:, and pure anchors pass through.
 */
export function docHref(href: string, pagePath: string, basePath = '/docs'): string {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(href)) return href;
  const match = href.match(/^([^#?]+\.md)(#.*)?$/i);
  if (!match) return href;
  const [, file, anchor = ''] = match;

  // Resolve ./ and ../ segments against the linking page's directory.
  const dir = pagePath.includes('/') ? pagePath.slice(0, pagePath.lastIndexOf('/') + 1) : '';
  const segments: string[] = [];
  for (const part of `${dir}${file}`.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') segments.pop();
    else segments.push(part);
  }

  let route = segments.join('/').replace(/\.md$/i, '');
  if (route === 'index') route = '';
  return `${route ? `${basePath}/${route}` : basePath}${anchor}`;
}
