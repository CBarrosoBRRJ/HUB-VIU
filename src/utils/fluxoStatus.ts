/**
 * A máquina de estados do Backlog — o que pode virar o quê, e quando o tempo decide sozinho.
 *
 * ## Por que restringir
 *
 * Nos outros quadros qualquer status leva a qualquer outro, e isso é deliberado lá: a esteira de
 * contratos varia caso a caso, e travar o caminho obrigaria a inventar passos.
 *
 * Aqui é o contrário. O Backlog **é** o processo: cada etapa existe porque a anterior terminou, e
 * pular de Entrada direto para Negócio Fechado não é um atalho — é um registro que não aconteceu.
 * A restrição não protege o sistema, protege o significado do dado.
 */

import { MotivoDeclinio, Oportunidade, StatusOportunidade } from '../types';

/**
 * Transições permitidas, por status de origem.
 *
 * Lista vazia significa **estado final**: nada sai dali pela interface.
 */
export const TRANSICOES: Record<StatusOportunidade, StatusOportunidade[]> = {
  entrada: ['elaboracao'],
  elaboracao: ['revisao'],
  /*
    Revisão abre três caminhos: volta para ajuste, vai ao cliente — ou **declina**.

    O terceiro entrou em 04/08/2026, junto com as pendências: a Validação Talento acontece AQUI
    (é uma espera da Revisão), e quando o talento recusa, o projeto morre nesta etapa. Obrigar a
    passar por Aguardando Feedback para declinar registraria um retorno de cliente que nunca
    houve — e o motivo do declínio ("Talento") já existe para dizer de onde partiu a recusa.
  */
  revisao: ['ajuste', 'aguardando_feedback', 'declinado'],
  // E ajuste sempre devolve à revisão — é o loop do processo.
  ajuste: ['revisao'],
  /*
    O retorno do cliente abre cinco caminhos — e o primeiro deles é **pedir ajuste**.

    "Quero mudar isto" é a resposta mais comum, e mantém o projeto vivo. Sem essa saída, atender
    um pedido de alteração exigia declinar e recadastrar: perdia-se o histórico e a data de
    entrada, que é o mesmo problema que o StandBy sem volta causava.
    
    Ajustes vem primeiro na lista porque é o caminho de continuidade; os desfechos encerram.
  */
  aguardando_feedback: ['ajuste', 'fechado', 'standby', 'declinado', 'encerrado'],

  /*
    StandBy é **pausa, não desfecho** — e por isso volta.

    Enquanto era terminal, pausar um projeto equivalia a matá-lo: retomar exigia cadastrar de novo,
    perdendo o histórico e a data de entrada. Quem sabia disso deixava de usar o StandBy e mantinha
    o projeto em Aguardando Feedback, o que sujava o farol com uma espera que não era do cliente.

    Volta para **Aguardando Feedback** e não para a etapa anterior: é de lá que ele saiu, e é lá
    que a decisão continua pendente.
  */
  standby: ['aguardando_feedback'],

  fechado: [],
  declinado: [],
  encerrado: [],
};

/** Para onde esta oportunidade pode ir a partir de onde está. */
export function destinosPermitidos(atual: StatusOportunidade): StatusOportunidade[] {
  return TRANSICOES[atual] ?? [];
}

/**
 * De onde a recusa pode partir, **por etapa** — decisão da operação em 04/08/2026.
 *
 * Na Revisão quem está com a bola é o talento (a Validação Talento é uma pendência dali): o único
 * declínio que faz sentido é o dele. "Interno" e "Mercado" são conversas do retorno do cliente —
 * vivem no Aguardando Feedback. Oferecer os três em toda parte deixaria registrar uma recusa de
 * mercado numa etapa em que o mercado ainda nem viu a proposta.
 */
export function motivosPermitidosDoDeclinio(origem: StatusOportunidade): MotivoDeclinio[] {
  if (origem === 'revisao') return ['talento'];
  if (origem === 'aguardando_feedback') return ['interno', 'mercado', 'talento'];
  return [];
}

export function podeTransicionar(de: StatusOportunidade, para: StatusOportunidade): boolean {
  // Reafirmar o status atual não é transição — e recusar isso quebraria salvamentos idempotentes.
  if (de === para) return true;
  return destinosPermitidos(de).includes(para);
}

/** Estado do qual não se sai pela interface. */
export function ehEstadoFinal(status: StatusOportunidade): boolean {
  return destinosPermitidos(status).length === 0;
}

/* ------------------------------------------------------------------ *
 * Encerramento automático
 * ------------------------------------------------------------------ */

/**
 * Dias **corridos** parados numa etapa ativa antes do encerramento automático.
 *
 * Corridos, e não úteis como o SLA de triagem, porque as duas réguas medem coisas diferentes: o
 * SLA é um **compromisso de resposta** — contar corridos puniria quem recebe na sexta. Isto aqui
 * é **abandono**, e abandono se mede em tempo real. Um projeto parado há três semanas está parado
 * há três semanas, tenha havido feriado ou não.
 */
export const DIAS_ATE_ENCERRAR = 20;

/** Etapas em que o relógio do abandono corre. Os desfechos ficam de fora — já acabaram. */
export const ETAPAS_ATIVAS: StatusOportunidade[] = [
  'entrada', 'elaboracao', 'revisao', 'ajuste', 'aguardando_feedback',
];

export function ehEtapaAtiva(status: StatusOportunidade): boolean {
  return ETAPAS_ATIVAS.includes(status);
}

/** Converte `yyyy-mm-dd` em Date local à meia-noite — evita o deslocamento de fuso do UTC. */
function parseISO(iso: string): Date | null {
  if (!iso) return null;
  const [ano, mes, dia] = iso.split('-').map(Number);
  if (!ano || !mes || !dia) return null;
  return new Date(ano, mes - 1, dia);
}

const MS_POR_DIA = 86_400_000;

/**
 * Dias corridos parados no status atual. `null` quando não há data para medir.
 *
 * Usa `statusDesde`; se estiver vazio — dado antigo, anterior ao campo — cai para `entradaEm`,
 * que é a melhor aproximação disponível.
 */
export function diasParado(oportunidade: Oportunidade, referencia = new Date()): number | null {
  const desde = parseISO(oportunidade.statusDesde || oportunidade.entradaEm);
  if (!desde) return null;

  const hoje = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
  return Math.floor((hoje.getTime() - desde.getTime()) / MS_POR_DIA);
}

/** Passou do limite e ainda está numa etapa ativa? */
export function deveEncerrarPorTempo(
  oportunidade: Oportunidade,
  referencia = new Date(),
): boolean {
  if (!ehEtapaAtiva(oportunidade.status)) return false;
  const dias = diasParado(oportunidade, referencia);
  return dias !== null && dias > DIAS_ATE_ENCERRAR;
}

/** Quantos dias faltam para o encerramento automático. Negativo quando já passou. */
export function diasAteEncerrar(
  oportunidade: Oportunidade,
  referencia = new Date(),
): number | null {
  if (!ehEtapaAtiva(oportunidade.status)) return null;
  const dias = diasParado(oportunidade, referencia);
  return dias === null ? null : DIAS_ATE_ENCERRAR - dias;
}

export interface ResultadoEncerramento {
  oportunidades: Oportunidade[];
  /** Ids que mudaram — o chamador avisa quem precisa saber. */
  encerradas: string[];
}

/**
 * Aplica a regra dos 20 dias ao quadro inteiro.
 *
 * **Função pura**: devolve a lista nova e quem mudou, sem escrever em lugar nenhum. Quem chama
 * decide persistir — e é o que permite testar a regra sem montar React nem banco.
 *
 * Rodar isto ao carregar, e não por rotina agendada, é a mesma escolha feita na responsabilidade
 * temporária das equipes: uma regra que depende de job tem um ponto de falha a mais, e um projeto
 * que deveria estar encerrado não pode continuar aberto porque o agendador caiu.
 */
export function aplicarEncerramentoAutomatico(
  oportunidades: Oportunidade[],
  referencia = new Date(),
): ResultadoEncerramento {
  const encerradas: string[] = [];

  const proximas = oportunidades.map((oportunidade) => {
    if (!deveEncerrarPorTempo(oportunidade, referencia)) return oportunidade;

    encerradas.push(oportunidade.id);
    return {
      ...oportunidade,
      status: 'encerrado' as StatusOportunidade,
      // A data do encerramento, não a da última parada: é quando esta mudança aconteceu.
      statusDesde: paraISO(referencia),
      encerradaAutomaticamente: true,
    };
  });

  return { oportunidades: proximas, encerradas };
}

function paraISO(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

/* ------------------------------------------------------------------ *
 * Congelamento
 * ------------------------------------------------------------------ */

/**
 * Etapas em que o projeto **não se edita**.
 *
 * Em Revisão o material está sendo analisado; em Aguardando Feedback já saiu para o cliente. Nos
 * dois casos existe uma versão circulando fora do quadro — mexer nos dados aqui faria a tela
 * descrever algo diferente do que foi enviado, e ninguém saberia qual das duas está certa.
 *
 * Para alterar, o caminho é mover o projeto para **Ajustes** (a partir de Revisão) e corrigir lá.
 * É o que o loop do processo existe para fazer: a correção fica registrada como etapa, não como
 * edição silenciosa.
 */
export const ETAPAS_CONGELADAS: StatusOportunidade[] = [
  'revisao',
  'aguardando_feedback',
  /*
    StandBy congela pelo mesmo motivo, e por mais um.

    Ele é a pausa de um projeto que **já estava com o cliente** — só se chega nele a partir de
    Aguardando Feedback. O material lá fora continua sendo o mesmo, e editar durante a pausa faria
    a retomada partir de dados que ninguém conferiu.
  */
  'standby',
];

/**
 * O projeto está congelado para edição?
 *
 * **O status continua editável** — congelar o fluxo junto prenderia o projeto para sempre, sem
 * caminho de volta. O que congela são os dados.
 */
export function ehCongelada(status: StatusOportunidade): boolean {
  return ETAPAS_CONGELADAS.includes(status);
}
