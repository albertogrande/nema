// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  composeContent,
  isReviewed,
  latestTransition,
  readProvenanceFromContent,
  recordTransition,
  seedProvenance,
  setProvenanceInContent,
  toC2PAManifest,
  verifyProvenance,
} from '../src/index.js';

const DRAFT = `---
title: Widgets
status: draft
provenance:
  authored_by: ai
  model:
    name: claude-opus-4-8
    vendor: anthropic
  sources:
    - id: src-x
      title: Spec
      url: https://example.com/spec
      kind: primary
      retrieved: 2026-06-20
  transitions:
    - to: draft
      by: ai
      ts: 2026-06-20T14:02:00Z
      commit: 0b05f2a
---

Widgets connect to gizmos.[^src-x]

## Sources

[^src-x]: Spec — https://example.com/spec
`;

describe('read', () => {
  it('round-trips a valid provenance block', () => {
    const prov = readProvenanceFromContent(DRAFT);
    expect(prov?.authored_by).toBe('ai');
    expect(prov?.sources[0]?.id).toBe('src-x');
    expect(prov?.transitions[0]?.commit).toBe('0b05f2a');
  });
});

describe('seed + recordTransition', () => {
  it('seeds an AI draft with no transitions', () => {
    const prov = seedProvenance({ model: { name: 'claude-opus-4-8', vendor: 'anthropic' } });
    expect(prov.authored_by).toBe('ai');
    expect(prov.transitions).toEqual([]);
  });
  it('appends transitions immutably', () => {
    const seeded = seedProvenance({ model: { name: 'm' } });
    const drafted = recordTransition(seeded, {
      to: 'draft',
      by: 'ai',
      ts: '2026-06-20T14:02:00Z',
      commit: 'abc1234',
    });
    expect(seeded.transitions).toEqual([]); // original untouched
    expect(drafted.transitions).toHaveLength(1);
    expect(isReviewed(drafted)).toBe(false);
    expect(latestTransition(drafted)?.to).toBe('draft');
  });
});

describe('write', () => {
  it('updates provenance while preserving body and other frontmatter', () => {
    const prov = readProvenanceFromContent(DRAFT)!;
    const reviewed = recordTransition(prov, {
      to: 'reviewed',
      by: 'alberto',
      ts: '2026-06-23T09:10:00Z',
      commit: '8f51078',
      pr: 42,
    });
    const next = setProvenanceInContent(DRAFT, reviewed);
    expect(next).toContain('title: Widgets');
    expect(next).toContain('Widgets connect to gizmos.');
    const reparsed = readProvenanceFromContent(next);
    expect(reparsed?.transitions).toHaveLength(2);
    expect(reparsed?.transitions[1]?.pr).toBe(42);
  });
  it('composes a new file from frontmatter + body', () => {
    const content = composeContent({ title: 'New', status: 'draft' }, 'Body text.');
    expect(content.startsWith('---\n')).toBe(true);
    expect(content).toContain('Body text.');
  });
});

describe('verify', () => {
  it('passes a consistent AI draft', () => {
    const prov = readProvenanceFromContent(DRAFT)!;
    expect(verifyProvenance(prov, { status: 'draft', body: DRAFT })).toEqual([]);
  });
  it('flags a non-human author without a model', () => {
    const prov = seedProvenance({ authoredBy: 'ai' });
    const issues = verifyProvenance(prov);
    expect(issues.map((i) => i.rule)).toContain('model-required');
  });
  it('flags reviewed pages without reviewer or transition', () => {
    const prov = seedProvenance({ model: { name: 'm' } });
    const issues = verifyProvenance(prov, { status: 'reviewed' });
    expect(issues.map((i) => i.rule)).toContain('reviewed-needs-reviewer');
    expect(issues.map((i) => i.rule)).toContain('reviewed-needs-transition');
  });
  it('flags an unreferenced source', () => {
    const prov = readProvenanceFromContent(DRAFT)!;
    const issues = verifyProvenance(prov, { status: 'draft', body: 'No citations here.' });
    expect(issues.map((i) => i.rule)).toContain('source-unreferenced');
  });
});

describe('toC2PAManifest', () => {
  it('projects provenance into an unsigned manifest', () => {
    const prov = readProvenanceFromContent(DRAFT)!;
    const manifest = toC2PAManifest(prov, { title: 'Widgets' });
    expect(manifest.claim_generator).toContain('nema');
    expect(manifest.ingredients[0]?.title).toBe('Spec');
    const created = manifest.assertions.find((a) => a.label === 'c2pa.actions');
    expect(created).toBeTruthy();
  });
});
