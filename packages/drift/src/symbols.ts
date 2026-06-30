// SPDX-License-Identifier: Apache-2.0

/**
 * Lightweight TS/JS symbol extraction — the shared substrate behind both
 * `nema generate` (export tables) and the drift fingerprint (`symbols`
 * strategy). It is deliberately a tolerant pattern matcher, not a full parser:
 * it captures the *public API surface* (export names + their signatures) well
 * enough to detect meaningful change, and degrades gracefully on anything it
 * cannot parse. The trade-off is documented where it bites (see
 * {@link symbolSignature}).
 */

/** A single exported symbol discovered in a source file. */
export interface RepoExport {
  name: string;
  kind: string;
}

/** Kinds whose *body* is part of the API surface (members matter). */
const BLOCK_KINDS = new Set(['class', 'interface', 'enum', 'type']);

/** Extract exported symbol names from TS/JS source via lightweight pattern match. */
export function extractExports(source: string): RepoExport[] {
  const found = new Map<string, string>();

  // `export const|function|class|type|interface|enum Name`
  const declRe =
    /export\s+(?:declare\s+)?(?:default\s+)?(const|let|var|function|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g;
  for (const m of source.matchAll(declRe)) {
    const kind = m[1] === 'let' || m[1] === 'var' ? 'const' : m[1]!;
    found.set(m[2]!, kind === 'function' ? 'function' : kind);
  }

  // `export { A, B as C, type D }`
  const listRe = /export\s*(?:type\s*)?\{([^}]*)\}/g;
  for (const m of source.matchAll(listRe)) {
    for (const part of m[1]!.split(',')) {
      const token = part.trim();
      if (!token) continue;
      const name = (token.split(/\s+as\s+/).pop() ?? token).replace(/^type\s+/, '').trim();
      if (name === 'default') continue; // a default re-export has no useful symbol name
      if (/^[A-Za-z_$][\w$]*$/.test(name) && !found.has(name)) found.set(name, 'export');
    }
  }

  return [...found].map(([name, kind]) => ({ name, kind }));
}

/**
 * Normalize a signature so reformatting is never drift: collapse whitespace
 * runs, then strip spaces around structural punctuation (`a: number` and
 * `a:number` fingerprint the same). Word-separating spaces (`extends Foo`,
 * `keyof T`) are preserved.
 */
function normalizeWs(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s*([(){}[\]<>:;,|&=?])\s*/g, '$1');
}

/**
 * Capture a single declaration's text starting at `start`, returning the slice
 * and the index of the first body-`{` seen at paren/bracket/angle depth 0 (the
 * point a callable's implementation begins). The scan is brace/paren/bracket/
 * angle aware so signatures with nested generics or object-typed params don't
 * terminate early.
 */
function captureDeclaration(source: string, start: number): { text: string; bodyAt: number } {
  let depth = 0; // () [] <>
  let brace = 0; // {}
  let bodyAt = -1;
  let i = start;
  for (; i < source.length; i++) {
    const ch = source[i]!;
    if (ch === '(' || ch === '[' || ch === '<') depth++;
    else if (ch === ')' || ch === ']' || ch === '>') depth = Math.max(0, depth - 1);
    else if (ch === '{') {
      if (depth === 0 && bodyAt < 0) bodyAt = i;
      brace++;
    } else if (ch === '}') {
      brace--;
      if (brace === 0) {
        i++; // include the closing brace of a block declaration
        break;
      }
    } else if (ch === ';' && depth === 0 && brace === 0) {
      break;
    } else if (ch === '\n' && depth === 0 && brace === 0) {
      // No braces opened yet → a single-line statement without a semicolon.
      // Stop unless the line clearly continues (ends on an operator/opener).
      if (bodyAt < 0 && !/[=|&,(<:+]\s*$/.test(source.slice(start, i))) break;
    }
  }
  return { text: source.slice(start, i), bodyAt: bodyAt < 0 ? -1 : bodyAt - start };
}

/**
 * The API signature of one exported symbol, or `null` if its declaration cannot
 * be located in the source (e.g. a bare `export { x } from './y'` re-export).
 *
 * For callables (`function`/`const`) the implementation body is dropped, so a
 * change to the parameters or return type drifts the fingerprint but an edit to
 * the body does not. For `class`/`interface`/`enum`/`type` the braced block IS
 * the surface, so it is kept. Whitespace is normalized so reformatting never
 * counts as drift.
 */
export function symbolSignature(source: string, name: string): string | null {
  const declRe = new RegExp(
    `(?:export\\s+)?(?:declare\\s+)?(?:default\\s+)?(const|let|var|function|class|type|interface|enum)\\s+${escapeRe(
      name,
    )}\\b`,
  );
  const m = declRe.exec(source);
  if (!m) return null;
  const kind = m[1] === 'let' || m[1] === 'var' ? 'const' : m[1]!;
  const { text, bodyAt } = captureDeclaration(source, m.index);
  const surface = BLOCK_KINDS.has(kind) || bodyAt < 0 ? text : text.slice(0, bodyAt);
  return `${kind} ${name} ${normalizeWs(surface)}`;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
