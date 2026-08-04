import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, CircleAlert, Plus, Search } from 'lucide-react';
import { normalizarNomeDeMarca } from '../../utils/talentos';
import { Floating } from './Floating';

export interface OpcaoCadastrada {
  nome: string;
  /** Entrou por um quadro e ainda espera curadoria — ver `Marca.cadastroPendente`. */
  pendente?: boolean;
}

interface SelecaoComCadastroProps {
  value: string;
  /** Grava o nome escolhido. Quem chama decide o que fazer com um nome que não estava na lista. */
  onCommit: (valor: string) => void;
  opcoes: OpcaoCadastrada[];
  /** Como a entidade se chama no texto: "marca", "talento". */
  entidade: string;
  placeholder?: string;
  align?: 'left' | 'center';
  className?: string;
  /**
   * Segunda linha da dica — de onde a lista vem, quando isso não é óbvio.
   *
   * Marca e Talento dispensam: a coluna diz o que a lista é. Já Segmento sai do cadastro da marca
   * e vale para todos os projetos dela — alcance que ninguém adivinha olhando a célula.
   */
  dicaSub?: string;
  /** Força a abertura — mesma interface da `EditableCell`. */
  editing?: boolean;
  onEditingEnd?: () => void;
}

/**
 * Célula que escolhe de uma lista cadastrada — **com escape para criar**.
 *
 * ## Por que não é texto livre
 *
 * Enquanto era, "Coca-Cola", "Coca Cola" e "coca-cola" eram três marcas distintas para qualquer
 * contagem, e o Power BI agruparia por string. Escolher de uma lista resolve na origem: o nome
 * fica igual em todos os quadros porque é o mesmo registro.
 *
 * ## Por que não é lista fechada
 *
 * Uma lista sem escape obrigaria a parar o cadastro, abrir outra tela, criar a marca e voltar.
 * Ninguém faz isso no meio do trabalho — a saída seria devolver o campo a texto livre, e com ele
 * as três grafias de volta.
 *
 * O meio-termo é criar **como solicitação**: o nome novo entra marcado como pendente, o trabalho
 * continua, e alguém completa o cadastro depois. É o mesmo desenho que já resolvia talento sem
 * ficha ([PRD 07 §11.1](../../../prd/07_visoes_e_relacoes.md)).
 *
 * ## Por que não é a `CelulaReferencia`
 *
 * Aquela é texto livre **com sugestões e alerta de semelhança** — ajuda, mas não impede. Esta parte
 * da lista: o que se digita filtra em vez de virar valor, e criar é um gesto explícito.
 */
export function SelecaoComCadastro({
  value, onCommit, opcoes, entidade, placeholder, align = 'left', className = '',
  dicaSub, editing = false, onEditingEnd,
}: SelecaoComCadastroProps) {
  const [abertoLocal, setAbertoLocal] = useState(false);
  const [busca, setBusca] = useState('');
  const botaoRef = useRef<HTMLButtonElement>(null);
  const campoRef = useRef<HTMLInputElement>(null);
  /** O painel vive em portal: sem esta ref, ele seria tratado como "fora" de si mesmo. */
  const painelRef = useRef<HTMLDivElement>(null);
  const aberto = editing || abertoLocal;

  useEffect(() => {
    if (!aberto) return;
    setBusca('');
    window.requestAnimationFrame(() => campoRef.current?.focus());
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    function fora(evento: MouseEvent) {
      const alvo = evento.target as Node;
      if (botaoRef.current?.contains(alvo) || painelRef.current?.contains(alvo)) return;
      fechar();
    }
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [aberto]);

  function fechar() {
    setAbertoLocal(false);
    onEditingEnd?.();
  }

  function escolher(nome: string) {
    if (nome !== value) onCommit(nome);
    fechar();
  }

  /*
    A comparação usa a **mesma chave da entidade** — sem acento, caixa nem pontuação.

    Com uma normalização mais fraca, "coca cola" não casaria com "Coca-Cola": o painel ofereceria
    criar algo que o cadastro reconheceria como já existente, e a linha guardaria a grafia digitada
    em vez da cadastrada.
  */
  const termo = normalizarNomeDeMarca(busca);
  const filtradas = useMemo(
    () => (termo ? opcoes.filter((o) => normalizarNomeDeMarca(o.nome).includes(termo)) : opcoes),
    [opcoes, termo],
  );

  /*
    Só oferece criar quando o texto **não existe** na lista — comparando normalizado.

    Sem isso, digitar "coca cola" ofereceria criar uma segunda Coca-Cola, que é exatamente o que
    este componente existe para impedir.
  */
  /*
    Se o texto **já corresponde** a uma opção, escolher aquela é o certo — e é o nome dela que vai
    para a linha, não o que foi digitado. Duas grafias do mesmo nome numa coluna é exatamente o que
    este componente existe para impedir.
  */
  const equivalente = opcoes.find((o) => normalizarNomeDeMarca(o.nome) === termo);
  const podeCriar = Boolean(busca.trim()) && !equivalente;

  const atual = opcoes.find((o) => o.nome === value);
  const alignClass = align === 'left' ? 'text-left justify-start' : 'text-center justify-center';

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        onClick={() => setAbertoLocal(true)}
        aria-label={`Escolher ${entidade}`}
        data-dica={value || `Escolher ${entidade}`}
        data-dica-sub={
          atual?.pendente ? 'Cadastro pendente — alguém ainda precisa completar' : dicaSub
        }
        /* A origem da lista não repete nada da tela — por isso vale mesmo cabendo. */
        {...(dicaSub && !atual?.pendente ? { 'data-dica-sempre': '' } : {})}
        className={`flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 transition hover:bg-white hover:ring-1 hover:ring-slate-200 ${alignClass} ${
          value ? 'text-slate-700' : 'text-slate-300'
        } ${className}`}
      >
        <span className="truncate">{value || placeholder || '—'}</span>
        {/*
          O selo acompanha o valor na grade, e não só no cadastro: quem lê a linha precisa saber
          que aquele nome entrou como solicitação e ainda não foi conferido.
        */}
        {atual?.pendente && (
          <CircleAlert className="size-3 shrink-0 text-amber-500" />
        )}
      </button>

      <AnimatePresence>
        {aberto && (
          <Floating anchorRef={botaoRef} width={260} height={320}>
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              ref={painelRef}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                <Search className="size-3.5 shrink-0 text-slate-400" />
                <input
                  ref={campoRef}
                  value={busca}
                  onChange={(evento) => setBusca(evento.target.value)}
                  onKeyDown={(evento) => {
                    if (evento.key === 'Escape') fechar();
                    // Enter escolhe a primeira da lista, ou cria — o caminho do teclado.
                    if (evento.key === 'Enter') {
                      // Equivalente vence: digitar "coca cola" e dar Enter grava "Coca-Cola".
                      if (equivalente) escolher(equivalente.nome);
                      else if (filtradas.length > 0) escolher(filtradas[0].nome);
                      else if (podeCriar) escolher(busca.trim());
                    }
                  }}
                  placeholder={`Buscar ${entidade}…`}
                  className="w-full text-xs text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="max-h-56 overflow-auto py-1 custom-scrollbar">
                {filtradas.map((opcao) => (
                  <button
                    key={opcao.nome}
                    type="button"
                    onMouseDown={(evento) => {
                      evento.preventDefault();
                      escolher(opcao.nome);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition hover:bg-slate-50"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-700">
                      {opcao.nome}
                    </span>
                    {opcao.pendente && (
                      <span
                        data-dica="Cadastro pendente"
                        data-dica-sub="Alguém ainda precisa completar o cadastro"
                        data-dica-sempre
                        className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700"
                      >
                        Pendente
                      </span>
                    )}
                    {opcao.nome === value && <Check className="size-3 shrink-0 text-emerald-500" />}
                  </button>
                ))}

                {filtradas.length === 0 && !podeCriar && (
                  <p className="px-3 py-4 text-center text-[11px] text-slate-400">
                    Nenhuma {entidade} cadastrada ainda.
                  </p>
                )}
              </div>

              {podeCriar && (
                <button
                  type="button"
                  onMouseDown={(evento) => {
                    evento.preventDefault();
                    escolher(busca.trim());
                  }}
                  className="flex w-full items-center gap-2 border-t border-slate-100 bg-emerald-50/50 px-3 py-2 text-left transition hover:bg-emerald-50"
                >
                  <Plus className="size-3.5 shrink-0 text-emerald-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-emerald-800">
                      Criar “{busca.trim()}”
                    </span>
                    <span className="block text-[10px] text-emerald-700">
                      Entra como solicitação de cadastro
                    </span>
                  </span>
                </button>
              )}

              {/* Limpar é uma escolha válida: nem todo projeto tem marca definida no início. */}
              {value && (
                <button
                  type="button"
                  onMouseDown={(evento) => {
                    evento.preventDefault();
                    escolher('');
                  }}
                  className="w-full border-t border-slate-100 px-3 py-1.5 text-left text-[11px] text-slate-500 transition hover:bg-slate-50 hover:text-rose-600"
                >
                  Limpar
                </button>
              )}
            </motion.div>
          </Floating>
        )}
      </AnimatePresence>
    </>
  );
}
