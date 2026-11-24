import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.KANBAN_API_ORIGIN || `http://127.0.0.1:${process.env.PORT || 4173}`;
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': apiTarget
    }
  },
  build: {
    outDir: 'dist'
  },
  test: {
    environment: 'jsdom',
    include: ['src/client/**/*.test.{js,jsx}']
  }
});
