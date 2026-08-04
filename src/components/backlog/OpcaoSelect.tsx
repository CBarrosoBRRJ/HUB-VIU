import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown } from 'lucide-react';
import { Floating } from '../ui/Floating';

interface Opcao {
  id: string;
  label: string;
}

interface OpcaoSelectProps<T extends string> {
  /** Vazio é "por definir". */
  valor: T | undefined;
  opcoes: readonly { id: T; label: string }[];
  /** Cabeçalho do painel — diz qual campo está sendo trocado. */
  titulo: string;
  /**
   * Segunda linha da dica — de onde o valor vem, quando não é da própria linha.
   *
   * As classificações do projeto dispensam: a coluna já diz. Origem do talento sai da ficha e vale
   * para todos os projetos dele — alcance que ninguém adivinha olhando a célula.
   */
  dicaSub?: string;
  onChange?: (valor: T) => void;
}

/**
 * Seletor de lista fechada — Input, Origem, Tipo do projeto.
 *
 * Etiqueta neutra, sem cor própria: são classificações, não estados. Colorir todas competiria com
 * o status e a prioridade, que **precisam** saltar aos olhos.
 */
export function OpcaoSelect<T extends string>({
  valor, opcoes, titulo, dicaSub, onChange,
}: OpcaoSelectProps<T>) {
  const [aberto, setAberto] = useState(false);
  const botaoRef = useRef<HTMLButtonElement>(null);
  /*
    Sem classificação: rótulo neutro, em cinza.

    É diferente de escolher um valor — e a diferença precisa aparecer, senão o quadro afirma o que
    ninguém disse. Ver a nota em `Oportunidade.tipoProjeto`.
  */
  const atual = opcoes.find((opcao) => opcao.id === valor);

  useEffect(() => {
    if (!aberto) return;
    function handleClickOutside(evento: MouseEvent) {
      if (!botaoRef.current?.contains(evento.target as Node)) setAberto(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [aberto]);

  if (!onChange) {
    return (
      <span className="flex items-center justify-center rounded-md bg-slate-50 px-2 py-1.5 text-[11px] text-slate-600 ring-1 ring-slate-200">
        <span className="truncate">{atual?.label ?? '—'}</span>
      </span>
    );
  }

  return (
    <>
      <motion.button
        ref={botaoRef}
        type="button"
        onClick={() => setAberto((estado) => !estado)}
        whileTap={{ scale: 0.97 }}
        // A dica traz o valor inteiro: é ele que some quando a etiqueta corta.
        aria-label={`Trocar ${titulo.toLowerCase()}`}
        data-dica={atual?.label ?? 'A definir'}
        data-dica-sub={dicaSub ?? `Trocar ${titulo.toLowerCase()}`}
        /* A origem do valor não repete nada da tela — por isso vale mesmo cabendo. */
        {...(dicaSub ? { 'data-dica-sempre': '' } : {})}
        className="flex w-full items-center justify-center gap-1 rounded-md bg-white px-2 py-1.5 text-[11px] text-slate-600 ring-1 ring-slate-200 transition hover:ring-indigo-300"
      >
        <span className="truncate">{atual?.label ?? '—'}</span>
        <ChevronDown className="size-3 shrink-0 text-slate-400" />
      </motion.button>

      <AnimatePresence>
        {aberto && (
          <Floating anchorRef={botaoRef} width={200} height={220}>
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
            >
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {titulo}
              </p>
              {opcoes.map((opcao: Opcao) => (
                <button
                  key={opcao.id}
                  type="button"
                  onClick={() => {
                    onChange(opcao.id as T);
                    setAberto(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition hover:bg-slate-50"
                >
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-700">{opcao.label}</span>
                  {opcao.id === valor && <Check className="size-3.5 shrink-0 text-emerald-600" />}
                </button>
              ))}
            </motion.div>
          </Floating>
        )}
      </AnimatePresence>
    </>
  );
}
