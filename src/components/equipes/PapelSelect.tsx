import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Clock, Crown, Users } from 'lucide-react';
import { PapelEquipe } from '../../types';
import { Floating } from '../ui/Floating';

export const PAPEL_STYLE: Record<PapelEquipe, { chip: string; label: string; icon: typeof Crown }> = {
  responsavel: { chip: 'bg-amber-50 text-amber-700 ring-amber-200', label: 'Responsável', icon: Crown },
  membro: { chip: 'bg-slate-100 text-slate-600 ring-slate-200', label: 'Membro', icon: Users },
};

const PAPEIS: PapelEquipe[] = ['responsavel', 'membro'];

interface PapelSelectProps {
  value: PapelEquipe;
  /** Prazo da responsabilidade temporária, quando houver. */
  prazo?: string;
  /** `temporario` só vem marcado quando o papel escolhido é responsável com prazo. */
  onChange: (papel: PapelEquipe, temporario?: boolean) => void;
}

/** Etiqueta preenchida do papel na equipe — mesmo padrão da etiqueta de status. */
export function PapelSelect({ value, prazo, onChange }: PapelSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const style = PAPEL_STYLE[value];
  const Icon = style.icon;

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (!botaoRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function handleEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  return (
    <>
      <motion.button
        ref={botaoRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        whileTap={{ scale: 0.97 }}
        className={`flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold ring-1 transition-colors duration-300 hover:brightness-[0.97] ${style.chip}`}
      >
        <Icon className="size-3 shrink-0" />
        <span className="truncate">{style.label}</span>
        {prazo && value === 'responsavel' && (
          <span className="flex items-center gap-0.5 text-[10px] font-normal opacity-80">
            <Clock className="size-2.5" />
            {new Date(prazo).toLocaleDateString('pt-BR')}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <Floating anchorRef={botaoRef} width={200} height={150}>
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
            >
              {PAPEIS.map((papel) => {
                const opcao = PAPEL_STYLE[papel];
                const OpcaoIcon = opcao.icon;
                return (
                  <motion.button
                    key={papel}
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      onChange(papel);
                      setIsOpen(false);
                    }}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-2 text-[11px] font-semibold ring-1 ${opcao.chip}`}
                  >
                    <OpcaoIcon className="size-3 shrink-0" />
                    <span className="flex-1 text-left">{opcao.label}</span>
                    {papel === value && !prazo && <Check className="size-3 shrink-0" />}
                  </motion.button>
                );
              })}

              {/* Cobre a ausência planejada: responde pela equipe e volta a membro sozinho. */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  onChange('responsavel', true);
                  setIsOpen(false);
                }}
                className="flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-2 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200"
              >
                <Clock className="size-3 shrink-0" />
                <span className="flex-1 text-left">Responsável temporário</span>
                {prazo && <Check className="size-3 shrink-0" />}
              </motion.button>
            </motion.div>
          </Floating>
        )}
      </AnimatePresence>
    </>
  );
}
