// SPDX-License-Identifier: Apache-2.0
import { RULE_CATALOG, RULE_IDS, ruleDoc } from '@getnema/gates';
import { defineCommand } from 'citty';
import { errOut, out } from '../util.js';

/** Levenshtein distance — small inputs (rule ids), so the simple DP is plenty. */
function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0]!;
    dp[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const tmp = dp[i]!;
      dp[i] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[i]!, dp[i - 1]!);
      prev = tmp;
    }
  }
  return dp[a.length]!;
}

/** Closest known rule id within a small edit distance, for "did you mean". */
function closestRule(input: string): string | undefined {
  let best: string | undefined;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const id of RULE_IDS) {
    const d = editDistance(input, id);
    if (d < bestDist) {
      bestDist = d;
      best = id;
    }
  }
  return bestDist <= Math.max(3, Math.ceil(input.length / 2)) ? best : undefined;
}

function listRules(): void {
  out('nema gate rules — run `nema explain <rule>` for the full explanation:\n');
  const width = Math.max(...RULE_IDS.map((id) => id.length));
  for (const id of RULE_IDS) {
    out(`  ${id.padEnd(width)}  ${RULE_CATALOG[id]!.title}`);
  }
}

export const explainCommand = defineCommand({
  meta: {
    name: 'explain',
    description: 'Explain a gate rule: what it checks and how to fix it (no arg lists all rules)',
  },
  args: {
    rule: { type: 'positional', required: false, description: 'Rule id, e.g. reachability' },
  },
  async run({ args }) {
    if (!args.rule) {
      listRules();
      return;
    }

    const id = String(args.rule).trim();
    const doc = ruleDoc(id);
    if (!doc) {
      const suggestion = closestRule(id);
      errOut(`Unknown rule '${id}'.${suggestion ? ` Did you mean '${suggestion}'?` : ''}`);
      errOut(`\nKnown rules: ${RULE_IDS.join(', ')}`);
      process.exitCode = 1;
      return;
    }

    out(`[${doc.id}]  ${doc.title}\n`);
    out(`${doc.summary}\n`);
    for (const line of doc.details.split('\n')) out(line ? `  ${line}` : '');
  },
});
