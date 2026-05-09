/**
 * Vite Configuration
 * Configuração otimizada do Vite
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Plugin que transforma index.html com os meta tags do portal em build --mode portal
function portalHtmlPlugin(mode) {
  if (mode !== 'portal') return null;
  return {
    name: 'portal-html-transform',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html
          .replace(
            '<title>AINTAR APP - Gestão de Processos e Pedidos</title>',
            '<title>AINTAR — Portal do Cliente</title>'
          )
          .replace(
            '<meta name="title" content="AINTAR APP - Gestão de Processos e Pedidos" />',
            '<meta name="title" content="AINTAR — Portal do Cliente" />'
          )
          .replace(
            '<meta name="description" content="Sistema de gestão de processos, pedidos e documentos da AINTAR. Plataforma completa para gestão de tarefas, emissões e operações." />',
            '<meta name="description" content="Aceda aos seus pedidos, faturas e informações de conta no portal de clientes da AINTAR — Associação Intermunicipal de Água e Resíduos." />'
          )
          .replace(
            '<link rel="icon" type="image/x-icon" href="/favicon.ico" />',
            '<link rel="icon" type="image/x-icon" href="/logos/favicon.ico" />'
          )
          .replace(
            '<link rel="icon" type="image/png" sizes="192x192" href="/logo192.png" />',
            '<link rel="icon" type="image/png" sizes="192x192" href="/logos/icon-color.png" />'
          )
          .replace(
            '<link rel="icon" type="image/png" sizes="512x512" href="/logo512.png" />',
            ''
          )
          .replace(
            '<link rel="apple-touch-icon" href="/logo192.png" />',
            '<link rel="apple-touch-icon" href="/logos/icon-color.png" />'
          )
          .replace(
            'content="#40C4FF" media="(prefers-color-scheme: light)"',
            'content="#1B5E8E" media="(prefers-color-scheme: light)"'
          )
          .replace(
            'content="#0288D1" media="(prefers-color-scheme: dark)"',
            'content="#164E75" media="(prefers-color-scheme: dark)"'
          )
          .replace(
            'content="https://aintar.app/"',
            'content="https://clientes.aintar.pt/"'
          )
          .replace(
            '<meta property="og:title" content="AINTAR APP - Gestão de Processos e Pedidos" />',
            '<meta property="og:title" content="AINTAR — Portal do Cliente" />'
          )
          .replace(
            '<meta property="og:description" content="Sistema de gestão de processos, pedidos e documentos da AINTAR." />',
            '<meta property="og:description" content="Aceda aos seus pedidos, faturas e informações de conta no portal de clientes da AINTAR." />'
          )
          .replace(
            '<meta property="og:image" content="/logo512.png" />',
            '<meta property="og:image" content="/logos/logo-horizontal-color.png" />'
          )
          .replace(
            '<link rel="manifest" href="/manifest.json" />',
            '<link rel="manifest" href="/manifest.portal.json" />'
          );
      },
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), portalHtmlPlugin(mode)].filter(Boolean),

  // Base URL contextual:
  //   portal     → '/'     (clientes.aintar.pt — serve na raiz)
  //   production → '/v2/'  (app.aintar.pt/v2/ — backoffice)
  //   dev        → '/'     (localhost:3001)
  base: mode === 'portal' ? '/' : (mode === 'production' ? '/v2/' : '/'),

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
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },

  // Preview configuration
  preview: {
    port: 4173,
    strictPort: true,
    open: true,
    cors: true,
  },

  // Build configuration
  build: {
    // Output directory
    outDir: mode === 'portal' ? 'dist-portal' : 'dist',

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
          'state-vendor': ['zustand', 'immer'],
          'utils-vendor': ['axios', 'date-fns', 'zod', 'sonner'],
          'socket-vendor': ['socket.io-client'],
          'animation-vendor': ['framer-motion'],
          'charts-vendor': ['recharts'],
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
      'socket.io-client',
      'axios',
      'date-fns',
      'zod',
      'sonner',
      'framer-motion',
      'recharts',
      'browser-image-compression',
    ],
  },
  // Test configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
    poolOptions: {
      threads: {
        singleThread: true
      }
    }
  },
}));
