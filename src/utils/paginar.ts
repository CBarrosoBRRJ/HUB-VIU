/**
 * Paginação de listas — 14/08/2026.
 *
 * ## Por que ela entrou, e por que só agora
 *
 * A paginação foi debatida e **recusada** dias antes, quando o problema era o acesso à barra
 * horizontal — ela não resolvia aquilo. Entrou quando o problema certo apareceu: *"poderíamos
 * pensar em algo como 15 a 20 projetos por página? Seria viável para o dia a dia?"* — com dezenas
 * de linhas, rolar uma lista sem fim deixa de ser varredura e vira caminhada.
 *
 * ## As regras que a acompanham
 *
 * - **ela é a última etapa do recorte**: etapa, filtros, busca e ordenação agem antes; a página é
 *   só uma janela sobre o resultado;
 * - **os totais não são paginados**: o rodapé fala do recorte inteiro, senão "Total no grupo"
 *   mentiria;
 * - **exportar ignora a página**: baixa o recorte inteiro — ninguém quer colar N planilhas;
 * - **a página pedida é um desejo, a devolvida é um fato**: pedir a página 9 de 3 devolve a 3,
 *   sem estado inválido e sem `setState` corretivo em cascata.
 */
export interface Paginado<T> {
  itens: T[];
  /** A página efetivamente exibida — o pedido, limitado ao que existe. */
  pagina: number;
  totalPaginas: number;
  /** Posições exibidas, no formato humano: `de`–`ate` de `total`. */
  de: number;
  ate: number;
  total: number;
}

export function paginar<T>(itens: T[], paginaPedida: number, porPagina: number): Paginado<T> {
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
