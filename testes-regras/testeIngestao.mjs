import {
  ingerir, ingerirLote, mesclar, encontrarPorIdExterno, deEmail, deSalesforce,
} from './utils/ingestao.js';
import {
  somarDiasUteis, diasUteisEntre, prazoDeTriagem, getSlaInfo, SLA_DIAS_UTEIS,
} from './utils/sla.js';
import {
  STATUS_OPORTUNIDADE, getStatus, saiuDaTriagem, slaDaOportunidade, PRIORIDADES, getPrioridade,
  ENTRADAS_POR, getEntradaPor, INPUTS, ORIGENS_COMERCIAIS, TIPOS_PROJETO, getInput,
  getOrigemComercial, getTipoProjeto, precisaRevisao, nomeadosDaOportunidade,
  alternarResponsavelNaOportunidade, totaisDoRodape, resumirPorStatus, ETAPAS_FLUXO, DESFECHOS,
  PALETA_STATUS,
  matchesFiltroOportunidade, contarOportunidades,
} from './utils/oportunidades.js';

let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

const op = (over = {}) => ({
  id: 'op1', titulo: 'Campanha', marca: '', talento: '',
  tipoProjeto: 'outro', input: 'interno', origem: 'outros', exclusivo: false, escopo: '',
  prioridade: 'media', status: 'entrada', entradaEm: '2026-08-03', prazoEm: '2026-08-10',
  responsaveis: {}, valorProjeto: '', cache: '', comissao: '', impostos: '', custoProducao: '',
  tipoContratacao: '', statusJuridico: '', numeroContrato: '',
  output: '', veiculacao: '', captacao: '', edicao: '',
  formato: '', entregaveis: '', cotas: '',
  praca: '', alcanceEstimado: '', publicoAlvo: '',
  segmento: '', categoria: '', contatoCliente: '',
  observacoes: '', entradaPor: 'manual', revisada: true, criadoEm: '', ...over,
});

let seq = 0;
const opcoes = { proximoId: () => `gen${++seq}`, hoje: '2026-08-03' };

/* ================================================================ */
console.log('\n--- Dias úteis ---');
// 2026-08-03 é uma segunda-feira.
check('segunda + 1 dia útil = terça', somarDiasUteis('2026-08-03', 1), '2026-08-04');
check('segunda + 5 dias úteis = próxima segunda', somarDiasUteis('2026-08-03', 5), '2026-08-10');
// O ponto do SLA: sexta + 1 pula o fim de semana.
check('sexta + 1 dia útil = segunda', somarDiasUteis('2026-08-07', 1), '2026-08-10');
check('sexta + 5 dias úteis = sexta seguinte', somarDiasUteis('2026-08-07', 5), '2026-08-14');
check('zero dias não anda', somarDiasUteis('2026-08-03', 0), '2026-08-03');
check('data inválida devolve vazio', somarDiasUteis('', 5), '');

check('contagem entre segunda e sexta', diasUteisEntre('2026-08-03', '2026-08-07'), 4);
// Fim de semana no meio não conta.
check('segunda a segunda são 5 úteis', diasUteisEntre('2026-08-03', '2026-08-10'), 5);
check('mesma data é zero', diasUteisEntre('2026-08-03', '2026-08-03'), 0);
check('para trás é negativo', diasUteisEntre('2026-08-10', '2026-08-03'), -5);
// As duas funções precisam concordar, senão prazo e contagem regressiva divergem.
check('somar e contar são a mesma régua',
  diasUteisEntre('2026-08-03', somarDiasUteis('2026-08-03', SLA_DIAS_UTEIS)), SLA_DIAS_UTEIS);
check('prazo de triagem usa a constante', prazoDeTriagem('2026-08-03'), somarDiasUteis('2026-08-03', 5));

console.log('\n--- Farol do SLA ---');
const em = (d) => new Date(2026, 7, d);
const alvo = { entradaEm: '2026-08-03', prazoEm: '2026-08-10', encerrada: false };

check('longe do prazo é verde', getSlaInfo(alvo, em(3)).tone, 'verde');
check('a 2 dias fica amarelo', getSlaInfo(alvo, em(6)).tone, 'amarelo');
check('no dia é amarelo', getSlaInfo(alvo, em(10)).tone, 'amarelo');
check('e diz que vence hoje', getSlaInfo(alvo, em(10)).label, 'Vence hoje');
check('depois do prazo é vermelho', getSlaInfo(alvo, em(11)).tone, 'vermelho');
// O relógio para quando sai da triagem: o SLA mede resposta, não vida do projeto.
check('encerrada fica cinza', getSlaInfo({ ...alvo, encerrada: true }, em(30)).tone, 'cinza');
check('sem prazo fica cinza', getSlaInfo({ ...alvo, prazoEm: '' }, em(3)).tone, 'cinza');
check('percentual começa em 0', getSlaInfo(alvo, em(3)).percentual, 0);
check('percentual satura em 100', getSlaInfo(alvo, em(30)).percentual, 100);

/*
  O fim de semana logo apos o prazo - achado da auditoria externa de 02/08/2026.

  Prazo na sexta, consulta no sabado: zero dias uteis entre as datas, e o farol dizia
  "Vence hoje" com o prazo ja estourado. Vencer e pergunta de calendario; a regua de dias
  uteis mede so o tamanho do atraso.
*/
console.log('\n--- Fim de semana apos o prazo ---');
const sexta = { entradaEm: '2026-08-03', prazoEm: '2026-08-07', encerrada: false };
check('sexta, no dia: amarelo', getSlaInfo(sexta, em(7)).tone, 'amarelo');
check('sabado seguinte ja e vermelho', getSlaInfo(sexta, em(8)).tone, 'vermelho');
check('sem inventar dias uteis de atraso', getSlaInfo(sexta, em(8)).label, 'Atrasada');
check('domingo idem', getSlaInfo(sexta, em(9)).tone, 'vermelho');
check('segunda conta 1 util de atraso', getSlaInfo(sexta, em(10)).label, 'Atrasada 1d');

console.log('\n--- Status e pipeline ---');
check('nove status', STATUS_OPORTUNIDADE.length, 9);
check('só Entrada corre o SLA',
  STATUS_OPORTUNIDADE.filter((s) => s.emTriagem).map((s) => s.id), ['entrada']);
check('três status encerram',
  STATUS_OPORTUNIDADE.filter((s) => s.encerra).map((s) => s.id), ['fechado', 'declinado', 'encerrado']);
/*
  A cor mora em `PALETA_STATUS`, não no catálogo de status — foi assim que ela chegou a sete matizes
  arbitrários: um status novo, uma cor nova, sem ninguém olhar o conjunto (12/08/2026).

  O que se trava aqui é a **forma da paleta**: a rampa fria do fluxo (quatro tons vizinhos), os
  acentos fora dela, e o arquivado que recua em vez de ganhar cor. Os valores em si são gerados por
  regra no `@theme` — claridade fixa, croma por papel, matiz como única variável.
*/
check('todo status tem rótulo', STATUS_OPORTUNIDADE.every((s) => s.label), true);
check('a paleta cobre os nove status',
  STATUS_OPORTUNIDADE.every((s) => PALETA_STATUS[s.id]?.etiqueta && PALETA_STATUS[s.id]?.barra
    && PALETA_STATUS[s.id]?.dot), true);

const tom = (classe) => /bg-([a-z0-9-]+)/.exec(classe)[1];

// A rampa: um tom por etapa do fluxo, na ordem do avanço — e distintos entre si.
const doFluxo = ['entrada', 'elaboracao', 'revisao', 'aguardando_feedback']
  .map((id) => tom(PALETA_STATUS[id].barra));
check('cada etapa do fluxo tem seu tom', new Set(doFluxo).size, 4);
check('e a rampa está na ordem do avanço', doFluxo,
  ['etapa-1', 'etapa-2', 'etapa-3', 'etapa-4']);

/*
  Os acentos marcam o que sai do curso normal — e por isso ficam **fora** da rampa. Se um deles
  tomasse um degrau dela, a exceção viraria mais uma etapa.
*/
check('os acentos não usam degraus da rampa',
  ['ajuste', 'standby', 'fechado', 'declinado'].every((id) => !tom(PALETA_STATUS[id].barra).startsWith('etapa-')),
  true);
check('Ajustes e StandBy dividem o acento de ação',
  tom(PALETA_STATUS.ajuste.barra) === tom(PALETA_STATUS.standby.barra), true);
check('o acento de ação é o único quente', tom(PALETA_STATUS.ajuste.barra), 'acento-acao');

/*
  O defeito que a versão semântica tinha: Entrada e Encerrado no mesmo cinza — começo e fim do
  processo idênticos. O arquivado se separa por ser o **único vazado** numa coluna de blocos
  cheios, não por mais um matiz.
*/
check('Encerrado não se confunde com Entrada',
  PALETA_STATUS.encerrado.etiqueta === PALETA_STATUS.entrada.etiqueta, false);
check('e ele é o único vazado da paleta',
  STATUS_OPORTUNIDADE.filter((s) => !PALETA_STATUS[s.id].etiqueta.includes('text-white'))
    .map((s) => s.id), ['encerrado']);

check('status inválido cai em Entrada', getStatus('inventado').id, 'entrada');
check('em Entrada não saiu da triagem', saiuDaTriagem(op({ status: 'entrada' })), false);
check('em Elaboração já saiu', saiuDaTriagem(op({ status: 'elaboracao' })), true);
// Mesmo atrasada, sair da triagem para o relógio.
check('o relógio para ao sair da triagem',
  slaDaOportunidade(op({ status: 'elaboracao', prazoEm: '2026-01-01' }), em(30)).tone, 'cinza');
check('mas em Entrada o atraso aparece',
  slaDaOportunidade(op({ status: 'entrada', prazoEm: '2026-01-01' }), em(30)).tone, 'vermelho');

console.log('\n--- Prioridade e origem ---');
check('três prioridades', PRIORIDADES.map((p) => p.id), ['alta', 'media', 'baixa']);
/*
  Valor fora da lista devolve `undefined`, não um default.

  O fallback antigo (`?? PRIORIDADES[1]`) mascarava duas coisas diferentes com o mesmo resultado:
  "média" e "ninguém classificou". A tela mostrava "Média" nos dois casos, e o filtro contava os
  dois juntos.
*/
check('valor inválido não vira média', getPrioridade('urgentissima'), undefined);
check('ausente também', getPrioridade(undefined), undefined);
check('e o válido resolve', getPrioridade('alta').id, 'alta');
check('três vias de entrada', ENTRADAS_POR.map((o) => o.id), ['manual', 'email', 'salesforce']);
check('manual não é automática', getEntradaPor('manual').automatica, false);
check('e-mail e Salesforce são', [getEntradaPor('email').automatica, getEntradaPor('salesforce').automatica], [true, true]);
// A marca de conferência só faz sentido no que veio de fora.
check('manual nunca pede conferência', precisaRevisao(op({ entradaPor: 'manual', revisada: false })), false);
check('e-mail não revisado pede', precisaRevisao(op({ entradaPor: 'email', revisada: false })), true);
check('e-mail revisado não pede', precisaRevisao(op({ entradaPor: 'email', revisada: true })), false);

console.log('\n--- Responsáveis por área ---');
let comTime = alternarResponsavelNaOportunidade(op(), 'orcamento', 'u2');
check('adiciona', comTime.responsaveis, { orcamento: ['u2'] });
comTime = alternarResponsavelNaOportunidade(comTime, 'orcamento', 'u3');
check('aceita vários', comTime.responsaveis.orcamento, ['u2', 'u3']);
check('nomeados achata as áreas', nomeadosDaOportunidade(comTime), ['u2', 'u3']);
comTime = alternarResponsavelNaOportunidade(comTime, 'orcamento', 'u2');
check('remove um', comTime.responsaveis.orcamento, ['u3']);
comTime = alternarResponsavelNaOportunidade(comTime, 'orcamento', 'u3');
check('remover o último apaga a área', comTime.responsaveis.orcamento, undefined);

console.log('\n--- Ingestão: o registro entra ---');
const doEmail = { titulo: 'Proposta Itaú', idExterno: '<msg-1@itau>' };
const r1 = ingerir(doEmail, 'email', [], opcoes);
check('cria', r1.situacao, 'criada');
check('nasce em Entrada', r1.oportunidade.status, 'entrada');
check('com prazo calculado', r1.oportunidade.prazoEm, prazoDeTriagem('2026-08-03'));
// O ponto central: o que vem de fora não foi conferido por ninguém.
check('e NÃO revisada', r1.oportunidade.revisada, false);
check('guarda a chave de origem', r1.oportunidade.idExterno, '<msg-1@itau>');
check('cadastro manual nasce revisado',
  ingerir({ titulo: 'À mão' }, 'manual', [], opcoes).oportunidade.revisada, true);

console.log('\n--- Ingestão: o que é recusado ---');
check('sem título não entra', ingerir({ titulo: '  ' }, 'email', [], opcoes).erro, 'sem_titulo');
// Sem chave, a próxima execução não sabe que já viu este registro.
check('automática sem id externo não entra',
  ingerir({ titulo: 'X' }, 'salesforce', [], opcoes).erro, 'sem_id_externo');
check('manual dispensa id externo',
  ingerir({ titulo: 'X' }, 'manual', [], opcoes).situacao, 'criada');

console.log('\n--- Ingestão: não duplica ---');
const existente = op({ id: 'op9', entradaPor: 'email', idExterno: '<msg-1@itau>', revisada: false });
check('acha pelo id de origem', encontrarPorIdExterno([existente], 'email', '<msg-1@itau>')?.id, 'op9');
// Mesmo id, outra origem: são registros diferentes.
check('id igual de outra origem não casa',
  encontrarPorIdExterno([existente], 'salesforce', '<msg-1@itau>'), undefined);
check('reprocessar atualiza em vez de criar',
  ingerir(doEmail, 'email', [existente], opcoes).situacao, 'atualizada');

console.log('\n--- Mesclagem: o trabalho humano vence ---');
const revisada = op({
  titulo: 'Título corrigido à mão', marca: 'Marca corrigida', revisada: true,
});
const reenvio = { titulo: 'Título do CRM', marca: 'Marca do CRM', talento: 'Novo talento' };
const mesclada = mesclar(revisada, reenvio);
// A regra: campo que alguém preencheu não é sobrescrito.
check('não sobrescreve o que já foi revisado', mesclada.titulo, 'Título corrigido à mão');
check('nem a marca', mesclada.marca, 'Marca corrigida');
// Mas campo vazio recebe o dado novo: não há o que preservar.
check('preenche o que estava vazio', mesclada.talento, 'Novo talento');

const naoRevisada = op({ titulo: 'Assunto cru', marca: '', revisada: false });
const atualizada = mesclar(naoRevisada, reenvio);
// Enquanto ninguém conferiu, a origem é a melhor informação disponível.
check('não revisada aceita a atualização', atualizada.titulo, 'Título do CRM');
check('e a marca também', atualizada.marca, 'Marca do CRM');

console.log('\n--- Lote ---');
seq = 0;
const lote = [
  { titulo: 'A', idExterno: 'x1' },
  { titulo: 'B', idExterno: 'x2' },
  { titulo: 'A de novo', idExterno: 'x1' },   // duplicata DENTRO do lote
  { titulo: 'Sem chave' },                     // recusada
  { titulo: '', idExterno: 'x3' },             // recusada
];
const { oportunidades: apos, resumo } = ingerirLote(lote, 'salesforce', [], opcoes);
check('criou duas', resumo.criadas, 2);
check('atualizou a repetida', resumo.atualizadas, 1);
check('ignorou duas', resumo.ignoradas, 2);
check('e diz por quê', resumo.erros, { sem_id_externo: 1, sem_titulo: 1 });
check('o quadro ficou com duas linhas', apos.length, 2);
// Duplicata no mesmo lote é o caso de uma origem que reenvia após falha.
check('a repetida não virou linha nova',
  apos.filter((o) => o.idExterno === 'x1').length, 1);

console.log('\n--- Adaptador de e-mail ---');
const email = deEmail({
  messageId: '<abc@mail>', assunto: 'Proposta de campanha', remetente: 'cliente@marca.com',
  recebidoEm: '2026-08-03T10:00:00Z',
  extraido: { marca: 'Marca X', valor: 'R$ 10.000', prioridade: 'alta' },
  resumo: 'Trecho do corpo',
});
check('usa o Message-ID como chave', email.idExterno, '<abc@mail>');
check('o assunto vira o título', email.titulo, 'Proposta de campanha');
check('aproveita o que o agente extraiu', [email.marca, email.valorProjeto], ['Marca X', 'R$ 10.000']);
check('registra o remetente nas observações', email.observacoes.includes('cliente@marca.com'), true);
// Sem assunto, ainda precisa de um título — a linha não pode nascer anônima.
check('sem assunto, usa o remetente',
  deEmail({ messageId: 'm', assunto: '', remetente: 'x@y.com', recebidoEm: '' }).titulo,
  'E-mail de x@y.com');
check('prioridade do agente é normalizada',
  ingerir(email, 'email', [], opcoes).oportunidade.prioridade, 'alta');

console.log('\n--- Adaptador do Salesforce ---');
const sf = deSalesforce({
  Id: '0065g00000ABC', Name: 'Campanha verão', Account: { Name: 'Coca-Cola' },
  Amount: 320000, StageName: 'Proposal', Talent__c: 'Marina Duarte',
  Priority__c: 'High', Type: 'Campanha', CreatedDate: '2026-08-01T09:00:00Z',
});
check('usa o Id do CRM', sf.idExterno, '0065g00000ABC');
check('Name vira título', sf.titulo, 'Campanha verão');
check('Account vira marca', sf.marca, 'Coca-Cola');
check('Amount vira moeda brasileira', sf.valorProjeto?.includes('320.000'), true);
check('High é entendido como alta',
  ingerir(sf, 'salesforce', [], opcoes).oportunidade.prioridade, 'alta');
check('o estágio do CRM fica registrado', sf.observacoes.includes('Proposal'), true);
check('conta sem valor não inventa número',
  deSalesforce({ Id: 'x', Name: 'y' }).valorProjeto, undefined);

console.log('\n--- Filtros ---');
const quadro = [
  op({ id: 'f1', status: 'entrada', prazoEm: '2026-08-20' }),
  op({ id: 'f2', status: 'elaboracao' }),
  op({ id: 'f3', status: 'entrada', prazoEm: '2026-01-01' }),           // atrasada
  op({ id: 'f4', status: 'entrada', entradaPor: 'email', revisada: false }), // a conferir
  op({ id: 'f5', status: 'fechado' }),
];
const agora = em(3);
const filtrar = (f) => quadro.filter((o) => matchesFiltroOportunidade(o, f, agora)).map((o) => o.id);

check('todas', filtrar('todas').length, 5);
check('em triagem', filtrar('triagem'), ['f1', 'f3', 'f4']);
check('em andamento', filtrar('andamento'), ['f2']);
check('atrasadas', filtrar('atrasadas'), ['f3']);
check('a conferir', filtrar('revisar'), ['f4']);
check('encerradas', filtrar('fechadas'), ['f5']);

const c = contarOportunidades(quadro, agora);
check('contagem bate com os filtros',
  [c.todas, c.triagem, c.andamento, c.atrasadas, c.revisar, c.fechadas], [5, 3, 1, 1, 1, 1]);
// Atrasada e a-conferir CRUZAM com triagem: são recortes de atenção, não fatias do pipeline.
check('os recortes se sobrepõem de propósito',
  c.triagem + c.andamento + c.fechadas === c.todas, true);


console.log('\n--- Campos comerciais ---');
check('cinco inputs', INPUTS.map((i) => i.id), ['interno', 'mercado', 'inbound', 'proativo', 'viu_first']);
check('cinco origens comerciais', ORIGENS_COMERCIAIS.length, 5);
check('quatro tipos de projeto', TIPOS_PROJETO.map((t) => t.id), ['patrocinio', 'sob_demanda', 'projeto_especial', 'outro']);
/*
  Valor desconhecido devolve `undefined` — **não** cai num genérico.

  Cair em "interno" ou "outros" fazia o quadro afirmar uma classificação que ninguém fez, e
  misturava na mesma faixa quem escolheu aquilo com quem não escolheu nada. A tela mostra
  "Definir", e o rodapé conta à parte.
*/
check('input invalido não vira interno', getInput('sei la'), undefined);
check('origem invalida não vira outros', getOrigemComercial('sei la'), undefined);
check('tipo invalido não vira outro', getTipoProjeto('sei la'), undefined);
check('ausente idem', [getInput(), getOrigemComercial(), getTipoProjeto()], [undefined, undefined, undefined]);
// E os válidos continuam resolvendo.
check('válidos resolvem',
  [getInput('mercado').id, getOrigemComercial('tv_globo').id, getTipoProjeto('patrocinio').id],
  ['mercado', 'tv_globo', 'patrocinio']);

console.log('\n--- Normalizacao na ingestao ---');
const norm = (bruta) => ingerir({ titulo: 'X', idExterno: 'n1', ...bruta }, 'salesforce', [], opcoes).oportunidade;
check('Patrocinio e reconhecido', norm({ tipoProjeto: 'Patrocínio' }).tipoProjeto, 'patrocinio');
check('Sob Demanda tambem', norm({ tipoProjeto: 'sob demanda' }).tipoProjeto, 'sob_demanda');
check('Projeto Especial tambem', norm({ tipoProjeto: 'Projeto Especial' }).tipoProjeto, 'projeto_especial');
/*
  Texto não reconhecido fica **em branco**, não vira "outro".

  "Outro" é uma escolha de quem cadastra — significa "não é nenhum dos três". Um palpite de quem
  não entendeu o texto do e-mail não é a mesma coisa, e misturar os dois esconde o que precisava
  ser conferido. O registro entra com `revisada: false` e aparece no filtro **A conferir**.
*/
check('tipo desconhecido fica em branco', norm({ tipoProjeto: 'Campanha qualquer' }).tipoProjeto, undefined);
check('mas "outro" explícito é aceito', norm({ tipoProjeto: 'Outro' }).tipoProjeto, 'outro');
check('e sem o campo também fica em branco', norm({}).tipoProjeto, undefined);
check('Inbound e reconhecido', norm({ input: 'Inbound' }).input, 'inbound');
check('VIU First tambem', norm({ input: 'VIU First' }).input, 'viu_first');
check('Globoplay e reconhecido', norm({ origem: 'Globoplay' }).origem, 'globoplay');
check('Canais Pagos tambem', norm({ origem: 'Canais Pagos' }).origem, 'canais_pagos');
check('origem fora da lista fica em branco', norm({ origem: 'Netflix' }).origem, undefined);
// E-mail que chega sem ninguem pedir e inbound por definicao.
check('e-mail entra como inbound',
  ingerir(deEmail({ messageId: 'm2', assunto: 'A', remetente: 'x@y', recebidoEm: '' }), 'email', [], opcoes)
    .oportunidade.input, 'inbound');
/*
  A ingestao nao adivinha exclusividade.

  Ela deriva da ficha do talento, e o e-mail traz um nome, nao um vinculo. Falso na entrada e
  recalculado quando o nome casar com uma ficha — inventar aqui repetiria o defeito das
  classificacoes que a integracao deixou de chutar.
*/
check('exclusivo comeca falso', norm({}).exclusivo, false);
// O escopo, ao contrario, a integracao TEM como trazer: e o corpo do e-mail.
check('escopo entra vazio quando nao vem', norm({}).escopo, '');
check('e chega quando vem', norm({ escopo: '2 reels e 1 post' }).escopo, '2 reels e 1 post');

console.log('\n--- Etapas e desfechos ---');
check('cinco etapas no fluxo', ETAPAS_FLUXO.length, 5);
check('so uma e loop', ETAPAS_FLUXO.filter((e) => e.loop).map((e) => e.status), ['ajuste']);
check('as numeradas estao em ordem',
  ETAPAS_FLUXO.filter((e) => e.numero).map((e) => e.numero), [1, 2, 3, 4]);
check('quatro desfechos', DESFECHOS, ['fechado', 'standby', 'declinado', 'encerrado']);
// Nenhuma etapa do fluxo pode ser tambem um desfecho: seriam dois lugares para a mesma linha.
check('fluxo e desfechos nao se cruzam',
  ETAPAS_FLUXO.some((e) => DESFECHOS.includes(e.status)), false);

const paraResumo = [
  op({ id: 'r1', status: 'fechado', valorProjeto: 'R$ 100.000,00' }),
  op({ id: 'r2', status: 'fechado', valorProjeto: 'R$ 50.000,00' }),
  op({ id: 'r3', status: 'fechado', valorProjeto: 'a combinar' }),
  op({ id: 'r4', status: 'declinado', valorProjeto: 'R$ 10.000,00' }),
];
const resumoFechados = resumirPorStatus(paraResumo, 'fechado');
check('conta os do status', resumoFechados.quantidade, 3);
check('soma o que e legivel', resumoFechados.valor, 150000);
// O que nao da para somar e contado, nao ignorado: total que esconde faltante engana.
check('e reporta o ilegivel', resumoFechados.ilegiveis, 1);

console.log('\n--- Totais do rodape ---');
const paraRodape = [
  op({ id: 't1', status: 'entrada', prazoEm: '2026-08-20', input: 'inbound', exclusivo: true }),
  op({ id: 't2', status: 'entrada', prazoEm: '2026-08-04', input: 'mercado' }),
  op({ id: 't3', status: 'entrada', prazoEm: '2026-01-01', input: 'inbound' }),
  op({ id: 't4', status: 'fechado', prazoEm: '2026-01-01', input: 'interno', exclusivo: true }),
];
const tot = totaisDoRodape(paraRodape, em(3));
check('total conta tudo', tot.total, 4);
check('atrasados', tot.slaAtrasados, 1);
check('em atencao', tot.slaAtencao, 1);
check('no prazo', tot.slaNoPrazo, 1);
// A fechada nao entra em farol algum: o farol mede quem ainda espera resposta.
check('encerrada fica fora do farol',
  tot.slaAtrasados + tot.slaAtencao + tot.slaNoPrazo, 3);
// Conta EXCLUSIVOS desde 03/08/2026 — era `comInterveniencia`, o oposto.
check('conta exclusivos', tot.exclusivos, 2);
check('distribui por input', [tot.porInput.inbound, tot.porInput.mercado, tot.porInput.interno], [2, 1, 1]);
check('input sem ninguem fica zero', tot.porInput.viu_first, 0);

console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`);
