import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';

const alias = { '@': resolve('src/renderer/src') };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias, dedupe: ['react', 'react-dom'] },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/**/*.component.test.{ts,tsx}', 'src/main/**'],
          setupFiles: ['src/renderer/src/test/setup.unit.ts'],
        },
      },
      {
        // Main-process code (SQLite, IPC handlers) runs on plain Node, not in a browser-like environment.
        extends: true,
        test: {
          name: 'main',
          environment: 'node',
          include: ['src/main/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'component',
          include: ['src/**/*.component.test.{ts,tsx}'],
          setupFiles: ['src/renderer/src/test/setup.component.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
