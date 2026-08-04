import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check } from 'lucide-react';
import { TipoTalento } from '../../types';
import { getTipo, TIPOS } from '../../utils/talentos';
import { Floating } from '../ui/Floating';

interface TipoSelectProps {
  valor: TipoTalento;
  /** Ausente deixa a etiqueta em leitura. */
  onChange?: (tipo: TipoTalento) => void;
}

/** Etiqueta do vínculo comercial — exclusivo ou interveniência. */
export function TipoSelect({ valor, onChange }: TipoSelectProps) {
  const [aberto, setAberto] = useState(false);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const tipo = getTipo(valor);

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
      <span
        className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold ring-1 ${tipo.chip}`}
      >
        <span className={`size-1.5 rounded-full ${tipo.dot}`} />
        {tipo.label}
      </span>
    );
  }

  return (
    <>
      <motion.button
        ref={botaoRef}
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        whileTap={{ scale: 0.97 }}
        title="Trocar o vínculo comercial"
        className={`flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold ring-1 transition hover:brightness-95 ${tipo.chip}`}
      >
        <span className={`size-1.5 rounded-full ${tipo.dot}`} />
        <span className="truncate">{tipo.label}</span>
      </motion.button>

      <AnimatePresence>
        {aberto && (
          <Floating anchorRef={botaoRef} width={248} height={150}>
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
            >
              {TIPOS.map((opcao) => (
                <button
                  key={opcao.id}
                  type="button"
                  onClick={() => {
                    onChange(opcao.id);
                    setAberto(false);
                  }}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left transition hover:bg-slate-50"
                >
                  <span className={`mt-1 size-2 shrink-0 rounded-full ${opcao.dot}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-slate-700">{opcao.label}</span>
                    <span className="block text-[10px] leading-snug text-slate-400">
                      {opcao.descricao}
                    </span>
                  </span>
                  {opcao.id === valor && <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />}
                </button>
              ))}
            </motion.div>
          </Floating>
        )}
      </AnimatePresence>
    </>
  );
}
