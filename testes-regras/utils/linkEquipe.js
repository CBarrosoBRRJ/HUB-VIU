/**
 * Link coletivo de entrada numa equipe.
 *
 * O convite nominal é seguro mas lento: um link por pessoa, um a um. Este resolve o caso real de
 * "manda no grupo da equipe" sem abrir a porta para qualquer um:
 *
 * | Limite | O que contém |
 * |--------|--------------|
 * | Domínio autorizado | Só entra quem tem e-mail da empresa |
 * | Prazo de 24h | Link vazado morre no dia seguinte |
 * | Rotação diária | O endereço muda todo dia; cópias antigas não servem |
 * | Sempre `membro` | Nunca concede responsabilidade |
 * | Desativação | Corta o acesso na hora, sem esperar o prazo |
 * | Registro de usos | Dá para auditar quem entrou por ali |
 */
import { gerarToken } from './convites.js';
export const VALIDADE_HORAS_LINK = 24;
const MS_POR_HORA = 3_600_000;
export function criarLinkEquipe(dados, agora = new Date()) {
    return {
        ...dados,
        token: gerarToken(),
        criadoEm: agora.toISOString(),
        expiraEm: new Date(agora.getTime() + VALIDADE_HORAS_LINK * MS_POR_HORA).toISOString(),
        usos: [],
    };
}
export function statusLink(link, agora = new Date()) {
    if (link.desativadoEm)
        return 'desativado';
    if (new Date(link.expiraEm).getTime() <= agora.getTime())
        return 'expirado';
    return 'ativo';
}
export function horasRestantesLink(link, agora = new Date()) {
    const restante = new Date(link.expiraEm).getTime() - agora.getTime();
    return restante <= 0 ? 0 : Math.ceil(restante / MS_POR_HORA);
}
/** Link vigente de uma equipe — o único que deve ser compartilhado. */
export function linkVigenteDaEquipe(links, equipeId, agora = new Date()) {
    return links.find((link) => link.equipeId === equipeId && statusLink(link, agora) === 'ativo');
}
export function validarEntrada(link, equipe, agora = new Date()) {
    if (!link)
        return 'inexistente';
    const status = statusLink(link, agora);
    if (status === 'desativado')
        return 'desativado';
    if (status === 'expirado')
        return 'expirado';
    // O link pode sobreviver à equipe que o originou.
    if (!equipe)
        return 'equipe_inexistente';
    return null;
}
export function mensagemErroEntrada(erro) {
    switch (erro) {
        case 'inexistente':
            return 'Este link de entrada não existe.';
        case 'expirado':
            return `O link expirou — ele vale ${VALIDADE_HORAS_LINK} horas e é renovado todo dia. Peça o link atual a quem administra a equipe.`;
        case 'desativado':
            return 'Este link foi desativado por quem administra a equipe.';
        case 'equipe_inexistente':
            return 'A equipe deste link não existe mais.';
    }
}
export function linkDeEntrada(link, origem = window.location.origin) {
    return `${origem}/#/entrar/${link.token}`;
}
/** Texto pronto para o chat da equipe — o uso real deste recurso. */
export function mensagemDeCompartilhamento(equipe, link, dominios) {
    return [
        `Entre na equipe ${equipe.nome} da plataforma VIU Agenciamento:`,
        linkDeEntrada(link),
        '',
        `Use seu e-mail corporativo (${dominios.map((d) => `@${d}`).join(', ')}).`,
        `O link vale ${VALIDADE_HORAS_LINK} horas.`,
    ].join('\n');
}
