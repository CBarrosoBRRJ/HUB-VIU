/** Converte `yyyy-mm-dd` em `dd/mm/aaaa` sem passar por Date (evita deslocamento de fuso). */
export function formatDate(iso: string): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-');
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

/**
 * Converte `yyyy-mm-dd` em `dd/mm` — para linhas apertadas em que o ano é ruído.
 *
 * Nasceu com as datas das pendências (11/08/2026): "05/08 → 08/08" diz o percurso da espera; com
 * ano, a mesma linha vira "05/08/2026 → 08/08/2026" e ninguém lê os números que importam. O ano
 * completo continua disponível na dica, via `formatDate`.
 */
export function formatDiaMes(iso: string): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-');
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}`;
}

/** Data de hoje em `yyyy-mm-dd`, no fuso local. */
export function todayISO(): string {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${hoje.getFullYear()}-${mes}-${dia}`;
}

/** `dd/mm/aaaa` a partir de um ISO completo (com hora). */
export function formatDataCurta(isoCompleto: string): string {
  const data = new Date(isoCompleto);
  if (isNaN(data.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR').format(data);
}

/** `dd/mm/aaaa às HH:mm` — usado nos tooltips de auditoria. */
export function formatDataHora(isoCompleto: string): string {
  const data = new Date(isoCompleto);
  if (isNaN(data.getTime())) return '—';
  const formatada = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data);
  return formatada.replace(', ', ' às ');
}
