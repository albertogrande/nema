// SPDX-License-Identifier: Apache-2.0

/**
 * Stored lifecycle states for a page. `stale` is NOT here — it is computed at
 * read time (`review_by < today` on a `reviewed` page), never persisted.
 */
export const LIFECYCLE_STATES = ['stub', 'draft', 'reviewed', 'deprecated'] as const;
export type LifecycleState = (typeof LIFECYCLE_STATES)[number];

/** Computed (never-persisted) states layered on top of the stored state. */
export type ComputedState = 'stale';

/** All states a consumer might observe, stored or computed. */
export type ObservedState = LifecycleState | ComputedState;

/** Allowed stored→stored transitions (any actor). */
export const TRANSITIONS: Record<LifecycleState, readonly LifecycleState[]> = {
  stub: ['draft', 'deprecated'],
  draft: ['draft', 'reviewed', 'deprecated'],
  reviewed: ['reviewed', 'deprecated'],
  deprecated: [],
};

/**
 * Transitions an AGENT may perform autonomously. The invariant of the whole
 * platform: an agent may only advance a page to `draft`. Promotion to
 * `reviewed` is reserved for the human-approval-triggered Action.
 */
export const AGENT_ALLOWED_TRANSITIONS: ReadonlyArray<readonly [LifecycleState, LifecycleState]> = [
  ['stub', 'draft'],
  ['draft', 'draft'],
];

export function isValidTransition(from: LifecycleState, to: LifecycleState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isAgentAllowedTransition(from: LifecycleState, to: LifecycleState): boolean {
  return AGENT_ALLOWED_TRANSITIONS.some(([f, t]) => f === from && t === to);
}

export function isLifecycleState(value: unknown): value is LifecycleState {
  return typeof value === 'string' && (LIFECYCLE_STATES as readonly string[]).includes(value);
}
