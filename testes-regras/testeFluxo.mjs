import {
  TRANSICOES, destinosPermitidos, motivosPermitidosDoDeclinio, podeTransicionar, ehEstadoFinal,
  DIAS_ATE_ENCERRAR, ETAPAS_ATIVAS, ehEtapaAtiva, diasParado, diasAteEncerrar,
  deveEncerrarPorTempo, aplicarEncerramentoAutomatico,
} from './utils/fluxoStatus.js';
import {
  STATUS_OPORTUNIDADE, ETAPAS_FLUXO, DESFECHOS, DESFECHOS_TERMINAIS, DIAS_FINALIZADOS_VISIVEIS,
  finalizadaRecentemente, finalizadasAntigas, emAndamento, resumirPorStatus,
  matchesFiltroOportunidade, getStatus,
} from './utils/oportunidades.js';

let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

const op = (over = {}) => ({
  id: 'op1', titulo: 'X', marca: '', talento: '',
  tipoProjeto: 'outro', input: 'interno', origem: 'outros', interveniencia: false,
  prioridade: 'media', status: 'entrada', statusDesde: '2026-08-01',
  entradaEm: '2026-08-01', prazoEm: '2026-08-08',
  responsaveis: {}, valorProjeto: '', cache: '', comissao: '', impostos: '', custoProducao: '',
  tipoContratacao: '', statusJuridico: '', numeroContrato: '',
  output: '', veiculacao: '', captacao: '', edicao: '',
  formato: '', entregaveis: '', cotas: '',
  praca: '', alcanceEstimado: '', publicoAlvo: '',
  segmento: '', categoria: '', contatoCliente: '',
  observacoes: '', entradaPor: 'manual', revisada: true, criadoEm: '', ...over,
});

/** 2026-08-01 é sábado; usar dia fixo mantém o teste estável. */
const dia = (d) => new Date(2026, 7, d);

console.log('\n--- O caminho do processo ---');
check('Entrada só vai para Elaboração', destinosPermitidos('entrada'), ['elaboracao']);
check('Elaboração só vai para Revisão', destinosPermitidos('elaboracao'), ['revisao']);
/*
  Revisão abre três caminhos desde 04/08/2026: a Validação Talento acontece ali (é uma pendência
  da Revisão), e quando o talento recusa, o projeto declina DAQUELA etapa — passar por Aguardando
  Feedback registraria um retorno de cliente que nunca houve.
*/
check('Revisão abre três caminhos: ajuste, cliente ou declínio',
  destinosPermitidos('revisao'), ['ajuste', 'aguardando_feedback', 'declinado']);
/*
  Cada etapa oferece só os declínios que fazem sentido nela (04/08/2026): na Revisão quem está
  com a bola é o talento — o único "Decl." dali é o dele. Interno e Mercado são conversas do
  retorno do cliente, e vivem no Aguardando Feedback.
*/
check('na Revisão, declinar é só pelo talento',
  motivosPermitidosDoDeclinio('revisao'), ['talento']);
check('no Aguardando Feedback, os três motivos valem',
  motivosPermitidosDoDeclinio('aguardando_feedback'), ['interno', 'mercado', 'talento']);
check('de onde não se declina, nenhum motivo é oferecido',
  motivosPermitidosDoDeclinio('elaboracao'), []);
check('Ajuste volta para Revisão', destinosPermitidos('ajuste'), ['revisao']);
/*
  O retorno do cliente abre cinco caminhos, e **Ajustes vem primeiro**.

  "Quero mudar isto" é a resposta mais comum e mantém o projeto vivo. Sem essa saída, atender um
  pedido de alteração exigia declinar e recadastrar — perdendo histórico e data de entrada.
*/
check('Feedback abre ajuste + quatro desfechos', destinosPermitidos('aguardando_feedback'),
  ['ajuste', 'fechado', 'standby', 'declinado', 'encerrado']);
check('e Ajustes é o primeiro da lista', destinosPermitidos('aguardando_feedback')[0], 'ajuste');

console.log('\n--- Estados finais ---');
for (const final of ['fechado', 'declinado', 'encerrado']) {
  check(`${final} não tem saída`, destinosPermitidos(final), []);
  check(`${final} é estado final`, ehEstadoFinal(final), true);
}
check('Entrada não é final', ehEstadoFinal('entrada'), false);

/*
  `DESFECHOS` é o que o bloco do cabeçalho mostra; `DESFECHOS_TERMINAIS`, o que de fato encerra.

  A distinção nasceu quando StandBy deixou de ser terminal: a asserção antiga — "todo desfecho é
  final" — ficou vermelha e apontou que o bloco misturava duas coisas.
*/
check('os terminais são os três que encerram',
  DESFECHOS_TERMINAIS, ['fechado', 'declinado', 'encerrado']);
check('e todos eles são finais', DESFECHOS_TERMINAIS.every(ehEstadoFinal), true);
check('StandBy está no bloco, mas fora dos terminais',
  DESFECHOS.includes('standby') && !DESFECHOS_TERMINAIS.includes('standby'), true);

console.log('\n--- StandBy é pausa, não desfecho ---');
/*
  Enquanto era terminal, pausar equivalia a matar o projeto: retomar exigia cadastrar de novo,
  perdendo histórico e data de entrada. Quem sabia disso deixava de usar o StandBy e mantinha o
  projeto em Aguardando Feedback — sujando o farol com uma espera que não era do cliente.
*/
check('StandBy volta para Aguardando Feedback',
  destinosPermitidos('standby'), ['aguardando_feedback']);
check('e não é estado final', ehEstadoFinal('standby'), false);
// Volta para onde saiu, não para a etapa anterior: é lá que a decisão continua pendente.
check('não volta para Revisão', destinosPermitidos('standby').includes('revisao'), false);
check('o par fecha o ciclo',
  destinosPermitidos('aguardando_feedback').includes('standby')
    && destinosPermitidos('standby').includes('aguardando_feedback'), true);
// Sem `encerra`, segue contando como projeto vivo na lista e no farol.
check('StandBy não encerra', Boolean(getStatus('standby').encerra), false);
check('e por isso continua na lista de andamento',
  emAndamento([op({ id: 'x', status: 'standby' })]).map((o) => o.id), ['x']);

console.log('\n--- O que NÃO pode ---');
// Pular etapa é o erro que a máquina existe para impedir: um registro que não aconteceu.
check('Entrada NÃO pula para Fechado', podeTransicionar('entrada', 'fechado'), false);
check('Entrada NÃO pula para Revisão', podeTransicionar('entrada', 'revisao'), false);
check('Elaboração NÃO volta para Entrada', podeTransicionar('elaboracao', 'entrada'), false);
check('Revisão NÃO fecha direto', podeTransicionar('revisao', 'fechado'), false);
check('Ajuste NÃO vai para Feedback', podeTransicionar('ajuste', 'aguardando_feedback'), false);
check('Fechado NÃO reabre', podeTransicionar('fechado', 'entrada'), false);
check('Declinado NÃO reabre', podeTransicionar('declinado', 'elaboracao'), false);
// Reafirmar o mesmo status é idempotência, não transição — recusar quebraria salvamentos repetidos.
check('o mesmo status sempre passa',
  STATUS_OPORTUNIDADE.every((s) => podeTransicionar(s.id, s.id)), true);

console.log('\n--- Integridade da máquina ---');
check('todo status tem entrada na tabela',
  STATUS_OPORTUNIDADE.every((s) => TRANSICOES[s.id] !== undefined), true);
// Um destino fora do catálogo seria um estado que a tela não sabe desenhar.
const idsValidos = STATUS_OPORTUNIDADE.map((s) => s.id);
check('todo destino é um status conhecido',
  Object.values(TRANSICOES).flat().every((d) => idsValidos.includes(d)), true);
check('nenhum status é destino de si mesmo',
  Object.entries(TRANSICOES).every(([de, paras]) => !paras.includes(de)), true);
// Todo status precisa ser alcançável a partir de Entrada, senão é código morto.
const alcancaveis = new Set(['entrada']);
let mudou = true;
while (mudou) {
  mudou = false;
  for (const de of [...alcancaveis]) {
    for (const para of TRANSICOES[de]) {
      if (!alcancaveis.has(para)) { alcancaveis.add(para); mudou = true; }
    }
  }
}
check('todos os 9 status são alcançáveis desde Entrada', alcancaveis.size, STATUS_OPORTUNIDADE.length);

console.log('\n--- Etapas ativas ---');
check('cinco etapas ativas', ETAPAS_ATIVAS.length, 5);
check('as ativas são as do fluxo',
  ETAPAS_ATIVAS.slice().sort(), ETAPAS_FLUXO.map((e) => e.status).sort());
check('nenhum desfecho é etapa ativa', DESFECHOS.some(ehEtapaAtiva), false);
check('ativa + desfecho cobre tudo',
  ETAPAS_ATIVAS.length + DESFECHOS.length, STATUS_OPORTUNIDADE.length);

console.log('\n--- Relógio do abandono ---');
check('limite de 20 dias', DIAS_ATE_ENCERRAR, 20);
check('parada hoje conta zero', diasParado(op({ statusDesde: '2026-08-10' }), dia(10)), 0);
check('conta dias corridos', diasParado(op({ statusDesde: '2026-08-01' }), dia(11)), 10);
// Corridos, não úteis: fim de semana conta, porque abandono é tempo real.
check('o fim de semana conta', diasParado(op({ statusDesde: '2026-08-07' }), dia(10)), 3);
check('sem data não mede', diasParado(op({ statusDesde: '', entradaEm: '' }), dia(10)), null);
// Dado antigo, anterior ao campo, cai para a entrada — melhor aproximação disponível.
check('sem statusDesde usa entradaEm',
  diasParado(op({ statusDesde: '', entradaEm: '2026-08-01' }), dia(6)), 5);

check('conta quanto falta', diasAteEncerrar(op({ statusDesde: '2026-08-01' }), dia(11)), 10);
// 01 → 25 são 24 dias parados; o limite é 20, logo faltam −4.
check('negativo quando passou', diasAteEncerrar(op({ statusDesde: '2026-08-01' }), dia(25)), -4);
check('desfecho não tem relógio',
  diasAteEncerrar(op({ status: 'fechado', statusDesde: '2026-01-01' }), dia(25)), null);

console.log('\n--- Encerramento automático ---');
check('19 dias não encerra',
  deveEncerrarPorTempo(op({ statusDesde: '2026-08-01' }), dia(20)), false);
// "Mais de 20 dias": exatamente 20 ainda está dentro.
check('exatamente 20 dias não encerra',
  deveEncerrarPorTempo(op({ statusDesde: '2026-08-01' }), dia(21)), false);
check('21 dias encerra',
  deveEncerrarPorTempo(op({ statusDesde: '2026-08-01' }), dia(22)), true);
check('vale para todas as etapas ativas',
  ETAPAS_ATIVAS.every((status) =>
    deveEncerrarPorTempo(op({ status, statusDesde: '2026-01-01' }), dia(25))), true);
// O que já acabou não é encerrado de novo.
check('desfecho nunca é encerrado',
  DESFECHOS.some((status) =>
    deveEncerrarPorTempo(op({ status, statusDesde: '2026-01-01' }), dia(25))), false);

const quadro = [
  op({ id: 'a', status: 'entrada', statusDesde: '2026-01-01' }),        // vence
  op({ id: 'b', status: 'revisao', statusDesde: '2026-08-10' }),        // recente
  op({ id: 'c', status: 'fechado', statusDesde: '2026-01-01' }),        // desfecho
  op({ id: 'd', status: 'ajuste', statusDesde: '2026-01-01' }),         // vence
];
const resultado = aplicarEncerramentoAutomatico(quadro, dia(15));

check('encerra só quem passou do prazo', resultado.encerradas.sort(), ['a', 'd']);
check('e diz quantas foram', resultado.encerradas.length, 2);
check('as encerradas ficam com status encerrado',
  resultado.oportunidades.filter((o) => resultado.encerradas.includes(o.id))
    .every((o) => o.status === 'encerrado'), true);
// A marca distingue abandono de decisão — a conversa sobre cada um é diferente.
check('e marcadas como automáticas',
  resultado.oportunidades.filter((o) => resultado.encerradas.includes(o.id))
    .every((o) => o.encerradaAutomaticamente === true), true);
check('o relógio reinicia na data do encerramento',
  resultado.oportunidades.find((o) => o.id === 'a').statusDesde, '2026-08-15');
check('as demais não são tocadas',
  resultado.oportunidades.find((o) => o.id === 'b').status, 'revisao');
check('o desfecho segue intacto',
  resultado.oportunidades.find((o) => o.id === 'c').status, 'fechado');
// Função pura: a lista original não pode mudar.
check('não muta a lista original', quadro.find((o) => o.id === 'a').status, 'entrada');

// Rodar duas vezes não muda nada além da primeira: a operação é idempotente.
const segunda = aplicarEncerramentoAutomatico(resultado.oportunidades, dia(15));
check('rodar de novo não encerra mais nada', segunda.encerradas, []);

console.log('\n--- O fluxo completo, ponta a ponta ---');
let atual = 'entrada';
const caminho = [atual];
for (const proximo of ['elaboracao', 'revisao', 'ajuste', 'revisao', 'aguardando_feedback', 'fechado']) {
  if (!podeTransicionar(atual, proximo)) {
    falhas++;
    console.log(`FALHA caminho quebrou em ${atual} -> ${proximo}`);
    break;
  }
  atual = proximo;
  caminho.push(atual);
}
check('o percurso com loop de ajuste é válido', caminho,
  ['entrada', 'elaboracao', 'revisao', 'ajuste', 'revisao', 'aguardando_feedback', 'fechado']);
check('e termina num estado final', ehEstadoFinal(atual), true);

console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`);

console.log('\n--- Janela de finalizados ---');
check('janela de 30 dias', DIAS_FINALIZADOS_VISIVEIS, 30);
// O relógio da janela é o statusDesde do desfecho: quando foi finalizada, não quando entrou.
check('fechada ontem aparece',
  finalizadaRecentemente(op({ status: 'fechado', statusDesde: '2026-08-14' }), dia(15)), true);
check('fechada há 30 dias ainda aparece',
  finalizadaRecentemente(op({ status: 'fechado', statusDesde: '2026-07-16' }), dia(15)), true);
check('fechada há 31 dias sai',
  finalizadaRecentemente(op({ status: 'fechado', statusDesde: '2026-07-15' }), dia(15)), false);
check('em andamento nunca é "finalizada recentemente"',
  finalizadaRecentemente(op({ status: 'entrada', statusDesde: '2026-08-14' }), dia(15)), false);
// Sem data, mostrar é mais seguro que sumir com o registro.
check('sem data, aparece',
  finalizadaRecentemente(op({ status: 'fechado', statusDesde: '' }), dia(15)), true);

const misto = [
  op({ id: 'v1', status: 'entrada' }),
  op({ id: 'v2', status: 'revisao' }),
  op({ id: 'v3', status: 'fechado', statusDesde: '2026-08-10' }),
  op({ id: 'v4', status: 'declinado', statusDesde: '2026-01-01' }),
  op({ id: 'v5', status: 'encerrado', statusDesde: '2026-01-01' }),
];
check('em andamento traz só os ativos',
  emAndamento(misto).map((o) => o.id), ['v1', 'v2']);
// O que saiu da janela é contado, não escondido em silêncio.
check('conta as finalizadas antigas', finalizadasAntigas(misto, dia(15)), 2);
check('a recente não conta como antiga',
  finalizadasAntigas([misto[2]], dia(15)), 0);

// O card do cabeçalho e a lista que ele abre precisam mostrar o mesmo número.
const cardDeclinado = resumirPorStatus(misto, 'declinado', dia(15));
check('o card não conta a declinada antiga', cardDeclinado.quantidade, 0);
const cardFechado = resumirPorStatus(misto, 'fechado', dia(15));
check('mas conta a fechada recente', cardFechado.quantidade, 1);
// Etapa ativa não tem janela: mostra tudo.
check('etapa ativa ignora a janela',
  resumirPorStatus(misto, 'entrada', dia(15)).quantidade, 1);

check('o filtro Encerradas respeita a janela',
  misto.filter((o) => matchesFiltroOportunidade(o, 'fechadas', dia(15))).map((o) => o.id), ['v3']);

console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`);
