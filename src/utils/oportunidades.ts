/**
 * Oportunidades do Backlog — status, prioridade e origem.
 *
 * O quadro é a porta de entrada da operação: tudo que vira contrato passa por aqui primeiro,
 * venha de um e-mail, do Salesforce ou das mãos de quem atende.
 */

import {
  AlcanceAudiencia, AreaTalento, EntradaPorOportunidade, FormatoConteudo, ImpactoProjeto,
  InputOportunidade, MotivoDeclinio,
  Oportunidade, OrigemComercial, Pendencia, PrioridadeOportunidade, StatusOportunidade,
  TipoCaptacao_Producao, TipoEdicao, TipoOutput, TipoPendencia, TipoProjeto, TipoTalento,
} from '../types';
import { getSlaInfo } from './sla';
import { somarValores } from './moeda';

/* ------------------------------------------------------------------ *
 * Status
 * ------------------------------------------------------------------ */

/**
 * ================================================================================================
 * A PALETA DE STATUS — rampa fria, etiqueta preenchida, peso constante — 12/08/2026
 * ================================================================================================
 *
 * ## As quatro tentativas anteriores, e o que cada uma ensinou
 *
 * | Versão | O que era | Por que caiu |
 * |--------|-----------|--------------|
 * | Original | uma cor por status, escolhidas uma a uma | "muito carnaval": sete matizes de famílias conflitantes |
 * | Semântica | quatro matizes por significado | perdeu a distinção entre etapas, e pintou Entrada e Encerrado do mesmo cinza |
 * | Rampa suave | a rampa, em etiqueta clara com **texto colorido** | *"cores no quadro, e não na fonte, e menos pastéis"* |
 * | Rampa preenchida | a rampa, com os tons `600` do Tailwind | genérica: o `600` é o **pico de croma** das rampas padrão |
 *
 * Cada leitura da operação tirou um erro diferente. O da primeira não era *ter cor*: era a paleta
 * ser **arbitrária**. O da segunda foi jogar fora a distinção junto com o excesso. O da terceira,
 * acertar as cores e errar **onde elas moram** — num fundo de 5% de saturação, a cor não é a
 * etiqueta, é uma sugestão de cor atrás de um texto colorido. E o da quarta foi escolher os tons
 * **a dedo**, um por um, das rampas prontas: cores de demonstração, feitas para chamar atenção
 * sozinhas numa página, não para conviver quarenta vezes numa coluna.
 *
 * ## A paleta é construída, não escolhida
 *
 * Os tons vivem em `@theme` ([`index.css`](../index.css)) e são gerados por uma regra em OKLCH:
 * **claridade fixa** (o peso), **croma por papel** (0,10 no fluxo, 0,13 nos acentos), e o **matiz**
 * como única variável. Claridade constante é o que impede o carnaval — nenhum status puxa mais
 * atenção que outro —, e de quebra entrega os 4,5:1 da WCAG AA em todos eles sem conferência tom a
 * tom. O raciocínio inteiro está lá; aqui fica só o mapa status → tom.
 *
 * ## A cor mora no quadro
 *
 * A etiqueta é **preenchida**: fundo saturado, texto branco. É a cor que carrega o significado, e
 * o texto só precisa ser legível em cima dela — não precisa ser mais um portador de informação.
 *
 * ## A rampa
 *
 * O fluxo usa **quatro matizes vizinhos no espectro frio**, de 30 em 30 graus. Cores análogas lêem
 * como *uma família*, não como cores brigando: a diferença entre uma etapa e a seguinte é visível
 * de perto, e de longe o conjunto continua sendo um bloco só.
 *
 * A progressão acompanha o avanço: a Entrada é a cor da Elaboração **com o croma quase zerado** —
 * nada foi decidido ainda —, a saturação entra quando o trabalho começa, e o matiz esfria até o
 * violeta de quem está com o cliente.
 *
 * ```
 *   ENTRADA  →  EM ELABORAÇÃO  →  EM REVISÃO  →  AGUARDANDO FEEDBACK
 *    H 250        H 248             H 278           H 308
 *    C 0,03       C 0,10            C 0,11          C 0,11
 *   └──────────── a rampa fria: quatro vizinhas ────────────┘
 * ```
 *
 * ## Os acentos, e por que são só três
 *
 * | Tom | Onde | Por quê |
 * |-----|------|---------|
 * | **`acento-acao`** | Ajustes · StandBy | a **única quente** da paleta, e significa *parou, depende de alguém* — é o que precisa saltar numa coluna de quarenta linhas |
 * | `acento-ganho` | Negócio Fechado | acabou, e deu negócio |
 * | `acento-perda` | Declinado | acabou sem negócio |
 *
 * Eles ficam **fora da rampa** de propósito, e com croma maior: a rampa é o caso normal e fica
 * contida; o acento é a exceção, e exceção deve saltar.
 *
 * ## O Encerrado **recua** em vez de ganhar cor
 *
 * Ele foi o defeito da versão semântica: usava o mesmo cinza da Entrada, e começo e fim do
 * processo ficavam idênticos. É agora o **único vazado** da paleta — chip cinza claro, texto
 * apagado, numa coluna de blocos sólidos. O arquivamento não disputa atenção com nada, e a
 * diferença para a Entrada, que é um bloco cheio, se lê sem comparar lado a lado.
 */
const RAMPA = {
  /* A rampa fria do fluxo — quatro vizinhas, do quase-neutro ao violeta, todas no mesmo peso. */
  etapa1: {
    etiqueta: 'bg-etapa-1 text-white ring-etapa-1',
    barra: 'bg-etapa-1',
    dot: 'bg-etapa-1',
  },
  etapa2: {
    etiqueta: 'bg-etapa-2 text-white ring-etapa-2',
    barra: 'bg-etapa-2',
    dot: 'bg-etapa-2',
  },
  etapa3: {
    etiqueta: 'bg-etapa-3 text-white ring-etapa-3',
    barra: 'bg-etapa-3',
    dot: 'bg-etapa-3',
  },
  etapa4: {
    etiqueta: 'bg-etapa-4 text-white ring-etapa-4',
    barra: 'bg-etapa-4',
    dot: 'bg-etapa-4',
  },
  /* Os acentos — fora da rampa de propósito: eles marcam o que **sai** do curso normal. */
  acao: {
    etiqueta: 'bg-acento-acao text-white ring-acento-acao',
    barra: 'bg-acento-acao',
    dot: 'bg-acento-acao',
  },
  ganho: {
    etiqueta: 'bg-acento-ganho text-white ring-acento-ganho',
    barra: 'bg-acento-ganho',
    dot: 'bg-acento-ganho',
  },
  perda: {
    etiqueta: 'bg-acento-perda text-white ring-acento-perda',
    barra: 'bg-acento-perda',
    dot: 'bg-acento-perda',
  },
  /* O arquivado: o único vazado. Ele recua, e é isso que o separa da Entrada. */
  arquivado: {
    etiqueta: 'bg-slate-100 text-slate-500 ring-slate-300',
    barra: 'bg-slate-300',
    dot: 'bg-slate-300',
  },
} as const;

export const PALETA_STATUS: Record<StatusOportunidade, (typeof RAMPA)[keyof typeof RAMPA]> = {
  entrada: RAMPA.etapa1,
  elaboracao: RAMPA.etapa2,
  revisao: RAMPA.etapa3,
  aguardando_feedback: RAMPA.etapa4,
  ajuste: RAMPA.acao,
  standby: RAMPA.acao,
  fechado: RAMPA.ganho,
  declinado: RAMPA.perda,
  encerrado: RAMPA.arquivado,
};

export const STATUS_OPORTUNIDADE: {
  id: StatusOportunidade;
  label: string;
  /** O SLA de triagem corre neste status? */
  emTriagem?: boolean;
  /** Fim de linha: não há mais o que acompanhar. */
  encerra?: boolean;
}[] = [
  { id: 'entrada', label: 'Entrada', emTriagem: true },
  { id: 'elaboracao', label: 'Em Elaboração' },
  { id: 'revisao', label: 'Em Revisão' },
  { id: 'aguardando_feedback', label: 'Aguardando Feedback' },
  { id: 'ajuste', label: 'Ajustes' },
  { id: 'standby', label: 'StandBy' },
  { id: 'fechado', label: 'Negócio Fechado', encerra: true },
  { id: 'declinado', label: 'Declinado', encerra: true },
  { id: 'encerrado', label: 'Encerrado', encerra: true },
];

/**
 * As classes de cor de um status.
 *
 * A cor **não mora no catálogo de status** de propósito: foi assim que a paleta chegou a sete
 * matizes arbitrários — um status novo, uma cor nova, sem ninguém olhar o conjunto. Aqui, um
 * status novo escolhe um degrau da rampa ou um acento que já existe.
 */
export function coresDoStatus(id: StatusOportunidade) {
  return PALETA_STATUS[id] ?? RAMPA.etapa1;
}

export function getStatus(id: StatusOportunidade) {
  return STATUS_OPORTUNIDADE.find((status) => status.id === id) ?? STATUS_OPORTUNIDADE[0];
}

/**
 * A oportunidade saiu da triagem?
 *
 * O SLA mede o **tempo de resposta**, não o de vida do projeto: sair de `entrada` já cumpre a
 * promessa, mesmo que o projeto siga meses em elaboração.
 */
export function saiuDaTriagem(oportunidade: Oportunidade): boolean {
  return !getStatus(oportunidade.status).emTriagem;
}

export function slaDaOportunidade(oportunidade: Oportunidade, referencia = new Date()) {
  return getSlaInfo(
    {
      entradaEm: oportunidade.entradaEm,
      prazoEm: oportunidade.prazoEm,
      encerrada: saiuDaTriagem(oportunidade),
    },
    referencia,
  );
}

/**
 * As etapas do fluxo, como a operação as desenha.
 *
 * Diferente de `STATUS_OPORTUNIDADE`, que é a lista completa: aqui só o **caminho principal**,
 * numerado, com o loop de ajuste destacado. É o mapa que o cabeçalho do quadro exibe — quem abre
 * a tela precisa entender o processo antes de entender a tabela.
 */
export const ETAPAS_FLUXO: {
  numero: number | null;
  rotulo: string;
  status: StatusOportunidade;
  /** Etapa de retorno, fora da sequência numerada. */
  loop?: boolean;
}[] = [
  { numero: 1, rotulo: 'Início', status: 'entrada' },
  { numero: 2, rotulo: 'Produção', status: 'elaboracao' },
  { numero: 3, rotulo: 'Análise', status: 'revisao' },
  { numero: null, rotulo: 'Loop', status: 'ajuste', loop: true },
  { numero: 4, rotulo: 'Retorno', status: 'aguardando_feedback' },
];

/**
 * Os quatro cards do bloco de fechamento do cabeçalho.
 *
 * **StandBy está aqui como pausa, não como desfecho.** Ele é o único da lista que volta ao fluxo
 * — para Aguardando Feedback —, e por isso não tem `encerra: true`: continua contando como
 * projeto vivo na lista e no farol. Fica no bloco porque a pergunta que ele responde é a mesma
 * dos outros três: *o que saiu da fila de trabalho, e por quê*.
 */
export const DESFECHOS: StatusOportunidade[] = ['fechado', 'standby', 'declinado', 'encerrado'];

/** Os que realmente encerram — sem volta pelo fluxo. */
export const DESFECHOS_TERMINAIS: StatusOportunidade[] = DESFECHOS.filter(
  (status) => getStatus(status).encerra,
);

/**
 * Janela de finalizados que a tela ainda mostra, em dias.
 *
 * O quadro é ferramenta de **controle de processo**, não de análise: quem quer série histórica usa
 * o Power BI sobre o banco. Manter anos de projetos encerrados na lista só faria a operação rolar
 * por cima deles todos os dias para chegar ao que está vivo.
 *
 * Trinta dias é o suficiente para "o que fechamos recentemente" continuar à mão.
 */
export const DIAS_FINALIZADOS_VISIVEIS = 30;

/** Converte `yyyy-mm-dd` em Date local à meia-noite — evita o deslocamento de fuso do UTC. */
function parseData(iso: string): Date | null {
  if (!iso) return null;
  const [ano, mes, dia] = iso.split('-').map(Number);
  if (!ano || !mes || !dia) return null;
  return new Date(ano, mes - 1, dia);
}

/** Foi finalizada dentro da janela visível? */
export function finalizadaRecentemente(
  oportunidade: Oportunidade,
  referencia = new Date(),
): boolean {
  if (!getStatus(oportunidade.status).encerra) return false;

  const desde = parseData(oportunidade.statusDesde);
  if (!desde) return true;   // Sem data, é melhor mostrar do que sumir com o registro.

  const hoje = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
  const dias = Math.floor((hoje.getTime() - desde.getTime()) / 86_400_000);
  return dias <= DIAS_FINALIZADOS_VISIVEIS;
}

/**
 * O que a lista mostra quando nenhuma etapa está em foco.
 *
 * **Só o que está em andamento.** Os finalizados vivem no bloco Finalização do cabeçalho, e
 * aparecem na lista quando alguém clica num deles — a consulta é deliberada, não o padrão.
 */
export function emAndamento(oportunidades: Oportunidade[]): Oportunidade[] {
  return oportunidades.filter((op) => !getStatus(op.status).encerra);
}

/** Finalizadas fora da janela — contadas para não parecer que o dado sumiu. */
export function finalizadasAntigas(
  oportunidades: Oportunidade[],
  referencia = new Date(),
): number {
  return oportunidades.filter(
    (op) => getStatus(op.status).encerra && !finalizadaRecentemente(op, referencia),
  ).length;
}

export interface ResumoEtapa {
  status: StatusOportunidade;
  quantidade: number;
  /** Soma de `valorProjeto`; ver `moeda.ts` sobre o que não é legível. */
  valor: number;
  ilegiveis: number;
}

/**
 * Resumo de um status para o cabeçalho.
 *
 * Nos **desfechos**, conta só os finalizados dentro da janela de 30 dias — é o mesmo conjunto que
 * a lista mostra ao clicar no card. Um número que não bate com a lista que ele abre é um número
 * que ninguém confia.
 */
export function resumirPorStatus(
  oportunidades: Oportunidade[],
  status: StatusOportunidade,
  referencia = new Date(),
): ResumoEtapa {
  const encerra = Boolean(getStatus(status).encerra);
  const doStatus = oportunidades.filter(
    (op) => op.status === status && (!encerra || finalizadaRecentemente(op, referencia)),
  );
  const { total, ilegiveis } = somarValores(doStatus.map((op) => op.valorProjeto));
  return { status, quantidade: doStatus.length, valor: total, ilegiveis };
}

/* ------------------------------------------------------------------ *
 * Motivo do declínio
 * ------------------------------------------------------------------ */

/**
 * As três origens de uma recusa.
 *
 * `label` é o nome completo — usado onde há espaço: o menu de decisão e o card de Finalização.
 * `curto` é o que cabe na etiqueta da linha, onde a coluna tem pouco mais de 100px.
 */
/**
 * Os três motivos, com **um rótulo por lugar** — cada um tem espaço e contexto diferentes.
 *
 * | Campo | Onde | Exemplo |
 * |-------|------|---------|
 * | `label` | menu de decisão, `title` | `Declinado pelo Talento` |
 * | `curto` | etiqueta da linha | `Decl. Talento` — a coluna Status tem ~106px |
 * | `soMotivo` | card de Finalização | `Talento` — o título do card já diz "Declinado" |
 *
 * `soMotivo` entrou em 12/08/2026. O card exibia `curto` com a contagem colada (`Talento 2`), e a
 * operação leu como o nome de um talento numerado; a primeira correção pôs o `label` inteiro, e aí
 * cada linha repetia "Declinado" logo abaixo de um cabeçalho escrito **Declinado**. O que o card
 * precisa é só a metade que varia — a outra metade está a três centímetros dali, no título.
 */
export const MOTIVOS_DECLINIO: {
  id: MotivoDeclinio;
  label: string;
  curto: string;
  /** O motivo sem o "Declinado" — para onde o contexto já o disse. */
  soMotivo: string;
  hint: string;
}[] = [
  {
    id: 'interno',
    label: 'Declinado Internamente',
    curto: 'Interno',
    soMotivo: 'Internamente',
    hint: 'A agência recusou — capacidade, agenda, conflito ou fit',
  },
  {
    id: 'mercado',
    label: 'Declinado pelo Mercado',
    curto: 'Mercado',
    soMotivo: 'Mercado',
    hint: 'O cliente desistiu, escolheu outro caminho ou não avançou',
  },
  {
    id: 'talento',
    label: 'Declinado pelo Talento',
    curto: 'Talento',
    soMotivo: 'Talento',
    hint: 'O talento não aceitou o projeto',
  },
];

export function getMotivoDeclinio(id: MotivoDeclinio | undefined) {
  return MOTIVOS_DECLINIO.find((motivo) => motivo.id === id);
}

/**
 * Rótulo do status já com o motivo, quando existe.
 *
 * Um declínio sem motivo continua legível como "Declinado" — dado antigo e importação não podem
 * quebrar a tela por não conhecerem um campo criado depois deles.
 */
export function rotuloDoStatus(
  status: StatusOportunidade,
  motivoId?: MotivoDeclinio,
  curto = false,
): string {
  const base = getStatus(status).label;
  if (status !== 'declinado') return base;

  const motivo = getMotivoDeclinio(motivoId);
  if (!motivo) return base;
  return curto ? `Decl. ${motivo.curto}` : motivo.label;
}

export interface ResumoDeclinio {
  id: MotivoDeclinio | 'sem_motivo';
  /** Só o motivo — o card já tem "Declinado" no título. */
  label: string;
  /** O nome por extenso, para a dica do hover, onde não há título ao lado explicando. */
  labelCompleto: string;
  quantidade: number;
  valor: number;
}

/**
 * Quebra dos declínios por motivo, dentro da mesma janela de 30 dias do card.
 *
 * Só entram os motivos com pelo menos um registro — um card com três zeros ocuparia espaço para
 * dizer que não há nada a dizer. Declínios sem motivo aparecem à parte, para que a soma das
 * partes continue batendo com o total do card.
 */
export function resumirDeclinios(
  oportunidades: Oportunidade[],
  referencia = new Date(),
): ResumoDeclinio[] {
  const declinadas = oportunidades.filter(
    (op) => op.status === 'declinado' && finalizadaRecentemente(op, referencia),
  );

  const resumo = (
    id: MotivoDeclinio | 'sem_motivo',
    label: string,
    labelCompleto: string,
    itens: Oportunidade[],
  ): ResumoDeclinio => ({
    id,
    label,
    labelCompleto,
    quantidade: itens.length,
    valor: somarValores(itens.map((op) => op.valorProjeto)).total,
  });

  /*
    O rótulo é **só o motivo** — o "Declinado" está no título do card, três centímetros acima.

    Duas correções em dois dias, e as duas vieram da tela: `curto` com a contagem colada produzia
    "Talento 2", que lia como um talento numerado; o `label` inteiro resolveu a ambiguidade e criou
    outra coisa — três linhas repetindo "Declinado" sob um cabeçalho escrito **Declinado**.
    `soMotivo` guarda a metade que varia, e a contagem foi para a direita da linha, longe do nome.
  */
  const porMotivo = MOTIVOS_DECLINIO.map((motivo) =>
    resumo(
      motivo.id,
      motivo.soMotivo,
      motivo.label,
      declinadas.filter((op) => op.motivoDeclinio === motivo.id),
    ),
  );

  const semMotivo = declinadas.filter((op) => !getMotivoDeclinio(op.motivoDeclinio));
  if (semMotivo.length > 0) porMotivo.push(resumo('sem_motivo', 'Sem motivo', 'Declinado sem motivo registrado', semMotivo));

  return porMotivo.filter((item) => item.quantidade > 0);
}

/* ------------------------------------------------------------------ *
 * Prioridade
 * ------------------------------------------------------------------ */

export const PRIORIDADES: {
  id: PrioridadeOportunidade;
  label: string;
  chip: string;
  dot: string;
}[] = [
  { id: 'alta', label: 'Alta', chip: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
  { id: 'media', label: 'Média', chip: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  { id: 'baixa', label: 'Baixa', chip: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
];

/**
 * Prioridade da lista, ou `undefined` quando ninguém classificou.
 *
 * Devolver um default mascararia a diferença entre "média" e "por definir" — e é essa diferença
 * que faz o filtro e o relatório contarem certo.
 */
export function getPrioridade(id?: PrioridadeOportunidade) {
  return PRIORIDADES.find((prioridade) => prioridade.id === id);
}

/* ------------------------------------------------------------------ *
 * Origem
 * ------------------------------------------------------------------ */

export const ENTRADAS_POR: {
  id: EntradaPorOportunidade;
  label: string;
  descricao: string;
  chip: string;
  /** Entra precisando de conferência humana. */
  automatica: boolean;
}[] = [
  {
    id: 'manual',
    label: 'Manual',
    descricao: 'Cadastrada por alguém do time.',
    chip: 'bg-slate-100 text-slate-600 ring-slate-200',
    automatica: false,
  },
  {
    id: 'email',
    label: 'E-mail',
    descricao: 'Lida da caixa de entrada pelo agente.',
    chip: 'bg-sky-50 text-sky-700 ring-sky-200',
    automatica: true,
  },
  {
    id: 'salesforce',
    label: 'Salesforce',
    descricao: 'Oportunidade criada no CRM.',
    chip: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    automatica: true,
  },
];

export function getEntradaPor(id: EntradaPorOportunidade) {
  return ENTRADAS_POR.find((entrada) => entrada.id === id) ?? ENTRADAS_POR[0];
}

/* ------------------------------------------------------------------ *
 * Campos comerciais — o vocabulário da operação
 * ------------------------------------------------------------------ */

/** De qual frente comercial o negócio vem. */
export const ORIGENS_COMERCIAIS: { id: OrigemComercial; label: string }[] = [
  { id: 'globoplay', label: 'Globoplay' },
  { id: 'tv_globo', label: 'TV Globo' },
  { id: 'canais_pagos', label: 'Canais Pagos' },
  { id: 'viu_agencia', label: 'VIU Agência' },
  { id: 'outros', label: 'Outros' },
];

export function getOrigemComercial(id?: OrigemComercial) {
  return ORIGENS_COMERCIAIS.find((origem) => origem.id === id);
}

/** Como a demanda chegou até a área comercial. */
export const INPUTS: { id: InputOportunidade; label: string }[] = [
  { id: 'interno', label: 'Interno' },
  { id: 'mercado', label: 'Mercado' },
  { id: 'inbound', label: 'Inbound' },
  { id: 'proativo', label: 'Proativo' },
  { id: 'viu_first', label: 'VIU First' },
];

export function getInput(id?: InputOportunidade) {
  return INPUTS.find((input) => input.id === id);
}

/** Natureza do projeto. */
export const TIPOS_PROJETO: { id: TipoProjeto; label: string }[] = [
  { id: 'patrocinio', label: 'Patrocínio' },
  { id: 'sob_demanda', label: 'Sob Demanda' },
  { id: 'projeto_especial', label: 'Projeto Especial' },
  { id: 'outro', label: 'Outro' },
];

export function getTipoProjeto(id?: TipoProjeto) {
  return TIPOS_PROJETO.find((tipo) => tipo.id === id);
}

/** Precisa de conferência: veio de integração e ninguém confirmou ainda. */
export function precisaRevisao(oportunidade: Oportunidade): boolean {
  return getEntradaPor(oportunidade.entradaPor).automatica && !oportunidade.revisada;
}

/* ------------------------------------------------------------------ *
 * Nomeação e filtros
 * ------------------------------------------------------------------ */

/** Ids das pessoas responsáveis — a mesma pessoa pode cobrir várias áreas. */
export function nomeadosDaOportunidade(oportunidade: Oportunidade): string[] {
  /*
    **Apoio conta como nomeado.**

    A regra de acesso pergunta "esta pessoa está nesta linha?", e quem apoia precisa enxergá-la
    para poder apoiar. O papel distingue de quem se cobra a entrega — não quem pode ver.
  */
  return [
    ...new Set([
      ...(Object.values(oportunidade.responsaveis).flat().filter(Boolean) as string[]),
      ...(Object.values(oportunidade.apoios ?? {}).flat().filter(Boolean) as string[]),
    ]),
  ];
}

export function responsaveisDaAreaNaOportunidade(
  oportunidade: Oportunidade,
  area: AreaTalento,
): string[] {
  return oportunidade.responsaveis[area] ?? [];
}

export function alternarResponsavelNaOportunidade(
  oportunidade: Oportunidade,
  area: AreaTalento,
  usuarioId: string,
): Oportunidade {
  const atuais = responsaveisDaAreaNaOportunidade(oportunidade, area);
  const proximos = atuais.includes(usuarioId)
    ? atuais.filter((id) => id !== usuarioId)
    : [...atuais, usuarioId];

  const responsaveis = { ...oportunidade.responsaveis };
  if (proximos.length > 0) responsaveis[area] = proximos;
  else delete responsaveis[area];

  return { ...oportunidade, responsaveis };
}

export type FiltroOportunidade =
  | 'todas' | 'triagem' | 'andamento' | 'atrasadas' | 'revisar' | 'fechadas';

export function matchesFiltroOportunidade(
  oportunidade: Oportunidade,
  filtro: FiltroOportunidade,
  referencia = new Date(),
): boolean {
  const status = getStatus(oportunidade.status);

  switch (filtro) {
    case 'todas':
      return true;
    case 'triagem':
      return Boolean(status.emTriagem);
    case 'andamento':
      return !status.emTriagem && !status.encerra;
    case 'atrasadas':
      return slaDaOportunidade(oportunidade, referencia).tone === 'vermelho';
    case 'revisar':
      return precisaRevisao(oportunidade);
    case 'fechadas':
      // Mesma janela do cabeçalho: o filtro não pode mostrar mais do que o card promete.
      return Boolean(status.encerra) && finalizadaRecentemente(oportunidade, referencia);
    default:
      return true;
  }
}

/**
 * Totais do rodapé — a leitura rápida do grupo aberto.
 *
 * Farol de SLA, interveniência e distribuição de input. São os números que a operação confere de
 * relance para saber se o dia está sob controle.
 */
export interface TotaisRodape {
  total: number;
  slaAtrasados: number;
  slaAtencao: number;
  slaNoPrazo: number;
  /** Quantos têm talento exclusivo da casa. Era `comInterveniencia`, o oposto, até 03/08/2026. */
  exclusivos: number;
  porInput: Record<InputOportunidade, number>;
  /** Quantas ainda não foram classificadas por input. */
  semInput: number;
}

export function totaisDoRodape(
  oportunidades: Oportunidade[],
  referencia = new Date(),
): TotaisRodape {
  const porInput = INPUTS.reduce(
    (acc, input) => ({ ...acc, [input.id]: 0 }),
    {} as Record<InputOportunidade, number>,
  );

  let slaAtrasados = 0;
  let slaAtencao = 0;
  let slaNoPrazo = 0;
  let exclusivos = 0;
  let semInput = 0;

  for (const op of oportunidades) {
    const tone = slaDaOportunidade(op, referencia).tone;
    if (tone === 'vermelho') slaAtrasados += 1;
    else if (tone === 'amarelo') slaAtencao += 1;
    else if (tone === 'verde') slaNoPrazo += 1;
    // Cinza (já triada) não entra em nenhum: o farol mede quem ainda espera resposta.

    if (op.exclusivo) exclusivos += 1;
    /*
      Sem input, não conta em input nenhum — e conta em `semInput`.

      Distribuir o não classificado por um default inflaria uma das faixas com projetos que
      ninguém classificou. O rodapé prefere admitir a lacuna a inventar um número.
    */
    if (op.input) porInput[op.input] = (porInput[op.input] ?? 0) + 1;
    else semInput += 1;
  }

  return {
    total: oportunidades.length,
    slaAtrasados, slaAtencao, slaNoPrazo, exclusivos, porInput, semInput,
  };
}

export interface ContagemOportunidades {
  todas: number;
  triagem: number;
  andamento: number;
  atrasadas: number;
  revisar: number;
  fechadas: number;
}

/**
 * Contagem por filtro.
 *
 * `atrasadas` e `revisar` **cruzam** com os demais — são recortes de atenção, não fatias do
 * pipeline. Somar tudo não dá o total, e é o esperado.
 */
export function contarOportunidades(
  oportunidades: Oportunidade[],
  referencia = new Date(),
): ContagemOportunidades {
  const conta = (filtro: FiltroOportunidade) =>
    oportunidades.filter((o) => matchesFiltroOportunidade(o, filtro, referencia)).length;

  return {
    todas: oportunidades.length,
    triagem: conta('triagem'),
    andamento: conta('andamento'),
    atrasadas: conta('atrasadas'),
    revisar: conta('revisar'),
    fechadas: conta('fechadas'),
  };
}

/**
 * Ordem própria dos campos que têm uma — o resto compara como texto.
 *
 * Ordenar `status` ou `prioridade` alfabeticamente produz uma sequência sem sentido para quem lê:
 * "Alta, Baixa, Média" na urgência, e "Aguardando Feedback, Ajuste, Declinado…" num campo cuja
 * ordem natural é a do fluxo. Quem clica no cabeçalho quer a ordem da operação, não a do dicionário.
 */
const ORDEM_CANONICA: Record<string, string[]> = {
  /*
    A ordem é a do **mapa do processo**, não a de `STATUS_OPORTUNIDADE`.

    As duas listas divergem: no mapa, Ajuste aparece antes de Aguardando Feedback (é o loop de
    retorno, desenhado junto da Revisão que o origina); no catálogo, depois. Ordenar pelo catálogo
    faria a coluna Status discordar do mapa logo acima dela — duas leituras da mesma tela dizendo
    coisas diferentes sobre a mesma sequência.

    `ETAPAS_FLUXO` cobre as cinco etapas ativas e `DESFECHOS` os quatro finais: juntos, os nove.
  */
  status: [...ETAPAS_FLUXO.map((etapa) => etapa.status), ...DESFECHOS],
  prioridade: PRIORIDADES.map((item) => item.id),
};

/** Compara duas oportunidades por um campo, respeitando a ordem própria quando existe. */
export function compararPorCampo(a: Oportunidade, b: Oportunidade, campo: string): number {
  const escala = ORDEM_CANONICA[campo];
  if (escala) {
    // Valor fora da escala vai para o fim, em vez de fingir que é o primeiro.
    const posicao = (valor: unknown) => {
      const indice = escala.indexOf(String(valor));
      return indice === -1 ? escala.length : indice;
    };
    return posicao(a[campo as keyof Oportunidade]) - posicao(b[campo as keyof Oportunidade]);
  }

  // Exclusivo é booleano: "sim" antes de "não" é mais útil que "false" antes de "true".
  if (campo === 'exclusivo') return Number(b.exclusivo) - Number(a.exclusivo);

  return String(a[campo as keyof Oportunidade] ?? '')
    .localeCompare(String(b[campo as keyof Oportunidade] ?? ''), 'pt-BR');
}

/* ------------------------------------------------------------------ *
 * Exclusividade
 * ------------------------------------------------------------------ */

/**
 * O talento deste projeto é exclusivo da casa?
 *
 * **Exclusividade é consequência do vínculo, não uma escolha.** Um talento exclusivo é agenciado
 * pela VIU, que contrata direto. Quando não é, quem o representa precisa figurar no contrato como
 * interveniente anuente — é o mesmo fato, lido pelo lado que a operação usa para falar dele.
 *
 * Por isso a regra é derivada:
 *
 * | Vínculo do talento | Exclusivo |
 * |--------------------|-----------|
 * | `exclusivo` | **sim** |
 * | `interveniencia` | não |
 * | sem talento definido | indefinido |
 * | nome sem ficha | indefinido |
 *
 * Enquanto era campo digitado à parte, o quadro permitia um estado que não existe no mundo real:
 * um projeto com talento não-exclusivo marcado como exclusivo. Dois campos dizendo a mesma coisa
 * por caminhos diferentes sempre acabam discordando.
 *
 * Devolve `undefined` — e não `false` — quando não há como saber. A ausência de talento não é
 * ausência de exclusividade: é ausência de resposta.
 *
 * > **Trocou de lado em 03/08/2026.** Chamava-se `intervenienciaDe` e devolvia o inverso. A coluna
 * > passou a se chamar "Exclusivo" a pedido da operação, e manter o campo guardando o oposto do
 * > que a tela mostra é a armadilha que este módulo inteiro existe para evitar.
 */
export function exclusividadeDe(
  oportunidade: Pick<Oportunidade, 'talento' | 'talentoId'>,
  talentos: { id: string; nome: string; tipo: TipoTalento }[],
): boolean | undefined {
  if (!oportunidade.talento?.trim()) return undefined;

  /*
    Procura pelo vínculo (`talentoId`) e, se não houver, pelo nome.

    O id é a ligação confiável; o nome cobre o registro que veio de integração e ainda não foi
    casado com uma ficha.
  */
  const ficha =
    (oportunidade.talentoId && talentos.find((t) => t.id === oportunidade.talentoId)) ||
    talentos.find((t) => t.nome.trim().toLowerCase() === oportunidade.talento.trim().toLowerCase());

  if (!ficha) return undefined;
  return ficha.tipo === 'exclusivo';
}

/* ------------------------------------------------------------------ *
 * Papel por área
 * ------------------------------------------------------------------ */

/** Papel de uma pessoa numa área do projeto. */
export type PapelNaArea = 'responsavel' | 'apoio';

export function apoiosDaAreaNaOportunidade(
  oportunidade: Oportunidade,
  area: AreaTalento,
): string[] {
  return oportunidade.apoios?.[area] ?? [];
}

/** O papel que a pessoa ocupa nesta área, ou `null` se não está na linha. */
export function papelNaArea(
  oportunidade: Oportunidade,
  area: AreaTalento,
  usuarioId: string,
): PapelNaArea | null {
  if (responsaveisDaAreaNaOportunidade(oportunidade, area).includes(usuarioId)) return 'responsavel';
  if (apoiosDaAreaNaOportunidade(oportunidade, area).includes(usuarioId)) return 'apoio';
  return null;
}

/**
 * Coloca a pessoa num papel — ou a tira da área, com `null`.
 *
 * Ela sai das **duas** listas antes de ser reinserida: migrar de apoio para responsável é a mesma
 * operação, e ninguém fica nos dois papéis ao mesmo tempo. É o mesmo desenho de `definirPapel`,
 * usado no quadro de Contratos.
 */
export function definirPapelNaArea(
  oportunidade: Oportunidade,
  area: AreaTalento,
  usuarioId: string,
  papel: PapelNaArea | null,
): Oportunidade {
  const responsaveis = responsaveisDaAreaNaOportunidade(oportunidade, area)
    .filter((id) => id !== usuarioId);
  const apoios = apoiosDaAreaNaOportunidade(oportunidade, area).filter((id) => id !== usuarioId);

  if (papel === 'responsavel') responsaveis.push(usuarioId);
  if (papel === 'apoio') apoios.push(usuarioId);

  return {
    ...oportunidade,
    responsaveis: { ...oportunidade.responsaveis, [area]: responsaveis },
    apoios: { ...(oportunidade.apoios ?? {}), [area]: apoios },
  };
}

/** Clicar no papel que a pessoa já tem a remove da área — o mesmo gesto põe e tira. */
export function alternarPapelNaArea(
  oportunidade: Oportunidade,
  area: AreaTalento,
  usuarioId: string,
  papel: PapelNaArea,
): Oportunidade {
  const atual = papelNaArea(oportunidade, area, usuarioId);
  return definirPapelNaArea(oportunidade, area, usuarioId, atual === papel ? null : papel);
}

/* ------------------------------------------------------------------ *
 * Entrega
 * ------------------------------------------------------------------ */

/**
 * O que será entregue.
 *
 * A ordem é a do esforço crescente — do post à presença física. Quem varre a coluna lê a escala
 * sem precisar decorá-la.
 */
export const TIPOS_OUTPUT: { id: TipoOutput; label: string; hint: string }[] = [
  { id: 'post', label: 'Post', hint: 'Publicação estática no feed' },
  { id: 'reels', label: 'Reels', hint: 'Vídeo curto vertical' },
  { id: 'stories', label: 'Stories', hint: 'Sequência efêmera' },
  { id: 'video', label: 'Vídeo', hint: 'Peça audiovisual produzida' },
  { id: 'live', label: 'Live', hint: 'Transmissão ao vivo' },
  { id: 'evento', label: 'Evento', hint: 'Presença física do talento' },
  { id: 'merchandising', label: 'Merchandising', hint: 'Inserção em programa ou conteúdo de terceiro' },
];

export function getTipoOutput(id: TipoOutput | undefined) {
  return TIPOS_OUTPUT.find((tipo) => tipo.id === id);
}

/**
 * Quanto o projeto pesa.
 *
 * As cores **não repetem as de prioridade** de propósito: as duas colunas convivem no quadro, e
 * ver "alta" vermelha ao lado de "alto" vermelho faria as duas parecerem a mesma escala. Impacto
 * usa a escala fria — é tamanho, não urgência.
 */
export const IMPACTOS: { id: ImpactoProjeto; label: string; chip: string; dot: string }[] = [
  { id: 'alto', label: 'Alto', chip: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500' },
  { id: 'medio', label: 'Médio', chip: 'bg-sky-50 text-sky-700 ring-sky-200', dot: 'bg-sky-500' },
  { id: 'baixo', label: 'Baixo', chip: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
];

/** `undefined` para ausente ou desconhecido — "não avaliado" não é "baixo". */
export function getImpacto(id: ImpactoProjeto | undefined) {
  return IMPACTOS.find((impacto) => impacto.id === id);
}

/* ------------------------------------------------------------------ *
 * Produção
 * ------------------------------------------------------------------ */

/**
 * Quem edita o material.
 *
 * A ordem vai do que a casa controla ao que ela não controla — é a mesma ordem em que o risco de
 * prazo cresce.
 */
export const TIPOS_EDICAO: { id: TipoEdicao; label: string; hint: string }[] = [
  { id: 'interna', label: 'Interna', hint: 'A casa edita' },
  { id: 'talento', label: 'Talento', hint: 'O próprio talento edita' },
  { id: 'agencia', label: 'Agência', hint: 'A agência do cliente edita' },
  { id: 'produtora', label: 'Produtora', hint: 'Produtora contratada edita' },
];

export function getTipoEdicao(id: TipoEdicao | undefined) {
  return TIPOS_EDICAO.find((tipo) => tipo.id === id);
}

/**
 * O formato editorial da peça — coluna **Conteúdo** da aba Produção, desde 03/08/2026.
 *
 * A ordem vai do mais comercial ao menos: publieditorial é peça paga assumida, institucional fala
 * pela marca sem produto. Quem varre a coluna lê a escala de comercialidade sem decorá-la — o mesmo
 * critério de ordenação das captações, que vão do mais caro ao mais barato.
 */
export const FORMATOS_CONTEUDO: { id: FormatoConteudo; label: string; hint: string }[] = [
  { id: 'publieditorial', label: 'Publieditorial', hint: 'Peça paga, assumidamente publicitária' },
  { id: 'review', label: 'Review', hint: 'O talento avalia o produto' },
  { id: 'tutorial', label: 'Tutorial', hint: 'Ensina a usar' },
  { id: 'depoimento', label: 'Depoimento', hint: 'Relato pessoal de uso' },
  { id: 'entretenimento', label: 'Entretenimento', hint: 'A marca entra no conteúdo, sem vender' },
  { id: 'institucional', label: 'Institucional', hint: 'Fala pela marca, não pelo produto' },
];

export function getFormatoConteudo(id: FormatoConteudo | undefined) {
  return FORMATOS_CONTEUDO.find((formato) => formato.id === id);
}

/**
 * O porte do alcance — coluna **Audiência** da aba Produção, desde 03/08/2026.
 *
 * Do mais amplo ao mais restrito, que é como a operação fala do assunto.
 *
 * **Não é o Impacto.** Impacto mede quanto o projeto pesa para a casa e vive na Demanda; alcance
 * mede quanta gente a peça atinge e vive aqui. Um projeto pequeno pode falar com a massa, e um
 * grande pode ser de nicho — o cruzamento dos dois é o que a operação usa para decidir prioridade.
 */
export const ALCANCES_AUDIENCIA: { id: AlcanceAudiencia; label: string; hint: string }[] = [
  { id: 'massa', label: 'Massa', hint: 'Público amplo, sem recorte' },
  { id: 'amplo', label: 'Amplo', hint: 'Grande, com algum recorte' },
  { id: 'segmentado', label: 'Segmentado', hint: 'Recorte definido de público' },
  { id: 'nicho', label: 'Nicho', hint: 'Público específico e pequeno' },
];

export function getAlcanceAudiencia(id: AlcanceAudiencia | undefined) {
  return ALCANCES_AUDIENCIA.find((alcance) => alcance.id === id);
}

/* ------------------------------------------------------------------ *
 * Escopo → Produção: o que o projeto inclui
 * ------------------------------------------------------------------ */

/**
 * Os três tiques da aba Escopo, e a coluna que cada um destrava na Produção.
 *
 * O Escopo declara **o que o projeto tem**; a Produção detalha **como**. Sem o tique, a coluna
 * correspondente fica travada e explica por quê — não é campo em branco esperando alguém, é campo
 * que não se aplica a este projeto.
 *
 * Fica aqui, e não espalhado pela grade, porque três lugares precisam concordar sobre o par: a
 * célula de tique, a célula travada e a limpeza ao desmarcar. Uma tabela só evita que divirjam.
 */
export const ESCOPO_DESTRAVA = [
  { tique: 'temEdicao', campo: 'edicao', label: 'Edição' },
  { tique: 'temConteudo', campo: 'formatoConteudo', label: 'Conteúdo' },
  { tique: 'temAudiencia', campo: 'alcanceAudiencia', label: 'Audiência' },
] as const satisfies readonly {
  tique: keyof Oportunidade;
  campo: keyof Oportunidade;
  label: string;
}[];

export type TiqueDeEscopo = (typeof ESCOPO_DESTRAVA)[number]['tique'];

/** O par de uma coluna da Produção — ou `undefined` se ela não depende de tique. */
export function destravaDaColuna(campo: string) {
  return ESCOPO_DESTRAVA.find((par) => par.campo === campo);
}

/** O par de um tique do Escopo. */
export function destravaDoTique(tique: string) {
  return ESCOPO_DESTRAVA.find((par) => par.tique === tique);
}

/**
 * A coluna da Produção aceita valor nesta linha?
 *
 * `false` significa "o projeto declarou que não tem isto" — diferente de "ninguém preencheu".
 */
export function destravada(op: Oportunidade, campo: string): boolean {
  const par = destravaDaColuna(campo);
  if (!par) return true;
  return op[par.tique] === true;
}

/**
 * Linhas em estado impossível: valor preenchido numa coluna que o Escopo diz não existir.
 *
 * Não deveria acontecer — desmarcar limpa o valor. Existe para `qaBacklog` provar que não
 * acontece, que é diferente de confiar que não acontece.
 */
export function comValorSemTique(oportunidades: Oportunidade[]) {
  return oportunidades.flatMap((op) =>
    ESCOPO_DESTRAVA
      .filter((par) => op[par.campo] !== undefined && op[par.tique] !== true)
      .map((par) => `${op.id}:${par.campo}`));
}

/* ------------------------------------------------------------------ *
 * Pendências — com quem está a bola
 *
 * A planilha da operação anotava "Em elaboração – Validação Gestão Esporte" como se fosse status.
 * A tradução (03/08/2026, lista da própria operação): o status continua um só, e cada uma dessas
 * anotações vira uma **espera nomeada** que se abre quando a bola sai da mão e se marca "chegou"
 * quando volta. Podem coexistir (o paralelo real) ou não existir (projeto simples não usa nada).
 *
 * Regras que a tela e o QA compartilham:
 * - O menu é **por status**: só Elaboração e Revisão têm esperas catalogadas. Uma pendência
 *   aberta, porém, viaja com o projeto se o status mudar — é a "revisão parcelada", medida.
 * - Nenhum gesto é definitivo: "chegou" se desfaz com reabrir; abrir por engano se desfaz com
 *   descartar. Registro de espera não pode dar medo de errar.
 * - A contagem fina por status (dias úteis, relatório) fica para o banco + Power BI; aqui se
 *   grava o que ele vai ler: as datas.
 * ------------------------------------------------------------------ */

export const PENDENCIAS_POR_STATUS: Partial<Record<StatusOportunidade, {
  id: TipoPendencia;
  label: string;
  /** Para o selo, que tem ~110px: "Validação Gestão Esporte" não cabe ao lado do status. */
  curto: string;
  hint: string;
}[]>> = {
  elaboracao: [
    {
      id: 'retorno_marca_executivo', label: 'Retorno Marca/Executivo', curto: 'Marca/Executivo',
      hint: 'Falta informação — a bola está com a marca ou o executivo',
    },
    {
      id: 'validacao_gestao_esporte', label: 'Validação Gestão Esporte', curto: 'Gestão Esporte',
      hint: 'Aguardando o "pode prosseguir" da Gestão Esporte',
    },
    {
      id: 'cotacao_gestao_elenco', label: 'Cotação Gestão de Elenco', curto: 'Gestão de Elenco',
      hint: 'Talento com programa na casa — aguardando a cotação do Elenco',
    },
    {
      /*
       * O par externo da cotação de Elenco — nasceu do "Cotação Externa" da planilha, com o nome
       * que a própria operação sugeriu ("em validação externo", 04/08/2026).
       */
      id: 'validacao_externa', label: 'Validação Externa', curto: 'Externa',
      hint: 'Aguardando cotação ou validação de alguém de fora da casa',
    },
    {
      id: 'calculo_producao', label: 'Cálculo de Produção', curto: 'Produção',
      hint: 'Aguardando o custo de produção — cabelo, maquiagem e afins',
    },
  ],
  revisao: [
    {
      // Entrou por decisão da operação em 04/08/2026, na ordem da lista dela.
      id: 'validacao_planejamento', label: 'Validação Planejamento', curto: 'Planejamento',
      hint: 'A proposta está em análise pelo Planejamento',
    },
    {
      id: 'validacao_talent_manager', label: 'Validação Talent Manager', curto: 'Talent Manager',
      hint: 'A proposta está com o talent manager',
    },
    {
      id: 'validacao_talento', label: 'Validação Talento', curto: 'Talento',
      hint: 'A proposta está em análise pelo talento',
    },
  ],
};

/** As esperas que este status oferece no menu. Vazio = o bloco nem oferece abrir. */
export function pendenciasDoStatus(status: StatusOportunidade) {
  return PENDENCIAS_POR_STATUS[status] ?? [];
}

/** A ficha de um tipo, procurada no catálogo inteiro — pendência aberta viaja entre status. */
export function getTipoPendencia(tipo: TipoPendencia) {
  return Object.values(PENDENCIAS_POR_STATUS).flat().find((item) => item.id === tipo);
}

export function pendenciasAbertas(op: Pick<Oportunidade, 'pendencias'>): Pendencia[] {
  return (op.pendencias ?? []).filter((p) => !p.chegouEm);
}

/**
 * Dias de espera, em dias corridos entre datas `yyyy-mm-dd`.
 *
 * Corridos de propósito: a espera de um terceiro não folga no fim de semana do ponto de vista de
 * quem espera. A régua em dias úteis — se a operação preferir — entra com o relatório no banco.
 */
export function diasDeEspera(pendencia: Pendencia, hojeISO: string): number {
  const fim = pendencia.chegouEm ?? hojeISO;
  const dias = Math.round(
    (Date.parse(`${fim}T00:00:00`) - Date.parse(`${pendencia.abertaEm}T00:00:00`)) / 86_400_000,
  );
  return Math.max(0, dias);
}

/**
 * A frase do hover — "com quem está a bola, há quanto tempo", por extenso.
 *
 * O selo sinaliza com um badge ⏳ (nome nenhum: em 106px, qualquer texto acaba comido — decisão
 * da operação em 04/08/2026); os nomes completos e os dias moram aqui, na dica, e no painel.
 * `null` quando não há espera aberta: projeto sem pendência não é lembrado disso.
 */
export function descricaoDasEsperas(
  op: Pick<Oportunidade, 'pendencias'>, hojeISO: string,
): string | null {
  const abertas = pendenciasAbertas(op);
  if (abertas.length === 0) return null;
  return abertas
    .map((p) => `${getTipoPendencia(p.tipo)?.label ?? p.tipo} há ${diasDeEspera(p, hojeISO)}d`)
    .join(' · ');
}

/**
 * Abre uma espera — se já não houver **outra aberta do mesmo tipo**.
 *
 * A guarda existe porque duas "Validação Gestão Esporte" abertas na mesma linha não são duas
 * esperas: são um clique duplo. Uma espera do mesmo tipo já chegada não impede — pedir de novo ao
 * mesmo terceiro é rotina.
 */
export function comPendenciaAberta(
  op: Oportunidade, tipo: TipoPendencia, hojeISO: string, id: string,
): Oportunidade {
  if (pendenciasAbertas(op).some((p) => p.tipo === tipo)) return op;
  const nova: Pendencia = { id, tipo, statusAbertura: op.status, abertaEm: hojeISO };
  return { ...op, pendencias: [...(op.pendencias ?? []), nova] };
}

/** "✓ Chegou": a resposta veio, o relógio para. */
export function comPendenciaChegada(op: Oportunidade, id: string, hojeISO: string): Oportunidade {
  return {
    ...op,
    pendencias: (op.pendencias ?? []).map((p) =>
      p.id === id && !p.chegouEm ? { ...p, chegouEm: hojeISO } : p),
  };
}

/** "↩ Reabrir": o "chegou" foi engano (ou a resposta veio incompleta) — o relógio original segue. */
export function comPendenciaReaberta(op: Oportunidade, id: string): Oportunidade {
  return {
    ...op,
    pendencias: (op.pendencias ?? []).map((p) => {
      if (p.id !== id || !p.chegouEm) return p;
      const { chegouEm: _descartado, ...aberta } = p;
      return aberta;
    }),
  };
}

/**
 * "✕": aberta por engano — sai do registro, e portanto da medição.
 *
 * Só remove **abertas**: uma espera que já chegou é história do projeto, e história não se apaga
 * por clique. Se o "chegou" é que estava errado, o caminho é reabrir.
 */
export function semPendencia(op: Oportunidade, id: string): Oportunidade {
  return {
    ...op,
    pendencias: (op.pendencias ?? []).filter((p) => !(p.id === id && !p.chegouEm)),
  };
}

/**
 * A trava da Elaboração — decisão da operação em 04/08/2026: *"Em elaboração não pode ir para
 * revisão se tiver faltando alguma coisa."*
 *
 * A carta de orçamento não sobe para revisão com espera aberta: revisar um número que ainda
 * depende do Elenco é revisar um rascunho. **Só esta transição trava** — nas demais, a política
 * segue "livre, com aviso": na Revisão, uma validação aberta pode atravessar para o Feedback,
 * porque ali a espera é do próprio destino (o cliente responde enquanto o talento valida).
 *
 * Não vira invariante de QA de propósito: o encerramento automático (20 dias parado) fecha a
 * linha esteja ela como estiver — uma encerrada com espera aberta da Elaboração é história
 * legítima, não estado impossível.
 */
export function bloqueadaPorPendencias(
  op: Pick<Oportunidade, 'status' | 'pendencias'>, destino: StatusOportunidade,
): boolean {
  return op.status === 'elaboracao' && destino === 'revisao' && pendenciasAbertas(op).length > 0;
}

/**
 * Pendências em estado impossível — o que `qaBacklog` procura no seed e nos fluxos.
 *
 * Três formas de impossível: "chegou" antes de abrir; tipo que o status de abertura não oferece;
 * e duas abertas do mesmo tipo na mesma linha (a guarda de `comPendenciaAberta` existe para isso).
 */
export function comPendenciaImpossivel(oportunidades: Oportunidade[]): string[] {
  return oportunidades.flatMap((op) => {
    const problemas: string[] = [];
    const abertasPorTipo = new Map<string, number>();
    (op.pendencias ?? []).forEach((p) => {
      if (p.chegouEm && p.chegouEm < p.abertaEm) problemas.push(`${op.id}:${p.id}:chegou-antes`);
      if (!pendenciasDoStatus(p.statusAbertura).some((t) => t.id === p.tipo)) {
        problemas.push(`${op.id}:${p.id}:tipo-fora-do-status`);
      }
      if (!p.chegouEm) {
        abertasPorTipo.set(p.tipo, (abertasPorTipo.get(p.tipo) ?? 0) + 1);
      }
    });
    abertasPorTipo.forEach((quantas, tipo) => {
      if (quantas > 1) problemas.push(`${op.id}:${tipo}:aberta-duplicada`);
    });
    return problemas;
  });
}

/**
 * Como o material será captado.
 *
 * A ordem vai do mais caro ao mais barato — estúdio pede equipe e diária; material do talento não
 * pede nenhum dos dois. Quem varre a coluna lê a escala de custo sem decorá-la.
 */
export const CAPTACOES_PRODUCAO: { id: TipoCaptacao_Producao; label: string; hint: string }[] = [
  { id: 'estudio', label: 'Estúdio', hint: 'Gravação em estúdio, com equipe' },
  { id: 'externa', label: 'Externa', hint: 'Gravação fora, em locação' },
  { id: 'remota', label: 'Remota', hint: 'Gravada à distância, sem equipe no local' },
  { id: 'material_talento', label: 'Material do talento', hint: 'O talento grava e entrega' },
  { id: 'sem_captacao', label: 'Sem captação', hint: 'Usa material que já existe' },
];

export function getCaptacaoProducao(id: TipoCaptacao_Producao | undefined) {
  return CAPTACOES_PRODUCAO.find((tipo) => tipo.id === id);
}

/*
  `totalDePecas` saiu em 03/08/2026, junto com as quatro contagens que ela somava.

  A aba Escopo passou a guardar o pedido em texto (`Oportunidade.escopo`) em vez de reels, vídeos,
  posts e cotas. Sem as parcelas, a soma não tem o que somar — e mantê-la lendo campos que já não
  existem seria exatamente o "campo órfão" que a auditoria de 02/08 removeu por atrapalhar.

  Se a contagem exata voltar a ser pedida, ela nasce da lista de entregáveis do contrato fechado,
  não do briefing em negociação. Ver [08 §6] e PRD 00 §5.7.
*/
