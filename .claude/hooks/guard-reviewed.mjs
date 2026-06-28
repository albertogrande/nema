// SPDX-License-Identifier: Apache-2.0
//
// PreToolUse guard — refuse any agent edit that promotes a page to `status: reviewed`.
// This is Nema's one invariant: an agent may only move a page stub->draft or draft->draft.
// Promotion to `reviewed` happens ONLY via human PR approval + the `nema approve` Action.
// See CLAUDE.md. The `draft-pages-not-reviewed` gate enforces this in CI; this hook catches
// it earlier — in the editor, before a PR is ever opened.
//
// Wired via .claude/settings.json (PreToolUse, matcher Write|Edit|MultiEdit). Exit code 2
// blocks the tool call and surfaces the message to the agent; any other exit allows it.
import { readFileSync } from 'node:fs';

let raw = '';
try {
  raw = readFileSync(0, 'utf8');
} catch {
  process.exit(0); // no input — nothing to guard
}

let input;
try {
  input = JSON.parse(raw);
} catch {
  process.exit(0);
}

const tool = input?.tool_input ?? {};
const path = typeof tool.file_path === 'string' ? tool.file_path : '';
if (!path.endsWith('.md') && !path.endsWith('.mdx')) process.exit(0);

// Collect every piece of text this edit would introduce.
const candidates = [];
if (typeof tool.content === 'string') candidates.push(tool.content);
if (typeof tool.new_string === 'string') candidates.push(tool.new_string);
if (Array.isArray(tool.edits)) {
  for (const edit of tool.edits) {
    if (typeof edit?.new_string === 'string') candidates.push(edit.new_string);
  }
}

const introducesReviewed = candidates.some((text) => /^\s*status:\s*reviewed\b/m.test(text));
if (introducesReviewed) {
  console.error(
    'Blocked by guard-reviewed: this edit sets `status: reviewed`.\n' +
      'An agent may only move a page stub->draft or draft->draft. Promotion to `reviewed` ' +
      'happens only via human PR approval and the `nema approve` Action — never by hand.\n' +
      'Set the page back to `status: draft`. See CLAUDE.md (the one invariant).',
  );
  process.exit(2);
}

process.exit(0);
