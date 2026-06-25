// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  AGENT_ALLOWED_TRANSITIONS,
  buildFrontmatterSchema,
  FrontmatterSchema,
  isAgentAllowedTransition,
  isValidISODate,
  isValidTransition,
  ProvenanceSchema,
} from '../src/index.js';

describe('isValidISODate', () => {
  it('accepts real dates', () => {
    expect(isValidISODate('2026-06-25')).toBe(true);
    expect(isValidISODate('2024-02-29')).toBe(true); // leap year
  });
  it('rejects shape mismatches and rollovers', () => {
    expect(isValidISODate('2026-6-1')).toBe(false);
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('2026-13-01')).toBe(false);
    expect(isValidISODate('not-a-date')).toBe(false);
  });
});

describe('lifecycle', () => {
  it('permits agent transitions only up to draft', () => {
    expect(isAgentAllowedTransition('stub', 'draft')).toBe(true);
    expect(isAgentAllowedTransition('draft', 'draft')).toBe(true);
    expect(isAgentAllowedTransition('draft', 'reviewed')).toBe(false);
    expect(isAgentAllowedTransition('stub', 'reviewed')).toBe(false);
  });
  it('never lets an agent reach reviewed', () => {
    for (const [, to] of AGENT_ALLOWED_TRANSITIONS) {
      expect(to).not.toBe('reviewed');
    }
  });
  it('validates stored transitions', () => {
    expect(isValidTransition('draft', 'reviewed')).toBe(true);
    expect(isValidTransition('deprecated', 'draft')).toBe(false);
  });
});

describe('ProvenanceSchema', () => {
  it('applies defaults and validates a draft record', () => {
    const parsed = ProvenanceSchema.parse({
      authored_by: 'ai',
      model: { name: 'claude-opus-4-8', vendor: 'anthropic' },
      transitions: [{ to: 'draft', by: 'ai', ts: '2026-06-20T14:02:00Z', commit: '0b05f2a' }],
    });
    expect(parsed.schema).toBe(1);
    expect(parsed.sources).toEqual([]);
    expect(parsed.transitions[0]?.to).toBe('draft');
  });
  it('rejects an unknown authored_by', () => {
    expect(() => ProvenanceSchema.parse({ authored_by: 'robot' })).toThrow();
  });
});

describe('FrontmatterSchema', () => {
  it('accepts a minimal valid draft', () => {
    const res = FrontmatterSchema.safeParse({ title: 'Hello', status: 'draft' });
    expect(res.success).toBe(true);
  });
  it('requires title and status', () => {
    expect(FrontmatterSchema.safeParse({ title: 'x' }).success).toBe(false);
    expect(FrontmatterSchema.safeParse({ status: 'draft' }).success).toBe(false);
  });
  it('rejects invalid enums and dates', () => {
    expect(FrontmatterSchema.safeParse({ title: 'x', status: 'nope' }).success).toBe(false);
    expect(
      FrontmatterSchema.safeParse({ title: 'x', status: 'draft', last_reviewed: '2026-13-01' })
        .success,
    ).toBe(false);
  });
  it('requires freshness fields when reviewed', () => {
    const res = FrontmatterSchema.safeParse({ title: 'x', status: 'reviewed' });
    expect(res.success).toBe(false);
    const ok = FrontmatterSchema.safeParse({
      title: 'x',
      status: 'reviewed',
      last_reviewed: '2026-06-01',
      review_by: '2026-12-01',
    });
    expect(ok.success).toBe(true);
  });
  it('enforces boundary rules from a custom model', () => {
    const schema = buildFrontmatterSchema({
      required: ['title', 'status'],
      enums: { status: ['draft'], kind: ['a', 'b'], flavor: ['x', 'y'] },
      dates: [],
      reviewedRequires: [],
      boundary: [{ when: { field: 'kind', equals: 'a' }, require: { field: 'flavor', in: ['x'] } }],
    });
    expect(schema.safeParse({ title: 't', status: 'draft', kind: 'a', flavor: 'y' }).success).toBe(
      false,
    );
    expect(schema.safeParse({ title: 't', status: 'draft', kind: 'a', flavor: 'x' }).success).toBe(
      true,
    );
  });
});
