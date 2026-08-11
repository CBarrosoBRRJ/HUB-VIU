/**
 * Tamanho do texto — a preferência que encerra a discussão sobre "fonte grande ou pequena".
 *
 * ## Por que existe, e por que virou régua fina
 *
 * A calibração de 11/08/2026 provou em três rodadas que **não há um tamanho certo**: no mesmo
 * monitor de 32", 16px foi "pequeno, não dá para ver", +8% foi "imenso" e +2% "ainda está ruim".
 * A janela de conforto é mais estreita que qualquer degrau que se acerte por tentativa — e cada
 * tentativa global arriscava desregular as telas menores, já aprovadas.
 *
 * A conclusão: o ajuste fino pertence a **quem está na frente da tela**, naquela tela. Três
 * posições nomeadas continuam como atalhos; a régua de 90% a 115%, em passos de 1%, é onde o
 * ponto exato se encontra — ao vivo, vendo o efeito.
 *
 * ## Como age
 *
 * O `index.css` multiplica a raiz por `--texto-pessoal`. Como todo tamanho do produto está em
 * `rem`, o fator move o sistema inteiro junto — grade, sidebar, diálogos — coerente, sem nenhum
 * componente saber que a preferência existe.
 *
 * A faixa é deliberadamente **contida** (90–115%): isto é conforto, não zoom. Quem precisa de
 * ampliação maior tem o zoom do navegador, que também funciona — os dois se compõem.
 *
 * ## Por navegador, não por usuário
 *
 * A preferência vive no `localStorage` sob chave própria, fora do dado de sessão: trocar de
 * sessão ("Entrar como") não a altera. É honesto com o que ela é — conforto de quem está na
 * frente **desta** tela, não atributo da conta. Quando houver backend, decidir se ela migra para
 * o perfil é decisão de produto ([05 §10]).
 */

import { carregar, salvar } from './persistencia';

/** Os limites da régua. Fora deles é zoom, e zoom é papel do navegador. */
export const FAIXA_FATOR = { min: 0.9, max: 1.15 } as const;

export type TamanhoTexto = 'compacto' | 'padrao' | 'confortavel';

/** Os atalhos da régua — as posições com nome, para quem não quer pensar em porcentagem. */
export const TAMANHOS_TEXTO: {
  id: TamanhoTexto;
  label: string;
  /** Multiplica a raiz fluida — 1 é a curva como calibrada. */
  fator: number;
  descricao: string;
}[] = [
  { id: 'compacto', label: 'Compacto', fator: 0.94, descricao: 'Mais linhas por tela' },
  { id: 'padrao', label: 'Padrão', fator: 1, descricao: 'A calibração do sistema' },
  { id: 'confortavel', label: 'Confortável', fator: 1.07, descricao: 'Texto um degrau maior' },
];

const CHAVE = 'fatorTexto';
/** A primeira versão do controle gravava a posição por nome — lida como ponto de partida. */
const CHAVE_LEGADA = 'tamanhoTexto';

/** O evento que avisa quem mede a raiz (ver `useEscalaRaiz`) que ela acabou de mudar. */
export const EVENTO_RAIZ = 'viu:raiz';

/** Prende o fator à faixa — o que estiver gravado fora dela entra como o limite mais próximo. */
export function limitarFator(fator: number): number {
  if (!Number.isFinite(fator)) return 1;
  return Math.min(FAIXA_FATOR.max, Math.max(FAIXA_FATOR.min, fator));
}

export function fatorTextoSalvo(): number {
  const bruto = carregar<number | null>(CHAVE, null);
  if (typeof bruto === 'number') return limitarFator(bruto);

  // Migração silenciosa da versão de três posições: a escolha antiga vira o número equivalente.
  const legado = carregar<string>(CHAVE_LEGADA, 'padrao');
  const atalho = TAMANHOS_TEXTO.find((item) => item.id === legado);
  return atalho ? atalho.fator : 1;
}

/**
 * Aplica o fator na raiz e grava a escolha.
 *
 * Dispara `EVENTO_RAIZ` porque mudar a variável muda a raiz **sem** `resize`: a grade do Backlog,
 * que multiplica larguras pelo fator medido, precisa saber que a medida envelheceu.
 */
export function aplicarFatorTexto(fator: number): number {
  const efetivo = limitarFator(fator);
  document.documentElement.style.setProperty('--texto-pessoal', String(efetivo));
  salvar(CHAVE, efetivo);
  window.dispatchEvent(new Event(EVENTO_RAIZ));
  return efetivo;
}

/** Reaplica a escolha gravada — chamado uma vez, na carga da aplicação (`main.tsx`). */
export function restaurarFatorTexto(): void {
  aplicarFatorTexto(fatorTextoSalvo());
}
