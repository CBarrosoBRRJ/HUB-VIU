/**
 * Navegação — a página aberta sobrevive ao F5.
 *
 * O bug: `useState<AppPage>('contratos')` fixo. Recarregar devolvia todo mundo para Contratos,
 * independentemente de onde a pessoa estivesse. O resto do estado já era preservado; a tela era
 * a única coisa que o F5 ainda descartava.
 */
import {
  CAMINHOS, caminhoDaPagina, paginaPorCaminho, PAGINA_PADRAO, PAGINAS_APP, validarPagina,
} from './utils/navegacao.js';

let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

console.log('--- Toda página válida volta como ela mesma ---');
for (const pagina of PAGINAS_APP) {
  check(`${pagina} sobrevive`, validarPagina(pagina), pagina);
}
check('as sete páginas estão no catálogo', PAGINAS_APP.length, 7);
check('Cadastro de Clientes está entre elas', PAGINAS_APP.includes('clientes'), true);
check('sem repetição', new Set(PAGINAS_APP).size, PAGINAS_APP.length);
check('o padrão é uma delas', PAGINAS_APP.includes(PAGINA_PADRAO), true);

console.log('\n--- O que está gravado não é confiável ---');
/*
  O `localStorage` guarda o que a versão anterior escreveu, e aceita edição manual. Um valor que
  não é página faria `PAGINAS[valor]` devolver `undefined` — e a aplicação abriria em branco.
*/
check('página que não existe mais', validarPagina('orcamentos'), PAGINA_PADRAO);
check('string vazia', validarPagina(''), PAGINA_PADRAO);
check('nulo', validarPagina(null), PAGINA_PADRAO);
check('indefinido', validarPagina(undefined), PAGINA_PADRAO);
check('número', validarPagina(3), PAGINA_PADRAO);
check('objeto', validarPagina({ pagina: 'backlog' }), PAGINA_PADRAO);
check('lista', validarPagina(['backlog']), PAGINA_PADRAO);

console.log('\n--- Herdados de Object não são páginas ---');
/*
  A checagem é por lista, não por `valor in PAGINAS`: o operador `in` percorre a cadeia de
  protótipos, e `'toString' in {}` é `true`. Com ele, um `localStorage` adulterado para
  "constructor" passaria pela validação e quebraria o render.
*/
for (const herdado of ['toString', 'constructor', 'valueOf', 'hasOwnProperty', '__proto__']) {
  check(`${herdado} não passa`, validarPagina(herdado), PAGINA_PADRAO);
}

console.log('\n--- Padrão personalizado ---');
// Usado para "cair na primeira permitida" sem repetir a constante em outro lugar.
check('respeita o padrão informado', validarPagina('xpto', 'backlog'), 'backlog');
check('mas o valor válido ainda vence', validarPagina('usuarios', 'backlog'), 'usuarios');

console.log('\n--- A ordem é a da barra lateral ---');
// Ela decide qual é "a primeira permitida" quando a pessoa perde acesso à página aberta.
check('operação antes de administração',
  PAGINAS_APP.indexOf('backlog') < PAGINAS_APP.indexOf('equipes'), true);
check('perfil é o último', PAGINAS_APP[PAGINAS_APP.length - 1], 'perfil');

/* ------------------------------------------------------------------ *
 * Caminho por pagina - /backlog, /talentos
 *
 * A URL manda na carga; o salvo desempata. Slug e id: mudar um quebra favoritos.
 * ------------------------------------------------------------------ */
console.log('\n--- Caminhos ---');
check('toda pagina tem caminho', PAGINAS_APP.every((p) => Boolean(CAMINHOS[p])), true);
check('nenhum caminho repetido', new Set(Object.values(CAMINHOS)).size, PAGINAS_APP.length);
check('todo caminho comeca com barra e e minusculo',
  Object.values(CAMINHOS).every((c) => /^\/[a-z]+$/.test(c)), true);
// Ida e volta: o caminho de uma pagina resolve de volta para ela.
check('ida e volta fecha', PAGINAS_APP.every((p) => paginaPorCaminho(caminhoDaPagina(p)) === p), true);
// Tolerancia com o que a barra de endereco traz.
check('caixa alta resolve', paginaPorCaminho('/BACKLOG'), 'backlog');
check('barra no fim resolve', paginaPorCaminho('/talentos/'), 'talentos');
check('barras repetidas resolvem', paginaPorCaminho('//equipes'), 'equipes');
// Desconhecido e null - quem chama decide o fallback (pagina salva, nao a padrao).
check('caminho desconhecido e null', paginaPorCaminho('/naoexiste'), null);
check('raiz e null', paginaPorCaminho('/'), null);
check('vazio e null', paginaPorCaminho(''), null);

console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`);
