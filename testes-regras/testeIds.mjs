/**
 * Geração de ids — o defeito que fazia "criar novo" replicar uma linha existente.
 *
 * Os contadores eram `useRef(1)` ou `useRef(SEED.length + 1)`. Nenhum olha para o que está
 * carregado, e o resultado é id repetido. Em React, duas linhas com a mesma `key` são reconciliadas
 * como uma: a nova aparece com os dados da antiga, e editar uma altera a outra.
 *
 * O sintoma na tela — "criar um projeto novo traz dados preenchidos de outro" — não parece
 * problema de id, e é por isso que este teste existe.
 */
import { proximoNumero, proximoNumeroFormatado } from './utils/ids.js';
import { OPORTUNIDADES_SEED } from './data/oportunidades.js';
import { MARCAS_SEED } from './data/marcas.js';
import { TALENTOS_SEED } from './data/talentos.js';
import { USUARIOS_SEED } from './data/usuarios.js';

let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

console.log('--- O próximo número vem do maior existente ---');
check('lista vazia começa em 1', proximoNumero([], 'op'), 1);
check('um registro', proximoNumero([{ id: 'op1' }], 'op'), 2);
check('vários em sequência', proximoNumero([{ id: 'op1' }, { id: 'op2' }, { id: 'op3' }], 'op'), 4);
// O maior, não a quantidade: com exclusões, contar itens devolveria um número já usado.
check('com buracos, usa o MAIOR', proximoNumero([{ id: 'op1' }, { id: 'op7' }], 'op'), 8);
check('fora de ordem também', proximoNumero([{ id: 'op9' }, { id: 'op2' }], 'op'), 10);
check('dois dígitos não confundem', proximoNumero([{ id: 'op9' }, { id: 'op18' }], 'op'), 19);

console.log('\n--- Prefixos não se misturam ---');
const misturado = [{ id: 'op3' }, { id: 'tal7' }, { id: 'u12' }];
check('op ignora tal e u', proximoNumero(misturado, 'op'), 4);
check('tal ignora op e u', proximoNumero(misturado, 'tal'), 8);
check('u ignora os demais', proximoNumero(misturado, 'u'), 13);
// `mar` não pode casar com `marca-legado`: o padrão exige o id inteiro, não um prefixo.
check('prefixo não casa parcialmente',
  proximoNumero([{ id: 'mar5x' }, { id: 'marca9' }], 'mar'), 1);

console.log('\n--- Id fora do padrão não atrapalha ---');
/*
  Importação, migração ou dado colado à mão podem trazer ids em outro formato. Eles não contribuem
  para o contador, mas também não podem quebrá-lo — `Number('abc')` seria `NaN`, e um `NaN` no
  `Math.max` contaminaria todos os ids seguintes.
*/
check('id sem número é ignorado', proximoNumero([{ id: 'op' }, { id: 'op4' }], 'op'), 5);
check('id de outra origem é ignorado', proximoNumero([{ id: 'uuid-abc-123' }, { id: 'op2' }], 'op'), 3);
check('só lixo devolve 1', proximoNumero([{ id: 'xpto' }], 'op'), 1);

console.log('\n--- Contratos: prefixo com separador e zeros ---');
check('CT-001 → 2', proximoNumeroFormatado([{ id: 'CT-001' }], 'CT'), 2);
check('CT-041 → 42', proximoNumeroFormatado([{ id: 'CT-041' }], 'CT'), 42);
check('pega o maior', proximoNumeroFormatado([{ id: 'CT-003' }, { id: 'CT-012' }], 'CT'), 13);
check('lista vazia', proximoNumeroFormatado([], 'CT'), 1);

console.log('\n--- Contra os seeds reais: nada colide ---');
/*
  A verificação que importa. Se o próximo id de qualquer entidade já existir no seed, a primeira
  criação daquela entidade nasce colidindo — que foi exatamente o defeito.
*/
const casos = [
  ['oportunidades', OPORTUNIDADES_SEED, 'op'],
  ['marcas', MARCAS_SEED, 'mar'],
  ['talentos', TALENTOS_SEED, 'tal'],
  ['usuários', USUARIOS_SEED, 'u'],
];
for (const [nome, seed, prefixo] of casos) {
  const proximo = `${prefixo}${proximoNumero(seed, prefixo)}`;
  check(`${nome}: ${proximo} está livre`, seed.some((r) => r.id === proximo), false);
}

console.log('\n--- A sequência resiste a criar, excluir e recarregar ---');
/*
  O caso que o `useRef(SEED.length + 1)` errava: depois de um F5, o estado vem do `localStorage` e
  o contador voltava ao número do seed, recriando os ids da sessão anterior.
*/
let lista = [...OPORTUNIDADES_SEED];
const criar = () => {
  const id = `op${proximoNumero(lista, 'op')}`;
  lista = [{ id }, ...lista];
  return id;
};
const primeiro = criar();
const segundo = criar();
check('dois novos, ids distintos', primeiro === segundo, false);
check('e nenhum colide com o seed',
  [primeiro, segundo].some((id) => OPORTUNIDADES_SEED.some((o) => o.id === id)), false);

// Recarregar = recalcular o contador a partir da lista salva. O número não regride.
const aposRecarregar = `op${proximoNumero(lista, 'op')}`;
check('depois de recarregar, continua de onde parou',
  lista.some((o) => o.id === aposRecarregar), false);

/*
  Excluir o último **libera** o número: derivando do maior existente, o próximo volta a ser aquele.

  É inofensivo aqui — o id excluído não é referenciado por nada que sobreviva — e é o preço de um
  contador auto-corretivo, que foi o que resolveu o defeito. Guardar o último número emitido nos
  devolveria ao problema original: um contador que precisa ser persistido junto com os dados, e
  que diverge quando não é.

  Com backend isto deixa de existir: o banco gera `uuid`, que nunca se repete.
*/
lista = lista.filter((o) => o.id !== segundo);
check('excluir libera o número para o próximo',
  `op${proximoNumero(lista, 'op')}`, segundo);
// O que não pode acontecer, e não acontece: colidir com algo que **ainda está** na lista.
check('mas nunca colide com registro vivo',
  lista.some((o) => o.id === `op${proximoNumero(lista, 'op')}`), false);

console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`);
