import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    // 3000 está ocupada pelo projeto viu-saas; strictPort evita cair em outra porta silenciosamente.
    port: 3001,
    strictPort: true,
  },
});
