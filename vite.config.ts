import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react()
      ],
      build: {
        // Simple and robust building - let Vite/Rollup manage chunking to avoid circular dependencies
        chunkSizeWarningLimit: 2500,
        rollupOptions: {
          output: {
            // Minimal chunking for stability
            manualChunks: undefined
          }
        }
      },
      define: {
        // Safely define process.env to prevent crashes in libraries that expect it
        'process.env': {},
        'process.env.GEMINI_KEY': JSON.stringify(env.GEMINI_KEY || env.VITE_GEMINI_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_KEY || env.VITE_GEMINI_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(process.cwd(), '.'),
        }
      }
    };
});
