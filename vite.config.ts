import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

// Relative base so the same build works on GitHub Pages or any static host.
export default defineConfig({
  base: './',
  plugins: [preact()],
  test: { include: ['tests/**/*.test.ts'] },
});
