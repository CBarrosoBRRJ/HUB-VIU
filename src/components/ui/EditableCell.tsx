import { useEffect, useRef, useState } from 'react';

interface EditableCellProps {
  value: string;
  onCommit: (valor: string) => void;
  type?: 'text' | 'date';
  align?: 'left' | 'center';
  placeholder?: string;
  /** Formatação exibida fora do modo de edição. */
  display?: (valor: string) => string;
  /** Força a edição — usado pelo botão de editar da linha. */
  editing?: boolean;
  /**
   * Quantas linhas o texto pode ocupar fora do modo de edição.
   *
   * `1` corta com reticências, que é o certo para colunas estreitas de dado auxiliar. Acima disso
   * o texto quebra — usado na **coluna-chave**, onde ler o valor inteiro é o ponto da coluna.
   */
  linhas?: 1 | 2 | 3;
  /**
   * Edita em **área de texto**, e não numa linha só.
   *
   * Para o campo que guarda texto corrido — um briefing, uma descrição. Num `<input>` o conteúdo
   * corre para o lado indefinidamente: quem digita um pedido de três frases vê o começo sumir pela
   * esquerda e perde a noção do que já escreveu.
   *
   * Muda também o teclado: **Enter quebra linha**, e a confirmação passa a ser sair do campo ou
   * `Ctrl`/`⌘`+Enter. Manter Enter como "confirmar" tornaria impossível escrever um parágrafo —
   * exatamente o que a área de texto existe para permitir.
   */
  multilinha?: boolean;
  onEditingEnd?: () => void;
  className?: string;
}

/**
 * Célula no estilo planilha: clique entra em edição, Enter/Tab e a saída do foco
 * confirmam, Esc descarta. Sem botão de salvar por célula.
 */
export function EditableCell({
  value, onCommit, type = 'text', align = 'center', placeholder, display, editing = false,
  onEditingEnd, linhas = 1, multilinha = false, className = '',
}: EditableCellProps) {
  const [editandoLocal, setEditandoLocal] = useState(false);
  const [rascunho, setRascunho] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const isEditing = editing || editandoLocal;

  useEffect(() => {
    if (isEditing) {
      setRascunho(value);
      // Seleciona o conteúdo para que digitar substitua, como numa planilha.
      /*
        `focus()` **antes** de `select()`.

        Clicar na célula funciona porque o clique já dá o foco. Mas quando a edição é aberta por
        código — a linha recém-criada, o botão de editar — não há clique: sem `focus()`, o cursor
        fica no `body`, e digitar não vai para lugar nenhum. Era preciso clicar de novo.
      */
      window.requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isEditing, value]);

  function sair() {
    setEditandoLocal(false);
    onEditingEnd?.();
  }

  function confirmar() {
    if (rascunho !== value) onCommit(rascunho);
    sair();
  }

  const alignClass = align === 'left' ? 'text-left' : 'text-center';
  const caixa = `w-full rounded-md bg-white px-2 py-1 text-xs text-slate-700 outline-none ring-2 ring-indigo-400 ${alignClass} ${className}`;

  if (isEditing && multilinha) {
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={rascunho}
        onChange={(e) => setRascunho(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          /*
            Enter quebra linha; `Ctrl`/`⌘`+Enter confirma.

            É o inverso do campo de uma linha, e tem de ser: um briefing tem parágrafos, e um
            Enter que fecha a edição no meio da segunda frase torna o campo inútil para o que ele
            existe. Sair do campo também confirma, como em toda célula do quadro.
          */
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) confirmar();
          if (e.key === 'Escape') {
            setRascunho(value);
            sair();
          }
        }}
        placeholder={placeholder}
        // Cresce até `linhas` e passa a rolar: a linha da tabela não pode esticar sem limite.
        rows={linhas}
        className={`${caixa} resize-y leading-snug`}
      />
    );
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type}
        value={rascunho}
        onChange={(e) => setRascunho(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') confirmar();
          if (e.key === 'Escape') {
            setRascunho(value);
            sair();
          }
        }}
        placeholder={placeholder}
        className={caixa}
      />
    );
  }

  const texto = display ? display(value) : value;
  // Classes literais: o JIT do Tailwind não gera `line-clamp-${n}` montado por interpolação.
  const quebra = linhas === 1 ? 'truncate' : linhas === 2 ? 'line-clamp-2' : 'line-clamp-3';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setEditandoLocal(true)}
      onFocus={() => setEditandoLocal(true)}
      // A dica devolve o texto inteiro quando ele não coube — é o que a pessoa foi buscar.
      data-dica={texto || placeholder || '—'}
      data-dica-sub="Clique para editar"
      className={`cursor-text rounded-md px-2 py-1 text-xs transition hover:bg-white hover:ring-1 hover:ring-slate-200 ${quebra} ${alignClass} ${
        // Preserva as quebras que a pessoa digitou; sem isto o parágrafo vira uma linha corrida.
        multilinha ? 'whitespace-pre-line break-words leading-snug' : ''
      } ${texto ? 'text-slate-700' : 'text-slate-300'} ${className}`}
    >
      {texto || placeholder || '—'}
    </div>
  );
}
