/** Contratos de dados compartilhados entre as páginas. */

import { TalentoStatus } from './utils/talentosStatus';

export type AppPage =
  | 'backlog' | 'contratos' | 'talentos' | 'clientes' | 'equipes' | 'usuarios' | 'perfil';

/** Páginas do Workspace que uma equipe pode ter acesso. */
export const PAGINAS_WORKSPACE: { id: AppPage; label: string }[] = [
  { id: 'backlog', label: 'Backlog de Agenciados' },
  { id: 'contratos', label: 'Contratos de Agenciados' },
  { id: 'talentos', label: 'Talentos' },
  { id: 'clientes', label: 'Cadastro de Clientes' },
];

/**
 * Perfil de sistema — o **teto** de capacidade da pessoa na plataforma.
 *
 * `admin` é o **Admin Convidado**: quem o dono convidou para ajudar na administração. O Dono do
 * sistema não é um perfil, e sim a marca `ehDono` — ele está acima de qualquer perfil.
 *
 * Não confundir com `PapelEquipe`, que diz *onde* esse teto se aplica.
 */
export type PerfilSistema = 'admin' | 'responsavel' | 'membro';

/**
 * Capacidades administrativas que o dono liga e desliga por pessoa.
 *
 * O perfil dá um conjunto mínimo; o resto é concedido caso a caso — inclusive por janela de
 * tempo, para cobrir ausências sem promover ninguém em definitivo.
 */
export type AcaoConcedivel =
  | 'gerenciar_usuarios'
  | 'gerenciar_acessos'
  | 'definir_perfis'
  | 'criar_equipe'
  | 'conceder_quadros'
  | 'gerenciar_dominios'
  | 'excluir_usuarios'
  | 'decidir_solicitacoes';

export interface Concessao {
  id: string;
  usuarioId: string;
  acao: AcaoConcedivel;
  concedidaPorId: string;
  criadaEm: string;
  /** Janela temporária (ex.: férias do dono). Sem valor, vale por tempo indeterminado. */
  expiraEm?: string;
}

/**
 * Situação da pessoa — independente do perfil.
 *
 * `ferias` e `afastado` sinalizam ausência sem tirar acesso; `inativo` e `desligado` barram
 * a entrada preservando o histórico.
 */
export type SituacaoUsuario = 'ativo' | 'ferias' | 'afastado' | 'inativo' | 'desligado';

export interface Usuario {
  id: string;
  nome: string;
  /** E-mail de acesso — chave de identidade, normalizada em minúsculas. */
  email: string;
  cargo: string;
  telefone: string;
  local: string;
  /** Data de nascimento, no formato `yyyy-mm-dd`. */
  nascimento: string;
  perfil: PerfilSistema;
  situacao: SituacaoUsuario;
  /** Criador da conta. Imutável: não pode ser rebaixado, inativado nem excluído. */
  ehDono?: boolean;
  /**
   * E-mails adicionais de acesso — exclusivo do dono.
   *
   * Ele é a única identidade que pode entrar por mais de uma conta e por domínio livre; para
   * todo o resto vale um e-mail só, dentro dos domínios autorizados.
   */
  emailsAlternativos?: string[];
  /**
   * Foto de perfil como data URL.
   *
   * Sem servidor de arquivos, a imagem é redimensionada no navegador e guardada embutida.
   * Quando houver backend, isto vira a URL de um objeto no storage.
   */
  fotoUrl?: string;
}

/**
 * Troca de e-mail de acesso pendente de confirmação.
 *
 * O e-mail é a identidade: mudá-lo sem confirmar permitiria assumir a conta de outra pessoa
 * apenas digitando o endereço dela.
 */
export interface TrocaEmail {
  id: string;
  usuarioId: string;
  novoEmail: string;
  token: string;
  criadaEm: string;
  expiraEm: string;
  confirmadaEm?: string;
}

/** Convite de entrada — o que autoriza um e-mail a acessar a plataforma. */
export interface Convite {
  id: string;
  /** Segredo do link. Único por convite. */
  token: string;
  /** E-mail autorizado, normalizado. O aceite só vale para ele. */
  email: string;
  equipeId: string;
  /** Papel com que a pessoa entra na equipe. */
  papel: PapelEquipe;
  criadoPorId: string;
  criadoEm: string;
  /** ISO — 24h após a criação. */
  expiraEm: string;
  aceitoEm?: string;
  revogadoEm?: string;
}

/**
 * Link coletivo de entrada numa equipe.
 *
 * Diferente do convite, que é nominal: aqui qualquer pessoa com o link **e um e-mail de domínio
 * autorizado** entra — sempre como `membro`. É a troca deliberada de burocracia por alcance,
 * contida por quatro limites: domínio, prazo de 24h, rotação diária e desativação a qualquer
 * momento.
 */
export interface LinkEquipe {
  id: string;
  equipeId: string;
  token: string;
  criadoPorId: string;
  criadoEm: string;
  expiraEm: string;
  desativadoEm?: string;
  /** Auditoria: quem entrou por este link e quando. */
  usos: { usuarioId: string; em: string }[];
}

/** Pedido de acesso aberto por quem não pode se conceder acesso sozinho. */
export interface SolicitacaoAcesso {
  id: string;
  solicitanteId: string;
  /** Equipe à qual a pessoa quer pertencer. */
  equipeId: string;
  justificativa: string;
  status: 'pendente' | 'aprovada' | 'recusada';
  criadaEm: string;
  /** Quem decidiu — preenchido ao aprovar ou recusar. */
  decididaPorId?: string;
}

/** Papel de uma pessoa dentro de uma equipe. */
export type PapelEquipe = 'responsavel' | 'membro';

export interface MembroEquipe {
  usuarioId: string;
  papel: PapelEquipe;
  /**
   * Prazo da responsabilidade temporária (ISO).
   *
   * Vencido, a pessoa volta a `membro` **na leitura** — sem depender de rotina agendada, que
   * seria mais um ponto de falha para uma regra de segurança.
   */
  responsavelAte?: string;
}

export interface Equipe {
  id: string;
  nome: string;
  /** Páginas do Workspace visíveis para a equipe. */
  paginasPermitidas: AppPage[];
  membros: MembroEquipe[];
  /**
   * Área de talentos que a equipe atende.
   *
   * É o que liga a coluna de uma área aos seus candidatos. Sem isto, a lista de responsáveis
   * teria de ser casada pelo nome da equipe — frágil, porque nome se edita.
   */
  areaTalento?: AreaTalento;
  /**
   * Visões **restritas** liberadas para a equipe (ids de `VISOES`).
   *
   * Só as abas marcadas como restritas passam por aqui — dado pessoal e financeiro não são
   * consequência de "ter o quadro". As demais abas seguem o acesso do quadro.
   */
  visoesLiberadas?: string[];
  /**
   * Abas **abertas** que esta equipe não vê — o espelho de `visoesLiberadas`.
   *
   * As duas listas existem porque os padrões são opostos, e de propósito: aba sensível nasce
   * fechada e precisa de liberação; aba aberta nasce visível e precisa de ocultação. Uma lista só
   * obrigaria a escolher um padrão para as duas, e nenhum dos dois serve para o outro caso.
   */
  visoesOcultas?: string[];
  /**
   * Colunas **ocultas** para a equipe (ids de `TODAS_AS_COLUNAS`).
   *
   * Bloqueio por exceção, ao contrário das visões: quem vê a aba vê as colunas dela, menos estas.
   * Liberar coluna a coluna daria dezenas de tiques por equipe e ninguém manteria.
   */
  colunasOcultas?: string[];
  criadaEm: string;
}

/**
 * Áreas que respondem por um talento exclusivo.
 *
 * Cada área tem **uma equipe** que a atende (`Equipe.areaTalento`) e, por talento, **uma pessoa**
 * dessa equipe como responsável. A equipe define de onde sai a lista; a pessoa é quem responde.
 */
export type AreaTalento =
  | 'talent' | 'orcamento' | 'gp' | 'audiencia' | 'conteudo' | 'producao'
  | 'pagamento' | 'juridico' | 'artistico' | 'executivo';

/**
 * Vínculo comercial do talento com a casa.
 *
 * `exclusivo` é agenciado pela VIU; `interveniencia` é tocado sem exclusividade. **Mesma
 * entidade**: o que muda é o vínculo, não a pessoa — por isso um campo, e não dois cadastros.
 * Promover alguém a exclusivo é trocar este valor, sem migrar registro nem perder histórico.
 */
export type TipoTalento = 'exclusivo' | 'interveniencia';

/**
 * Como o talento chegou à casa.
 *
 * Atributo da **ficha**, não do projeto: quem veio por indicação veio por indicação em todo
 * projeto que fizer. Responde de onde vem o elenco — se a casa vive de prospectar ou de ser
 * procurada, e quanto do plantel veio da Globo.
 */
export type OrigemTalento = 'casting' | 'indicacao' | 'prospeccao' | 'globo' | 'inbound';

/** Perfis do talento nas redes, sem @ e sem URL — só o identificador. */
export interface RedesTalento {
  instagram: string;
  youtube: string;
  tiktok: string;
  facebook: string;
  x: string;
  site: string;
}

/**
 * Talento agenciado — exclusivo ou de interveniência.
 *
 * O quadro de Contratos abrange **todos** os contratos tocados; esta entidade guarda o cadastro
 * das pessoas por trás deles, com as responsabilidades internas de cada frente.
 */
export interface Talento {
  id: string;
  nome: string;
  tipo: TipoTalento;
  /**
   * Como chegou à casa. Opcional: **ausente é "não classificado"**, que não é nenhuma das opções.
   *
   * Um default aqui faria o relatório contar fichas antigas como se alguém tivesse respondido.
   */
  origem?: OrigemTalento;
  /** Como é creditado publicamente, quando difere do nome. */
  nomeArtistico: string;
  /** Nome comercial de quem representa o talento. */
  empresa: string;
  email: string;
  telefone: string;
  local: string;
  redes: RedesTalento;
  observacoes: string;
  /** Razão social — o nome jurídico, que costuma diferir do comercial. */
  razaoSocial: string;
  cnpj: string;
  /** Faturamento acordado, como escrito pela operação (moeda e periodicidade variam). */
  faturamento: string;
  /** Ex.: "30 dias após a entrega", "50% na assinatura". */
  condicaoPagamento: string;
  /** Banco, agência e conta — texto livre até existir integração. */
  dadosBancarios: string;
  /**
   * Pessoas responsáveis por área — chave ausente ou lista vazia significa "a definir".
   *
   * **Lista, não pessoa única:** uma área pode ter mais de um responsável, e a operação encontra
   * isso o tempo todo — dupla de produção, um titular e um substituto. Forçar uma pessoa fazia a
   * segunda ficar de fora do registro, e portanto do acesso.
   *
   * Os candidatos saem sempre da equipe que atende aquela área: nomear alguém de fora criaria um
   * responsável sem acesso ao próprio registro.
   */
  responsaveis: Partial<Record<AreaTalento, string[]>>;
  /**
   * Ficha aberta automaticamente a partir de outro quadro, ainda sem curadoria.
   *
   * Nasce quando alguém escreve um nome novo na coluna Talento de um contrato: em vez de deixar o
   * nome solto e sem ficha, o cadastro é criado na hora e marcado para alguém completar. Some ao
   * primeiro dado preenchido além do nome.
   */
  cadastroPendente?: boolean;
  criadoEm: string;
}

/* ------------------------------------------------------------------ *
 * Backlog de Agenciados — oportunidades
 * ------------------------------------------------------------------ */

/**
 * Por onde a oportunidade **entrou no sistema** — a via técnica.
 *
 * Não confundir com `OrigemComercial`, que diz de onde vem o **negócio**. Esta responde "quem
 * digitou isto?"; aquela, "de qual frente comercial veio?". O nome `entradaPor` existe justamente
 * porque a operação chama de "origem" a outra coisa.
 */
export type EntradaPorOportunidade = 'manual' | 'email' | 'salesforce';

/** Frente comercial de onde o negócio vem — o vocabulário da operação. */
export type OrigemComercial = 'globoplay' | 'tv_globo' | 'canais_pagos' | 'viu_agencia' | 'outros';

/** Como a demanda chegou até a área comercial. */
export type InputOportunidade = 'interno' | 'mercado' | 'inbound' | 'proativo' | 'viu_first';

/** Natureza do projeto. */
export type TipoProjeto = 'patrocinio' | 'sob_demanda' | 'projeto_especial' | 'outro';

/**
 * Pipeline de triagem e elaboração — o fluxo do PRD 01 §4.
 *
 * `entrada` é onde o SLA de 5 dias úteis corre; os demais são o andamento depois de aceita.
 */
export type StatusOportunidade =
  | 'entrada'
  | 'elaboracao'
  | 'revisao'
  | 'aguardando_feedback'
  | 'ajuste'
  | 'standby'
  | 'fechado'
  | 'declinado'
  | 'encerrado';

/**
 * Uma espera com nome e endereço — "com quem está a bola".
 *
 * Veio da planilha da operação, que anotava "Em elaboração – Validação Gestão Esporte" como se
 * fosse status. Não é: é uma **espera dentro** do status, e tratá-la como etapa multiplicaria a
 * máquina de transições por cada terceiro que pode segurar um projeto. Ver [08 §7].
 */
export type TipoPendencia =
  | 'retorno_marca_executivo'
  | 'validacao_gestao_esporte'
  | 'cotacao_gestao_elenco'
  | 'validacao_externa'
  | 'calculo_producao'
  | 'validacao_planejamento'
  | 'validacao_talent_manager'
  | 'validacao_talento';

/**
 * O post-it com relógio: abre quando a bola sai da mão, marca "chegou" quando volta.
 *
 * Nada aqui é definitivo — reabrir limpa `chegouEm`, descartar remove o registro. O que fica é a
 * matéria-prima do relatório de SLA: quanto tempo cada espera durou, e em qual status ela
 * atravessou o projeto.
 */
export interface Pendencia {
  id: string;
  tipo: TipoPendencia;
  /**
   * Status em que a espera foi aberta.
   *
   * É a régua da "revisão parcelada": uma pendência aberta na Elaboração e marcada como chegada
   * na Revisão diz que o projeto avançou incompleto — fato medido, não julgado.
   */
  statusAbertura: StatusOportunidade;
  /** `yyyy-mm-dd` — quando a bola saiu da mão. */
  abertaEm: string;
  /** `yyyy-mm-dd` — quando a resposta chegou. Ausente = ainda esperando. */
  chegouEm?: string;
}

/**
 * De onde partiu a recusa.
 *
 * Acompanha `status: 'declinado'` — ver `Oportunidade.motivoDeclinio`.
 */
export type MotivoDeclinio = 'interno' | 'mercado' | 'talento';

export type PrioridadeOportunidade = 'baixa' | 'media' | 'alta';

export interface Oportunidade {
  id: string;
  /** Nome do projeto, como a operação o chama. */
  titulo: string;
  marca: string;
  /** Nome do talento — texto livre, vinculado à ficha quando existe. */
  talento: string;
  talentoId?: string;
  /*
    Classificações **opcionais**: ausente significa "ainda não classificado", que é diferente de
    qualquer valor da lista. Um default aqui faria o quadro afirmar o que ninguém disse — e o
    relatório contaria projetos recém-criados como se tivessem sido classificados.
  */
  /** Natureza do projeto — patrocínio, sob demanda, projeto especial. */
  tipoProjeto?: TipoProjeto;
  /** Como a demanda chegou: interno, mercado, inbound, proativo, VIU First. */
  input?: InputOportunidade;
  /** Frente comercial de onde vem o negócio. */
  origem?: OrigemComercial;
  /**
   * O talento é **exclusivo** da casa?
   *
   * Muda o caminho jurídico e quem precisa assinar: quando não é exclusivo, quem o representa
   * entra no contrato como interveniente. Por isso é campo próprio, e não observação.
   *
   * **Derivado** do vínculo na ficha do talento (`intervenienciaDe` → `exclusividadeDe`), nunca
   * digitado — ver `Talento.tipo`. Sem ficha, fica `undefined` na leitura e a célula diz isso.
   *
   * > Era `interveniencia: boolean`, com o valor invertido, até 03/08/2026. A operação lê a
   * > coluna como "Exclusivo", e um campo que guarda o oposto do que a tela mostra é uma
   * > armadilha permanente para quem escrever a próxima regra. Ver [08 §6.0.2b].
   */
  exclusivo: boolean;
  prioridade?: PrioridadeOportunidade;

  status: StatusOportunidade;
  /**
   * Desde quando está neste status (`yyyy-mm-dd`).
   *
   * É o relógio do **abandono**: uma oportunidade que fica 20 dias parada em qualquer etapa ativa
   * é encerrada automaticamente. Sem este campo não haveria como medir — `entradaEm` diz quando
   * chegou, não há quanto tempo travou onde está.
   */
  statusDesde: string;
  /**
   * Encerrada pela regra dos 20 dias, e não por decisão de alguém.
   *
   * Distinguir importa: quem olha um projeto encerrado precisa saber se foi escolha ou abandono,
   * e a reabertura de um caso esquecido é uma conversa diferente da de um caso decidido.
   */
  encerradaAutomaticamente?: boolean;
  /**
   * Por que foi declinada — só existe quando `status === 'declinado'`.
   *
   * Um projeto pode cair por três razões distintas, e a diferença entre elas é a informação mais
   * útil do desfecho: "não temos capacidade", "o cliente desistiu" e "o talento não quis" apontam
   * para decisões de negócio diferentes.
   *
   * É um **qualificador**, não um status: os três continuam sendo `declinado`. Fatiar em três
   * status multiplicaria por três tudo que trata desfecho — a máquina de transições, o farol, os
   * filtros — para expressar uma distinção que é de motivo, não de etapa.
   */
  motivoDeclinio?: MotivoDeclinio;
  /** Data de entrada (`yyyy-mm-dd`), preenchida automaticamente. */
  entradaEm: string;
  /** Entrada + 5 dias úteis, recalculado quando a entrada muda. */
  prazoEm: string;

  /**
   * As esperas da linha — abertas e já chegadas.
   *
   * Lista completa, não só as abertas: o histórico é o dado do SLA ("a Cotação de Elenco segurou
   * esta carta por 4 dias"), e apagar a espera resolvida apagaria a resposta junto. A contagem
   * fina por status fica para o banco + Power BI — aqui se grava o que ele vai ler.
   */
  pendencias: Pendencia[];

  /** Responsáveis por área, como nos talentos — a mesma estrutura, o mesmo seletor. */
  /**
   * Quem **responde** por cada área.
   *
   * Separado de `apoios` porque a pergunta que a operação faz é "a quem eu cobro?", e uma lista
   * plana com três nomes não responde isso.
   */
  responsaveis: Partial<Record<AreaTalento, string[]>>;
  /**
   * Quem **apoia** cada área, sem responder por ela.
   *
   * Conta como nomeado para efeito de acesso — quem apoia precisa enxergar a linha —, mas não é a
   * pessoa a quem se cobra a entrega.
   */
  apoios?: Partial<Record<AreaTalento, string[]>>;

  /* --- Financeiro --- */
  valorProjeto: string;
  cache: string;
  /**
   * Comissão da Globo, quando o negócio passa por ela.
   *
   * Campo próprio, e não uma segunda leitura de `comissao`: são duas partes diferentes do mesmo
   * bolo, e somá-las de cabeça a cada linha é o tipo de conta que ninguém confere.
   */
  comissaoGlobo: string;
  comissao: string;
  impostos: string;
  custoProducao: string;
  /**
   * Economia obtida na negociação.
   *
   * **Digitado, não calculado.** Seria tentador derivá-lo de valor − custos, mas o que conta como
   * economia depende do que foi negociado — desconto de tabela, permuta, escopo ampliado sem
   * acréscimo. Um número inventado pela fórmula errada é pior que um campo em branco.
   */
  saving: string;

  /* --- Pagamento --- */
  /**
   * Em quantas parcelas o cachê será pago.
   *
   * Número, como as contagens do Escopo: a pergunta é de fluxo de caixa, e "3x sem juros" não se
   * soma. A condição por extenso, quando existir, é assunto de observação.
   */
  parcelas?: number;
  /**
   * Código PEP — o elemento contábil que amarra o pagamento ao projeto no ERP.
   *
   * Texto porque o formato é de outro sistema, e um dia ele muda sem avisar.
   */
  pep: string;

  /* --- Jurídico --- */
  /**
   * Quando o contrato foi fechado (`yyyy-mm-dd`).
   *
   * Diferente de `statusDesde`, que marca a última movimentação: esta data não se move mais
   * depois de posta. É o marco que o jurídico usa para contar vigência.
   */
  fechamentoEm?: string;
  tipoContratacao: string;
  numeroContrato: string;

  /* --- Entrega --- */
  /**
   * O formato entregue. Substituiu o texto livre do modelo antigo.
   *
   * Opcional: **ausente é "não classificado"**, que não é nenhuma das opções.
   */
  output?: TipoOutput;
  /** Quanto o projeto pesa — ver `ImpactoProjeto`. Ausente é "não avaliado". */
  impacto?: ImpactoProjeto;

  /* --- Escopo: o que o projeto inclui --- */
  /*
    Os três tiques da aba Escopo, e a regra que os liga à aba Produção.

    O Escopo declara **o que o projeto tem**; a Produção detalha **como**. Sem o tique, a coluna
    correspondente lá fica travada e diz por quê — não é campo em branco esperando alguém, é campo
    que não se aplica a este projeto.

    **Por que booleano e não a ausência do valor.** "Ninguém preencheu ainda" e "este projeto não
    tem edição" são respostas diferentes, e uma coluna vazia diz as duas. O tique separa: sem tique
    é decisão tomada; com tique e sem valor é trabalho pendente.

    Ao desmarcar, o valor da Produção é **apagado**, com confirmação. Guardar um dado que a tela
    afirma não existir é o estado impossível que `qaBacklog` procura — e o Power BI leria o valor
    órfão sem saber que ele foi renegado.
  */
  temEdicao?: boolean;
  temConteudo?: boolean;
  temAudiencia?: boolean;

  /* --- Produção --- */
  /**
   * Quem edita o material. Ausente é "não definido".
   *
   * Só se preenche com `temEdicao` marcado. A lista responde **quem edita** — a pergunta "tem
   * edição?" é do tique, e ter as duas na mesma lista fazia o mesmo fato ter dois caminhos.
   */
  edicao?: TipoEdicao;
  /**
   * O formato editorial da peça. Ausente é "não classificado".
   *
   * Responde *"que tipo de peça é essa?"* — publieditorial, review, tutorial. Vive ao lado de
   * Edição porque as duas descrevem **como o material é feito**: uma diz a natureza, a outra a mão.
   */
  formatoConteudo?: FormatoConteudo;
  /**
   * O porte do alcance. Ausente é "não avaliado".
   *
   * Responde *"quanta gente essa peça alcança?"*. Não confundir com `impacto`, que mede quanto o
   * **projeto** pesa para a casa: um projeto pequeno pode ter alcance de massa, e um grande pode
   * ser de nicho. Por isso vivem em abas diferentes.
   */
  alcanceAudiencia?: AlcanceAudiencia;

  /* --- Escopo: o que foi pedido --- */
  /**
   * O que o projeto pede, em texto corrido.
   *
   * **Texto livre e longo, de propósito.** Substituiu as quatro contagens (reels, vídeos, posts,
   * cotas) em 03/08/2026: um briefing real não cabe em quatro números, e o que a operação precisa
   * registrar é o pedido como ele chegou — "3 reels + 1 vídeo de 60s, com direito de uso de 6
   * meses" diz o que "3 · 1 · 0 · 0" nunca disse.
   *
   * A troca aceita perder a soma automática de peças. Foi decisão do produto: contagem exata é
   * pergunta do Power BI sobre o contrato fechado, não do quadro que ainda está negociando.
   */
  escopo: string;
  /** Como o material será captado. Ausente é "não definido". */
  captacaoProducao?: TipoCaptacao_Producao;
  /** Quando vai ao ar (`yyyy-mm-dd`). Vazio é "não agendado". */
  veiculacaoEm?: string;



  /* --- Cliente --- */
  /**
   * Qual contato da marca responde por **este** projeto.
   *
   * Segmento e categoria não estão aqui de propósito: descrevem a marca, e repeti-los na linha
   * faria a mesma Coca-Cola aparecer como Bebidas numa e Varejo noutra. Eles vivem em `Marca` e
   * a aba Cliente os mostra de lá — ver `segmentoDaMarca`.
   */
  contatoCliente: string;
  /**
   * Como o negócio chegou — ativa, passiva, indicação ou renovação.
   *
   * Distinta de `captacao`, que é da Produção e quer dizer filmagem. Mesma palavra, dois ofícios;
   * o nome longo aqui evita que um dia alguém preencha um achando que preenche o outro.
   */
  captacaoComercial?: TipoCaptacao;

  /* --- Links --- */
  /*
    Endereços para fora do sistema. Texto, sem validação de formato: caminhos de rede e links
    internos são legítimos, e um endereço errado custa um clique que não abre — não um dado
    corrompido.
  */
  linkProposta: string;
  linkSalesforce: string;
  linkPastaOrcamento: string;
  linkPastaPlanejamento: string;

  observacoes: string;

  /**
   * De qual linha esta foi duplicada.
   *
   * **Rastro, não vínculo.** As duas linhas são projetos independentes: mudar uma não mexe na
   * outra, e nada as move junto. O campo serve para responder "de onde isto veio" — pergunta que
   * aparece quando duas linhas parecem iguais e ninguém lembra por quê.
   *
   * Guarda o id mesmo que a origem seja excluída depois. Um rastro que some quando o outro lado
   * some não é rastro.
   */
  duplicadaDe?: string;

  entradaPor: EntradaPorOportunidade;
  /**
   * Chave do sistema de origem — id do Salesforce, `Message-ID` do e-mail.
   *
   * É o que impede a mesma oportunidade de entrar duas vezes quando a integração reprocessa.
   * Ausente no cadastro manual, que não tem de onde deduplicar.
   */
  idExterno?: string;
  /** Quando a integração recebeu o dado, se diferente da entrada no sistema. */
  recebidoEm?: string;
  /**
   * Alguém já conferiu o que a integração trouxe?
   *
   * O que chega por e-mail ou Salesforce entra **não revisado**: o agente acerta o essencial e
   * erra o resto. Marcar como revisado é o gesto que diz "olhei e está de pé".
   */
  revisada: boolean;

  criadoEm: string;
}

export interface TalentContract {
  id: string;
  /** Nome do talento agenciado, como escrito na linha. */
  talento: string;
  /**
   * Vínculo com o talento exclusivo, quando existe.
   *
   * Contratos de interveniência não têm cadastro — por isso o campo é opcional e o nome
   * continua sendo texto livre.
   */
  talentoId?: string;
  /**
   * Do que é o contrato, em palavras de quem opera.
   *
   * Ex.: "Contrato de agenciamento", "Campanha Coca-Cola". É o que diferencia, na lista, dois
   * contratos do mesmo talento.
   */
  contrato: string;
  /** Número ou código do contrato — ex.: CTR-2026-001. */
  numero: string;
  /** Início da vigência, no formato `yyyy-mm-dd`. */
  inicio: string;
  /** Fim da vigência, no formato `yyyy-mm-dd`. */
  fim: string;
  status: TalentoStatus;
  /** Responsáveis pela linha; o primeiro é o principal (usado no agrupamento). */
  responsaveisIds: string[];
  /** Parceiros — apoiam a tramitação sem responder por ela. */
  parceirosIds: string[];
  /** Data e hora da criação do registro (ISO completo). */
  criadoEm: string;
}

/**
 * O que a linha de criação pode trazer pronto.
 *
 * Fora da lista ficam os campos que o formulário **não escolhe**: a identidade (`id`), o ponto do
 * fluxo (`status`, `statusDesde` — todo projeto nasce em Entrada), as datas derivadas
 * (`entradaEm`, `prazoEm`, `criadoEm`) e a procedência (`entradaPor`, `revisada`, `idExterno`).
 *
 * Deixá-los de fora não é restrição de formulário: é impedir que um caminho de escrita contorne
 * a máquina de estados e o SLA.
 */
export type CamposNovaOportunidade = Partial<
  Omit<
    Oportunidade,
    | 'id' | 'titulo' | 'status' | 'statusDesde' | 'motivoDeclinio' | 'encerradaAutomaticamente'
    | 'entradaEm' | 'prazoEm' | 'criadoEm' | 'entradaPor' | 'revisada' | 'idExterno'
  >
>;

/** Idem para o talento: nome e datas ficam de fora, o resto a criação aceita. */
export type CamposNovoTalento = Partial<Omit<Talento, 'id' | 'nome' | 'criadoEm'>>;

/**
 * Marca ou cliente atendido — a lista que a coluna Marca oferece.
 *
 * ## Por que virou entidade
 *
 * Enquanto era texto livre, "Coca-Cola", "Coca Cola" e "coca-cola" eram três marcas diferentes
 * para qualquer contagem — e o Power BI agruparia por string. Uma lista fechada resolve na origem:
 * escolher é mais rápido que digitar, e o nome fica igual em todos os quadros.
 *
 * ## Fornecedor e cliente na mesma tabela
 *
 * `tipo` distingue quem paga de quem presta serviço. São a mesma entidade porque a maioria dos
 * dados é a mesma, e porque uma empresa pode ser as duas coisas em projetos diferentes — separar
 * em duas tabelas obrigaria a cadastrá-la duas vezes.
 */
export interface Marca {
  id: string;
  nome: string;
  tipo: TipoMarca;
  /** Setor de atuação — Bebidas, Varejo, Financeiro… */
  segmento: string;
  /**
   * Recorte dentro do segmento — Refrigerantes dentro de Bebidas, Moda dentro de Varejo.
   *
   * Serve ao relatório: "quanto faturamos em Bebidas" é uma pergunta, "quanto em Cervejas" é
   * outra, e sem os dois níveis a segunda não tem resposta.
   */
  categoria: string;
  /**
   * Quem falar quando o projeto anda — a marca costuma ter **mais de um**.
   *
   * Lista, e não campo único, porque o contato de mídia não é o de jurídico. Cada projeto escolhe
   * o seu em `Oportunidade.contatoCliente`; aqui fica o cadastro de onde ele sai.
   */
  contatos: string[];
  observacoes: string;
  /**
   * Aberta a partir de um quadro, ainda sem curadoria.
   *
   * Mesma ideia de `Talento.cadastroPendente`: quem está preenchendo o Backlog não deveria parar
   * para cadastrar uma marca. O nome entra como **solicitação**, o trabalho continua, e alguém
   * completa depois — em vez de virar texto solto que ninguém revisa.
   */
  cadastroPendente?: boolean;
  criadoEm: string;
}

/**
 * O que será entregue.
 *
 * Lista fechada porque a pergunta é de contagem — quanto do trabalho é vídeo, quanto é presença.
 * Texto livre devolveria "reels", "Reels" e "vídeo curto" como três formatos.
 */
export type TipoOutput =
  | 'post' | 'reels' | 'stories' | 'video' | 'live' | 'evento' | 'merchandising';

/**
 * Como o material é captado.
 *
 * Lista fechada: a pergunta é de custo e agenda — externa e estúdio pedem equipe e diária;
 * material do talento, nenhum dos dois.
 */
export type TipoCaptacao_Producao =
  | 'estudio' | 'externa' | 'remota' | 'material_talento' | 'sem_captacao';

/**
 * **Quem** edita o material.
 *
 * Lista fechada: a pergunta é de capacidade — quanto do trabalho a casa edita e quanto terceiriza.
 *
 * > `sem_edicao` saiu em 03/08/2026, quando o tique `temEdicao` nasceu na aba Escopo. Os dois
 * > respondiam "tem edição?" por caminhos diferentes, e marcar o tique escolhendo "Sem edição"
 * > seria um estado que nada na tela resolveria. **Uma pergunta, um lugar.**
 */
export type TipoEdicao = 'interna' | 'talento' | 'agencia' | 'produtora';

/**
 * O formato editorial da peça.
 *
 * Lista fechada porque a pergunta é de contagem: quanto do que a casa entrega é publieditorial e
 * quanto é entretenimento. Texto livre devolveria "review", "Review" e "resenha" como três coisas.
 */
export type FormatoConteudo =
  | 'publieditorial' | 'review' | 'tutorial' | 'depoimento' | 'entretenimento' | 'institucional';

/**
 * O porte do alcance da peça.
 *
 * **Diferente de `ImpactoProjeto`:** impacto é quanto o projeto pesa para a casa; alcance é quanta
 * gente a peça atinge. Um projeto pequeno pode falar com a massa, e um grande pode ser de nicho —
 * e é justamente o cruzamento dos dois que a operação usa para decidir prioridade.
 */
export type AlcanceAudiencia = 'massa' | 'amplo' | 'segmentado' | 'nicho';

/**
 * Quanto o projeto pesa.
 *
 * **Diferente de prioridade:** prioridade é urgência — o que se faz primeiro. Impacto é tamanho —
 * o que muda o ano. Um projeto pequeno pode ser urgente, e um grande pode esperar.
 */
export type ImpactoProjeto = 'alto' | 'medio' | 'baixo';

/** Como o negócio chegou até a casa.
 *
 * Responde "de onde vem nosso pipeline" — se a operação vive de procurar cliente ou de ser
 * procurada. É diferente de `OrigemComercial`, que diz por qual frente o negócio entrou.
 */
export type TipoCaptacao = 'ativa' | 'passiva' | 'indicacao' | 'renovacao';

/** Quem paga, quem presta serviço, ou ambos. */
export type TipoMarca = 'cliente' | 'fornecedor' | 'ambos';
