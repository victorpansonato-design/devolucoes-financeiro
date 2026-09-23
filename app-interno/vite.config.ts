/// <reference types="vitest/config" />
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Duas páginas no mesmo servidor: interface interna (/) e link público do aluno (/acompanhamento/).
// Modo demonstração: sem backend. A TI substitui os adaptadores de src/adapters por chamadas à API.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 3000 },
  build: {
    rollupOptions: {
      input: { main: resolve(__dirname, 'index.html'), acompanhamento: resolve(__dirname, 'acompanhamento/index.html') },
    },
  },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
