/**
 * Navegação entre as páginas do app.
 *
 * A rota principal é **estado**, não URL: o produto tem uma tela por quadro, e uma biblioteca de
 * rotas resolveria mais casos do que existem. As telas que precisam de link — convite, entrada por
 * link, confirmação de e-mail — usam hash, porque chegam por e-mail e são coladas na barra de
 * endereço. Ver [PRD 09 §8](../../prd/09_fundacoes_tecnicas.md).
 */
/** Todas as páginas, na ordem em que a barra lateral as apresenta. */
export const PAGINAS_APP = [
    'backlog',
    'contratos',
    'talentos',
    'clientes',
    'equipes',
    'usuarios',
    'perfil',
];
export const PAGINA_PADRAO = 'contratos';
/* ------------------------------------------------------------------ *
 * Caminho por página — `/backlog`, `/talentos`
 *
 * A página principal deixou de ser só estado: cada quadro tem um caminho na barra de endereço,
 * que dá o que estado sozinho não dava — link compartilhável, favorito, botão de voltar.
 *
 * Os slugs são **curtos** de propósito ("/backlog", não "/backlogdeagenciamento"): quem digita ou
 * lê uma URL quer o apelido, e o nome completo já está no título da página. As rotas públicas de
 * convite continuam no hash (`#/convite/…`) — chegam por e-mail e não disputam com os caminhos.
 * ------------------------------------------------------------------ */
/** O slug de cada página. Mudar um slug quebra favoritos — trate como id, não como texto. */
export const CAMINHOS = {
    backlog: '/backlog',
    contratos: '/contratos',
    talentos: '/talentos',
    clientes: '/clientes',
    equipes: '/equipes',
    usuarios: '/usuarios',
    perfil: '/perfil',
};
/**
 * A página que um caminho nomeia, ou `null` para caminho desconhecido.
 *
 * Tolerante com o que a barra de endereço traz: caixa alta, barra no fim, barras repetidas.
 * `null` — e não a página padrão — porque quem chama decide o fallback: na carga inicial ele é a
 * página salva, não a padrão.
 */
export function paginaPorCaminho(pathname) {
    const limpo = `/${(pathname ?? '').toLowerCase().split('/').filter(Boolean).join('/')}`;
    const achada = Object.entries(CAMINHOS)
        .find(([, caminho]) => caminho === limpo);
    return achada ? achada[0] : null;
}
export function caminhoDaPagina(pagina) {
    return CAMINHOS[pagina];
}
/**
 * Converte um valor qualquer na página que ele representa, ou no padrão.
 *
 * Existe porque a página aberta é **restaurada do `localStorage`** ao recarregar, e o que está
 * gravado ali não é confiável: pode ter vindo de uma versão anterior do produto, de uma página que
 * deixou de existir, ou de edição manual. Sem validar, `PAGINAS[valor]` devolveria `undefined` e a
 * aplicação renderizaria uma tela em branco.
 *
 * A checagem é por **lista**, não por `valor in PAGINAS`: o operador `in` percorre a cadeia de
 * protótipos e aceitaria `'toString'`, `'constructor'` e outros herdados de `Object`.
 */
export function validarPagina(valor, padrao = PAGINA_PADRAO) {
    return typeof valor === 'string' && PAGINAS_APP.includes(valor)
        ? valor
        : padrao;
}
