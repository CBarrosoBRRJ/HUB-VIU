/**
 * Exclusividade — derivada do vínculo do talento.
 *
 * A regra da operação, nas palavras dela: *"exclusivo é o talento agenciado pela casa"*. Não é uma
 * segunda decisão a tomar — é consequência de quem representa o talento. Um exclusivo é agenciado
 * pela VIU, que contrata direto; um não-exclusivo traz quem o representa para o contrato, como
 * interveniente anuente.
 *
 * ## Esta suíte trocou de lado em 03/08/2026
 *
 * Chamava-se `testeInterveniencia` e verificava `intervenienciaDe`, que devolvia o **oposto**. A
 * coluna passou a se chamar "Exclusivo" a pedido da operação, e o campo foi invertido junto — um
 * campo que guarda o contrário do que a tela mostra é armadilha para quem escrever a próxima regra.
 *
 * O bloco "a inversão foi feita, e não só o nome" existe por causa disso: renomear sem inverter
 * passaria em qualquer teste que só checasse tipos, e faria **toda linha do quadro mentir**.
 */
import { exclusividadeDe } from './utils/oportunidades.js';
import {
  destinosPermitidos, ehCongelada, ehEstadoFinal, ETAPAS_CONGELADAS,
} from './utils/fluxoStatus.js';
import { OPORTUNIDADES_SEED } from './data/oportunidades.js';
import { TALENTOS_SEED } from './data/talentos.js';

let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

const exclusiva = { id: 'tal1', nome: 'Marina Duarte', tipo: 'exclusivo' };
const naoExclusivo = { id: 'tal2', nome: 'Rafael Nogueira', tipo: 'interveniencia' };
const fichas = [exclusiva, naoExclusivo];

console.log('--- A regra ---');
check('talento exclusivo → exclusivo sim',
  exclusividadeDe({ talento: 'Marina Duarte', talentoId: 'tal1' }, fichas), true);
check('talento não-exclusivo → exclusivo não',
  exclusividadeDe({ talento: 'Rafael Nogueira', talentoId: 'tal2' }, fichas), false);

console.log('\n--- A inversão foi feita, e não só o nome ---');
/*
  O teste que a troca de 03/08 exigia.

  Renomear `interveniencia` para `exclusivo` sem inverter o valor compila, passa no typecheck e não
  quebra nenhuma outra asserção — e faz a coluna afirmar o oposto da verdade em toda linha. Estas
  duas travam o sentido, não o nome: quem é exclusivo responde `true`, quem tem interveniência
  responde `false`. Se alguém reverter a inversão, morrem aqui.
*/
check('o EXCLUSIVO da casa responde verdadeiro',
  exclusividadeDe({ talento: 'Marina Duarte' }, fichas), true);
check('quem tem INTERVENIÊNCIA responde falso',
  exclusividadeDe({ talento: 'Rafael Nogueira' }, fichas), false);
// E o par nunca coincide: são leituras opostas do mesmo fato.
check('as duas respostas são opostas',
  exclusividadeDe({ talento: 'Marina Duarte' }, fichas)
    !== exclusividadeDe({ talento: 'Rafael Nogueira' }, fichas), true);

console.log('\n--- Sem resposta é diferente de "não" ---');
/*
  Devolve `undefined`, não `false`. A ausência de talento não é ausência de exclusividade: é
  ausência de resposta. Se devolvesse `false`, a tela afirmaria "não é exclusivo" para um projeto
  que sequer tem talento definido — e o jurídico leria isso como decisão tomada.
*/
check('sem talento', exclusividadeDe({ talento: '', talentoId: undefined }, fichas), undefined);
check('só espaços', exclusividadeDe({ talento: '   ' }, fichas), undefined);
check('nome sem ficha', exclusividadeDe({ talento: 'Quem Nunca' }, fichas), undefined);
check('lista de fichas vazia', exclusividadeDe({ talento: 'Marina Duarte' }, []), undefined);

console.log('\n--- Resolve pelo id, e cai no nome quando não há ---');
/*
  O id é a ligação confiável. O nome cobre o registro que veio de integração e ainda não foi casado
  com uma ficha — ele deve funcionar, mesmo sem vínculo formado.
*/
check('sem id, acha pelo nome',
  exclusividadeDe({ talento: 'Rafael Nogueira' }, fichas), false);
check('caixa não importa',
  exclusividadeDe({ talento: 'rafael nogueira' }, fichas), false);
check('espaço em volta não importa',
  exclusividadeDe({ talento: '  Marina Duarte  ' }, fichas), true);
// O id manda: se apontar para outra ficha, é ela que decide.
check('id vence o nome',
  exclusividadeDe({ talento: 'Rafael Nogueira', talentoId: 'tal1' }, fichas), true);
// Id órfão cai no nome em vez de devolver indefinido — o dado do nome ainda é utilizável.
check('id órfão volta para o nome',
  exclusividadeDe({ talento: 'Rafael Nogueira', talentoId: 'talXX' }, fichas), false);

console.log('\n--- Mudar o vínculo muda a resposta ---');
/*
  É o ponto da derivação: promover alguém a exclusivo marca os projetos dele como exclusivos, sem
  ninguém precisar lembrar de editar linha por linha. Enquanto era campo digitado, a ficha dizia
  uma coisa e as linhas outra — e quem notaria seria o jurídico, tarde demais.
*/
const promovido = [{ ...naoExclusivo, tipo: 'exclusivo' }];
check('antes da promoção', exclusividadeDe({ talento: 'Rafael Nogueira' }, fichas), false);
check('depois da promoção', exclusividadeDe({ talento: 'Rafael Nogueira' }, promovido), true);

console.log('\n--- O seed é coerente com a regra ---');
/*
  Nenhuma linha pode afirmar o contrário do que a ficha do talento diz. Uma divergência aqui é
  exatamente o estado impossível que a derivação existe para eliminar — e é o que pegaria uma
  migração de dado feita pela metade.
*/
const divergentes = OPORTUNIDADES_SEED.filter((op) => {
  const derivada = exclusividadeDe(op, TALENTOS_SEED);
  return derivada !== undefined && derivada !== op.exclusivo;
}).map((op) => [op.id, op.talento, `campo=${op.exclusivo}`]);
check('nenhuma linha discorda da ficha', divergentes, []);

// As que têm talento sem ficha ficam indefinidas — e o campo gravado não deve afirmar nada.
const semFicha = OPORTUNIDADES_SEED.filter(
  (op) => op.talento.trim() && exclusividadeDe(op, TALENTOS_SEED) === undefined,
);
check('as sem ficha não são marcadas como exclusivas',
  semFicha.every((op) => op.exclusivo === false), true);

/*
  O seed precisa ter os DOIS casos, senão a coluna nunca aparece nos dois estados numa demonstração
  — e um erro de inversão passaria despercebido por não haver com o que comparar.
*/
const comFicha = OPORTUNIDADES_SEED.filter(
  (op) => exclusividadeDe(op, TALENTOS_SEED) !== undefined,
);
check('o seed tem exclusivos', comFicha.some((op) => op.exclusivo === true), true);
check('o seed tem não-exclusivos', comFicha.some((op) => op.exclusivo === false), true);

console.log('\n--- O tipo de vínculo é o único insumo ---');
// Nada além de `tipo` entra na conta: nome artístico, empresa e responsáveis não influenciam.
const comRuido = [{ id: 'tal9', nome: 'Alguém', tipo: 'exclusivo', empresa: 'Agência X', responsaveis: {} }];
check('empresa preenchida não tira a exclusividade',
  exclusividadeDe({ talento: 'Alguém' }, comRuido), true);


console.log('\n--- Congelamento em Revisão e Aguardando Feedback ---');
/*
  Nessas duas etapas há uma versão do material circulando fora do quadro — em análise ou com o
  cliente. Editar aqui faria a tela descrever algo diferente do que foi enviado, e ninguém saberia
  qual das duas está certa.
*/
check('Em Revisão congela', ehCongelada('revisao'), true);
check('Aguardando Feedback congela', ehCongelada('aguardando_feedback'), true);
check('as três congeladas', ETAPAS_CONGELADAS, ['revisao', 'aguardando_feedback', 'standby']);

// Onde o trabalho acontece, o dado se edita.
for (const status of ['entrada', 'elaboracao', 'ajuste']) {
  check(`${status} permanece editável`, ehCongelada(status), false);
}
/*
  StandBy congela: é a pausa de um projeto que **já estava com o cliente** — só se chega nele a
  partir de Aguardando Feedback. O material lá fora continua o mesmo.
*/
check('StandBy congela', ehCongelada('standby'), true);
// Os desfechos terminais não precisam da regra: já não se editam por não terem mais fluxo.
for (const status of ['fechado', 'declinado', 'encerrado']) {
  check(`${status} não entra na regra`, ehCongelada(status), false);
}

/*
  O caminho de saída precisa existir, senão congelar viraria prender.

  De Revisão sai-se para **Ajustes** — que não é congelada — e é lá que se corrige. A correção fica
  registrada como etapa do processo, não como edição silenciosa de um material já enviado.
*/
check('de Revisão há saída para Ajustes',
  destinosPermitidos('revisao').includes('ajuste'), true);
check('e Ajustes aceita edição', ehCongelada('ajuste'), false);
check('de Aguardando Feedback saem cinco caminhos',
  destinosPermitidos('aguardando_feedback').length, 5);
/*
  Congelar não pode virar prender: **toda etapa congelada precisa de uma saída para onde se edita**.

  "Editável" é etapa que não congela **e** não é final — um desfecho não se edita por não ter mais
  fluxo, ainda que `ehCongelada` devolva false para ele. As duas condições juntas.
*/
const editavel = (status) => !ehCongelada(status) && !ehEstadoFinal(status);

check('Revisão sai para Ajustes',
  destinosPermitidos('revisao').filter(editavel), ['ajuste']);
check('Aguardando Feedback também',
  destinosPermitidos('aguardando_feedback').filter(editavel), ['ajuste']);
// StandBy chega lá em dois passos: retoma o feedback e, de lá, pede ajuste.
check('StandBy retoma para o feedback',
  destinosPermitidos('standby'), ['aguardando_feedback']);
check('e de lá alcança Ajustes',
  destinosPermitidos('standby').some((d) => destinosPermitidos(d).some(editavel)), true);

/*
  A invariante que fecha a regra: nenhuma etapa congelada é um beco.

  Cada uma alcança uma etapa editável em um ou dois passos. Sem isso, congelar equivaleria a
  arquivar — e atender um pedido de alteração exigiria recadastrar o projeto, perdendo histórico e
  data de entrada.
*/
const alcancaEditavel = (status) =>
  destinosPermitidos(status).some((d) => editavel(d) || destinosPermitidos(d).some(editavel));
check('nenhuma congelada é um beco', ETAPAS_CONGELADAS.every(alcancaEditavel), true);

console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`);
