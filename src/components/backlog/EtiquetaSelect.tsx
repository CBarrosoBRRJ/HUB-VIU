import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check } from 'lucide-react';
import { Floating } from '../ui/Floating';

/** Uma opção de etiqueta: cor de fundo (`chip`) e cor do ponto (`dot`). */
export interface OpcaoEtiqueta<T extends string> {
  id: T;
  label: string;
  chip: string;
  dot: string;
}

interface EtiquetaSelectProps<T extends string> {
  /** Ausente é "por definir" — diferente de qualquer valor da lista. */
  valor?: T;
  opcoes: readonly OpcaoEtiqueta<T>[];
  /** Cabeçalho do painel e nome no tooltip. */
  titulo: string;
  /** O que mostrar quando não há valor. "Definir" na maioria dos casos. */
  vazio?: string;
  onChange?: (valor: T) => void;
}

/**
 * Etiqueta colorida de lista fechada — prioridade, impacto.
 *
 * ## Por que é diferente do `OpcaoSelect`
 *
 * Aquele é neutro: classificações que descrevem, sem hierarquia entre os valores. Este é para
 * escalas — alta/média/baixa —, onde a cor **é** a informação: quem varre a coluna lê o vermelho
 * antes de ler a palavra.
 *
 * ## As cores vêm da opção, não daqui
 *
 * Cada catálogo escolhe sua escala. Prioridade usa a quente (urgência), impacto usa a fria
 * (tamanho) — se as duas usassem a mesma, conviver no mesmo quadro faria uma parecer a outra.
 */
export function EtiquetaSelect<T extends string>({
  valor, opcoes, titulo, vazio = 'Definir', onChange,
}: EtiquetaSelectProps<T>) {
  const [aberto, setAberto] = useState(false);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const atual = opcoes.find((opcao) => opcao.id === valor);

  useEffect(() => {
    if (!aberto) return;
    function handleClickOutside(evento: MouseEvent) {
      if (!botaoRef.current?.contains(evento.target as Node)) setAberto(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [aberto]);

  /*
    Sem classificação: rótulo neutro, em cinza.

    É diferente de escolher um valor — e a diferença precisa aparecer, senão o quadro afirma o que
    ninguém disse. Ver a nota em `Oportunidade.tipoProjeto`.
  */
  const conteudo = (
    <>
      <span className={`size-1.5 shrink-0 rounded-full ${atual?.dot ?? 'bg-slate-200'}`} />
      <span className="truncate">{atual?.label ?? vazio}</span>
    </>
  );
  const estilo = atual?.chip ?? 'bg-white text-slate-400 ring-slate-200';

  if (!onChange) {
    return (
      <span
        className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1 text-apoio font-semibold ring-1 ${estilo}`}
        data-dica={atual?.label ?? vazio}
      >
        {conteudo}
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
        aria-label={`Trocar ${titulo.toLowerCase()}`}
        data-dica={atual?.label ?? vazio}
        data-dica-sub={`Trocar ${titulo.toLowerCase()}`}
        className={`flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1 text-apoio font-semibold ring-1 transition hover:brightness-95 ${estilo}`}
      >
        {conteudo}
      </motion.button>

      <AnimatePresence>
        {aberto && (
          <Floating anchorRef={botaoRef} width={180} height={40 * opcoes.length + 20}>
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
            >
              {opcoes.map((opcao) => (
                <button
                  key={opcao.id}
                  type="button"
                  onClick={() => {
                    onChange(opcao.id);
                    setAberto(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition hover:bg-slate-50"
                >
                  <span className={`size-2 shrink-0 rounded-full ${opcao.dot}`} />
                  <span className="min-w-0 flex-1 text-xs text-slate-700">{opcao.label}</span>
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
