import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    server: {
      port: 3000,
      host: '0.0.0.0',
      // Dev proxy for local testing: forwards /api/counter to CounterAPI v2 and sets Authorization header
      proxy: {
        '/api/counter': {
          target: 'https://api.counterapi.dev',
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/api\/counter/, '/v2/gracetyy/christmas-tree'),
          headers: {
            // Inject API key from local env for development only
            Authorization: `Bearer ${env.COUNTER_API_KEY}`
          }
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.INSTAGRAM_WEBHOOK_URL': JSON.stringify(env.INSTAGRAM_WEBHOOK_URL)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
