// SPDX-License-Identifier: Apache-2.0
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface RunResult {
  stdout: string;
  stderr: string;
}

export interface RunOptions {
  /**
   * Extra environment variables, merged over the inherited environment. Used to
   * pass a scoped credential (e.g. `GH_TOKEN`) to a single subprocess without
   * leaking it into argv or the parent process.
   */
  env?: Record<string, string>;
}

/**
 * Run a binary with an explicit argument array — never a shell string — so
 * untrusted input (paths, titles, branch names) cannot be interpreted as shell
 * syntax. This is the only place the producer touches a subprocess.
 */
export async function run(
  cmd: string,
  args: string[],
  cwd: string,
  opts: RunOptions = {},
): Promise<RunResult> {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      cwd,
      maxBuffer: 32 * 1024 * 1024,
      encoding: 'utf8',
      ...(opts.env ? { env: { ...process.env, ...opts.env } } : {}),
    });
    return { stdout, stderr };
  } catch (error) {
    const e = error as { stderr?: string; stdout?: string; message?: string };
    const detail = (e.stderr || e.stdout || e.message || '').trim();
    throw new Error(`\`${cmd} ${args.join(' ')}\` failed: ${detail}`);
  }
}
