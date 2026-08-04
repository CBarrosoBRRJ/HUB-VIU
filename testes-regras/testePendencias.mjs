/**
 * Pendências — "com quem está a bola".
 *
 * A tradução dos "status extras" da planilha da operação (04/08/2026): não são etapas, são
 * esperas nomeadas dentro do status. O que esta suíte trava:
 *
 * 1. **O menu é por status** — só Elaboração e Revisão oferecem esperas, e são as seis da lista
 *    que a operação mandou. Um tipo novo entra por decisão dela, não por conveniência de código.
 * 2. **Nenhum gesto é definitivo** — "chegou" se desfaz com reabrir; abrir por engano se desfaz
 *    com descartar. E descartar NÃO apaga história: espera que já chegou não se remove.
 * 3. **Os estados impossíveis são detectáveis** — chegou antes de abrir, tipo fora do status de
 *    abertura, aberta duplicada. `comPendenciaImpossivel` acusa; o seed passa limpo.
 *
 * A contabilização fina por status fica para o banco + Power BI (decisão da operação) — aqui se
 * garante que as DATAS que o relatório vai ler estão certas e completas.
 */
import {
  bloqueadaPorPendencias, comPendenciaAberta, comPendenciaChegada, comPendenciaImpossivel,
  comPendenciaReaberta, descricaoDasEsperas, diasDeEspera, getTipoPendencia,
  PENDENCIAS_POR_STATUS, pendenciasAbertas, pendenciasDoStatus, semPendencia,
} from './utils/oportunidades.js';
import { OPORTUNIDADES_SEED } from './data/oportunidades.js';

let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

/* ------------------------------------------------------------------ *
 * O menu por status — a lista da operação, e nada além dela
 * ------------------------------------------------------------------ */
console.log('--- O menu por status ---');

check('a Elaboração oferece as cinco esperas da lista da operação',
  pendenciasDoStatus('elaboracao').map((t) => t.label),
  ['Retorno Marca/Executivo', 'Validação Gestão Esporte', 'Cotação Gestão de Elenco',
    'Validação Externa', 'Cálculo de Produção']);

check('a Revisão oferece as três validações, na ordem da lista',
  pendenciasDoStatus('revisao').map((t) => t.label),
  ['Validação Planejamento', 'Validação Talent Manager', 'Validação Talento']);

/*
  Entrada, Ajustes, Feedback e desfechos não oferecem nada: a operação não anotava "status extra"
  neles. O bloco da tela nem aparece — oferecer espera onde não existe ensinaria a ignorar o menu.
*/
for (const status of ['entrada', 'ajuste', 'aguardando_feedback', 'standby', 'fechado', 'declinado', 'encerrado']) {
  check(`${status} não oferece pendência no menu`, pendenciasDoStatus(status), []);
}

const todos = Object.values(PENDENCIAS_POR_STATUS).flat();
check('oito tipos ao todo, sem repetição de id',
  new Set(todos.map((t) => t.id)).size, 8);
check('todo tipo tem nome curto para o selo (~110px)',
  todos.every((t) => t.curto.length > 0 && t.curto.length < t.label.length + 1), true);
check('todo tipo explica quando usar (hint)', todos.every((t) => t.hint.length > 10), true);
check('getTipoPendencia acha qualquer um dos oito',
  todos.every((t) => getTipoPendencia(t.id)?.label === t.label), true);

/* ------------------------------------------------------------------ *
 * Os quatro gestos — e as voltas de cada um
 * ------------------------------------------------------------------ */
console.log('\n--- Abrir, chegar, reabrir, descartar ---');

const base = { id: 'opX', status: 'elaboracao', pendencias: [] };

const aberta = comPendenciaAberta(base, 'validacao_gestao_esporte', '2026-07-28', 'pd90');
check('abrir registra tipo, status de abertura e data',
  aberta.pendencias[0],
  { id: 'pd90', tipo: 'validacao_gestao_esporte', statusAbertura: 'elaboracao', abertaEm: '2026-07-28' });

/*
  A guarda do clique duplo: duas "Validação Gestão Esporte" abertas na mesma linha não são duas
  esperas. A segunda tentativa devolve a linha como está.
*/
const duplicada = comPendenciaAberta(aberta, 'validacao_gestao_esporte', '2026-07-29', 'pd91');
check('abrir a mesma espera duas vezes não duplica', duplicada.pendencias.length, 1);

const chegou = comPendenciaChegada(aberta, 'pd90', '2026-07-30');
check('"✓ Chegou" grava a data e para o relógio', chegou.pendencias[0].chegouEm, '2026-07-30');
check('a espera some das abertas quando chega', pendenciasAbertas(chegou), []);

// Pedir de novo ao mesmo terceiro é rotina: espera chegada não bloqueia abrir outra do tipo.
const denovo = comPendenciaAberta(chegou, 'validacao_gestao_esporte', '2026-08-01', 'pd92');
check('espera já chegada não impede abrir outra do mesmo tipo', denovo.pendencias.length, 2);

const reaberta = comPendenciaReaberta(chegou, 'pd90');
check('"↩ Reabrir" desfaz o chegou — o campo sai, não vira null',
  'chegouEm' in reaberta.pendencias[0], false);
check('reaberta volta a contar como aberta', pendenciasAbertas(reaberta).length, 1);

const descartada = semPendencia(aberta, 'pd90');
check('"✕" descarta a aberta por engano — sai da medição', descartada.pendencias, []);
check('descartar NÃO apaga espera que já chegou — história não se remove',
  semPendencia(chegou, 'pd90').pendencias.length, 1);

/* ------------------------------------------------------------------ *
 * A trava da Elaboração — "não pode ir para revisão se tiver faltando alguma coisa"
 * ------------------------------------------------------------------ */
console.log('\n--- A trava da Elaboração ---');

check('com espera aberta, a carta não sobe para revisão',
  bloqueadaPorPendencias(aberta, 'revisao'), true);
check('espera chegada libera a subida',
  bloqueadaPorPendencias(chegou, 'revisao'), false);
/*
  A trava é SÓ da Elaboração→Revisão. Na Revisão, uma validação aberta pode atravessar para o
  Feedback (com aviso): ali a espera é do próprio destino — o cliente responde enquanto o talento
  valida. Travar tudo mataria a medição da revisão parcelada.
*/
check('na Revisão, a validação aberta não trava o caminho ao Feedback',
  bloqueadaPorPendencias(
    { status: 'revisao', pendencias: [{ id: 'pd1', tipo: 'validacao_talento', statusAbertura: 'revisao', abertaEm: '2026-08-01' }] },
    'aguardando_feedback',
  ),
  false);

/* ------------------------------------------------------------------ *
 * O relógio e o selo
 * ------------------------------------------------------------------ */
console.log('\n--- Relógio e selo ---');

check('dias de espera de uma aberta contam até hoje',
  diasDeEspera({ abertaEm: '2026-07-28' }, '2026-08-02'), 5);
check('dias de espera de uma chegada param na chegada',
  diasDeEspera({ abertaEm: '2026-07-28', chegouEm: '2026-07-29' }, '2026-08-02'), 1);

/*
  O selo sinaliza com um badge ⏳ (contado via `pendenciasAbertas`); os nomes por extenso vivem
  na dica — a operação vetou texto no selo ("não curto a ideia de comer texto", 04/08/2026).
*/
check('linha sem espera não ganha dica — ninguém é lembrado do que não tem',
  descricaoDasEsperas({ pendencias: [] }, '2026-08-02'), null);
check('a dica diz o nome por extenso e há quantos dias',
  descricaoDasEsperas(aberta, '2026-08-02'), 'Validação Gestão Esporte há 5d');
check('espera chegada não entra na dica', descricaoDasEsperas(chegou, '2026-08-02'), null);
check('duas abertas viram lista separada por ·',
  descricaoDasEsperas(comPendenciaAberta(aberta, 'calculo_producao', '2026-07-29', 'pd93'), '2026-08-02'),
  'Validação Gestão Esporte há 5d · Cálculo de Produção há 4d');

/* ------------------------------------------------------------------ *
 * Estados impossíveis — plantar o defeito e ver a rede acusar
 * ------------------------------------------------------------------ */
console.log('\n--- Estados impossíveis ---');

check('o seed passa limpo', comPendenciaImpossivel(OPORTUNIDADES_SEED), []);

check('chegou antes de abrir é acusado',
  comPendenciaImpossivel([{
    id: 'opY', pendencias: [{ id: 'pd1', tipo: 'validacao_talento', statusAbertura: 'revisao', abertaEm: '2026-08-02', chegouEm: '2026-08-01' }],
  }]),
  ['opY:pd1:chegou-antes']);

check('tipo fora do status de abertura é acusado',
  comPendenciaImpossivel([{
    id: 'opY', pendencias: [{ id: 'pd1', tipo: 'validacao_talento', statusAbertura: 'elaboracao', abertaEm: '2026-08-01' }],
  }]),
  ['opY:pd1:tipo-fora-do-status']);

check('aberta duplicada do mesmo tipo é acusada',
  comPendenciaImpossivel([{
    id: 'opY',
    pendencias: [
      { id: 'pd1', tipo: 'calculo_producao', statusAbertura: 'elaboracao', abertaEm: '2026-08-01' },
      { id: 'pd2', tipo: 'calculo_producao', statusAbertura: 'elaboracao', abertaEm: '2026-08-02' },
    ],
  }]),
  ['opY:calculo_producao:aberta-duplicada']);

/* ------------------------------------------------------------------ *
 * O seed demonstra o recurso — e o rastro da revisão parcelada
 * ------------------------------------------------------------------ */
console.log('\n--- Seed ---');

check('toda linha do seed tem a lista de pendências (obrigatória desde a v11)',
  OPORTUNIDADES_SEED.every((op) => Array.isArray(op.pendencias)), true);

const op4 = OPORTUNIDADES_SEED.find((op) => op.id === 'op4');
check('op4 demonstra a espera aberta da Gestão de Elenco',
  pendenciasAbertas(op4).map((p) => p.tipo), ['cotacao_gestao_elenco']);
check('op4 guarda também a espera que já chegou (a marca respondeu em 1d)',
  op4.pendencias.filter((p) => p.chegouEm).length, 1);

/*
  O rastro da "revisão parcelada": op5 avançou para a Revisão com o Cálculo de Produção ainda
  aberto — `statusAbertura: 'elaboracao'` numa linha em `revisao` é o fato, medido e legível.
*/
const op5 = OPORTUNIDADES_SEED.find((op) => op.id === 'op5');
check('op5 registra a espera que atravessou o status',
  op5.pendencias.some((p) => p.statusAbertura === 'elaboracao' && op5.status === 'revisao'), true);
check('op5 tem a Validação Talento aberta na Revisão',
  pendenciasAbertas(op5).map((p) => p.tipo), ['validacao_talento']);

console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`);
