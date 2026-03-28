import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Docker uses service name "backend"; bare-metal dev uses localhost
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://backend:3001';

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        // Only used in local dev — production uses VITE_API_URL directly
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
