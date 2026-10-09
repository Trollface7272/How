import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['dotenv/config'],
    include: ['src/**/*.{test,spec}.ts'],
    exclude: [
      'node_modules/',
      'src/__test__/Database.test.ts',  // Requires DB setup
      'src/__test__/OAuth.test.ts',     // Requires OAuth setup  
      'src/__test__/OsuApi.test.ts',    // Requires API setup
      'src/__test__/RemindMe.test.ts'   // Requires DB setup
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.d.ts', '**/*.test.ts', '**/*.spec.ts']
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
