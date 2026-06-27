// SPDX-License-Identifier: Apache-2.0

/**
 * A compact line-level three-way merge (the core of `diff3`/`git merge`).
 *
 * The coherence gate needs to know whether two branches that both edited a shared
 * page (the classic case: both append a nav link to the index) merge *cleanly* —
 * exactly what git would do — or genuinely conflict. Page-level "the bytes differ
 * ⇒ collision" over-reports independent edits; this resolves them the way a real
 * merge does, and only flags overlapping changes.
 */

/** Longest common subsequence of two line arrays, as increasing index pairs. */
function lcsPairs(x: string[], y: string[]): Array<[number, number]> {
  const n = x.length;
  const m = y.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] = x[i] === y[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  const pairs: Array<[number, number]> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      i++;
    } else {
      j++;
    }
  }
  return pairs;
}

export interface Diff3Result {
  clean: boolean;
  lines: string[];
}

const eq = (a: string[], b: string[]): boolean => a.length === b.length && a.every((l, i) => l === b[i]);

/**
 * Three-way merge of `a` and `b` against common ancestor `o`. Anchors are lines
 * common to all three; between anchors, a region where only one side changed takes
 * that side, where both sides made the same change takes it once, and where both
 * changed differently is a conflict (`clean: false`).
 */
export function diff3Merge(o: string[], a: string[], b: string[]): Diff3Result {
  const aOf = new Map(lcsPairs(o, a)); // o-index -> a-index (stable o∩a lines)
  const bOf = new Map(lcsPairs(o, b)); // o-index -> b-index
  const anchors: Array<{ o: number; a: number; b: number }> = [];
  for (let oi = 0; oi < o.length; oi++) {
    if (aOf.has(oi) && bOf.has(oi)) anchors.push({ o: oi, a: aOf.get(oi)!, b: bOf.get(oi)! });
  }

  const out: string[] = [];
  let clean = true;
  let oPrev = 0;
  let aPrev = 0;
  let bPrev = 0;

  const emitRegion = (oEnd: number, aEnd: number, bEnd: number): void => {
    const oc = o.slice(oPrev, oEnd);
    const ac = a.slice(aPrev, aEnd);
    const bc = b.slice(bPrev, bEnd);
    if (eq(ac, oc)) out.push(...bc); // only B changed (or nobody)
    else if (eq(bc, oc)) out.push(...ac); // only A changed
    else if (eq(ac, bc)) out.push(...ac); // both made the same change
    else {
      clean = false; // overlapping, divergent change
      out.push(...ac, ...bc); // keep both sides' content for the (now-broken) merged view
    }
  };

  for (const anchor of anchors) {
    emitRegion(anchor.o, anchor.a, anchor.b);
    out.push(o[anchor.o]!); // the shared anchor line
    oPrev = anchor.o + 1;
    aPrev = anchor.a + 1;
    bPrev = anchor.b + 1;
  }
  emitRegion(o.length, a.length, b.length); // trailing region

  return { clean, lines: out };
}
