import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Frontend only: /api/* must be supplied by the institutional backend.
export default defineConfig({ plugins: [react(), tailwindcss()], server: { port: 3000 } });
