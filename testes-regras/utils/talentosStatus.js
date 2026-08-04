/**
 * Status canônicos do quadro "Contratos de Talentos".
 *
 * Esteira sequencial (10 passos) + 3 status de interrupção, conforme
 * `prd/02_quadro_talentos.md`.
 */
export const TALENTO_STATUSES = [
    'Criação',
    'Revisão Inicial',
    'Aprovação Inicial',
    'Chancela',
    'Revisão Conecta',
    'Via CGA',
    'Aprovação Conecta',
    'Requisição Enviada',
    'Em Assinatura',
    'Concluído',
    'Parado',
    'Cancelado',
    'Vencido',
];
/**
 * Classes completas por status — o JIT do Tailwind só reconhece literais,
 * por isso nada de interpolar cor no meio da classe.
 *
 * `solid` é a etiqueta preenchida da grade; `dot` a bolinha dos filtros.
 */
export const STATUS_STYLE = {
    'Criação': { solid: 'bg-slate-500', dot: 'bg-slate-500' },
    'Revisão Inicial': { solid: 'bg-sky-500', dot: 'bg-sky-500' },
    'Aprovação Inicial': { solid: 'bg-indigo-500', dot: 'bg-indigo-500' },
    'Chancela': { solid: 'bg-violet-500', dot: 'bg-violet-500' },
    'Revisão Conecta': { solid: 'bg-blue-500', dot: 'bg-blue-500' },
    'Via CGA': { solid: 'bg-cyan-600', dot: 'bg-cyan-600' },
    'Aprovação Conecta': { solid: 'bg-teal-500', dot: 'bg-teal-500' },
    'Requisição Enviada': { solid: 'bg-amber-500', dot: 'bg-amber-500' },
    'Em Assinatura': { solid: 'bg-orange-500', dot: 'bg-orange-500' },
    'Concluído': { solid: 'bg-emerald-500', dot: 'bg-emerald-500' },
    'Parado': { solid: 'bg-yellow-500', dot: 'bg-yellow-500' },
    'Cancelado': { solid: 'bg-rose-500', dot: 'bg-rose-500' },
    'Vencido': { solid: 'bg-red-600', dot: 'bg-red-600' },
};
