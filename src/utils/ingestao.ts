/**
 * Ingestão de oportunidades — o contrato entre o mundo de fora e o Backlog.
 *
 * Três origens escrevem no mesmo quadro:
 *
 * | Origem | Quem escreve | Chave de deduplicação |
 * |--------|--------------|-----------------------|
 * | `manual` | Alguém do time, na linha de criação | — |
 * | `email` | Agente que lê a caixa de entrada | `Message-ID` do e-mail |
 * | `salesforce` | Sincronização com o CRM | Id da oportunidade no Salesforce |
 *
 * ## Três garantias, e por que cada uma existe
 *
 * 1. **Nunca duplicar.** Toda integração reprocessa: o agente relê a caixa, a sincronização roda
 *    de novo depois de uma falha. Sem `idExterno`, cada reprocessamento criaria linhas repetidas
 *    até alguém notar — e ninguém nota a tempo.
 *
 * 2. **Nunca confiar cegamente.** O que entra por integração nasce **não revisado**: o agente
 *    acerta o essencial e erra o resto. A marca é o que separa "o sistema achou" de "alguém
 *    confirmou".
 *
 * 3. **Nunca perder o que já foi corrigido.** Quando a origem manda de novo um registro que já
 *    existe e alguém já ajustou, a atualização respeita o trabalho humano — ver `mesclar`.
 *
 * Este módulo é **puro**: não conhece HTTP, fila nem banco. Quando existir backend, o endpoint
 * chama estas funções e persiste o resultado; a regra não muda de lugar.
 */

import {
  EntradaPorOportunidade, InputOportunidade, Oportunidade, OrigemComercial,
  PrioridadeOportunidade, TipoProjeto,
} from '../types';
import { prazoDeTriagem } from './sla';
import { todayISO } from './dates';
import { normalizar } from './referencias';

/**
 * O que uma integração entrega — tudo opcional menos o mínimo.
 *
 * Campos frouxos de propósito: um e-mail raramente traz valor e prazo, e recusar o registro
 * inteiro por falta de um campo faria a oportunidade se perder. Melhor entrar incompleta e
 * marcada para revisão do que não entrar.
 */
export interface OportunidadeBruta {
  /** Obrigatório: sem um título não há o que mostrar na lista. */
  titulo: string;
  /** Chave no sistema de origem. Obrigatória nas origens automáticas. */
  idExterno?: string;
  marca?: string;
  talento?: string;
  tipoProjeto?: string;
  prioridade?: string;
  /** Como a demanda chegou — o CRM costuma trazer isso. */
  input?: string;
  /** Frente comercial. */
  origem?: string;
  valorProjeto?: string;
  cache?: string;
  comissao?: string;
  /**
   * O pedido, em texto — o corpo do e-mail ou a descrição do Salesforce.
   *
   * É o campo que mais se beneficia da integração: o briefing chega escrito, e antes só cabia em
   * `observacoes` ou se perdia entre quatro contagens que ninguém preenchia.
   */
  escopo?: string;
  observacoes?: string;
  /** ISO de quando a origem gerou o dado — o e-mail chegou, o CRM criou. */
  recebidoEm?: string;
}

export type ErroIngestao =
  | 'sem_titulo'
  | 'sem_id_externo'
  | 'duplicada';

export interface ResultadoIngestao {
  /** `criada` inclui a oportunidade; `atualizada` traz a versão mesclada. */
  situacao: 'criada' | 'atualizada' | 'ignorada';
  oportunidade?: Oportunidade;
  erro?: ErroIngestao;
}

/** Aceita variações de escrita; o que não reconhece vira média. */
function normalizarPrioridade(valor?: string): PrioridadeOportunidade | undefined {
  const alvo = normalizar(valor ?? '');
  if (['alta', 'high', 'urgente', 'critica'].includes(alvo)) return 'alta';
  if (['baixa', 'low'].includes(alvo)) return 'baixa';
  if (['media', 'média', 'medium', 'normal'].includes(alvo)) return 'media';
  // Não reconhecido fica em branco: quem classifica é quem confere, olhando o original.
  return undefined;
}

/** Traduz o que a origem manda para os valores canônicos; o que não reconhece vira `outro`. */
function normalizarTipoProjeto(valor?: string): TipoProjeto | undefined {
  const alvo = normalizar(valor ?? '');
  if (alvo.includes('patrocin')) return 'patrocinio';
  if (alvo.includes('demanda')) return 'sob_demanda';
  if (alvo.includes('especial')) return 'projeto_especial';
  // "outro" é uma escolha de quem cadastra, não um palpite de quem não entendeu o texto.
  if (alvo === 'outro' || alvo === 'outros') return 'outro';
  return undefined;
}

function normalizarInput(valor?: string): InputOportunidade | undefined {
  const alvo = normalizar(valor ?? '');
  if (alvo.includes('mercado')) return 'mercado';
  if (alvo.includes('inbound')) return 'inbound';
  if (alvo.includes('proativ')) return 'proativo';
  if (alvo.includes('first')) return 'viu_first';
  if (alvo.includes('interno')) return 'interno';
  return undefined;
}

function normalizarOrigemComercial(valor?: string): OrigemComercial | undefined {
  const alvo = normalizar(valor ?? '');
  if (alvo.includes('globoplay')) return 'globoplay';
  if (alvo.includes('tv globo') || alvo === 'globo') return 'tv_globo';
  if (alvo.includes('pago')) return 'canais_pagos';
  if (alvo.includes('agenc')) return 'viu_agencia';
  if (alvo === 'outro' || alvo === 'outros') return 'outros';
  return undefined;
}

/** Localiza o registro já existente da mesma via de entrada. */
export function encontrarPorIdExterno(
  existentes: Oportunidade[],
  entradaPor: EntradaPorOportunidade,
  idExterno: string,
): Oportunidade | undefined {
  if (!idExterno) return undefined;
  return existentes.find(
    (item) => item.entradaPor === entradaPor && item.idExterno === idExterno,
  );
}

/**
 * Mescla o que a origem reenviou sobre o que já existe.
 *
 * **A regra é: campo que alguém preencheu no sistema não é sobrescrito.** Se a integração manda
 * um valor e o campo já tem conteúdo, o que está vale. Só campos vazios recebem o dado novo.
 *
 * O contrário — origem sempre vence — desfaria correções toda vez que a sincronização rodasse, e
 * quem corrigiu veria seu trabalho sumir sem explicação. Perder um dado novo é recuperável; ver a
 * correção evaporar destrói a confiança no quadro.
 *
 * **Exceção:** enquanto a oportunidade não foi revisada, nada foi conferido — ali a origem é a
 * melhor informação disponível e pode atualizar tudo.
 */
export function mesclar(atual: Oportunidade, bruta: OportunidadeBruta): Oportunidade {
  const preferirNovo = !atual.revisada;

  const escolher = (existente: string, novo?: string): string => {
    const limpo = novo?.trim() ?? '';
    if (!limpo) return existente;
    if (preferirNovo) return limpo;
    return existente.trim() ? existente : limpo;
  };

  return {
    ...atual,
    titulo: escolher(atual.titulo, bruta.titulo),
    marca: escolher(atual.marca, bruta.marca),
    talento: escolher(atual.talento, bruta.talento),
    valorProjeto: escolher(atual.valorProjeto, bruta.valorProjeto),
    cache: escolher(atual.cache, bruta.cache),
    comissao: escolher(atual.comissao, bruta.comissao),
    observacoes: escolher(atual.observacoes, bruta.observacoes),
    prioridade: preferirNovo && bruta.prioridade
      ? normalizarPrioridade(bruta.prioridade)
      : atual.prioridade,
    tipoProjeto: preferirNovo && bruta.tipoProjeto
      ? normalizarTipoProjeto(bruta.tipoProjeto)
      : atual.tipoProjeto,
    input: preferirNovo && bruta.input ? normalizarInput(bruta.input) : atual.input,
    origem: preferirNovo && bruta.origem
      ? normalizarOrigemComercial(bruta.origem)
      : atual.origem,
  };
}

interface OpcoesIngestao {
  /** Gera o id interno — injetado para o teste não depender de contador global. */
  proximoId: () => string;
  /** Data de entrada; padrão é hoje. */
  hoje?: string;
}

/**
 * Recebe um registro de fora e devolve o que fazer com ele.
 *
 * Não escreve em lugar nenhum: quem chama decide persistir. Isso mantém a função testável e
 * permite processar um lote inteiro antes de gravar.
 */
export function ingerir(
  bruta: OportunidadeBruta,
  entradaPor: EntradaPorOportunidade,
  existentes: Oportunidade[],
  opcoes: OpcoesIngestao,
): ResultadoIngestao {
  const titulo = bruta.titulo?.trim();
  if (!titulo) return { situacao: 'ignorada', erro: 'sem_titulo' };

  const automatica = entradaPor !== 'manual';
  const idExterno = bruta.idExterno?.trim();

  // Sem chave, a próxima execução não tem como saber que já viu este registro.
  if (automatica && !idExterno) {
    return { situacao: 'ignorada', erro: 'sem_id_externo' };
  }

  if (idExterno) {
    const jaExiste = encontrarPorIdExterno(existentes, entradaPor, idExterno);
    if (jaExiste) {
      return { situacao: 'atualizada', oportunidade: mesclar(jaExiste, bruta) };
    }
  }

  const entradaEm = opcoes.hoje ?? todayISO();

  return {
    situacao: 'criada',
    oportunidade: {
      id: opcoes.proximoId(),
      titulo,
      marca: bruta.marca?.trim() ?? '',
      talento: bruta.talento?.trim() ?? '',
      tipoProjeto: normalizarTipoProjeto(bruta.tipoProjeto),
      input: normalizarInput(bruta.input),
      origem: normalizarOrigemComercial(bruta.origem),
      /*
        Falso na entrada, e não uma tentativa de adivinhar.

        A exclusividade deriva da ficha do talento, e a ingestão não tem como consultá-la: o
        e-mail traz um nome, não um vínculo. Quem casar o nome com a ficha — na tela ou no
        `garantirTalento` — recalcula. Inventar aqui repetiria o defeito das classificações que
        a integração deixou de chutar (§10.1).
      */
      exclusivo: false,
      escopo: bruta.escopo?.trim() ?? '',
      prioridade: normalizarPrioridade(bruta.prioridade),
      status: 'entrada',
      statusDesde: entradaEm,
      entradaEm,
      prazoEm: prazoDeTriagem(entradaEm),
      responsaveis: {},
      pendencias: [],
      valorProjeto: bruta.valorProjeto?.trim() ?? '',
      cache: bruta.cache?.trim() ?? '',
      comissao: bruta.comissao?.trim() ?? '',
      comissaoGlobo: '', impostos: '', custoProducao: '', saving: '',
      pep: '',
  linkProposta: '', linkSalesforce: '', linkPastaOrcamento: '', linkPastaPlanejamento: '',
  tipoContratacao: '', numeroContrato: '',
                  contatoCliente: '',
      observacoes: bruta.observacoes?.trim() ?? '',
      entradaPor,
      idExterno,
      recebidoEm: bruta.recebidoEm,
      // O cadastro manual já nasce conferido: quem digitou é o revisor.
      revisada: !automatica,
      criadoEm: new Date().toISOString(),
    },
  };
}

export interface ResumoLote {
  criadas: number;
  atualizadas: number;
  ignoradas: number;
  erros: Partial<Record<ErroIngestao, number>>;
}

/**
 * Processa um lote inteiro.
 *
 * Acumula o que vai criando: dois registros com o mesmo `idExterno` **no mesmo lote** também são
 * duplicata, e uma origem com falha costuma reenviar a mesma linha mais de uma vez.
 */
export function ingerirLote(
  brutas: OportunidadeBruta[],
  entradaPor: EntradaPorOportunidade,
  existentes: Oportunidade[],
  opcoes: OpcoesIngestao,
): { oportunidades: Oportunidade[]; resumo: ResumoLote } {
  let acumulado = [...existentes];
  const resumo: ResumoLote = { criadas: 0, atualizadas: 0, ignoradas: 0, erros: {} };

  for (const bruta of brutas) {
    const resultado = ingerir(bruta, entradaPor, acumulado, opcoes);

    if (resultado.situacao === 'criada' && resultado.oportunidade) {
      acumulado = [resultado.oportunidade, ...acumulado];
      resumo.criadas += 1;
    } else if (resultado.situacao === 'atualizada' && resultado.oportunidade) {
      const atualizada = resultado.oportunidade;
      acumulado = acumulado.map((item) => (item.id === atualizada.id ? atualizada : item));
      resumo.atualizadas += 1;
    } else {
      resumo.ignoradas += 1;
      if (resultado.erro) {
        resumo.erros[resultado.erro] = (resumo.erros[resultado.erro] ?? 0) + 1;
      }
    }
  }

  return { oportunidades: acumulado, resumo };
}

/* ------------------------------------------------------------------ *
 * Adaptadores — o formato de cada origem
 * ------------------------------------------------------------------ */

/**
 * Payload que o agente de e-mail entrega.
 *
 * O agente lê a caixa, interpreta o corpo e extrai o que reconhece. Campos ausentes são normais —
 * um e-mail de proposta raramente traz cachê e comissão.
 */
export interface EmailBruto {
  /** `Message-ID` do cabeçalho — único e estável, mesmo se o e-mail for reprocessado. */
  messageId: string;
  assunto: string;
  remetente: string;
  recebidoEm: string;
  /** O que o agente conseguiu extrair do corpo. */
  extraido?: {
    marca?: string;
    talento?: string;
    tipoProjeto?: string;
    valor?: string;
    prioridade?: string;
  };
  /** Trecho do corpo, guardado como rastro do que originou a linha. */
  resumo?: string;
}

export function deEmail(email: EmailBruto): OportunidadeBruta {
  const extraido = email.extraido ?? {};
  return {
    idExterno: email.messageId,
    // O assunto é o melhor título disponível; quem revisa reescreve.
    titulo: email.assunto?.trim() || `E-mail de ${email.remetente}`,
    marca: extraido.marca,
    talento: extraido.talento,
    tipoProjeto: extraido.tipoProjeto,
    valorProjeto: extraido.valor,
    prioridade: extraido.prioridade,
    // E-mail que chega sem ninguém pedir é inbound, por definição.
    input: 'inbound',
    recebidoEm: email.recebidoEm,
    observacoes: [`Origem: e-mail de ${email.remetente}`, email.resumo?.trim()]
      .filter(Boolean)
      .join(' · '),
  };
}

/** Campos da oportunidade no Salesforce, nos nomes que o CRM usa. */
export interface SalesforceBruto {
  Id: string;
  Name: string;
  Account?: { Name?: string };
  Amount?: number;
  StageName?: string;
  CloseDate?: string;
  Priority__c?: string;
  Talent__c?: string;
  Type?: string;
  Description?: string;
  CreatedDate?: string;
  LeadSource?: string;
  Origem__c?: string;
}

export function deSalesforce(registro: SalesforceBruto): OportunidadeBruta {
  return {
    idExterno: registro.Id,
    titulo: registro.Name,
    marca: registro.Account?.Name,
    talento: registro.Talent__c,
    tipoProjeto: registro.Type,
    prioridade: registro.Priority__c,
    input: registro.LeadSource,
    origem: registro.Origem__c,
    valorProjeto:
      typeof registro.Amount === 'number'
        ? registro.Amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : undefined,
    observacoes: [
      registro.StageName ? `Estágio no CRM: ${registro.StageName}` : '',
      registro.CloseDate ? `Fechamento previsto: ${registro.CloseDate}` : '',
      registro.Description?.trim() ?? '',
    ]
      .filter(Boolean)
      .join(' · '),
    recebidoEm: registro.CreatedDate,
  };
}
