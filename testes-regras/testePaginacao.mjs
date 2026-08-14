import { paginar } from './utils/paginar.js';

let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

const lista = Array.from({ length: 54 }, (_, i) => i + 1);

console.log('--- A janela ---');
const p1 = paginar(lista, 1, 20);
check('página 1 traz os 20 primeiros', [p1.itens[0], p1.itens.at(-1), p1.itens.length], [1, 20, 20]);
check('e se descreve como gente lê', [p1.de, p1.ate, p1.total, p1.totalPaginas], [1, 20, 54, 3]);

const p3 = paginar(lista, 3, 20);
check('a última página traz só o resto', [p3.itens[0], p3.itens.at(-1), p3.itens.length], [41, 54, 14]);
check('descrita do mesmo jeito', [p3.de, p3.ate], [41, 54]);

/*
  O clamp é o contrato central: a página pedida é um desejo, a devolvida é um fato. Trocar a busca
  na página 3 de uma lista que agora tem meia página não pode deixar a grade vazia num estado
  inválido — nem exigir um setState corretivo em quem chama.
*/
console.log('\n--- Pedido impossível vira o mais próximo possível ---');
check('página além do fim clampa para a última', paginar(lista, 99, 20).pagina, 3);
check('página zero clampa para a primeira', paginar(lista, 0, 20).pagina, 1);
check('negativa idem', paginar(lista, -4, 20).pagina, 1);
check('fração arredonda para baixo', paginar(lista, 2.9, 20).pagina, 2);

console.log('\n--- Bordas ---');
check('lista vazia: uma página vazia, sem divisão por zero',
  paginar([], 1, 20), { itens: [], pagina: 1, totalPaginas: 1, de: 0, ate: 0, total: 0 });
check('lista menor que a página: tudo numa página',
  [paginar([1, 2, 3], 1, 20).totalPaginas, paginar([1, 2, 3], 1, 20).itens.length], [1, 3]);
check('lista do tamanho exato: uma página cheia, não duas',
  paginar(lista.slice(0, 20), 1, 20).totalPaginas, 1);

console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
