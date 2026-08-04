import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, CircleCheck, Palmtree, PauseCircle, UserMinus, UserX } from 'lucide-react';
import { SituacaoUsuario } from '../../types';
import { SITUACAO_DESCRICAO, SITUACAO_LABEL } from '../../utils/permissoes';
import { Floating } from '../ui/Floating';

export const SITUACAO_STYLE: Record<
  SituacaoUsuario,
  { chip: string; dot: string; icon: typeof CircleCheck }
> = {
  ativo: { chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', icon: CircleCheck },
  ferias: { chip: 'bg-sky-50 text-sky-700 ring-sky-200', dot: 'bg-sky-500', icon: Palmtree },
  afastado: { chip: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500', icon: PauseCircle },
  inativo: { chip: 'bg-slate-100 text-slate-500 ring-slate-200', dot: 'bg-slate-400', icon: UserMinus },
  desligado: { chip: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500', icon: UserX },
};

const SITUACOES: SituacaoUsuario[] = ['ativo', 'ferias', 'afastado', 'inativo', 'desligado'];

interface SituacaoSelectProps {
  value: SituacaoUsuario;
  /** Situações que quem está mexendo tem alçada para aplicar. */
  disponiveis?: SituacaoUsuario[];
  onChange?: (situacao: SituacaoUsuario) => void;
}

export function SituacaoSelect({ value, disponiveis = SITUACOES, onChange }: SituacaoSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const style = SITUACAO_STYLE[value];
  const Icon = style.icon;
  const editavel = Boolean(onChange) && disponiveis.length > 0;

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (!botaoRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <>
      <motion.button
        ref={botaoRef}
        type="button"
        disabled={!editavel}
        onClick={() => setIsOpen((open) => !open)}
        whileTap={editavel ? { scale: 0.97 } : undefined}
        title={SITUACAO_DESCRICAO[value]}
        className={`flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold ring-1 transition-colors duration-300 ${style.chip} ${
          editavel ? 'hover:brightness-[0.97]' : 'cursor-default'
        }`}
      >
        <Icon className="size-3 shrink-0" />
        <span className="truncate">{SITUACAO_LABEL[value]}</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && editavel && onChange && (
          <Floating anchorRef={botaoRef} width={252} height={280}>
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
            >
              {disponiveis.map((situacao) => {
                const opcao = SITUACAO_STYLE[situacao];
                const OpcaoIcon = opcao.icon;
                return (
                  <motion.button
                    key={situacao}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onChange(situacao);
                      setIsOpen(false);
                    }}
                    className="rounded-lg p-1.5 text-left transition hover:bg-slate-50"
                  >
                    <span
                      className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold ring-1 ${opcao.chip}`}
                    >
                      <OpcaoIcon className="size-3 shrink-0" />
                      <span className="flex-1">{SITUACAO_LABEL[situacao]}</span>
                      {situacao === value && <Check className="size-3 shrink-0" />}
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-slate-500">
                      {SITUACAO_DESCRICAO[situacao]}
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          </Floating>
        )}
      </AnimatePresence>
    </>
  );
}
