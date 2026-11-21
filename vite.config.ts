import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    // During development, forward API calls to the backend (npm run server).
    proxy: { '/api': 'http://localhost:3001' },
  },
});
