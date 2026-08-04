/**
 * Motivo do declínio — o qualificador que abre "Declinado" em três.
 *
 * A decisão de projeto: os três continuam sendo `declinado`. O motivo é um campo à parte, não um
 * status novo. Estes testes existem para travar essa escolha: se alguém transformar os motivos em
 * status, a máquina de transições e o farol quebram aqui antes de quebrar em produção.
 */
import {
  DESFECHOS, getMotivoDeclinio, MOTIVOS_DECLINIO, resumirDeclinios, rotuloDoStatus,
  STATUS_OPORTUNIDADE, emAndamento, finalizadaRecentemente,
} from './utils/oportunidades.js';
import { destinosPermitidos, ehEstadoFinal, TRANSICOES } from './utils/fluxoStatus.js';
import { interpretarValor, paraNumero, somarValores } from './utils/moeda.js';

let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

const HOJE = new Date(2026, 7, 1);   // 01/08/2026
const op = (id, over = {}) => ({
  id, titulo: `Projeto ${id}`, marca: '', talento: '', observacoes: '',
  status: 'entrada', statusDesde: '2026-08-01', entradaEm: '2026-08-01', prazoEm: '2026-08-08',
  prioridade: 'media', input: 'interno', origem: 'outros', tipoProjeto: 'outro',
  interveniencia: false, responsaveis: {}, entradaPor: 'manual', revisada: true,
  valorProjeto: '', ...over,
});
/** `desde` é a data em que foi declinada — a janela de 30 dias mede a partir dela. */
const declinada = (id, motivo, valor = '', desde = '2026-07-31') =>
  op(id, { status: 'declinado', motivoDeclinio: motivo, statusDesde: desde, valorProjeto: valor });

console.log('--- O motivo NÃO é um status ---');
/*
  Se os três virassem status, esta lista teria 11 entradas e `DESFECHOS`, 6 — e cada regra que
  pergunta "isto encerra?" teria três casos a mais para errar.
*/
check('o catálogo de status continua com 9', STATUS_OPORTUNIDADE.length, 9);
check('os desfechos continuam 4', DESFECHOS.length, 4);
check('nenhum motivo virou status',
  STATUS_OPORTUNIDADE.some((s) => ['interno', 'mercado', 'talento'].includes(s.id)), false);
check('declinado segue sendo terminal', TRANSICOES.declinado, []);
check('e estado final', ehEstadoFinal('declinado'), true);

console.log('\n--- A transição não mudou ---');
// A UI oferece três opções; a máquina continua com um destino só. Quem grava o motivo é o
// provider, não o fluxo.
check('de Aguardando Feedback ainda se vai para declinado',
  destinosPermitidos('aguardando_feedback').includes('declinado'), true);
// Cinco desde que o retorno do cliente passou a poder pedir ajuste.
check('e os destinos são cinco', destinosPermitidos('aguardando_feedback').length, 5);

console.log('\n--- Rótulos ---');
check('sem motivo, lê-se Declinado', rotuloDoStatus('declinado', undefined), 'Declinado');
check('com motivo, o nome completo', rotuloDoStatus('declinado', 'mercado'), 'Declinado pelo Mercado');
check('curto cabe na etiqueta', rotuloDoStatus('declinado', 'mercado', true), 'Decl. Mercado');
check('interno', rotuloDoStatus('declinado', 'interno'), 'Declinado Internamente');
check('talento', rotuloDoStatus('declinado', 'talento'), 'Declinado pelo Talento');
// Motivo num status que não é declinado é ignorado — não existe "Fechado pelo Mercado".
check('motivo só vale em declinado', rotuloDoStatus('fechado', 'mercado'), 'Negócio Fechado');
// Dado antigo, ou importado de um sistema que não conhece o campo, não pode quebrar a tela.
check('motivo desconhecido não quebra', rotuloDoStatus('declinado', 'inventado'), 'Declinado');
check('getMotivoDeclinio devolve undefined para lixo', getMotivoDeclinio('inventado'), undefined);
check('e para ausente', getMotivoDeclinio(undefined), undefined);

console.log('\n--- Os três motivos existem e são distintos ---');
check('são três', MOTIVOS_DECLINIO.length, 3);
check('ids', MOTIVOS_DECLINIO.map((m) => m.id), ['interno', 'mercado', 'talento']);
check('todo motivo tem rótulo longo, curto e explicação',
  MOTIVOS_DECLINIO.every((m) => m.label && m.curto && m.hint), true);
check('os rótulos curtos são únicos',
  new Set(MOTIVOS_DECLINIO.map((m) => m.curto)).size, 3);

console.log('\n--- Quebra por motivo no card ---');
const quadro = [
  declinada('a', 'mercado', 'R$ 10.000'),
  declinada('b', 'mercado', 'R$ 5.000'),
  declinada('c', 'talento', 'R$ 20.000'),
  op('d', { status: 'fechado', statusDesde: '2026-07-30' }),
  op('e'),
];
const quebra = resumirDeclinios(quadro, HOJE);
check('só motivos com registro aparecem', quebra.map((q) => q.id), ['mercado', 'talento']);
check('mercado soma 2', quebra.find((q) => q.id === 'mercado').quantidade, 2);
check('e o valor acompanha', quebra.find((q) => q.id === 'mercado').valor, 15000);
check('talento soma 1', quebra.find((q) => q.id === 'talento').quantidade, 1);
// Um motivo sem registros não vira um card zerado — ocuparia espaço para não dizer nada.
check('interno não aparece', quebra.some((q) => q.id === 'interno'), false);
check('e fechado não entra na quebra de declinados',
  quebra.some((q) => q.quantidade === 0), false);

console.log('\n--- As partes somam o todo ---');
/*
  A soma da quebra tem que bater com o número grande do card. Se um declínio sem motivo ficasse
  de fora, o card diria 4 e as etiquetas somariam 3 — e ninguém saberia onde foi parar o quarto.
*/
const comOrfao = [...quadro, declinada('f', undefined, 'R$ 1.000')];
const quebraOrfao = resumirDeclinios(comOrfao, HOJE);
const totalDeclinados = comOrfao.filter(
  (o) => o.status === 'declinado' && finalizadaRecentemente(o, HOJE),
).length;
check('há um sem motivo', quebraOrfao.some((q) => q.id === 'sem_motivo'), true);
check('a soma da quebra bate com o total do card',
  quebraOrfao.reduce((t, q) => t + q.quantidade, 0), totalDeclinados);

console.log('\n--- A janela de 30 dias vale também para a quebra ---');
// Senão o card mostraria 2 e as etiquetas somariam 3 — a mesma discordância, por outro caminho.
const comAntigo = [...quadro, declinada('velho', 'interno', 'R$ 99.000', '2026-05-01')];
const quebraJanela = resumirDeclinios(comAntigo, HOJE);
check('declínio antigo não entra', quebraJanela.some((q) => q.id === 'interno'), false);
check('e a soma continua batendo com o card',
  quebraJanela.reduce((t, q) => t + q.quantidade, 0),
  comAntigo.filter((o) => o.status === 'declinado' && finalizadaRecentemente(o, HOJE)).length);

console.log('\n--- Declinado continua fora da lista de andamento ---');
check('os três motivos saem da lista igual', emAndamento(quadro).map((o) => o.id), ['e']);

/* ------------------------------------------------------------------ *
 * Zero legítimo não é ilegível — achado da auditoria externa de 02/08/2026.
 *
 * `paraNumero` devolvia 0 tanto para "R$ 0,00" quanto para "a definir", e o totalizador contava
 * os dois como ilegíveis. Zero é resposta; "a definir" é a ausência dela.
 * ------------------------------------------------------------------ */
console.log('\n--- Zero legítimo × ilegível ---');
check('R$ 0,00 é um valor lido', interpretarValor('R$ 0,00'), 0);
check('"0" cru também', interpretarValor('0'), 0);
check('"a definir" não é valor', interpretarValor('a definir'), undefined);
check('travessão não é valor', interpretarValor('—'), undefined);
check('paraNumero segue nunca falhando — para somar', paraNumero('a definir'), 0);
const misto = somarValores(['R$ 100,00', 'R$ 0,00', 'a definir', '']);
check('a soma lê o zero, conta o ilegível e ignora o vazio',
  [misto.total, misto.ilegiveis], [100, 1]);

console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`);
