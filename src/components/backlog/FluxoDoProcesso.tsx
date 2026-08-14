import { motion } from 'motion/react';
import {
  Archive, CheckCircle2, ChevronDown, ChevronUp, CircleSlash, PauseCircle, RotateCcw, Zap,
} from 'lucide-react';
import { Oportunidade, StatusOportunidade } from '../../types';
import {
  coresDoStatus, DESFECHOS, DIAS_FINALIZADOS_VISIVEIS, ETAPAS_FLUXO, finalizadasAntigas,
  getStatus,
  resumirDeclinios, resumirPorStatus,
} from '../../utils/oportunidades';
import { formatarMoeda } from '../../utils/moeda';

const ICONE_DESFECHO: Record<string, typeof CheckCircle2> = {
  fechado: CheckCircle2,
  standby: PauseCircle,
  declinado: CircleSlash,
  encerrado: Archive,
};

const COR_DESFECHO: Record<string, string> = {
  fechado: 'text-emerald-600',
  standby: 'text-yellow-600',
  declinado: 'text-rose-600',
  encerrado: 'text-slate-500',
};

interface FluxoDoProcessoProps {
  oportunidades: Oportunidade[];
  /** Etapa em foco; `null` mostra todas. */
  etapaAtiva: StatusOportunidade | null;
  onEtapaChange: (status: StatusOportunidade | null) => void;
  /**
   * Recolhido, o bloco vira uma faixa de uma linha.
   *
   * Ele custa **216px** — numa tela de 950px, isso é a diferença entre ver 5 e ver 9 linhas da
   * tabela. O estado vive na página e sobrevive ao F5: quem trabalha na lista o mantém fechado o
   * dia todo, e reabri-lo a cada visita seria pedir o mesmo clique para sempre.
   */
  recolhido: boolean;
  onRecolhidoChange: (valor: boolean) => void;
}

/**
 * Cabeçalho do quadro: o processo antes da tabela.
 *
 * Quem abre o Backlog vê primeiro **o fluxo**, depois os números de fechamento, e só então as
 * linhas. A ordem não é decorativa: uma tabela de 40 projetos sem o mapa do processo obriga cada
 * pessoa a reconstruir mentalmente em que ponto cada linha está.
 *
 * As etapas são clicáveis e filtram o quadro — o mapa é também a navegação.
 */
export function FluxoDoProcesso({
  oportunidades, etapaAtiva, onEtapaChange, recolhido, onRecolhidoChange,
}: FluxoDoProcessoProps) {
  const ativas = oportunidades.filter((op) => !getStatus(op.status).encerra).length;
  const antigas = finalizadasAntigas(oportunidades);
  /** Quebra por motivo, na mesma janela de 30 dias do card — senão as partes não somariam o todo. */
  const declinios = resumirDeclinios(oportunidades);

  /*
    Recolhido: uma faixa que continua informando e continua navegando.

    Não é o bloco escondido atrás de um botão mudo — o número de projetos em andamento fica à
    vista, e a etapa em foco também, porque é ela que explica por que a lista está recortada. Sem
    isso, quem recolhesse o bloco com uma etapa ativa veria uma tabela filtrada sem saber por quê.
  */
  if (recolhido) {
    const etapa = etapaAtiva ? getStatus(etapaAtiva) : null;
    return (
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <p className="flex items-center gap-1.5 text-rotulo font-bold uppercase tracking-wider text-slate-500">
          <Zap className="size-3 text-indigo-500" />
          Fluxo do processo
          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-selo text-indigo-700">
            {ativas} em andamento
          </span>
        </p>

        {etapa && (
          <button
            type="button"
            onClick={() => onEtapaChange(null)}
            data-dica={`Filtrando por ${etapa.label}`}
            data-dica-sub="Clique para ver todas as etapas"
            data-dica-sempre
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1 text-apoio font-medium text-white transition hover:bg-indigo-700"
          >
            {etapa.label}
            <span className="text-indigo-200">×</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onRecolhidoChange(false)}
          className="ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1 text-apoio font-medium text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          <ChevronDown className="size-3.5" />
          Mostrar fluxo
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 grid shrink-0 gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      {/*
        Fluxo — `flex-col` para o miolo poder se centrar no que sobra.

        As duas seções são irmãs num grid, e o grid as estica à mesma altura: a de Finalização tem
        quatro cards em duas linhas, a do Fluxo tem uma fileira só. A diferença virava um vazio de
        ~60px no pé do Fluxo, com tudo empurrado para cima — a assimetria que a operação apontou
        em 12/08/2026.
      */}
      <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-rotulo font-bold uppercase tracking-wider text-slate-500">
            <Zap className="size-3 text-indigo-500" />
            Fluxo do processo
            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-selo text-indigo-700">
              {ativas} em andamento
            </span>
          </p>

          <button
            type="button"
            onClick={() => onRecolhidoChange(true)}
            data-dica="Recolher o fluxo"
            data-dica-sub="Ganha espaço para a lista — o recorte por etapa continua visível na faixa"
            data-dica-sempre
            className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-apoio font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-600"
          >
            <ChevronUp className="size-3.5" />
            Recolher
          </button>

          <button
            type="button"
            onClick={() => onEtapaChange(null)}
            className={`rounded-lg px-2.5 py-1 text-apoio font-medium transition ${
              etapaAtiva === null
                ? 'bg-indigo-600 text-white'
                : 'text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            Todas
          </button>
        </div>

        {/*
          O miolo — etapas e legenda — **centrado no espaço que sobra**.

          `flex-1` toma a folga deixada pelo cabeçalho; `justify-center` a divide igualmente acima
          e abaixo. Sem isso o conteúdo ficava colado no topo e o vazio todo no pé, que é a leitura
          de "bloco inacabado" e não de "bloco com folga".
        */}
        <div className="flex flex-1 flex-col justify-center">
        {/*
          Etapas em **colunas de largura igual** — grid, não flex.

          Com `flex-1` + `min-w-fit` cada cartão media o próprio rótulo e crescia a partir dele:
          "Entrada" saía estreito e "Aguardando Feedback" largo, cinco larguras diferentes numa
          fileira que representa **um processo sequencial** — e a desigualdade sugeria peso onde só
          há ordem.

`minmax(min-content, 1fr)` foi a primeira resposta, e ela **transbordava** — 14/08/2026.

          `min-content` é um piso que o grid não pode furar: quando a janela estreitava, as colunas
          paravam de encolher e a fileira **vazava por cima do bloco de Finalização**, ao lado. Um
          usuário mandou o print: dois painéis sobrepostos, ilegíveis.

          O piso existia para proteger o rótulo do corte ("Aguardando F…", 11/08/2026), e a
          proteção continua — só que por **quebra de linha** em vez de largura mínima. As colunas
          agora encolhem até zero (`minmax(0, 1fr)`) e o rótulo passa para a segunda linha quando
          precisa. Nada some, nada trunca, e nada invade o vizinho.

          > A lição: piso rígido em contêiner elástico não protege — **transfere o problema para
          > quem está do lado**. Sobreposição é pior que qualquer truncamento.

          O número de colunas sai do catálogo: uma etapa nova entra na conta sozinha.
        */}
        <div
          /*
            Conectores `›` entre as etapas viveram aqui por uma tarde e saíram (12/08/2026): a
            operação não gostou, e o argumento se sustenta — a legenda logo abaixo já diz "fluxo
            sequencial do projeto" e os cartões são numerados (1, 2, 3, 4). A seta repetia em
            desenho o que o número e o texto já afirmavam, e num bloco pequeno repetição é ruído.
          */
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${ETAPAS_FLUXO.length}, minmax(0, 1fr))` }}
        >
          {ETAPAS_FLUXO.map((etapa) => {
            const status = getStatus(etapa.status);
            const resumo = resumirPorStatus(oportunidades, etapa.status);
            const ativa = etapaAtiva === etapa.status;
            const vazia = resumo.quantidade === 0;

            return (
              <motion.button
                key={etapa.status}
                type="button"
                onClick={() => onEtapaChange(ativa ? null : etapa.status)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.14 }}
                title={`${resumo.quantidade} em ${status.label}`}
                /*
                  A largura vem da **coluna do grid**, não do cartão.

                  O `min-w-fit` que morava aqui garantia que o rótulo nunca fosse cortado
                  ("Aguardando F…", 11/08/2026) — a mesma garantia agora está no
                  `minmax(min-content, 1fr)` do contêiner, e de lá ela vale para todos ao mesmo
                  tempo, o que é justamente o que produz colunas iguais.
                */
                className={`relative rounded-xl border py-2.5 pr-3 pl-4 text-left transition hover:shadow-md ${
                  ativa
                    ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                    : etapa.loop
                      ? 'border-amber-200 bg-amber-50/50 hover:border-amber-300'
                      : 'border-slate-200 hover:border-indigo-200'
                }`}
              >
                {/*
                  A **cor da etapa**, numa barra na borda esquerda.

                  É a mesma família de cor que a etiqueta usa na linha da tabela (`PALETA_STATUS`), e
                  é isso que o cartão ganha de informação: o azul do "Em Revisão" aqui é o azul do
                  "Em Revisão" lá embaixo. Antes os cinco eram brancos e idênticos, e a ligação
                  entre mapa e grade existia só no texto.

                  Na borda esquerda porque é onde o produto já marca estado de linha — o farol de
                  SLA usa a mesma posição ([03 §3.3.1]). O `pl-4` do cartão abre o lugar dela.
                */}
                <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${coresDoStatus(etapa.status).barra}`} />
                <span
                  className={`flex items-center gap-1 text-selo font-bold uppercase tracking-wider ${
                    etapa.loop ? 'text-amber-600' : 'text-slate-500'
                  }`}
                >
                  {etapa.loop ? (
                    <>
                      <RotateCcw className="size-2.5" />
                      Loop
                    </>
                  ) : (
                    `${etapa.numero}. ${etapa.rotulo}`
                  )}
                </span>

                <span className="mt-0.5 flex items-center justify-between gap-2">
                  {/*
                    Sem `truncate` e sem `nowrap`: o rótulo **quebra** quando a coluna aperta, que é
                    o que substituiu o piso de largura mínima (ver a nota do grid). "Aguardando
                    Feedback" em duas linhas continua inteiro; cortado, não.
                  */}
                  <span className="min-w-0 text-xs font-semibold leading-tight text-slate-700">
                    {status.label}
                  </span>
                  {/*
                    Zero recua; número vivo se destaca.

                    Num quadro em dia a maioria das etapas está zerada, e cinco caixinhas cinzas com
                    "0" competiam com a única que tinha trabalho dentro. O zero perde o fundo e vai
                    para `slate-300`; quem tem projeto fica em `slate-900` sobre branco — legível de
                    relance, sem gritar.
                  */}
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-rotulo font-bold ${
                      vazia
                        ? 'text-slate-300'
                        : 'bg-white text-slate-900 ring-1 ring-slate-200'
                    }`}
                  >
                    {resumo.quantidade}
                  </span>
                </span>

                {/*
                  **Quanto** há em cada etapa, e não só quantos — 12/08/2026.

                  Os cards de Finalização sempre mostraram o valor; os do fluxo, só a contagem. Era
                  a mesma pergunta respondida pela metade em cada lado do bloco: "dois em
                  elaboração" não diz se são dois projetos de mil ou de duzentos mil.

                  `resumirPorStatus` já devolvia o valor — ninguém o exibia. O `+N?` acompanha, como
                  nos desfechos: valor é texto livre, e um total que engole o que não entendeu
                  parece completo sem ser ([09 §2]).
                */}
                <span className="mt-1 block text-xs font-semibold text-slate-700">
                  {formatarMoeda(resumo.valor)}
                  {resumo.ilegiveis > 0 && (
                    <span
                      title={`${resumo.ilegiveis} registro(s) com valor não numérico ficaram fora da soma`}
                      className="ml-1 text-rotulo font-normal text-amber-600"
                    >
                      +{resumo.ilegiveis}?
                    </span>
                  )}
                </span>

              </motion.button>
            );
          })}
        </div>

        <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-rotulo text-slate-500">
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Fluxo sequencial do projeto
          </span>
          <span className="flex items-center gap-1 text-amber-600">
            <RotateCcw className="size-2.5" />
            Ajustes é um retorno entre Revisão e Feedback
          </span>
        </p>
        </div>
      </section>

      {/* Finalização */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-rotulo font-bold uppercase tracking-wider text-slate-500">
            <CheckCircle2 className="size-3 text-emerald-500" />
            Finalização
            <span className="font-normal normal-case tracking-normal text-slate-400">
              · últimos {DIAS_FINALIZADOS_VISIVEIS} dias
            </span>
          </p>
          <span className="text-selo font-bold uppercase tracking-wider text-slate-500">
            Totais &amp; qtd.
          </span>
        </div>

        {/*
          `auto-rows-fr`: as duas linhas ficam com a **mesma altura**.

          O card de Declinado carrega os motivos (`Internamente 1 · Talento 2`) e ficava mais alto
          que o Encerrado ao lado — duas linhas de alturas diferentes num bloco de resumo, que é
          onde o olho compara. Com as linhas em fração, a maior define as demais e os quatro cards
          viram um retângulo só.
        */}
        <div className="grid auto-rows-fr grid-cols-2 gap-2">
          {DESFECHOS.map((desfecho) => {
            const status = getStatus(desfecho);
            const resumo = resumirPorStatus(oportunidades, desfecho);
            const Icone = ICONE_DESFECHO[desfecho] ?? Archive;
            const ativa = etapaAtiva === desfecho;

            return (
              <motion.button
                key={desfecho}
                type="button"
                onClick={() => onEtapaChange(ativa ? null : desfecho)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.14 }}
                className={`relative rounded-xl border py-2 pr-3 pl-4 text-left transition hover:shadow-md ${
                  ativa ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/*
                  A cor do desfecho na borda esquerda — o mesmo tratamento das etapas.

                  Verde para fechado, âmbar para a pausa, rosa para declinado, cinza para encerrado:
                  é a cor que a etiqueta de status usa na linha da tabela. O bloco inteiro era
                  branco, e a única pista de qual card era qual estava no ícone e no texto.
                */}
                <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${coresDoStatus(desfecho).barra}`} />
                <span className="flex items-center justify-between gap-2">
                  <span className={`flex items-center gap-1.5 text-xs font-medium ${COR_DESFECHO[desfecho]}`}>
                    <Icone className="size-3.5 shrink-0" />
                    <span className="truncate">{status.label}</span>
                    {/*
                      StandBy vive neste bloco mas **não encerra**: volta para Aguardando Feedback.
                      Sem esta marca, o card diria que o projeto acabou — e ele está só pausado.
                    */}
                    {!status.encerra && (
                      <span
                        title="Pausa reversível — volta para Aguardando Feedback"
                        className="shrink-0 rounded bg-slate-100 px-1 py-0.5 text-selo font-bold uppercase tracking-wide text-slate-500"
                      >
                        Pausa
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-rotulo font-bold text-slate-600">
                    {resumo.quantidade}
                  </span>
                </span>

                <span className="mt-1 block text-xs font-semibold text-slate-700">
                  {formatarMoeda(resumo.valor)}
                  {/*
                    Valor é texto livre, então parte dele pode não ser somável. Dizer quantos
                    ficaram de fora evita que o total pareça completo quando não é.
                  */}
                  {resumo.ilegiveis > 0 && (
                    <span
                      title={`${resumo.ilegiveis} registro(s) com valor não numérico ficaram fora da soma`}
                      className="ml-1 text-rotulo font-normal text-amber-600"
                    >
                      +{resumo.ilegiveis}?
                    </span>
                  )}
                </span>

                {/*
                  Declinado abre por motivo — a distinção que o card existe para mostrar.

                  Interno, mercado e talento são decisões de negócio diferentes, e "12 declinados"
                  sem essa quebra não diz se o problema é de capacidade, de proposta ou de elenco.
                  Só aparece no card de Declinado, e só com registros para mostrar.
                */}
                {/*
                  Os motivos, um por linha, **sem repetir "Declinado"** — 12/08/2026.

                  Eram abreviados e colados na contagem ("Talento 2"), o que lia como o nome de um
                  talento numerado. A contagem foi para a direita, longe do nome, e o rótulo passou
                  a ser só a metade que varia (`soMotivo`): o "Declinado" já está no título do card,
                  logo acima. O `title` do hover continua trazendo o nome completo e o valor.
                */}
                {desfecho === 'declinado' && declinios.length > 0 && (
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {declinios.map((item) => (
                      <span
                        key={item.id}
                        title={`${item.labelCompleto}: ${item.quantidade} — ${formatarMoeda(item.valor)}`}
                        className="flex items-center gap-1 rounded bg-rose-50 px-1.5 py-0.5 text-rotulo font-medium text-rose-700 ring-1 ring-rose-100"
                      >
                        {item.label}
                        {/*
                          A contagem num **badge**, e não solta ao lado do nome.

                          É o que separa "Talento" de "2" sem precisar de uma linha por motivo:
                          colados viravam "Talento 2", que a operação leu como um talento numerado
                          (11/08/2026). O fundo próprio dá a pausa que o espaço não dava — e os três
                          motivos voltam a caber lado a lado, sem esticar o card.
                        */}
                        <strong className="rounded bg-rose-100 px-1 font-bold text-rose-800">
                          {item.quantidade}
                        </strong>
                      </span>
                    ))}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/*
          O que saiu da janela não some sem aviso: dizer quantos ficaram para trás evita que os
          números pareçam o total histórico quando são só o recorte recente.
        */}
        {antigas > 0 && (
          <p className="mt-2.5 text-rotulo leading-snug text-slate-500">
            <strong className="font-semibold text-slate-500">{antigas}</strong>{' '}
            {antigas === 1 ? 'finalizada há mais' : 'finalizadas há mais'} de{' '}
            {DIAS_FINALIZADOS_VISIVEIS} dias {antigas === 1 ? 'não aparece' : 'não aparecem'} aqui —
            o histórico completo fica no banco, para o Power BI.
          </p>
        )}
      </section>
    </div>
  );
}
