import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cspApiOrigin, requireMainApiAddress } from './build-tools/csp';

export default defineConfig({
  main: { plugins: [requireMainApiAddress()] },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
      },
    },
    plugins: [react(), tailwindcss(), cspApiOrigin()],
  },
});
