import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    // PERF-9: Manual chunk splitting — Tiptap (~200KB) only loads on proposal pages;
    // React chunk is cached across deploys; vendor-utils cached independently.
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    'vendor-redux': ['@reduxjs/toolkit', 'react-redux'],
                    'vendor-tiptap': [
                        '@tiptap/react',
                        '@tiptap/starter-kit',
                        '@tiptap/extension-image',
                        '@tiptap/extension-link',
                        '@tiptap/extension-table',
                        '@tiptap/extension-table-cell',
                        '@tiptap/extension-table-header',
                        '@tiptap/extension-table-row',
                    ],
                    'vendor-utils': ['axios', 'date-fns', 'zod', 'dompurify'],
                },
            },
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
            },
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/test/setup.ts',
        css: true,
    },
})
