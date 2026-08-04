import {
  normalizar, distancia, similaridade, LIMIAR_SEMELHANCA, semelhantes, sugestoes,
  valoresUsados, divergencias,
} from './utils/referencias.js';

let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

console.log('\n--- Normalização e distância ---');
check('remove acento', normalizar('São Paulo'), 'sao paulo');
check('apara e minúscula', normalizar('  MARINA  '), 'marina');
check('idêntico tem distância 0', distancia('marina', 'marina'), 0);
check('uma troca, distância 1', distancia('marina', 'mariNo'), 1);
check('acento não conta', distancia('São Paulo', 'Sao Paulo'), 0);
check('vazio contra texto', distancia('', 'abc'), 3);

/* ------------------------------------------------------------------ *
 * Calibração — este bloco TRAVA o limiar.
 *
 * Se alguém mexer na métrica e um destes pares cruzar a linha, a suíte acusa. Sem isso, o
 * `LIMIAR_SEMELHANCA` seria um número mágico que ninguém sabe se ainda vale.
 * ------------------------------------------------------------------ */
console.log('\n--- Calibração do limiar ---');

const DEVEM_ALERTAR = [
  ['Gil do Vigor', 'Gilberto do Vigor'],   // abreviação — o caso citado pela operação
  ['Sao Paulo', 'São Paulo'],              // acento
  ['Marina Duarte', 'Mariana Duarte'],     // letra a mais
  ['Rafael Nogueira', 'Rafa Nogueira'],    // apelido
  ['MD Producoes', 'MD Produções'],        // acento no meio
  ['Helena Prado', 'Helena Prado Silva'],  // nome que cresceu
  ['belo horizonte', 'Belo Horizonte'],    // só a caixa
];

const NAO_DEVEM = [
  ['Marina Duarte', 'Rafael Nogueira'],            // nada a ver
  ['Marina Duarte', 'Marina Silva'],               // mesmo primeiro nome, pessoas diferentes
  ['Sao Paulo', 'Rio de Janeiro'],
  ['Gestao de Contratos', 'Gestao de Producao'],   // prefixo comum longo
  ['Campanha Coca-Cola', 'Campanha Pepsi'],
];

const menorAlerta = Math.min(...DEVEM_ALERTAR.map(([a, b]) => similaridade(a, b)));
const maiorPasse = Math.max(...NAO_DEVEM.map(([a, b]) => similaridade(a, b)));

for (const [a, b] of DEVEM_ALERTAR) {
  check(`alerta: ${a} × ${b}`, similaridade(a, b) >= LIMIAR_SEMELHANCA, true);
}
for (const [a, b] of NAO_DEVEM) {
  check(`passa: ${a} × ${b}`, similaridade(a, b) < LIMIAR_SEMELHANCA, true);
}

console.log(`     menor dos que alertam: ${menorAlerta.toFixed(3)}`);
console.log(`     maior dos que passam : ${maiorPasse.toFixed(3)}`);
check('o limiar cai na folga entre os dois grupos',
  LIMIAR_SEMELHANCA > maiorPasse && LIMIAR_SEMELHANCA < menorAlerta, true);
// Folga estreita significa métrica frágil: qualquer nome novo cai no meio.
check('a folga é confortável (>= 0,15)', menorAlerta - maiorPasse >= 0.15, true);

console.log('\n--- Semelhantes ---');
const nomes = ['Gil do Vigor', 'Marina Duarte', 'Rafael Nogueira', 'Helena Prado'];
check('acha o parecido', semelhantes('Gilberto do Vigor', nomes).map((s) => s.valor), ['Gil do Vigor']);
// Exato não é dúvida: quem escreveu o que existe escolheu aquele.
check('exato não gera dúvida', semelhantes('Marina Duarte', nomes), []);
check('nome novo e distinto passa', semelhantes('Joana Prates', nomes), []);
check('vazio não gera dúvida', semelhantes('   ', nomes), []);
check('ordena do mais parecido',
  semelhantes('Marina Duart', ['Marina Duarte', 'Mariana Duarte']).map((s) => s.valor),
  ['Marina Duarte', 'Mariana Duarte']);
check('respeita o limite', semelhantes('Marina Duart', ['Marina Duarte', 'Mariana Duarte', 'Marina Duartes'], 2).length, 2);

console.log('\n--- Sugestões ---');
const opcoes = ['Marina Duarte', 'Mariana Silva', 'Rafael Nogueira', 'Ricardo Martins'];
check('termo vazio devolve tudo', sugestoes('', opcoes).length, 4);
// Quem começa com o termo vem antes de quem só o contém.
check('prefixo vem antes de contém', sugestoes('mar', opcoes),
  ['Marina Duarte', 'Mariana Silva', 'Ricardo Martins']);
check('ignora acento', sugestoes('rafael', ['Rafael Nogueira']), ['Rafael Nogueira']);
check('sem resultado', sugestoes('zzz', opcoes), []);
check('não repete opção duplicada', sugestoes('', ['A', 'A', 'B']), ['A', 'B']);
check('ignora vazios', sugestoes('', ['A', '', '  ']), ['A']);

console.log('\n--- Valores já usados ---');
const registros = [
  { local: 'São Paulo' }, { local: 'São Paulo' }, { local: 'São Paulo' },
  { local: 'Sao Paulo' },
  { local: 'Rio de Janeiro' },
  { local: '' }, { local: '  ' }, {},
];
// A grafia mais frequente vence: a lista converge para o certo em vez de perpetuar o erro.
check('agrupa variantes e devolve a mais frequente', valoresUsados(registros, 'local'),
  ['Rio de Janeiro', 'São Paulo']);
check('campo inexistente devolve vazio', valoresUsados(registros, 'nada'), []);
check('ignora valores não-texto', valoresUsados([{ local: 42 }, { local: 'X' }], 'local'), ['X']);

console.log('\n--- Divergências ---');
check('acha as duas grafias',
  divergencias(registros, 'local').map((d) => d.grafias.sort()),
  [['Sao Paulo', 'São Paulo']]);
check('grafia única não é divergência',
  divergencias([{ local: 'Curitiba' }, { local: 'Curitiba' }], 'local'), []);

console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`);
