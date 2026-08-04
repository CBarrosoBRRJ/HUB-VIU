/**
 * Saída de pessoas: da equipe e da plataforma.
 *
 * O princípio é um só: **acesso se corta, histórico não se apaga**. Quem foi responsável por um
 * contrato continua registrado nele mesmo depois de sair da equipe ou da empresa — senão o
 * quadro perde a resposta para "quem cuidava disso?".
 */
import { equipesDoUsuario, getPapelNaEquipe } from './equipes.js';
export function analisarSaidaDaEquipe(usuarioId, equipeSaindoId, equipes, contratos) {
    const restantes = equipesDoUsuario(equipes, usuarioId)
        .filter((equipe) => equipe.id !== equipeSaindoId)
        .map((equipe) => equipe.nome);
    return {
        registrosNomeados: contarRegistros(usuarioId, contratos),
        ficaSemEquipe: restantes.length === 0,
        equipesRestantes: restantes,
    };
}
export function contarRegistros(usuarioId, contratos) {
    return contratos.filter((contrato) => contrato.responsaveisIds.includes(usuarioId) || contrato.parceirosIds.includes(usuarioId)).length;
}
/**
 * Texto da confirmação de saída.
 *
 * Diz o que **permanece** e o que **se perde**: sem isso, quem opera supõe que remover da
 * equipe apaga a pessoa dos contratos — e evita fazer a limpeza que deveria fazer.
 */
export function mensagemSaida(nome, equipeNome, analise) {
    const linhas = [`Remover ${nome} da equipe ${equipeNome}?`, ''];
    if (analise.registrosNomeados > 0) {
        const plural = analise.registrosNomeados === 1 ? 'registro' : 'registros';
        linhas.push(`A pessoa continua nomeada em ${analise.registrosNomeados} ${plural} do quadro — o histórico é preservado.`, 
        // Consequência de acesso, não só de histórico: a nomeação é uma porta de entrada por si só.
        `Por isso ela seguirá enxergando e editando esses ${plural}, mesmo fora da equipe.`);
    }
    if (analise.ficaSemEquipe) {
        linhas.push(analise.registrosNomeados > 0
            ? 'Ela ficará sem nenhuma equipe. Para cortar o acesso por completo, inative ou desligue a conta.'
            : 'Ela ficará sem nenhuma equipe e, portanto, sem acesso a quadro algum.');
    }
    else {
        linhas.push(`Ela continua em: ${analise.equipesRestantes.join(', ')}.`);
    }
    return linhas.join('\n');
}
/** Situações de saída oferecidas quando a pessoa fica sem equipe. */
export const MOTIVOS_SAIDA = [
    {
        situacao: 'inativo',
        label: 'Inativar',
        descricao: 'Saiu da equipe e não deve acessar por ora. Reversível.',
    },
    {
        situacao: 'desligado',
        label: 'Desligar',
        descricao: 'Deixou a empresa. Sai de todas as equipes e perde o acesso.',
    },
];
/** Alguém sem equipe e ainda ativo é um acesso órfão — vale sinalizar na interface. */
export function acessoOrfao(usuarioId, situacao, equipes) {
    if (situacao !== 'ativo' && situacao !== 'ferias' && situacao !== 'afastado')
        return false;
    return !equipes.some((equipe) => getPapelNaEquipe(equipe, usuarioId) !== null);
}
