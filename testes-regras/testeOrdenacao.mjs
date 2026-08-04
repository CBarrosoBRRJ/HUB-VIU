/**
 * Ordenação e seleção — os bugs que apareceram ao mexer no status de uma linha.
 *
 * Os três defeitos tinham o mesmo formato: a tela mostrava uma coisa e o estado dizia outra.
 */
import { compararPorCampo, DESFECHOS, ETAPAS_FLUXO, PRIORIDADES, STATUS_OPORTUNIDADE } from './utils/oportunidades.js';
import { TALENTO_STATUSES } from './utils/talentosStatus.js';

let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

const op = (id, over = {}) => ({
  id, titulo: `Projeto ${id}`, marca: '', talento: '', observacoes: '',
  status: 'entrada', statusDesde: '2026-08-01', entradaEm: '2026-08-01', prazoEm: '2026-08-08',
  prioridade: 'media', input: 'interno', origem: 'outros', tipoProjeto: 'outro',
  exclusivo: false, escopo: '', responsaveis: {}, entradaPor: 'manual', revisada: true,
  ...over,
});

const ordenar = (itens, campo, direcao = 'asc') => {
  const fator = direcao === 'asc' ? 1 : -1;
  return [...itens].sort((a, b) => fator * compararPorCampo(a, b, campo)).map((o) => o.id);
};

console.log('--- Prioridade segue a urgência, não o alfabeto ---');
/*
  O bug: `localeCompare` dava "alta, baixa, media". Quem clica em Prioridade quer as urgentes
  primeiro — e "Baixa" no meio da lista é exatamente o oposto do que a coluna promete.
*/
const porPrioridade = [op('a', { prioridade: 'baixa' }), op('b', { prioridade: 'alta' }), op('c', { prioridade: 'media' })];
check('crescente = mais urgente primeiro', ordenar(porPrioridade, 'prioridade'), ['b', 'c', 'a']);
check('decrescente inverte', ordenar(porPrioridade, 'prioridade', 'desc'), ['a', 'c', 'b']);
check('alfabético daria outra coisa',
  ['alta', 'baixa', 'media'].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  ['alta', 'baixa', 'media']);   // 'baixa' antes de 'media' — o erro que existia

console.log('\n--- Status segue o fluxo ---');
const porStatus = [
  op('a', { status: 'aguardando_feedback' }),
  op('b', { status: 'entrada' }),
  op('c', { status: 'revisao' }),
  op('d', { status: 'elaboracao' }),
];
check('a ordem é a do processo', ordenar(porStatus, 'status'), ['b', 'd', 'c', 'a']);

/*
  A escala vem do MAPA (`ETAPAS_FLUXO` + `DESFECHOS`), não de `STATUS_OPORTUNIDADE`.

  As duas listas divergem em Ajuste × Aguardando Feedback, e ordenar pela errada faria a coluna
  contradizer o mapa desenhado logo acima dela. Foi este teste que encontrou a divergência.
*/
check('a escala é a do mapa do processo',
  ETAPAS_FLUXO.map((e) => e.status),
  ['entrada', 'elaboracao', 'revisao', 'ajuste', 'aguardando_feedback']);
check('o catálogo tem OUTRA ordem — por isso não serve de escala',
  STATUS_OPORTUNIDADE.map((s) => s.id).slice(0, 5),
  ['entrada', 'elaboracao', 'revisao', 'aguardando_feedback', 'ajuste']);
// Se um status novo entrar no catálogo sem entrar no mapa, ele cairia no fim da ordenação sem
// que nada acusasse. Aqui acusa.
check('mapa e desfechos cobrem todos os status',
  [...ETAPAS_FLUXO.map((e) => e.status), ...DESFECHOS].sort(),
  STATUS_OPORTUNIDADE.map((s) => s.id).sort());

console.log('\n--- Ajuste e Aguardando Feedback na ordem do mapa ---');
const loop = [op('a', { status: 'aguardando_feedback' }), op('b', { status: 'ajuste' })];
check('Ajuste vem antes, como no mapa', ordenar(loop, 'status'), ['b', 'a']);

console.log('\n--- Campos sem ordem própria comparam como texto ---');
const porMarca = [op('a', { marca: 'Natura' }), op('b', { marca: 'Ambev' }), op('c', { marca: 'Ípsilon' })];
check('marca é alfabética', ordenar(porMarca, 'marca'), ['b', 'c', 'a']);
// Acentuação: 'Ípsilon' precisa cair entre Ambev e Natura, e não no fim.
check('respeita o alfabeto do pt-BR', ordenar([op('x', { marca: 'Zeta' }), op('y', { marca: 'Ácido' })], 'marca'), ['y', 'x']);

/*
  Booleano ordena com "sim" primeiro — quem responde à pergunta da coluna vem antes.

  A coluna era "Interveniência" e virou "Exclusivo" em 03/08/2026, **com o valor invertido**. A
  ordenação acompanhou: agora sobem os exclusivos, não os que têm terceiro no contrato.
*/
console.log('\n--- Exclusivo: "sim" primeiro ---');
const porExclusivo = [op('a', { exclusivo: false }), op('b', { exclusivo: true })];
check('o exclusivo da casa vem antes', ordenar(porExclusivo, 'exclusivo'), ['b', 'a']);

console.log('\n--- Valor fora da escala não vira o primeiro ---');
/*
  Sem tratamento, `indexOf` devolve -1 e o registro corrompido subiria ao topo da lista — o pior
  lugar para um dado que ninguém sabe ler.
*/
const comLixo = [op('a', { prioridade: 'media' }), op('b', { prioridade: 'inexistente' }), op('c', { prioridade: 'alta' })];
check('vai para o fim', ordenar(comLixo, 'prioridade'), ['c', 'a', 'b']);

console.log('\n--- Contratos: a esteira, não o dicionário ---');
const alfabetica = [...TALENTO_STATUSES].sort((a, b) => a.localeCompare(b, 'pt-BR'));
check('a ordem da esteira difere da alfabética', TALENTO_STATUSES[0] === alfabetica[0], false);
check('Criação é a primeira da esteira', TALENTO_STATUSES[0], 'Criação');
check('Concluído vem depois de Em Assinatura',
  TALENTO_STATUSES.indexOf('Concluído') > TALENTO_STATUSES.indexOf('Em Assinatura'), true);

console.log('\n--- Seleção é a interseção com o visível ---');
/*
  A regra que substituiu o `useEffect` de limpeza. Não depende de QUAL evento tirou a linha da
  lista — mudança de etapa, de status, de filtro ou exclusão de outra linha —, o que era a falha
  do modelo anterior: a lista de dependências nunca cobria todos.
*/
const selecaoEfetiva = (visiveis, marcados) =>
  visiveis.filter((o) => new Set(marcados).has(o.id)).map((o) => o.id);

check('some quando a linha sai da lista', selecaoEfetiva([op('a'), op('c')], ['a', 'b']), ['a']);
check('lista vazia zera a seleção', selecaoEfetiva([], ['a', 'b']), []);
check('nada marcado é nada selecionado', selecaoEfetiva([op('a')], []), []);
check('segue a ordem da tela, não a da marcação',
  selecaoEfetiva([op('x'), op('y'), op('z')], ['z', 'x']), ['x', 'z']);
// "Selecionar todas" compara com a seleção efetiva: 1 marcado invisível não marca o cabeçalho.
const visiveis = [op('a'), op('b')];
check('cabeçalho só marca com todas visíveis marcadas',
  selecaoEfetiva(visiveis, ['a', 'fantasma']).length === visiveis.length, false);
check('e marca quando são todas', selecaoEfetiva(visiveis, ['a', 'b']).length === visiveis.length, true);

console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`);
