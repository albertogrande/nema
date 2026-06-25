// SPDX-License-Identifier: Apache-2.0
import { z } from 'zod';

/** Matches a `YYYY-MM-DD` shape (does not by itself prove the date is real). */
export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * True iff `s` is a real `YYYY-MM-DD` calendar date. Rejects shape mismatches
 * (e.g. `2026-6-1`) and rollovers (e.g. `2026-02-30`).
 */
export function isValidISODate(s: string): boolean {
  if (!ISO_DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === s;
}

/** Parse a `YYYY-MM-DD` string to a UTC `Date`, or `null` if invalid. */
export function parseISODate(s: string): Date | null {
  return isValidISODate(s) ? new Date(`${s}T00:00:00Z`) : null;
}

/** A Zod string refined to a valid `YYYY-MM-DD` calendar date. */
export const isoDate = z
  .string()
  .refine(isValidISODate, { message: 'must be a valid YYYY-MM-DD date' });
