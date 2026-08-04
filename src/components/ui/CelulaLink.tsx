import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Link2 } from 'lucide-react';

interface CelulaLinkProps {
  valor: string;
  onCommit: (valor: string) => void;
  editavel?: boolean;
  /** O que o link aponta, para a dica e o leitor de tela. Ex.: "proposta". */
  rotulo: string;
  placeholder?: string;
}

/**
 * Célula de endereço — mostra o destino, não a URL.
 *
 * ## Por que não é a `EditableCell`
 *
 * Uma URL de pasta compartilhada tem 120 caracteres e nenhum deles ajuda a decidir se é o link
 * certo. Numa coluna de 7% da tabela, o texto vira um borrão que só se lê passando o mouse.
 *
 * Aqui a célula mostra **"Abrir"** com ícone, e a dica traz o endereço inteiro para quem precisar
 * conferir antes de clicar — que é o gesto prudente quando o link leva para fora do sistema.
 *
 * ## Abre em nova aba, e por quê
 *
 * `target="_blank"` porque o quadro é o lugar de trabalho: quem abre uma proposta volta para a
 * linha. Navegar para fora obrigaria a refazer o caminho — aba, filtro, rolagem — a cada consulta.
 *
 * `rel="noreferrer"` porque o destino não precisa saber de onde veio, e `noopener` impede que a
 * página aberta manipule esta pelo `window.opener`.
 *
 * ## Cola sem cerimônia
 *
 * O campo aceita qualquer texto. Validar formato de URL recusaria caminhos de rede (`\\\\servidor\\...`)
 * e links internos que a operação usa — e o custo de um endereço errado é um clique que não abre,
 * não um dado corrompido.
 */
export function CelulaLink({
  valor, onCommit, editavel = false, rotulo, placeholder = 'Colar link',
}: CelulaLinkProps) {
  const [editando, setEditando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editando) return;
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [editando]);

  if (editando) {
    return (
      <input
        ref={inputRef}
        defaultValue={valor}
        placeholder={placeholder}
        aria-label={`Link da ${rotulo}`}
        onBlur={(evento) => {
          onCommit(evento.target.value.trim());
          setEditando(false);
        }}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter') evento.currentTarget.blur();
          if (evento.key === 'Escape') setEditando(false);
        }}
        className="w-full rounded-md border border-indigo-300 bg-white px-1.5 py-1 text-xs text-slate-800 outline-none ring-2 ring-indigo-100"
      />
    );
  }

  if (!valor) {
    // Vazio ainda é clicável quando se pode editar: é onde o link entra.
    const Marcador = editavel ? 'button' : 'span';
    return (
      <Marcador
        {...(editavel ? { type: 'button' as const, onClick: () => setEditando(true) } : {})}
        aria-label={editavel ? `Adicionar link da ${rotulo}` : undefined}
        data-dica={`Sem link da ${rotulo}`}
        data-dica-sub={editavel ? 'Clique para colar o endereço' : undefined}
        data-dica-sempre
        className="flex w-full items-center justify-center gap-1 rounded-md px-1.5 py-1 text-xs text-slate-300 transition hover:bg-white hover:ring-1 hover:ring-slate-200"
      >
        <Link2 className="size-3" />
        —
      </Marcador>
    );
  }

  return (
    <span className="flex items-center justify-center gap-1">
      <a
        href={valor}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Abrir link da ${rotulo}`}
        /* O endereço inteiro na dica: conferir antes de clicar é prudente num link externo. */
        data-dica={valor}
        data-dica-sub={`Link da ${rotulo} — abre em nova aba`}
        data-dica-sempre
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50"
      >
        <ExternalLink className="size-3" />
        Abrir
      </a>
      {editavel && (
        <button
          type="button"
          onClick={() => setEditando(true)}
          aria-label={`Trocar link da ${rotulo}`}
          data-dica="Trocar link"
          data-dica-sempre
          className="rounded p-0.5 text-slate-300 transition hover:text-slate-600"
        >
          <Link2 className="size-3" />
        </button>
      )}
    </span>
  );
}
