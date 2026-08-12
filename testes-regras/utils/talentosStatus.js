/**
 * Status canônicos do quadro "Contratos de Talentos".
 *
 * Esteira sequencial (10 passos) + 3 status de interrupção, conforme
 * `prd/02_quadro_talentos.md`.
 */
export const TALENTO_STATUSES = [
    'Criação',
    'Revisão Inicial',
    'Aprovação Inicial',
    'Chancela',
    'Revisão Conecta',
    'Via CGA',
    'Aprovação Conecta',
    'Requisição Enviada',
    'Em Assinatura',
    'Concluído',
    'Parado',
    'Cancelado',
    'Vencido',
];
/**
 * ================================================================================================
 * A PALETA DA ESTEIRA — a mesma regra do Backlog, subdividida em nove — 12/08/2026
 * ================================================================================================
 *
 * Este quadro carregava **treze matizes escolhidos a dedo**: slate, sky, indigo, violet, blue,
 * cyan, teal, amber, orange, emerald, yellow, rose, red. Carnaval em estado puro, com dois
 * agravantes que o Backlog não tinha:
 *
 * - **âmbar, laranja e amarelo** em três status distintos — cores que nem se distinguem entre si;
 * - **rosa e vermelho** para dois desfechos diferentes, pela mesma razão.
 *
 * A migração não trouxe uma paleta nova: trouxe **a mesma regra** ([`index.css`](../index.css)) —
 * claridade fixa, matiz variando, croma dizendo o papel. O que muda entre os dois quadros é a
 * subdivisão do arco: o Backlog tem quatro etapas, a esteira tem nove.
 *
 * ## A esteira
 *
 * ```
 *   Criação → Revisão Inicial → … → Requisição Enviada → Em Assinatura
 *   esteira-1                              esteira-8       esteira-9
 *   H 250, C 0,03  ──────────────────────────────────►  H 308, C 0,11
 * ```
 *
 * **Com treze status, a cor não consegue ser identificador** — ninguém decora treze cores. Ela só
 * pode ser *indicador de posição*, e por isso os passos vizinhos são propositalmente próximos:
 * quem varre a coluna não precisa distinguir "Revisão Inicial" de "Aprovação Inicial" pela cor (o
 * texto diz), precisa ver de longe se a linha está no começo ou no fim.
 *
 * ## Os desfechos reusam os acentos do Backlog
 *
 * | Status | Tom | Por quê |
 * |---|---|---|
 * | Concluído | `acento-ganho` | acabou, e deu negócio |
 * | Parado | `acento-acao` | *parou, depende de alguém* — a única cor quente da paleta |
 * | Cancelado | `acento-perda` | acabou sem negócio, por decisão |
 * | **Vencido** | *vazado* | acabou por **tempo** — é história, não pendência |
 *
 * Eles são os mesmos tokens do outro quadro de propósito: "parado esperando alguém" significa a
 * mesma coisa nos dois, e uma pessoa que trabalha nos dois não deveria reaprender a paleta.
 *
 * **Vencido é o único vazado**, e é o que o separa de Cancelado — os dois eram vermelhos vizinhos
 * (`rose-500` e `red-600`), indistinguíveis de relance para dois fins muito diferentes. Mesmo
 * tratamento do Encerrado no Backlog: o que terminou por decurso de prazo recua, em vez de
 * disputar atenção.
 */
export const STATUS_STYLE = {
    'Criação': { etiqueta: 'bg-esteira-1 text-white', barra: 'bg-esteira-1', dot: 'bg-esteira-1' },
    'Revisão Inicial': { etiqueta: 'bg-esteira-2 text-white', barra: 'bg-esteira-2', dot: 'bg-esteira-2' },
    'Aprovação Inicial': { etiqueta: 'bg-esteira-3 text-white', barra: 'bg-esteira-3', dot: 'bg-esteira-3' },
    'Chancela': { etiqueta: 'bg-esteira-4 text-white', barra: 'bg-esteira-4', dot: 'bg-esteira-4' },
    'Revisão Conecta': { etiqueta: 'bg-esteira-5 text-white', barra: 'bg-esteira-5', dot: 'bg-esteira-5' },
    'Via CGA': { etiqueta: 'bg-esteira-6 text-white', barra: 'bg-esteira-6', dot: 'bg-esteira-6' },
    'Aprovação Conecta': { etiqueta: 'bg-esteira-7 text-white', barra: 'bg-esteira-7', dot: 'bg-esteira-7' },
    'Requisição Enviada': { etiqueta: 'bg-esteira-8 text-white', barra: 'bg-esteira-8', dot: 'bg-esteira-8' },
    'Em Assinatura': { etiqueta: 'bg-esteira-9 text-white', barra: 'bg-esteira-9', dot: 'bg-esteira-9' },
    'Concluído': { etiqueta: 'bg-acento-ganho text-white', barra: 'bg-acento-ganho', dot: 'bg-acento-ganho' },
    'Parado': { etiqueta: 'bg-acento-acao text-white', barra: 'bg-acento-acao', dot: 'bg-acento-acao' },
    'Cancelado': { etiqueta: 'bg-acento-perda text-white', barra: 'bg-acento-perda', dot: 'bg-acento-perda' },
    'Vencido': { etiqueta: 'bg-slate-100 text-slate-500 ring-1 ring-slate-300', barra: 'bg-slate-300', dot: 'bg-slate-300' },
};
