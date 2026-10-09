import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['dotenv/config', 'src/__test__/setup.ts'],
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules/'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/__test__/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, './src'),
      '@class': path.resolve(__dirname, './src/class'),
      '@osu': path.resolve(__dirname, './src/class/api/osu'),
      '@database': path.resolve(__dirname, './src/class/database'),
      '@commands': path.resolve(__dirname, './src/commands'),
    }
  }
});
