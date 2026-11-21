import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    // React's test utilities (`act`) exist only in its development build, which
    // is chosen by NODE_ENV when react is first loaded. A shell that exports
    // NODE_ENV=production (a CI image, a build container) otherwise loads the
    // production build and every renderHook() throws "React.act is not a function".
    env: { NODE_ENV: 'test' },
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.{js,ts}',
        '**/dist/**',
        '**/*.d.ts',
        '**/main.tsx'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
