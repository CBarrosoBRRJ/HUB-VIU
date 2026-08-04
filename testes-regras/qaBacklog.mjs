/**
 * QA do Backlog — procura **estado impossível**, não confirma que está bom.
 *
 * As demais suítes verificam que cada regra faz o que promete. Esta pergunta o contrário: existe
 * alguma combinação de dados que o sistema aceita e que não deveria existir? É a varredura que
 * pega contradição entre regras que, isoladas, estão certas.
 */
import {
  DESFECHOS, DESFECHOS_TERMINAIS, emAndamento, ETAPAS_FLUXO, finalizadaRecentemente, getInput,
  getOrigemComercial, getPrioridade, getStatus, getTipoProjeto, exclusividadeDe, comValorSemTique,
  matchesFiltroOportunidade, precisaRevisao, resumirDeclinios, resumirPorStatus, rotuloDoStatus,
  slaDaOportunidade, STATUS_OPORTUNIDADE, totaisDoRodape, MOTIVOS_DECLINIO,
} from './utils/oportunidades.js';
import {
  aplicarEncerramentoAutomatico, destinosPermitidos, ehCongelada, ehEstadoFinal, ehEtapaAtiva,
  ETAPAS_CONGELADAS, podeTransicionar, TRANSICOES,
} from './utils/fluxoStatus.js';
import { OPORTUNIDADES_SEED } from './data/oportunidades.js';
import { TALENTOS_SEED } from './data/talentos.js';
import { MARCAS_SEED } from './data/marcas.js';
import { COLUNAS_BACKLOG } from './utils/colunas.js';
import { visoesDoQuadro } from './utils/visoes.js';
import { normalizarNomeDeMarca } from './utils/talentos.js';
import { proximoNumero } from './utils/ids.js';


let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

const HOJE = new Date(2026, 7, 2);
const { oportunidades: naTela } = aplicarEncerramentoAutomatico(OPORTUNIDADES_SEED, HOJE);

console.log('--- Nenhuma linha em estado impossível ---');

/*
  1. Exclusividade precisa concordar com a ficha do talento. Uma divergência aqui significa que
     alguém editou por um caminho que não recalcula, e o jurídico leria a coluna errada.

     Foi esta asserção que pegou a migração de 03/08/2026 pela metade: ao inverter
     `interveniencia` em `exclusivo`, quatro linhas com talento **sem ficha** viraram
     `exclusivo: true`. O `false` antigo delas significava "não sabemos", não "não tem
     interveniência" — inverter o ambíguo produz uma afirmação que ninguém fez.
*/
check('exclusividade bate com a ficha',
  naTela.filter((op) => {
    const d = exclusividadeDe(op, TALENTOS_SEED);
    return d !== undefined && d !== op.exclusivo;
  }).map((o) => o.id), []);

/* 1b. Sem ficha, o campo não afirma nada: `false` é a ausência de resposta, nunca um "sim". */
check('linha sem ficha não se declara exclusiva',
  naTela.filter((op) => exclusividadeDe(op, TALENTOS_SEED) === undefined && op.exclusivo)
    .map((o) => o.id), []);

/*
  1c. **Valor numa coluna que o Escopo diz não existir** — o estado impossível dos tiques.

  Cada tique da aba Escopo destrava uma coluna na Produção. Desmarcar apaga o valor, então esta
  combinação não deveria existir: `edicao: 'interna'` com `temEdicao: false` é a tela afirmando
  duas coisas opostas sobre a mesma linha.

  O perigo não é visual. A célula travada mostra "—", e o valor órfão continua no banco: o Power
  BI o leria sem saber que o projeto renegou aquela dimensão, e o relatório contaria uma edição
  que ninguém faz. É exatamente o tipo de contradição que esta suíte existe para procurar.
*/
check('nenhum valor sem o tique que o destrava', comValorSemTique(naTela), []);

/* 2. Motivo de declínio só existe em declinado — e todo motivo é da lista. */
check('motivo só em declinado',
  naTela.filter((op) => op.motivoDeclinio && op.status !== 'declinado').map((o) => o.id), []);
check('todo motivo é conhecido',
  naTela.filter((op) => op.motivoDeclinio
    && !MOTIVOS_DECLINIO.some((m) => m.id === op.motivoDeclinio)).map((o) => o.id), []);

/* 3. Status precisa existir no catálogo, senão a tela não sabe desenhar a linha. */
check('todo status é conhecido',
  naTela.filter((op) => !STATUS_OPORTUNIDADE.some((s) => s.id === op.status)).map((o) => o.id), []);

/* 4. Classificação: ou é da lista, ou está ausente. Valor solto quebraria o filtro em silêncio. */
const classificacaoInvalida = naTela.filter((op) =>
  (op.input !== undefined && !getInput(op.input))
  || (op.origem !== undefined && !getOrigemComercial(op.origem))
  || (op.tipoProjeto !== undefined && !getTipoProjeto(op.tipoProjeto))
  || (op.prioridade !== undefined && !getPrioridade(op.prioridade)));
check('nenhuma classificação fora da lista', classificacaoInvalida.map((o) => o.id), []);

/* 5. Datas: o prazo nasce da entrada, e o status não pode ser anterior a ela. */
check('prazo depois da entrada',
  naTela.filter((op) => op.prazoEm <= op.entradaEm).map((o) => o.id), []);
check('statusDesde não precede a entrada',
  naTela.filter((op) => op.statusDesde < op.entradaEm).map((o) => o.id), []);

/* 6. Encerramento automático só marca quem está encerrado. */
check('marca de automático só em encerrado',
  naTela.filter((op) => op.encerradaAutomaticamente && op.status !== 'encerrado').map((o) => o.id), []);

/* 7. Vínculo de talento aponta para ficha existente, ou não aponta. */
check('talentoId sempre resolve',
  naTela.filter((op) => op.talentoId && !TALENTOS_SEED.some((t) => t.id === op.talentoId))
    .map((o) => o.id), []);

/* 8. Marca escrita numa linha precisa existir no cadastro — senão duplica na próxima edição. */
const cadastradas = new Set(MARCAS_SEED.map((m) => normalizarNomeDeMarca(m.nome)));
check('toda marca usada está cadastrada',
  naTela.filter((op) => op.marca.trim() && !cadastradas.has(normalizarNomeDeMarca(op.marca)))
    .map((o) => o.marca), []);

console.log('\n--- A máquina de estados fecha ---');

/* Todo destino existe, e nenhum status é ilha. */
const ids = STATUS_OPORTUNIDADE.map((s) => s.id);
check('todo status tem transições declaradas', ids.every((id) => TRANSICOES[id] !== undefined), true);
check('todo destino é status conhecido',
  Object.values(TRANSICOES).flat().every((d) => ids.includes(d)), true);

// Alcançabilidade: um status que não se atinge desde Entrada é código morto na tela.
const alcancaveis = new Set(['entrada']);
for (let mudou = true; mudou;) {
  mudou = false;
  for (const de of [...alcancaveis]) {
    for (const para of TRANSICOES[de]) if (!alcancaveis.has(para)) { alcancaveis.add(para); mudou = true; }
  }
}
check('todos os status são alcançáveis', alcancaveis.size, STATUS_OPORTUNIDADE.length);

/*
  Congelar não pode virar prender: toda etapa congelada alcança uma editável em até dois passos.
  Sem isso, atender um pedido de alteração exigiria recadastrar o projeto.
*/
const editavel = (s) => !ehCongelada(s) && !ehEstadoFinal(s);
const alcancaEditavel = (s) =>
  destinosPermitidos(s).some((d) => editavel(d) || destinosPermitidos(d).some(editavel));
check('nenhuma congelada é beco', ETAPAS_CONGELADAS.every(alcancaEditavel), true);

// Etapa ativa e desfecho particionam o catálogo: nada de fora, nada em dois grupos.
check('ativas + desfechos cobrem tudo, sem sobreposição',
  ids.filter((id) => ehEtapaAtiva(id) === DESFECHOS.includes(id)), []);

console.log('\n--- Cabeçalho e lista concordam ---');

for (const etapa of ETAPAS_FLUXO) {
  const card = resumirPorStatus(naTela, etapa.status, HOJE).quantidade;
  const lista = naTela.filter((o) => o.status === etapa.status).length;
  check(`${getStatus(etapa.status).label}: card = lista`, card, lista);
}
for (const desfecho of DESFECHOS) {
  const card = resumirPorStatus(naTela, desfecho, HOJE).quantidade;
  const encerra = Boolean(getStatus(desfecho).encerra);
  const lista = naTela.filter(
    (o) => o.status === desfecho && (!encerra || finalizadaRecentemente(o, HOJE)),
  ).length;
  check(`${getStatus(desfecho).label}: card = lista`, card, lista);
}

// A quebra de declínios soma o card que a contém.
const quebra = resumirDeclinios(naTela, HOJE);
check('quebra de declínio soma o card',
  quebra.reduce((t, q) => t + q.quantidade, 0),
  resumirPorStatus(naTela, 'declinado', HOJE).quantidade);

console.log('\n--- Filtros e rodapé ---');

const andamento = emAndamento(naTela);
// Triagem e andamento particionam a lista viva: toda linha está em exatamente um dos dois.
const emAmbos = andamento.filter((o) =>
  matchesFiltroOportunidade(o, 'triagem', HOJE) === matchesFiltroOportunidade(o, 'andamento', HOJE));
check('triagem e andamento particionam', emAmbos.map((o) => o.id), []);

// Atrasada só existe em triagem — fora dela o relógio parou.
check('atrasada só em triagem',
  andamento.filter((o) => matchesFiltroOportunidade(o, 'atrasadas', HOJE)
    && !getStatus(o.status).emTriagem).map((o) => o.id), []);

// "A conferir" nunca pega cadastro manual: quem digitou já conferiu.
check('manual nunca precisa conferência',
  naTela.filter((o) => o.entradaPor === 'manual' && precisaRevisao(o)).map((o) => o.id), []);

const totais = totaisDoRodape(andamento, HOJE);
const somaPorInput = Object.values(totais.porInput).reduce((a, b) => a + b, 0);
check('rodapé não perde nem duplica linha', somaPorInput + totais.semInput, andamento.length);
check('e o total confere', totais.total, andamento.length);
// O farol conta só quem espera resposta; o resto fica de fora das três faixas, de propósito.
check('farol nunca excede a lista',
  totais.slaAtrasados + totais.slaAtencao + totais.slaNoPrazo <= andamento.length, true);

console.log('\n--- Rótulos e leitura ---');

// Toda linha tem rótulo legível, mesmo sem classificação — senão a tela mostra "undefined".
check('todo status rende rótulo',
  naTela.filter((o) => !rotuloDoStatus(o.status, o.motivoDeclinio)).map((o) => o.id), []);
check('todo SLA rende tom e texto',
  naTela.filter((o) => { const s = slaDaOportunidade(o, HOJE); return !s.tone || !s.label; })
    .map((o) => o.id), []);

console.log('\n--- Catálogo de colunas e abas ---');

check('toda aba do Backlog tem entrada no catálogo',
  visoesDoQuadro('backlog').filter((v) => !Array.isArray(COLUNAS_BACKLOG[v.id])).map((v) => v.id), []);
check('toda coluna aponta para uma aba existente',
  Object.entries(COLUNAS_BACKLOG)
    .filter(([visao]) => !visoesDoQuadro('backlog').some((v) => v.id === visao))
    .map(([visao]) => visao), []);
/*
  A soma 82 foi aposentada em 04/08/2026 (ver a nota em `testeColunas`): desde a grade contínua
  quem posiciona o cabeçalho é a largura em px no `<colgroup>` com `table-layout: fixed` — e é
  ela que não pode faltar em coluna nenhuma.
*/
check('nenhuma coluna do Backlog sem largura declarada',
  Object.entries(COLUNAS_BACKLOG)
    .filter(([, c]) => c.some((x) => !Number.isInteger(x.largura)))
    .map(([v]) => v), []);

console.log('\n--- Criação não colide ---');

const proximo = `op${proximoNumero(naTela, 'op')}`;
check('próximo id está livre', naTela.some((o) => o.id === proximo), false);
check('ids do seed são únicos', new Set(naTela.map((o) => o.id)).size, naTela.length);

/*
  A linha recém-criada precisa aparecer na lista de abertura, senão o botão parece não funcionar.
  Ela nasce em Entrada, e a página passa a focar essa etapa ao criar.
*/
const nova = { status: 'entrada', statusDesde: '2026-08-02', entradaEm: '2026-08-02', prazoEm: '2026-08-07', titulo: 'Sem título', marca: '', talento: '', exclusivo: false, escopo: '', responsaveis: {}, entradaPor: 'manual', revisada: true, valorProjeto: '', id: proximo };
check('linha nova entra em andamento', emAndamento([nova]).length, 1);
check('e no filtro Todas', matchesFiltroOportunidade(nova, 'todas', HOJE), true);
check('e em triagem', matchesFiltroOportunidade(nova, 'triagem', HOJE), true);
// Sem classificação, ela não pode cair num filtro de classificação que ninguém escolheu.
check('não aparece como atrasada', matchesFiltroOportunidade(nova, 'atrasadas', HOJE), false);
check('nem como a conferir', matchesFiltroOportunidade(nova, 'revisar', HOJE), false);

console.log('\n--- Congelamento na prática ---');

// Toda linha do seed em etapa congelada precisa ter caminho de saída — senão trava na operação.
const congeladasNoSeed = naTela.filter((o) => ehCongelada(o.status));
check('há linhas congeladas para ver', congeladasNoSeed.length > 0, true);
check('todas com caminho de saída',
  congeladasNoSeed.every((o) => destinosPermitidos(o.status).length > 0), true);
// E o status continua mudável: congelar dados não pode travar o fluxo.
check('status de congelada aceita transição',
  congeladasNoSeed.every((o) => podeTransicionar(o.status, destinosPermitidos(o.status)[0])), true);

console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`);
