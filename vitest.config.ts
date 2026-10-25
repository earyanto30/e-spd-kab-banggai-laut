import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web/src'),
      vue: path.resolve(__dirname, './apps/web/node_modules/vue'),
      primevue: path.resolve(__dirname, './apps/web/node_modules/primevue'),
    },
  },
  test: {
    environment: 'happy-dom',
    include: [
      'packages/shared-types/src/**/*.test.ts',
      'apps/api/src/**/*.spec.ts',
      'apps/web/src/**/*.spec.ts',
    ],
    setupFiles: ['./apps/api/test/setup.ts'],
    globals: true,
  },
});
