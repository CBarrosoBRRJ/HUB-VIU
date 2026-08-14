import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Paginado } from '../../utils/paginar';

/**
 * Os controles de página de uma grade — 14/08/2026.
 *
 * Só existem quando há mais de uma página: numa lista que cabe, paginação é ruído. O formato
 * "1–20 de 54" diz posição e tamanho numa leitura; as setas são o único gesto.
 *
 * Genérico de propósito: nasceu no Backlog, mas Contratos e Talentos têm a mesma conversa — e a
 * decisão de levá-lo até lá é da operação, quadro a quadro.
 */
export function ControlesDePagina<T>({
  resultado, onPagina,
}: {
  resultado: Paginado<T>;
  onPagina: (pagina: number) => void;
}) {
  if (resultado.totalPaginas <= 1) return null;

  return (
    <div className="flex items-center gap-1 text-apoio text-slate-600">
      <button
        type="button"
        onClick={() => onPagina(resultado.pagina - 1)}
        disabled={resultado.pagina === 1}
        aria-label="Página anterior"
        className="rounded-md p-1 transition-colors enabled:hover:bg-slate-200 disabled:cursor-not-allowed disabled:text-slate-300"
      >
        <ChevronLeft className="size-3.5" />
      </button>

      <span className="whitespace-nowrap tabular-nums">
        <strong className="font-semibold text-slate-700">{resultado.de}–{resultado.ate}</strong>
        {' '}de {resultado.total}
      </span>

      <button
        type="button"
        onClick={() => onPagina(resultado.pagina + 1)}
        disabled={resultado.pagina === resultado.totalPaginas}
        aria-label="Próxima página"
        className="rounded-md p-1 transition-colors enabled:hover:bg-slate-200 disabled:cursor-not-allowed disabled:text-slate-300"
      >
        <ChevronRight className="size-3.5" />
      </button>
    </div>
  );
}
