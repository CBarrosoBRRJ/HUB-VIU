import { defineConfig } from 'vitest/config';

/**
 * Configuração dos testes de interface.
 *
 * Eles vivem em `testes-ui/` e rodam num DOM (jsdom), montando os componentes reais. É o
 * complemento das suítes de regra, que testam lógica pura em Node — ver `prd/00 §5`.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['testes-ui/**/*.test.tsx'],
    globals: false,
    setupFiles: ['./testes-ui/setup.ts'],
  },
});
