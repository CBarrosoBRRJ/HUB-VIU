import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'motion/react';
import { Check } from 'lucide-react';
import { STATUS_STYLE, TALENTO_STATUSES, TalentoStatus } from '../../utils/talentosStatus';
import { Floating } from '../ui/Floating';

interface StatusSelectProps {
  value: TalentoStatus;
  onChange: (status: TalentoStatus) => void;
}

/** Etiqueta preenchida que ocupa a célula e abre a paleta de status ao clicar. */
export function StatusSelect({ value, onChange }: StatusSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  /** Incrementa a cada troca — serve de chave para reiniciar a onda. */
  const [pulso, setPulso] = useState(0);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const controls = useAnimationControls();
  const montadoRef = useRef(false);

  // Só anima quando o status muda de fato, nunca na primeira renderização.
  useEffect(() => {
    if (!montadoRef.current) {
      montadoRef.current = true;
      return;
    }
    setPulso((atual) => atual + 1);
    controls.start({
      scale: [1, 1.12, 0.98, 1],
      transition: { duration: 0.42, ease: 'easeOut' },
    });
  }, [value, controls]);

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
        animate={controls}
        onClick={() => setIsOpen((open) => !open)}
        className={`relative flex w-full items-center justify-center rounded-md px-2 py-2 text-xs font-semibold text-white transition-colors duration-300 hover:brightness-110 ${STATUS_STYLE[value].solid}`}
      >
        {/* Onda que se expande para fora da etiqueta na troca. */}
        <AnimatePresence>
          {pulso > 0 && (
            <motion.span
              key={pulso}
              initial={{ opacity: 0.75, scale: 1 }}
              animate={{ opacity: 0, scale: 1.35 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-current"
            />
          )}
        </AnimatePresence>

        {/* Clarão que atravessa a etiqueta. */}
        <AnimatePresence>
          {pulso > 0 && (
            <motion.span
              key={`brilho-${pulso}`}
              initial={{ opacity: 0.55 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-0 rounded-md bg-white"
            />
          )}
        </AnimatePresence>

        <motion.span
          key={value}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative truncate"
        >
          {value}
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <Floating anchorRef={botaoRef} width={260} height={300}>
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
            >
              <div className="grid grid-cols-2 gap-1.5">
                {TALENTO_STATUSES.map((status) => (
                  <motion.button
                    key={status}
                    type="button"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      onChange(status);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-center gap-1 rounded-md px-2 py-2 text-apoio font-semibold text-white ${STATUS_STYLE[status].solid}`}
                  >
                    <span className="truncate">{status}</span>
                    {status === value && <Check className="size-3 shrink-0" />}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </Floating>
        )}
      </AnimatePresence>
    </>
  );
}
