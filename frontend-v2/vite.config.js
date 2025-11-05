/**
 * Vite Configuration
 * Configuração otimizada do Vite
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Path aliases
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Server configuration
  server: {
    port: 3001,
    strictPort: true, // Não tentar outras portas se 3001 estiver ocupada
    open: true,
    cors: true,
  },

  // Build configuration
  build: {
    // Output directory
    outDir: 'dist',

    // Source maps apenas em dev
    sourcemap: false,

    // Minification
    minify: 'terser',

    // Chunk size warning limit
    chunkSizeWarningLimit: 500,

    // Rollup options
    rollupOptions: {
      output: {
        // Manual chunks para otimizar bundle
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },

    // Terser options
    terserOptions: {
      compress: {
        drop_console: true, // Remover console.log em produção
        drop_debugger: true,
      },
    },
  },

  // Optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@mui/icons-material',
      'zustand',
      '@tanstack/react-query',
    ],
  },
});
