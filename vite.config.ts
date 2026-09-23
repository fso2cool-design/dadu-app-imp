import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      visualizer({
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
        open: false,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/');
            if (normalizedId.includes('/node_modules/')) {
              if (
                normalizedId.includes('/@firebase/firestore/') || 
                normalizedId.includes('/firebase/firestore/')
              ) {
                return 'vendor-firebase-firestore';
              }
              if (
                normalizedId.includes('/@firebase/auth/') || 
                normalizedId.includes('/firebase/auth/')
              ) {
                return 'vendor-firebase-auth';
              }
              if (normalizedId.includes('/firebase/') || normalizedId.includes('/@firebase/')) {
                return 'vendor-firebase-core';
              }
              if (normalizedId.includes('/xlsx/')) {
                return 'vendor-xlsx';
              }
              if (normalizedId.includes('/motion/') || normalizedId.includes('/framer-motion/')) {
                return 'vendor-motion';
              }
              if (normalizedId.includes('/lucide-react/')) {
                return 'vendor-lucide';
              }
              if (
                normalizedId.includes('/react-router/') || 
                normalizedId.includes('/react-router-dom/')
              ) {
                return 'vendor-router';
              }
              if (
                normalizedId.includes('/react/') || 
                normalizedId.includes('/react-dom/') || 
                normalizedId.includes('/scheduler/')
              ) {
                return 'vendor-react';
              }
            }
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
