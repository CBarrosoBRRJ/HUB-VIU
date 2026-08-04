import { Equipe } from '../types';

/**
 * Equipes iniciais.
 *
 * A equipe faz dois trabalhos: dá acesso ao quadro **e** é a lista de quem pode ser nomeado
 * responsável nos registros dele. As que têm `areaTalento` alimentam a coluna daquela área na
 * ficha do talento exclusivo.
 */
export const EQUIPES_SEED: Equipe[] = [
  {
    id: 'eq1',
    nome: 'Gestão de Contratos',
    paginasPermitidas: ['backlog', 'contratos', 'talentos'],
    // Quem toca o contrato precisa falar com o talento e faturar — daí as duas abas sensíveis.
    visoesLiberadas: ['talentos:contato', 'talentos:financeiro'],
    membros: [
      { usuarioId: 'u3', papel: 'responsavel' },
      { usuarioId: 'u2', papel: 'membro' },
      { usuarioId: 'u4', papel: 'membro' },
    ],
    criadaEm: '2026-08-01T09:00:00.000Z',
  },
  {
    id: 'eq2',
    nome: 'Gestão de Orçamentos',
    paginasPermitidas: ['backlog', 'talentos'],
    // Quem orça precisa dos números da oportunidade.
    visoesLiberadas: ['backlog:financeiro'],
    areaTalento: 'orcamento',
    membros: [
      { usuarioId: 'u2', papel: 'responsavel' },
      { usuarioId: 'u1', papel: 'membro' },
    ],
    criadaEm: '2026-08-01T09:00:00.000Z',
  },
  {
    id: 'eq3',
    nome: 'Gestão de Talent Manager',
    paginasPermitidas: ['talentos'],
    areaTalento: 'talent',
    membros: [{ usuarioId: 'u3', papel: 'responsavel' }],
    criadaEm: '2026-08-01T09:00:00.000Z',
  },
  {
    id: 'eq4',
    nome: 'GP',
    paginasPermitidas: ['talentos'],
    areaTalento: 'gp',
    membros: [{ usuarioId: 'u4', papel: 'responsavel' }],
    criadaEm: '2026-08-01T09:00:00.000Z',
  },
  {
    id: 'eq5',
    nome: 'Gestão de Audiência',
    paginasPermitidas: ['talentos'],
    areaTalento: 'audiencia',
    membros: [{ usuarioId: 'u2', papel: 'membro' }],
    criadaEm: '2026-08-01T09:00:00.000Z',
  },
  {
    id: 'eq6',
    nome: 'Gestão de Conteúdo',
    paginasPermitidas: ['talentos'],
    areaTalento: 'conteudo',
    membros: [{ usuarioId: 'u4', papel: 'membro' }],
    criadaEm: '2026-08-01T09:00:00.000Z',
  },
  {
    id: 'eq7',
    nome: 'Gestão de Produção',
    paginasPermitidas: ['talentos'],
    areaTalento: 'producao',
    // Sem `visoesLiberadas`: enxerga o quadro, mas não o telefone nem o faturamento.
    membros: [
      { usuarioId: 'u1', papel: 'responsavel' },
      { usuarioId: 'u5', papel: 'membro' },
    ],
    criadaEm: '2026-08-01T09:00:00.000Z',
  },
  /*
    As duas áreas que respondem **por projeto**, não por talento — ver `areasDoTalento`.

    Sem uma equipe marcando a área, a coluna correspondente no Backlog abriria o painel vazio: os
    candidatos saem da equipe que atende a área. Uma coluna sem ninguém para escolher parece
    defeito, e é.
  */
  {
    id: 'eq8',
    nome: 'Pagamentos',
    paginasPermitidas: ['backlog'],
    // Quem paga precisa dos números — e só deles.
    // A aba Pagamento foi fundida no Financeiro — uma liberação cobre as duas de antes.
    visoesLiberadas: ['backlog:financeiro'],
    areaTalento: 'pagamento',
    membros: [
      { usuarioId: 'u2', papel: 'responsavel' },
      { usuarioId: 'u5', papel: 'membro' },
    ],
    criadaEm: '2026-08-02T09:00:00.000Z',
  },
  {
    id: 'eq9',
    nome: 'Jurídico',
    paginasPermitidas: ['backlog', 'contratos'],
    visoesLiberadas: ['backlog:juridico'],
    areaTalento: 'juridico',
    membros: [{ usuarioId: 'u4', papel: 'responsavel' }],
    criadaEm: '2026-08-02T09:00:00.000Z',
  },
  /*
    As duas frentes da produção ganharam área própria em 03/08/2026, e **toda área precisa de uma
    equipe**: os candidatos de uma coluna de pessoas saem dela, e sem equipe o painel abre vazio.
    Foi um defeito real quando Pagamento e Jurídico nasceram — `jornadaVisoes` passou a exigir.

    São equipes separadas, e não a de Produção com duas marcas, porque `areaTalento` é uma por
    equipe: a marcação liga a coluna aos seus candidatos, e duas áreas na mesma equipe fariam a
    segunda ficar sem ninguém.
  */
  {
    id: 'eq10',
    nome: 'Produção Artística',
    paginasPermitidas: ['backlog'],
    areaTalento: 'artistico',
    membros: [{ usuarioId: 'u5', papel: 'responsavel' }],
    criadaEm: '2026-08-03T09:00:00.000Z',
  },
  {
    id: 'eq11',
    nome: 'Produção Executiva',
    paginasPermitidas: ['backlog'],
    areaTalento: 'executivo',
    membros: [{ usuarioId: 'u3', papel: 'responsavel' }],
    criadaEm: '2026-08-03T09:00:00.000Z',
  },
];
