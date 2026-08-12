import { nomeCurto } from './utils/identidade.js';

let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

/*
  O pedido da operação, com o exemplo dela: "primeiro e último nome, ex: Caio Barroso".

  A sidebar exibia o nome de cadastro inteiro — que é o nome civil — e ele não cabe em 256px:
  "Caio Cesar Moura Bar…" corta no meio da palavra que identifica a pessoa, que é justamente o
  contrário do que o truncamento deveria proteger.
*/
console.log('--- O caso que originou a regra ---');
check('o exemplo da operação', nomeCurto('Caio Cesar Moura Barroso'), 'Caio Barroso');
check('dois nomes já estão curtos', nomeCurto('Ana Ribeiro'), 'Ana Ribeiro');

console.log('\n--- Partículas: ligam sobrenomes, não valem como nome ---');
check('"de" no meio some', nomeCurto('Marcos de Andrade'), 'Marcos Andrade');
check('"da Silva" vira "Silva"', nomeCurto('Maria da Silva Pereira'), 'Maria Pereira');

/*
  Sufixo de geração faz parte do sobrenome. Cortado pela última palavra, "Ana de Souza Neto"
  viraria "Ana Neto" — e "Neto" sozinho não identifica família nenhuma.
*/
console.log('\n--- Sufixos de geração viajam com o sobrenome ---');
check('Neto carrega o sobrenome junto', nomeCurto('Ana de Souza Neto'), 'Ana Souza Neto');
check('Júnior também', nomeCurto('Pedro Henrique Alves Júnior'), 'Pedro Alves Júnior');
check('Filho também', nomeCurto('José Carlos Lima Filho'), 'José Lima Filho');
check('mas sufixo colado numa partícula não arrasta a partícula',
  nomeCurto('Ana da Neto'), 'Ana Neto');
check('e sufixo sem sobrenome antes é o próprio sobrenome',
  nomeCurto('Ana Neto'), 'Ana Neto');

console.log('\n--- Bordas ---');
check('um nome só volta inteiro', nomeCurto('Madonna'), 'Madonna');
check('vazio volta vazio', nomeCurto(''), '');
check('só espaços volta vazio', nomeCurto('   '), '');
check('espaços extras não criam partes', nomeCurto('  Caio   Cesar   Barroso '), 'Caio Barroso');

/*
  A regra é a mesma que o avatar já usava para as iniciais (primeira + última). Se as duas
  divergirem, o avatar mostra "CB" ao lado de um nome que não começa com C nem termina com B.
*/
console.log('\n--- Coerência com as iniciais do avatar ---');
const iniciaisDe = (nome) => {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
};
check('as iniciais do nome curto batem com as do nome inteiro',
  iniciaisDe(nomeCurto('Caio Cesar Moura Barroso')), iniciaisDe('Caio Cesar Moura Barroso'));

console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
