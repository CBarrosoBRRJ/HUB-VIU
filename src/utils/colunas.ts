/**
 * Catálogo de colunas — a fonte única de "que colunas existem em cada aba".
 *
 * Fica aqui, e não no componente, por dois motivos:
 *
 * 1. **Permissão por coluna** precisa de um id estável. Se a lista vivesse no `.tsx` e o id
 *    fosse escrito à mão em outro lugar, os dois divergiriam na primeira coluna nova — e uma
 *    coluna sem id no catálogo seria uma coluna que ninguém consegue ocultar.
 * 2. É dado puro, testável sem montar React.
 *
 * O componente lê daqui e cuida só de **como** desenhar cada célula.
 */

import { AppPage, AreaTalento } from '../types';
import { areasDoTalento, REDES } from './talentos';

export interface ColunaCatalogo {
  /** `quadro:aba:campo` — estável, é a chave de permissão. */
  id: string;
  label: string;
  /**
   * Fração da largura da tabela, em porcento.
   *
   * **Invariante:** as colunas de uma aba de Talentos somam **78** — os 22% restantes são da
   * coluna Talento, fixa em toda aba. As de Contratos somam **100**, porque ali não há aba.
   *
   * Somas diferentes entre abas fazem as colunas dançarem ao trocar de aba, mesmo com
   * `table-fixed`. `testeColunas.mjs` trava os dois números.
   */
  peso: number;
  /**
   * Largura em **pixels**, quando o dado pede outra coisa que não a proporção.
   *
   * A grade contínua (§ no fim deste arquivo) mede em px: o peso vira `peso × 11` por padrão, e
   * este campo sobrepõe. Use quando o conteúdo tem tamanho conhecido — uma data, um booleano —
   * e a proporção herdada do modelo antigo o deixaria largo demais.
   */
  largura?: number;
  align: 'left' | 'center';
  /** Ordenável por este campo do registro. */
  field?: string;
  /**
   * Área cujas pessoas esta coluna nomeia.
   *
   * A **única** fonte: a grade não tem mais mapa aba → área. Antes a área vinha da aba, o que só
   * funcionava com uma por aba — Produção trouxe duas (Produção e GP) e a declaração migrou para
   * cá. Toda coluna de pessoas precisa preenchê-la, exceto Orçamento, que tem célula própria com
   * papéis de responsável e apoio.
   */
  area?: AreaTalento;
  /** Campo de texto editável célula a célula. */
  campo?: string;
  placeholder?: string;
  hint?: string;
  /**
   * Coluna que **não** pode ser ocultada.
   *
   * Ocultar a chave da linha (o nome) deixaria a tabela ilegível: sobrariam linhas anônimas que
   * ninguém consegue relacionar a nada. O mesmo vale para as colunas derivadas de contagem.
   */
  fixa?: boolean;
}

/* ------------------------------------------------------------------ *
 * Quadro: Talentos
 * ------------------------------------------------------------------ */

const T = 'talentos';

export const COLUNAS_TALENTOS: Record<string, ColunaCatalogo[]> = {
  [`${T}:identificacao`]: [
    {
      id: `${T}:identificacao:tipo`,
      label: 'Tipo',
      field: 'tipo',
      peso: 14,
      align: 'center',
      hint: 'Exclusivo: agenciado pela casa. Interveniência: contrato tocado sem exclusividade',
    },
    {
      id: `${T}:identificacao:nomeArtistico`,
      label: 'Nome artístico',
      field: 'nomeArtistico',
      campo: 'nomeArtistico',
      peso: 20,
      align: 'left',
      placeholder: 'Como é creditado',
    },
    {
      id: `${T}:identificacao:empresa`,
      label: 'Empresa',
      field: 'empresa',
      campo: 'empresa',
      peso: 20,
      align: 'left',
      placeholder: 'Nome comercial',
    },
    {
      id: `${T}:identificacao:areas`,
      label: 'Áreas',
      peso: 12,
      align: 'center',
      hint: 'Áreas com responsável definido — só para exclusivos',
      fixa: true,
    },
    {
      id: `${T}:identificacao:criadoEm`,
      label: 'Criado em',
      field: 'criadoEm',
      peso: 12,
      align: 'center',
      hint: 'Data em que a ficha foi cadastrada — preenchida automaticamente',
    },
  ],

  [`${T}:contato`]: [
    {
      id: `${T}:contato:email`,
      label: 'E-mail',
      field: 'email',
      campo: 'email',
      peso: 22,
      align: 'left',
      placeholder: 'contato@exemplo.com',
    },
    {
      id: `${T}:contato:telefone`,
      label: 'Telefone',
      field: 'telefone',
      campo: 'telefone',
      peso: 14,
      align: 'center',
      placeholder: '(00) 00000-0000',
    },
    {
      id: `${T}:contato:local`,
      label: 'Local',
      field: 'local',
      campo: 'local',
      peso: 16,
      align: 'center',
      placeholder: 'Cidade, UF',
    },
    {
      id: `${T}:contato:observacoes`,
      label: 'Observações',
      field: 'observacoes',
      campo: 'observacoes',
      peso: 26,
      align: 'left',
      placeholder: 'Anotações',
    },
  ],

  [`${T}:redes`]: [
    ...REDES.map((rede) => ({
      id: `${T}:redes:${rede.campo}`,
      label: rede.label,
      peso: 12,
      align: 'center' as const,
      hint: 'Identificador do perfil, sem @ e sem URL',
    })),
    {
      id: `${T}:redes:total`,
      label: 'Redes',
      peso: 6,
      align: 'center',
      hint: 'Quantas redes estão preenchidas',
      fixa: true,
    },
  ],

  [`${T}:financeiro`]: [
    {
      id: `${T}:financeiro:razaoSocial`,
      label: 'Razão social',
      field: 'razaoSocial',
      campo: 'razaoSocial',
      peso: 20,
      align: 'left',
      placeholder: 'Nome jurídico',
    },
    {
      id: `${T}:financeiro:cnpj`,
      label: 'CNPJ',
      field: 'cnpj',
      campo: 'cnpj',
      peso: 15,
      align: 'center',
      placeholder: '00.000.000/0001-00',
    },
    {
      id: `${T}:financeiro:faturamento`,
      label: 'Faturamento',
      field: 'faturamento',
      campo: 'faturamento',
      peso: 15,
      align: 'center',
      placeholder: 'R$ 0,00 / mês',
    },
    {
      id: `${T}:financeiro:condicaoPagamento`,
      label: 'Pagamento',
      field: 'condicaoPagamento',
      campo: 'condicaoPagamento',
      peso: 15,
      align: 'left',
      placeholder: '30 dias',
    },
    {
      id: `${T}:financeiro:dadosBancarios`,
      label: 'Banco',
      field: 'dadosBancarios',
      campo: 'dadosBancarios',
      peso: 13,
      align: 'left',
      placeholder: 'Ag. / CC',
    },
  ],

  /*
    Só as áreas que respondem por um talento. Pagamento responde por projeto e vive no Backlog —
    ver `areasDoTalento`.
  */
  [`${T}:responsaveis`]: areasDoTalento().map((area) => ({
    id: `${T}:responsaveis:${area.id}`,
    label: area.label,
    peso: 13,
    align: 'center' as const,
    hint: `${area.descricao} Candidatos vêm da equipe ${area.equipeSugerida}.`,
  })),

  [`${T}:contratos`]: [
    {
      id: `${T}:contratos:total`,
      label: 'Contratos',
      peso: 16,
      align: 'center',
      hint: 'Total de contratos ligados a este talento',
      fixa: true,
    },
    { id: `${T}:contratos:vigentes`, label: 'Vigentes', peso: 14, align: 'center' },
    {
      id: `${T}:contratos:aVencer`,
      label: 'A vencer',
      peso: 14,
      align: 'center',
      hint: 'Contratos que vencem em até 30 dias',
    },
    { id: `${T}:contratos:vencidos`, label: 'Vencidos', peso: 14, align: 'center' },
    {
      id: `${T}:contratos:proximoFim`,
      label: 'Próximo fim',
      peso: 20,
      align: 'center',
      hint: 'Data de término mais próxima entre os contratos em vigor',
    },
  ],
};

/* ------------------------------------------------------------------ *
 * Quadro: Contratos de Agenciados
 * ------------------------------------------------------------------ */

const C = 'contratos';

/** Quadro de coluna única: sem abas, todas as colunas na mesma visão. */
export const COLUNAS_CONTRATOS: ColunaCatalogo[] = [
  {
    id: `${C}:grade:talento`,
    label: 'Talento',
    field: 'talento',
    peso: 15,
    align: 'left',
    fixa: true,
  },
  {
    id: `${C}:grade:contrato`,
    label: 'Contrato',
    field: 'contrato',
    peso: 16,
    align: 'left',
    hint: 'Do que é o contrato — ex.: Contrato de agenciamento, Campanha Coca-Cola',
  },
  {
    id: `${C}:grade:responsavel`,
    label: 'Responsável',
    peso: 11,
    align: 'center',
    hint: 'Responsáveis (coroa) respondem pelo contrato; parceiros apoiam a tramitação. Uma linha aceita vários de cada.',
  },
  { id: `${C}:grade:numero`, label: 'Número', field: 'numero', peso: 9, align: 'center' },
  { id: `${C}:grade:inicio`, label: 'Início', field: 'inicio', peso: 8, align: 'center' },
  { id: `${C}:grade:fim`, label: 'Fim', field: 'fim', peso: 8, align: 'center' },
  { id: `${C}:grade:status`, label: 'Status', field: 'status', peso: 12, align: 'center' },
  {
    id: `${C}:grade:vigencia`,
    label: 'Vigência',
    peso: 11,
    align: 'center',
    hint: 'Farol do prazo: verde acima de 30 dias, amarelo abaixo de 30 dias, vermelho vencido. A barra mostra quanto do contrato já decorreu.',
    fixa: true,
  },
  {
    id: `${C}:grade:criadoEm`,
    label: 'Criado em',
    field: 'criadoEm',
    peso: 6,
    align: 'center',
    hint: 'Data em que a linha foi cadastrada — preenchida automaticamente',
  },
  { id: `${C}:grade:acoes`, label: 'Ações', peso: 4, align: 'center', fixa: true },
];

/* ------------------------------------------------------------------ *
 * Quadro: Backlog de Agenciados
 *
 * A coluna fixa é **Oportunidade** (18%); as de cada aba somam 100 menos isso.
 *
 * As abas seguem as áreas por onde o projeto passa, e cada uma traz o **responsável da sua
 * área** junto dos campos: quem abre a aba Produção quer ver o que produzir e quem produz.
 * ------------------------------------------------------------------ */

const B = 'backlog';

export const COLUNAS_BACKLOG: Record<string, ColunaCatalogo[]> = {
  /* A primeira etapa do fluxo: o que se precisa saber para aceitar ou declinar. */
  /*
    A primeira etapa do fluxo: o que se precisa saber para aceitar ou declinar.

    A ordem é a da operação — **Status na frente do nome**. Quem varre o quadro procura primeiro
    em que ponto cada demanda está; o nome vem depois, para identificar a linha que interessou.
    Nas demais abas o nome volta a abrir, porque ali não há status para ancorar a leitura.
  */
  [`${B}:demanda`]: [
    {
      id: `${B}:demanda:status`,
      label: 'Status',
      field: 'status',
      peso: 6,
      largura: 106,
      align: 'center',
      hint: 'Etapa no fluxo — o SLA de triagem só corre em Entrada',
    },
    {
      id: `${B}:demanda:entradaEm`,
      label: 'Entrada',
      field: 'entradaEm',
      peso: 6,
      largura: 96,
      align: 'center',
      hint: 'Data de cadastro da demanda — preenchida automaticamente',
    },
    {
      id: `${B}:demanda:talento`,
      label: 'Talento',
      field: 'talento',
      campo: 'talento',
      peso: 8,
      largura: 156,
      align: 'center',
      placeholder: 'Talento',
      hint: 'Escolhido do cadastro de Talentos; nome novo entra como solicitação',
    },
    /*
      **Exclusivo e Origem do Talento abrem a seção** — voltaram da Cliente na ordenação de
      04/08/2026 (imagem da operação). Faz sentido duplo: a costura com o bloco congelado (que
      termina em Talento) fica visível — o vínculo é a primeira coisa que se confere sobre ele —
      e vínculo é informação de **decisão**, que quem tria quer ver sem rolar. A dedup continua
      valendo: cada uma existe numa seção só; a Marca ficou na Cliente.
    */
    {
      id: `${B}:demanda:exclusivo`,
      label: 'Exclusivo',
      field: 'exclusivo',
      peso: 10,
      largura: 112,
      align: 'center',
      hint: 'Vem do vínculo do talento: exclusivo é agenciado pela casa. Para mudar, altere a ficha',
    },
    {
      id: `${B}:demanda:origemTalento`,
      label: 'Origem do Talento',
      peso: 14,
      largura: 150,
      align: 'center',
      hint: 'Como o talento chegou à casa — da ficha, vale para todos os projetos dele',
    },
    {
      id: `${B}:demanda:input`,
      label: 'Tipo de Input',
      field: 'input',
      peso: 8,
      largura: 128,
      align: 'center',
      hint: 'Como a demanda chegou: interno, mercado, inbound, proativo ou VIU First',
    },
    {
      id: `${B}:demanda:tipoProjeto`,
      label: 'Tipo de Projeto',
      field: 'tipoProjeto',
      peso: 9,
      largura: 140,
      align: 'center',
      hint: 'Natureza do projeto: patrocínio, sob demanda, projeto especial',
    },
    {
      id: `${B}:demanda:origem`,
      label: 'Origem do Projeto',
      field: 'origem',
      peso: 9,
      largura: 150,
      align: 'center',
      hint: 'Frente comercial de onde vem o negócio',
    },
    /*
      As três que descrevem **o trabalho**, agrupadas depois das classificações comerciais.

      Vieram de Entrega e Escopo em 03/08/2026, a pedido da operação: são informação de decisão —
      quem vai aceitar ou declinar quer saber o que se entrega, quanto pesa e como se grava, sem
      trocar de aba. A realocação segue, uma aba por vez.
    */
    {
      id: `${B}:demanda:output`,
      label: 'Tipo de Output',
      field: 'output',
      peso: 9,
      largura: 140,
      align: 'center',
      hint: 'O formato entregue: post, reels, stories, vídeo, live, evento ou merchandising',
    },
    {
      id: `${B}:demanda:impacto`,
      label: 'Impacto',
      field: 'impacto',
      peso: 9,
      largura: 112,
      align: 'center',
      hint: 'Quanto o projeto pesa — tamanho, não urgência. A escala é fria, a de Prioridade é quente',
    },
    {
      id: `${B}:demanda:captacaoProducao`,
      label: 'Captação',
      field: 'captacaoProducao',
      peso: 9,
      largura: 106,
      align: 'center',
      hint: 'Como o material será captado: estúdio, externa, remota, material do talento ou sem captação',
    },
    { id: `${B}:demanda:prioridade`, label: 'Prioridade', field: 'prioridade', peso: 9, largura: 120, align: 'center' },
    /*
      **Sem coluna Deadline**, desde 03/08/2026.

      Com as três colunas que vieram de Entrega e Escopo, a aba chegou a treze e todas ficaram
      apertadas demais para o dado que carregam. O prazo saiu daqui, mas não do quadro: o **farol**
      passou para a célula de Ações, com a data no tooltip — uma bolinha custa 12px, a coluna
      custava 6% da largura. A data completa continua nas abas Escopo, Talento e Jurídico.
    */
  ],

  /*
    As oito abas abaixo estão **em branco de propósito**.

    A primeira versão delas foi desenhada a partir do sistema antigo, não da operação — e o Escopo
    mostrou que o caminho é o inverso: cada coluna nasce de uma pergunta que alguém faz no dia a
    dia. Elas voltam uma a uma, definidas com quem usa.

    As abas continuam declaradas em `VISOES`: seguem na faixa de navegação e na configuração de
    acesso por equipe, inclusive as três restritas. O que se esvaziou foi a lista de colunas, não
    a estrutura.

    Os campos correspondentes continuam em `Oportunidade` — `valorProjeto`, `output`, `formato` e
    os demais. Guardá-los custa nada e evita reescrever o modelo a cada aba que voltar; se algum
    não for reaproveitado, sai junto com a definição da aba.
  */
  /*
    Quem é o cliente por trás do projeto.

    As sete primeiras repetem o Escopo — status, projeto, entrada, talento, interveniência, marca e
    orçamento. Não são cópias: são as **mesmas colunas**, com o mesmo campo por trás. Repetem porque
    ninguém consegue responder "de que segmento é este cliente" olhando só para o segmento; a linha
    precisa continuar identificável em qualquer aba.

    Segmento, Categoria e Contato vêm do **cadastro da marca**, não da linha — ver `utils/marcas`.
  */
  /*
    O que exatamente será entregue.

    A Entrega diz **de que tipo** é o trabalho; o Escopo diz **quanto**, e quando. É a primeira aba
    com colunas numéricas — estreitas de propósito, para caberem treze colunas sem apertar as que
    carregam texto.
  */
  [`${B}:escopo`]: [
    {
      id: `${B}:escopo:status`,
      label: 'Status',
      field: 'status',
      peso: 6,
      largura: 106,
      align: 'center',
      hint: 'Etapa no fluxo — a mesma coluna da Demanda',
    },
    {
      id: `${B}:escopo:entradaEm`,
      label: 'Entrada',
      field: 'entradaEm',
      peso: 6,
      largura: 96,
      align: 'center',
      hint: 'Data de cadastro da demanda — preenchida automaticamente',
    },
    {
      id: `${B}:escopo:talento`,
      label: 'Talento',
      field: 'talento',
      campo: 'talento',
      peso: 8,
      largura: 156,
      align: 'center',
      placeholder: 'Talento',
      hint: 'Escolhido do cadastro de Talentos; nome novo entra como solicitação',
    },
    {
      /*
        A coluna larga da aba — e a razão de a aba existir.

        Substituiu as quatro contagens (Reels, Vídeos, Post, Cotas) em 03/08/2026. Um pedido real
        não cabe em quatro números: "3 reels + 1 vídeo de 60s, uso de 6 meses" é o que a operação
        precisa registrar, e "3 · 1 · 0 · 0" não dizia.

        Ficou mais larga a cada coluna que saiu da aba: Captação foi para a Demanda, Entrada e
        Exclusivo saíram a pedido da operação. É o que sobra de espaço quando a aba fica com o que
        ela promete.
      */
      id: `${B}:escopo:escopo`,
      label: 'Escopo',
      field: 'escopo',
      campo: 'escopo',
      peso: 30,
      largura: 360,
      align: 'left',
      placeholder: 'O que o projeto pede',
      hint: 'O pedido do projeto, em texto livre — o briefing como ele chegou',
    },
    /*
      **Os três tiques do escopo** — o que este projeto inclui.

      Cada um destrava a coluna de mesmo nome na aba **Produção**: sem o tique, lá a célula fica
      travada e explica por quê. É a diferença entre "ninguém preencheu ainda" e "este projeto não
      tem isso" — duas respostas que uma coluna vazia dá ao mesmo tempo.

      Ficam depois do Escopo porque é o texto que os justifica: primeiro se lê o pedido, depois se
      marca o que ele inclui. Ver `ESCOPO_DESTRAVA` em `oportunidades.ts`, que é a fonte do par.
    */
    {
      id: `${B}:escopo:temEdicao`,
      label: 'Edição',
      field: 'temEdicao',
      peso: 6,
      largura: 92,
      align: 'center',
      hint: 'O projeto inclui edição? Marcado, destrava a coluna Edição na aba Produção',
    },
    {
      id: `${B}:escopo:temConteudo`,
      // "CONTEÚDO" em caixa alta não quebra: a largura precisa caber a palavra inteira.
      label: 'Conteúdo',
      field: 'temConteudo',
      peso: 8,
      largura: 104,
      align: 'center',
      hint: 'O projeto inclui produção de conteúdo? Marcado, destrava a coluna Conteúdo na Produção',
    },
    {
      id: `${B}:escopo:temAudiencia`,
      label: 'Audiência',
      field: 'temAudiencia',
      peso: 9,
      largura: 112,
      align: 'center',
      hint: 'O projeto tem meta de audiência? Marcado, destrava a coluna Audiência na Produção',
    },
    {
      id: `${B}:escopo:veiculacaoEm`,
      label: 'Data de Veiculação',
      field: 'veiculacaoEm',
      peso: 9,
      largura: 150,
      align: 'center',
      hint: 'Quando o material vai ao ar — diferente do Deadline, que é o prazo de triagem',
    },
  ],

  /*
    A aba **Agência** foi removida em 03/08/2026, a pedido da operação: a casa não vai trabalhar
    com agência intermediária no quadro. Ela nasceu vazia, esperando uma modelagem que agora não
    virá — e uma aba que abre sem colunas é uma promessa que a tela não cumpre.
  */

  /*
    **Marca e Talento** — de quem é o projeto, dos dois lados.

    Nasceu em 03/08/2026 da união de **Cliente** e **Talento**, a pedido da operação. As duas
    respondiam à mesma pergunta por metades: a marca que paga e o talento que aparece. Separadas,
    obrigavam a trocar de aba para ler um projeto inteiro — e cinco das colunas eram as mesmas
    espelhadas de identificação, repetidas nas duas telas.

    O nome é descritivo de propósito, com as palavras que já são rótulo de coluna aqui. O quadro já
    descartou nome esperto duas vezes — Lead para a Demanda, filha para a linha duplicada — e
    pelo mesmo motivo: **nome que precisa ser aprendido é nome que faz clicar em todas as abas até
    achar a certa.**

    Desde a ordenação de 04/08/2026 (imagem da operação), a seção é só o **lado da marca**: Marca,
    Segmento e Categoria — os três lendo/escrevendo no cadastro dela. O lado do talento (Exclusivo,
    Origem) voltou para a frente da Demanda: vínculo é informação de decisão.
  */
  [`${B}:cliente`]: [
    {
      id: `${B}:cliente:status`,
      label: 'Status',
      field: 'status',
      peso: 6,
      largura: 106,
      align: 'center',
      hint: 'Etapa no fluxo — a mesma coluna da Demanda',
    },
    {
      id: `${B}:cliente:entradaEm`,
      label: 'Entrada',
      field: 'entradaEm',
      peso: 6,
      largura: 96,
      align: 'center',
      hint: 'Data de cadastro da demanda — preenchida automaticamente',
    },
    {
      id: `${B}:cliente:talento`,
      label: 'Talento',
      field: 'talento',
      campo: 'talento',
      peso: 8,
      largura: 156,
      align: 'center',
      placeholder: 'Talento',
      hint: 'Escolhido do cadastro de Talentos; nome novo entra como solicitação',
    },
    {
      id: `${B}:cliente:marca`,
      label: 'Marca',
      field: 'marca',
      campo: 'marca',
      peso: 14,
      largura: 140,
      align: 'center',
      placeholder: 'Marca',
      hint: 'Escolhida do cadastro de Marcas; nome novo entra como solicitação',
    },
    {
      /*
        Vem depois da Marca porque **deriva dela**, como a exclusividade deriva do talento.
        Editar aqui altera o cadastro da marca — e vale para todo projeto dela.
      */
      id: `${B}:cliente:segmento`,
      label: 'Segmento',
      peso: 12,
      largura: 150,
      align: 'center',
      placeholder: 'Segmento',
      hint: 'Setor da marca — vem do cadastro dela e vale para todos os seus projetos',
    },
    {
      id: `${B}:cliente:categoria`,
      label: 'Categoria',
      peso: 12,
      largura: 150,
      align: 'center',
      placeholder: 'Categoria',
      hint: 'Recorte dentro do segmento — também do cadastro da marca',
    },
  ],
  /*
    A aba **Entrega** foi removida em 03/08/2026 (nota: a seção Time reúne as DEZ áreas de
    pessoas — o comentário dela abaixo pode citar "oito", que era a contagem do dia em que nasceu).

    Tipo de Output e Impacto, as duas colunas próprias dela, foram para a Demanda: são informação
    de decisão, e quem vai aceitar ou declinar quer vê-las sem trocar de aba. Lá continuam lado a
    lado, porque respondem à mesma pergunta por ângulos diferentes — o que se entrega, e quanto
    aquilo pesa. Sem elas, a aba ficava só com as espelhadas de identificação.
  */
  /*
    Como o material é feito, e quem o faz.

    **Duas colunas de pessoas na mesma aba** — Produção e GP. É a primeira vez que isso acontece, e
    por isso a coluna passou a declarar a própria área (`area`) em vez de herdá-la da aba.
  */
  [`${B}:producao`]: [
    {
      id: `${B}:producao:status`,
      label: 'Status',
      field: 'status',
      peso: 6,
      largura: 106,
      align: 'center',
      hint: 'Etapa no fluxo — a mesma coluna da Demanda',
    },
    {
      id: `${B}:producao:entradaEm`,
      label: 'Entrada',
      field: 'entradaEm',
      peso: 6,
      largura: 96,
      align: 'center',
      hint: 'Data de cadastro da demanda — preenchida automaticamente',
    },
    {
      id: `${B}:producao:talento`,
      label: 'Talento',
      field: 'talento',
      campo: 'talento',
      peso: 8,
      largura: 156,
      align: 'center',
      placeholder: 'Talento',
      hint: 'Escolhido do cadastro de Talentos; nome novo entra como solicitação',
    },
    {
      id: `${B}:producao:edicao`,
      label: 'Edição',
      field: 'edicao',
      peso: 14,
      largura: 106,
      align: 'center',
      hint: 'Quem edita o material: interna, talento, agência, produtora ou sem edição',
    },
    {
      /*
        **Conteúdo** e **Audiência** ficam ao lado da Edição, e as três respondem em sequência à
        mesma pergunta: *como esse material é feito, e para quem*.

        Nasceram em 03/08/2026, a pedido da operação. Não são as antigas abas de mesmo nome — que
        nomeavam **áreas** e cujas colunas de pessoas foram para a aba Time. Estas guardam dado do
        projeto, e a coincidência de nome é do assunto, não da função.
      */
      id: `${B}:producao:formatoConteudo`,
      label: 'Conteúdo',
      field: 'formatoConteudo',
      peso: 16,
      largura: 144,
      align: 'center',
      hint: 'O formato editorial: publieditorial, review, tutorial, depoimento, entretenimento ou institucional',
    },
    {
      /*
        Alcance **não é impacto**. Impacto mede quanto o projeto pesa para a casa e vive na Demanda;
        este mede quanta gente a peça atinge. Um projeto pequeno pode falar com a massa, e um grande
        pode ser de nicho — por isso as duas escalas moram em abas diferentes, e não lado a lado.
      */
      id: `${B}:producao:alcanceAudiencia`,
      label: 'Audiência',
      field: 'alcanceAudiencia',
      peso: 16,
      largura: 112,
      align: 'center',
      hint: 'Porte do alcance da peça: massa, amplo, segmentado ou nicho — diferente do Impacto, que mede o projeto',
    },
    {
      /*
        Quanto custou produzir.

        Fica **logo depois da Edição** porque as duas são a mesma pergunta em sequência: quem faz,
        e por quanto. Texto livre como os demais valores — a operação escreve "R$ 12.000", "12 mil"
        e "a definir" no mesmo campo, e recusar qualquer um faria o dado não entrar
        ([09 §2](../../prd/09_fundacoes_tecnicas.md)).
      */
      id: `${B}:producao:custoProducao`,
      label: 'Valor de Produção',
      field: 'custoProducao',
      campo: 'custoProducao',
      peso: 16,
      largura: 150,
      align: 'center',
      placeholder: 'R$ 0,00',
      hint: 'Quanto se gastou na produção — some ao orçamento para saber a margem',
    },
  ],
  /*
    As abas **Conteúdo** e **Audiência** foram removidas em 03/08/2026.

    Elas existiam para nomear as suas áreas, e as colunas de pessoas se mudaram para a aba Time.
    Sem elas restavam só as espelhadas de identificação — duas telas idênticas uma à outra.

    Voltaram por algumas horas no mesmo dia, enquanto a realocação de colunas corria: remover uma
    aba que ainda não teve a sua vez é decidir antes da hora. Quando a vez chegou, saíram.

    As **áreas** continuam em `AreaTalento`, com equipe, responsáveis, permissão e coluna própria
    na aba Time. O que mudou foi onde se olha para elas.
  */
  /*
    **Time** — todas as áreas do projeto numa tela só.

    ## A decisão que esta aba reverte

    Até 03/08/2026 cada aba trazia o responsável da sua área: quem abria Produção via o que
    produzir **e quem produz**. O argumento era bom — o dono do assunto mora junto do assunto — e o
    comentário aqui dizia, com todas as letras, que as pessoas não deveriam ir "para uma aba
    separada de time".

    A operação pediu o contrário, e o motivo dela é mais forte na prática: a pergunta "quem está
    nesse projeto?" é feita sobre o projeto inteiro, não sobre uma área de cada vez. Respondê-la
    custava abrir seis abas e montar a lista de cabeça.

    ## O que se perde, e por que aceita-se

    A área deixa de aparecer ao lado do que ela decide. Quem abre Produção vê o que produzir, e
    precisa de um clique a mais para saber quem produz — o inverso do custo anterior, para uma
    pergunta que a operação faz menos vezes.

    ## Efeito na busca

    Procurar pelo nome de alguém passa a achar com a aba Time aberta. É consequência direta de a
    busca cobrir as colunas da tela ([00 §5.7](../../prd/00_status_implementacao.md)) — e o motivo
    de as três âncoras (Projeto, Marca, Talento) valerem em toda aba.

    As oito áreas na ordem em que o projeto passa por elas, e não em ordem alfabética: quem lê a
    linha da esquerda para a direita percorre o caminho do trabalho.
  */
  [`${B}:time`]: [
    {
      id: `${B}:time:status`,
      label: 'Status',
      field: 'status',
      peso: 6,
      largura: 106,
      align: 'center',
      hint: 'Etapa no fluxo — a mesma coluna da Demanda',
    },
    {
      id: `${B}:time:entradaEm`,
      label: 'Entrada',
      field: 'entradaEm',
      peso: 6,
      largura: 96,
      align: 'center',
      hint: 'Data de cadastro da demanda — preenchida automaticamente',
    },
    {
      id: `${B}:time:talento`,
      label: 'Talento',
      field: 'talento',
      campo: 'talento',
      peso: 8,
      largura: 156,
      align: 'center',
      placeholder: 'Talento',
      hint: 'Escolhido do cadastro de Talentos; nome novo entra como solicitação',
    },
    {
      id: `${B}:time:talent`,
      label: 'Talent Manager',
      area: 'talent',
      peso: 6,
      largura: 130,
      align: 'center',
      hint: 'Quem responde pelo talento — vem da equipe cadastrada na área de Talent',
    },
    {
      /*
        Orçamento passou a declarar a área como todas as outras — 11/08/2026.

        Ela era a **única exceção**: não declarava `area` porque tinha célula própria, a única com
        papéis de responsável e apoio. A operação pediu que a distinção valesse para todas as
        colunas de pessoas ("a regra deve ser como fizemos na de Orçamento"), e com isso a exceção
        perdeu a razão de existir — some o `if` especial na tabela, e a coluna volta para o caminho
        comum.
      */
      id: `${B}:time:orcamento`,
      label: 'Orçamento',
      area: 'orcamento',
      peso: 6,
      largura: 120,
      align: 'center',
      hint: 'Quem responde pelo orçamento — vem da equipe cadastrada na área de Orçamento',
    },
    {
      id: `${B}:time:gp`,
      label: 'GP',
      area: 'gp',
      peso: 6,
      largura: 96,
      align: 'center',
      hint: 'Gerência de projeto — vem da equipe cadastrada na área de GP',
    },
    {
      id: `${B}:time:conteudo`,
      label: 'Conteúdo',
      area: 'conteudo',
      peso: 6,
      largura: 120,
      align: 'center',
      hint: 'Quem responde pelo conteúdo — vem da equipe cadastrada na área de Conteúdo',
    },
    {
      id: `${B}:time:audiencia`,
      label: 'Audiência',
      area: 'audiencia',
      peso: 6,
      largura: 120,
      align: 'center',
      hint: 'Quem responde pela audiência — vem da equipe cadastrada na área de Audiência',
    },
    {
      id: `${B}:time:producao`,
      label: 'Produção',
      area: 'producao',
      peso: 6,
      largura: 120,
      align: 'center',
      hint: 'Quem responde pela produção — vem da equipe cadastrada na área de Produção',
    },
    {
      /*
        As duas frentes da produção, ao lado dela e nesta ordem: primeiro quem responde pelo todo,
        depois as metades. O artístico cuida do que se vê na tela; o executivo, do que faz a
        filmagem acontecer.

        Numa produção pequena é a mesma pessoa nas três colunas — o modelo não obriga a diferença,
        só permite registrá-la.
      */
      id: `${B}:time:artistico`,
      label: 'Produtor Artístico',
      area: 'artistico',
      peso: 7,
      largura: 150,
      align: 'center',
      hint: 'Quem responde pela direção artística — vem da equipe cadastrada na área',
    },
    {
      id: `${B}:time:executivo`,
      label: 'Executivo',
      area: 'executivo',
      peso: 7,
      largura: 130,
      align: 'center',
      hint: 'Quem viabiliza a produção: equipe, agenda e locação — vem da equipe cadastrada na área',
    },
    {
      id: `${B}:time:pagamento`,
      label: 'Pagamento',
      area: 'pagamento',
      peso: 6,
      largura: 130,
      align: 'center',
      hint: 'Quem responde pelo pagamento — vem da equipe cadastrada na área de Pagamento',
    },
    {
      id: `${B}:time:juridico`,
      label: 'Jurídico',
      area: 'juridico',
      peso: 6,
      largura: 120,
      align: 'center',
      hint: 'Quem responde pelo jurídico — vem da equipe cadastrada na área de Jurídico',
    },
  ],

  /*
    O dinheiro do projeto — **aba restrita**.

    Seis colunas de valor em sequência, todas texto livre: a operação escreve "R$ 320.000,00",
    "320 mil" e "a definir" no mesmo campo, e recusar qualquer um faria o dado não entrar
    ([09 §2](../../prd/09_fundacoes_tecnicas.md)).

    **Sem Deadline.** Prazo de triagem responde "quando isto precisa ser respondido"; aqui a
    pergunta já é quanto. Repeti-lo custaria largura numa aba que tem onze colunas.
  */
  [`${B}:financeiro`]: [
    {
      id: `${B}:financeiro:status`,
      label: 'Status',
      field: 'status',
      peso: 6,
      largura: 106,
      align: 'center',
      hint: 'Etapa no fluxo — a mesma coluna da Demanda',
    },
    {
      id: `${B}:financeiro:entradaEm`,
      label: 'Entrada',
      field: 'entradaEm',
      peso: 6,
      largura: 96,
      align: 'center',
      hint: 'Data de cadastro da demanda — preenchida automaticamente',
    },
    {
      id: `${B}:financeiro:talento`,
      label: 'Talento',
      field: 'talento',
      campo: 'talento',
      peso: 8,
      largura: 156,
      align: 'center',
      placeholder: 'Talento',
      hint: 'Escolhido do cadastro de Talentos; nome novo entra como solicitação',
    },
    {
      id: `${B}:financeiro:valorProjeto`,
      label: 'Valor Projeto',
      field: 'valorProjeto',
      campo: 'valorProjeto',
      peso: 8,
      largura: 140,
      align: 'center',
      placeholder: 'R$ 0,00',
      hint: 'Valor total negociado do projeto',
    },
    {
      id: `${B}:financeiro:cache`,
      label: 'Valor Cachê',
      field: 'cache',
      campo: 'cache',
      peso: 8,
      largura: 140,
      align: 'center',
      placeholder: 'R$ 0,00',
      hint: 'Quanto vai para o talento',
    },
    {
      /*
        Parcelas e PEP vieram da aba Pagamento, e ficam **logo depois do Cachê** de propósito: as
        três respondem em sequência quanto sai, em quantas vezes, e sob qual código no ERP.
      */
      id: `${B}:financeiro:parcelas`,
      label: 'Parcelas',
      field: 'parcelas',
      peso: 8,
      largura: 110,
      align: 'center',
      hint: 'Em quantas parcelas o cachê será pago',
    },
    {
      id: `${B}:financeiro:pep`,
      label: 'PEP',
      field: 'pep',
      campo: 'pep',
      peso: 8,
      largura: 160,
      align: 'center',
      placeholder: 'Código PEP',
      hint: 'Elemento PEP — amarra o pagamento ao projeto no ERP',
    },
    {
      /*
        Comissão da Globo e comissão da casa ficam **lado a lado**, e são campos distintos: são
        duas fatias do mesmo bolo, e somá-las de cabeça a cada linha é conta que ninguém confere.
      */
      id: `${B}:financeiro:comissaoGlobo`,
      label: 'Comissão Globo',
      field: 'comissaoGlobo',
      campo: 'comissaoGlobo',
      peso: 8,
      largura: 150,
      align: 'center',
      placeholder: 'R$ 0,00',
      hint: 'Comissão devida à Globo, quando o negócio passa por ela',
    },
    {
      id: `${B}:financeiro:comissao`,
      label: 'Comissão',
      field: 'comissao',
      campo: 'comissao',
      peso: 8,
      largura: 130,
      align: 'center',
      placeholder: 'R$ 0,00',
      hint: 'Comissão da casa',
    },
    {
      id: `${B}:financeiro:impostos`,
      label: 'Imposto',
      field: 'impostos',
      campo: 'impostos',
      peso: 7,
      largura: 120,
      align: 'center',
      placeholder: 'R$ 0,00',
      hint: 'Impostos incidentes',
    },
    {
      id: `${B}:financeiro:saving`,
      label: 'Saving',
      field: 'saving',
      campo: 'saving',
      peso: 7,
      largura: 120,
      align: 'center',
      placeholder: 'R$ 0,00',
      hint: 'Economia obtida na negociação — digitado, não calculado',
    },
  ],
  /*
    A aba **Pagamento** foi fundida no Financeiro em 03/08/2026, na ordenação da grade contínua.

    A operação pôs Parcelas e PEP **entre** os valores do Financeiro — e seção precisa ser um
    trecho contíguo de colunas, então duas abas viraram uma. Fazia sentido antes de a fusão ser
    pedida: as duas eram restritas, e o Valor Cachê espelhado entre elas era exatamente o tipo de
    repetição que a grade contínua tornou inútil. O dado mais sensível (PEP, parcelas) continua
    atrás da mesma liberação, agora com um interruptor a menos para o admin manter.
  */
  /*
    O contrato — **aba restrita**.

    Razão social e CPF/CNPJ vêm da **ficha do talento**, como tipo e origem: são dele, não desta
    linha. É o mesmo padrão pela quinta vez, e a razão continua a mesma — um dado com um dono só
    não tem como divergir de si mesmo.
  */
  [`${B}:juridico`]: [
    {
      id: `${B}:juridico:status`,
      label: 'Status',
      field: 'status',
      peso: 6,
      largura: 106,
      align: 'center',
      hint: 'Etapa no fluxo — a mesma coluna da Demanda',
    },
    {
      id: `${B}:juridico:entradaEm`,
      label: 'Entrada',
      field: 'entradaEm',
      peso: 6,
      largura: 96,
      align: 'center',
      hint: 'Data de cadastro da demanda — preenchida automaticamente',
    },
    {
      id: `${B}:juridico:talento`,
      label: 'Talento',
      field: 'talento',
      campo: 'talento',
      peso: 8,
      largura: 156,
      align: 'center',
      placeholder: 'Talento',
      hint: 'Escolhido do cadastro de Talentos; nome novo entra como solicitação',
    },
    {
      id: `${B}:juridico:razaoSocial`,
      label: 'Razão Social',
      peso: 14,
      largura: 190,
      align: 'center',
      hint: 'Nome jurídico de quem assina — vem da ficha do talento',
    },
    {
      id: `${B}:juridico:cnpj`,
      label: 'CPF/CNPJ',
      peso: 12,
      largura: 170,
      align: 'center',
      hint: 'Documento de quem assina — vem da ficha do talento',
    },
    {
      id: `${B}:juridico:tipoContratacao`,
      label: 'Contrato',
      field: 'tipoContratacao',
      campo: 'tipoContratacao',
      peso: 12,
      largura: 150,
      align: 'center',
      placeholder: 'Tipo',
      hint: 'Que contrato rege o projeto',
    },
    {
      id: `${B}:juridico:numeroContrato`,
      label: 'Nº Contrato',
      field: 'numeroContrato',
      campo: 'numeroContrato',
      peso: 12,
      largura: 150,
      align: 'center',
      placeholder: 'CTR-0000',
      hint: 'Número ou código do contrato',
    },
    {
      id: `${B}:juridico:fechamentoEm`,
      label: 'Data de Fechamento',
      field: 'fechamentoEm',
      peso: 12,
      largura: 150,
      align: 'center',
      hint: 'Quando o contrato foi fechado — marco de vigência, não se move depois de posto',
    },
  ],
  /*
    Onde está o resto.

    O quadro guarda o processo; o material vive em Drive, Salesforce e apresentações. Estes quatro
    endereços são a ponte — e a última aba porque é o que se procura **depois** de saber de que
    projeto se trata.

    Três colunas de pessoas fecham a aba: quem procura um arquivo costuma precisar, em seguida, de
    quem responde por ele.
  */
  [`${B}:links`]: [
    {
      id: `${B}:links:status`,
      label: 'Status',
      field: 'status',
      peso: 6,
      largura: 106,
      align: 'center',
      hint: 'Etapa no fluxo — a mesma coluna da Demanda',
    },
    {
      id: `${B}:links:entradaEm`,
      label: 'Entrada',
      field: 'entradaEm',
      peso: 6,
      largura: 96,
      align: 'center',
      hint: 'Data de cadastro da demanda — preenchida automaticamente',
    },
    {
      id: `${B}:links:talento`,
      label: 'Talento',
      field: 'talento',
      campo: 'talento',
      peso: 8,
      largura: 156,
      align: 'center',
      placeholder: 'Talento',
      hint: 'Escolhido do cadastro de Talentos; nome novo entra como solicitação',
    },
    {
      /*
        Sem o prefixo "Link": a aba já se chama Links, e repeti-lo em quatro colunas seguidas
        gastava a largura que faltava para a palavra que importa.
      */
      id: `${B}:links:linkProposta`,
      label: 'Proposta',
      field: 'linkProposta',
      campo: 'linkProposta',
      peso: 16,
      largura: 130,
      align: 'center',
      hint: 'Proposta enviada ao cliente',
    },
    {
      id: `${B}:links:linkSalesforce`,
      label: 'Salesforce',
      field: 'linkSalesforce',
      campo: 'linkSalesforce',
      peso: 16,
      largura: 140,
      align: 'center',
      hint: 'Registro do negócio no Salesforce',
    },
    {
      id: `${B}:links:linkPastaOrcamento`,
      label: 'Pasta de Orçamento',
      field: 'linkPastaOrcamento',
      campo: 'linkPastaOrcamento',
      peso: 15,
      largura: 150,
      align: 'center',
      hint: 'Pasta com as planilhas de orçamento',
    },
    {
      id: `${B}:links:linkPastaPlanejamento`,
      label: 'Pasta de Planejamento',
      field: 'linkPastaPlanejamento',
      campo: 'linkPastaPlanejamento',
      peso: 15,
      largura: 150,
      align: 'center',
      hint: 'Pasta com o material de planejamento — abreviado no cabeçalho por largura',
    },
  ],
};

/* ------------------------------------------------------------------ *
 * Consulta
 * ------------------------------------------------------------------ */

/** Todas as colunas de todos os quadros, achatadas. */
export const TODAS_AS_COLUNAS: ColunaCatalogo[] = [
  ...Object.values(COLUNAS_BACKLOG).flat(),
  ...Object.values(COLUNAS_TALENTOS).flat(),
  ...COLUNAS_CONTRATOS,
];

export function colunasDaVisao(visaoId: string): ColunaCatalogo[] {
  if (visaoId === `${C}:grade`) return COLUNAS_CONTRATOS;
  return COLUNAS_TALENTOS[visaoId] ?? COLUNAS_BACKLOG[visaoId] ?? [];
}

/* ------------------------------------------------------------------ *
 * Grade contínua — o Backlog numa tabela só
 * ------------------------------------------------------------------ */

/**
 * As âncoras: as colunas que identificam a linha, e que **toda aba repetia**.
 *
 * Na grade contínua elas aparecem **uma vez**, congeladas à esquerda. Antes ocupavam espaço em
 * cada uma das nove abas, e a leitura recomeçava a cada troca: as quatro primeiras colunas eram
 * as mesmas, mas o olho tinha de reencontrá-las.
 *
 * Projeto não está aqui por não estar no catálogo — é a coluna-chave, inserida pela tabela.
 */
export const ANCORAS_BACKLOG = ['status', 'entradaEm', 'talento'] as const;

export function ehAncora(coluna: ColunaCatalogo): boolean {
  return (ANCORAS_BACKLOG as readonly string[]).includes(coluna.id.split(':')[2]);
}

/**
 * Largura da coluna, em pixels.
 *
 * **Substituiu a proporção em 03/08/2026.** O modelo anterior exigia que as colunas de cada aba
 * somassem 82% da tabela, e o efeito colateral era grotesco em aba curta: Pagamento tinha três
 * colunas, então "3x" em Parcelas ocupava 350px porque *alguém precisava* ocupar.
 *
 * Aqui cada coluna pede o que o dado precisa, e o que sobra fica como espaço à direita. Numa grade
 * que rola na horizontal isso deixa de ser desperdício: a tabela tem o tamanho que tem.
 *
 * O peso continua sendo a fonte — 11px por ponto —, porque ele já carrega o julgamento de quanto
 * cada coluna merece em relação às vizinhas. `largura` sobrepõe quando o dado pede outra coisa.
 */
export function larguraDaColuna(coluna: ColunaCatalogo): number {
  return coluna.largura ?? coluna.peso * 11;
}

export interface SecaoDaGrade {
  visaoId: string;
  label: string;
  colunas: ColunaCatalogo[];
}

/**
 * O Backlog como **uma tabela só**: âncoras congeladas, e as abas viram seções que rolam.
 *
 * Rolar para o lado atravessa os assuntos em sequência, e a aba ativa acompanha o scroll — a
 * navegação por abas continua existindo, agora como atalho para uma posição, não como troca de
 * tela. Ver [03 §3.5](../../prd/03_padroes_ui.md).
 *
 * **As âncoras saem das seções.** Elas aparecem uma vez, à esquerda; repeti-las dentro de cada
 * seção devolveria o problema que a grade contínua existe para resolver.
 *
 * Recebe só as visões que a sessão enxerga: uma aba sem permissão não vira seção, e portanto não
 * deixa buraco no scroll. A permissão continua sendo por aba — o que mudou foi a navegação.
 */
export function gradeContinua(visoesVisiveis: string[]): {
  ancoras: ColunaCatalogo[];
  secoes: SecaoDaGrade[];
} {
  const doQuadro = visoesVisiveis.filter((id) => COLUNAS_BACKLOG[id]);

  /*
    As âncoras saem da **primeira** aba visível, e não de uma lista fixa.

    Elas são a mesma coluna em toda aba — `testeColunas` trava largura e posição —, então qualquer
    uma serve de fonte. Tirar da primeira faz a grade funcionar mesmo que a Demanda esteja fora do
    alcance de quem abriu.
  */
  const primeira = doQuadro[0];
  const ancoras = primeira
    ? colunasDaVisao(primeira).filter(ehAncora)
    : [];

  const secoes = doQuadro.map((visaoId) => ({
    visaoId,
    label: visaoId.split(':')[1],
    colunas: colunasDaVisao(visaoId).filter((coluna) => !ehAncora(coluna)),
  }));

  return { ancoras, secoes };
}

/** Colunas que o admin pode ocultar — as fixas ficam de fora. */
export function colunasOcultaveis(visaoId: string): ColunaCatalogo[] {
  return colunasDaVisao(visaoId).filter((coluna) => !coluna.fixa);
}

export function getColuna(id: string): ColunaCatalogo | undefined {
  return TODAS_AS_COLUNAS.find((coluna) => coluna.id === id);
}

/** Visão à qual a coluna pertence — os dois primeiros segmentos do id. */
export function visaoDaColuna(colunaId: string): string {
  return colunaId.split(':').slice(0, 2).join(':');
}

export function quadroDaColuna(colunaId: string): AppPage {
  return colunaId.split(':')[0] as AppPage;
}
