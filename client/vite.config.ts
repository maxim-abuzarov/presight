import type { ServerResponse } from 'node:http';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const API_URL = process.env.API_URL ?? 'http://localhost:7777';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5555,
    strictPort: true,
    proxy: {
      '/api': {
        target: API_URL,
        changeOrigin: true,
        configure(proxy) {
          proxy.on('error', (error, _req, res) => {
            const response = res as ServerResponse;
            if (response.headersSent) return;
            response.writeHead(503, { 'content-type': 'application/json' });
            response.end(
              JSON.stringify({
                error: `API server at ${API_URL} is not reachable (${error.message}).`,
              }),
            );
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/main.tsx',
        'src/components/{SpiderWeb,Presight,PresightLogo,Icon}.tsx',
      ],
      reporter: ['text-summary', 'text', 'html'],
    },
  },
});
