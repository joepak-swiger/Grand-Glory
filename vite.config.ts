import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
  server: {
    host: '127.0.0.1',
    // Owner source art is kept outside public/ and is not part of the dev graph.
    // Keep Vite watching source and actual runtime files so normal HMR is unchanged.
    watch: { ignored: ['**/art-library/**'] },
  },
});
