import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Next resolves the `@/*` alias from tsconfig.json; Vitest does not, so it is
 * mirrored here. Keep the two in step if the alias ever changes.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve('./src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
