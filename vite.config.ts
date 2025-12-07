import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@core': resolve(__dirname, './src/core'),
      '@adapters': resolve(__dirname, './src/adapters'),
      '@ui': resolve(__dirname, './src/ui'),
      '@platform': resolve(__dirname, './src/platform'),
    },
  },
  server: {
    port: 3000,
    open: true,
    // Prevent Vite from clearing screen in Tauri dev mode
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
    // Tauri uses Chromium-based webview, no need for legacy browser support
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // Generate sourcemaps for production debugging in Tauri
    sourcemap: process.env.TAURI_DEBUG === 'true' ? 'inline' : true,
  },
  // Prevent "use client" directive issues in Tauri
  clearScreen: false,
  // Environment variable prefix for Tauri
  envPrefix: ['VITE_', 'TAURI_'],
});
