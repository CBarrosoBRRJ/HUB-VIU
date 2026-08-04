/**
 * Identidade das pessoas.
 *
 * O e-mail é a **chave de negócio**: uma pessoa, uma conta. Com SSO corporativo, é também
 * o que o provedor devolve na autenticação — por isso toda comparação passa por
 * `normalizarEmail`, e nunca por igualdade crua de string.
 */
export const DOMINIOS_PADRAO = ['g.globo', 'globo.com', 'viu.com.br'];
export function normalizarEmail(email) {
    return email.trim().toLowerCase();
}
export function getDominio(email) {
    const partes = normalizarEmail(email).split('@');
    return partes.length === 2 ? partes[1] : '';
}
export function emailValido(email) {
    // Verificação estrutural apenas: quem valida a existência é o provedor de SSO.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizarEmail(email));
}
export function dominioPermitido(email, dominios) {
    const dominio = getDominio(email);
    return dominios.some((permitido) => normalizarEmail(permitido) === dominio);
}
/** Já existe alguém com esse e-mail? `ignorarId` serve para a própria pessoa ao editar. */
export function emailEmUso(email, usuarios, ignorarId) {
    const alvo = normalizarEmail(email);
    return usuarios.some((usuario) => usuario.id !== ignorarId && normalizarEmail(usuario.email) === alvo);
}
export function encontrarPorEmail(email, usuarios) {
    const alvo = normalizarEmail(email);
    return usuarios.find((usuario) => normalizarEmail(usuario.email) === alvo);
}
/**
 * Validação única de e-mail, usada no cadastro manual e no convite.
 *
 * Retorna `null` quando está tudo certo — manter num só lugar evita que as duas portas de
 * entrada divirjam e criem conta duplicada por um caminho.
 */
export function validarEmail(email, { usuarios, dominios, ignorarId }) {
    if (!emailValido(email))
        return 'formato';
    if (!dominioPermitido(email, dominios))
        return 'dominio';
    if (emailEmUso(email, usuarios, ignorarId))
        return 'duplicado';
    return null;
}
export function mensagemErroIdentidade(erro, dominios) {
    switch (erro) {
        case 'formato':
            return 'E-mail inválido.';
        case 'dominio':
            return `Domínio não autorizado. Permitidos: ${dominios.map((d) => `@${d}`).join(', ')}.`;
        case 'duplicado':
            return 'Já existe uma conta com esse e-mail.';
    }
}
