/**
 * Talentos exclusivos e as áreas que respondem por eles.
 *
 * Modelo em dois níveis: a **equipe** atende uma área (`Equipe.areaTalento`) e define quem pode
 * ser nomeado; a **pessoa** dessa equipe é quem responde por aquele talento naquela área.
 *
 * Só a equipe seria genérico demais — ninguém sabe a quem falar. Só a pessoa seria frágil — ela
 * sai de férias e o campo vira um nome morto. Os dois juntos dão nome e continuidade.
 */

import {
  AreaTalento, OrigemTalento, RedesTalento, Talento, TalentContract, TipoTalento, Equipe, Usuario,
} from '../types';
import { getPapelNaEquipe } from './equipes';

/** Vínculo comercial — o que separa quem a casa agencia de quem ela apenas toca. */
export const TIPOS: { id: TipoTalento; label: string; descricao: string; chip: string; dot: string }[] = [
  {
    id: 'exclusivo',
    label: 'Exclusivo',
    descricao: 'Agenciado pela casa, com responsáveis por área.',
    chip: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    dot: 'bg-indigo-500',
  },
  {
    id: 'interveniencia',
    label: 'Interveniência',
    descricao: 'Contratos tocados sem exclusividade.',
    chip: 'bg-slate-100 text-slate-600 ring-slate-200',
    dot: 'bg-slate-400',
  },
];

export function getTipo(id: TipoTalento) {
  return TIPOS.find((tipo) => tipo.id === id) ?? TIPOS[1];
}

/* ------------------------------------------------------------------ *
 * Filtros do quadro
 * ------------------------------------------------------------------ */

export type FiltroTalento = 'todos' | 'exclusivo' | 'interveniencia' | 'pendentes';

export function matchesFiltroTalento(talento: Talento, filtro: FiltroTalento): boolean {
  if (filtro === 'todos') return true;
  if (filtro === 'pendentes') return talento.cadastroPendente === true;
  return talento.tipo === filtro;
}

export interface ContagemTalentos {
  todos: number;
  exclusivo: number;
  interveniencia: number;
  pendentes: number;
}

/**
 * Contagem por filtro.
 *
 * `pendentes` cruza com os outros dois de propósito — uma ficha pendente também é exclusiva ou de
 * interveniência. Somar os quatro não dá o total, e é o esperado: são recortes, não fatias.
 */
export function contarTalentos(talentos: Talento[]): ContagemTalentos {
  return {
    todos: talentos.length,
    exclusivo: talentos.filter((t) => t.tipo === 'exclusivo').length,
    interveniencia: talentos.filter((t) => t.tipo === 'interveniencia').length,
    pendentes: talentos.filter((t) => t.cadastroPendente).length,
  };
}

/** Redes exibidas na aba, na ordem das colunas. */
export const REDES: { campo: keyof RedesTalento; label: string; prefixo: string }[] = [
  { campo: 'instagram', label: 'Instagram', prefixo: '@' },
  { campo: 'tiktok', label: 'TikTok', prefixo: '@' },
  { campo: 'youtube', label: 'YouTube', prefixo: '@' },
  { campo: 'facebook', label: 'Facebook', prefixo: '/' },
  { campo: 'x', label: 'X', prefixo: '@' },
  { campo: 'site', label: 'Site', prefixo: '' },
];

export const REDES_VAZIAS: RedesTalento = {
  instagram: '', tiktok: '', youtube: '', facebook: '', x: '', site: '',
};

/** Quantas redes o talento tem preenchidas — usado no resumo da linha. */
export function redesPreenchidas(talento: Talento): number {
  return REDES.filter((rede) => talento.redes[rede.campo]?.trim()).length;
}

/**
 * As áreas que respondem por um **talento** — as colunas da aba Responsáveis em Talentos.
 *
 * Recorte de `AREAS`, e não o contrário, porque a lista completa é a que vale para equipes e
 * permissões. Pagamento e Jurídico ficaram de fora: respondem por projeto, não por
 * pessoa, e incluí-las abriria colunas na página Talentos que ninguém pediu.
 *
 * **Ao criar uma área nova, decida em qual das duas listas ela entra.** É a diferença entre
 * aparecer num quadro e aparecer em todos.
 */
/**
 * As áreas que respondem por um **talento**, e não por um projeto.
 *
 * Ficam de fora as que só fazem sentido por linha: "quem paga este projeto" é pergunta; "quem paga
 * a Marina Duarte" não é. Vale para Pagamento, Jurídico e as duas frentes de produção.
 */
export function areasDoTalento() {
  const porProjeto: AreaTalento[] = ['pagamento', 'juridico', 'artistico', 'executivo'];
  return AREAS.filter((area) => !porProjeto.includes(area.id));
}

export const AREAS: {
  id: AreaTalento;
  label: string;
  descricao: string;
  /** Nome da equipe que atende a área no seed — usado para orientar quem ainda não a criou. */
  equipeSugerida: string;
  /** Cor da etiqueta — classes literais, exigência do Tailwind. */
  chip: string;
}[] = [
  {
    id: 'talent',
    label: 'Talent',
    descricao: 'Acompanha e trata diretamente com o talento.',
    equipeSugerida: 'Gestão de Talent Manager',
    chip: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  },
  {
    id: 'orcamento',
    label: 'Orçamento',
    descricao: 'Orça os projetos que envolvem o talento.',
    equipeSugerida: 'Gestão de Orçamentos',
    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  {
    id: 'gp',
    label: 'GP',
    descricao: 'Gerência de Produto — atribuição a definir com a operação.',
    equipeSugerida: 'GP',
    chip: 'bg-amber-50 text-amber-700 ring-amber-200',
  },
  {
    id: 'audiencia',
    label: 'Audiência',
    descricao: 'Acompanha desempenho e dados de audiência.',
    equipeSugerida: 'Gestão de Audiência',
    chip: 'bg-sky-50 text-sky-700 ring-sky-200',
  },
  {
    id: 'conteudo',
    label: 'Conteúdo',
    descricao: 'Responde pelo conteúdo e pelos formatos do talento.',
    equipeSugerida: 'Gestão de Conteúdo',
    chip: 'bg-violet-50 text-violet-700 ring-violet-200',
  },
  {
    id: 'producao',
    label: 'Produção',
    descricao: 'Executa e viabiliza as entregas.',
    equipeSugerida: 'Gestão de Produção',
    chip: 'bg-rose-50 text-rose-700 ring-rose-200',
  },
  {
    /*
      A sétima área, e a primeira que **não responde por um talento**.

      "Quem paga este projeto" é pergunta de projeto; "quem paga a Marina Duarte" não é pergunta.
      Por isso ela fica fora de `AREAS_DO_TALENTO` — ver a nota abaixo.
    */
    id: 'pagamento',
    label: 'Pagamento',
    descricao: 'Executa o pagamento e acompanha a liquidação.',
    equipeSugerida: 'Financeiro',
    chip: 'bg-teal-50 text-teal-700 ring-teal-200',
  },
  {
    /*
      Como Pagamento, responde **por um projeto**: quem cuida do contrato desta linha. Fora de
      `areasDoTalento` pelo mesmo motivo.
    */
    id: 'juridico',
    label: 'Jurídico',
    descricao: 'Cuida do contrato e do que ele exige.',
    equipeSugerida: 'Jurídico',
    chip: 'bg-orange-50 text-orange-700 ring-orange-200',
  },
  {
    /*
      As duas frentes da produção, separadas em 03/08/2026 a pedido da operação.

      A área **Produção** responde pelo todo; estas duas respondem por metades que costumam ser de
      pessoas diferentes: o artístico cuida do que se vê na tela, o executivo do que faz a filmagem
      acontecer. Numa produção pequena é a mesma pessoa nas duas colunas, e não há problema nisso —
      o modelo não obriga a diferença, só permite registrá-la.

      Respondem **por projeto**, como Pagamento e Jurídico: "quem produz a Marina Duarte" não é
      pergunta. Por isso ficam fora de `areasDoTalento`.
    */
    id: 'artistico',
    label: 'Produtor Artístico',
    descricao: 'Responde pela direção artística do material.',
    equipeSugerida: 'Produção',
    chip: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200',
  },
  {
    id: 'executivo',
    label: 'Executivo',
    descricao: 'Responde pela viabilização: equipe, agenda e locação.',
    equipeSugerida: 'Produção',
    chip: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  },
];

export function getArea(id: AreaTalento) {
  return AREAS.find((area) => area.id === id);
}

/** Equipe que atende a área. A primeira encontrada vence — a marcação é de uma equipe só. */
export function equipeDaArea(equipes: Equipe[], area: AreaTalento): Equipe | undefined {
  return equipes.find((equipe) => equipe.areaTalento === area);
}

/**
 * Quem pode ser nomeado responsável de uma área.
 *
 * Sai da equipe que atende a área. Quem já está nomeado continua na lista mesmo tendo saído da
 * equipe depois — senão a ficha mostraria um responsável que não dá para trocar.
 */
export function candidatosDaArea(
  equipes: Equipe[],
  usuarios: Usuario[],
  area: AreaTalento,
  jaNomeadoId?: string,
): Usuario[] {
  const equipe = equipeDaArea(equipes, area);
  return usuarios.filter(
    (usuario) =>
      usuario.id === jaNomeadoId || (equipe ? getPapelNaEquipe(equipe, usuario.id) !== null : false),
  );
}

/** Responsáveis de uma área, sempre como lista. */
export function responsaveisDaArea(talento: Talento, area: AreaTalento): string[] {
  return talento.responsaveis[area] ?? [];
}

/**
 * Adiciona ou remove uma pessoa da área — o mesmo gesto liga e desliga.
 *
 * Área que fica sem ninguém perde a chave, em vez de guardar uma lista vazia: "sem responsável"
 * e "lista vazia" seriam dois jeitos de dizer a mesma coisa, e um deles acabaria não testado.
 */
export function alternarResponsavelDaArea(
  talento: Talento,
  area: AreaTalento,
  usuarioId: string,
): Talento {
  const atuais = responsaveisDaArea(talento, area);
  const proximos = atuais.includes(usuarioId)
    ? atuais.filter((id) => id !== usuarioId)
    : [...atuais, usuarioId];

  const responsaveis = { ...talento.responsaveis };
  if (proximos.length > 0) responsaveis[area] = proximos;
  else delete responsaveis[area];

  return { ...talento, responsaveis };
}

/** Esvazia a área de uma vez. */
export function limparArea(talento: Talento, area: AreaTalento): Talento {
  const responsaveis = { ...talento.responsaveis };
  delete responsaveis[area];
  return { ...talento, responsaveis };
}

export function areasDefinidas(talento: Talento): number {
  return AREAS.filter((area) => responsaveisDaArea(talento, area.id).length > 0).length;
}

/** Ids das pessoas nomeadas na ficha — a mesma pessoa pode cobrir várias áreas. */
export function nomeadosDoTalento(talento: Talento): string[] {
  return [...new Set(Object.values(talento.responsaveis).flat().filter(Boolean) as string[])];
}

/**
 * A ficha ainda é só um nome?
 *
 * Serve para saber quando o `cadastroPendente` já cumpriu o papel: assim que qualquer campo além
 * do nome é preenchido, alguém olhou para a ficha e a pendência deixa de existir.
 */
export function fichaVazia(talento: Talento): boolean {
  const textos = [
    talento.nomeArtistico, talento.empresa, talento.email, talento.telefone, talento.local,
    talento.observacoes, talento.razaoSocial, talento.cnpj, talento.faturamento,
    talento.condicaoPagamento, talento.dadosBancarios,
  ];
  return (
    textos.every((valor) => !valor?.trim()) &&
    Object.values(talento.redes).every((valor) => !valor?.trim()) &&
    nomeadosDoTalento(talento).length === 0
  );
}

/** Normaliza para comparação tolerante a acento e caixa. */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
}

/**
 * Contratos de um talento.
 *
 * Prioriza o vínculo por id; cai para o nome apenas nos contratos antigos, criados antes de o
 * talento existir no cadastro. Comparar só por nome seria frágil — dois "João Silva" viram um.
 */
export function contratosDoTalento(talento: Talento, contratos: TalentContract[]): TalentContract[] {
  const nome = normalizar(talento.nome);
  return contratos.filter(
    (contrato) =>
      contrato.talentoId === talento.id ||
      (!contrato.talentoId && normalizar(contrato.talento) === nome),
  );
}

/** Talento cadastrado com este nome — usado para vincular o contrato na digitação. */
export function encontrarTalentoPorNome(nome: string, talentos: Talento[]): Talento | undefined {
  const alvo = normalizar(nome);
  if (!alvo) return undefined;
  return talentos.find((talento) => normalizar(talento.nome) === alvo);
}

/** Já existe alguém com esse nome? Evita cadastro duplicado do mesmo talento. */
export function nomeEmUso(nome: string, talentos: Talento[], ignorarId?: string): boolean {
  const alvo = normalizar(nome);
  return talentos.some((talento) => talento.id !== ignorarId && normalizar(talento.nome) === alvo);
}

/**
 * Normalização de nome de marca — a chave de comparação da lista.
 *
 * Sem acento, sem caixa e sem pontuação: "Coca-Cola", "coca cola" e "COCA-COLA" viram a mesma
 * chave. É o que impede a lista de crescer com três entradas da mesma empresa.
 *
 * Mora aqui, e não em `referencias.ts`, porque é comparação **exata após normalizar** — não tem a
 * ver com a semelhança aproximada que aquele módulo mede.
 */
export function normalizarNomeDeMarca(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/* ------------------------------------------------------------------ *
 * Origem do talento
 * ------------------------------------------------------------------ */

export interface OpcaoOrigemTalento {
  id: OrigemTalento;
  label: string;
  hint: string;
}

/**
 * Como o talento chegou.
 *
 * Lista fechada porque a pergunta é de contagem — quanto do plantel veio de cada caminho. Texto
 * livre devolveria "indicação", "veio por indicação" e "indicado" como três respostas.
 */
export const ORIGENS_TALENTO: OpcaoOrigemTalento[] = [
  { id: 'casting', label: 'Casting', hint: 'Selecionado em processo de casting' },
  { id: 'indicacao', label: 'Indicação', hint: 'Chegou por indicação de terceiro' },
  { id: 'prospeccao', label: 'Prospecção', hint: 'A casa foi atrás' },
  { id: 'globo', label: 'Globo', hint: 'Veio do elenco ou de contrato Globo' },
  { id: 'inbound', label: 'Inbound', hint: 'O talento procurou a casa' },
];

/** `undefined` para ausente ou desconhecido — ausente não é nenhuma das opções. */
export function getOrigemTalento(id: OrigemTalento | undefined): OpcaoOrigemTalento | undefined {
  return ORIGENS_TALENTO.find((opcao) => opcao.id === id);
}

/**
 * A ficha do talento nomeado na oportunidade.
 *
 * Casa pelo `talentoId` quando existe e cai no nome normalizado quando não — linhas antigas e as
 * criadas por ingestão guardam só o nome.
 */
export function fichaDoTalento(
  oportunidade: { talento?: string; talentoId?: string },
  talentos: Talento[],
): Talento | undefined {
  if (oportunidade.talentoId) {
    const porId = talentos.find((talento) => talento.id === oportunidade.talentoId);
    if (porId) return porId;
  }
  return encontrarTalentoPorNome(oportunidade.talento ?? '', talentos);
}
