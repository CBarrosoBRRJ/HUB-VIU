import { STATUS_STYLE, TALENTO_STATUSES } from './utils/talentosStatus.js';
import { PALETA_STATUS } from './utils/oportunidades.js';

let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

const tom = (classe) => /bg-([a-z0-9-]+)/.exec(classe)[1];

/*
  O quadro de Contratos carregava treze matizes escolhidos a dedo — slate, sky, indigo, violet,
  blue, cyan, teal, amber, orange, emerald, yellow, rose, red. Carnaval em estado puro, com dois
  agravantes que o Backlog não tinha: âmbar/laranja/amarelo em três status distintos, e rosa/vermelho
  para dois desfechos diferentes.

  O que se trava aqui é a FORMA da migração: a esteira na ordem do avanço, os desfechos fora dela, e
  o vocabulário compartilhado com o outro quadro.
*/
console.log('--- A esteira cobre os treze status ---');
check('treze status', TALENTO_STATUSES.length, 13);
check('todos têm etiqueta, barra e ponto',
  TALENTO_STATUSES.every((s) => STATUS_STYLE[s]?.etiqueta && STATUS_STYLE[s]?.barra && STATUS_STYLE[s]?.dot),
  true);

const ESTEIRA = TALENTO_STATUSES.slice(0, 9);
const DESFECHOS = ['Concluído', 'Parado', 'Cancelado', 'Vencido'];

console.log('\n--- Os nove passos, na ordem do avanço ---');
check('a esteira é a fatia sequencial do catálogo', ESTEIRA[0] + ' … ' + ESTEIRA[8],
  'Criação … Em Assinatura');
check('cada passo tem seu tom', new Set(ESTEIRA.map((s) => tom(STATUS_STYLE[s].barra))).size, 9);
check('e os tons seguem a ordem do avanço',
  ESTEIRA.map((s) => tom(STATUS_STYLE[s].barra)),
  ['esteira-1', 'esteira-2', 'esteira-3', 'esteira-4', 'esteira-5',
    'esteira-6', 'esteira-7', 'esteira-8', 'esteira-9']);

/*
  Desfecho que tomasse um passo da esteira viraria "mais uma etapa" — e o inverso também vale: passo
  da esteira com cor de acento diria que o contrato saiu do curso quando ele está apenas andando.
*/
console.log('\n--- Os desfechos ficam fora da esteira ---');
check('nenhum desfecho usa passo da esteira',
  DESFECHOS.every((s) => !tom(STATUS_STYLE[s].barra).startsWith('esteira-')), true);
check('nenhum passo da esteira usa acento',
  ESTEIRA.every((s) => !tom(STATUS_STYLE[s].barra).startsWith('acento-')), true);

/*
  O ponto da migração: os dois quadros falam a MESMA paleta. "Parado esperando alguém" significa a
  mesma coisa no Backlog e em Contratos, e quem trabalha nos dois não deveria reaprender a cor.
*/
console.log('\n--- O vocabulário é compartilhado com o Backlog ---');
check('Parado usa o mesmo acento de ação que Ajustes',
  tom(STATUS_STYLE['Parado'].barra), tom(PALETA_STATUS.ajuste.barra));
check('Concluído usa o mesmo acento de ganho que Negócio Fechado',
  tom(STATUS_STYLE['Concluído'].barra), tom(PALETA_STATUS.fechado.barra));
check('Cancelado usa o mesmo acento de perda que Declinado',
  tom(STATUS_STYLE['Cancelado'].barra), tom(PALETA_STATUS.declinado.barra));

/*
  Cancelado e Vencido eram `rose-500` e `red-600`: dois vermelhos vizinhos, indistinguíveis de
  relance, para dois fins muito diferentes — um por decisão, outro por decurso de prazo. O que
  terminou pelo tempo é história, não pendência, e recua como o Encerrado do Backlog.
*/
console.log('\n--- Vencido recua, e é isso que o separa de Cancelado ---');
check('Vencido é o único vazado',
  TALENTO_STATUSES.filter((s) => !STATUS_STYLE[s].etiqueta.includes('text-white')), ['Vencido']);
check('e não se confunde com Cancelado',
  STATUS_STYLE['Vencido'].etiqueta === STATUS_STYLE['Cancelado'].etiqueta, false);

/*
  A garantia que impede a volta: matiz cravado do Tailwind na paleta de status é exatamente como
  ela chegou a treze cores — um status novo, uma cor nova, sem ninguém olhar o conjunto. A única
  exceção é o cinza do vazado, que não é matiz: é a ausência de um.
*/
console.log('\n--- Nenhum matiz escolhido a dedo sobrou ---');
const aDedo = TALENTO_STATUSES
  .filter((s) => /bg-(sky|blue|cyan|teal|indigo|violet|amber|orange|yellow|emerald|rose|red|green|purple|fuchsia|pink)-\d/.test(STATUS_STYLE[s].etiqueta));
check('nenhum status usa rampa pronta do Tailwind', aDedo, []);

console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
