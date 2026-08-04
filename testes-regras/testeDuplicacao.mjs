/*
  Duplicar projeto — as regras que a tela não mostra.

  O ponto delicado é o que **não** se copia. Um valor herdado por engano parece conferido, e
  ninguém revisa o que já está preenchido: é o tipo de defeito que só aparece no fechamento do mês.
*/
import { DESFECHOS_TERMINAIS } from './utils/oportunidades.js';

let falhas = 0;
function check(titulo, obtido, esperado) {
  const bate = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!bate) falhas++;
  console.log(`${bate ? 'OK  ' : 'FALHA'} ${titulo} -> ${JSON.stringify(obtido)}${
    bate ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

/* A lista do que a duplicação zera, como contrato explícito. */
const ZERADOS = [
  'talento', 'talentoId', 'interveniencia',
  'cache', 'comissaoGlobo', 'comissao', 'impostos', 'saving', 'custoProducao',
  'pep', 'parcelas', 'numeroContrato', 'fechamentoEm',
  'idExterno', 'motivoDeclinio', 'encerradaAutomaticamente',
];

const HERDADOS = [
  'titulo', 'marca', 'tipoProjeto', 'input', 'origem', 'prioridade',
  'contatoCliente', 'observacoes', 'responsaveis',
  'qtdReels', 'qtdVideos', 'qtdPosts', 'output', 'impacto', 'edicao',
  'linkProposta', 'linkSalesforce',
];

console.log('--- O contrato da duplicação ---');
check('nada aparece nas duas listas',
  ZERADOS.filter((campo) => HERDADOS.includes(campo)), []);
check('valores por negociação são zerados',
  ['cache', 'comissao', 'impostos', 'saving'].every((c) => ZERADOS.includes(c)), true);
check('o que descreve o trabalho é herdado',
  ['marca', 'tipoProjeto', 'qtdReels', 'linkProposta'].every((c) => HERDADOS.includes(c)), true);
/*
  `idExterno` é a chave que impede a integração de trazer a mesma oportunidade duas vezes. Copiá-la
  faria duas linhas disputarem a mesma origem — e a próxima sincronização escolheria uma delas.
*/
check('a chave de deduplicação nunca se copia', ZERADOS.includes('idExterno'), true);
/* Um desfecho herdado seria afirmar uma decisão que ninguém tomou para a linha nova. */
check('o motivo do declínio não se herda', ZERADOS.includes('motivoDeclinio'), true);
check('a marca de encerramento automático não se herda',
  ZERADOS.includes('encerradaAutomaticamente'), true);

console.log('\n--- Status ---');
/* Duplicar um projeto vivo mantém o ponto do fluxo; um terminado volta ao começo. */
for (const status of ['entrada', 'elaboracao', 'revisao', 'ajuste', 'aguardando_feedback', 'standby']) {
  check(`${status} é herdado`, DESFECHOS_TERMINAIS.includes(status), false);
}
for (const status of ['fechado', 'declinado', 'encerrado']) {
  check(`${status} volta para entrada`, DESFECHOS_TERMINAIS.includes(status), true);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO OK');
process.exit(falhas ? 1 : 0);
