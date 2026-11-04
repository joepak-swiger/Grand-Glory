import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const vitest = resolve(root, 'node_modules/vitest/vitest.mjs');
const result = spawnSync(process.execPath, [vitest, 'run', 'tests/performance.benchmark.test.ts', '--reporter=verbose'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, GG_RUN_PERF: '1', GG_PERF_STEPS: process.env.GG_PERF_STEPS ?? '600' },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
