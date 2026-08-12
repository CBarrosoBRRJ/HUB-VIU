/** Regras puras das equipes — sem UI e sem estado. */
/**
 * Coloca a pessoa na equipe com o papel indicado.
 *
 * Idempotente: se já for membro, só troca o papel — nunca duplica a entrada.
 * `responsavelAte` define uma responsabilidade **temporária**; sem ele, é permanente.
 */
export function definirMembro(equipe, usuarioId, papel, responsavelAte) {
    const jaExiste = equipe.membros.some((membro) => membro.usuarioId === usuarioId);
    const entrada = {
        usuarioId,
        papel,
        // Prazo só faz sentido em responsável; voltar a membro sempre limpa a marca.
        ...(papel === 'responsavel' && responsavelAte ? { responsavelAte } : {}),
    };
    const membros = jaExiste
        ? equipe.membros.map((membro) => (membro.usuarioId === usuarioId ? entrada : membro))
        : [...equipe.membros, entrada];
    return { ...equipe, membros };
}
/** A responsabilidade temporária ainda vale? */
export function responsabilidadeVigente(membro, agora = new Date()) {
    if (membro.papel !== 'responsavel')
        return false;
    if (!membro.responsavelAte)
        return true;
    return new Date(membro.responsavelAte).getTime() > agora.getTime();
}
export function removerMembro(equipe, usuarioId) {
    return { ...equipe, membros: equipe.membros.filter((membro) => membro.usuarioId !== usuarioId) };
}
/** Papel **efetivo**: responsabilidade temporária vencida já vale como `membro`. */
export function getPapelNaEquipe(equipe, usuarioId, agora = new Date()) {
    const membro = equipe.membros.find((item) => item.usuarioId === usuarioId);
    if (!membro)
        return null;
    if (membro.papel === 'responsavel' && !responsabilidadeVigente(membro, agora))
        return 'membro';
    return membro.papel;
}
/** Entrada bruta na equipe — inclui o prazo, quando houver. */
export function getMembro(equipe, usuarioId) {
    return equipe.membros.find((membro) => membro.usuarioId === usuarioId);
}
/** Concede ou revoga o acesso da equipe a uma página do Workspace. */
export function alternarPagina(equipe, pagina) {
    const temAcesso = equipe.paginasPermitidas.includes(pagina);
    return {
        ...equipe,
        paginasPermitidas: temAcesso
            ? equipe.paginasPermitidas.filter((id) => id !== pagina)
            : [...equipe.paginasPermitidas, pagina],
    };
}
export function contarPorPapel(equipe, agora = new Date()) {
    return equipe.membros.reduce((acc, membro) => {
        // Conta pelo papel efetivo: um prazo vencido não infla o número de responsáveis.
        if (getPapelNaEquipe(equipe, membro.usuarioId, agora) === 'responsavel')
            acc.responsaveis += 1;
        else
            acc.membros += 1;
        return acc;
    }, { responsaveis: 0, membros: 0 });
}
/** Equipes das quais a pessoa participa, em qualquer papel. */
export function equipesDoUsuario(equipes, usuarioId) {
    return equipes.filter((equipe) => equipe.membros.some((membro) => membro.usuarioId === usuarioId));
}
/** Equipes que operam um quadro — as que têm aquele quadro liberado. */
export function equipesDoQuadro(equipes, pagina) {
    return equipes.filter((equipe) => equipe.paginasPermitidas.includes(pagina));
}
/**
 * Quem pode ser nomeado num registro daquele quadro.
 *
 * Nomear alguém de fora das equipes que operam o quadro criaria um responsável sem acesso ao
 * próprio registro — por isso a lista de candidatos sai daqui, e não da base inteira.
 */
export function usuariosDoQuadro(equipes, pagina) {
    const ids = new Set();
    for (const equipe of equipesDoQuadro(equipes, pagina)) {
        for (const membro of equipe.membros)
            ids.add(membro.usuarioId);
    }
    return [...ids];
}
/** União das páginas liberadas pelas equipes da pessoa — acesso é cumulativo. */
export function paginasDoUsuario(equipes, usuarioId) {
    const paginas = new Set();
    for (const equipe of equipesDoUsuario(equipes, usuarioId)) {
        for (const pagina of equipe.paginasPermitidas)
            paginas.add(pagina);
    }
    return [...paginas];
}
/**
 * Descarta vínculos que apontam para pessoas que não existem mais — 12/08/2026.
 *
 * ## O que a operação viu
 *
 * *"Mesmo sem equipe, aparece 1."* O card da equipe anunciava "2 pessoas · 1 responsável · 1
 * membro" e a tabela logo abaixo mostrava **zero** — porque o contador lê `membros.length` e a
 * tabela junta com a base de usuários, onde aqueles ids já não estavam.
 *
 * Um contador que discorda da lista que ele conta é pior que um número errado: quem administra
 * passa a não saber em qual dos dois acreditar, e o acesso é justamente o assunto em que a dúvida
 * custa caro.
 *
 * ## Por que é reparo de leitura, e não migração
 *
 * Excluir alguém já limpa os vínculos no mesmo gesto — isso funciona e tem teste. O que não se
 * corrige sozinho é o que **já está gravado** no navegador de quem usou uma versão anterior. A
 * persistência versiona por **formato** e descarta tudo na virada: não há migração pontual, e
 * derrubar a versão inteira por causa de um vínculo apagaria os dados de todo mundo.
 *
 * Mesma família do `semIdsRepetidos` ([09 §3](../../prd/09_fundacoes_tecnicas.md)) e do
 * `sanearCargos`: **a garantia vale sempre, venha o dado de onde vier** — nenhum vínculo órfão
 * entra na aplicação, e é a última linha antes de qualquer contagem.
 *
 * Devolve a **mesma lista por identidade** quando não há nada a corrigir, o que permite chamá-la
 * na leitura sem criar referência nova a cada render.
 */
export function semVinculosOrfaos(equipes, usuarios) {
    const existem = new Set(usuarios.map((usuario) => usuario.id));
    const orfao = (equipe) => equipe.membros.some((m) => !existem.has(m.usuarioId));
    if (!equipes.some(orfao))
        return equipes;
    return equipes.map((equipe) => orfao(equipe)
        ? { ...equipe, membros: equipe.membros.filter((m) => existem.has(m.usuarioId)) }
        : equipe);
}
