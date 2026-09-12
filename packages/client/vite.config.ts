import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { colorPickerPlugin } from './colorPickerPlugin';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [colorPickerPlugin(), react()],
  optimizeDeps: {
    // Keep the editor visible to the same adapter in dev and production.
    exclude: ['@excalidraw/excalidraw'],
    include: [
      '@braintree/sanitize-url',
      'es6-promise-pool',
      'fuzzy',
      'jotai-scope',
      'lodash.debounce',
      'lodash.throttle',
      'png-chunk-text',
      'png-chunks-encode',
      'png-chunks-extract',
      'pica',
      'tunnel-rat',
    ].map(dependency => `@excalidraw/excalidraw > ${dependency}`),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
