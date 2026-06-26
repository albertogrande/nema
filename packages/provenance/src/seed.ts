// SPDX-License-Identifier: Apache-2.0
import {
  type AuthoredBy,
  type LifecycleState,
  type ModelInfo,
  type Provenance,
  ProvenanceSchema,
  type Source,
  type Transition,
  TransitionSchema,
} from '@getnema/schema';

export interface SeedInput {
  /** Defaults to `ai`. */
  authoredBy?: AuthoredBy;
  model?: ModelInfo;
  sources?: Source[];
}

/** Create a fresh provenance block for a new page (no transitions yet). */
export function seedProvenance(input: SeedInput = {}): Provenance {
  return ProvenanceSchema.parse({
    authored_by: input.authoredBy ?? 'ai',
    model: input.model,
    sources: input.sources ?? [],
    transitions: [],
  });
}

export interface TransitionInput {
  to: LifecycleState;
  by: string;
  ts: string;
  commit?: string;
  pr?: number;
}

/**
 * Append a lifecycle transition, returning a new provenance object (immutable).
 * History is append-only — existing transitions are never rewritten.
 */
export function recordTransition(prov: Provenance, input: TransitionInput): Provenance {
  const transition: Transition = TransitionSchema.parse(input);
  return { ...prov, transitions: [...prov.transitions, transition] };
}

/** Whether the page has ever been promoted to `reviewed`. */
export function isReviewed(prov: Provenance): boolean {
  return prov.transitions.some((t) => t.to === 'reviewed');
}

/** The most recent transition, or `null`. */
export function latestTransition(prov: Provenance): Transition | null {
  return prov.transitions.length ? prov.transitions[prov.transitions.length - 1]! : null;
}
