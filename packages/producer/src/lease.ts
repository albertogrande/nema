// SPDX-License-Identifier: Apache-2.0
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Page-level leasing — the thin moat primitive for multi-agent concurrent
 * authoring. Branch isolation already lets agents write *different* pages without
 * clobbering (each `proposeChanges` lands on its own branch). The one real clobber
 * is two agents writing the *same* page at once; a lease prevents it.
 *
 * A lease is a tracked file under `.nema/leases/<path>.lease`. Acquisition is an
 * atomic `O_EXCL` create, so two agents racing for the same page resolve to one
 * winner at the filesystem layer — no coordination server. Leases expire (a dead
 * agent never strands a page); a robust distributed lock is the hosted surface.
 */

export const LEASE_DIR = '.nema/leases';
export const DEFAULT_LEASE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface Lease {
  /** Page route (no `.md`). */
  path: string;
  /** Stable id of the holding agent. */
  agent: string;
  /** ISO timestamp the lease was acquired. */
  ts: string;
  /** Optional branch the holder is authoring on. */
  branch?: string;
}

export interface AcquireLeaseInput {
  rootDir: string;
  path: string;
  agent: string;
  branch?: string;
  ttlMs?: number;
  now?: () => Date;
}

export interface AcquireLeaseResult {
  /** Whether the caller holds the lease after this call. */
  ok: boolean;
  /** The current holder — the caller's own lease when `ok`, else the blocker's. */
  lease: Lease;
  /** True when the caller already held a live lease (idempotent re-acquire). */
  alreadyHeld?: boolean;
}

function leaseFile(rootDir: string, path: string): string {
  return join(rootDir, LEASE_DIR, `${path}.lease`);
}

function isExpired(lease: Lease, now: Date, ttlMs: number): boolean {
  return now.getTime() - new Date(lease.ts).getTime() > ttlMs;
}

function readLeaseFile(file: string): Lease | null {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Lease;
  } catch {
    return null;
  }
}

function writeLeaseFile(file: string, lease: Lease): void {
  const fd = openSync(file, 'w');
  try {
    writeSync(fd, JSON.stringify(lease, null, 2));
  } finally {
    closeSync(fd);
  }
}

/**
 * Atomically acquire the lease for a page. Returns `ok: false` with the current
 * holder when another agent holds a live lease. Re-acquiring your own live lease
 * is idempotent; an expired lease is taken over.
 */
export function acquireLease(input: AcquireLeaseInput): AcquireLeaseResult {
  const now = (input.now ?? (() => new Date()))();
  const ttlMs = input.ttlMs ?? DEFAULT_LEASE_TTL_MS;
  const file = leaseFile(input.rootDir, input.path);
  const lease: Lease = {
    path: input.path,
    agent: input.agent,
    ts: now.toISOString(),
    ...(input.branch ? { branch: input.branch } : {}),
  };

  mkdirSync(dirname(file), { recursive: true });

  // Fast path: atomic create. Wins the race against a concurrent acquirer.
  try {
    const fd = openSync(file, 'wx'); // O_EXCL — fails if the file exists
    try {
      writeSync(fd, JSON.stringify(lease, null, 2));
    } finally {
      closeSync(fd);
    }
    return { ok: true, lease };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
  }

  // Someone holds it (or held it). Inspect the current lease.
  const current = readLeaseFile(file);
  if (!current) {
    // Unreadable/corrupt lease — treat as free and take it.
    writeLeaseFile(file, lease);
    return { ok: true, lease };
  }
  if (current.agent === input.agent && !isExpired(current, now, ttlMs)) {
    return { ok: true, lease: current, alreadyHeld: true };
  }
  if (isExpired(current, now, ttlMs)) {
    writeLeaseFile(file, lease); // dead holder — take over
    return { ok: true, lease };
  }
  return { ok: false, lease: current }; // live lease held by another agent
}

export interface ReleaseLeaseInput {
  rootDir: string;
  path: string;
  agent: string;
}

/** Release a lease you hold. Returns false if the page is held by another agent. */
export function releaseLease(input: ReleaseLeaseInput): { released: boolean } {
  const file = leaseFile(input.rootDir, input.path);
  if (!existsSync(file)) return { released: false };
  const current = readLeaseFile(file);
  if (current && current.agent !== input.agent) return { released: false };
  rmSync(file, { force: true });
  return { released: true };
}

/** Read the current lease for a page, or null if unleased. */
export function readLease(rootDir: string, path: string): Lease | null {
  const file = leaseFile(rootDir, path);
  return existsSync(file) ? readLeaseFile(file) : null;
}
