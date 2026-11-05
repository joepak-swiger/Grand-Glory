import { defineConfig } from 'playwright/test';

const testPort = Number(process.env.GG_TEST_PORT ?? 4173);
if (!Number.isInteger(testPort) || testPort < 1024 || testPort > 65535) throw new Error('GG_TEST_PORT must be a valid unprivileged TCP port.');
const testUrl = `http://127.0.0.1:${testPort}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  fullyParallel: false,
  reporter: 'list',
  use: { baseURL: testUrl, trace: 'retain-on-failure' },
  webServer: { command: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${testPort} --strictPort`, url: testUrl, reuseExistingServer: !process.env.CI, timeout: 30_000 },
});
