import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api/v1/users': {
        target: 'http://user_service:3001',
        changeOrigin: true,
      },
      '/api/v1/data': {
        target: 'http://data_ingestion_service:3002',
        changeOrigin: true,
      },
      '/api/v1/dashboard': {
        target: 'http://analytics_service:3003',
        changeOrigin: true,
      },
      '/api/v1/analytics': {
        target: 'http://analytics_service:3003',
        changeOrigin: true,
      },
      '/api/v1/recommendations': {
        target: 'http://recommendation_service:3004',
        changeOrigin: true,
      },
      '/api/v1/notifications': {
        target: 'http://notification_service:3005',
        changeOrigin: true,
      },
      '/orchestrator': {
        target: 'http://ai_engine:5000',
        changeOrigin: true,
      },
      '/vectors': {
        target: 'http://ai_engine:5000',
        changeOrigin: true,
      },
      '/ml': {
        target: 'http://ai_engine:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://analytics_service:3003',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
  },
});
