import { defineConfig } from 'prisma/config';

/**
 * Configuração do Prisma 7 — a URL saiu do schema por decisão deles.
 *
 * O valor real fica no `.env` (fora do Git); `.env.example` documenta a forma.
 * Enquanto não há backend, isto existe para `prisma validate` e para o dia 1
 * da Fase 1 começar com `prisma migrate dev`, não com setup.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://viu:viu@localhost:5432/viu_agenciamento',
  },
});
