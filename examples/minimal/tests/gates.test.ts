// SPDX-License-Identifier: Apache-2.0
import { fileURLToPath } from 'node:url';
import { checkContent, formatGateResult } from '@getnema/gates';
import { describe, expect, it } from 'vitest';

const rootDir = fileURLToPath(new URL('..', import.meta.url));

describe('examples/minimal', () => {
  it('is gate-clean (dogfooding the gates on a real corpus)', async () => {
    const result = await checkContent(rootDir);
    expect(result.diagnostics, formatGateResult(result)).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
