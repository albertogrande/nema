// SPDX-License-Identifier: Apache-2.0
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LEASE_DIR, acquireLease, readLease, releaseLease } from '../src/lease.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'nema-lease-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('acquireLease', () => {
  it('grants a free slot and writes a tracked lease file', () => {
    const res = acquireLease({ rootDir: root, path: 'api/reference', agent: 'a' });
    expect(res.ok).toBe(true);
    expect(res.lease.agent).toBe('a');
    expect(existsSync(join(root, LEASE_DIR, 'api/reference.lease'))).toBe(true);
  });

  it('refuses a slot held live by another agent, returning the holder', () => {
    acquireLease({ rootDir: root, path: 'guide', agent: 'a' });
    const res = acquireLease({ rootDir: root, path: 'guide', agent: 'b' });
    expect(res.ok).toBe(false);
    expect(res.lease.agent).toBe('a');
  });

  it('is idempotent for the same agent re-acquiring its live lease', () => {
    acquireLease({ rootDir: root, path: 'guide', agent: 'a' });
    const res = acquireLease({ rootDir: root, path: 'guide', agent: 'a' });
    expect(res.ok).toBe(true);
    expect(res.alreadyHeld).toBe(true);
  });

  it('takes over an expired lease', () => {
    const t0 = () => new Date('2026-06-25T12:00:00Z');
    acquireLease({ rootDir: root, path: 'guide', agent: 'a', ttlMs: 1000, now: t0 });
    const later = () => new Date('2026-06-25T12:05:00Z'); // 5 min later, ttl 1s
    const res = acquireLease({ rootDir: root, path: 'guide', agent: 'b', ttlMs: 1000, now: later });
    expect(res.ok).toBe(true);
    expect(res.lease.agent).toBe('b');
  });
});

describe('releaseLease', () => {
  it('lets the holder release, freeing the slot for another agent', () => {
    acquireLease({ rootDir: root, path: 'guide', agent: 'a' });
    expect(releaseLease({ rootDir: root, path: 'guide', agent: 'a' }).released).toBe(true);
    expect(readLease(root, 'guide')).toBeNull();
    expect(acquireLease({ rootDir: root, path: 'guide', agent: 'b' }).ok).toBe(true);
  });

  it('does not let a non-holder release someone else’s lease', () => {
    acquireLease({ rootDir: root, path: 'guide', agent: 'a' });
    expect(releaseLease({ rootDir: root, path: 'guide', agent: 'b' }).released).toBe(false);
    expect(readLease(root, 'guide')?.agent).toBe('a');
  });
});
