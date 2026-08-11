import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Crown, ShieldCheck, User } from 'lucide-react';
import { PerfilSistema } from '../../types';
import { PERFIL_DESCRICAO, PERFIL_LABEL } from '../../utils/permissoes';
import { Floating } from '../ui/Floating';

/**
 * Etiquetas suaves: fundo tênue, texto forte, anel discreto.
 *
 * Atributo de pessoa não é dado primário da tela — preenchido e saturado, competia por
 * atenção com o conteúdo e deixava a grade com cara de arco-íris.
 */
export const PERFIL_STYLE: Record<PerfilSistema, { chip: string; icon: typeof Crown }> = {
  admin: { chip: 'bg-violet-50 text-violet-700 ring-violet-200', icon: ShieldCheck },
  responsavel: { chip: 'bg-amber-50 text-amber-700 ring-amber-200', icon: Crown },
  membro: { chip: 'bg-slate-100 text-slate-600 ring-slate-200', icon: User },
};

const PERFIS: PerfilSistema[] = ['admin', 'responsavel', 'membro'];

interface PerfilSelectProps {
  value: PerfilSistema;
  /** Sem `onChange` a etiqueta fica só de leitura — é o caso de quem não é admin. */
  onChange?: (perfil: PerfilSistema) => void;
  /**
   * Perfis que quem está mexendo pode atribuir.
   *
   * Oferecer uma opção proibida e recusá-la depois é pior que não oferecer: parece que
   * funcionou.
   */
  disponiveis?: PerfilSistema[];
}

export function PerfilSelect({ value, onChange, disponiveis = PERFIS }: PerfilSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const style = PERFIL_STYLE[value];
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
        disabled={!onChange}
        onClick={() => setIsOpen((open) => !open)}
        whileTap={onChange ? { scale: 0.97 } : undefined}
        title={PERFIL_DESCRICAO[value]}
        className={`flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold ring-1 transition-colors duration-300 ${style.chip} ${
          onChange ? 'hover:brightness-[0.97]' : 'cursor-default'
        }`}
      >
        <Icon className="size-3 shrink-0" />
        <span className="truncate">{PERFIL_LABEL[value]}</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && onChange && (
          <Floating anchorRef={botaoRef} width={264} height={210}>
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
            >
              {disponiveis.map((perfil) => {
                const opcao = PERFIL_STYLE[perfil];
                const OpcaoIcon = opcao.icon;
                return (
                  <motion.button
                    key={perfil}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onChange(perfil);
                      setIsOpen(false);
                    }}
                    className="rounded-lg p-2 text-left transition hover:bg-slate-50"
                  >
                    <span
                      className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-apoio font-semibold ring-1 ${opcao.chip}`}
                    >
                      <OpcaoIcon className="size-3 shrink-0" />
                      <span className="flex-1">{PERFIL_LABEL[perfil]}</span>
                      {perfil === value && <Check className="size-3 shrink-0" />}
                    </span>
                    <span className="mt-1 block text-rotulo leading-snug text-slate-500">
                      {PERFIL_DESCRICAO[perfil]}
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
