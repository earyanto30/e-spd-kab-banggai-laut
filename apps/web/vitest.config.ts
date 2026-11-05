import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.spec.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      include: [
        'src/utils/**/*.ts',
        'src/composables/**/*.ts',
        'src/router/**/*.ts',
        'src/components/core/**/*.{ts,vue}',
      ],
      exclude: [
        'src/**/*.spec.ts',
        'src/components/core/index.ts',
      ],
    },
  },
});
