import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Lock } from 'lucide-react';
import { MotivoDeclinio, Pendencia, StatusOportunidade, TipoPendencia } from '../../types';
import {
  bloqueadaPorPendencias, descricaoDasEsperas, diasDeEspera, getMotivoDeclinio, getStatus,
  getTipoPendencia, MOTIVOS_DECLINIO, pendenciasDoStatus, rotuloDoStatus, STATUS_OPORTUNIDADE,
} from '../../utils/oportunidades';
import {
  destinosPermitidos, ehEstadoFinal, motivosPermitidosDoDeclinio,
} from '../../utils/fluxoStatus';
import { formatDate, formatDiaMes, todayISO } from '../../utils/dates';
import { Floating } from '../ui/Floating';

interface StatusOportunidadeSelectProps {
  valor: StatusOportunidade;
  /** De onde partiu a recusa — só vale com `valor === 'declinado'`. */
  motivo?: MotivoDeclinio;
  /** Ausente deixa a etiqueta em leitura. */
  onChange?: (status: StatusOportunidade, motivo?: MotivoDeclinio) => void;
  /** As esperas da linha — o selo mostra as abertas mesmo em leitura. */
  pendencias?: Pendencia[];
  /** Os quatro gestos — ausentes deixam o bloco de pendências em leitura. */
  onAbrirPendencia?: (tipo: TipoPendencia) => void;
  onPendenciaChegou?: (pendenciaId: string) => void;
  onReabrirPendencia?: (pendenciaId: string) => void;
  onDescartarPendencia?: (pendenciaId: string) => void;
}

/**
 * Etiqueta de status com **as transições do fluxo** — e, desde 04/08/2026, as **pendências**.
 *
 * Diferente do seletor de Contratos, que abre os 13 status: aqui o painel mostra apenas para onde
 * a oportunidade **pode** ir. Oferecer o caminho inválido e recusá-lo depois seria pior que não
 * oferecer — a pessoa clica, nada acontece, e ela não sabe por quê.
 *
 * As pendências moram **aqui**, e não num botão próprio na linha, porque são assunto de "onde o
 * projeto está" — o mesmo assunto do painel. Um ícone separado seria mais um alvo para aprender;
 * o caminho que a pessoa já conhece leva às duas coisas. Ver [08 §7](../../../prd/08_backlog_e_integracoes.md).
 */
export function StatusOportunidadeSelect({
  valor, motivo, onChange, pendencias,
  onAbrirPendencia, onPendenciaChegou, onReabrirPendencia, onDescartarPendencia,
}: StatusOportunidadeSelectProps) {
  const [aberto, setAberto] = useState(false);
  /* O submenu do "+ Abrir pendência" — fechado a cada abertura do painel. */
  const [escolhendoPendencia, setEscolhendoPendencia] = useState(false);
  /*
    A política "livre, com aviso": avançar com espera aberta é permitido, mas o primeiro clique
    vira pergunta. Travar geraria contorno — quem tem pressa pararia de registrar esperas, e a
    medição morreria junto. O aviso é a fricção certa; a resposta fica no log do projeto.
  */
  const [confirmando, setConfirmando] = useState<{
    destino: StatusOportunidade; motivo?: MotivoDeclinio;
  } | null>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  /*
    O painel vive em portal: para o "clique fora", dentro dele É fora do botão. Sem este ref,
    qualquer interação interna (abrir o menu de pendências, marcar "chegou") fechava o painel — e
    a pessoa reabria só para ver o que o clique fez. O painel fecha por três caminhos, todos
    intencionais: escolher um destino, clicar fora de verdade, ou clicar no selo de novo.
  */
  const painelRef = useRef<HTMLDivElement>(null);

  const status = getStatus(valor);
  const destinos = destinosPermitidos(valor);
  const final = ehEstadoFinal(valor);

  const hoje = todayISO();
  const listaPendencias = pendencias ?? [];
  const abertas = listaPendencias.filter((p) => !p.chegouEm);
  const chegadas = listaPendencias.filter((p) => p.chegouEm);
  const catalogo = pendenciasDoStatus(valor);
  const disponiveis = catalogo.filter((tipo) => !abertas.some((p) => p.tipo === tipo.id));
  const descricaoEsperas = descricaoDasEsperas({ pendencias: listaPendencias }, hoje);
  /*
    Cada etapa oferece só os declínios que fazem sentido nela: na Revisão, quem está com a bola é
    o talento — o único "Decl." dali é o dele. Ver `motivosPermitidosDoDeclinio`.
  */
  const motivosVisiveis = MOTIVOS_DECLINIO.filter(
    (opcao) => motivosPermitidosDoDeclinio(valor).includes(opcao.id),
  );

  /** A trava da Elaboração: a carta não sobe para revisão com espera aberta. */
  const destinoTravado = (destino: StatusOportunidade) =>
    bloqueadaPorPendencias({ status: valor, pendencias: listaPendencias }, destino);

  /** Avança de verdade — depois da confirmação, ou direto quando não há espera aberta. */
  function avancar(destino: StatusOportunidade, motivoDestino?: MotivoDeclinio) {
    onChange?.(destino, motivoDestino);
    setConfirmando(null);
    setAberto(false);
  }

  function pedirAvanco(destino: StatusOportunidade, motivoDestino?: MotivoDeclinio) {
    if (destinoTravado(destino)) return; // o botão já está desabilitado — isto é o cinto.
    if (abertas.length > 0) setConfirmando({ destino, motivo: motivoDestino });
    else avancar(destino, motivoDestino);
  }

  /*
    A etiqueta mostra o motivo do declínio; o resto dos status mostra o próprio rótulo.

    `curto` porque a coluna Status tem pouco mais de 100px: "Declinado pelo Mercado" seria
    truncado no meio da palavra que interessa. O nome completo vai para o `title`.
  */
  const rotulo = rotuloDoStatus(valor, motivo, true);
  const rotuloLongo = rotuloDoStatus(valor, motivo);

  useEffect(() => {
    if (!aberto) {
      // Painel fechado zera as conversas de dentro dele: reabrir começa do começo.
      setEscolhendoPendencia(false);
      setConfirmando(null);
      return;
    }
    function handleClickOutside(evento: MouseEvent) {
      const alvo = evento.target as Node;
      if (botaoRef.current?.contains(alvo)) return;
      if (painelRef.current?.contains(alvo)) return;
      setAberto(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [aberto]);

  /*
    A espera aparece como **badge de canto**, estilo notificação — fora do fluxo do texto.

    A primeira versão punha o ⏳ na linha do rótulo e ele espremia o texto ("Em Elaboraçã…" no
    print da operação, 04/08/2026). No canto, ele não disputa largura com nada. A cor e o ícone
    dizem o estado: âmbar ⏳N = esperando; verde ✓N = todas as esperas chegaram. Os nomes por
    extenso ficam na dica e no painel.
  */
  const badge =
    abertas.length > 0
      ? { texto: `⏳${abertas.length}`, cor: 'bg-amber-500' }
      : chegadas.length > 0
        ? { texto: `✓${chegadas.length}`, cor: 'bg-emerald-600' }
        : null;

  const seloBadge = badge && (
    <span
      className={`absolute -right-1.5 -top-1.5 flex h-4 items-center justify-center rounded-full px-1 text-selo font-bold leading-none text-white ring-2 ring-white ${badge.cor}`}
    >
      {badge.texto}
    </span>
  );

  /*
    A etiqueta é **suave e em caixa alta** desde 12/08/2026.

    Era a única preenchida do produto — fundo `500` e texto branco —, e a regra que a mantinha assim
    ([03 §1.1.1]) nasceu quando a coluna Status rolava junto com o resto da grade. Hoje ela é
    **congelada**: as etiquetas ficam paradas e empilhadas enquanto a tabela corre ao lado, e nove
    fundos saturados um sob o outro viram o arco-íris que a própria §1.1.1 condena.

    A caixa alta é o que devolve o destaque que a saturação dava — pedido junto, e as duas coisas se
    completam: o status continua sendo o elemento mais visível da linha, agora por **posição e
    forma** em vez de cor cheia.
  */
  const conteudoSelo = (
    // Duas linhas em vez de corte: "AGUARDANDO FEEDBACK" não cabe em 110px numa linha só.
    <span className="line-clamp-2">{rotulo}</span>
  );

  /**
   * A etiqueta tem **sempre a altura de duas linhas** — 12/08/2026.
   *
   * A largura nunca variou (`w-full` a torna a da coluna), mas a altura sim: "Aguardando Feedback"
   * quebra em duas linhas e "Ajustes" cabe em uma. Numa coluna congelada, que fica parada enquanto
   * o resto rola, a diferença aparecia como um degrau subindo e descendo a cada linha — *"cada um
   * de um tamanho fica feio ao movimentar"*.
   *
   * A medida vem do maior rótulo do catálogo, e é escrita em `em` de propósito: `2.5em` são as
   * duas linhas de `leading-tight` (1.25 cada) e `0.5rem` é o `py-1`. Em `em`, ela acompanha a
   * régua fluida da grade — em pixel, descolaria dela na primeira tela diferente.
   */
  const alturaFixa = 'min-h-[calc(2.5em+0.5rem)]';

  // Sem permissão de escrita, ou já num estado final: a etiqueta é só informação.
  if (!onChange || final) {
    return (
      <span
        data-dica={rotuloLongo}
        data-dica-sub={
          final
            ? `O fluxo termina aqui${
              getMotivoDeclinio(motivo) ? `. ${getMotivoDeclinio(motivo)!.hint}` : ''
            }`
            : descricaoEsperas ? `Esperando: ${descricaoEsperas}` : undefined
        }
        className={`relative flex w-full items-center justify-center gap-1 rounded-md px-2 py-1 text-apoio font-bold tracking-wide uppercase leading-tight ring-1 ${alturaFixa} ${status.suave}`}
      >
        {conteudoSelo}
        {final && onChange && <Lock className="size-2.5 shrink-0 opacity-70" />}
        {seloBadge}
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
        aria-label={`Avançar de ${rotuloLongo}`}
        data-dica={rotuloLongo}
        data-dica-sub={
          descricaoEsperas ? `Esperando: ${descricaoEsperas}` : 'Clique para avançar no fluxo'
        }
        className={`relative flex w-full items-center justify-center gap-1 rounded-md px-2 py-1 text-apoio font-bold tracking-wide uppercase leading-tight ring-1 transition hover:brightness-95 ${alturaFixa} ${status.suave}`}
      >
        {conteudoSelo}
        {seloBadge}
      </motion.button>

      <AnimatePresence>
        {aberto && (
          <Floating
            anchorRef={botaoRef}
            /*
              320, e não os 260 de antes: as pendências ganharam a linha de datas (11/08/2026), e
              no painel estreito "Cotação de Elenco" abria cortado — "Cotação …" no print da
              operação. O nome inteiro é o mínimo; o corte por reticências fica como último
              recurso, não como estado normal.
            */
            width={320}
            /*
              Declinar ocupa três linhas, não uma; o bloco de pendências cresce com o que a linha
              tem. A conta é estimativa de altura para o painel abrir para o lado certo.
            */
            height={
              260
              + (destinos.includes('declinado') ? (motivosVisiveis.length - 1) * 36 : 0)
              + (catalogo.length > 0 || listaPendencias.length > 0 ? 34 : 0)
              // Cada pendência tem duas linhas desde as datas: rótulo + percurso da espera.
              + (abertas.length + chegadas.length) * 46
              + (escolhendoPendencia ? disponiveis.length * 28 : catalogo.length > 0 ? 28 : 0)
              + (confirmando ? 64 : 0)
            }
          >
            <motion.div
              ref={painelRef}
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
            >
              <p className="flex items-center gap-1 px-3 py-1 text-rotulo font-bold uppercase tracking-wider text-slate-500">
                {status.label}
                <ArrowRight className="size-2.5" />
                {destinos.length === 1 ? 'próxima etapa' : 'para onde vai'}
              </p>

              {destinos.map((destino) => {
                const alvo = getStatus(destino);

                /*
                  Declinar exige dizer de onde partiu a recusa.

                  A opção única "Declinado" é substituída pelos três motivos — todos levam ao
                  mesmo status, e a diferença entre eles é a informação mais útil do desfecho.
                  Oferecer "Declinado" e perguntar o motivo depois abriria a porta para o
                  registro sem motivo, que é justamente o que a quebra do card não consegue ler.
                */
                if (destino === 'declinado') {
                  return motivosVisiveis.map((opcao) => (
                    <button
                      key={opcao.id}
                      type="button"
                      data-dica={opcao.label}
                      data-dica-sub={opcao.hint}
                      data-dica-sempre
                      onClick={() => pedirAvanco('declinado', opcao.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-50"
                    >
                      <span className={`size-2 shrink-0 rounded-full ${alvo.dot}`} />
                      <span className="min-w-0 flex-1 truncate text-xs text-slate-700">
                        {opcao.label}
                      </span>
                      <span
                        data-dica="Encerra o projeto"
                        data-dica-sub="Não há volta pelo fluxo"
                        data-dica-sempre
                        className="shrink-0 text-selo font-bold uppercase tracking-wide text-slate-500"
                      >
                        Final
                      </span>
                    </button>
                  ));
                }

                /*
                  A trava da Elaboração: com espera aberta, "Em Revisão" aparece — a pessoa
                  precisa saber que o caminho existe — mas desabilitado, e a dica diz o porquê.
                */
                if (destinoTravado(destino)) {
                  return (
                    <button
                      key={destino}
                      type="button"
                      disabled
                      data-dica="Resolva as pendências para enviar à revisão"
                      data-dica-sub={`Esperando: ${descricaoEsperas ?? ''}`}
                      data-dica-sempre
                      className="flex w-full cursor-not-allowed items-center gap-2 px-3 py-2 text-left opacity-50"
                    >
                      <span className={`size-2 shrink-0 rounded-full ${alvo.dot}`} />
                      <span className="min-w-0 flex-1 truncate text-xs text-slate-700">
                        {alvo.label}
                      </span>
                      <Lock className="size-3 shrink-0 text-slate-400" />
                    </button>
                  );
                }

                return (
                  <button
                    key={destino}
                    type="button"
                    onClick={() => pedirAvanco(destino)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-50"
                  >
                    <span className={`size-2 shrink-0 rounded-full ${alvo.dot}`} />
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-700">
                      {alvo.label}
                    </span>
                    {alvo.encerra && (
                      <span
                        data-dica="Encerra o projeto"
                        data-dica-sub="Não há volta pelo fluxo"
                        data-dica-sempre
                        className="shrink-0 text-selo font-bold uppercase tracking-wide text-slate-500"
                      >
                        Final
                      </span>
                    )}
                  </button>
                );
              })}

              {/*
                O aviso da política "livre, com aviso": avançar com espera aberta é permitido —
                mas nunca sem querer. A resposta ("avançou com N abertas") é dado de SLA.
              */}
              {confirmando && (
                <div className="mx-2 mt-1 rounded-lg bg-amber-50 px-3 py-2">
                  <p className="text-apoio font-semibold leading-snug text-amber-700">
                    Há {abertas.length} {abertas.length === 1 ? 'pendência aberta' : 'pendências abertas'} —
                    avançar assim mesmo?
                  </p>
                  <div className="mt-1.5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => avancar(confirmando.destino, confirmando.motivo)}
                      className="rounded-md bg-amber-600 px-2.5 py-1 text-apoio font-semibold text-white transition hover:bg-amber-700"
                    >
                      Avançar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmando(null)}
                      className="rounded-md px-2.5 py-1 text-apoio font-semibold text-slate-500 transition hover:bg-white"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/*
                As pendências — "com quem está a bola" — moram no painel de status porque são o
                mesmo assunto. O bloco só existe quando este status oferece esperas no menu, ou
                quando a linha carrega alguma (aberta noutro status, ela viaja junto e aparece).
              */}
              {(catalogo.length > 0 || listaPendencias.length > 0) && (
                <div className="mt-1 border-t border-slate-100 pt-1">
                  <p className="px-3 py-0.5 text-selo font-bold uppercase tracking-wider text-slate-500">
                    Pendências
                    {abertas.length > 0 &&
                      ` · ${abertas.length} ${abertas.length === 1 ? 'aberta' : 'abertas'}`}
                  </p>

                  {/*
                    Cada espera tem duas linhas desde 11/08/2026: o rótulo em cima, o **percurso**
                    embaixo — quando abriu, quando chegou (ou "hoje", se ainda espera) e quantos
                    dias correu. As datas sempre existiram no modelo (`abertaEm`, `chegouEm` — são
                    a matéria-prima do SLA); o painel só mostrava a contagem, e "3d esperando" não
                    responde a pergunta que a operação faz de verdade: *desde quando?*
                  */}
                  {abertas.map((p) => {
                    const tipo = getTipoPendencia(p.tipo);
                    return (
                      <div
                        key={p.id}
                        className="px-3 py-1.5"
                        data-dica={tipo?.label}
                        data-dica-sub={`${tipo?.hint ?? ''} · aberta em ${formatDate(p.abertaEm)}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 text-rotulo">⏳</span>
                          <span className="min-w-0 flex-1 truncate text-xs text-slate-700">
                            {tipo?.label ?? p.tipo}
                          </span>
                          {onPendenciaChegou && (
                            <button
                              type="button"
                              onClick={() => onPendenciaChegou(p.id)}
                              className="shrink-0 rounded-md bg-emerald-600 px-2 py-0.5 text-rotulo font-semibold text-white transition hover:bg-emerald-700"
                            >
                              ✓ Chegou
                            </button>
                          )}
                          {onDescartarPendencia && (
                            <button
                              type="button"
                              aria-label={`Descartar ${tipo?.label ?? p.tipo}`}
                              data-dica="Abri por engano"
                              data-dica-sub="Descarta a espera — ela sai da medição"
                              onClick={() => onDescartarPendencia(p.id)}
                              className="shrink-0 rounded-md px-1.5 py-0.5 text-rotulo font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        {/* "→ hoje" e não uma segunda data: a espera aberta ainda não tem fim. */}
                        <p className="pl-6 font-mono text-selo text-slate-500">
                          {formatDiaMes(p.abertaEm)} → hoje · {diasDeEspera(p, hoje)}d esperando
                        </p>
                      </div>
                    );
                  })}

                  {chegadas.map((p) => {
                    const tipo = getTipoPendencia(p.tipo);
                    return (
                      <div
                        key={p.id}
                        className="px-3 py-1.5"
                        data-dica={tipo?.label}
                        data-dica-sub={`Aberta em ${formatDate(p.abertaEm)} · chegou em ${formatDate(p.chegouEm ?? '')}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 text-rotulo text-emerald-600">✓</span>
                          <span className="min-w-0 flex-1 truncate text-xs text-slate-400">
                            {tipo?.label ?? p.tipo}
                          </span>
                          {onReabrirPendencia && (
                            <button
                              type="button"
                              data-dica="Marquei sem querer — ou a resposta veio incompleta"
                              data-dica-sub="Reabre a espera; o relógio original segue valendo"
                              onClick={() => onReabrirPendencia(p.id)}
                              className="shrink-0 rounded-md px-1.5 py-0.5 text-rotulo font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-600"
                            >
                              ↩ Reabrir
                            </button>
                          )}
                        </div>
                        <p className="pl-6 font-mono text-selo text-slate-400">
                          {formatDiaMes(p.abertaEm)} → {formatDiaMes(p.chegouEm ?? '')} ·{' '}
                          {diasDeEspera(p, hoje)}d de espera
                        </p>
                      </div>
                    );
                  })}

                  {onAbrirPendencia && disponiveis.length > 0 && (
                    escolhendoPendencia ? (
                      <>
                        <p className="px-3 pt-1 text-selo uppercase tracking-wider text-slate-500">
                          Estou esperando…
                        </p>
                        {disponiveis.map((tipo) => (
                          <button
                            key={tipo.id}
                            type="button"
                            data-dica={tipo.label}
                            data-dica-sub={tipo.hint}
                            data-dica-sempre
                            onClick={() => {
                              onAbrirPendencia(tipo.id);
                              setEscolhendoPendencia(false);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition hover:bg-slate-50"
                          >
                            <span className="shrink-0 text-rotulo">⏳</span>
                            <span className="min-w-0 flex-1 truncate text-xs text-slate-700">
                              {tipo.label}
                            </span>
                          </button>
                        ))}
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEscolhendoPendencia(true)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50"
                      >
                        + Abrir pendência
                      </button>
                    )
                  )}
                </div>
              )}

              {/*
                Os demais status aparecem em cinza, sem clique: mostrar que existem — e que este
                não é o momento deles — ensina o fluxo. Esconder faria a pessoa procurar.
              */}
              <div className="mt-1 border-t border-slate-100 pt-1">
                <p className="px-3 py-0.5 text-selo uppercase tracking-wider text-slate-500">
                  Indisponíveis a partir daqui
                </p>
                {STATUS_OPORTUNIDADE.filter(
                  (item) => item.id !== valor && !destinos.includes(item.id),
                ).map((item) => (
                  <span
                    key={item.id}
                    className="flex items-center gap-2 px-3 py-1 text-apoio text-slate-500"
                  >
                    <span className="size-1.5 shrink-0 rounded-full bg-slate-200" />
                    <span className="truncate">{item.label}</span>
                  </span>
                ))}
              </div>
            </motion.div>
          </Floating>
        )}
      </AnimatePresence>
    </>
  );
}
