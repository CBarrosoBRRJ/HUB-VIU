/**
 * Farol de vigência dos contratos — regras de `prd/02_quadro_talentos.md` §6.
 *
 * Verde: mais de 30 dias restantes · Amarelo: dentro da janela de alerta ·
 * Vermelho: prazo ultrapassado · Cinza: cancelado ou sem data de fim.
 */
export const VIGENCIA_ALERTA_DIAS = 30;
const MS_POR_DIA = 86_400_000;
export const VIGENCIA_TONE_STYLE = {
    verde: { text: 'text-emerald-700', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
    amarelo: { text: 'text-amber-700', bar: 'bg-amber-500', dot: 'bg-amber-500' },
    vermelho: { text: 'text-red-700', bar: 'bg-red-500', dot: 'bg-red-500' },
    cinza: { text: 'text-slate-500', bar: 'bg-slate-300', dot: 'bg-slate-300' },
};
/** Converte `yyyy-mm-dd` em Date local à meia-noite — evita erro de fuso na contagem de dias. */
function parseISO(iso) {
    if (!iso)
        return null;
    const [ano, mes, dia] = iso.split('-').map(Number);
    if (!ano || !mes || !dia)
        return null;
    return new Date(ano, mes - 1, dia);
}
function meiaNoite(data) {
    return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}
export function getVigenciaInfo(contract, referencia = new Date()) {
    const hoje = meiaNoite(referencia);
    const inicio = parseISO(contract.inicio);
    const fim = parseISO(contract.fim);
    if (contract.status === 'Cancelado') {
        return { tone: 'cinza', label: 'Cancelado', percentual: null, diasRestantes: null };
    }
    if (!fim) {
        return { tone: 'cinza', label: 'Sem vigência', percentual: null, diasRestantes: null };
    }
    const diasRestantes = Math.round((fim.getTime() - hoje.getTime()) / MS_POR_DIA);
    let percentual = null;
    if (inicio && fim.getTime() > inicio.getTime()) {
        const decorrido = (hoje.getTime() - inicio.getTime()) / (fim.getTime() - inicio.getTime());
        percentual = Math.round(Math.min(Math.max(decorrido, 0), 1) * 100);
    }
    if (diasRestantes < 0) {
        return { tone: 'vermelho', label: `Vencido há ${Math.abs(diasRestantes)}d`, percentual: 100, diasRestantes };
    }
    if (diasRestantes <= VIGENCIA_ALERTA_DIAS) {
        return { tone: 'amarelo', label: `Vence em ${diasRestantes}d`, percentual, diasRestantes };
    }
    return { tone: 'verde', label: `Vigente · ${diasRestantes}d`, percentual, diasRestantes };
}
/** Aba do farol correspondente a cada cor. */
const FILTRO_POR_TONE = {
    verde: 'vigentes',
    amarelo: 'a_vencer',
    vermelho: 'vencidos',
    cinza: null,
};
export function matchesFiltro(info, filtro) {
    if (filtro === 'todos')
        return true;
    return FILTRO_POR_TONE[info.tone] === filtro;
}
export function contarPorFarol(contracts, referencia = new Date()) {
    const counts = { todos: contracts.length, vigentes: 0, a_vencer: 0, vencidos: 0 };
    for (const contract of contracts) {
        const filtro = FILTRO_POR_TONE[getVigenciaInfo(contract, referencia).tone];
        if (filtro)
            counts[filtro] += 1;
    }
    return counts;
}
