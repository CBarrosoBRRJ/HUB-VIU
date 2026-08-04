/**
 * Marcas — a lista fechada com escape que a coluna Marca oferece.
 *
 * O problema que ela resolve: enquanto o campo era texto livre, "Coca-Cola", "Coca Cola" e
 * "coca-cola" eram três marcas distintas para qualquer contagem, e o Power BI agruparia por
 * string. Escolher de uma lista resolve na origem — o nome fica igual porque é o mesmo registro.
 */
import { MARCAS_SEED } from './data/marcas.js';
import { normalizarNomeDeMarca } from './utils/talentos.js';
import { OPORTUNIDADES_SEED } from './data/oportunidades.js';

let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

console.log('--- Normalização: a chave que impede a marca duplicada ---');
/*
  É comparação **exata após normalizar** — diferente da semelhança aproximada de `referencias.ts`.
  Aqui não há dúvida a resolver: ou é a mesma marca, ou não é.
*/
check('caixa não importa', normalizarNomeDeMarca('COCA-COLA'), normalizarNomeDeMarca('coca-cola'));
check('hífen não importa', normalizarNomeDeMarca('Coca-Cola'), normalizarNomeDeMarca('Coca Cola'));
check('espaço em volta não importa', normalizarNomeDeMarca('  Ambev  '), normalizarNomeDeMarca('Ambev'));
check('acento não importa', normalizarNomeDeMarca('Ypê'), normalizarNomeDeMarca('Ype'));
check('pontuação não importa', normalizarNomeDeMarca('O Boticário!'), normalizarNomeDeMarca('O Boticario'));
// Marcas realmente diferentes continuam diferentes — a normalização não pode colapsar tudo.
check('Natura ≠ Nutura', normalizarNomeDeMarca('Natura') === normalizarNomeDeMarca('Nutura'), false);
check('Itaú ≠ Itau Unibanco',
  normalizarNomeDeMarca('Itaú') === normalizarNomeDeMarca('Itau Unibanco'), false);
check('vazio normaliza para vazio', normalizarNomeDeMarca('   '), '');

console.log('\n--- O seed de marcas ---');
check('19 marcas', MARCAS_SEED.length, 19);
check('ids únicos', new Set(MARCAS_SEED.map((m) => m.id)).size, MARCAS_SEED.length);
// Se duas entradas normalizarem igual, a lista já nasce com o problema que existe para evitar.
check('nenhum nome duplicado após normalizar',
  new Set(MARCAS_SEED.map((m) => normalizarNomeDeMarca(m.nome))).size, MARCAS_SEED.length);
check('todo campo obrigatório preenchido',
  MARCAS_SEED.every((m) => m.id && m.nome && m.tipo && m.criadoEm), true);
check('tipos válidos',
  MARCAS_SEED.every((m) => ['cliente', 'fornecedor', 'ambos'].includes(m.tipo)), true);
check('há um fornecedor', MARCAS_SEED.filter((m) => m.tipo === 'fornecedor').length, 1);
check('três pendentes de cadastro', MARCAS_SEED.filter((m) => m.cadastroPendente).length, 3);

console.log('\n--- A lista cobre o que o Backlog usa ---');
/*
  Toda marca escrita numa oportunidade precisa existir no cadastro. Uma que faltasse apareceria na
  coluna sem estar na lista — e a próxima pessoa a editar aquela linha criaria uma duplicata ao
  digitar o mesmo nome.
*/
const doCadastro = new Set(MARCAS_SEED.map((m) => normalizarNomeDeMarca(m.nome)));
const doBacklog = [...new Set(OPORTUNIDADES_SEED.map((o) => o.marca).filter(Boolean))];
const semCadastro = doBacklog.filter((nome) => !doCadastro.has(normalizarNomeDeMarca(nome)));
check('nenhuma marca do Backlog está fora do cadastro', semCadastro, []);
check('e o Backlog usa 18 marcas distintas', doBacklog.length, 18);
// Sobra uma: "Produtora Alfa", o fornecedor — a lista serve o quadro, não é derivada dele.
check('o cadastro tem mais que o Backlog usa', MARCAS_SEED.length > doBacklog.length, true);

console.log('\n--- Escolher da lista × criar ---');
/*
  A regra do componente: só oferece criar quando o texto **não existe** na lista, comparando
  normalizado. Sem isso, digitar "coca cola" ofereceria criar uma segunda Coca-Cola — exatamente
  o que ele existe para impedir.
*/
const existeNaLista = (texto) => doCadastro.has(normalizarNomeDeMarca(texto));
check('"Coca-Cola" já existe', existeNaLista('Coca-Cola'), true);
check('"coca cola" também', existeNaLista('coca cola'), true);
check('"COCA-COLA" também', existeNaLista('COCA-COLA'), true);
check('"Coca-Cola Brasil" é outra marca', existeNaLista('Coca-Cola Brasil'), false);
check('"Marca Nova" não existe', existeNaLista('Marca Nova'), false);

console.log('\n--- O que nasce pendente ---');
const pendentes = MARCAS_SEED.filter((m) => m.cadastroPendente).map((m) => m.nome);
check('as três pendentes', pendentes, ['Fast Burger', 'Loja Cem', 'Praiano']);
/*
  Pendente é estado de trabalho, não de erro: a marca **vale** e pode ser usada. O selo diz que
  falta completar o cadastro — segmento, contato —, não que o nome está errado.
*/
check('pendente continua na lista de escolha',
  pendentes.every((nome) => doCadastro.has(normalizarNomeDeMarca(nome))), true);
check('e é usada por projetos do Backlog',
  pendentes.every((nome) => doBacklog.includes(nome)), true);

console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`);
