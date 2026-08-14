export function paginar(itens, paginaPedida, porPagina) {
    const total = itens.length;
    const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
    const pagina = Math.min(Math.max(1, Math.floor(paginaPedida) || 1), totalPaginas);
    const inicio = (pagina - 1) * porPagina;
    const fatia = itens.slice(inicio, inicio + porPagina);
    return {
        itens: fatia,
        pagina,
        totalPaginas,
        de: total === 0 ? 0 : inicio + 1,
        ate: inicio + fatia.length,
        total,
    };
}
