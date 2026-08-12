import { nomeCurto, sanearCargos } from './utils/identidade.js';

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

/*
  `cargo` guarda o que a pessoa FAZ, nunca o que ela pode fazer.

  A semente nasceu com `cargo: 'Dono do Sistema'` — vocabulário de permissão num campo de cargo.
  Corrigir a semente não alcança quem já tem o valor gravado no navegador, e a persistência não tem
  migração pontual: ou se derruba a versão inteira (apagando os dados de todo mundo por causa de
  uma string), ou se repara na leitura. É o segundo.
*/
console.log('\n--- O cargo não guarda vocabulário de permissão ---');
const u = (cargo) => ({ id: 'u1', nome: 'Caio Cesar Moura Barroso', cargo });

check('o valor herdado é corrigido',
  sanearCargos([u('Dono do Sistema')])[0].cargo, 'Desenvolvedor');
check('cargo digitado pela pessoa não é tocado',
  sanearCargos([u('Analista de Agenciamento')])[0].cargo, 'Analista de Agenciamento');
check('cargo vazio não vira nada',
  sanearCargos([u('')])[0].cargo, '');
check('os demais campos atravessam intactos',
  sanearCargos([u('Dono do Sistema')])[0].nome, 'Caio Cesar Moura Barroso');
check('e os outros usuários da lista também',
  sanearCargos([u('Dono do Sistema'), { id: 'u2', nome: 'Ana', cargo: 'Gerente' }]).map((x) => x.cargo),
  ['Desenvolvedor', 'Gerente']);

/*
  Sem nada a corrigir, devolve a MESMA lista — não uma cópia. É o que permite chamar o reparo em
  toda leitura sem criar identidade nova a cada render.
*/
const limpa = [u('Desenvolvedor')];
check('lista já sã volta por identidade, sem cópia', sanearCargos(limpa) === limpa, true);

console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
