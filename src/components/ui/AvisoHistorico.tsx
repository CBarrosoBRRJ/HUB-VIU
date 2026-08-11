import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Redo2, Undo2 } from 'lucide-react';
import { useDados } from '../../context/DadosProvider';

/** Quanto tempo o aviso fica na tela. O bastante para ler sete palavras, e nada além. */
const DURACAO_MS = 3200;

/**
 * O aviso do desfazer — a única prova de que o `Ctrl+Z` funcionou.
 *
 * ## Por que precisa existir
 *
 * Desfazer é invisível quando dá certo: a linha volta ao que era, e quem apertou a tecla não sabe
 * se o sistema entendeu, se desfez a coisa certa, ou se desfez duas. Pior no caso comum — o valor
 * anterior de uma célula costuma ser **vazio**, então a tela depois do desfazer é idêntica à tela
 * de quem não fez nada.
 *
 * O aviso responde as três perguntas de uma vez: aconteceu, foi isto, e dá para voltar.
 *
 * ## Por que no rodapé, e não no lugar da ação
 *
 * A alteração pode ter sido numa linha que saiu da vista — desfazer um valor de filtro devolve a
 * linha a um grupo que está fora da tela. Um aviso ancorado na linha ficaria escondido justamente
 * quando é mais necessário. No rodapé ele está sempre no mesmo lugar, e não cobre a grade.
 */
export function AvisoHistorico() {
  const { avisoHistorico, podeRefazer, refazerAlteracao } = useDados();
  const [visivel, setVisivel] = useState(false);

  /*
    O `id` do aviso é a dependência, não o texto.

    Desfazer dois passos iguais produz a mesma frase, e reagir ao texto deixaria o segundo aviso
    sem reabrir — pareceria que a segunda tecla não pegou.
  */
  useEffect(() => {
    if (!avisoHistorico) return;
    setVisivel(true);
    const relogio = window.setTimeout(() => setVisivel(false), DURACAO_MS);
    return () => window.clearTimeout(relogio);
  }, [avisoHistorico?.id, avisoHistorico]);

  const desfeito = avisoHistorico?.texto.startsWith('Desfeito') ?? false;

  return createPortal(
    <AnimatePresence>
      {visivel && avisoHistorico && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
        >
          <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-slate-900/90 py-2 pr-2 pl-4 text-white shadow-2xl backdrop-blur-sm">
            {desfeito ? (
              <Undo2 className="size-4 shrink-0 text-slate-300" />
            ) : (
              <Redo2 className="size-4 shrink-0 text-slate-300" />
            )}
            <p className="text-sm whitespace-nowrap">{avisoHistorico.texto}</p>

            {/*
              O botão existe para quem desfez demais — e é também como o atalho de refazer se
              apresenta: ninguém descobre `Ctrl+Shift+Z` sozinho.
            */}
            {desfeito && podeRefazer && (
              <button
                type="button"
                onClick={() => refazerAlteracao()}
                className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/20"
              >
                Refazer
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
