import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CircleAlert, CornerDownLeft, Plus } from 'lucide-react';
import { semelhantes, sugestoes } from '../../utils/referencias';
import { Floating } from './Floating';

interface CelulaReferenciaProps {
  value: string;
  onCommit: (valor: string) => void;
  /** Valores já usados nesta coluna, ou vindos da tabela referenciada. */
  opcoes: string[];
  placeholder?: string;
  align?: 'left' | 'center';
  className?: string;
  /** O que a coluna referencia, para o texto do alerta: "talento", "cidade"… */
  entidade?: string;
  /**
   * Força a edição — mesma interface da `EditableCell`.
   *
   * Usado pela linha recém-criada: ela nasce na lista com o cursor já na chave, e o valor
   * provisório selecionado. Sem isto, criar exigiria um segundo clique para começar a preencher.
   */
  editing?: boolean;
  onEditingEnd?: () => void;
}

/**
 * Célula que se apoia nos valores já existentes.
 *
 * Comporta-se como a `EditableCell` — clique edita, `Enter` confirma, `Esc` descarta — e
 * acrescenta duas camadas contra duplicata:
 *
 * 1. **Sugestões** enquanto se digita: escolher é mais rápido que escrever, e a maior parte das
 *    divergências morre aqui por conveniência.
 * 2. **Confirmação quando é parecido**: texto novo que está perto de algo existente pergunta
 *    antes de entrar. Nunca bloqueia — homônimos existem —, mas obriga a olhar.
 */
export function CelulaReferencia({
  value, onCommit, opcoes, placeholder, align = 'left', className = '', entidade = 'registro',
  editing = false, onEditingEnd,
}: CelulaReferenciaProps) {
  const [editandoLocal, setEditandoLocal] = useState(false);
  const editando = editing || editandoLocal;
  const [rascunho, setRascunho] = useState(value);
  /** Valor pendente de confirmação por semelhança. */
  const [duvida, setDuvida] = useState<{ valor: string; parecidos: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const campoRef = useRef<HTMLDivElement>(null);

  const lista = useMemo(() => sugestoes(rascunho, opcoes), [rascunho, opcoes]);

  useEffect(() => {
    if (editando) {
      setRascunho(value);
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
  }, [editando, value]);

  function sair() {
    setEditandoLocal(false);
    setDuvida(null);
    onEditingEnd?.();
  }

  function gravar(valor: string) {
    if (valor !== value) onCommit(valor);
    sair();
  }

  function confirmar(valorBruto?: string) {
    const valor = (valorBruto ?? rascunho).trim();
    if (valor === value.trim()) return sair();

    // Escolher da lista é decisão explícita — não passa pela checagem de semelhança.
    const escolhidoDaLista = opcoes.some((opcao) => opcao === valor);
    if (escolhidoDaLista || !valor) return gravar(valor);

    const parecidos = semelhantes(valor, opcoes);
    if (parecidos.length === 0) return gravar(valor);

    setDuvida({ valor, parecidos: parecidos.map((item) => item.valor) });
  }

  const alignClass = align === 'left' ? 'text-left' : 'text-center';

  if (!editando) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setEditandoLocal(true)}
        onFocus={() => setEditandoLocal(true)}
        title="Clique para editar"
        className={`cursor-text truncate rounded-md px-2 py-1 text-xs transition hover:bg-white hover:ring-1 hover:ring-slate-200 ${alignClass} ${
          value ? 'text-slate-700' : 'text-slate-300'
        } ${className}`}
      >
        {value || placeholder || '—'}
      </div>
    );
  }

  return (
    <div ref={campoRef} className="relative">
      <input
        ref={inputRef}
        value={rascunho}
        onChange={(evento) => {
          setRascunho(evento.target.value);
          setDuvida(null);
        }}
        // Sair do campo com uma dúvida aberta não pode gravar às cegas — a decisão é do painel.
        onBlur={() => !duvida && window.setTimeout(() => editando && confirmar(), 120)}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter') confirmar();
          if (evento.key === 'Escape') {
            setRascunho(value);
            sair();
          }
        }}
        placeholder={placeholder}
        className={`w-full rounded-md bg-white px-2 py-1 text-xs text-slate-700 outline-none ring-2 ring-indigo-400 ${alignClass} ${className}`}
      />

      <AnimatePresence>
        {/* Sugestões */}
        {!duvida && lista.length > 0 && (
          <Floating anchorRef={campoRef} width={260} height={200} align="start">
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl custom-scrollbar"
            >
              <p className="px-3 py-1 text-rotulo font-bold uppercase tracking-wider text-slate-500">
                Já cadastrados
              </p>
              {lista.map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  // `mousedown` chega antes do `blur` do input — com `click` o painel some antes.
                  onMouseDown={(evento) => {
                    evento.preventDefault();
                    gravar(opcao);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition hover:bg-indigo-50"
                >
                  <span className="min-w-0 flex-1 truncate">{opcao}</span>
                  <CornerDownLeft className="size-3 shrink-0 text-slate-300" />
                </button>
              ))}
            </motion.div>
          </Floating>
        )}

        {/* Confirmação de semelhança */}
        {duvida && (
          <Floating anchorRef={campoRef} width={296} height={220} align="start">
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.14 }}
              className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-xl"
            >
              <div className="flex items-start gap-2 border-b border-amber-100 bg-amber-50 px-3 py-2">
                <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                <p className="text-apoio leading-snug text-amber-800">
                  Já existe {entidade} parecido. Você quis dizer um destes?
                </p>
              </div>

              <div className="max-h-32 overflow-y-auto py-1 custom-scrollbar">
                {duvida.parecidos.map((opcao) => (
                  <button
                    key={opcao}
                    type="button"
                    onMouseDown={(evento) => {
                      evento.preventDefault();
                      gravar(opcao);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-slate-700 transition hover:bg-indigo-50"
                  >
                    <span className="min-w-0 flex-1 truncate">{opcao}</span>
                    <CornerDownLeft className="size-3 shrink-0 text-slate-300" />
                  </button>
                ))}
              </div>

              {/* A saída para o homônimo legítimo. Nunca travamos o cadastro. */}
              <button
                type="button"
                onMouseDown={(evento) => {
                  evento.preventDefault();
                  gravar(duvida.valor);
                }}
                className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left transition hover:bg-slate-50"
              >
                <Plus className="size-3.5 shrink-0 text-emerald-600" />
                <span className="min-w-0 flex-1 truncate text-xs text-slate-600">
                  Não — usar <strong className="font-semibold text-slate-800">{duvida.valor}</strong>
                </span>
              </button>
            </motion.div>
          </Floating>
        )}
      </AnimatePresence>
    </div>
  );
}
