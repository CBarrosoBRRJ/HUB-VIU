/**
 * Convites de entrada.
 *
 * O convite é o que autoriza um e-mail a existir na plataforma. Com SSO, ele não carrega
 * credencial nenhuma — só diz *quem* pode entrar, *em qual equipe* e *com que papel*.
 */
import { normalizarEmail } from './identidade.js';
/** Janela de validade do link, em horas. */
export const VALIDADE_HORAS = 24;
const MS_POR_HORA = 3_600_000;
/**
 * Segredo do link.
 *
 * `crypto.randomUUID` é criptograficamente seguro — um token previsível transformaria o
 * convite numa porta aberta para qualquer um que adivinhasse a sequência.
 */
export function gerarToken() {
    return crypto.randomUUID().replace(/-/g, '');
}
export function criarConvite(dados, agora = new Date()) {
    return {
        ...dados,
        email: normalizarEmail(dados.email),
        token: gerarToken(),
        criadoEm: agora.toISOString(),
        expiraEm: new Date(agora.getTime() + VALIDADE_HORAS * MS_POR_HORA).toISOString(),
    };
}
/** Ordem de precedência: revogado > aceito > expirado. */
export function statusConvite(convite, agora = new Date()) {
    if (convite.revogadoEm)
        return 'revogado';
    if (convite.aceitoEm)
        return 'aceito';
    if (new Date(convite.expiraEm).getTime() <= agora.getTime())
        return 'expirado';
    return 'pendente';
}
/**
 * Um convite só é aceitável uma vez, dentro do prazo, e **pelo e-mail convidado**.
 *
 * A checagem de e-mail é o que impede repassar o link: quem receber por engano autentica
 * com outra identidade e é barrado.
 */
export function validarAceite(convite, emailAutenticado, agora = new Date()) {
    if (!convite)
        return 'inexistente';
    const status = statusConvite(convite, agora);
    if (status === 'aceito')
        return 'aceito';
    if (status === 'revogado')
        return 'revogado';
    if (status === 'expirado')
        return 'expirado';
    if (normalizarEmail(emailAutenticado) !== convite.email)
        return 'outro_email';
    return null;
}
export function mensagemErroAceite(erro) {
    switch (erro) {
        case 'inexistente':
            return 'Este link de convite não existe.';
        case 'aceito':
            return 'Este convite já foi utilizado. Peça um novo a quem te convidou.';
        case 'revogado':
            return 'Este convite foi cancelado por quem o enviou.';
        case 'expirado':
            return `Este convite expirou (validade de ${VALIDADE_HORAS} horas). Peça um novo.`;
        case 'outro_email':
            return 'Este convite foi emitido para outro e-mail. Entre com a conta convidada.';
    }
}
/** Tempo restante em horas, arredondado para cima. Zero quando já venceu. */
export function horasRestantes(convite, agora = new Date()) {
    const restante = new Date(convite.expiraEm).getTime() - agora.getTime();
    return restante <= 0 ? 0 : Math.ceil(restante / MS_POR_HORA);
}
/** Endereço que a pessoa recebe. Rota por hash porque o app não tem servidor de rotas. */
export function linkDoConvite(convite, origem = window.location.origin) {
    return `${origem}/#/convite/${convite.token}`;
}
/** Convite pendente para este e-mail — evita emitir dois para a mesma pessoa na mesma equipe. */
export function convitePendenteExistente(convites, email, equipeId, agora = new Date()) {
    const alvo = normalizarEmail(email);
    return convites.find((convite) => convite.email === alvo &&
        convite.equipeId === equipeId &&
        statusConvite(convite, agora) === 'pendente');
}
