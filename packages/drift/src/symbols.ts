// SPDX-License-Identifier: Apache-2.0

/**
 * Lightweight TS/JS symbol extraction — the shared substrate behind both
 * `nema generate` (export tables) and the drift fingerprint (`symbols`
 * strategy). It is deliberately a tolerant pattern matcher, not a full parser:
 * it captures the *public API surface* (export names + their signatures) well
 * enough to detect meaningful change, and degrades gracefully on anything it
 * cannot parse. The trade-off is documented where it bites (see
 * {@link symbolSignature}).
 *
 * The regexes here are deliberately linear (no `\s`-quantifier adjacent to `$`,
 * no regex built from input) so they stay safe to run over arbitrary file
 * contents — character scanning, not backtracking, does the heavy lifting.
 */

/** A single exported symbol discovered in a source file. */
export interface RepoExport {
  name: string;
  kind: string;
}

/** Kinds whose *body* is part of the API surface (members matter). */
const BLOCK_KINDS = new Set(['class', 'interface', 'enum', 'type']);

/** Characters at end-of-line that mean a declaration continues onto the next line. */
const CONTINUATION = new Set(['=', '|', '&', ',', '(', '<', ':', '+']);

/** `export const|function|class|… Name` — the exported declaration form. */
const EXPORT_DECL_RE =
  /export\s+(?:declare\s+)?(?:default\s+)?(const|let|var|function|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g;

/** Same, with the `export` keyword optional — locates a declaration by name. */
const DECL_RE =
  /(?:export\s+)?(?:declare\s+)?(?:default\s+)?(const|let|var|function|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g;

/** `export { A, B as C, type D }` — the export-list form. */
const EXPORT_LIST_RE = /export\s*(?:type\s*)?\{([^}]*)\}/g;

const IDENT_RE = /^[A-Za-z_$][\w$]*$/;

/** Extract exported symbol names from TS/JS source via lightweight pattern match. */
export function extractExports(source: string): RepoExport[] {
  const found = new Map<string, string>();

  for (const m of source.matchAll(EXPORT_DECL_RE)) {
    const kind = m[1] === 'let' || m[1] === 'var' ? 'const' : m[1]!;
    found.set(m[2]!, kind === 'function' ? 'function' : kind);
  }

  for (const m of source.matchAll(EXPORT_LIST_RE)) {
    for (const part of m[1]!.split(',')) {
      const token = part.trim();
      if (!token) continue;
      const name = (token.split(/\s+as\s+/).pop() ?? token).replace(/^type\s+/, '').trim();
      if (name === 'default') continue; // a default re-export has no useful symbol name
      if (IDENT_RE.test(name) && !found.has(name)) found.set(name, 'export');
    }
  }

  return [...found].map(([name, kind]) => ({ name, kind }));
}

/**
 * Normalize a signature so reformatting is never drift: collapse whitespace
 * runs to single spaces, then strip those (now single) spaces around structural
 * punctuation (`a: number` and `a:number` fingerprint the same). Word-separating
 * spaces (`extends Foo`, `keyof T`) are preserved. The second pass uses an
 * optional *single* space (` ?`) rather than `\s*` — safe and linear over
 * already-collapsed input.
 */
function normalizeWs(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ ?([(){}[\]<>:;,|&=?]) ?/g, '$1');
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
      // Character scan, not a `\s*$` regex, to keep this linear on file input.
      if (bodyAt < 0) {
        const line = source.slice(start, i);
        let end = line.length;
        while (end > 0 && (line[end - 1] === ' ' || line[end - 1] === '\t')) end--;
        if (!CONTINUATION.has(line[end - 1] ?? '')) break;
      }
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
 *
 * The declaration is located by scanning all declarations with a static regex
 * and matching the name — never by building a regex from `name` (which would be
 * a regex-injection / ReDoS hazard on untrusted source).
 */
export function symbolSignature(source: string, name: string): string | null {
  for (const m of source.matchAll(DECL_RE)) {
    if (m[2] !== name) continue;
    const kind = m[1] === 'let' || m[1] === 'var' ? 'const' : m[1]!;
    const { text, bodyAt } = captureDeclaration(source, m.index);
    const surface = BLOCK_KINDS.has(kind) || bodyAt < 0 ? text : text.slice(0, bodyAt);
    return `${kind} ${name} ${normalizeWs(surface)}`;
  }
  return null;
}
