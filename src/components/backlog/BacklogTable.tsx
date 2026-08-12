import {
  cloneElement, CSSProperties, ReactElement, useEffect, useMemo, useRef, useState,
} from 'react';
import { motion } from 'motion/react';
import {
  ArrowDown, ArrowUp, Ban, Banknote, CheckSquare, ChevronsUpDown, CopyPlus, FileSpreadsheet,
  EyeOff,
  Hourglass, Inbox, Layers, Link2, Lock, Plus, Scale, Star,
  Trash2, Users, Video,
} from 'lucide-react';
import { Oportunidade } from '../../types';
import { useDados } from '../../context/DadosProvider';
import { contratosDoTalento, getTipo } from '../../utils/talentos';
import {
  getInput,
  compararPorCampo, getStatus, INPUTS, ORIGENS_COMERCIAIS,
  apoiosDaAreaNaOportunidade, DESFECHOS_TERMINAIS, IMPACTOS, exclusividadeDe, precisaRevisao,
  responsaveisDaAreaNaOportunidade, slaDaOportunidade, CAPTACOES_PRODUCAO, TIPOS_EDICAO,
  TIPOS_OUTPUT, TIPOS_PROJETO, FORMATOS_CONTEUDO, ALCANCES_AUDIENCIA,
  destravaDaColuna, destravaDoTique,
} from '../../utils/oportunidades';
import { SLA_TONE_STYLE } from '../../utils/sla';
import {
  DIAS_ATE_ENCERRAR, diasAteEncerrar, diasParado, ehCongelada,
} from '../../utils/fluxoStatus';
import { podeCriarRegistro, podeEditarOportunidade, podeExcluirOportunidade } from '../../utils/permissoes';
import { visoesDoQuadro } from '../../utils/visoes';
import {
  ColunaCatalogo, colunasDaVisao, gradeContinua, larguraDaColuna,
} from '../../utils/colunas';
import { formatDate, todayISO } from '../../utils/dates';
import { baixarXlsx, ColunaExportada } from '../../utils/exportacao';
import { EditableCell } from '../ui/EditableCell';
import { CelulaOculta } from '../ui/CelulaOculta';
import { SelecaoComCadastro } from '../ui/SelecaoComCadastro';
import { BuscaQuadro } from '../ui/BuscaQuadro';
import {
  CAPTACOES, categoriaDaMarca, contatosDaMarca, segmentoDaMarca, valoresUsados,
} from '../../utils/marcas';
import { EtiquetaSelect } from './EtiquetaSelect';
import { CelulaNumero } from '../ui/CelulaNumero';
import { CelulaData } from '../ui/CelulaData';
import { CelulaLink } from '../ui/CelulaLink';
import { useDialogo } from '../ui/Dialogo';
import { useEscalaRaiz } from '../ui/useEscalaRaiz';

import { fichaDoTalento, ORIGENS_TALENTO } from '../../utils/talentos';
import { AreaResponsavelCell } from '../talentos-exclusivos/AreaResponsavelCell';
import { StatusOportunidadeSelect } from './StatusOportunidadeSelect';
import { OpcaoSelect } from './OpcaoSelect';
import { RodapeTotais } from './RodapeTotais';

/**
 * As colunas de contagem, e o nome do que cada uma conta — usado na dica e no leitor de tela.
 *
 * Sobrou **uma**: as quatro do Escopo (reels, vídeos, posts, cotas) saíram em 03/08/2026, quando a
 * aba passou a guardar o pedido em texto. O mecanismo fica, porque `parcelas` continua sendo uma
 * contagem e porque a próxima coluna numérica não deveria ter de reinventá-lo.
 */
const QUANTIDADES = {
  parcelas: 'parcelas',
} as const;

/** As colunas de link, e o que cada uma aponta. */
const LINKS = { linkProposta: 'proposta', linkSalesforce: 'Salesforce', linkPastaOrcamento: 'pasta de orçamento', linkPastaPlanejamento: 'pasta de planejamento' } as const;

/**
 * As opções de cada coluna de lista fechada.
 *
 * ## Por que vive no módulo, e não dentro do render
 *
 * Estava declarada como `const LISTAS` **no meio** do render da célula — depois do bloco que
 * desenha os tiques do Escopo, e antes do que desenha as colunas de lista. Os dois usavam a mesma
 * variável, e o de cima a alcançava na *temporal dead zone*: `ReferenceError` na hora de montar a
 * frase "isto apaga X da coluna Y".
 *
 * **O erro era invisível.** A função que desmarca o tique virou `async` quando a confirmação
 * deixou de ser `window.confirm` (11/08/2026), e exceção em função `async` sem `catch` vira
 * `unhandledrejection`: o clique não fazia nada, sem erro na tela, sem nada no lugar. A operação
 * descreveu como "marquei errado e não consigo desmarcar" — e era só quando havia valor
 * preenchido, porque sem valor o código não chegava a tocar nesta constante.
 *
 * No módulo, o problema deixa de existir: não há ordem de declaração que alcance uma constante de
 * escopo superior. E as opções não dependem da linha — só o *valor* dependia, e ele é lido direto
 * de `op` onde é preciso.
 */
const OPCOES_DA_COLUNA = {
  output: TIPOS_OUTPUT,
  edicao: TIPOS_EDICAO,
  formatoConteudo: FORMATOS_CONTEUDO,
  alcanceAudiencia: ALCANCES_AUDIENCIA,
} as const;

/** O rótulo legível de um valor de lista fechada — `undefined` quando não há valor ou opção. */
function rotuloDaOpcao(campo: string, valor: unknown): string | undefined {
  const opcoes = OPCOES_DA_COLUNA[campo as keyof typeof OPCOES_DA_COLUNA] as
    | readonly { id: string; label: string }[]
    | undefined;
  return opcoes?.find((opcao) => opcao.id === valor)?.label;
}
import { PrioridadeSelect } from './PrioridadeSelect';

export type CampoOportunidade =
  | 'titulo' | 'marca' | 'talento' | 'observacoes' | 'escopo'
  | 'valorProjeto' | 'cache' | 'comissaoGlobo' | 'comissao' | 'impostos'
  | 'custoProducao' | 'saving' | 'pep'
  | 'linkProposta' | 'linkSalesforce' | 'linkPastaOrcamento' | 'linkPastaPlanejamento'
  | 'tipoContratacao' | 'numeroContrato'
  | 'contatoCliente';

/**
 * A **forma** dos três botões da barra de ações — 12/08/2026.
 *
 * Eles nasceram um de cada vez, e cada um trouxe a sua medida: "Novo projeto" ficou com `rounded-md
 * px-2.5 py-1 text-rotulo` e os outros dois com `rounded-lg px-2.5 py-1.5 text-xs`. Lado a lado,
 * o verde era visivelmente menor — *"olha que o Novo projeto está menor"*.
 *
 * A `border` entra aqui mesmo no botão preenchido, onde ela é invisível: os outros dois têm borda
 * de 1px, e sem ela o verde sairia 2px mais baixo com o padding idêntico. É o detalhe que faz três
 * botões "com o mesmo padding" ainda saírem desalinhados.
 *
 * Constante em vez de repetida nos três porque foi exatamente assim que eles divergiram — cada
 * edição mexeu num só. Aqui, quem muda a forma muda a dos três; as classes de cor ficam em cada um.
 */
const FORMA_BOTAO_BARRA = 'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors';

const ICONES: Record<string, typeof Layers> = {
  'backlog:demanda': Inbox,
  'backlog:escopo': Layers,
  // A aba absorveu o Talento em 03/08: entre o prédio e a estrela, fica a estrela.
  'backlog:cliente': Star,
  'backlog:producao': Video,
  'backlog:time': Users,
  'backlog:financeiro': Banknote,
  'backlog:juridico': Scale,
  'backlog:links': Link2,
};

/*
  O mapa aba → área foi removido em 02/08/2026.

  Ele era o mecanismo de quando cada aba tinha **uma** área; desde a Produção, a coluna declara a
  sua (`ColunaCatalogo.area`), e o mapa virou retaguarda morta — com uma entrada já **errada**:
  `'backlog:juridico': 'gp'`, resquício de quando GP responderia pelo Jurídico, antes de a área
  Jurídico existir. Configuração obsoleta que ninguém consulta é onde o próximo defeito se
  esconde; a fonte agora é uma só, o catálogo de colunas.

  Em 03/08/2026 as colunas de pessoas se juntaram na aba **Time**. Isso não ressuscita o mapa: elas
  continuam declarando a própria área, e agora todas moram na mesma aba. Ver `colunas.ts`.
*/


interface BacklogTableProps {
  /** Já filtradas por permissão, filtro e busca. */
  oportunidades: Oportunidade[];
  total: number;
  busca: string;
  onBuscaChange: (valor: string) => void;
  visoesVisiveis: string[];
  /**
   * Aba aberta — estado da **página**, não da tabela.
   *
   * Subiu em 03/08/2026, quando a busca passou a cobrir as colunas da aba aberta: quem filtra
   * precisa saber onde a pessoa está. Mantê-la aqui obrigaria a página a adivinhar, ou a busca a
   * descer para dentro da grade — e é a página que monta a lista, como em todos os quadros.
   */
  aba: string;
  onAbaChange: (id: string) => void;
  colunasOcultas: string[];
  /** Insere uma linha vazia e devolve o id — ou `null` se não foi possível. */
  onCriar: () => string | null;
  onUpdateCampo: (id: string, campo: CampoOportunidade, valor: string) => void;
  onDeleteMany: (ids: string[]) => void;
}

export function BacklogTable({
  oportunidades, total, busca, onBuscaChange, visoesVisiveis,
  aba, onAbaChange: setAba,
  colunasOcultas, onCriar, onUpdateCampo, onDeleteMany,
}: BacklogTableProps) {
  const {
    sessao, talentos, marcas, contratos, usuarios, definirStatusDaOportunidade,
    definirPrioridadeDaOportunidade, definirCampoOpcaoDaOportunidade,
    alternarPapelDaOportunidade, definirTiqueDeEscopo,
    abrirPendenciaDaOportunidade, marcarPendenciaChegou, reabrirPendenciaDaOportunidade,
    descartarPendenciaDaOportunidade,
    duplicarOportunidade,
    garantirTalento, garantirMarca,
    definirCampoDaMarcaPorNome, adicionarContatoNaMarca, definirCaptacaoDaOportunidade,
    definirOrigemDoTalentoPorNome, definirQuantidadeDaOportunidade, definirDataDeVeiculacao,
    definirDataDeFechamento,
    // A lista completa, para o rastro da duplicação — o prop homônimo chega filtrado.
    oportunidades: todasOportunidades,
  } = useDados();
  const { confirmar, avisar } = useDialogo();

  const podeCriar = podeCriarRegistro(sessao, 'backlog');

  /**
   * A linha de onde esta veio, quando ainda existe — na lista **completa**, não na visível.
   *
   * O prop `oportunidades` chega filtrado por permissão, janela e busca. Procurar nele fazia a
   * dica mentir num cenário corriqueiro: o projeto original fecha, sai da janela de andamento, e
   * o rastro passava a dizer "a origem não existe mais" — com ela existindo. Sumir da tela não é
   * deixar de existir.
   */
  function origemDaDuplicacao(op: Oportunidade) {
    if (!op.duplicadaDe) return undefined;
    return todasOportunidades.find((outra) => outra.id === op.duplicadaDe);
  }

  const abas = useMemo(
    () => visoesDoQuadro('backlog').filter((visao) => visoesVisiveis.includes(visao.id)),
    [visoesVisiveis],
  );

  const [sort, setSort] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  /**
   * Linha recém-criada, com o nome já em edição.
   *
   * "Novo projeto" insere a linha direto na lista — não há formulário intermediário. O que faltava
   * era o cursor: sem isto, a pessoa criava a linha e precisava clicar no nome para digitar.
   */
  const [recemCriada, setRecemCriada] = useState<string | null>(null);
  /*
    A linha duplicada abre com o **talento** em edição, não com o nome.

    É o único campo que a duplicação deixa vazio de propósito, e o motivo de existir do gesto:
    quem duplica quer trocar o talento. Abrir no nome faria a pessoa passar por um campo que já
    está certo antes de chegar no que interessa.
  */
  const [recemDuplicada, setRecemDuplicada] = useState<string | null>(null);

  useEffect(() => {
    if (!abas.some((item) => item.id === aba)) setAba(abas[0]?.id ?? '');
  }, [abas, aba]);

  /*
    Ordenação some junto com a coluna que a produziu.

    Ordenar por Marca no Escopo e ir para o Financeiro deixava a lista numa ordem que nenhuma
    coluna da tela explica — as linhas parecem embaralhadas. O nome é a exceção: existe em todas
    as abas.
  */
  useEffect(() => {
    if (!sort || sort.field === 'titulo') return;
    if (!colunasDaVisao(aba).some((coluna) => coluna.field === sort.field)) setSort(null);
  }, [aba, sort]);

  /**
   * A grade contínua: âncoras congeladas à esquerda, e as abas viram seções que rolam.
   *
   * Antes cada aba era uma tabela própria, e as quatro colunas de identificação se repetiam nas
   * nove — a leitura recomeçava a cada troca. Aqui elas aparecem **uma vez**, fixas, e rolar para
   * o lado atravessa os assuntos em sequência. Ver [03 §3.5](../../prd/03_padroes_ui.md).
   */
  const { ancoras, secoes } = useMemo(() => gradeContinua(visoesVisiveis), [visoesVisiveis]);
  const colunasRolantes = useMemo(() => secoes.flatMap((secao) => secao.colunas), [secoes]);
  const oculta = (id: string) => colunasOcultas.includes(id);
  // checkbox + âncoras + nome + rolantes + ações
  const totalColunas = ancoras.length + colunasRolantes.length + 3;

  /*
    Os deslocamentos do congelamento.

    `position: sticky` numa `<td>` precisa do `left` exato — ele não se acumula sozinho entre
    irmãos. Cada célula congelada soma a largura de todas as anteriores, e um valor errado aqui
    faz duas colunas se sobreporem ao rolar, escondendo dado sem avisar.
  */
  /*
    **Toda largura da grade passa pelo fator da raiz** — constantes e catálogo.

    A raiz fluida amplia o texto nas telas grandes; sem ampliar as caixas junto, o texto crescia
    dentro de larguras paradas e era comido ("há colunas que está comendo a palavra" — operação,
    11/08/2026). Multiplicar aqui, na fonte, mantém a aritmética do congelamento e do scroll exata
    por construção — o porquê de não usar `rem` está em `useEscalaRaiz`.
  */
  const fatorRaiz = useEscalaRaiz();
  const largura = (coluna: ColunaCatalogo) => Math.round(larguraDaColuna(coluna) * fatorRaiz);
  const L_CHECKBOX = Math.round(44 * fatorRaiz);
  // Nomes de projeto são longos: "[Carta Orçamento] Marina Duarte | Coca-Cola Verão" em 2 linhas.
  const L_NOME = Math.round(340 * fatorRaiz);

  const L_ACOES = Math.round(72 * fatorRaiz);

  /**
   * Ordem congelada: seleção · **Ações** · Status · Projeto · Entrada · Talento.
   *
   * As Ações vieram do fim da linha para cá em 03/08/2026. Numa tabela que rola na horizontal, a
   * última coluna some da vista assim que se avança um pouco — e duplicar ou excluir passava a
   * exigir rolar de volta até o fim. Congeladas junto com a identificação, ficam sempre à mão.
   */
  const congeladas = useMemo(() => {
    const antesDoNome = ancoras.filter((c) => c.field === 'status');
    const depoisDoNome = ancoras.filter((c) => c.field !== 'status');
    const lista: {
      key: string; largura: number; coluna?: ColunaCatalogo; nome?: boolean; acoes?: boolean;
    }[] = [
      { key: 'sel', largura: L_CHECKBOX },
      { key: 'acoes', largura: L_ACOES, acoes: true },
      ...antesDoNome.map((c) => ({ key: c.id, largura: largura(c), coluna: c })),
      { key: 'nome', largura: L_NOME, nome: true },
      ...depoisDoNome.map((c) => ({ key: c.id, largura: largura(c), coluna: c })),
    ];
    let acumulado = 0;
    return lista.map((item, indice) => {
      const left = acumulado;
      acumulado += item.largura;
      return { ...item, left, ultima: indice === lista.length - 1 };
    });
    // O fator entra nas dependências: redimensionar a janela muda a raiz, e as larguras vão junto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ancoras, fatorRaiz]);

  const larguraCongelada = congeladas.reduce((total, c) => total + c.largura, 0);

  /*
    A largura total declarada — congeladas + rolantes — vira o `width` da tabela.

    Com `table-layout: fixed`, é o que garante que a largura **real** de cada coluna é a declarada.
    No layout automático o navegador alargava colunas cujo conteúdo mínimo não cabia (o cabeçalho
    "Entrada" pedia mais que os 74px declarados), e o `left` acumulado das congeladas seguintes
    ficava curto — a Talento deslizava por cima da Entrada ao rolar.
  */
  const larguraTotal =
    larguraCongelada + colunasRolantes.reduce((total, c) => total + largura(c), 0);

  /**
   * Classe das células congeladas — o `left` vai no style, que é calculado.
   *
   * `col-fixa` dá o fundo (opaco, senão o que rola aparece por baixo) e o tom levemente mais frio
   * que as distingue do resto; `col-fixa-ultima` desenha a sombra na divisa. As duas vivem no
   * `index.css`, junto com a zebra, porque precisam vencer o fundo da linha.
   */
  const fixaClasse = (ultima = false) =>
    `sticky z-10 col-fixa${ultima ? ' col-fixa-ultima' : ''}`;

  /* ------------------------------------------------------------------ *
   * Scroll ↔ aba
   *
   * A aba deixou de trocar de tela e virou **atalho para uma posição**. Os dois sentidos precisam
   * conversar sem se atropelar, e é aí que este tipo de sincronia costuma quebrar:
   *
   * | Sentido | Como |
   * |---------|------|
   * | Clicar na aba → rolar até a seção | `scrollTo` suave, com a largura congelada descontada |
   * | Rolar → marcar a aba da seção visível | mede qual seção começa mais perto da borda esquerda |
   *
   * **O loop de feedback é o risco.** Clicar rola; rolar troca a aba; a aba trocada rolaria de
   * novo. `rolandoPorClique` suspende a leitura do scroll enquanto a animação corre — sem isso, a
   * inércia do trackpad dispara trocas que ninguém pediu, e a aba clicada pode nem ser a final.
   * ------------------------------------------------------------------ */
  const areaRolagem = useRef<HTMLDivElement>(null);
  const rolandoPorClique = useRef(false);
  const destinoDoClique = useRef(0);
  const timerDoClique = useRef<number>(undefined);

  /*
    A posição de cada seção, **calculada do catálogo** — não medida do DOM.

    Com `table-layout: fixed` a largura real É a declarada, então o `scrollLeft` que emparelha
    uma seção com a borda do congelado é a soma das larguras das seções rolantes anteriores —
    exato por construção. A versão anterior media `offsetLeft` do `<th>`, que parecia mais segura
    e era o contrário: o clique parava perto, mas não emparelhado (reporte da operação,
    04/08/2026).
  */
  const inicioDaSecaoPx = useMemo(() => {
    const mapa = new Map<string, number>();
    let acumulado = 0;
    for (const secao of secoes) {
      mapa.set(secao.visaoId, acumulado);
      acumulado += secao.colunas.reduce((total, c) => total + largura(c), 0);
    }
    return mapa;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secoes, fatorRaiz]);

  function irParaSecao(visaoId: string) {
    setAba(visaoId);
    const area = areaRolagem.current;
    const inicio = inicioDaSecaoPx.get(visaoId);
    if (!area || inicio === undefined) return;

    /*
      O clamp ao limite físico não é detalhe — sem ele, as seções do fim pedem um destino que o
      navegador nunca alcança, e o observer ficaria surdo à espera de uma chegada impossível.
    */
    const maximo = Math.max(0, area.scrollWidth - area.clientWidth);
    const destino = Math.min(maximo, inicio);

    /*
      O observer devolve o controle quando a animação **assenta no destino** — não num tempo
      fixo. Os 600ms da primeira versão eram mais curtos que o `smooth` de uma travessia longa:
      o observer reassumia no meio do caminho, marcava a seção intermediária, e a aba piscava
      antes de acertar (bug visto pela operação em 04/08/2026). O timeout só ficou como
      rede — se o navegador nunca chegar, 2s soltam o observer.
    */
    rolandoPorClique.current = true;
    destinoDoClique.current = destino;
    window.clearTimeout(timerDoClique.current);
    timerDoClique.current = window.setTimeout(() => { rolandoPorClique.current = false; }, 2000);

    if (typeof area.scrollTo === 'function') {
      area.scrollTo({ left: destino, behavior: 'smooth' });
    } else {
      area.scrollLeft = destino;
    }
  }

  useEffect(() => {
    const area = areaRolagem.current;
    if (!area) return undefined;

    function aoRolar() {
      if (!area) return;
      if (rolandoPorClique.current) {
        // A animação do clique assentou no destino? Então o observer reassume — antes disso,
        // cada quadro intermediário é paisagem passando, não navegação de quem rola.
        if (Math.abs(area.scrollLeft - destinoDoClique.current) <= 2) {
          rolandoPorClique.current = false;
          window.clearTimeout(timerDoClique.current);
        }
        return;
      }

      /*
        **No fim do scroll, a última seção é a ativa** — sem isso ela nunca acendia.

        Foi o defeito que a operação viu: rolar até o fim e a aba parar na penúltima. A última
        seção começa perto do limite direito, então o corte abaixo nunca a alcança: não há scroll
        restante para trazê-la até a borda do congelado. Quem chegou ao fim está olhando para ela.
      */
      const fim = area.scrollLeft + area.clientWidth >= area.scrollWidth - 4;
      if (fim) {
        const ultima = secoes[secoes.length - 1]?.visaoId;
        if (ultima && ultima !== aba) setAba(ultima);
        return;
      }

      /*
        Fora do fim, a seção ativa é a última que já **passou** da borda do congelado.

        Medir a que está "mais visível" faria a aba piscar entre duas no meio da rolagem; medir
        pela borda dá um ponto de corte único, e a troca acontece uma vez só.
      */
      // A mesma régua do clique: posições calculadas do catálogo, com 8px de tolerância.
      let ativa = secoes[0]?.visaoId;
      for (const secao of secoes) {
        const inicio = inicioDaSecaoPx.get(secao.visaoId);
        if (inicio !== undefined && inicio <= area.scrollLeft + 8) ativa = secao.visaoId;
      }
      if (ativa && ativa !== aba) setAba(ativa);
    }

    area.addEventListener('scroll', aoRolar, { passive: true });
    return () => area.removeEventListener('scroll', aoRolar);
  }, [secoes, aba, setAba, inicioDaSecaoPx]);

  /* ------------------------------------------------------------------ *
   * Exportar para Excel
   * ------------------------------------------------------------------ */

  /**
   * O valor de uma célula **como texto de leitura** — o que a tela mostra, não o id interno.
   *
   * Exportar `'viu_first'` em vez de `'VIU First'` obrigaria quem recebe a planilha a decorar o
   * vocabulário do código. As mesmas listas que alimentam os painéis resolvem o rótulo.
   */
  function valorExportado(op: Oportunidade, coluna: ColunaCatalogo): string {
    const chave = coluna.id.split(':')[2];
    const ficha = fichaDoTalento(op, talentos);

    const listas: Record<string, { id: string; label: string }[]> = {
      input: INPUTS, origem: ORIGENS_COMERCIAIS, tipoProjeto: TIPOS_PROJETO,
      output: TIPOS_OUTPUT, impacto: IMPACTOS, edicao: TIPOS_EDICAO,
      captacaoProducao: CAPTACOES_PRODUCAO, formatoConteudo: FORMATOS_CONTEUDO,
      alcanceAudiencia: ALCANCES_AUDIENCIA,
    };

    if (chave === 'status') return getStatus(op.status).label;
    if (chave === 'entradaEm') return formatDate(op.entradaEm);
    if (chave === 'veiculacaoEm') return op.veiculacaoEm ? formatDate(op.veiculacaoEm) : '';
    if (chave === 'fechamentoEm') return op.fechamentoEm ? formatDate(op.fechamentoEm) : '';
    if (chave === 'exclusivo') {
      const derivada = exclusividadeDe(op, talentos);
      return derivada === undefined ? '' : derivada ? 'Sim' : 'Não';
    }
    if (chave === 'origemTalento') {
      return ORIGENS_TALENTO.find((origem) => origem.id === ficha?.origem)?.label ?? '';
    }
    if (chave === 'segmento') return segmentoDaMarca(op.marca, marcas) ?? '';
    if (chave === 'categoria') return categoriaDaMarca(op.marca, marcas) ?? '';
    if (chave === 'razaoSocial') return ficha?.razaoSocial ?? '';
    if (chave === 'cnpj') return ficha?.cnpj ?? '';
    if (chave in listas) {
      const bruto = op[chave as keyof Oportunidade];
      return listas[chave].find((item) => item.id === bruto)?.label ?? '';
    }
    const tiqueExp = destravaDoTique(chave);
    if (tiqueExp) return op[tiqueExp.tique] === true ? 'Sim' : 'Não';
    if (coluna.area || chave === 'orcamento') {
      // Coluna de pessoas: nomes de quem responde e de quem apoia, na mesma célula.
      const area = coluna.area ?? 'orcamento';
      const nomes = [
        ...responsaveisDaAreaNaOportunidade(op, area),
        ...apoiosDaAreaNaOportunidade(op, area),
      ].map((id) => usuarios.find((usuario) => usuario.id === id)?.nome).filter(Boolean);
      return nomes.join(', ');
    }
    const bruto = op[chave as keyof Oportunidade];
    return bruto === undefined || bruto === null ? '' : String(bruto);
  }

  function exportarParaExcel() {
    const visiveisParaExportar = colunasRolantes.filter((coluna) => !oculta(coluna.id));
    const colunasExportadas: ColunaExportada[] = [
      ...ancoras.filter((c) => c.field === 'status').map((c) => ({
        rotulo: c.label, valor: (i: number) => valorExportado(ordenadas[i], c),
      })),
      { rotulo: 'Projeto', valor: (i: number) => ordenadas[i].titulo },
      ...ancoras.filter((c) => c.field !== 'status').map((c) => ({
        rotulo: c.label, valor: (i: number) => valorExportado(ordenadas[i], c),
      })),
      ...visiveisParaExportar.map((c) => ({
        rotulo: c.label, valor: (i: number) => valorExportado(ordenadas[i], c),
      })),
    ];
    /*
      `.xlsx` de verdade — o CSV "que o Excel abre" caiu a pedido da operação (04/08/2026).
      O nome leva a página e a data legível ("Backlog de Agenciados - 04-08-2026.xlsx"): na pasta
      Downloads, é o que distingue a planilha de ontem da de hoje sem abrir nenhuma.
    */
    const dataLegivel = formatDate(todayISO()).replace(/\//g, '-');
    try {
      baixarXlsx(
        `Backlog de Agenciados - ${dataLegivel}.xlsx`,
        colunasExportadas,
        ordenadas.length,
        'Backlog de Agenciados',
      );
    } catch {
      // Falha silenciosa foi o defeito original: se algo impedir o download, a pessoa fica sabendo.
      void avisar({
        titulo: 'Não foi possível gerar o Excel',
        descricao: 'Recarregue a página e tente de novo.',
        icone: 'alerta',
      });
    }
  }

  const ordenadas = useMemo(() => {
    if (!sort) return oportunidades;
    const fator = sort.direction === 'asc' ? 1 : -1;
    return [...oportunidades].sort((a, b) => fator * compararPorCampo(a, b, sort.field));
  }, [oportunidades, sort]);

  function toggleSort(field: string) {
    setSort((atual) => {
      if (atual?.field !== field) return { field, direction: 'asc' };
      if (atual.direction === 'asc') return { field, direction: 'desc' };
      return null;
    });
  }

  function toggleSelecao(id: string) {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function toggleTodas() {
    setSelecionados(
      selecao.length === oportunidades.length ? new Set() : new Set(oportunidades.map((o) => o.id)),
    );
  }

  /**
   * Duplicar, agora com pergunta antes — pedido da gestão em 11/08/2026.
   *
   * ## Por que um gesto de rotina passou a confirmar
   *
   * Duplicar não destrói nada, e a primeira leitura é que não precisaria de confirmação. O que
   * mudou essa leitura foi **onde o botão mora**: encostado na lixeira, na coluna congelada que
   * acompanha a rolagem. Errar o alvo por um ícone é fácil, e o resultado aparece no topo da
   * lista — fora da vista de quem estava rolando lá embaixo. A linha extra só é descoberta
   * depois, por outra pessoa, sem ninguém saber se é engano ou projeto de verdade.
   *
   * A pergunta também é o único lugar onde cabe dizer **o que a cópia leva** — informação que
   * antes vivia só na dica do botão e no PRD.
   */
  async function duplicar(op: Oportunidade) {
    const terminal = DESFECHOS_TERMINAIS.includes(op.status);
    const ok = await confirmar({
      titulo: `Duplicar "${op.titulo}"?`,
      descricao: [
        'A cópia abre esperando o novo talento. Marca, classificações, escopo e responsáveis vêm junto; valores, PEP e contrato não.',
        // Só se diz quando é surpresa: o status **não** acompanhar é a exceção, não a regra.
        terminal
          ? `Como este projeto está em ${getStatus(op.status).label}, a cópia começa em Entrada.`
          : '',
      ].join('\n'),
      rotuloConfirmar: 'Duplicar',
      icone: 'duplicar',
    });
    if (!ok) return;

    const nova = duplicarOportunidade(op.id);
    if (nova) setRecemDuplicada(nova.id);
  }

  /*
    Sem descrição, de propósito.

    Ela dizia "esta ação não pode ser desfeita" — o que deixou de ser verdade com o `Ctrl+Z`. A
    substituta, "dá para desfazer com Ctrl+Z", durou um dia: **ensinar atalho não é papel da
    confirmação**. Quem está prestes a excluir precisa decidir se quer excluir, e a instrução de
    teclado disputa a atenção com a única pergunta que a tela está fazendo — ainda por cima
    desaparecendo junto com o diálogo, antes da hora em que seria útil.

    O atalho se apresenta onde tem serventia: no aviso que aparece **depois** da ação
    (`AvisoHistorico`), quando a pessoa tem motivo para procurá-lo.
  */
  async function excluir(ids: string[], rotulo: string) {
    const ok = await confirmar({
      titulo: `Excluir ${rotulo}?`,
      rotuloConfirmar: 'Excluir',
      destrutivo: true,
      icone: 'excluir',
    });
    if (!ok) return;

    onDeleteMany(ids);
    setSelecionados(new Set());
  }

  /**
   * Cria a oportunidade e deixa o nome pronto para digitar.
   *
   * Nasce como "Sem título" porque o nome é a chave da linha e não pode ficar vazio — a célula
   * abre com o texto selecionado, então digitar substitui. Quem sair sem preencher vê "Sem
   * título" na lista, que é honesto: a linha existe e falta nomear.
   */
  function novoRegistro() {
    const id = onCriar();
    if (id) setRecemCriada(id);
  }

  /*
    A seleção só vale para o que está na tela.

    Limpar por lista de dependências — era `[aba, busca]` — sempre esquece um caso: a
    etapa do fluxo é estado da página, e uma linha também sai da lista ao mudar de status. O id
    continuava marcado e invisível, e "Excluir em Lote" apagava o que ninguém estava vendo.

    Derivar da interseção com as linhas visíveis se corrige sozinha, sem lista para manter.
  */
  const selecao = useMemo(
    () => oportunidades.filter((o) => selecionados.has(o.id)).map((o) => o.id),
    [oportunidades, selecionados],
  );
  const temSelecao = selecao.length > 0;

  /**
   * As listas que as colunas Marca e Talento oferecem.
   *
   * Vêm do **cadastro**, não dos valores já digitados: uma lista montada a partir do que existe na
   * própria coluna se alimentaria dos próprios erros — a grafia errada de ontem viraria sugestão
   * hoje. O selo de pendente acompanha, para quem lê saber o que ainda não foi conferido.
   */
  const opcoesDeMarca = useMemo(
    () => marcas
      .map((marca) => ({ nome: marca.nome, pendente: marca.cadastroPendente }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [marcas],
  );

  const opcoesDeTalento = useMemo(
    () => talentos
      .map((talento) => ({ nome: talento.nome, pendente: talento.cadastroPendente }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [talentos],
  );

  function celulaTexto(op: Oportunidade, coluna: ColunaCatalogo, podeEditar: boolean) {
    if (oculta(coluna.id)) return <CelulaOculta label={coluna.label} align={coluna.align} />;

    const campo = coluna.campo as CampoOportunidade;
    const valor = op[campo] ?? '';

    if (!podeEditar) {
      return (
        <div className={`truncate px-2 py-1 text-xs text-slate-700 ${coluna.align === 'center' ? 'text-center' : ''}`}>
          {valor || '—'}
        </div>
      );
    }

    /*
      Talento e Marca escolhem de **lista cadastrada**, com escape para criar.

      O nome novo entra como solicitação — ficha ou marca marcada como pendente — em vez de virar
      texto solto. É o que impede o mesmo talento de existir como "Gil do Vigor" numa linha e
      "Gilberto do Vigor" noutra, sem obrigar ninguém a parar o cadastro para abrir outra tela.
    */
    if (campo === 'talento') {
      return (
        <SelecaoComCadastro
          editing={op.id === recemDuplicada}
          onEditingEnd={() => setRecemDuplicada(null)}
          value={valor}
          onCommit={(novo) => {
            // Cria a ficha pendente **antes** de gravar: o nome na linha sempre tem cadastro atrás.
            if (novo.trim()) garantirTalento(novo);
            onUpdateCampo(op.id, campo, novo);
          }}
          opcoes={opcoesDeTalento}
          entidade="talento"
          align="center"
          placeholder={coluna.placeholder}
          className="text-xs"
        />
      );
    }

    if (campo === 'marca') {
      return (
        <SelecaoComCadastro
          value={valor}
          onCommit={(novo) => {
            if (novo.trim()) garantirMarca(novo);
            onUpdateCampo(op.id, campo, novo);
          }}
          opcoes={opcoesDeMarca}
          entidade="marca"
          align="center"
          placeholder={coluna.placeholder}
          className="text-xs"
        />
      );
    }

    return (
      <EditableCell
        value={valor}
        onCommit={(novo) => onUpdateCampo(op.id, campo, novo)}
        align={coluna.align}
        placeholder={coluna.placeholder}
        /*
          O Escopo ocupa três linhas; todo o resto, uma.

          É o único campo do quadro que guarda texto corrido — um briefing, não um valor. Truncar
          em uma linha mostraria "3 reels, 1 vídeo de 60s, com direi…" e obrigaria a passar o mouse
          em cada linha para ler o que a coluna existe para mostrar. Três é o teto do `line-clamp`
          da célula, e o bastante para o pedido típico caber sem a linha da tabela crescer demais.
        */
        linhas={campo === 'escopo' ? 3 : 1}
        /*
          O Escopo edita em área de texto: é o único campo do quadro que guarda texto corrido.

          Num campo de uma linha, um briefing de três frases corre para o lado e o começo some pela
          esquerda enquanto se digita — a pessoa perde a noção do que já escreveu. Aqui Enter quebra
          linha e `Ctrl`+Enter confirma; sair do campo também.
        */
        multilinha={campo === 'escopo'}
        className="text-xs text-slate-700"
      />
    );
  }


  /**
   * Coluna que nomeia pessoas de uma área — a área vem sempre da **coluna**.
   *
   * Enquanto cada aba tinha uma área só, herdá-la da aba bastava; Produção trouxe duas (Produção
   * e GP) e a declaração migrou para o catálogo.
   *
   * ## Responsável e apoio, em **todas** as áreas — 11/08/2026
   *
   * Até aqui só Orçamento distinguia os dois papéis, por uma célula própria; as demais nomeavam
   * uma lista plana de responsáveis. A operação pediu a mesma regra em toda parte — *"a regra deve
   * ser como fizemos na de Orçamento"* —, e o motivo é o mesmo que valeu lá: com mais de uma
   * pessoa na área, **"quem responde" e "quem ajuda" são perguntas diferentes**, e a lista plana
   * respondia só a primeira. Quem cobra a entrega precisa saber de quem cobrar.
   *
   * Com isso a exceção sumiu: Orçamento passou a declarar `area` no catálogo e vem por aqui como
   * as outras. Uma célula, um caminho — era a exceção que mantinha as duas versões vivas.
   */
  function celulaResponsavel(op: Oportunidade, coluna: ColunaCatalogo, podeEditar: boolean) {
    const area = coluna.area;
    if (!area) return null;
    if (oculta(coluna.id)) return <CelulaOculta label={coluna.label} largura="curta" />;

    return (
      <AreaResponsavelCell
        area={area}
        usuarioIds={responsaveisDaAreaNaOportunidade(op, area)}
        apoioIds={apoiosDaAreaNaOportunidade(op, area)}
        onAlternarPapel={
          podeEditar
            ? (usuarioId, papel) => alternarPapelDaOportunidade(op.id, area, usuarioId, papel)
            : undefined
        }
      />
    );
  }

  /**
   * Desenha as células de uma lista de colunas.
   *
   * Recebe a lista em vez de ler uma global porque a grade contínua a chama **duas vezes** por
   * linha: uma para as âncoras congeladas, outra para as colunas que rolam. Eram a mesma lista
   * enquanto cada aba era uma tabela.
   */
  function renderCelulas(
    op: Oportunidade,
    podeEditar: boolean,
    temPermissao: boolean,
    lista: ColunaCatalogo[],
  ) {
    /*
      A divisa de seção desce pelas células.

      O cabeçalho marca o começo de cada seção com `data-secao`, e o fio vertical do CSS lê essa
      marca. A linha precisa dela na mesma coluna — senão a divisa existiria só na faixa de rótulos
      e sumiria no corpo. `cloneElement` no pós-processo cobre todos os caminhos de célula de uma
      vez, em vez de repetir o atributo em cada `if`.
    */
    return renderCelulasInterno(op, podeEditar, temPermissao, lista).map((celula, i) => {
      const inicioSecao = secoes.find((s) => s.colunas[0]?.id === lista[i].id);
      return inicioSecao
        ? cloneElement(celula as ReactElement<{ 'data-secao'?: string }>, {
            'data-secao': inicioSecao.visaoId,
          })
        : celula;
    });
  }

  function renderCelulasInterno(
    op: Oportunidade,
    podeEditar: boolean,
    temPermissao: boolean,
    lista: ColunaCatalogo[],
  ) {
    return lista.map((coluna) => {
      const chave = coluna.id.split(':')[2];

      /* --- Colunas de escolha, com etiqueta clicável --- */
      if (chave === 'status') {
        return (
          // `col-status`: a etiqueta usa corpo menor, e o espaço poupado vai para o nome do projeto.
          <td key={coluna.id} className="col-status px-2 py-2">
            {oculta(coluna.id) ? (
              <CelulaOculta label={coluna.label} largura="curta" />
            ) : (
              <StatusOportunidadeSelect
                valor={op.status}
                motivo={op.motivoDeclinio}
                /* O fluxo não congela — ver a nota em `renderLinha`. */
                onChange={
                  temPermissao
                    ? (v, motivo) => definirStatusDaOportunidade(op.id, v, motivo)
                    : undefined
                }
                /*
                  Pendências seguem a permissão do status: quem pode mover a linha pode registrar
                  com quem ela está parada. Sem permissão, o selo ainda mostra a espera — ler "a
                  bola está com o Esporte" é informação de todo mundo.
                */
                pendencias={op.pendencias}
                onAbrirPendencia={
                  temPermissao ? (tipo) => abrirPendenciaDaOportunidade(op.id, tipo) : undefined
                }
                onPendenciaChegou={
                  temPermissao ? (pendenciaId) => marcarPendenciaChegou(op.id, pendenciaId) : undefined
                }
                onReabrirPendencia={
                  temPermissao
                    ? (pendenciaId) => reabrirPendenciaDaOportunidade(op.id, pendenciaId)
                    : undefined
                }
                onDescartarPendencia={
                  temPermissao
                    ? (pendenciaId) => descartarPendenciaDaOportunidade(op.id, pendenciaId)
                    : undefined
                }
              />
            )}
          </td>
        );
      }

      if (chave === 'prioridade') {
        return (
          <td key={coluna.id} className="px-2 py-2">
            {oculta(coluna.id) ? (
              <CelulaOculta label={coluna.label} largura="curta" />
            ) : (
              <PrioridadeSelect
                valor={op.prioridade}
                onChange={podeEditar ? (v) => definirPrioridadeDaOportunidade(op.id, v) : undefined}
              />
            )}
          </td>
        );
      }

      /*
        Tipo e Origem do talento vêm da **ficha**, não da linha.

        Tipo é só leitura: trocar o vínculo de alguém é decisão de cadastro, e fazê-lo de dentro de
        um projeto esconderia o alcance. Origem é editável porque é dado que costuma faltar, e
        quem preenche o Backlog é quem sabe — a dica avisa que vale para todos os projetos dele.
      */
      /*
        Razão social e documento vêm da **ficha do talento** — quinto caso do mesmo padrão.

        Só leitura: são dados cadastrais da pessoa jurídica, e corrigi-los de dentro de um projeto
        esconderia que a correção vale para todos os contratos dela.
      */
      if (chave === 'razaoSocial' || chave === 'cnpj') {
        const ficha = fichaDoTalento(op, talentos);
        const valorFicha = chave === 'razaoSocial' ? ficha?.razaoSocial : ficha?.cnpj;
        const nome = op.talento?.trim();

        return (
          <td key={coluna.id} className="px-2 py-2">
            {oculta(coluna.id) ? (
              <CelulaOculta label={coluna.label} largura="curta" />
            ) : valorFicha?.trim() ? (
              <span
                className={`block px-2 text-xs text-slate-700 ${
                  coluna.align === 'left' ? 'text-left' : 'text-center'
                }`}
                data-dica={valorFicha}
                data-dica-sub={`Da ficha de ${ficha!.nome} — para mudar, altere o cadastro`}
                data-dica-sempre
              >
                {valorFicha}
              </span>
            ) : (
              <span
                className={`block px-2 text-xs text-slate-300 ${
                  coluna.align === 'left' ? 'text-left' : 'text-center'
                }`}
                data-dica={`${coluna.label} indefinido`}
                data-dica-sub={
                  !nome
                    ? 'Defina o talento: este dado vem da ficha dele'
                    : ficha
                      ? `A ficha de ${nome} não tem este campo preenchido`
                      : `"${nome}" ainda não tem ficha em Talentos`
                }
                data-dica-sempre
              >
                —
              </span>
            )}
          </td>
        );
      }

      if (chave === 'fechamentoEm') {
        return (
          <td key={coluna.id} className="px-2 py-2">
            {oculta(coluna.id) ? (
              <CelulaOculta label={coluna.label} largura="curta" />
            ) : (
              <CelulaData
                valor={op.fechamentoEm}
                rotulo="data de fechamento"
                editavel={podeEditar}
                onCommit={(v) => definirDataDeFechamento(op.id, v)}
              />
            )}
          </td>
        );
      }

      /*
        Só `origemTalento` passa por aqui desde 03/08/2026 — `tipoTalento` foi removida, absorvida
        pela coluna Exclusivo, que sai da mesma ficha e responde a mesma pergunta.

        A estrutura de duas etapas (sem ficha → traço explicado; com ficha → o dado) continua
        valendo para uma coluna só: é o padrão de toda coluna espelhada da ficha do talento.
      */
      if (chave === 'origemTalento') {
        const ficha = fichaDoTalento(op, talentos);
        const nome = op.talento?.trim();

        if (oculta(coluna.id)) {
          return (
            <td key={coluna.id} className="px-2 py-2">
              <CelulaOculta label={coluna.label} largura="curta" />
            </td>
          );
        }

        // Sem ficha não há de onde derivar — e a célula diz qual dos dois casos é.
        if (!ficha) {
          return (
            <td key={coluna.id} className="px-2 py-2">
              <span
                className="flex w-full items-center justify-center gap-1 rounded-md px-2 py-1 text-apoio text-slate-500"
                data-dica={`${coluna.label} indefinido`}
                data-dica-sub={
                  nome
                    ? `"${nome}" ainda não tem ficha em Talentos`
                    : 'Defina o talento: este dado vem da ficha dele'
                }
                data-dica-sempre
              >
                <span className="size-1.5 shrink-0 rounded-full bg-slate-200" />
                —
              </span>
            </td>
          );
        }

        return (
          <td key={coluna.id} className="px-2 py-2">
            <OpcaoSelect
              titulo="Origem do talento"
              opcoes={ORIGENS_TALENTO}
              valor={ficha.origem}
              onChange={
                podeEditar
                  ? (v) => definirOrigemDoTalentoPorNome(ficha.nome, v)
                  : undefined
              }
              dicaSub={`Da ficha de ${ficha.nome} — vale para todos os projetos dele`}
            />
          </td>
        );
      }

      /* --- Links externos --- */
      if (chave in LINKS) {
        const campoLink = chave as keyof typeof LINKS;
        return (
          <td key={coluna.id} className="px-1 py-2">
            {oculta(coluna.id) ? (
              <CelulaOculta label={coluna.label} largura="curta" />
            ) : (
              <CelulaLink
                valor={op[campoLink]}
                rotulo={LINKS[campoLink]}
                editavel={podeEditar}
                onCommit={(v) => onUpdateCampo(op.id, campoLink, v)}
              />
            )}
          </td>
        );
      }

      /* --- Quantidades --- */
      if (chave in QUANTIDADES) {
        const campoQtd = chave as keyof typeof QUANTIDADES;
        return (
          <td key={coluna.id} className="px-1 py-2">
            {oculta(coluna.id) ? (
              <CelulaOculta label={coluna.label} largura="curta" />
            ) : (
              <CelulaNumero
                valor={op[campoQtd]}
                rotulo={QUANTIDADES[campoQtd]}
                editavel={podeEditar}
                onCommit={(v) => definirQuantidadeDaOportunidade(op.id, campoQtd, v)}
              />
            )}
          </td>
        );
      }

      if (chave === 'captacaoProducao') {
        return (
          <td key={coluna.id} className="px-2 py-2">
            {oculta(coluna.id) ? (
              <CelulaOculta label={coluna.label} largura="curta" />
            ) : (
              <OpcaoSelect
                titulo="Captação"
                opcoes={CAPTACOES_PRODUCAO}
                valor={op.captacaoProducao}
                onChange={
                  podeEditar
                    ? (v) => definirCampoOpcaoDaOportunidade(op.id, 'captacaoProducao', v)
                    : undefined
                }
              />
            )}
          </td>
        );
      }

      /*
        Data de veiculação — quando vai ao ar.

        Sem farol, ao contrário do Deadline: aquele é prazo de triagem, com SLA correndo. Este é
        agenda, e uma data futura não é atraso.
      */
      if (chave === 'veiculacaoEm') {
        return (
          <td key={coluna.id} className="px-2 py-2">
            {oculta(coluna.id) ? (
              <CelulaOculta label={coluna.label} largura="curta" />
            ) : (
              <CelulaData
                valor={op.veiculacaoEm}
                rotulo="data de veiculação"
                editavel={podeEditar}
                onCommit={(v) => definirDataDeVeiculacao(op.id, v)}
              />
            )}
          </td>
        );
      }

      /*
        Os três tiques do Escopo — o que este projeto inclui.

        Marcar destrava a coluna de mesmo nome na aba Produção. **Desmarcar apaga o que estiver lá**,
        e por isso pergunta antes: o valor some de uma aba que a pessoa não está vendo, e um dado
        que desaparece em silêncio noutra tela é a categoria de surpresa que se evita perguntando.

        Confirmar só quando **há o que perder**: desmarcar um campo vazio não pede nada, porque não
        apaga nada. Diálogo que aparece sem motivo ensina a clicar em "OK" sem ler.
      */
      const tique = destravaDoTique(chave);
      if (tique) {
        const marcado = op[tique.tique] === true;
        const temValor = op[tique.campo] !== undefined;

        async function alternar() {
          if (!marcado) return definirTiqueDeEscopo(op.id, tique!.tique, true);
          if (temValor) {
            const rotulo = rotuloDaOpcao(tique!.campo, op[tique!.campo]) ?? 'o valor';
            const ok = await confirmar({
              titulo: `Desmarcar ${tique!.label}?`,
              descricao: `Isto apaga "${rotulo}" da coluna ${tique!.label}, na aba Produção.`,
              rotuloConfirmar: 'Desmarcar e apagar',
              destrutivo: true,
            });
            if (!ok) return undefined;
          }
          return definirTiqueDeEscopo(op.id, tique!.tique, false);
        }

        return (
          <td key={coluna.id} className="px-2 py-2">
            {oculta(coluna.id) ? (
              <CelulaOculta label={coluna.label} largura="curta" />
            ) : (
              <span className="flex w-full items-center justify-center">
                <input
                  type="checkbox"
                  checked={marcado}
                  disabled={!podeEditar}
                  onChange={alternar}
                  aria-label={`${coluna.label} neste projeto`}
                  data-dica={marcado ? `Com ${coluna.label.toLowerCase()}` : `Sem ${coluna.label.toLowerCase()}`}
                  data-dica-sub={
                    marcado
                      ? `A coluna ${coluna.label} está liberada na aba Produção`
                      : `Marque para preencher ${coluna.label} na aba Produção`
                  }
                  data-dica-sempre
                  className="size-4 cursor-pointer accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                />
              </span>
            )}
          </td>
        );
      }

      /*
        As quatro classificações de lista fechada que se editam pelo mesmo painel.

        `formatoConteudo` e `alcanceAudiencia` entraram em 03/08/2026, na aba Produção. Elas cabem
        aqui sem exceção nenhuma porque seguem o contrato das outras duas: id de lista, rótulo do
        catálogo, e ausência significando "não classificado".
      */
      if (chave in OPCOES_DA_COLUNA) {
        const campoLista = chave as keyof typeof OPCOES_DA_COLUNA;
        const opcoes = OPCOES_DA_COLUNA[campoLista];
        const valor = op[campoLista];
        const par = destravaDaColuna(campoLista);

        /*
          Travada porque o **Escopo disse que o projeto não tem isto**.

          Não é campo em branco esperando alguém: é campo que não se aplica. A célula diz qual é o
          caso e onde se resolve — sem isso, a pessoa clicaria, nada aconteceria, e não haveria como
          saber se é permissão, defeito ou regra. Mesmo raciocínio do selo "Congelado".
        */
        if (par && op[par.tique] !== true) {
          return (
            <td key={coluna.id} className="px-2 py-2">
              <span
                data-dica={`Sem ${par.label.toLowerCase()} neste projeto`}
                data-dica-sub={`Marque ${par.label} na aba Escopo para preencher aqui`}
                data-dica-sempre
                className="flex w-full items-center justify-center gap-1 rounded-md px-2 py-1 text-apoio text-slate-500"
              >
                <Ban className="size-3 shrink-0" />
                —
              </span>
            </td>
          );
        }

        return (
          <td key={coluna.id} className="px-2 py-2">
            {oculta(coluna.id) ? (
              <CelulaOculta label={coluna.label} largura="curta" />
            ) : (
              <OpcaoSelect
                titulo={coluna.label}
                opcoes={opcoes}
                valor={valor}
                onChange={
                  podeEditar
                    ? (v) => definirCampoOpcaoDaOportunidade(op.id, campoLista, v)
                    : undefined
                }
              />
            )}
          </td>
        );
      }

      /*
        Impacto é etiqueta colorida, como Prioridade — mas em escala fria.

        As duas convivem no quadro, e ver "Alta" vermelha ao lado de "Alto" vermelho faria as
        escalas parecerem a mesma. Prioridade é urgência; impacto é tamanho.
      */
      if (chave === 'impacto') {
        return (
          <td key={coluna.id} className="px-2 py-2">
            {oculta(coluna.id) ? (
              <CelulaOculta label={coluna.label} largura="curta" />
            ) : (
              <EtiquetaSelect
                titulo="Impacto"
                opcoes={IMPACTOS}
                valor={op.impacto}
                onChange={
                  podeEditar
                    ? (v) => definirCampoOpcaoDaOportunidade(op.id, 'impacto', v)
                    : undefined
                }
              />
            )}
          </td>
        );
      }

      if (chave === 'captacao') {
        return (
          <td key={coluna.id} className="px-2 py-2">
            {oculta(coluna.id) ? (
              <CelulaOculta label={coluna.label} largura="curta" />
            ) : (
              <OpcaoSelect
                titulo="Captação"
                opcoes={CAPTACOES}
                valor={op.captacaoComercial}
                onChange={
                  podeEditar ? (v) => definirCaptacaoDaOportunidade(op.id, v) : undefined
                }
              />
            )}
          </td>
        );
      }

      /*
        Segmento e Categoria são da **marca**, não da linha.

        A célula escreve no cadastro dela — e por isso a dica avisa o alcance: mudar aqui muda em
        todo projeto daquela marca. Sem marca definida não há onde gravar, e a célula diz isso em
        vez de aceitar um texto que se perderia.
      */
      if (chave === 'segmento' || chave === 'categoria') {
        const valor = chave === 'segmento'
          ? segmentoDaMarca(op.marca, marcas)
          : categoriaDaMarca(op.marca, marcas);

        return (
          <td key={coluna.id} className="px-2 py-2">
            {oculta(coluna.id) ? (
              <CelulaOculta label={coluna.label} largura="curta" />
            ) : !op.marca?.trim() ? (
              <span
                className="block px-2 text-center text-xs text-slate-300"
                data-dica={`${coluna.label} indefinido`}
                data-dica-sub="Escolha a marca primeiro: este dado vem do cadastro dela"
                data-dica-sempre
              >
                —
              </span>
            ) : (
              <SelecaoComCadastro
                value={valor ?? ''}
                onCommit={(novo) => definirCampoDaMarcaPorNome(op.marca, chave, novo)}
                opcoes={valoresUsados(marcas, chave).map((nome) => ({ nome }))}
                entidade={coluna.label.toLowerCase()}
                align="center"
                placeholder={coluna.placeholder}
                className="text-xs"
                dicaSub={`Do cadastro de ${op.marca} — vale para todos os projetos da marca`}
              />
            )}
          </td>
        );
      }

      /*
        Contato: a lista é da marca, a escolha é do projeto.

        Um contato novo entra no cadastro da marca **e** na linha — o mesmo desenho de Marca e
        Talento, pelo mesmo motivo: ninguém para o preenchimento para abrir outra tela.
      */
      if (chave === 'contato') {
        return (
          <td key={coluna.id} className="px-2 py-2">
            {oculta(coluna.id) ? (
              <CelulaOculta label={coluna.label} largura="curta" />
            ) : !op.marca?.trim() ? (
              <span
                className="block px-2 text-center text-xs text-slate-300"
                data-dica="Contato indefinido"
                data-dica-sub="Escolha a marca primeiro: os contatos vêm do cadastro dela"
                data-dica-sempre
              >
                —
              </span>
            ) : (
              <SelecaoComCadastro
                value={op.contatoCliente}
                onCommit={(novo) => {
                  // Cadastra antes de gravar: o contato na linha sempre existe na marca.
                  if (novo.trim()) adicionarContatoNaMarca(op.marca, novo);
                  onUpdateCampo(op.id, 'contatoCliente', novo);
                }}
                opcoes={contatosDaMarca(op.marca, marcas).map((nome) => ({ nome }))}
                entidade="contato"
                align="center"
                placeholder={coluna.placeholder}
                className="text-xs"
                dicaSub={`Contatos cadastrados de ${op.marca}`}
              />
            )}
          </td>
        );
      }

      if (chave === 'input' || chave === 'origem' || chave === 'tipoProjeto') {
        const opcoes = chave === 'input' ? INPUTS
          : chave === 'origem' ? ORIGENS_COMERCIAIS
          : TIPOS_PROJETO;
        const valor = chave === 'input' ? op.input
          : chave === 'origem' ? op.origem
          : op.tipoProjeto;

        return (
          <td key={coluna.id} className="px-2 py-2">
            {oculta(coluna.id) ? (
              <CelulaOculta label={coluna.label} largura="curta" />
            ) : (
              <OpcaoSelect
                valor={valor}
                opcoes={opcoes}
                titulo={coluna.label}
                onChange={
                  podeEditar
                    ? (novo) => definirCampoOpcaoDaOportunidade(op.id, chave, novo)
                    : undefined
                }
              />
            )}
          </td>
        );
      }

      /*
        Exclusivo é **leitura**: vem do vínculo do talento.

        O talento exclusivo é agenciado pela casa, que contrata direto. Quando não é, quem o
        representa entra no contrato como interveniente. Não é uma segunda decisão a tomar, e
        oferecê-la como campo editável permitia o estado impossível: talento de interveniência
        marcado como exclusivo na linha.

        Para mudá-la, muda-se o vínculo na ficha do talento. É lá que a informação nasce.

        > Esta célula mostrava "Interveniência", com o valor invertido, até 03/08/2026. Absorveu
        > também a coluna "Tipo de Talento", que dizia o mesmo em outras palavras.
      */
      if (chave === 'exclusivo') {
        const derivada = exclusividadeDe(op, talentos);
        const nomeDoTalento = op.talento?.trim();

        return (
          <td key={coluna.id} className="px-2 py-2">
            {oculta(coluna.id) ? (
              <CelulaOculta label={coluna.label} largura="curta" />
            ) : derivada === undefined ? (
              <span
                data-dica="Exclusividade indefinida"
                data-dica-sub={
                  nomeDoTalento
                    ? `"${nomeDoTalento}" ainda não tem ficha — a exclusividade vem do vínculo dela`
                    : 'Defina o talento: a exclusividade vem do vínculo dele com a casa'
                }
                data-dica-sempre
                className="flex w-full items-center justify-center gap-1 rounded-md px-2 py-1 text-apoio text-slate-500"
              >
                <span className="size-1.5 shrink-0 rounded-full bg-slate-200" />
                —
              </span>
            ) : (
              <span
                data-dica={derivada ? 'Sim' : 'Não'}
                data-dica-sub={
                  derivada
                    ? `${nomeDoTalento} é exclusivo da casa`
                    : `${nomeDoTalento} não é exclusivo — o contrato tem interveniência`
                }
                data-dica-sempre
                className={`flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1 text-apoio font-medium ring-1 ${
                  derivada
                    ? 'bg-indigo-50 text-indigo-700 ring-indigo-200'
                    : 'bg-white text-slate-500 ring-slate-200'
                }`}
              >
                <span className={`size-1.5 shrink-0 rounded-full ${derivada ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                {derivada ? 'Sim' : 'Não'}
              </span>
            )}
          </td>
        );
      }

      /* --- Derivadas --- */
      if (chave === 'entradaEm') {
        return (
          // `col-entrada`: dado auxiliar — um grau abaixo e sem folga lateral. Ver `index.css`.
          <td key={coluna.id} className="col-entrada px-2 py-2 text-center text-slate-500">
            {formatDate(op.entradaEm)}
          </td>
        );
      }

      /*
        **Não há mais coluna Deadline**, em nenhuma aba — 03/08/2026.

        Ela existia em cinco, e a regra que a governava está preservada onde importa: a data é o
        dado (entrada + 5 dias úteis, que não muda), e "3d restantes" é comentário sobre ela.
        Trocar um pelo outro foi um defeito real, corrigido em 02/08.

        Hoje os dois vivem na célula de **Ações**: a cor do farol na linha, a data e o estado no
        tooltip. Uma bolinha custa 12px; a coluna custava 6% da largura em toda aba — e o quadro
        chegou a treze colunas na Demanda, todas apertadas demais para o que carregavam.
      */

      // Vínculo e contratos vêm da ficha do talento — o quadro lê, não guarda.
      if (chave === 'vinculo') {
        const ficha = talentos.find((t) => t.id === op.talentoId);
        const tipo = ficha ? getTipo(ficha.tipo) : null;
        return (
          <td key={coluna.id} className="px-2 py-2">
            {tipo ? (
              <span className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1 text-apoio font-semibold ring-1 ${tipo.chip}`}>
                <span className={`size-1.5 rounded-full ${tipo.dot}`} />
                {tipo.label}
              </span>
            ) : (
              <span
                className="block text-center text-apoio text-slate-500"
                data-dica="Sem ficha em Talentos"
                data-dica-sub="A interveniência vem do vínculo do talento — sem ficha, não há como derivar"
                data-dica-sempre
              >
                sem cadastro
              </span>
            )}
          </td>
        );
      }

      if (chave === 'contratos') {
        const ficha = talentos.find((t) => t.id === op.talentoId);
        const quantos = ficha ? contratosDoTalento(ficha, contratos).length : 0;
        return (
          <td key={coluna.id} className="px-2 py-3 text-center text-xs">
            <span className={quantos > 0 ? 'text-slate-600' : 'text-slate-300'}>{quantos}</span>
          </td>
        );
      }

      /*
        O caso especial de Orçamento **saiu em 11/08/2026**.

        Ele existia porque só esta coluna distinguia responsável de apoio. Quando a distinção
        passou a valer para todas as áreas (ver `celulaResponsavel`), o bloco virou uma segunda
        implementação do mesmo desenho — e duas implementações do mesmo desenho divergem, sempre.
        A coluna agora declara `area: 'orcamento'` no catálogo e desce pelo caminho comum.
      */

      /* --- Pessoas de uma área --- */
      if (coluna.area) {
        return (
          <td key={coluna.id} className="px-2 py-2">
            {celulaResponsavel(op, coluna, podeEditar)}
          </td>
        );
      }

      /* --- Texto --- */
      return (
        <td key={coluna.id} className="px-2 py-2.5">
          {celulaTexto(op, coluna, podeEditar)}
        </td>
      );
    });
  }

  function renderLinha(op: Oportunidade, indice: number) {
    /*
      Duas condições diferentes, e a ordem importa.

      `podeEditarOportunidade` responde **quem** — permissão da pessoa. `ehCongelada` responde
      **quando** — o momento do processo. Uma pessoa com toda a permissão do mundo não edita um
      projeto que está com o cliente, e é isso que a segunda condição garante.

      O **status escapa** do congelamento: travar o fluxo junto prenderia o projeto para sempre,
      fechando inclusive o caminho de Revisão para Ajustes, que é como se corrige.
    */
    const temPermissao = podeEditarOportunidade(sessao, op);
    const congelada = ehCongelada(op.status);
    const podeEditar = temPermissao && !congelada;
    const podeExcluir = podeExcluirOportunidade(sessao, op);
    const status = getStatus(op.status);
    const conferir = precisaRevisao(op);
    /*
      `prioridade` e `entrada` saíram daqui em 03/08/2026, com o ponto colorido antes do nome.

      Eram só da dica dele. A prioridade tem coluna própria, com rótulo; a via de entrada perdeu a
      única exibição que tinha na Demanda — se voltar a importar, volta como coluna, que é onde um
      dado fica ao alcance de quem varre o quadro em vez de passar o mouse linha a linha.
    */
    const restam = diasAteEncerrar(op);
    const parado = diasParado(op);

    return (
      <motion.tr
        key={op.id}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        /*
          A zebra e o hover vivem no `index.css`, e não aqui.

          Numa grade com colunas congeladas o fundo precisa vencer o da célula fixa — que é opaco
          por obrigação, senão o que rola apareceria por baixo. Uma classe na `<tr>` perderia para
          o `background` da `<td>` fixa, e a faixa quebraria justamente na parte que não se move.

          `linha-conferir` continua aqui porque é estado do dado, não ritmo de leitura.
        */
        /*
          A zebra vem do **índice**, não do `nth-child`.

          Com `nth-child`, qualquer linha que fura o padrão — a âmbar de "a conferir", uma futura
          linha de grupo — desloca a contagem das seguintes, e a alternância vira "a cada 3 ou 4",
          como a operação viu em tela. O índice é da lista ordenada: alterna 1 a 1, sempre.

          Prioridade dos fundos: selecionada > a conferir > zebra. Quem marca o checkbox precisa
          reencontrar a linha no meio de quarenta — o realce de seleção vence os outros dois.
        */
        className={`border-b border-slate-100 transition-colors ${
          selecionados.has(op.id) ? 'linha-selecionada' : conferir ? 'linha-conferir' : indice % 2 === 1 ? 'linha-par' : ''
        }`}
      >
        {/*
          A **barra de prazo** é a borda esquerda desta célula — e da linha, na leitura.

          Duas tentativas anteriores falharam pelo mesmo motivo: um ponto colorido e depois um
          relógio em círculo, ambos **dentro** do fluxo horizontal, disputando espaço e atenção com
          a etiqueta de status, a de prioridade e os ícones de ação.

          A barra sai do fluxo. Não empurra nada, não pede largura, e o olho a lê como "estado desta
          linha" sem legenda. A célula inteira dispara o tooltip com a data — uma faixa de 3px seria
          alvo pequeno demais para o mouse.

          `border-l-transparent` nas já triadas, e não borda nenhuma: sem a borda o conteúdo
          deslocaria 3px, e toda linha resolvida ficaria desalinhada das demais.
        */}
        {/*
          As células congeladas, na ordem: seleção · Status · Projeto · Entrada · Talento.

          `bg-white` é obrigatório em todas: sem fundo opaco, as colunas que rolam apareceriam por
          baixo. O hover da linha as pinta junto — daí o `group-hover` no fundo.
        */}
        <td
          data-dica={op.prazoEm ? formatDate(op.prazoEm) : 'Sem prazo'}
          data-dica-sub={`Deadline de triagem · ${slaDaOportunidade(op).label}`}
          data-dica-sempre
          style={{
            left: 0,
            width: L_CHECKBOX,
            /*
              `inset` em vez de `border-left`: com `border-collapse: collapse` a borda não
              acompanha a célula congelada, e a barra sumia ao rolar. 5px é fina o bastante para
              não virar bloco e grossa o bastante para se ler de longe.
            */
            boxShadow: `inset 5px 0 0 0 ${SLA_TONE_STYLE[slaDaOportunidade(op).tone].faixa}`,
          }}
          className={`${fixaClasse()} px-3 py-2`}
        >
          <input
            type="checkbox"
            aria-label={`Selecionar ${op.titulo}`}
            checked={selecionados.has(op.id)}
            onChange={() => toggleSelecao(op.id)}
            className="size-3.5 cursor-pointer accent-emerald-500"
          />
        </td>

        {congeladas.slice(1).map((fixa) => (fixa.acoes ? (
          celulaAcoes(op, temPermissao, podeExcluir, fixa)
        ) : fixa.nome ? (
        <td key="nome" style={{ left: fixa.left, width: fixa.largura }} className={`${fixaClasse(fixa.ultima)} col-projeto px-2 py-2`}>
          {/*
            **Sem o ponto de prioridade**, desde 03/08/2026.

            Ele ficava aqui, antes do nome, repetindo em cor o que a coluna Prioridade já diz por
            extenso. Deixou de ser redundância inofensiva quando o farol do SLA entrou na célula de
            Ações: duas bolinhas coloridas na mesma linha, em escalas parecidas (vermelho, âmbar),
            e nada na tela dizendo qual é qual.

            Entre as duas, a que fica é a que **não tem coluna**. A prioridade tem a sua, com
            rótulo; o prazo perdeu a dele e só existe como farol.
          */}
          <div className="flex items-start gap-2">
            <span className="min-w-0 flex-1">
              {podeEditar ? (
                <EditableCell
                  value={op.titulo}
                  onCommit={(valor) => valor.trim() && onUpdateCampo(op.id, 'titulo', valor.trim())}
                  align="left"
                  /*
                    A linha recém-criada já nasce com o cursor no nome, e o texto provisório
                    selecionado — digitar substitui. Sem isto, criar exigiria um segundo clique
                    para começar a preencher, que é justamente o gesto que o botão eliminou.
                  */
                  editing={op.id === recemCriada}
                  onEditingEnd={() => setRecemCriada(null)}
                  /*
                    O nome quebra em duas linhas: é o que identifica a linha, e cortá-lo obrigaria
                    a passar o mouse em cada uma para saber do que se trata.
                  */
                  linhas={2}
                  className="text-sm font-semibold leading-snug text-slate-800"
                />
              ) : (
                <span
                  data-dica={op.titulo}
                  className="block line-clamp-2 px-2 py-1 text-sm font-semibold leading-snug text-slate-800"
                >
                  {op.titulo}
                </span>
              )}
              {/* `legenda-linha`: um degrau abaixo do nome — é legenda dele, não um segundo dado. */}
              <span className="legenda-linha block truncate px-2 text-slate-400">
                {op.marca || 'sem marca'}
                {op.talento ? ` · ${op.talento}` : ''}
                {getInput(op.input) ? ` · ${getInput(op.input)!.label}` : ''}
              </span>

              {/*
                Aviso de abandono: o projeto está parado há tempo suficiente para o encerramento
                automático se aproximar. Aparece só na reta final — antes disso seria ruído.
              */}
              {restam !== null && restam <= 8 && (
                <span
                  data-dica={`Parada há ${parado} dias em ${status.label}`}
                  data-dica-sub={`Aos ${DIAS_ATE_ENCERRAR} dias o sistema encerra automaticamente`}
                  data-dica-sempre
                  className={`ml-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-selo font-bold uppercase tracking-wide ring-1 ${
                    restam <= 3
                      ? 'bg-red-50 text-red-700 ring-red-200'
                      : 'bg-amber-50 text-amber-700 ring-amber-200'
                  }`}
                >
                  <Hourglass className="size-2.5" />
                  {restam <= 0 ? 'encerrando' : `${restam}d para encerrar`}
                </span>
              )}

              {/*
                Congelada: o selo explica por que os campos não respondem ao clique.

                Sem ele, a linha pareceria quebrada — a pessoa clicaria numa célula, nada
                aconteceria, e não haveria como saber se é permissão, defeito ou regra.
              */}
              {congelada && (
                <span
                  data-dica="Dados congelados"
                  data-dica-sub="Em Revisão e Aguardando Feedback há uma versão circulando fora do quadro. Para corrigir, mova para Ajustes."
                  data-dica-sempre
                  className="ml-2 inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-selo font-bold uppercase tracking-wide text-indigo-600 ring-1 ring-indigo-200"
                >
                  <Lock className="size-2.5" />
                  Congelado
                </span>
              )}

              {/*
                Rastro da duplicação — **só o ícone**, sem palavra.

                A primeira versão dizia "Duplicada", e a palavra soava como erro: registro repetido
                por engano, duplicidade que alguém deveria limpar. A linha existe de propósito.

                As alternativas com metáfora familiar — "filha", "subprojeto" — foram descartadas
                por prometerem o que o modelo não entrega: quem lê "filha" espera que mexer no pai
                a afete, e aqui as linhas são independentes. **Nome que promete vínculo inexistente
                estranha mais que nome nenhum.**

                Sem palavra, a linha não ganha ruído e quem quiser saber passa o mouse.
              */}
              {op.duplicadaDe && (
                <span
                  className="ml-1.5 inline-flex shrink-0 items-center text-slate-300"
                  data-dica={
                    origemDaDuplicacao(op)
                      ? `Criada a partir de "${origemDaDuplicacao(op)!.titulo}"`
                      : 'Criada a partir de outro projeto'
                  }
                  data-dica-sub={
                    origemDaDuplicacao(op)
                      ? 'São projetos independentes — mudar um não mexe no outro'
                      : 'A linha de origem não existe mais'
                  }
                  data-dica-sempre
                >
                  <CopyPlus className="size-3" />
                </span>
              )}

              {op.encerradaAutomaticamente && (
                <span
                  data-dica="Encerrada pelo sistema"
                  data-dica-sub={`Ficou ${DIAS_ATE_ENCERRAR} dias sem movimento`}
                  data-dica-sempre
                  className="ml-2 inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-selo font-bold uppercase tracking-wide text-slate-500"
                >
                  <Hourglass className="size-2.5" />
                  Encerrada por inatividade
                </span>
              )}
            </span>
          </div>
        </td>
        ) : (
          /*
            A célula da âncora é a mesma que a grade sempre desenhou — só ganha o congelamento.

            `cloneElement` em vez de um segundo caminho de render: a coluna Status tem etiqueta com
            máquina de estados, Talento tem o painel de cadastro. Duplicar isso para "a versão
            congelada" faria as duas divergirem no primeiro ajuste.
          */
          cloneElement(
            renderCelulas(op, podeEditar, temPermissao, [fixa.coluna!])[0] as ReactElement<{
              className?: string; style?: CSSProperties;
            }>,
            {
              key: fixa.key,
              style: { left: fixa.left, width: fixa.largura },
              className: `${fixaClasse(fixa.ultima)} px-2 py-2`,
            },
          )
        )))}

        {renderCelulas(op, podeEditar, temPermissao, colunasRolantes)}
      </motion.tr>
    );
  }

  /** A célula de Ações — congelada no início da linha desde 03/08/2026. */
  function celulaAcoes(
    op: Oportunidade,
    temPermissao: boolean,
    podeExcluir: boolean,
    fixa: { left: number; largura: number },
  ) {
    return (
        <td
          key="acoes"
          style={{ left: fixa.left, width: fixa.largura }}
          className={`${fixaClasse()} px-2 py-2`}
        >
          <div className="flex items-center justify-center">
            {podeCriar && temPermissao && (
              /*
                Duplicar fica **antes** de excluir e sem cor de alerta: é gesto de rotina, e a
                vizinhança com a lixeira já pede que os dois não se pareçam.
              */
              <motion.button
                type="button"
                onClick={() => duplicar(op)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label={`Duplicar ${op.titulo}`}
                data-dica="Duplicar para outro talento"
                data-dica-sub="Copia o projeto e abre esperando o novo nome — valores e contrato não vêm junto"
                data-dica-sempre
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
              >
                <CopyPlus className="size-4" />
              </motion.button>
            )}

            {podeExcluir ? (
              <motion.button
                type="button"
                onClick={() => excluir([op.id], `a oportunidade "${op.titulo}"`)}
                whileHover={{ scale: 1.15, x: [0, -1.5, 1.5, 0] }}
                whileTap={{ scale: 0.9 }}
                aria-label={`Excluir ${op.titulo}`}
                data-dica="Excluir" data-dica-sempre
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="size-4" />
              </motion.button>
            ) : (
              <span
                className="p-1.5 text-slate-200"
                data-dica="Sem permissão"
                data-dica-sub="Você não responde por esta oportunidade"
                data-dica-sempre
              >
                <Lock className="size-4" />
              </span>
            )}
          </div>
        </td>
    );
  }

  return (
    /*
      `grade-fluida`: o texto da tabela escala com a **altura** da janela (ver `index.css`).

      É o menor dos quatro ganhos de altura desta rodada — vale ~2px por linha —, e entra por ser
      o único que não tira nada da tela. Os outros três: o fluxo recolhível (216px), as linhas mais
      densas (96px) e o cabeçalho compacto (50px).
    */
    <div className="grade-fluida flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/*
        Abas temáticas.

        ## A faixa encolheu em 11/08/2026

        Pedido da operação: *"poderia ser menor, mais elegante"*. Entre a borda do card e a primeira
        linha havia **três faixas empilhadas** — abas, barra de ações e cabeçalho —, somando ~135px
        de altura antes de qualquer dado aparecer. Numa janela de notebook isso é o equivalente a
        quatro linhas do quadro gastas em cromo.

        O corte veio do **espaçamento**, não do corpo do texto: `py-2.5` → `py-1.5` na faixa,
        `py-1.5` → `py-1` nas abas, ícones de 14px para 12px. A régua de legibilidade que o gestor
        pediu continua de pé — o que saiu foi ar, não letra.
      */}
      <div role="navigation" aria-label="Seções do quadro" className="flex shrink-0 flex-wrap items-center gap-0.5 bg-plano px-2.5 py-1.5">
        {abas.map((item) => {
          const Icon = ICONES[item.id] ?? Layers;
          const ativa = aba === item.id;
          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => irParaSecao(item.id)}
              whileTap={{ scale: 0.96 }}
              data-dica={item.restrita ? 'Acesso restrito' : undefined}
              data-dica-sub={item.restrita ? item.motivo : undefined}
              data-dica-sempre={item.restrita ? '' : undefined}
              className={`relative flex items-center gap-1.5 rounded-md px-2.5 py-1 text-rotulo font-semibold transition-colors ${
                ativa ? 'text-white' : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              {/*
                O fundo da aba ativa é um elemento **compartilhado** (`layoutId`): quando o scroll
                troca a seção, ele desliza de uma aba à outra em vez de piscar — a faixa passa a
                mostrar a navegação, não só o estado. Pedido da operação em 04/08/2026.
              */}
              {ativa && (
                <motion.span
                  layoutId="backlog-aba-ativa"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  className="absolute inset-0 rounded-md bg-indigo-600"
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon className="size-3" />
                {item.label}
              </span>
              {/*
                A aba restrita **não** leva cadeado.

                Quem não tem acesso não a vê; para quem tem, o cadeado marcava toda visita a
                Financeiro, Pagamento e Jurídico como se fosse exceção — três das doze abas, o
                tempo todo. A restrição continua: aparece na dica, na configuração por equipe e no
                borrão da célula, que é onde ela de fato importa.
              */}
            </motion.button>
          );
        })}
      </div>

      {/* Barra de ações */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <BuscaQuadro
            valor={busca}
            onChange={onBuscaChange}
            placeholder="Buscar no quadro…"
            encontrados={oportunidades.length}
            total={total}
          />

          <motion.button
            type="button"
            onClick={() =>
              excluir(
                selecao,
                selecao.length === 1
                  ? 'a oportunidade selecionada'
                  : `as ${selecao.length} oportunidades selecionadas`,
              )
            }
            disabled={!temSelecao}
            whileHover={temSelecao ? { x: [0, -1.5, 1.5, 0] } : undefined}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-rotulo font-medium text-slate-600 transition-colors enabled:hover:bg-rose-50 enabled:hover:text-rose-600 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            <Trash2 className="size-3" />
            Excluir em Lote{temSelecao ? ` (${selecao.length})` : ''}
          </motion.button>
        </div>

        <div className="flex items-center gap-2">
          {/*
            Exporta **o que está na tela**: as linhas do recorte atual (etapa, busca, permissão) e
            as colunas visíveis. Mais que isso seria a planilha virando o caminho para ler coluna
            oculta — a exportação obedece à mesma regra da busca.
          */}
          <motion.button
            type="button"
            onClick={exportarParaExcel}
            disabled={oportunidades.length === 0}
            whileHover={oportunidades.length > 0 ? { y: -1 } : undefined}
            whileTap={{ scale: 0.97 }}
            data-dica="Exportar para Excel"
            data-dica-sub="Baixa as linhas e colunas visíveis em arquivo Excel (.xlsx)"
            data-dica-sempre
            className={`${FORMA_BOTAO_BARRA} border-slate-200 text-slate-600 enabled:hover:bg-emerald-50 enabled:hover:text-emerald-700 disabled:cursor-not-allowed disabled:text-slate-300`}
          >
            <FileSpreadsheet className="size-3" />
            Exportar
          </motion.button>

          <motion.button
            type="button"
            onClick={toggleTodas}
            disabled={oportunidades.length === 0}
            whileHover={oportunidades.length > 0 ? { y: -1 } : undefined}
            whileTap={{ scale: 0.97 }}
            className={`${FORMA_BOTAO_BARRA} border-slate-200 text-slate-600 enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300`}
          >
            <CheckSquare className="size-3" />
            {selecao.length === oportunidades.length && oportunidades.length > 0
              ? `Desmarcar Todas (${oportunidades.length})`
              : `Marcar Visíveis (${oportunidades.length})`}
          </motion.button>

          {/*
            A criação é uma ação, não uma linha permanente.

            A linha verde fixa no topo ocupava espaço o tempo todo para um gesto ocasional — e num
            quadro vazio competia com a mensagem que explica que não há nada ali. Agora ela aparece
            quando alguém pede.
          */}
          {podeCriar && (
            <motion.button
              type="button"
              onClick={novoRegistro}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              aria-label="Novo projeto"
              data-dica="Novo projeto"
              data-dica-sub="Insere uma linha no topo, com o nome pronto para digitar"
              data-dica-sempre
              className={`${FORMA_BOTAO_BARRA} border-emerald-600 bg-emerald-600 font-semibold text-white hover:border-emerald-700 hover:bg-emerald-700`}
            >
              <Plus className="size-3" />
              Novo projeto
            </motion.button>
          )}
        </div>
      </div>

      {/*
        Aba ainda sem colunas.

        Renderizar a tabela com zero colunas daria uma grade de checkbox, nome e Ações — que parece
        defeito, não trabalho por fazer. Dizer que a aba está por definir é mais honesto e evita
        que alguém a tome por quebrada.
      */}
      {colunasRolantes.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <Layers className="size-7 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            Nenhuma aba do Backlog está liberada para você.
          </p>
          <p className="max-w-sm text-xs text-slate-400">
            As abas de dado sensível — Jurídico e Financeiro — dependem de liberação à sua equipe.
          </p>
        </div>
      ) : (
      <div ref={areaRolagem} className="min-h-0 flex-1 overflow-auto custom-scrollbar">
        {/*
          `table-fixed` com largura em **px** — não confundir com o `table-fixed` de porcentagem
          que já foi abandonado (colunas somando 82% esticavam "3x" a 350px em aba curta).

          O layout precisa ser fixo porque o congelamento depende dele: cada célula sticky recebe
          um `left` somado das larguras *declaradas*, e no layout automático o navegador alargava
          qualquer coluna cujo conteúdo mínimo não coubesse — a soma divergia da realidade e as
          âncoras se sobrepunham ao rolar. Fixo, o `<colgroup>` é lei; quem dita quanto cada dado
          precisa continua sendo `larguraDaColuna`, medida com o seed realista.
        */}
        <table
          className="border-collapse"
          style={{ tableLayout: 'fixed', width: larguraTotal, minWidth: '100%' }}
        >
          <colgroup>
            {congeladas.map((fixa) => <col key={fixa.key} style={{ width: fixa.largura }} />)}
            {colunasRolantes.map((coluna) => (
              <col key={coluna.id} style={{ width: largura(coluna) }} />
            ))}
          </colgroup>

          <thead>
            <tr>
              <th
                style={{ left: 0, width: L_CHECKBOX }}
                className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50 px-2 py-2"
              >
                <input
                  type="checkbox"
                  aria-label="Selecionar todas as oportunidades visíveis"
                  checked={oportunidades.length > 0 && selecao.length === oportunidades.length}
                  onChange={toggleTodas}
                  disabled={oportunidades.length === 0}
                  className="size-3.5 cursor-pointer accent-emerald-500"
                />
              </th>

              {congeladas.slice(1).map((fixa) => (fixa.acoes ? (
                <th
                  key="acoes"
                  style={{ left: fixa.left, width: fixa.largura }}
                  className={`sticky top-0 z-30 border-b border-slate-200 bg-slate-50 px-2 py-2 ${
                    fixa.ultima ? 'col-fixa-ultima' : ''
                  }`}
                >
                  <span className="flex w-full justify-center text-rotulo font-bold uppercase tracking-wide text-slate-500">
                    Ações
                  </span>
                </th>
              ) : fixa.nome ? (
                <th
                  key="nome"
                  style={{ left: fixa.left, width: fixa.largura }}
                  className={`sticky top-0 z-30 border-b border-slate-200 bg-slate-50 px-2 py-2 ${
                    fixa.ultima ? 'col-fixa-ultima' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort('titulo')}
                    className={`flex w-full items-center justify-center gap-1 text-rotulo font-bold uppercase tracking-wide transition hover:text-slate-700 ${
                      sort?.field === 'titulo' ? 'text-slate-700' : 'text-slate-500'
                    }`}
                  >
                    <span className="line-clamp-2 leading-tight">Projeto</span>
                    {sort?.field === 'titulo' ? (
                      sort.direction === 'asc' ? <ArrowUp className="size-3 shrink-0 opacity-70" /> : <ArrowDown className="size-3 shrink-0 opacity-70" />
                    ) : (
                      <ChevronsUpDown className="size-3 shrink-0 opacity-70" />
                    )}
                  </button>
                </th>
              ) : (
                <th
                  key={fixa.key}
                  style={{ left: fixa.left, width: fixa.largura }}
                  className={`sticky top-0 z-30 border-b border-slate-200 bg-slate-50 px-2 py-2 ${
                    fixa.ultima ? 'col-fixa-ultima' : ''
                  }`}
                  data-dica={fixa.coluna!.label}
                  data-dica-sub={fixa.coluna!.hint}
                  data-dica-sempre
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(fixa.coluna!.field!)}
                    className={`flex w-full items-center justify-center gap-1 text-rotulo font-bold uppercase tracking-wide transition hover:text-slate-700 ${
                      sort?.field === fixa.coluna!.field ? 'text-slate-700' : 'text-slate-500'
                    }`}
                  >
                    <span className="line-clamp-2 leading-tight">{fixa.coluna!.label}</span>
                    <ChevronsUpDown className="size-3 shrink-0 opacity-70" />
                  </button>
                </th>
              )))}

              {
                colunasRolantes.map((coluna) => {
                  const ordenavel = coluna.field && !oculta(coluna.id);
                  const ativa = ordenavel && sort?.field === coluna.field;
                  const SortIcon = !ativa ? ChevronsUpDown : sort!.direction === 'asc' ? ArrowUp : ArrowDown;
                  /*
                    A primeira coluna de cada seção marca a divisa — visual (`data-secao` desenha
                    o fio) e para os testes, que leem as seções por este atributo.

                    O scroll **não** mede daqui: clique e observer usam `inicioDaSecaoPx`, somado
                    do catálogo — com `table-layout: fixed` a largura declarada é a real, e a
                    soma emparelha exato. A medição por `offsetLeft` foi a causa do clique que
                    parava perto, mas não alinhado (04/08/2026).
                  */
                  const secao = secoes.find((s) => s.colunas[0]?.id === coluna.id);
/*
                    O **cabeçalho** é sempre centralizado, mesmo nas colunas de conteúdo à esquerda.

                    Ele é um rótulo curto sobre uma coluna estreita: alinhado à esquerda, fica
                    solto do conteúdo que nomeia, e a faixa de títulos perde o ritmo. O alinhamento
                    do `coluna.align` continua valendo para as **células**, onde texto longo lido
                    da esquerda é mais fácil de varrer.
                  */
                  const alignClass = 'justify-center';

                  return (
                    <th
                      key={coluna.id}
                      data-secao={secao?.visaoId}
                      className={`sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-2 py-2 ${
                        // A divisa entre seções: mostra onde um assunto termina e o outro começa.
                        secao ? 'border-l border-l-slate-200' : ''
                      }`}
                      data-dica={oculta(coluna.id) ? `${coluna.label} — sem acesso` : coluna.label}
                      data-dica-sub={oculta(coluna.id) ? undefined : coluna.hint}
                      /*
                        Sempre: a explicação da coluna não está na tela, então o balão não repete
                        nada. É o único lugar onde a pessoa descobre o que a coluna significa.
                      */
                      {...(coluna.hint || oculta(coluna.id) ? { 'data-dica-sempre': '' } : {})}
                    >
                      {ordenavel ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(coluna.field!)}
                          className={`flex w-full items-center gap-1 text-rotulo font-bold uppercase tracking-wide transition hover:text-slate-700 ${alignClass} ${
                            ativa ? 'text-slate-700' : 'text-slate-500'
                          }`}
                        >
                          <span className="line-clamp-2 leading-tight">{coluna.label}</span>
                          <SortIcon className="size-3 shrink-0 opacity-70" />
                        </button>
                      ) : (
                        <span
                          className={`flex w-full items-center gap-1 text-rotulo font-bold uppercase tracking-wide ${alignClass} ${
                            oculta(coluna.id) ? 'text-slate-500' : 'text-slate-500'
                          }`}
                        >
                          {oculta(coluna.id) && <EyeOff className="size-3 shrink-0" />}
                          <span className="line-clamp-2 leading-tight">{coluna.label}</span>
                        </span>
                      )}
                    </th>
                  );
                })
              }
            </tr>
          </thead>

          <tbody>
            {ordenadas.map(renderLinha)}

            {oportunidades.length === 0 && (
              <tr>
                <td colSpan={totalColunas} className="px-3 py-10 text-center text-sm text-slate-400">
                  {busca.trim()
                    ? `Nenhuma oportunidade encontrada para "${busca.trim()}".`
                    : podeCriar
                        ? 'Nenhuma oportunidade ainda — use o botao Novo projeto para cadastrar a primeira.'
                        : 'Nenhuma oportunidade visível para você.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {oportunidades.length > 0 && <RodapeTotais oportunidades={oportunidades} />}

      {temSelecao && (
        <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
          {selecao.length} {selecao.length === 1 ? 'oportunidade selecionada' : 'oportunidades selecionadas'}
        </div>
      )}
    </div>
  );
}
