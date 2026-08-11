/**
 * As regras do desfazer — `utils/historico.ts`.
 *
 * O que se verifica aqui é o que **não** dá para ver na tela: que o passo guardado é o estado
 * anterior (e não o novo), que desfazer e refazer são simétricos, que o teto da pilha descarta
 * pela base, e que o atalho não vale dentro de um campo de texto.
 */
import {
  descreverMudanca, desfazer, ehAtalhoDesfazer, ehAtalhoRefazer, ehCampoDeTexto, empilhar,
  LIMITE_HISTORICO, refazer, semMudanca,
} from './utils/historico.js';

let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

const op = (id, titulo, over = {}) => ({ id, titulo, ...over });
const contrato = (id, talento) => ({ id, talento });
const talento = (id, nome) => ({ id, nome });
const marca = (id, nome) => ({ id, nome });

/*
  Instantâneo com as quatro coleções — o que falta reaproveita a **mesma** lista vazia.

  A referência compartilhada não é economia: é o que reproduz o provider. Lá, uma mutação em
  oportunidades devolve `{...estado, oportunidades: novas}` e as outras três listas seguem sendo os
  mesmos objetos. Um helper que criasse `[]` novo por chamada faria toda coleção parecer alterada,
  e o teste passaria a medir o helper em vez da regra.
*/
const VAZIAS = { oportunidades: [], contratos: [], talentos: [], marcas: [] };
const inst = (over = {}) => ({ ...VAZIAS, ...over });

console.log('--- semMudanca: a comparação é por referência ---');

const listaA = [op('op1', 'Campanha Verão')];
const base = inst({ oportunidades: listaA });

check('mesmo objeto não é mudança', semMudanca(base, base), true);
check('mesmas referências não são mudança', semMudanca(base, inst({ oportunidades: listaA })), true);
// Conteúdo igual em lista nova conta como mudança: é o preço de comparar por referência, e o
// custo é uma entrada a mais no histórico — nunca um passo perdido.
check(
  'lista nova com mesmo conteúdo conta como mudança',
  semMudanca(base, inst({ oportunidades: [op('op1', 'Campanha Verão')] })),
  false,
);
check(
  'mudança em outra coleção também é vista',
  semMudanca(base, inst({ oportunidades: listaA, talentos: [talento('t1', 'Ana')] })),
  false,
);

console.log('\n--- descreverMudanca: a frase sai da diferença ---');

check(
  'criação nomeia o registro',
  descreverMudanca(inst(), inst({ oportunidades: [op('op1', 'Campanha Verão')] })),
  'Criação de "Campanha Verão"',
);
check(
  'duplicação se distingue pelo rastro',
  descreverMudanca(
    inst({ oportunidades: [op('op1', 'Campanha Verão')] }),
    inst({
      oportunidades: [op('op2', 'Campanha Verão', { duplicadaDe: 'op1' }), op('op1', 'Campanha Verão')],
    }),
  ),
  'Duplicação de "Campanha Verão"',
);
check(
  'exclusão de uma linha nomeia o alvo',
  descreverMudanca(inst({ oportunidades: [op('op1', 'Campanha Verão')] }), inst()),
  'Exclusão de "Campanha Verão"',
);
check(
  'exclusão em lote conta, com plural correto',
  descreverMudanca(
    inst({ oportunidades: [op('op1', 'A'), op('op2', 'B'), op('op3', 'C')] }),
    inst({ oportunidades: [op('op3', 'C')] }),
  ),
  'Exclusão de 2 projetos',
);
/*
  A edição é montada como o provider a monta: `map` que devolve o **mesmo objeto** para as linhas
  intocadas e um objeto novo só para a alterada. É isso que permite achar a linha certa — clonar
  todas faria a primeira parecer a alterada.
*/
const linhaA = op('op1', 'A');
const linhaB = op('op2', 'B');
check(
  'edição aponta a linha alterada',
  descreverMudanca(
    inst({ oportunidades: [linhaA, linhaB] }),
    inst({ oportunidades: [linhaA, { ...linhaB, titulo: 'B renomeada' }] }),
  ),
  'Alteração em "B renomeada"',
);
// Reordenar não altera linha nenhuma: a frase fica genérica em vez de apontar quem não mudou.
check(
  'reordenação não acusa linha alterada',
  descreverMudanca(
    inst({ oportunidades: [linhaA, linhaB] }),
    inst({ oportunidades: [linhaB, linhaA] }),
  ),
  'Alteração em projetos',
);
// Linha recém-criada ainda sem nome: a frase não pode virar aspas vazias.
check(
  'sem título, cai no nome da entidade',
  descreverMudanca(inst(), inst({ oportunidades: [op('op1', '')] })),
  'Criação de o projeto',
);
check(
  'contrato é descrito pelo talento',
  descreverMudanca(inst(), inst({ contratos: [contrato('ct1', 'Ana Martins')] })),
  'Criação de "Ana Martins"',
);
check(
  'talento e marca usam o nome',
  descreverMudanca(inst(), inst({ marcas: [marca('m1', 'Ambev')] })),
  'Criação de "Ambev"',
);
// Uma ação que toca duas coleções descreve só a primeira — ver o comentário em `descreverMudanca`.
check(
  'duas coleções: descreve a da frente',
  descreverMudanca(
    inst(),
    inst({ oportunidades: [op('op1', 'Projeto')], talentos: [talento('t1', 'Ana')] }),
  ),
  'Criação de "Projeto"',
);
check('sem diferença nenhuma, frase genérica', descreverMudanca(inst(), inst()), 'Alteração');

console.log('\n--- empilhar: o teto descarta pela base ---');

const cheia = Array.from({ length: LIMITE_HISTORICO }, (_, i) => i);
const estourada = empilhar(cheia, 999);
check('não passa do limite', estourada.length, LIMITE_HISTORICO);
check('o mais antigo sai', estourada[0], 1);
check('o novo entra no fim', estourada[estourada.length - 1], 999);
check('pilha original intacta', cheia.length, LIMITE_HISTORICO);

console.log('\n--- desfazer e refazer ---');

const antes = inst({ oportunidades: [op('op1', 'Nome antigo')] });
const depois = inst({ oportunidades: [op('op1', 'Nome novo')] });
const passo = { instantaneo: antes, descricao: descreverMudanca(antes, depois) };

const voltou = desfazer([passo], [], depois);
check('devolve o estado anterior', voltou.instantaneo.oportunidades[0].titulo, 'Nome antigo');
check('tira o passo do passado', voltou.passado.length, 0);
check('guarda o atual no futuro', voltou.futuro.length, 1);
check('o futuro guarda o estado de onde saiu', voltou.futuro[0].instantaneo, depois);
check('avisa o que fez', voltou.aviso, 'Desfeito · Alteração em "Nome novo"');

const refez = refazer(voltou.passado, voltou.futuro, voltou.instantaneo);
check('refazer devolve o estado novo', refez.instantaneo.oportunidades[0].titulo, 'Nome novo');
check('refazer devolve o passo ao passado', refez.passado.length, 1);
check('e esvazia o futuro', refez.futuro.length, 0);
check('avisa que refez', refez.aviso, 'Refeito · Alteração em "Nome novo"');

// Ida e volta tem de fechar o ciclo: é o que garante que ninguém fica preso num dos lados.
check(
  'ciclo desfazer→refazer volta ao ponto de partida',
  refez.instantaneo,
  depois,
);

console.log('\n--- as bordas: pilha vazia não faz nada ---');

const nada = desfazer([], [], depois);
check('desfazer sem passado devolve null', nada.instantaneo, null);
check('e não inventa aviso', nada.aviso, null);
check('nem mexe nas pilhas', [nada.passado.length, nada.futuro.length], [0, 0]);

const nadaAdiante = refazer([], [], depois);
check('refazer sem futuro devolve null', nadaAdiante.instantaneo, null);
check('e não inventa aviso', nadaAdiante.aviso, null);

console.log('\n--- os atalhos ---');

const tecla = (over) => ({ key: 'z', ctrlKey: false, metaKey: false, shiftKey: false, ...over });

check('Ctrl+Z desfaz', ehAtalhoDesfazer(tecla({ ctrlKey: true })), true);
check('Cmd+Z desfaz (Mac)', ehAtalhoDesfazer(tecla({ metaKey: true })), true);
check('Z sozinho não desfaz', ehAtalhoDesfazer(tecla()), false);
check('Ctrl+Shift+Z NÃO é desfazer', ehAtalhoDesfazer(tecla({ ctrlKey: true, shiftKey: true })), false);
check('maiúscula também vale', ehAtalhoDesfazer(tecla({ key: 'Z', ctrlKey: true })), true);

check('Ctrl+Shift+Z refaz', ehAtalhoRefazer(tecla({ ctrlKey: true, shiftKey: true })), true);
check('Ctrl+Y refaz (convenção do Windows)', ehAtalhoRefazer(tecla({ key: 'y', ctrlKey: true })), true);
check('Ctrl+Z não refaz', ehAtalhoRefazer(tecla({ ctrlKey: true })), false);
check('Ctrl+Shift+Y não é atalho de nada', ehAtalhoRefazer(tecla({ key: 'y', ctrlKey: true, shiftKey: true })), false);

console.log('\n--- a guarda do campo de texto ---');

check('input é campo de texto', ehCampoDeTexto({ tagName: 'INPUT' }), true);
check('textarea é campo de texto', ehCampoDeTexto({ tagName: 'TEXTAREA' }), true);
check('select conta como campo', ehCampoDeTexto({ tagName: 'SELECT' }), true);
check('contenteditable conta', ehCampoDeTexto({ tagName: 'DIV', isContentEditable: true }), true);
check('div comum não conta', ehCampoDeTexto({ tagName: 'DIV' }), false);
check('body não conta', ehCampoDeTexto({ tagName: 'BODY' }), false);
// Sem foco em nada, `document.activeElement` pode vir nulo — e o atalho tem de continuar valendo.
check('nada focado não bloqueia', ehCampoDeTexto(null), false);

console.log(`\n${falhas === 0 ? 'OK' : 'FALHA'}: ${falhas} falha(s)`);
process.exit(falhas === 0 ? 0 : 1);
