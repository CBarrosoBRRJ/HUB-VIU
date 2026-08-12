import {
  createContext, ReactNode, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef,
  useState,
} from 'react';
import {
  AcaoConcedivel, AppPage, Concessao, Convite, Equipe, PapelEquipe, PerfilSistema, SituacaoUsuario,
  AreaTalento, InputOportunidade, LinkEquipe, MotivoDeclinio, Oportunidade, OrigemComercial,
  PrioridadeOportunidade, RedesTalento, SolicitacaoAcesso, StatusOportunidade, Talento,
  TalentContract, TipoProjeto, TipoTalento, TrocaEmail, Usuario,
  CamposNovaOportunidade, CamposNovoTalento, ImpactoProjeto, Marca, OrigemTalento, TipoCaptacao,
  TipoCaptacao_Producao, TipoEdicao, TipoMarca, TipoOutput, FormatoConteudo, AlcanceAudiencia,
  TipoPendencia,
} from '../types';
import { USUARIO_ATUAL_ID, USUARIOS_SEED } from '../data/usuarios';
import { EQUIPES_SEED } from '../data/equipes';
import { TALENTOS_SEED } from '../data/talentos';
import { MARCAS_SEED } from '../data/marcas';
import { OPORTUNIDADES_SEED } from '../data/oportunidades';
import { alternarPagina, definirMembro, getPapelNaEquipe, removerMembro } from '../utils/equipes';
import {
  Contexto, podeCriarEquipe, podeDefinirAcessoDaEquipe, podeDefinirPerfil, podeDefinirSituacao,
  podeExcluirUsuario, podeGerenciarConcessoes, podeGerenciarDominios, podeGerenciarEmailsDeAcesso,
  podeEditarProprioCadastro, podeAcao, podeConvidar, nivelDeAcesso, NivelAcesso, nomeadosDoContrato,
} from '../utils/permissoes';
import { criarConvite, validarAceite, ErroAceite } from '../utils/convites';
import { DOMINIOS_PADRAO, encontrarPorEmail, normalizarEmail, validarEmail } from '../utils/identidade';
import { criarTrocaEmail, ErroTroca, validarConfirmacao } from '../utils/trocaEmail';
import {
  criarLinkEquipe, ErroEntrada, linkVigenteDaEquipe, validarEntrada,
} from '../utils/linkEquipe';
import {
  alternarResponsavelDaArea, encontrarTalentoPorNome, nomeadosDoTalento, nomeEmUso,
  normalizarNomeDeMarca, REDES_VAZIAS,
} from '../utils/talentos';
import { alternarColuna, alternarVisao } from '../utils/visoes';
import {
  alternarPapelNaArea, bloqueadaPorPendencias,
  comPendenciaAberta, comPendenciaChegada,
  comPendenciaReaberta, DESFECHOS_TERMINAIS, destravaDoTique,
  exclusividadeDe,
  nomeadosDaOportunidade,
  PapelNaArea, semPendencia, TiqueDeEscopo,
} from '../utils/oportunidades';
import { ingerirLote, OportunidadeBruta, ResumoLote } from '../utils/ingestao';
import { prazoDeTriagem } from '../utils/sla';
import {
  aplicarEncerramentoAutomatico, motivosPermitidosDoDeclinio, podeTransicionar,
} from '../utils/fluxoStatus';
import { todayISO } from '../utils/dates';
import { carregar, limparTudo, salvar } from '../utils/persistencia';
import { proximoNumero } from '../utils/ids';
import {
  descreverMudanca, desfazer as desfazerNoHistorico, ehAtalhoDesfazer, ehAtalhoRefazer,
  ehCampoDeTexto, empilhar, EntradaHistorico, Instantaneo,
  refazer as refazerNoHistorico, semMudanca,
} from '../utils/historico';

/**
 * Fonte única de usuários e equipes.
 *
 * A página de Equipes escreve aqui; a de Contratos lê daqui. Sem isso, um usuário
 * criado na administração não apareceria no seletor de responsáveis dos contratos.
 */
interface DadosContextValue {
  usuarios: Usuario[];
  equipes: Equipe[];
  solicitacoes: SolicitacaoAcesso[];
  usuarioAtualId: string;
  /** Contexto que as regras consomem — reflete o modo "Ver como" quando ativo. */
  sessao: Contexto;
  getUsuario: (id: string) => Usuario | undefined;
  /** Troca a sessão — provisório, até existir autenticação de verdade. */
  entrarComo: (usuarioId: string) => void;

  /** Quem está de fato logado, mesmo durante uma visualização. */
  usuarioReal: Usuario | undefined;
  /** Pessoa cujos olhos estamos usando; `null` fora do modo. */
  visualizandoComo: Usuario | null;
  verComo: (usuarioId: string) => void;
  sairDaVisualizacao: () => void;

  criarUsuario: (
    dados: Omit<Usuario, 'id' | 'perfil' | 'situacao'> & { perfil?: PerfilSistema },
  ) => Usuario;
  atualizarUsuario: (
    id: string,
    campo: keyof Omit<Usuario, 'id' | 'perfil' | 'situacao' | 'ehDono'>,
    valor: string,
  ) => void;
  definirPerfil: (id: string, perfil: PerfilSistema) => void;
  definirSituacao: (id: string, situacao: SituacaoUsuario) => void;
  excluirUsuario: (id: string) => void;

  /** Capacidades administrativas concedidas pelo dono, com ou sem prazo. */
  concessoes: Concessao[];
  conceder: (usuarioId: string, acao: AcaoConcedivel, expiraEm?: string) => void;
  revogarConcessao: (usuarioId: string, acao: AcaoConcedivel) => void;
  /** E-mails adicionais de acesso — exclusivo do dono. */
  adicionarEmailAlternativo: (usuarioId: string, email: string) => void;
  removerEmailAlternativo: (usuarioId: string, email: string) => void;

  /** Domínios de e-mail aceitos no cadastro. */
  dominios: string[];
  adicionarDominio: (dominio: string) => void;
  removerDominio: (dominio: string) => void;

  convites: Convite[];
  emitirConvite: (email: string, equipeId: string, papel: PapelEquipe) => Convite;
  revogarConvite: (id: string) => void;
  getConvitePorToken: (token: string) => Convite | undefined;
  /** Simula o retorno do SSO: autentica o e-mail e consome o convite. */
  aceitarConvite: (token: string, emailAutenticado: string, nome: string) => ErroAceite | null;

  /** Dados que a própria pessoa mantém — e-mail fica de fora, muda por confirmação. */
  atualizarProprioCadastro: (
    campo: 'nome' | 'telefone' | 'local' | 'nascimento' | 'cargo',
    valor: string,
  ) => void;
  definirFoto: (usuarioId: string, dataUrl: string | null) => void;

  trocasEmail: TrocaEmail[];
  solicitarTrocaEmail: (novoEmail: string) => TrocaEmail | null;
  cancelarTrocaEmail: (id: string) => void;
  confirmarTrocaEmail: (token: string) => ErroTroca | null;
  getTrocaPorToken: (token: string) => TrocaEmail | undefined;

  /**
   * Contratos do quadro.
   *
   * Ficam aqui, e não na página, porque a administração precisa saber se alguém tem histórico
   * antes de removê-lo de uma equipe.
   */
  contratos: TalentContract[];
  setContratos: (atualizar: (atuais: TalentContract[]) => TalentContract[]) => void;

  /** Talentos exclusivos — cadastro e responsáveis por área. */
  talentos: Talento[];
  criarTalento: (nome: string, campos?: CamposNovoTalento) => Talento | null;
  atualizarTalento: (id: string, campo: CampoTextoTalento, valor: string) => void;
  definirTipoDoTalento: (id: string, tipo: TipoTalento) => void;
  /**
   * Grava a origem **na ficha do talento**, encontrando-a pelo nome.
   *
   * Recebe o nome porque quem chama é uma linha do Backlog, que guarda o nome e não o id — mesma
   * ponte de `definirCampoDaMarcaPorNome`. Vale para todos os projetos do talento.
   */
  definirOrigemDoTalentoPorNome: (nomeDoTalento: string, origem: OrigemTalento) => void;
  /**
   * Quantidade entregue de um formato. `undefined` limpa.
   *
   * Apagar o campo é gesto legítimo — devolve a linha a "não definido", que é diferente de zero.
   */
  definirQuantidadeDaOportunidade: (
    id: string, campo: CampoQuantidadeOportunidade, valor: number | undefined,
  ) => void;
  /** Quando o material vai ao ar (`yyyy-mm-dd`). Vazio desagenda. */
  definirDataDeVeiculacao: (id: string, data: string | undefined) => void;
  /** Quando o contrato foi fechado (`yyyy-mm-dd`). */
  definirDataDeFechamento: (id: string, data: string | undefined) => void;
  definirRedeDoTalento: (id: string, rede: keyof RedesTalento, valor: string) => void;
  /** Alterna a pessoa na área — o mesmo gesto adiciona e remove. */
  alternarResponsavelDoTalento: (talentoId: string, area: AreaTalento, usuarioId: string) => void;
  excluirTalento: (id: string) => void;

  /**
   * Ficha do talento pelo nome, criando-a se não existir.
   *
   * É a interligação entre os quadros: escrever um nome novo na coluna Talento de um contrato
   * passa a **abrir o cadastro** em vez de deixar o nome solto. Devolve o id para o chamador
   * gravar o vínculo.
   */
  garantirTalento: (nome: string) => string | null;

  /**
   * Marcas e clientes — a lista que a coluna Marca oferece.
   *
   * Mesma estrutura de Talentos, e pelo mesmo motivo: texto livre produzia "Coca-Cola",
   * "Coca Cola" e "coca-cola" como três marcas distintas em qualquer contagem.
   */
  marcas: Marca[];
  criarMarca: (nome: string, campos?: CamposNovaMarca) => Marca | null;
  atualizarMarca: (id: string, campo: CampoTextoMarca, valor: string) => void;
  definirTipoDaMarca: (id: string, tipo: TipoMarca) => void;
  excluirMarca: (id: string) => void;
  /**
   * Marca pelo nome, criando-a como **pendente** se não existir.
   *
   * É o que permite escolher no Backlog sem parar para cadastrar: o nome novo entra como
   * solicitação, o trabalho continua, e alguém completa depois.
   */
  garantirMarca: (nome: string) => string | null;
  /**
   * Grava segmento ou categoria **no cadastro da marca**, pelo nome dela.
   *
   * Recebe o nome porque quem chama é uma linha do Backlog, que guarda o nome e não o id. Vale
   * para todos os projetos da marca — é o que faz preencher uma vez bastar.
   *
   * Sem marca definida, não faz nada: não há onde gravar, e criar uma marca sem nome para
   * hospedar um segmento seria pior que a omissão.
   */
  definirCampoDaMarcaPorNome: (
    nomeDaMarca: string, campo: 'segmento' | 'categoria', valor: string,
  ) => void;
  /** Acrescenta um contato ao cadastro da marca, sem repetir o que já existe. */
  adicionarContatoNaMarca: (nomeDaMarca: string, contato: string) => void;
  /** Como o negócio chegou. `undefined` limpa — voltar a "não classificado" é um gesto legítimo. */
  definirCaptacaoDaOportunidade: (id: string, captacao: TipoCaptacao | undefined) => void;

  /** Oportunidades do Backlog — a porta de entrada da operação. */
  oportunidades: Oportunidade[];
  criarOportunidade: (titulo: string, campos?: CamposNovaOportunidade) => Oportunidade | null;
  atualizarOportunidade: (id: string, campo: CampoTextoOportunidade, valor: string) => void;
  definirStatusDaOportunidade: (id: string, status: StatusOportunidade, motivo?: MotivoDeclinio) => void;
  definirPrioridadeDaOportunidade: (id: string, prioridade: PrioridadeOportunidade) => void;
  /**
   * Campos de escolha fechada — input, origem, tipo de projeto, output, impacto e edição.
   *
   * Uma função só, e não quatro: são todos "trocar um valor de uma lista", e quatro variações da
   * mesma coisa multiplicariam a superfície sem separar nada de fato.
   */
  definirCampoOpcaoDaOportunidade: (id: string, campo: CampoOpcaoOportunidade, valor: string | boolean) => void;
  /**
   * Marca ou desmarca um tique do Escopo, limpando o campo que ele destrava.
   *
   * A confirmação de "isso apaga o valor" é da tela — esta é a regra, e regra não pergunta.
   */
  definirTiqueDeEscopo: (id: string, tique: TiqueDeEscopo, marcado: boolean) => void;
  /**
   * Os quatro gestos das pendências — abrir, "chegou", reabrir e descartar.
   *
   * Todos reversíveis por desenho: registro de espera não pode dar medo de errar. As regras (a
   * guarda contra abrir duplicada, o descarte só de abertas) vivem em `utils/oportunidades` —
   * aqui é só o encaixe na lista.
   */
  abrirPendenciaDaOportunidade: (id: string, tipo: TipoPendencia) => void;
  marcarPendenciaChegou: (id: string, pendenciaId: string) => void;
  reabrirPendenciaDaOportunidade: (id: string, pendenciaId: string) => void;
  descartarPendenciaDaOportunidade: (id: string, pendenciaId: string) => void;
  /**
   * Coloca a pessoa como **responsável** ou **apoio** da área — clicar no papel que ela já tem a
   * remove da linha.
   *
   * **Atende todas as áreas desde 11/08/2026.** Antes convivia com uma
   * `alternarResponsavelDaOportunidade`, sem papel, que servia as demais colunas de pessoas: a
   * operação pediu a distinção em toda parte ("a regra deve ser como fizemos na de Orçamento") e a
   * versão sem papel ficou órfã no mesmo gesto. Duas formas de nomear a mesma pessoa na mesma
   * linha divergiriam — saiu a que respondia menos.
   */
  alternarPapelDaOportunidade: (
    id: string, area: AreaTalento, usuarioId: string, papel: PapelNaArea,
  ) => void;
  /**
   * Cria uma linha nova a partir de outra — o mesmo trabalho, outro talento.
   *
   * Devolve a linha criada, ou `null` se a origem não existe mais.
   */
  duplicarOportunidade: (id: string) => Oportunidade | null;
  /** Marca como conferida o que veio de integração. */
  marcarOportunidadeRevisada: (id: string) => void;
  excluirOportunidade: (id: string) => void;
  /**
   * Recebe um lote de fora — o agente de e-mail, o Salesforce.
   *
   * Fica no provider e não numa camada de rede porque, sem backend, é aqui que o dado entra. Com
   * backend, o endpoint chama as mesmas funcoes de `utils/ingestao.ts` e esta funcao vira a
   * confirmacao vinda do servidor.
   */
  receberOportunidades: (brutas: OportunidadeBruta[], origem: OrigemAutomatica) => ResumoLote;

  /**
   * Quanto a sessão enxerga de um quadro, já considerando as linhas em que foi nomeada.
   *
   * Fica aqui porque só o provider tem os registros de todos os quadros — a Sidebar precisa disso
   * para decidir entre abrir o quadro e mostrá-lo com cadeado.
   */
  nivelDoQuadro: (pagina: AppPage) => NivelAcesso;

  /** Link coletivo de entrada — um vigente por equipe, renovado a cada 24h. */
  linksEquipe: LinkEquipe[];
  linkDaEquipe: (equipeId: string) => LinkEquipe | undefined;
  renovarLinkDaEquipe: (equipeId: string) => LinkEquipe | null;
  desativarLinkDaEquipe: (equipeId: string) => void;
  getLinkPorToken: (token: string) => LinkEquipe | undefined;
  entrarPorLink: (token: string, nome: string, email: string) => ErroEntrada | 'email_invalido' | null;

  criarSolicitacao: (equipeId: string, justificativa: string) => void;
  decidirSolicitacao: (id: string, aprovar: boolean) => void;

  criarEquipe: (nome: string, paginasPermitidas: AppPage[]) => Equipe;
  renomearEquipe: (id: string, nome: string) => void;
  excluirEquipe: (id: string) => void;
  alternarPaginaDaEquipe: (equipeId: string, pagina: AppPage) => void;
  /** `null` faz a equipe deixar de atender qualquer área de talentos. */
  definirAreaDaEquipe: (equipeId: string, area: AreaTalento | null) => void;
  /** Apaga o que foi salvo no navegador e volta ao seed. Recarrega a página. */
  recomecarDoZero: () => void;

  /** Liga/desliga uma visão **restrita** para a equipe (dado pessoal, financeiro). */
  alternarVisaoDaEquipe: (equipeId: string, visaoId: string) => void;
  /** Oculta/mostra uma coluna para a equipe — bloqueio por exceção. */
  alternarColunaDaEquipe: (equipeId: string, colunaId: string) => void;

  definirMembroDaEquipe: (
    equipeId: string,
    usuarioId: string,
    papel: PapelEquipe,
    /** Prazo da responsabilidade temporária. */
    responsavelAte?: string,
  ) => void;
  removerMembroDaEquipe: (equipeId: string, usuarioId: string) => void;

  /*
    Desfazer e refazer — o `Ctrl+Z` do dado dos quadros.

    Vivem aqui porque só o provider tem as coleções inteiras: desfazer é trocar o estado por uma
    versão anterior dele, e nenhuma tela tem essa versão em mãos. As regras (o que empilhar, o que
    a mudança fez, quando o atalho vale) são puras, em `utils/historico.ts`.
  */
  desfazerAlteracao: () => void;
  refazerAlteracao: () => void;
  /** Há passo para trás? A tela usa para não oferecer o que não existe. */
  podeDesfazer: boolean;
  podeRefazer: boolean;
  /**
   * O que acabou de ser desfeito ou refeito — a frase do aviso na tela.
   *
   * O `id` acompanha o texto porque **desfazer duas vezes a mesma coisa produz a mesma frase**, e
   * um aviso que não muda de valor não reabre: o segundo `Ctrl+Z` pareceria não ter funcionado.
   */
  avisoHistorico: { texto: string; id: number } | null;
}

/** Origens que entram por integração — manual não passa por aqui. */
export type OrigemAutomatica = 'email' | 'salesforce';

/**
 * Colunas de contagem.
 *
 * Sobrou `parcelas`: as quatro do Escopo saíram em 03/08/2026, quando a aba trocou os números
 * pelo pedido em texto (`escopo`).
 */
export type CampoQuantidadeOportunidade = 'parcelas';

/**
 * Campos da oportunidade que são escolha de lista.
 *
 * **Exclusivo não está aqui**: deriva do vínculo do talento, não é escolhido — ver
 * `exclusividadeDe` em `utils/oportunidades.ts`.
 */
export type CampoOpcaoOportunidade =
  | 'input' | 'origem' | 'tipoProjeto' | 'output' | 'impacto' | 'edicao'
  | 'captacaoProducao' | 'formatoConteudo' | 'alcanceAudiencia';

/** Campos de texto da oportunidade editáveis célula a célula. */
export type CampoTextoOportunidade =
  | 'titulo' | 'marca' | 'talento' | 'observacoes' | 'escopo'
  | 'valorProjeto' | 'cache' | 'comissaoGlobo' | 'comissao' | 'impostos'
  | 'custoProducao' | 'saving' | 'pep'
  | 'linkProposta' | 'linkSalesforce' | 'linkPastaOrcamento' | 'linkPastaPlanejamento'
  | 'tipoContratacao' | 'numeroContrato'
  | 'contatoCliente';

/** Campos de texto simples do talento — os que a grade edita célula a célula. */
export type CampoTextoTalento = Exclude<
  keyof Talento,
  'id' | 'tipo' | 'redes' | 'responsaveis' | 'criadoEm'
>;

/** Campos de texto da marca. */
export type CampoTextoMarca = 'nome' | 'segmento' | 'categoria' | 'observacoes';

/** O que a criação de marca aceita além do nome. */
export type CamposNovaMarca = Partial<Omit<Marca, 'id' | 'nome' | 'criadoEm'>>;


const DadosContext = createContext<DadosContextValue | null>(null);

export function DadosProvider({ children }: { children: ReactNode }) {
  /*
    Estado com persistência local.

    Não é o banco: é o que evita que um F5 durante a apresentação apague tudo o que foi
    cadastrado. Detalhes e limites em `utils/persistencia.ts`.
  */
  const [usuarios, setUsuarios] = useState<Usuario[]>(() => carregar('usuarios', USUARIOS_SEED));
  const [equipes, setEquipes] = useState<Equipe[]>(() => carregar('equipes', EQUIPES_SEED));
  const [concessoes, setConcessoes] = useState<Concessao[]>(() => carregar('concessoes', []));
  /*
    Os quatro abaixo são os que **chegam de volta por link** — e por isso precisam sobreviver ao
    recarregamento tanto quanto os demais.

    Eles nasceram voláteis (`useState([])`) e o efeito era que os três fluxos de onboarding não
    funcionavam pelo caminho para o qual foram feitos: o link vai por e-mail, quem recebe o cola na
    barra de endereço, e isso é uma **carga nova** da página. Com a lista em memória, o token
    chegava a um estado vazio e a tela respondia "convite inexistente" — para um convite emitido
    minutos antes. A troca de e-mail era a mais afetada: o fluxo inteiro depende de sair e voltar.

    Nenhuma suíte pegava porque as regras (`convites.ts`, `linkEquipe.ts`, `trocaEmail.ts`) estavam
    certas: elas recebem a lista pronta. O que faltava era a lista chegar até elas.
  */
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoAcesso[]>(
    () => carregar('solicitacoes', []),
  );
  const [convites, setConvites] = useState<Convite[]>(() => carregar('convites', []));
  const [trocasEmail, setTrocasEmail] = useState<TrocaEmail[]>(() => carregar('trocasEmail', []));
  const [contratos, setContratos] = useState<TalentContract[]>(() => carregar('contratos', []));
  const [linksEquipe, setLinksEquipe] = useState<LinkEquipe[]>(() => carregar('linksEquipe', []));
  const [talentos, setTalentos] = useState<Talento[]>(() => carregar('talentos', TALENTOS_SEED));
  const [marcas, setMarcas] = useState<Marca[]>(() => carregar('marcas', MARCAS_SEED));
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>(
    () => carregar('oportunidades', OPORTUNIDADES_SEED),
  );
  const [dominios, setDominios] = useState<string[]>(() => carregar('dominios', DOMINIOS_PADRAO));
  const [usuarioAtualId, setUsuarioAtualId] = useState(USUARIO_ATUAL_ID);
  const [visualizandoComoId, setVisualizandoComoId] = useState<string | null>(null);
  /** Sequências próprias: derivar do tamanho da lista repetiria ids após exclusões. */
  /*
    Os contadores derivam do que está **carregado**, não do seed nem de uma constante.

    Antes, `useRef(1)` fazia a primeira criação nascer com um id que o seed já usava — e duas
    linhas com a mesma `key` levam o React a juntá-las: a nova aparece com os dados da antiga.
    Inicializar com `SEED.length + 1` tinha o mesmo fim depois de um F5, quando o estado vem do
    `localStorage` e o contador não. Ver `utils/ids.ts`.
  */
  const proximoUsuario = useRef(proximoNumero(usuarios, 'u'));
  const proximaEquipe = useRef(proximoNumero(equipes, 'eq'));
  const proximaSolicitacao = useRef(proximoNumero(solicitacoes, 'sol'));
  const proximoConvite = useRef(proximoNumero(convites, 'cv'));
  const proximaConcessao = useRef(proximoNumero(concessoes, 'cc'));
  const proximaTroca = useRef(proximoNumero(trocasEmail, 'te'));
  const proximoLink = useRef(proximoNumero(linksEquipe, 'lk'));
  const proximaMarca = useRef(proximoNumero(marcas, 'mar'));
  const proximoTalento = useRef(proximoNumero(talentos, 'tal'));
  const proximaOportunidade = useRef(proximoNumero(oportunidades, 'op'));
  // Pendências têm id próprio ('pd1'…) porque reabrir/descartar precisam apontar uma espera
  // específica — o tipo não basta quando a mesma espera se repete na vida do projeto.
  const proximaPendencia = useRef(
    proximoNumero(oportunidades.flatMap((op) => op.pendencias ?? []), 'pd'),
  );

  const usuarioReal = useMemo(
    // A sessão nunca fica sem usuário: se o atual foi excluído, cai no primeiro da base.
    () => usuarios.find((usuario) => usuario.id === usuarioAtualId) ?? usuarios[0],
    [usuarios, usuarioAtualId],
  );

  const visualizandoComo = useMemo(
    () => usuarios.find((usuario) => usuario.id === visualizandoComoId) ?? null,
    [usuarios, visualizandoComoId],
  );

  /** Em visualização, as regras passam a receber o outro usuário — em modo leitura. */
  const usuarioAtual = visualizandoComo ?? usuarioReal;

  /**
   * Espelho da sessão para as mutações.
   *
   * As regras já são aplicadas na interface, mas repeti-las aqui fecha o caminho de um
   * componente chamar uma ação que a tela não deveria ter oferecido. Um `ref` evita recriar
   * todos os callbacks a cada render.
   */
  /*
    Grava a cada mudança.

    Um efeito por coleção, e não um só com tudo: assim uma escrita não reserializa o que não
    mudou — e, se uma coleção crescer a ponto de estourar a cota, só ela para de salvar.
  */
  useEffect(() => salvar('usuarios', usuarios), [usuarios]);
  useEffect(() => salvar('equipes', equipes), [equipes]);
  useEffect(() => salvar('talentos', talentos), [talentos]);
  useEffect(() => salvar('marcas', marcas), [marcas]);
  useEffect(() => salvar('oportunidades', oportunidades), [oportunidades]);
  useEffect(() => salvar('contratos', contratos), [contratos]);
  useEffect(() => salvar('concessoes', concessoes), [concessoes]);
  useEffect(() => salvar('dominios', dominios), [dominios]);
  // Os que voltam por link — ver o comentário na declaração de `solicitacoes`.
  useEffect(() => salvar('solicitacoes', solicitacoes), [solicitacoes]);
  useEffect(() => salvar('convites', convites), [convites]);
  useEffect(() => salvar('trocasEmail', trocasEmail), [trocasEmail]);
  useEffect(() => salvar('linksEquipe', linksEquipe), [linksEquipe]);

  const usuariosRef = useRef(usuarios);
  usuariosRef.current = usuarios;
  const dominiosRef = useRef(dominios);
  dominiosRef.current = dominios;
  const marcasRef = useRef(marcas);
  marcasRef.current = marcas;
  const talentosRef = useRef(talentos);
  talentosRef.current = talentos;
  const oportunidadesRef = useRef(oportunidades);
  oportunidadesRef.current = oportunidades;

  const sessaoRef = useRef<Contexto>({ usuario: usuarioAtual, equipes, concessoes });
  sessaoRef.current = {
    usuario: usuarioAtual,
    equipes,
    concessoes,
    visualizacao: Boolean(visualizandoComo),
  };

  /* ------------------------------------------------------------------ *
   * Histórico — o Ctrl+Z do dado dos quadros
   * ------------------------------------------------------------------ */

  const [passado, setPassado] = useState<EntradaHistorico[]>([]);
  const [futuro, setFuturo] = useState<EntradaHistorico[]>([]);
  const [avisoHistorico, setAvisoHistorico] = useState<{ texto: string; id: number } | null>(null);

  const instantaneo = useMemo<Instantaneo>(
    () => ({ oportunidades, contratos, talentos, marcas }),
    [oportunidades, contratos, talentos, marcas],
  );

  /** O estado de agora, legível de dentro dos callbacks sem os recriar a cada tecla. */
  const instantaneoRef = useRef(instantaneo);
  instantaneoRef.current = instantaneo;
  const passadoRef = useRef(passado);
  passadoRef.current = passado;
  const futuroRef = useRef(futuro);
  futuroRef.current = futuro;

  /** O último estado que o histórico já viu — o ponto de partida da próxima comparação. */
  const vistoRef = useRef(instantaneo);
  /**
   * Marca a próxima mudança como **do sistema**, e não de quem está usando.
   *
   * Duas mudanças chegam sem ninguém as ter pedido: o encerramento automático dos 20 dias, que
   * roda na abertura, e a própria restauração do desfazer. Empilhar a primeira daria um `Ctrl+Z`
   * que reabre projetos que a regra arquivou; empilhar a segunda faria desfazer e refazer se
   * perseguirem num laço, sem nunca sair do lugar.
   */
  const mudancaDoSistemaRef = useRef(false);

  /*
    A captura: observa o resultado, não a intenção.

    Roda depois de cada commit que tocou uma das quatro coleções. Como o React agrupa as
    atualizações de um mesmo evento, uma ação da pessoa — mesmo quando escreve em duas coleções,
    como nomear um talento novo num contrato — produz **um** commit, e portanto um passo só de
    desfazer. O porquê desta escolha está em `utils/historico.ts`.

    ## Por que `useLayoutEffect`, e não `useEffect`

    O `useEffect` é passivo: o React o agenda para depois da pintura. Entre o commit da mudança e o
    registro do passo abria-se uma janela em que o dado já mudou e **o histórico ainda não sabe** —
    um `Ctrl+Z` ali não teria o que desfazer. No navegador a janela é de milissegundos e nenhuma
    mão a alcança; num teste, que dispara a tecla logo após o clique, ela é alcançada sempre.

    A fragilidade era real e o teste a encontrou. Registrar no layout resolve na origem: o passo
    passa a ser gravado **no mesmo commit** da alteração, e não existe instante em que os dois
    discordem. O custo é comparar quatro referências antes da pintura.
  */
  useLayoutEffect(() => {
    const antes = vistoRef.current;
    if (semMudanca(antes, instantaneo)) return;
    vistoRef.current = instantaneo;

    if (mudancaDoSistemaRef.current) {
      mudancaDoSistemaRef.current = false;
      return;
    }

    setPassado((atual) => empilhar(atual, {
      instantaneo: antes,
      descricao: descreverMudanca(antes, instantaneo),
    }));
    // Um caminho novo apaga o futuro: refazer o que foi abandonado montaria um estado que ninguém
    // pediu, misturando duas linhas do tempo.
    setFuturo([]);
  }, [instantaneo]);

  const aplicarInstantaneo = useCallback((alvo: Instantaneo) => {
    mudancaDoSistemaRef.current = true;
    setOportunidades(alvo.oportunidades);
    setContratos(alvo.contratos);
    setTalentos(alvo.talentos);
    setMarcas(alvo.marcas);
  }, []);

  const navegarNoHistorico = useCallback(
    (sentido: 'desfazer' | 'refazer') => {
      /*
        Em "Ver como", nada anda — nem para trás.

        A sessão simulada é leitura: se a escrita está bloqueada, desfazer também está. Sem isto,
        o `Ctrl+Z` viraria a porta dos fundos para alterar dado no lugar de outra pessoa, e sem
        rastro de quem realmente o fez.
      */
      if (sessaoRef.current.visualizacao) return;

      const passo = sentido === 'desfazer' ? desfazerNoHistorico : refazerNoHistorico;
      const resultado = passo(passadoRef.current, futuroRef.current, instantaneoRef.current);
      if (!resultado.instantaneo) return;

      aplicarInstantaneo(resultado.instantaneo);
      setPassado(resultado.passado);
      setFuturo(resultado.futuro);
      setAvisoHistorico((atual) => ({
        texto: resultado.aviso ?? '',
        id: (atual?.id ?? 0) + 1,
      }));
    },
    [aplicarInstantaneo],
  );

  const desfazerAlteracao = useCallback(() => navegarNoHistorico('desfazer'), [navegarNoHistorico]);
  const refazerAlteracao = useCallback(() => navegarNoHistorico('refazer'), [navegarNoHistorico]);

  /*
    O atalho, escutado no documento inteiro.

    Fica no provider e não numa página porque o desfazer vale onde houver dado — e porque uma
    escuta só evita que duas telas montadas ao mesmo tempo desfaçam dois passos com um toque.

    `ehCampoDeTexto` é a guarda que importa: dentro de uma célula em edição, `Ctrl+Z` continua
    sendo o desfazer do texto, feito pelo navegador.
  */
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (ehCampoDeTexto(document.activeElement as HTMLElement | null)) return;

      if (ehAtalhoDesfazer(evento)) {
        evento.preventDefault();
        desfazerAlteracao();
      } else if (ehAtalhoRefazer(evento)) {
        evento.preventDefault();
        refazerAlteracao();
      }
    }

    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [desfazerAlteracao, refazerAlteracao]);

  const getUsuario = useCallback(
    (id: string) => usuarios.find((usuario) => usuario.id === id),
    [usuarios],
  );

  /** Pessoa nova nasce como `membro` e `ativo`; promover é ato deliberado do admin. */
  const criarUsuario = useCallback(
    (dados: Omit<Usuario, 'id' | 'perfil' | 'situacao'> & { perfil?: PerfilSistema }) => {
      const novo: Usuario = {
        id: `u${proximoUsuario.current}`,
        perfil: 'membro',
        situacao: 'ativo',
        ...dados,
        email: normalizarEmail(dados.email),
      };
      proximoUsuario.current += 1;
      setUsuarios((atuais) => [...atuais, novo]);
      return novo;
    },
    [],
  );

  const definirSituacao = useCallback((id: string, situacao: SituacaoUsuario) => {
    let aplicou = false;
    setUsuarios((atuais) => {
      const alvo = atuais.find((usuario) => usuario.id === id);
      const equipeDoAlvo = sessaoRef.current.equipes.find((e) => getPapelNaEquipe(e, id) !== null);
      if (!alvo || !podeDefinirSituacao(sessaoRef.current, alvo, situacao, equipeDoAlvo)) return atuais;
      aplicou = true;
      return atuais.map((usuario) => (usuario.id === id ? { ...usuario, situacao } : usuario));
    });
    // Desligar encerra os vínculos; inativar apenas suspende o acesso.
    if (aplicou && situacao === 'desligado') {
      setEquipes((atuais) => atuais.map((equipe) => removerMembro(equipe, id)));
    }
  }, []);

  /** Conceder o que já está concedido apenas atualiza o prazo — não duplica a linha. */
  const conceder = useCallback(
    (usuarioId: string, acao: AcaoConcedivel, expiraEm?: string) => {
      if (!podeGerenciarConcessoes(sessaoRef.current)) return;
      setConcessoes((atuais) => {
        const existente = atuais.find((c) => c.usuarioId === usuarioId && c.acao === acao);
        if (existente) {
          return atuais.map((c) => (c === existente ? { ...c, expiraEm } : c));
        }
        return [
          ...atuais,
          {
            id: `cc${proximaConcessao.current++}`,
            usuarioId,
            acao,
            concedidaPorId: usuarioAtualId,
            criadaEm: new Date().toISOString(),
            expiraEm,
          },
        ];
      });
    },
    [usuarioAtualId],
  );

  const revogarConcessao = useCallback((usuarioId: string, acao: AcaoConcedivel) => {
    if (!podeGerenciarConcessoes(sessaoRef.current)) return;
    setConcessoes((atuais) =>
      atuais.filter((c) => !(c.usuarioId === usuarioId && c.acao === acao)),
    );
  }, []);

  const adicionarEmailAlternativo = useCallback((usuarioId: string, email: string) => {
    const alvo = sessaoRef.current.equipes && usuariosRef.current.find((u) => u.id === usuarioId);
    if (!alvo || !podeGerenciarEmailsDeAcesso(sessaoRef.current, alvo)) return;
    const limpo = normalizarEmail(email);
    if (!limpo) return;
    setUsuarios((atuais) =>
      atuais.map((usuario) => {
        if (usuario.id !== usuarioId) return usuario;
        const atuaisEmails = usuario.emailsAlternativos ?? [];
        if (atuaisEmails.includes(limpo) || normalizarEmail(usuario.email) === limpo) return usuario;
        return { ...usuario, emailsAlternativos: [...atuaisEmails, limpo] };
      }),
    );
  }, []);

  const removerEmailAlternativo = useCallback((usuarioId: string, email: string) => {
    setUsuarios((atuais) =>
      atuais.map((usuario) =>
        usuario.id === usuarioId
          ? { ...usuario, emailsAlternativos: (usuario.emailsAlternativos ?? []).filter((e) => e !== email) }
          : usuario,
      ),
    );
  }, []);

  const adicionarDominio = useCallback((dominio: string) => {
    if (!podeGerenciarDominios(sessaoRef.current)) return;
    const limpo = normalizarEmail(dominio).replace(/^@/, '');
    if (!limpo) return;
    setDominios((atuais) => (atuais.includes(limpo) ? atuais : [...atuais, limpo]));
  }, []);

  const removerDominio = useCallback((dominio: string) => {
    if (!podeGerenciarDominios(sessaoRef.current)) return;
    setDominios((atuais) => atuais.filter((item) => item !== dominio));
  }, []);

  const definirPerfil = useCallback((id: string, perfil: PerfilSistema) => {
    setUsuarios((atuais) => {
      const alvo = atuais.find((usuario) => usuario.id === id);
      if (!alvo || !podeDefinirPerfil(sessaoRef.current, alvo, perfil)) return atuais;
      return atuais.map((usuario) => (usuario.id === id ? { ...usuario, perfil } : usuario));
    });
  }, []);

  const atualizarUsuario = useCallback(
    (id: string, campo: keyof Omit<Usuario, 'id' | 'perfil'>, valor: string) => {
      setUsuarios((atuais) =>
        atuais.map((usuario) => (usuario.id === id ? { ...usuario, [campo]: valor } : usuario)),
      );
    },
    [],
  );

  /** Excluir da base tira a pessoa de todas as equipes — não deixa referência órfã. */
  const excluirUsuario = useCallback((id: string) => {
    let aplicou = false;
    setUsuarios((atuais) => {
      const alvo = atuais.find((usuario) => usuario.id === id);
      if (!alvo || !podeExcluirUsuario(sessaoRef.current, alvo)) return atuais;
      aplicou = true;
      return atuais.filter((usuario) => usuario.id !== id);
    });
    if (aplicou) setEquipes((atuais) => atuais.map((equipe) => removerMembro(equipe, id)));
  }, []);

  const criarEquipe = useCallback((nome: string, paginasPermitidas: AppPage[]) => {
    if (!podeCriarEquipe(sessaoRef.current)) throw new Error('Sem permissão para criar equipe');
    const nova: Equipe = {
      id: `eq${proximaEquipe.current}`,
      nome,
      paginasPermitidas,
      membros: [],
      criadaEm: new Date().toISOString(),
    };
    proximaEquipe.current += 1;
    setEquipes((atuais) => [...atuais, nova]);
    return nova;
  }, []);

  const renomearEquipe = useCallback((id: string, nome: string) => {
    setEquipes((atuais) => atuais.map((equipe) => (equipe.id === id ? { ...equipe, nome } : equipe)));
  }, []);

  /**
   * Excluir a equipe **não** apaga os responsáveis já nomeados por ela.
   *
   * Quem responde por um talento continua respondendo; some apenas a lista de candidatos para
   * novas nomeações naquela área, até que outra equipe a atenda. Tirar os nomes seria apagar
   * responsabilidade em vigor por um evento administrativo.
   */
  const excluirEquipe = useCallback((id: string) => {
    setEquipes((atuais) => atuais.filter((equipe) => equipe.id !== id));
  }, []);

  const alternarPaginaDaEquipe = useCallback((equipeId: string, pagina: AppPage) => {
    if (!podeDefinirAcessoDaEquipe(sessaoRef.current)) return;
    setEquipes((atuais) =>
      atuais.map((equipe) => (equipe.id === equipeId ? alternarPagina(equipe, pagina) : equipe)),
    );
  }, []);

  /**
   * Define qual área de talentos a equipe atende.
   *
   * **Uma área, uma equipe**: marcar aqui desmarca em quem a atendia antes. Duas equipes na
   * mesma área fariam a lista de candidatos depender de qual viesse primeiro no array.
   */
  /**
   * Liberar visão restrita é o mesmo poder de conceder quadro — e mais sensível ainda, porque
   * abre dado pessoal e financeiro. Mesma guarda.
   */
  const alternarVisaoDaEquipe = useCallback((equipeId: string, visaoId: string) => {
    if (!podeDefinirAcessoDaEquipe(sessaoRef.current)) return;
    setEquipes((atuais) =>
      atuais.map((equipe) => (equipe.id === equipeId ? alternarVisao(equipe, visaoId) : equipe)),
    );
  }, []);

  /** Volta ao estado de fábrica — útil para reapresentar a demonstração do começo. */
  const recomecarDoZero = useCallback(() => {
    limparTudo();
    window.location.reload();
  }, []);

  const alternarColunaDaEquipe = useCallback((equipeId: string, colunaId: string) => {
    if (!podeDefinirAcessoDaEquipe(sessaoRef.current)) return;
    setEquipes((atuais) =>
      atuais.map((equipe) => (equipe.id === equipeId ? alternarColuna(equipe, colunaId) : equipe)),
    );
  }, []);

  const definirAreaDaEquipe = useCallback((equipeId: string, area: AreaTalento | null) => {
    if (!podeDefinirAcessoDaEquipe(sessaoRef.current)) return;
    setEquipes((atuais) =>
      atuais.map((equipe) => {
        if (equipe.id === equipeId) return { ...equipe, areaTalento: area ?? undefined };
        if (area && equipe.areaTalento === area) return { ...equipe, areaTalento: undefined };
        return equipe;
      }),
    );
  }, []);

  const definirMembroDaEquipe = useCallback(
    (equipeId: string, usuarioId: string, papel: PapelEquipe, responsavelAte?: string) => {
      setEquipes((atuais) =>
        atuais.map((equipe) =>
          equipe.id === equipeId ? definirMembro(equipe, usuarioId, papel, responsavelAte) : equipe,
        ),
      );
    },
    [],
  );

  const removerMembroDaEquipe = useCallback((equipeId: string, usuarioId: string) => {
    setEquipes((atuais) =>
      atuais.map((equipe) => (equipe.id === equipeId ? removerMembro(equipe, usuarioId) : equipe)),
    );
  }, []);

  const atualizarProprioCadastro = useCallback(
    (campo: 'nome' | 'telefone' | 'local' | 'nascimento' | 'cargo', valor: string) => {
      const eu = sessaoRef.current.usuario;
      if (!eu || !podeEditarProprioCadastro(sessaoRef.current, eu)) return;
      setUsuarios((atuais) =>
        atuais.map((usuario) => (usuario.id === eu.id ? { ...usuario, [campo]: valor } : usuario)),
      );
    },
    [],
  );

  /** A foto é do próprio dono do cadastro; quem administra usuários também pode remover. */
  const definirFoto = useCallback((usuarioId: string, dataUrl: string | null) => {
    const alvo = usuariosRef.current.find((usuario) => usuario.id === usuarioId);
    if (!alvo) return;
    const proprio = podeEditarProprioCadastro(sessaoRef.current, alvo);
    if (!proprio && !podeAcao(sessaoRef.current, 'gerenciar_usuarios')) return;

    setUsuarios((atuais) =>
      atuais.map((usuario) =>
        usuario.id === usuarioId ? { ...usuario, fotoUrl: dataUrl ?? undefined } : usuario,
      ),
    );
  }, []);

  /**
   * Pede a troca do e-mail de acesso. A troca só vale depois da confirmação no endereço novo.
   *
   * Uma pendência por vez: duas trocas abertas deixariam ambíguo qual link é o válido.
   */
  const solicitarTrocaEmail = useCallback((novoEmail: string) => {
    const eu = sessaoRef.current.usuario;
    if (!eu || !podeEditarProprioCadastro(sessaoRef.current, eu)) return null;

    const erro = validarEmail(novoEmail, {
      usuarios: usuariosRef.current,
      dominios: dominiosRef.current,
      ignorarId: eu.id,
    });
    if (erro) return null;

    const troca = criarTrocaEmail({
      id: `te${proximaTroca.current++}`,
      usuarioId: eu.id,
      novoEmail,
    });
    setTrocasEmail((atuais) => [
      troca,
      ...atuais.filter((item) => !(item.usuarioId === eu.id && !item.confirmadaEm)),
    ]);
    return troca;
  }, []);

  const cancelarTrocaEmail = useCallback((id: string) => {
    setTrocasEmail((atuais) => atuais.filter((troca) => troca.id !== id));
  }, []);

  const getTrocaPorToken = useCallback(
    (token: string) => trocasEmail.find((troca) => troca.token === token),
    [trocasEmail],
  );

  const confirmarTrocaEmail = useCallback(
    (token: string): ErroTroca | null => {
      const troca = trocasEmail.find((item) => item.token === token);
      const erro = validarConfirmacao(troca);
      if (erro || !troca) return erro ?? 'inexistente';

      setUsuarios((atuais) =>
        atuais.map((usuario) =>
          usuario.id === troca.usuarioId ? { ...usuario, email: troca.novoEmail } : usuario,
        ),
      );
      setTrocasEmail((atuais) =>
        atuais.map((item) =>
          item.id === troca.id ? { ...item, confirmadaEm: new Date().toISOString() } : item,
        ),
      );
      return null;
    },
    [trocasEmail],
  );

  const linkDaEquipe = useCallback(
    (equipeId: string) => linkVigenteDaEquipe(linksEquipe, equipeId),
    [linksEquipe],
  );

  /**
   * Emite um link novo e encerra o anterior.
   *
   * Rotação: o endereço muda a cada renovação, então cópias antigas circulando em chats param de
   * funcionar mesmo dentro das 24h.
   */
  const renovarLinkDaEquipe = useCallback((equipeId: string) => {
    const equipe = sessaoRef.current.equipes.find((item) => item.id === equipeId);
    if (!equipe || !podeConvidar(sessaoRef.current, equipe)) return null;

    const novo = criarLinkEquipe({
      id: `lk${proximoLink.current++}`,
      equipeId,
      criadoPorId: sessaoRef.current.usuario?.id ?? '',
    });

    setLinksEquipe((atuais) => [
      novo,
      ...atuais.map((link) =>
        link.equipeId === equipeId && !link.desativadoEm
          ? { ...link, desativadoEm: new Date().toISOString() }
          : link,
      ),
    ]);
    return novo;
  }, []);

  const desativarLinkDaEquipe = useCallback((equipeId: string) => {
    const equipe = sessaoRef.current.equipes.find((item) => item.id === equipeId);
    if (!equipe || !podeConvidar(sessaoRef.current, equipe)) return;

    setLinksEquipe((atuais) =>
      atuais.map((link) =>
        link.equipeId === equipeId && !link.desativadoEm
          ? { ...link, desativadoEm: new Date().toISOString() }
          : link,
      ),
    );
  }, []);

  const getLinkPorToken = useCallback(
    (token: string) => linksEquipe.find((link) => link.token === token),
    [linksEquipe],
  );

  /**
   * Entrada pelo link coletivo: sempre como **membro**.
   *
   * Conta única continua valendo — e-mail já cadastrado apenas ganha o vínculo com a equipe.
   */
  const entrarPorLink = useCallback(
    (token: string, nome: string, email: string) => {
      const link = linksEquipe.find((item) => item.token === token);
      const equipe = equipes.find((item) => item.id === link?.equipeId);

      const erro = validarEntrada(link, equipe);
      if (erro || !link || !equipe) return erro ?? 'inexistente';

      const existente = encontrarPorEmail(email, usuarios);
      // Para quem já tem conta, o domínio não é reavaliado: ela já foi admitida antes.
      if (!existente && validarEmail(email, { usuarios, dominios })) return 'email_invalido';

      const pessoa: Usuario =
        existente ?? {
          id: `u${proximoUsuario.current}`,
          nome: nome.trim() || normalizarEmail(email),
          email: normalizarEmail(email),
          cargo: '',
          telefone: '',
          local: '',
          nascimento: '',
          perfil: 'membro',
          situacao: 'ativo',
        };

      if (!existente) {
        proximoUsuario.current += 1;
        setUsuarios((atuais) => [...atuais, pessoa]);
      }

      setEquipes((atuais) =>
        atuais.map((item) =>
          item.id === equipe.id ? definirMembro(item, pessoa.id, 'membro') : item,
        ),
      );

      setLinksEquipe((atuais) =>
        atuais.map((item) =>
          item.id === link.id
            ? { ...item, usos: [...item.usos, { usuarioId: pessoa.id, em: new Date().toISOString() }] }
            : item,
        ),
      );

      setUsuarioAtualId(pessoa.id);
      return null;
    },
    [linksEquipe, equipes, usuarios, dominios],
  );

  /**
   * Nome duplicado é recusado: dois cadastros do mesmo talento partem o histórico em dois.
   *
   * Nasce como **interveniência** — o vínculo mais frouxo. Declarar exclusividade é uma decisão
   * comercial, e nascer no grau mais alto faria a lista de exclusivos inchar por descuido.
   */
  const criarTalento = useCallback((nome: string, campos: CamposNovoTalento = {}) => {
    const limpo = nome.trim();
    if (!limpo || nomeEmUso(limpo, talentosRef.current)) return null;

    const novo: Talento = {
      id: `tal${proximoTalento.current++}`,
      nome: limpo,
      tipo: 'interveniencia',
      nomeArtistico: '',
      empresa: '',
      email: '',
      telefone: '',
      local: '',
      redes: { ...REDES_VAZIAS },
      observacoes: '',
      razaoSocial: '',
      cnpj: '',
      faturamento: '',
      condicaoPagamento: '',
      dadosBancarios: '',
      responsaveis: {},
      // O que veio da linha de criação entra aqui — ver `criarOportunidade`.
      ...campos,
      criadoEm: new Date().toISOString(),
    };
    setTalentos((atuais) => [novo, ...atuais]);
    return novo;
  }, []);

  /**
   * Trocar o vínculo do talento **repercute nos projetos dele**.
   *
   * Promover alguém a exclusivo tira a interveniência de tudo que está no quadro com esse nome; o
   * caminho inverso a acrescenta. Sem isso, a ficha diria uma coisa e as linhas outra — e a
   * primeira pessoa a notar seria o jurídico, tarde demais.
   *
   * Vale para os projetos **em andamento**. Os já encerrados também são recalculados: o Backlog é
   * controle de processo, não arquivo do contrato assinado — o registro histórico da assinatura
   * mora no quadro de Contratos.
   */
  const definirOrigemDoTalentoPorNome = useCallback(
    (nomeDoTalento: string, origem: OrigemTalento) => {
      const alvo = encontrarTalentoPorNome(nomeDoTalento, talentosRef.current);
      if (!alvo) return;
      setTalentos((atuais) =>
        atuais.map((item) =>
          // Preencher a ficha é a curadoria que a pendência esperava — como em `atualizarMarca`.
          item.id === alvo.id ? { ...item, origem, cadastroPendente: false } : item,
        ),
      );
    },
    [],
  );

  const definirTipoDoTalento = useCallback((id: string, tipo: TipoTalento) => {
    const proximos = talentosRef.current.map((talento) =>
      talento.id === id ? { ...talento, tipo } : talento,
    );
    talentosRef.current = proximos;
    setTalentos(proximos);

    // A exclusividade dos projetos desse talento acompanha o vínculo — sempre.
    setOportunidades((atuais) =>
      atuais.map((op) => {
        const derivada = exclusividadeDe(op, proximos);
        return derivada === undefined || derivada === op.exclusivo
          ? op
          : { ...op, exclusivo: derivada };
      }),
    );
  }, []);

  const definirRedeDoTalento = useCallback(
    (id: string, rede: keyof RedesTalento, valor: string) => {
      // Guarda só o identificador: colar a URL inteira quebraria a montagem do link depois.
      const limpo = valor.trim().replace(/^@+/, '').replace(/^https?:\/\/[^/]+\//, '');
      setTalentos((atuais) =>
        atuais.map((talento) =>
          talento.id === id
            ? { ...talento, redes: { ...talento.redes, [rede]: limpo }, cadastroPendente: false }
            : talento,
        ),
      );
    },
    [],
  );

  /* ---------------- Backlog ---------------- */

  const criarOportunidade = useCallback((titulo: string, campos: CamposNovaOportunidade = {}) => {
    const limpo = titulo.trim();
    if (!limpo) return null;

    const entradaEm = todayISO();
    const nova: Oportunidade = {
      id: `op${proximaOportunidade.current++}`,
      titulo: limpo,
      marca: '', talento: '',
      // Sem classificação: a linha nasce **por definir**, não classificada por engano.
      // `exclusivo` fica falso até haver talento com ficha — a célula mostra "—", não "Não".
      exclusivo: false,
      escopo: '',
      /*
        Os campos preenchidos na linha de criação entram **aqui**, e não por uma sequência de
        chamadas depois de criar.

        Criar vazio e emendar N vezes faz o registro existir por um instante em estado que a
        pessoa nunca pediu — e cada emenda é uma chance de falhar no meio, deixando metade do
        formulário gravada.
      */
      ...campos,
      // Estes o formulário não escolhe: o fluxo começa na entrada, e as datas são derivadas.
      status: 'entrada',
      statusDesde: entradaEm,
      entradaEm,
      // O prazo nasce junto: SLA que depende de alguém lembrar de preencher não é SLA.
      prazoEm: prazoDeTriagem(entradaEm),
      responsaveis: {},
      pendencias: [],
      valorProjeto: '', cache: '', comissaoGlobo: '', comissao: '', impostos: '', custoProducao: '', saving: '',
      pep: '',
  linkProposta: '', linkSalesforce: '', linkPastaOrcamento: '', linkPastaPlanejamento: '',
  tipoContratacao: '', numeroContrato: '',
                  contatoCliente: '',
      observacoes: '',
      entradaPor: 'manual',
      // Quem digitou é o revisor.
      revisada: true,
      criadoEm: new Date().toISOString(),
    };
    setOportunidades((atuais) => [nova, ...atuais]);
    return nova;
  }, []);

  /**
   * Duplica um projeto para outro talento.
   *
   * ## O que **não** se copia, e por quê
   *
   * | Campo | Motivo |
   * |-------|--------|
   * | Talento e vínculo | É justamente o que muda — a linha nova nasce esperando o nome |
   * | Cachê, comissões, imposto, saving, custo | Valor é por negociação. Um número copiado **parece conferido**, e ninguém revisa o que já está preenchido |
   * | PEP, parcelas, nº do contrato, fechamento | Pertencem ao contrato daquele talento, que ainda não existe |
   * | `idExterno` | É a chave que impede a integração de trazer a mesma oportunidade duas vezes. Copiá-la faria duas linhas disputarem a mesma origem |
   * | Datas do fluxo | O relógio da linha nova começa agora — inclusive o SLA de triagem |
   *
   * O resto vem junto: marca, classificações, escopo, links, observações e quem responde por cada
   * área. É o trabalho de digitar que se herda.
   *
   * ## O status acompanha, salvo quando é final
   *
   * Se o projeto está em Elaboração e alguém lembra do segundo talento, a linha nova está no mesmo
   * ponto — nascer em Entrada obrigaria a reencenar o fluxo. Mas duplicar um projeto **fechado ou
   * declinado** para nascer fechado seria afirmar um desfecho que ninguém decidiu: aí ela volta ao
   * começo.
   */
  const duplicarOportunidade = useCallback((id: string) => {
    const origem = oportunidadesRef.current.find((op) => op.id === id);
    if (!origem) return null;

    const entradaEm = todayISO();
    /* Um desfecho não se herda: duplicar um fechado faria a linha nova nascer decidida. */
    const terminal = DESFECHOS_TERMINAIS.includes(origem.status);
    const status = terminal ? 'entrada' : origem.status;

    const nova: Oportunidade = {
      ...origem,
      id: `op${proximaOportunidade.current++}`,
      duplicadaDe: origem.id,

      // O que muda: o talento, e o que depende dele.
      talento: '',
      talentoId: undefined,
      exclusivo: false,

      // Valores são por negociação — ver a nota acima.
      cache: '', comissaoGlobo: '', comissao: '', impostos: '', saving: '', custoProducao: '',
      pep: '', parcelas: undefined, numeroContrato: '', fechamentoEm: undefined,

      // A chave de deduplicação não se duplica.
      idExterno: undefined,

      // Espera é da negociação que a abriu, como os valores: a cópia nasce sem nenhuma.
      pendencias: [],

      status,
      statusDesde: entradaEm,
      entradaEm,
      prazoEm: prazoDeTriagem(entradaEm),
      // Um desfecho que veio junto por cópia não é um desfecho.
      motivoDeclinio: undefined,
      encerradaAutomaticamente: undefined,
      // Quem duplicou olhou a linha.
      revisada: true,
      criadoEm: new Date().toISOString(),
    };

    oportunidadesRef.current = [nova, ...oportunidadesRef.current];
    setOportunidades((atuais) => [nova, ...atuais]);
    return nova;
  }, []);

  const atualizarOportunidade = useCallback(
    (id: string, campo: CampoTextoOportunidade, valor: string) => {
      /*
        Trocar o nome do talento reaponta o **vínculo**, não só o texto.

        `talentoId` é o que liga a linha à ficha — e é dele que saem o tipo de vínculo e os
        contratos do talento. Sem reapontar, a linha passaria a exibir um nome e a puxar os dados
        de outro; limpar o campo deixaria um vínculo órfão apontando para quem saiu dali.
      */
      const talentoId =
        campo === 'talento'
          ? (valor.trim() ? encontrarTalentoPorNome(valor, talentosRef.current)?.id : undefined)
          : undefined;

      setOportunidades((atuais) =>
        atuais.map((op) => {
          if (op.id !== id) return op;
          if (campo !== 'talento') return { ...op, [campo]: valor };

          /*
            Trocar o talento reaponta o vínculo **e** recalcula a interveniência.

            Ela não é uma segunda decisão: existe porque o talento não é exclusivo. Mantê-la como
            campo digitado permitia o estado impossível — projeto com talento não-exclusivo
            marcado como "sem interveniência". Ver `intervenienciaDe`.
          */
          /*
            Numa linha **duplicada**, definir o talento corrige o nome do projeto.

            A operação nomeia o projeto com o talento dentro — "[Carta Orçamento] Marina Duarte |
            Coca-Cola Verão". Duplicar para outro talento deixava o título mentindo, e a pessoa
            tinha de reescrevê-lo à mão: exatamente o trabalho que duplicar existe para poupar.

            Só acontece uma vez, e só se o nome antigo estiver mesmo no título. Fora disso o
            título é texto livre e ninguém mexe nele.
          */
          const origem = op.duplicadaDe
            ? atuais.find((outra) => outra.id === op.duplicadaDe)
            : undefined;
          const trocaNome =
            !op.talento.trim() && valor.trim() && origem?.talento && op.titulo.includes(origem.talento);
          const titulo = trocaNome ? op.titulo.replace(origem!.talento, valor.trim()) : op.titulo;

          const proxima = { ...op, titulo, talento: valor, talentoId };
          return {
            ...proxima,
            exclusivo: Boolean(exclusividadeDe(proxima, talentosRef.current)),
          };
        }),
      );
    },
    [],
  );

  /**
   * Move a oportunidade no fluxo — **só para os destinos permitidos**.
   *
   * `motivo` só faz sentido ao declinar: é de onde partiu a recusa. Sai junto quando o destino é
   * outro — motivo de declínio numa oportunidade que não está declinada é dado órfão, e dado
   * órfão vira relatório errado.
   */
  const definirStatusDaOportunidade = useCallback(
    (id: string, status: StatusOportunidade, motivo?: MotivoDeclinio) => {
      setOportunidades((atuais) =>
        atuais.map((op) => {
          if (op.id !== id) return op;
          if (!podeTransicionar(op.status, status)) return op;
          /*
            A trava da Elaboração (04/08/2026): a carta não sobe para revisão com espera aberta.
            Regra recusa em silêncio, como as transições inválidas — a tela já desabilita e explica.
          */
          if (bloqueadaPorPendencias(op, status)) return op;
          // Declinar exige motivo, e um que a etapa de origem ofereça — ver `motivosPermitidosDoDeclinio`.
          if (status === 'declinado'
            && (!motivo || !motivosPermitidosDoDeclinio(op.status).includes(motivo))) {
            return op;
          }

          return {
            ...op,
            status,
            motivoDeclinio: status === 'declinado' ? motivo : undefined,
            // Reinicia o relógio do abandono: o projeto andou.
            statusDesde: todayISO(),
            // Encerramento manual apaga a marca do automático — foi decisão de alguém.
            encerradaAutomaticamente: false,
          };
        }),
      );
    },
    [],
  );

  const definirPrioridadeDaOportunidade = useCallback(
    (id: string, prioridade: PrioridadeOportunidade) => {
      setOportunidades((atuais) => atuais.map((op) => (op.id === id ? { ...op, prioridade } : op)));
    },
    [],
  );

  const definirCampoOpcaoDaOportunidade = useCallback(
    (id: string, campo: CampoOpcaoOportunidade, valor: string | boolean) => {
      setOportunidades((atuais) =>
        atuais.map((op) => {
          if (op.id !== id) return op;
          if (campo === 'input') return { ...op, input: valor as InputOportunidade };
          if (campo === 'origem') return { ...op, origem: valor as OrigemComercial };
          if (campo === 'output') return { ...op, output: valor as TipoOutput };
          if (campo === 'impacto') return { ...op, impacto: valor as ImpactoProjeto };
          if (campo === 'edicao') return { ...op, edicao: valor as TipoEdicao };
          if (campo === 'formatoConteudo') {
            return { ...op, formatoConteudo: valor as FormatoConteudo };
          }
          if (campo === 'alcanceAudiencia') {
            return { ...op, alcanceAudiencia: valor as AlcanceAudiencia };
          }
          if (campo === 'captacaoProducao') {
            return { ...op, captacaoProducao: valor as TipoCaptacao_Producao };
          }
          return { ...op, tipoProjeto: valor as TipoProjeto };
        }),
      );
    },
    [],
  );

  /**
   * Marca ou desmarca um tique do Escopo — e **limpa o campo que ele destrava**.
   *
   * O par vive em `ESCOPO_DESTRAVA`. Desmarcar sem limpar deixaria o valor órfão: guardado no
   * banco, invisível na tela e legível pelo Power BI, que não teria como saber que o projeto
   * renegou aquela dimensão. É o estado impossível que `qaBacklog` procura.
   *
   * A confirmação é da **tela**, não daqui: esta função é a regra, e regra não pergunta. Quem
   * chama já decidiu — ver `CelulaTique` em `BacklogTable`.
   */
  const definirTiqueDeEscopo = useCallback(
    (id: string, tique: TiqueDeEscopo, marcado: boolean) => {
      const par = destravaDoTique(tique);
      setOportunidades((atuais) =>
        atuais.map((op) => {
          if (op.id !== id) return op;
          const proxima = { ...op, [tique]: marcado };
          // Desmarcar apaga o detalhe; marcar não inventa nada — o campo nasce por preencher.
          if (!marcado && par) proxima[par.campo] = undefined;
          return proxima;
        }),
      );
    },
    [],
  );

  const abrirPendenciaDaOportunidade = useCallback((id: string, tipo: TipoPendencia) => {
    const pendenciaId = `pd${proximaPendencia.current++}`;
    setOportunidades((atuais) =>
      atuais.map((op) =>
        op.id === id
          ? // Registrar uma espera é conferência: quem sabe com quem está a bola, olhou a linha.
            { ...comPendenciaAberta(op, tipo, todayISO(), pendenciaId), revisada: true }
          : op,
      ),
    );
  }, []);

  const marcarPendenciaChegou = useCallback((id: string, pendenciaId: string) => {
    setOportunidades((atuais) =>
      atuais.map((op) =>
        op.id === id ? { ...comPendenciaChegada(op, pendenciaId, todayISO()), revisada: true } : op,
      ),
    );
  }, []);

  const reabrirPendenciaDaOportunidade = useCallback((id: string, pendenciaId: string) => {
    setOportunidades((atuais) =>
      atuais.map((op) => (op.id === id ? comPendenciaReaberta(op, pendenciaId) : op)),
    );
  }, []);

  const descartarPendenciaDaOportunidade = useCallback((id: string, pendenciaId: string) => {
    setOportunidades((atuais) =>
      atuais.map((op) => (op.id === id ? semPendencia(op, pendenciaId) : op)),
    );
  }, []);

  const alternarPapelDaOportunidade = useCallback(
    (id: string, area: AreaTalento, usuarioId: string, papel: PapelNaArea) => {
      setOportunidades((atuais) =>
        atuais.map((op) =>
          op.id === id
            // Atribuir alguém é conferência: quem olhou a linha para nomear, olhou a linha.
            ? { ...alternarPapelNaArea(op, area, usuarioId, papel), revisada: true }
            : op,
        ),
      );
    },
    [],
  );

  const definirQuantidadeDaOportunidade = useCallback(
    (id: string, campo: CampoQuantidadeOportunidade, valor: number | undefined) => {
      setOportunidades((atuais) =>
        atuais.map((op) => (op.id === id ? { ...op, [campo]: valor, revisada: true } : op)),
      );
    },
    [],
  );

  const definirDataDeVeiculacao = useCallback((id: string, data: string | undefined) => {
    setOportunidades((atuais) =>
      atuais.map((op) => (op.id === id ? { ...op, veiculacaoEm: data || undefined, revisada: true } : op)),
    );
  }, []);

  const definirDataDeFechamento = useCallback((id: string, data: string | undefined) => {
    setOportunidades((atuais) =>
      atuais.map((op) => (op.id === id ? { ...op, fechamentoEm: data || undefined, revisada: true } : op)),
    );
  }, []);

  const definirCaptacaoDaOportunidade = useCallback(
    (id: string, captacao: TipoCaptacao | undefined) => {
      setOportunidades((atuais) =>
        atuais.map((op) => (op.id === id ? { ...op, captacaoComercial: captacao, revisada: true } : op)),
      );
    },
    [],
  );

  const marcarOportunidadeRevisada = useCallback((id: string) => {
    setOportunidades((atuais) =>
      atuais.map((op) => (op.id === id ? { ...op, revisada: true } : op)),
    );
  }, []);

  const excluirOportunidade = useCallback((id: string) => {
    setOportunidades((atuais) => atuais.filter((op) => op.id !== id));
  }, []);

  /**
   * Encerramento automático dos parados há mais de 20 dias.
   *
   * Roda **uma vez ao montar**, e não numa rotina agendada: uma regra que depende de job tem um
   * ponto de falha a mais, e um projeto que deveria estar encerrado não pode seguir aberto porque
   * o agendador caiu. O custo é que a mudança só acontece quando alguém abre o sistema — o que,
   * para uma regra de arquivamento, é aceitável.
   */
  useEffect(() => {
    const { oportunidades: proximas, encerradas } = aplicarEncerramentoAutomatico(
      oportunidadesRef.current,
    );
    if (encerradas.length > 0) {
      // Arquivamento é regra do processo, não gesto de ninguém — fica fora do desfazer.
      mudancaDoSistemaRef.current = true;
      setOportunidades(proximas);
    }
    // Sem dependências: é uma varredura de abertura, não uma reação a mudança de estado.
  }, []);

  /**
   * Porta de entrada das integrações.
   *
   * A regra de deduplicação e mesclagem vive em `utils/ingestao.ts` — aqui só se aplica o
   * resultado ao estado. Com backend, o endpoint chama as mesmas funções.
   */
  const receberOportunidades = useCallback(
    (brutas: OportunidadeBruta[], origem: OrigemAutomatica) => {
      const { oportunidades: proximas, resumo } = ingerirLote(
        brutas,
        origem,
        oportunidadesRef.current,
        { proximoId: () => `op${proximaOportunidade.current++}` },
      );
      setOportunidades(proximas);
      return resumo;
    },
    [],
  );

  /**
   * Nível de acesso ao quadro, com os registros em mãos.
   *
   * Sem os registros a regra não fecha: "ser nomeado em alguma linha" é uma das duas portas de
   * entrada, e só aqui se sabe se existe alguma.
   */
  const nivelDoQuadro = useCallback(
    (pagina: AppPage): NivelAcesso => {
      const id = sessaoRef.current.usuario.id;
      const nomeado =
        pagina === 'contratos'
          ? contratos.some((contrato) => nomeadosDoContrato(contrato).includes(id))
          : pagina === 'talentos'
            ? talentos.some((talento) => nomeadosDoTalento(talento).includes(id))
            : pagina === 'backlog'
              ? oportunidades.some((op) => nomeadosDaOportunidade(op).includes(id))
              : false;
      return nivelDeAcesso(sessaoRef.current, pagina, nomeado);
    },
    [contratos, talentos, oportunidades, usuarioAtual, equipes, concessoes, visualizandoComo],
  );

  const atualizarTalento = useCallback(
    (id: string, campo: CampoTextoTalento, valor: string) => {
      setTalentos((atuais) =>
        atuais.map((talento) =>
          talento.id === id
            ? // Preencher qualquer campo além do nome significa que alguém olhou para a ficha.
              { ...talento, [campo]: valor, cadastroPendente: campo === 'nome' ? talento.cadastroPendente : false }
            : talento,
        ),
      );
      // Renomear o talento acompanha os contratos já vinculados a ele.
      if (campo === 'nome' && valor.trim()) {
        setContratos((atuais) =>
          atuais.map((contrato) =>
            contrato.talentoId === id ? { ...contrato, talento: valor.trim() } : contrato,
          ),
        );
      }
    },
    [],
  );

  const alternarResponsavelDoTalento = useCallback(
    (talentoId: string, area: AreaTalento, usuarioId: string) => {
      setTalentos((atuais) =>
        atuais.map((talento) =>
          talento.id === talentoId
            ? // Nomear alguém já é curadoria: a pendência de cadastro se resolve aqui.
              { ...alternarResponsavelDaArea(talento, area, usuarioId), cadastroPendente: false }
            : talento,
        ),
      );
    },
    [],
  );

  /**
   * Devolve o id da ficha com este nome, criando-a como **pendente** quando não existe.
   *
   * Nome digitado sem ficha era um beco: o contrato ficava com um nome solto, e o cadastro só
   * apareceria se alguém lembrasse de abri-lo à mão — o que produzia exatamente as grafias
   * divergentes que a referência tenta evitar. Criar na hora fecha o ciclo, e a marca de pendente
   * diz que a ficha ainda precisa de alguém.
   */
  /* ------------------------------------------------------------------ *
   * Marcas e clientes
   * ------------------------------------------------------------------ */

  /** Compara por nome normalizado: "Coca-Cola" e "coca cola" são a mesma marca. */
  function acharMarca(nome: string, lista: Marca[]): Marca | undefined {
    const alvo = normalizarNomeDeMarca(nome);
    return lista.find((item) => normalizarNomeDeMarca(item.nome) === alvo);
  }

  const criarMarca = useCallback((nome: string, campos: CamposNovaMarca = {}) => {
    const limpo = nome.trim();
    // Nome repetido devolve `null`: a lista existe para não ter duas entradas da mesma marca.
    if (!limpo || acharMarca(limpo, marcasRef.current)) return null;

    const nova: Marca = {
      id: `mar${proximaMarca.current++}`,
      nome: limpo,
      tipo: 'cliente',
      segmento: '',
      categoria: '',
      contatos: [],
      observacoes: '',
      ...campos,
      criadoEm: new Date().toISOString(),
    };
    marcasRef.current = [nova, ...marcasRef.current];
    setMarcas((atuais) => [nova, ...atuais]);
    return nova;
  }, []);

  const atualizarMarca = useCallback((id: string, campo: CampoTextoMarca, valor: string) => {
    setMarcas((atuais) =>
      atuais.map((item) =>
        item.id === id
          ? // Preencher qualquer campo além do nome é a curadoria que a pendência esperava.
            { ...item, [campo]: valor, cadastroPendente: campo === 'nome' ? item.cadastroPendente : false }
          : item,
      ),
    );
  }, []);

  const definirCampoDaMarcaPorNome = useCallback(
    (nomeDaMarca: string, campo: 'segmento' | 'categoria', valor: string) => {
      const alvo = acharMarca(nomeDaMarca, marcasRef.current);
      if (!alvo) return;
      setMarcas((atuais) =>
        atuais.map((item) =>
          item.id === alvo.id
            // Preencher o cadastro é a curadoria que a pendência esperava — ver `atualizarMarca`.
            ? { ...item, [campo]: valor.trim(), cadastroPendente: false }
            : item,
        ),
      );
    },
    [],
  );

  const adicionarContatoNaMarca = useCallback((nomeDaMarca: string, contato: string) => {
    const limpo = contato.trim();
    const alvo = acharMarca(nomeDaMarca, marcasRef.current);
    if (!limpo || !alvo) return;
    // Repetido não entra: a lista existe para oferecer escolhas, não o mesmo e-mail três vezes.
    if (alvo.contatos.some((existente) => existente.toLowerCase() === limpo.toLowerCase())) return;

    setMarcas((atuais) =>
      atuais.map((item) =>
        item.id === alvo.id ? { ...item, contatos: [...item.contatos, limpo] } : item,
      ),
    );
  }, []);

  const definirTipoDaMarca = useCallback((id: string, tipo: TipoMarca) => {
    setMarcas((atuais) =>
      atuais.map((item) => (item.id === id ? { ...item, tipo, cadastroPendente: false } : item)),
    );
  }, []);

  /** Excluir a marca **não** apaga projetos: eles mantêm o nome já gravado. */
  const excluirMarca = useCallback((id: string) => {
    setMarcas((atuais) => atuais.filter((item) => item.id !== id));
  }, []);

  /**
   * Devolve o id da marca com este nome, criando-a como **pendente** quando não existe.
   *
   * É o que sustenta a coluna Marca do Backlog: a lista é fechada, mas com escape. Sem isso, ou a
   * pessoa pararia o cadastro para abrir outra tela, ou o campo voltaria a ser texto livre — e com
   * ele as três grafias da mesma marca.
   */
  const garantirMarca = useCallback((nome: string) => {
    const limpo = nome.trim();
    if (!limpo) return null;

    const existente = acharMarca(limpo, marcasRef.current);
    if (existente) return existente.id;

    return criarMarca(limpo, { cadastroPendente: true })?.id ?? null;
  }, [criarMarca]);

  const garantirTalento = useCallback((nome: string) => {
    const limpo = nome.trim();
    if (!limpo) return null;

    const existente = encontrarTalentoPorNome(limpo, talentosRef.current);
    if (existente) return existente.id;

    const novo: Talento = {
      id: `tal${proximoTalento.current++}`,
      nome: limpo,
      tipo: 'interveniencia',
      nomeArtistico: '', empresa: '', email: '', telefone: '', local: '', observacoes: '',
      razaoSocial: '', cnpj: '', faturamento: '', condicaoPagamento: '', dadosBancarios: '',
      redes: { ...REDES_VAZIAS },
      responsaveis: {},
      cadastroPendente: true,
      criadoEm: new Date().toISOString(),
    };
    talentosRef.current = [novo, ...talentosRef.current];
    setTalentos((atuais) => [novo, ...atuais]);
    return novo.id;
  }, []);

  /** Excluir o cadastro **não** apaga contratos: eles perdem o vínculo e mantêm o nome. */
  const excluirTalento = useCallback((id: string) => {
    setTalentos((atuais) => atuais.filter((talento) => talento.id !== id));
    setContratos((atuais) =>
      atuais.map((contrato) =>
        contrato.talentoId === id ? { ...contrato, talentoId: undefined } : contrato,
      ),
    );
  }, []);

  const criarSolicitacao = useCallback(
    (equipeId: string, justificativa: string) => {
      setSolicitacoes((atuais) => [
        {
          id: `sol${proximaSolicitacao.current}`,
          solicitanteId: usuarioAtualId,
          equipeId,
          justificativa,
          status: 'pendente',
          criadaEm: new Date().toISOString(),
        },
        ...atuais,
      ]);
      proximaSolicitacao.current += 1;
    },
    [usuarioAtualId],
  );

  /** Aprovar já vincula o solicitante à equipe como membro. */
  const decidirSolicitacao = useCallback(
    (id: string, aprovar: boolean) => {
      let alvo: SolicitacaoAcesso | undefined;
      setSolicitacoes((atuais) =>
        atuais.map((solicitacao) => {
          if (solicitacao.id !== id) return solicitacao;
          alvo = solicitacao;
          return {
            ...solicitacao,
            status: aprovar ? 'aprovada' : 'recusada',
            decididaPorId: usuarioAtualId,
          };
        }),
      );

      if (aprovar && alvo) {
        const { equipeId, solicitanteId } = alvo;
        setEquipes((atuais) =>
          atuais.map((equipe) =>
            equipe.id === equipeId ? definirMembro(equipe, solicitanteId, 'membro') : equipe,
          ),
        );
      }
    },
    [usuarioAtualId],
  );

  const emitirConvite = useCallback(
    (email: string, equipeId: string, papel: PapelEquipe) => {
      const convite = criarConvite({
        id: `cv${proximoConvite.current}`,
        email,
        equipeId,
        papel,
        criadoPorId: usuarioAtualId,
      });
      proximoConvite.current += 1;
      setConvites((atuais) => [convite, ...atuais]);
      return convite;
    },
    [usuarioAtualId],
  );

  const revogarConvite = useCallback((id: string) => {
    setConvites((atuais) =>
      atuais.map((convite) =>
        convite.id === id ? { ...convite, revogadoEm: new Date().toISOString() } : convite,
      ),
    );
  }, []);

  const getConvitePorToken = useCallback(
    (token: string) => convites.find((convite) => convite.token === token),
    [convites],
  );

  /**
   * Consome o convite: cria a conta ou vincula a existente, e queima o token.
   *
   * O e-mail vem do provedor de SSO — aqui ele é simulado, mas o contrato é o mesmo:
   * quem autentica precisa ser exatamente quem foi convidado.
   */
  const aceitarConvite = useCallback(
    (token: string, emailAutenticado: string, nome: string): ErroAceite | null => {
      const convite = convites.find((item) => item.token === token);
      const erro = validarAceite(convite, emailAutenticado);
      if (erro || !convite) return erro ?? 'inexistente';

      const email = normalizarEmail(emailAutenticado);
      const existente = encontrarPorEmail(email, usuarios);

      // Conta única: e-mail já cadastrado apenas ganha o vínculo com a equipe.
      const pessoa: Usuario = existente ?? {
        id: `u${proximoUsuario.current}`,
        nome: nome.trim() || email,
        email,
        cargo: '',
        telefone: '',
        local: '',
        nascimento: '',
        perfil: convite.papel === 'responsavel' ? 'responsavel' : 'membro',
        situacao: 'ativo',
      };

      if (!existente) {
        proximoUsuario.current += 1;
        setUsuarios((atuais) => [...atuais, pessoa]);
      }

      setEquipes((atuais) =>
        atuais.map((equipe) =>
          equipe.id === convite.equipeId ? definirMembro(equipe, pessoa.id, convite.papel) : equipe,
        ),
      );

      setConvites((atuais) =>
        atuais.map((item) =>
          item.id === convite.id ? { ...item, aceitoEm: new Date().toISOString() } : item,
        ),
      );

      setUsuarioAtualId(pessoa.id);
      return null;
    },
    [convites, usuarios],
  );

  const valor = useMemo<DadosContextValue>(
    () => ({
      usuarios,
      equipes,
      solicitacoes,
      usuarioAtualId: usuarioAtual?.id ?? '',
      sessao: { usuario: usuarioAtual, equipes, concessoes, visualizacao: Boolean(visualizandoComo) },
      usuarioReal,
      visualizandoComo,
      verComo: setVisualizandoComoId,
      sairDaVisualizacao: () => setVisualizandoComoId(null),
      concessoes,
      conceder,
      revogarConcessao,
      adicionarEmailAlternativo,
      removerEmailAlternativo,
      getUsuario,
      entrarComo: setUsuarioAtualId,
      criarUsuario,
      atualizarUsuario,
      definirPerfil,
      definirSituacao,
      excluirUsuario,
      dominios,
      adicionarDominio,
      removerDominio,
      convites,
      emitirConvite,
      revogarConvite,
      getConvitePorToken,
      aceitarConvite,
      atualizarProprioCadastro,
      definirFoto,
      trocasEmail,
      solicitarTrocaEmail,
      cancelarTrocaEmail,
      confirmarTrocaEmail,
      getTrocaPorToken,
      contratos,
      setContratos,
      talentos,
      criarTalento,
      atualizarTalento,
      definirTipoDoTalento,
      definirRedeDoTalento,
      alternarResponsavelDoTalento,
      excluirTalento,
      garantirTalento,
      marcas,
      criarMarca,
      atualizarMarca,
      definirTipoDaMarca,
      excluirMarca,
      garantirMarca,
      definirCampoDaMarcaPorNome,
      adicionarContatoNaMarca,
      definirCaptacaoDaOportunidade,
      definirOrigemDoTalentoPorNome,
      definirQuantidadeDaOportunidade,
      definirDataDeVeiculacao,
      definirDataDeFechamento,
      oportunidades,
      criarOportunidade,
      atualizarOportunidade,
      definirStatusDaOportunidade,
      definirPrioridadeDaOportunidade,
      definirCampoOpcaoDaOportunidade,
      definirTiqueDeEscopo,
      abrirPendenciaDaOportunidade,
      marcarPendenciaChegou,
      reabrirPendenciaDaOportunidade,
      descartarPendenciaDaOportunidade,
      alternarPapelDaOportunidade,
      duplicarOportunidade,
      marcarOportunidadeRevisada,
      excluirOportunidade,
      receberOportunidades,
      nivelDoQuadro,
      linksEquipe,
      linkDaEquipe,
      renovarLinkDaEquipe,
      desativarLinkDaEquipe,
      getLinkPorToken,
      entrarPorLink,
      criarSolicitacao,
      decidirSolicitacao,
      criarEquipe,
      renomearEquipe,
      excluirEquipe,
      alternarPaginaDaEquipe,
      definirAreaDaEquipe,
      alternarVisaoDaEquipe,
      alternarColunaDaEquipe,
      recomecarDoZero,
      definirMembroDaEquipe,
      removerMembroDaEquipe,
      desfazerAlteracao,
      refazerAlteracao,
      podeDesfazer: passado.length > 0,
      podeRefazer: futuro.length > 0,
      avisoHistorico,
    }),
    [
      usuarios, equipes, solicitacoes, usuarioAtual, usuarioReal, visualizandoComo,
      getUsuario, criarUsuario, atualizarUsuario,
      definirPerfil, definirSituacao, excluirUsuario, dominios, adicionarDominio, removerDominio,
      concessoes, conceder, revogarConcessao, adicionarEmailAlternativo, removerEmailAlternativo,
      convites, emitirConvite, revogarConvite, getConvitePorToken, aceitarConvite,
      atualizarProprioCadastro, definirFoto, trocasEmail, solicitarTrocaEmail, cancelarTrocaEmail,
      confirmarTrocaEmail, getTrocaPorToken, contratos, talentos, criarTalento, atualizarTalento,
      definirTipoDoTalento, definirRedeDoTalento, alternarResponsavelDoTalento, excluirTalento,
      garantirTalento, marcas, criarMarca, atualizarMarca, definirTipoDaMarca, excluirMarca,
      garantirMarca, definirCampoDaMarcaPorNome, adicionarContatoNaMarca,
      definirCaptacaoDaOportunidade, definirOrigemDoTalentoPorNome,
      definirQuantidadeDaOportunidade, definirDataDeVeiculacao, definirDataDeFechamento,
      oportunidades, criarOportunidade, atualizarOportunidade,
      definirStatusDaOportunidade, definirPrioridadeDaOportunidade,
      definirCampoOpcaoDaOportunidade, definirTiqueDeEscopo, abrirPendenciaDaOportunidade,
      marcarPendenciaChegou, reabrirPendenciaDaOportunidade, descartarPendenciaDaOportunidade,
      alternarPapelDaOportunidade, duplicarOportunidade, marcarOportunidadeRevisada, excluirOportunidade,
      receberOportunidades, nivelDoQuadro, linksEquipe, linkDaEquipe,
      renovarLinkDaEquipe, desativarLinkDaEquipe, getLinkPorToken, entrarPorLink, criarSolicitacao, decidirSolicitacao, criarEquipe,
      renomearEquipe, excluirEquipe, alternarPaginaDaEquipe, definirAreaDaEquipe,
      alternarVisaoDaEquipe, alternarColunaDaEquipe, recomecarDoZero, definirMembroDaEquipe,
      removerMembroDaEquipe,
      desfazerAlteracao, refazerAlteracao, passado, futuro, avisoHistorico,
    ],
  );

  return <DadosContext.Provider value={valor}>{children}</DadosContext.Provider>;
}

export function useDados(): DadosContextValue {
  const contexto = useContext(DadosContext);
  if (!contexto) throw new Error('useDados precisa estar dentro de <DadosProvider>');
  return contexto;
}
