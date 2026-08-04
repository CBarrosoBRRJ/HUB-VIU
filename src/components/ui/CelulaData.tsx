import { useEffect, useRef, useState } from 'react';
import { formatDate } from '../../utils/dates';

interface CelulaDataProps {
  /** `yyyy-mm-dd`. Vazio é "não agendado". */
  valor?: string;
  onCommit: (valor: string | undefined) => void;
  editavel?: boolean;
  /** O que a data marca, para a dica e o leitor de tela. */
  rotulo: string;
}

/**
 * Célula de data.
 *
 * ## Por que o campo nativo
 *
 * `<input type="date">` traz calendário, teclado de data no celular e validação de dia inexistente
 * sem uma linha de código. Um campo de texto com máscara aceitaria "31/02" e precisaria recusá-lo
 * depois — pior para quem digita e mais código para manter.
 *
 * ## Mostra em pt-BR, guarda em ISO
 *
 * A tela lê `31/12/2026`; o dado guarda `2026-12-31`. Guardar no formato de exibição faria a
 * ordenação virar alfabética — e `01/12` viria antes de `02/01`.
 *
 * ## Sem farol
 *
 * Ao contrário do Deadline, esta data não tem SLA correndo atrás. Deadline é prazo de triagem, e
 * atrasá-lo é problema; veiculação é agenda, e uma data futura é só uma data futura.
 */
export function CelulaData({ valor, onCommit, editavel = false, rotulo }: CelulaDataProps) {
  const [editando, setEditando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editando) return;
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [editando]);

  if (editando) {
    return (
      <input
        ref={inputRef}
        type="date"
        defaultValue={valor ?? ''}
        aria-label={rotulo}
        onBlur={(evento) => {
          onCommit(evento.target.value || undefined);
          setEditando(false);
        }}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter') evento.currentTarget.blur();
          if (evento.key === 'Escape') setEditando(false);
        }}
        className="w-full rounded-md border border-indigo-300 bg-white px-1.5 py-1 text-center text-xs text-slate-800 outline-none ring-2 ring-indigo-100"
      />
    );
  }

  const texto = valor ? formatDate(valor) : '—';
  const estilo = valor ? 'text-slate-700' : 'text-slate-300';

  if (!editavel) {
    return <span className={`block px-1.5 text-center text-xs ${estilo}`}>{texto}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => setEditando(true)}
      aria-label={rotulo}
      data-dica={valor ? formatDate(valor) : 'Não agendado'}
      data-dica-sub={`${rotulo} — clique para editar`}
      data-dica-sempre
      className={`w-full rounded-md px-1.5 py-1 text-center text-xs transition hover:bg-white hover:ring-1 hover:ring-slate-200 ${estilo}`}
    >
      {texto}
    </button>
  );
}
