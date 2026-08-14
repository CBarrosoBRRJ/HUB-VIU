/**
 * O que o jsdom não implementa e os componentes consultam ao montar.
 *
 * Sem isto, o teste falha por um motivo que não tem nada a ver com o que ele verifica — e a
 * mensagem aponta para o lugar errado.
 */
import { afterEach, beforeEach, vi } from 'vitest';

/**
 * O relógio da suíte é fixo — 04/08/2026, o dia em que o seed foi escrito.
 *
 * ## Por que precisou existir
 *
 * O seed do Backlog tem datas absolutas de julho, e o produto encerra sozinho o que ficar 20 dias
 * corridos parado ([08 §3.3](../prd/08_backlog_e_integracoes.md)). A conta é feita contra o relógio
 * do sistema: **a cada dia que passa, mais linhas do seed cruzam o limite e saem da lista.**
 *
 * O efeito era uma suíte que apodrecia sozinha. Em 04/08 ela passava inteira; em 10/08, oito
 * testes falhavam; em 11/08, dez — sem que uma linha de código tivesse mudado. Pior: as mensagens
 * acusavam contagens de linha, apontando para a grade, quando a causa era o calendário.
 *
 * Fixar o relógio devolve à suíte a propriedade que a torna útil — **falhar só quando o código
 * muda**. O envelhecimento do seed continua existindo no produto, e está registrado como tal em
 * [00 §6](../prd/00_status_implementacao.md): a demonstração vai ficando vazia com o tempo.
 * Corrigi-lo é decisão de produto (datas relativas a hoje), não de teste.
 *
 * `shouldAdvanceTime` mantém o tempo correndo a partir daí: sem isso, todo `waitFor` esperaria
 * para sempre, porque o relógio congelado nunca alcança o próximo intervalo.
 */
export const AGORA_NOS_TESTES = new Date(2026, 7, 4, 12, 0, 0);

/**
 * A janela da suíte é **confortável em altura** — 14/08/2026.
 *
 * O jsdom monta uma janela de 1024×768, que é uma tela **curta** pelos critérios do produto: desde
 * 14/08 o mapa do processo nasce recolhido abaixo de 820px de altura, para que sobrem linhas para
 * a lista ([08 §6](../prd/08_backlog_e_integracoes.md)).
 *
 * Cinco testes do cabeçalho quebraram na hora — e estavam certos: eles inspecionam os cartões do
 * mapa, e o mapa não estava lá. **A suposição existia desde sempre e era invisível**; agora está
 * escrita. Os testes que verificam o mapa presumem uma tela onde ele aparece, e o comportamento em
 * tela curta tem teste próprio, que ajusta a janela por conta.
 */
export const ALTURA_DA_JANELA_NOS_TESTES = 900;
window.innerHeight = ALTURA_DA_JANELA_NOS_TESTES;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, now: AGORA_NOS_TESTES });
});

afterEach(() => {
  vi.useRealTimers();
});

// O `motion` consulta a preferência de movimento reduzido.
window.matchMedia = window.matchMedia || (((consulta: string) => ({
  matches: false,
  media: consulta,
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia);

// Chamado por componentes que levam o foco a uma célula fora da vista.
window.HTMLElement.prototype.scrollIntoView = () => {};

// Mock de URL.createObjectURL e revokeObjectURL para exportação de arquivos em JSDOM
if (typeof window.URL.createObjectURL !== 'function') {
  window.URL.createObjectURL = () => 'blob:mock-url';
}
if (typeof window.URL.revokeObjectURL !== 'function') {
  window.URL.revokeObjectURL = () => {};
}
