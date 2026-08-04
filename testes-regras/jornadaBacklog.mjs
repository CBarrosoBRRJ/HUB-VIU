/**
 * Jornada do Backlog — o quadro inteiro sobre o seed real.
 *
 * Percorre o que a tela faz: abrir, clicar em cada etapa do mapa, em cada card de finalização e em
 * cada filtro. O que se verifica é **coerência entre os números e as listas** — o defeito que
 * importa aqui não é uma função errada, é o cabeçalho dizendo 3 e a lista mostrando 2.
 */
import { OPORTUNIDADES_SEED } from './data/oportunidades.js';
import {
  contarOportunidades, DESFECHOS, DIAS_FINALIZADOS_VISIVEIS, emAndamento, ETAPAS_FLUXO,
  finalizadaRecentemente, finalizadasAntigas, getStatus, matchesFiltroOportunidade,
  resumirDeclinios, resumirPorStatus, slaDaOportunidade, STATUS_OPORTUNIDADE, precisaRevisao,
} from './utils/oportunidades.js';
import {
  aplicarEncerramentoAutomatico, DIAS_ATE_ENCERRAR, diasAteEncerrar, diasParado, ehEtapaAtiva,
} from './utils/fluxoStatus.js';
import { paraNumero } from './utils/moeda.js';

let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

/** A data contra a qual o seed foi montado. */
const HOJE = new Date(2026, 7, 2);

console.log('--- O seed cobre os nove status, dois a dois ---');
check('19 oportunidades', OPORTUNIDADES_SEED.length, 19);
check('ids únicos', new Set(OPORTUNIDADES_SEED.map((o) => o.id)).size, 19);
/* Declinado tem **três** — um por motivo, para a quebra do card mostrar os três. */
const ESPERADO_POR_STATUS = { declinado: 3 };
for (const { id, label } of STATUS_OPORTUNIDADE) {
  check(`${label}: exemplos`,
    OPORTUNIDADES_SEED.filter((o) => o.status === id).length, ESPERADO_POR_STATUS[id] ?? 2);
}

console.log('\n--- Abrir a tela: o encerramento automático roda antes de tudo ---');
/*
  O que a pessoa vê ao abrir **não** é o seed cru: `aplicarEncerramentoAutomatico` passa primeiro.
  Se um exemplo em etapa ativa estiver parado há mais de 20 dias, ele vira "Encerrado" e o seed
  deixa de demonstrar o que prometia — por isso a verificação é sobre o resultado, não a origem.
*/
const { oportunidades: naTela, encerradas } = aplicarEncerramentoAutomatico(OPORTUNIDADES_SEED, HOJE);
check('nenhum exemplo é recolhido ao abrir', encerradas, []);
for (const { id, label } of STATUS_OPORTUNIDADE) {
  check(`${label}: continua igual`,
    naTela.filter((o) => o.status === id).length, ESPERADO_POR_STATUS[id] ?? 2);
}

console.log('\n--- StandBy é pausa: o relógio dos 20 dias não corre nele ---');
const pausadaAntiga = naTela.find((o) => o.id === 'op12');
check('parada há mais de 20 dias', diasParado(pausadaAntiga, HOJE) > DIAS_ATE_ENCERRAR, true);
check('e mesmo assim segue em StandBy', pausadaAntiga.status, 'standby');
check('não é etapa ativa', ehEtapaAtiva('standby'), false);
check('e não tem contagem regressiva', diasAteEncerrar(pausadaAntiga, HOJE), null);

console.log('\n--- A lista de abertura mostra só o que está em andamento ---');
const andamento = emAndamento(naTela);
check('12 vivas (6 status × 2)', andamento.length, 12);
check('nenhum encerrado na lista', andamento.some((o) => getStatus(o.status).encerra), false);
// StandBy conta como vivo: não tem `encerra`, e volta ao fluxo.
check('mas StandBy aparece', andamento.filter((o) => o.status === 'standby').length, 2);

console.log('\n--- Cada etapa do mapa abre a lista que o número promete ---');
for (const etapa of ETAPAS_FLUXO) {
  const resumo = resumirPorStatus(naTela, etapa.status, HOJE);
  const lista = naTela.filter((o) => o.status === etapa.status);
  check(`${getStatus(etapa.status).label}: card ${resumo.quantidade} = lista ${lista.length}`,
    resumo.quantidade, lista.length);
}

console.log('\n--- Cada card de finalização idem, dentro da janela de 30 dias ---');
for (const desfecho of DESFECHOS) {
  const resumo = resumirPorStatus(naTela, desfecho, HOJE);
  const encerra = Boolean(getStatus(desfecho).encerra);
  // Num desfecho terminal a lista respeita a janela; no StandBy, não há janela a respeitar.
  const lista = naTela.filter(
    (o) => o.status === desfecho && (!encerra || finalizadaRecentemente(o, HOJE)),
  );
  check(`${getStatus(desfecho).label}: card = lista`, resumo.quantidade, lista.length);
}

console.log('\n--- O que saiu da janela é contado, não sumido ---');
/*
  `op18` foi encerrada em 20/06 — mais de 30 dias antes da referência. Ela não pode aparecer na
  lista nem no card, mas some sem rastro seria pior: o "e mais N" existe para dizer que ela está lá.
*/
const antigas = finalizadasAntigas(naTela, HOJE);
check('uma finalizada fora da janela', antigas, 1);
check('e é a op18', naTela.filter((o) => !finalizadaRecentemente(o, HOJE) && getStatus(o.status).encerra).map((o) => o.id), ['op18']);
check('encerrado no card conta só a de dentro',
  resumirPorStatus(naTela, 'encerrado', HOJE).quantidade, 1);
check('a janela é de 30 dias', DIAS_FINALIZADOS_VISIVEIS, 30);

console.log('\n--- Filtros: cada um devolve o que promete ---');
const contagem = contarOportunidades(andamento, HOJE);
const porFiltro = (f) => andamento.filter((o) => matchesFiltroOportunidade(o, f, HOJE));

for (const filtro of ['todas', 'triagem', 'andamento', 'atrasadas', 'revisar', 'fechadas']) {
  check(`${filtro}: contador = lista`, contagem[filtro === 'todas' ? 'todas' : filtro], porFiltro(filtro).length);
}
check('Todas = a lista inteira', contagem.todas, andamento.length);
check('Em triagem = as 2 em Entrada', porFiltro('triagem').map((o) => o.id), ['op1', 'op2']);
// "Em andamento" exclui triagem E encerrados — o que sobra são as etapas do meio, mais StandBy.
check('Em andamento = 10', contagem.andamento, 10);
check('triagem + andamento = todas', contagem.triagem + contagem.andamento, contagem.todas);
// Nenhum encerrado está na lista de abertura, então o filtro de encerradas vem vazio.
check('Encerradas = 0 na lista de abertura', contagem.fechadas, 0);

console.log('\n--- Atrasadas: o farol só corre em Entrada ---');
check('só op2 está atrasada', porFiltro('atrasadas').map((o) => o.id), ['op2']);
check('op1 está a vencer, não atrasada', slaDaOportunidade(naTela.find((o) => o.id === 'op1'), HOJE).tone, 'amarelo');
/*
  As etapas seguintes têm `prazoEm` no passado, mas o relógio parou quando saíram da triagem — o
  SLA mede tempo de **resposta**, não de vida do projeto. Se elas contassem como atrasadas, o
  filtro mostraria 8 e a promessa de "5 dias para responder" perderia o sentido.
*/
const foraDaTriagem = andamento.filter((o) => !getStatus(o.status).emTriagem);
check('nenhuma delas entra em atrasadas',
  foraDaTriagem.every((o) => slaDaOportunidade(o, HOJE).tone === 'cinza'), true);

console.log('\n--- A conferir: só o que veio de integração e ninguém confirmou ---');
check('duas a conferir', porFiltro('revisar').map((o) => o.id), ['op3', 'op9']);
check('e-mail e Salesforce', porFiltro('revisar').map((o) => o.entradaPor), ['email', 'salesforce']);
// Cadastro manual é conferido por quem digitou: nunca entra neste filtro.
check('manual nunca precisa de conferência',
  andamento.filter((o) => o.entradaPor === 'manual').some(precisaRevisao), false);

console.log('\n--- Aviso de encerramento: aparece na reta final ---');
const comAviso = andamento
  .filter((o) => { const r = diasAteEncerrar(o, HOJE); return r !== null && r <= 8; })
  .map((o) => [o.id, diasAteEncerrar(o, HOJE)]);
check('três em aviso, com os dias certos', comAviso, [['op2', 4], ['op6', 8], ['op10', 3]]);
// Cinco alarmes em doze linhas seriam ruído: quando quase tudo alarma, nada alarma.
check('e o resto está longe do limite',
  andamento.filter((o) => { const r = diasAteEncerrar(o, HOJE); return r !== null && r > 8; }).length, 7);
check('op10 é a mais crítica', diasAteEncerrar(naTela.find((o) => o.id === 'op10'), HOJE), 3);
// Quem acabou de se mover não deve alarmar ninguém.
check('op5 moveu ontem, sem aviso', diasAteEncerrar(naTela.find((o) => o.id === 'op5'), HOJE), 19);

console.log('\n--- Declinado abre por motivo, e as partes somam o todo ---');
const quebra = resumirDeclinios(naTela, HOJE);
check('os três motivos aparecem', quebra.map((q) => q.id), ['interno', 'mercado', 'talento']);
check('um de cada', quebra.map((q) => q.quantidade), [1, 1, 1]);
check('a soma bate com o card',
  quebra.reduce((t, q) => t + q.quantidade, 0),
  resumirPorStatus(naTela, 'declinado', HOJE).quantidade);
check('sem "sem motivo"', quebra.some((q) => q.id === 'sem_motivo'), false);

console.log('\n--- Valores: nada sai da soma em silêncio ---');
/*
  Todo `valorProjeto` do seed usa a grafia "R$ 320.000,00". Se algum virasse ilegível, o card
  mostraria um total menor com um "+N?" ao lado — e este teste diria onde.
*/
for (const desfecho of DESFECHOS) {
  check(`${getStatus(desfecho).label}: nenhum valor ilegível`,
    resumirPorStatus(naTela, desfecho, HOJE).ilegiveis, 0);
}
check('Negócio Fechado soma os dois', resumirPorStatus(naTela, 'fechado', HOJE).valor, 975000);
check('e o card de Declinado também', resumirPorStatus(naTela, 'declinado', HOJE).valor, 415000);
check('a grafia BR é lida certo', paraNumero('R$ 680.000,00'), 680000);

console.log('\n--- Integridade do seed ---');
check('todo talentoId aponta para o padrão tal-exemplo-*',
  OPORTUNIDADES_SEED.filter((o) => o.talentoId).every((o) => o.talentoId.startsWith('tal-exemplo-')), true);
check('quem veio de integração tem idExterno',
  OPORTUNIDADES_SEED.filter((o) => o.entradaPor !== 'manual').every((o) => o.idExterno), true);
check('e quem é manual, não tem',
  OPORTUNIDADES_SEED.filter((o) => o.entradaPor === 'manual').some((o) => o.idExterno), false);
check('prazoEm sempre depois de entradaEm',
  OPORTUNIDADES_SEED.every((o) => o.prazoEm > o.entradaEm), true);
check('statusDesde nunca antes da entrada',
  OPORTUNIDADES_SEED.every((o) => o.statusDesde >= o.entradaEm), true);
check('só declinado tem motivo',
  OPORTUNIDADES_SEED.filter((o) => o.motivoDeclinio).every((o) => o.status === 'declinado'), true);
check('todos têm valor preenchido',
  OPORTUNIDADES_SEED.every((o) => o.valorProjeto.trim()), true);

console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`);
