/**
 * Coloca a pessoa no papel indicado — ou a tira da linha, com `null`.
 *
 * A pessoa é sempre removida de ambas as listas antes de ser reinserida, então
 * migrar de parceiro para responsável (e vice-versa) é a mesma operação e nunca
 * deixa alguém duplicado nos dois papéis.
 */
export function definirPapel(pessoas, usuarioId, papel) {
    const responsaveisIds = pessoas.responsaveisIds.filter((id) => id !== usuarioId);
    const parceirosIds = pessoas.parceirosIds.filter((id) => id !== usuarioId);
    if (papel === 'responsavel')
        responsaveisIds.push(usuarioId);
    if (papel === 'parceiro')
        parceirosIds.push(usuarioId);
    return { responsaveisIds, parceirosIds };
}
export function getPapel(pessoas, usuarioId) {
    if (pessoas.responsaveisIds.includes(usuarioId))
        return 'responsavel';
    if (pessoas.parceirosIds.includes(usuarioId))
        return 'parceiro';
    return null;
}
/** Alterna o papel: clicar no papel que a pessoa já tem a remove da linha. */
export function alternarPapel(pessoas, usuarioId, papel) {
    const atual = getPapel(pessoas, usuarioId);
    return definirPapel(pessoas, usuarioId, atual === papel ? null : papel);
}
