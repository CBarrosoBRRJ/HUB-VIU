import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';

/**
 * Tooltip do sistema — **um só para a aplicação inteira**.
 *
 * ## Por que global, e não um por célula
 *
 * A grade tem ~12 colunas × 50 linhas. Um componente de tooltip por célula seriam 600 instâncias
 * com estado e listeners próprios, para exibir **um** balão por vez. Aqui há um listener no
 * documento e um portal: o custo por célula é um atributo `data-dica` no HTML.
 *
 * ## Por que substitui o `title` nativo
 *
 * O `title` do navegador demora ~1s para aparecer, some sozinho, não quebra linha e não aceita
 * estilo. Numa grade onde o valor está cortado, ele é justamente o mecanismo que devolveria o
 * dado — e o faz mal.
 *
 * ## Como usar
 *
 * ```tsx
 * <span data-dica="Sob Demanda" data-dica-sub="Natureza do projeto">Sob Deman…</span>
 * ```
 *
 * `data-dica` é o **dado**; `data-dica-sub`, a explicação. Quando o texto está cortado, é o dado
 * que a pessoa foi buscar — por isso ele vem primeiro e em destaque.
 *
 * ## Só aparece quando o texto não coube
 *
 * Repetir num balão o que já se lê é ruído: a pessoa espera e recebe de volta o que já sabia. A
 * dica mede o elemento antes de abrir e desiste se tudo estiver visível.
 *
 * `data-dica-sempre` desliga essa checagem, para as dicas que **não** repetem a tela — o
 * significado de uma coluna, o motivo de uma célula estar travada. Essas valem cabendo ou não.
 */

/**
 * O conteúdo transborda a caixa?
 *
 * Percorre o elemento e seus filhos porque o texto costuma estar num `<span>` interno com
 * `truncate` ou `line-clamp` — é ele quem corta, não o container que carrega o atributo.
 *
 * A tolerância de 1px absorve o arredondamento de subpixel: sem ela, um texto que cabe
 * exatamente dispararia a dica em telas com escala fracionária.
 */
function textoCortado(elemento: HTMLElement): boolean {
  const candidatos: HTMLElement[] = [elemento, ...Array.from(elemento.querySelectorAll('*'))]
    .filter((no): no is HTMLElement => no instanceof HTMLElement);

  return candidatos.some(
    (no) => no.scrollWidth > no.clientWidth + 1 || no.scrollHeight > no.clientHeight + 1,
  );
}

const ATRASO_ABRIR = 380;
const ATRASO_FECHAR = 80;

interface Conteudo {
  texto: string;
  sub?: string;
  /** Retângulo do elemento que originou a dica, em coordenadas de viewport. */
  origem: DOMRect;
}

export function Dica() {
  const [conteudo, setConteudo] = useState<Conteudo | null>(null);
  const timerRef = useRef<number | null>(null);
  const balaoRef = useRef<HTMLDivElement>(null);
  const [posicao, setPosicao] = useState({ left: 0, top: 0, acima: false });

  useEffect(() => {
    function limpar() {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    }

    function aoEntrar(evento: MouseEvent) {
      const alvo = (evento.target as HTMLElement | null)?.closest?.('[data-dica]');
      if (!(alvo instanceof HTMLElement)) return;

      const texto = alvo.dataset.dica?.trim();
      if (!texto) return;

      // O que não repete a tela vale sempre; o resto, só quando não coube.
      const sempre = alvo.dataset.dicaSempre !== undefined;
      if (!sempre && !textoCortado(alvo)) return;

      limpar();
      timerRef.current = window.setTimeout(() => {
        setConteudo({
          texto,
          sub: alvo.dataset.dicaSub?.trim() || undefined,
          origem: alvo.getBoundingClientRect(),
        });
      }, ATRASO_ABRIR);
    }

    function aoSair(evento: MouseEvent) {
      const alvo = (evento.target as HTMLElement | null)?.closest?.('[data-dica]');
      if (!alvo) return;
      limpar();
      timerRef.current = window.setTimeout(() => setConteudo(null), ATRASO_FECHAR);
    }

    /*
      Rolar ou redimensionar invalida a posição medida. Fechar é mais honesto que reposicionar: o
      ponteiro provavelmente já não está sobre o mesmo elemento.
    */
    const fechar = () => {
      limpar();
      setConteudo(null);
    };

    document.addEventListener('mouseover', aoEntrar);
    document.addEventListener('mouseout', aoSair);
    document.addEventListener('scroll', fechar, true);
    window.addEventListener('resize', fechar);
    return () => {
      limpar();
      document.removeEventListener('mouseover', aoEntrar);
      document.removeEventListener('mouseout', aoSair);
      document.removeEventListener('scroll', fechar, true);
      window.removeEventListener('resize', fechar);
    };
  }, []);

  /*
    A posição é calculada **depois** de medir o balão, porque ela depende da altura dele — que só
    se conhece renderizado. Sem isso, um balão de duas linhas cobriria a célula que o originou.
  */
  useEffect(() => {
    if (!conteudo || !balaoRef.current) return;

    const balao = balaoRef.current.getBoundingClientRect();
    const { origem } = conteudo;
    const margem = 8;

    // Abre para baixo; sobe quando não há espaço — o mesmo critério do `Floating`.
    const cabeAbaixo = origem.bottom + margem + balao.height < window.innerHeight;
    const top = cabeAbaixo ? origem.bottom + margem : origem.top - balao.height - margem;

    // Centraliza no elemento, sem deixar sair da tela pelas laterais.
    const centro = origem.left + origem.width / 2 - balao.width / 2;
    const left = Math.max(margem, Math.min(centro, window.innerWidth - balao.width - margem));

    setPosicao({ left, top, acima: !cabeAbaixo });
  }, [conteudo]);

  return createPortal(
    <AnimatePresence>
      {conteudo && (
        <motion.div
          ref={balaoRef}
          initial={{ opacity: 0, y: posicao.acima ? 4 : -4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          style={{ left: posicao.left, top: posicao.top }}
          /*
            `pointer-events-none` é essencial: o balão aparece perto do ponteiro, e sem isso ele
            roubaria o hover do elemento — piscando entre abrir e fechar.
          */
          className="pointer-events-none fixed z-[100] max-w-xs rounded-lg bg-slate-900 px-2.5 py-1.5 shadow-lg ring-1 ring-slate-700"
        >
          <p className="text-[11px] font-medium leading-snug text-white">{conteudo.texto}</p>
          {conteudo.sub && (
            <p className="mt-0.5 text-[10px] leading-snug text-slate-400">{conteudo.sub}</p>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
