import {
  createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CopyPlus, Info, LucideIcon, Trash2 } from 'lucide-react';

/**
 * O diálogo do sistema — um só para o app inteiro.
 *
 * ## Por que substituiu o `window.confirm`
 *
 * A caixa nativa desce colada ao topo da janela, com a tipografia do navegador e o endereço do
 * site em cima do texto. Ela não é só feia: **rompe a leitura**. A pessoa está no meio da grade,
 * o olho está na linha que ela clicou, e a pergunta aparece a 600px dali — fora do campo de
 * atenção, com dois botões cujos rótulos ("OK", "Cancelar") não dizem o que vai acontecer.
 *
 * Pior: `window.confirm` **trava a aba inteira**. Nenhuma animação corre, nenhum estado atualiza,
 * e em automação de teste ele nem existe — o `jsdom` o ignora, então toda exclusão passava direto
 * nos testes sem ninguém confirmar nada. A pergunta que protegia o dado era invisível para a
 * suíte que deveria protegê-la.
 *
 * ## O modelo: alerta centrado, no estilo do macOS
 *
 * Referência pedida pela gestão, e ela resolve os três problemas: aparece **no centro**, onde o
 * olho já está; escurece e desfoca o fundo, deixando claro que o resto está suspenso; e nomeia a
 * ação no próprio botão ("Excluir", "Duplicar") em vez de "OK".
 *
 * ## Imperativo, não declarativo
 *
 * A API é `await confirmar(...)`, e não um `<Modal aberto={...}>` por tela. Os 12 pontos de
 * confirmação do sistema viviam como uma linha só (`if (!window.confirm(…)) return;`) dentro de
 * funções que já faziam outra coisa. Um componente declarativo obrigaria cada um deles a criar
 * estado, guardar o alvo pendente e partir a função em duas — doze vezes, e cada metade seria um
 * lugar a mais para o alvo se perder. Com a promessa, a troca é de uma linha por outra.
 */

export type TomAcao = 'primario' | 'destrutivo' | 'neutro';

export interface AcaoDialogo {
  /** Devolvido por `perguntar` quando este botão é escolhido. */
  id: string;
  label: string;
  tom?: TomAcao;
}

/** Ícones nomeados — o chamador não importa `lucide` só para abrir um diálogo. */
export type IconeDialogo = 'alerta' | 'excluir' | 'duplicar' | 'informacao';

const ICONES: Record<IconeDialogo, LucideIcon> = {
  alerta: AlertTriangle,
  excluir: Trash2,
  duplicar: CopyPlus,
  informacao: Info,
};

export interface PedidoDialogo {
  titulo: string;
  /** Uma frase, ou algumas separadas por `\n`. Cada quebra vira um parágrafo. */
  descricao?: string;
  /**
   * Os botões, na ordem em que aparecem — **a última é a de confirmação**, à direita.
   *
   * Sem isto, o padrão é Cancelar + Confirmar.
   */
  acoes?: AcaoDialogo[];
  /** Transforma o diálogo em pergunta com resposta escrita — o antigo `window.prompt`. */
  campo?: {
    rotulo?: string;
    valorInicial?: string;
    placeholder?: string;
    tipo?: 'text' | 'number';
  };
  icone?: IconeDialogo;
}

export interface RespostaDialogo {
  /** Id da ação escolhida. */
  acao: string;
  /** O que foi digitado, quando o diálogo tinha campo. */
  texto: string;
}

interface ConfirmarOpcoes {
  titulo: string;
  descricao?: string;
  /** O rótulo **nomeia o que vai acontecer**: "Excluir", "Duplicar" — nunca "OK". */
  rotuloConfirmar?: string;
  rotuloCancelar?: string;
  /** Pinta a confirmação de vermelho e move o foco para Cancelar. */
  destrutivo?: boolean;
  icone?: IconeDialogo;
}

interface PedirTextoOpcoes {
  titulo: string;
  descricao?: string;
  valorInicial?: string;
  placeholder?: string;
  rotuloConfirmar?: string;
  tipo?: 'text' | 'number';
}

interface DialogoContextValue {
  /** A forma geral: devolve a ação escolhida, ou `null` se a pessoa desistiu. */
  perguntar: (pedido: PedidoDialogo) => Promise<RespostaDialogo | null>;
  /** Sim ou não. */
  confirmar: (opcoes: ConfirmarOpcoes) => Promise<boolean>;
  /** Uma resposta escrita. `null` quando cancelada — diferente de `''`, que é resposta vazia. */
  pedirTexto: (opcoes: PedirTextoOpcoes) => Promise<string | null>;
  /** Um aviso com um botão só — o antigo `window.alert`. */
  avisar: (opcoes: { titulo: string; descricao?: string; icone?: IconeDialogo }) => Promise<void>;
}

const DialogoContext = createContext<DialogoContextValue | null>(null);

const ACOES_PADRAO: AcaoDialogo[] = [
  { id: 'cancelar', label: 'Cancelar', tom: 'neutro' },
  { id: 'confirmar', label: 'Confirmar', tom: 'primario' },
];

export function DialogoProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<PedidoDialogo | null>(null);
  /*
    O `resolve` da promessa em aberto.

    Em `ref`, e não em estado: trocá-lo não deve renderizar nada, e ele precisa sobreviver ao
    render que fecha o diálogo — é depois dele que a promessa é resolvida.
  */
  const resolverRef = useRef<((resposta: RespostaDialogo | null) => void) | null>(null);

  const perguntar = useCallback((novo: PedidoDialogo) => {
    /*
      Um diálogo por vez. Se outro já estiver aberto, o anterior é resolvido como cancelado.

      Deixar dois empilhados esconderia a pergunta de baixo — e quem a abriu ficaria esperando
      para sempre uma resposta que ninguém pode dar.
    */
    resolverRef.current?.(null);
    setPedido(novo);
    return new Promise<RespostaDialogo | null>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const responder = useCallback((resposta: RespostaDialogo | null) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setPedido(null);
    resolver?.(resposta);
  }, []);

  const confirmar = useCallback(
    async (opcoes: ConfirmarOpcoes) => {
      const resposta = await perguntar({
        titulo: opcoes.titulo,
        descricao: opcoes.descricao,
        icone: opcoes.icone ?? (opcoes.destrutivo ? 'alerta' : undefined),
        acoes: [
          { id: 'cancelar', label: opcoes.rotuloCancelar ?? 'Cancelar', tom: 'neutro' },
          {
            id: 'confirmar',
            label: opcoes.rotuloConfirmar ?? 'Confirmar',
            tom: opcoes.destrutivo ? 'destrutivo' : 'primario',
          },
        ],
      });
      return resposta?.acao === 'confirmar';
    },
    [perguntar],
  );

  const pedirTexto = useCallback(
    async (opcoes: PedirTextoOpcoes) => {
      const resposta = await perguntar({
        titulo: opcoes.titulo,
        descricao: opcoes.descricao,
        campo: {
          valorInicial: opcoes.valorInicial,
          placeholder: opcoes.placeholder,
          tipo: opcoes.tipo,
        },
        acoes: [
          { id: 'cancelar', label: 'Cancelar', tom: 'neutro' },
          { id: 'confirmar', label: opcoes.rotuloConfirmar ?? 'Confirmar', tom: 'primario' },
        ],
      });
      return resposta?.acao === 'confirmar' ? resposta.texto : null;
    },
    [perguntar],
  );

  const avisar = useCallback(
    async (opcoes: { titulo: string; descricao?: string; icone?: IconeDialogo }) => {
      await perguntar({
        titulo: opcoes.titulo,
        descricao: opcoes.descricao,
        icone: opcoes.icone ?? 'informacao',
        acoes: [{ id: 'ok', label: 'Entendi', tom: 'primario' }],
      });
    },
    [perguntar],
  );

  const valor = useMemo(
    () => ({ perguntar, confirmar, pedirTexto, avisar }),
    [perguntar, confirmar, pedirTexto, avisar],
  );

  return (
    <DialogoContext.Provider value={valor}>
      {children}
      <Alerta pedido={pedido} onResponder={responder} />
    </DialogoContext.Provider>
  );
}

export function useDialogo(): DialogoContextValue {
  const contexto = useContext(DialogoContext);
  if (!contexto) throw new Error('useDialogo precisa estar dentro de DialogoProvider');
  return contexto;
}

const ESTILO_ACAO: Record<TomAcao, string> = {
  primario: 'bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-indigo-600',
  destrutivo: 'bg-rose-500 text-white hover:bg-rose-400 focus-visible:outline-rose-500',
  neutro:
    'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 focus-visible:outline-slate-400',
};

const ESTILO_ICONE: Record<TomAcao, string> = {
  primario: 'bg-indigo-50 text-indigo-600',
  destrutivo: 'bg-rose-50 text-rose-500',
  neutro: 'bg-slate-100 text-slate-500',
};

function Alerta({
  pedido,
  onResponder,
}: {
  pedido: PedidoDialogo | null;
  onResponder: (resposta: RespostaDialogo | null) => void;
}) {
  const [texto, setTexto] = useState('');
  const campoRef = useRef<HTMLInputElement>(null);
  const confirmarRef = useRef<HTMLButtonElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const cartaoRef = useRef<HTMLDivElement>(null);

  const acoes = pedido?.acoes ?? ACOES_PADRAO;
  const principal = acoes[acoes.length - 1];
  const destrutivo = principal?.tom === 'destrutivo';

  // O campo abre com o valor sugerido já selecionado — digitar substitui, como na célula editável.
  useEffect(() => {
    if (!pedido) return;
    setTexto(pedido.campo?.valorInicial ?? '');
  }, [pedido]);

  /*
    Onde o foco pousa, e por que depende do tom.

    Num diálogo comum, o foco vai para a confirmação: quem abriu já sabe o que quer, e o Enter
    resolve. Num **destrutivo**, vai para Cancelar — o mesmo Enter que confirma um "Duplicar" não
    pode apagar uma linha por reflexo. É a regra do alerta do macOS, e existe pelo mesmo motivo.

    Havendo campo, ele vence os dois: a pergunta é o que escrever.
  */
  useEffect(() => {
    if (!pedido) return;
    const alvo = pedido.campo
      ? campoRef.current
      : destrutivo
        ? cancelarRef.current
        : confirmarRef.current;
    alvo?.focus();
    if (pedido.campo) campoRef.current?.select();
  }, [pedido, destrutivo]);

  useEffect(() => {
    if (!pedido) return;

    function aoTeclar(evento: KeyboardEvent) {
      // Esc é sempre a saída — e sair é sempre não fazer nada.
      if (evento.key === 'Escape') {
        evento.preventDefault();
        onResponder(null);
        return;
      }

      /*
        Tab não escapa do diálogo.

        Sem isto, o Tab levaria o foco para a grade atrás do véu — a pessoa editaria uma célula
        que a tela mostra como suspensa, e o diálogo continuaria aberto esperando resposta.
      */
      if (evento.key === 'Tab') {
        const focaveis = cartaoRef.current?.querySelectorAll<HTMLElement>('button, input');
        if (!focaveis || focaveis.length === 0) return;
        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];
        const ativo = document.activeElement;
        if (evento.shiftKey && ativo === primeiro) {
          evento.preventDefault();
          ultimo.focus();
        } else if (!evento.shiftKey && ativo === ultimo) {
          evento.preventDefault();
          primeiro.focus();
        }
      }
    }

    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [pedido, onResponder]);

  if (!pedido) return null;

  const Icone = pedido.icone ? ICONES[pedido.icone] : null;
  const paragrafos = (pedido.descricao ?? '').split('\n').filter((linha) => linha.trim() !== '');

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="veu"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        /*
          O véu escurece **e desfoca**. Só escurecer deixa a grade legível atrás, e a pessoa tenta
          clicar nela; o desfoque diz, sem texto, que aquilo ali está suspenso.

          Clicar no véu cancela — é o gesto que todo mundo tenta antes de procurar o botão.
        */
        onMouseDown={(evento) => {
          if (evento.target === evento.currentTarget) onResponder(null);
        }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-[2px]"
      >
        <motion.div
          ref={cartaoRef}
          key="cartao"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="dialogo-titulo"
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"
        >
          {Icone && (
            <div
              className={`mx-auto mb-4 flex size-11 items-center justify-center rounded-full ${
                ESTILO_ICONE[principal?.tom ?? 'primario']
              }`}
            >
              <Icone className="size-5" />
            </div>
          )}

          <h2
            id="dialogo-titulo"
            className="font-display text-base font-bold text-balance text-slate-900"
          >
            {pedido.titulo}
          </h2>

          {paragrafos.map((linha, indice) => (
            <p key={indice} className="mt-2 text-sm text-balance text-slate-500">
              {linha}
            </p>
          ))}

          {pedido.campo && (
            <div className="mt-4 text-left">
              {pedido.campo.rotulo && (
                <label
                  htmlFor="dialogo-campo"
                  className="mb-1 block text-apoio font-bold tracking-wider text-slate-500 uppercase"
                >
                  {pedido.campo.rotulo}
                </label>
              )}
              <input
                id="dialogo-campo"
                ref={campoRef}
                type={pedido.campo.tipo ?? 'text'}
                value={texto}
                placeholder={pedido.campo.placeholder}
                onChange={(evento) => setTexto(evento.target.value)}
                // Enter no campo confirma: a pessoa terminou de escrever, o gesto seguinte é enviar.
                onKeyDown={(evento) => {
                  if (evento.key !== 'Enter') return;
                  evento.preventDefault();
                  onResponder({ acao: principal?.id ?? 'confirmar', texto });
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          )}

          {/*
            Botões de largura igual, lado a lado — e a confirmação à direita.

            Empilhar em coluna (o alerta do iOS) foi descartado: aqui há casos de três saídas
            ("Desligado", "Inativo", "Cancelar"), e três botões em coluna viram uma lista de menu,
            que é outra coisa. Em três ou mais, a coluna volta — senão nenhum rótulo cabe.
          */}
          <div className={`mt-6 flex gap-2 ${acoes.length > 2 ? 'flex-col-reverse' : ''}`}>
            {acoes.map((acao) => {
              const ehPrincipal = acao.id === principal?.id;
              return (
                <motion.button
                  key={acao.id}
                  ref={
                    ehPrincipal ? confirmarRef : acao.id === 'cancelar' ? cancelarRef : undefined
                  }
                  type="button"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onResponder({ acao: acao.id, texto })}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    ESTILO_ACAO[acao.tom ?? 'neutro']
                  }`}
                >
                  {acao.label}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
