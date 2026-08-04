import { useEffect, useRef, useState } from 'react';

interface CelulaNumeroProps {
  /** `undefined` é "não definido" — diferente de `0`, que é uma resposta. */
  valor?: number;
  onCommit: (valor: number | undefined) => void;
  /** Sem isto, a célula só mostra. */
  editavel?: boolean;
  /** Nome do que se conta, para a dica e o leitor de tela. Ex.: "reels". */
  rotulo: string;
}

/**
 * Célula de quantidade inteira.
 *
 * ## Por que não é a `EditableCell`
 *
 * Aquela guarda texto, e texto aceita "três", "3 ou 4" e "a combinar". Numa contagem isso é ruído:
 * a coluna existe para somar e comparar, e um "3 ou 4" no meio quebra as duas coisas.
 *
 * Aqui só entra dígito — o campo recusa o resto na digitação, em vez de aceitar e reclamar depois.
 *
 * ## Vazio não é zero
 *
 * `undefined` é "ninguém disse quantos"; `0` é "este projeto não tem nenhum". A tela mostra `—` no
 * primeiro e `0` no segundo, porque quem monta o pacote precisa saber se falta preencher ou se a
 * resposta já é essa.
 *
 * ## Por que o valor fica à direita
 *
 * Números se comparam pela última casa. Alinhados à direita, `3` e `12` empilham a unidade sob a
 * unidade; centralizados, a coluna vira um zigue-zague que obriga a ler cada linha.
 */
export function CelulaNumero({ valor, onCommit, editavel = false, rotulo }: CelulaNumeroProps) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editando) return;
    setRascunho(valor === undefined ? '' : String(valor));
    // O `focus` antes do `select`: sem ele o cursor fica no `body` e digitar não chega ao campo.
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [editando]);

  function confirmar() {
    const limpo = rascunho.trim();
    // Campo esvaziado volta a "não definido" — apagar é um gesto legítimo, não um zero.
    onCommit(limpo === '' ? undefined : Number(limpo));
    setEditando(false);
  }

  if (editando) {
    return (
      <input
        ref={inputRef}
        // `inputMode` traz o teclado numérico no celular sem recusar colar de outra fonte.
        inputMode="numeric"
        value={rascunho}
        aria-label={`Quantidade de ${rotulo}`}
        onChange={(evento) => setRascunho(evento.target.value.replace(/\D/g, ''))}
        onBlur={confirmar}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter' || evento.key === 'Tab') confirmar();
          if (evento.key === 'Escape') setEditando(false);
        }}
        className="w-full rounded-md border border-indigo-300 bg-white px-1.5 py-1 text-right text-xs text-slate-800 outline-none ring-2 ring-indigo-100"
      />
    );
  }

  const conteudo = valor === undefined ? '—' : String(valor);
  const estilo = valor === undefined ? 'text-slate-300' : 'text-slate-700';

  if (!editavel) {
    return <span className={`block px-1.5 text-right text-xs ${estilo}`}>{conteudo}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => setEditando(true)}
      aria-label={`Quantidade de ${rotulo}`}
      data-dica={valor === undefined ? `${rotulo}: não definido` : `${valor} ${rotulo}`}
      data-dica-sub="Clique para editar"
      data-dica-sempre
      className={`w-full rounded-md px-1.5 py-1 text-right text-xs transition hover:bg-white hover:ring-1 hover:ring-slate-200 ${estilo}`}
    >
      {conteudo}
    </button>
  );
}
