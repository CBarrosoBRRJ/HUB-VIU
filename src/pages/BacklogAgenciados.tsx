import { useMemo, useState } from 'react';
import { Inbox, Timer, Workflow } from 'lucide-react';
import { Header } from '../components/Header';
import { useDados } from '../context/DadosProvider';
import { BacklogTable } from '../components/backlog/BacklogTable';
import { FluxoDoProcesso } from '../components/backlog/FluxoDoProcesso';
import { ALTURA_CONFORTAVEL } from '../components/ui/useJanelaCurta';
import { ehDono, nomeadosDoBacklog, registrosVisiveis } from '../utils/permissoes';
import {
  TITULO_PROVISORIO,
  emAndamento, finalizadaRecentemente, getAlcanceAudiencia, getCaptacaoProducao,
  getFormatoConteudo, getImpacto, getInput,
  getOrigemComercial, getStatus, getTipoEdicao, getTipoOutput, getTipoProjeto, rotuloDoStatus,
} from '../utils/oportunidades';
import { categoriaDaMarca, segmentoDaMarca } from '../utils/marcas';
import { fichaDoTalento, getOrigemTalento } from '../utils/talentos';
import { StatusOportunidade } from '../types';
import { colunasOcultasNaVisao, podeVerVisao, visoesDoQuadro } from '../utils/visoes';
import { COLUNAS_BACKLOG, colunasDaVisao } from '../utils/colunas';
import { normalizar } from '../utils/referencias';
import { carregar, salvar } from '../utils/persistencia';

/**
 * Rótulo de uma linha ainda sem nome.
 *
 * A criação insere direto na lista, e o nome é a chave do registro — não pode nascer vazio. A
 * célula abre em edição com o texto selecionado, então digitar substitui; quem sair sem preencher
 * vê "Sem título" na lista, o que é honesto: a linha existe e falta nomear.
 */
export { TITULO_PROVISORIO };

// O limiar mora em `useJanelaCurta` — um número para as duas respostas à pergunta "cabe?".

/**
 * Backlog de Agenciados — as oportunidades antes de virarem contrato.
 *
 * É a porta de entrada da operação: recebe demanda por três caminhos (manual, agente de e-mail e
 * Salesforce) e mede o SLA de triagem de 5 dias úteis.
 */
export function BacklogAgenciados() {
  const {
    sessao, oportunidades, usuarios, equipes, marcas, talentos,
    criarOportunidade, atualizarOportunidade, excluirOportunidade,
  } = useDados();

  const [busca, setBusca] = useState('');
  /**
   * Aba aberta na grade.
   *
   * Mora aqui, e não na tabela, porque a **busca depende dela**: o que se procura são as colunas
   * que estão na tela. A tabela recebe o par valor/`onChange`, como já recebe o da busca.
   */
  const [abaAtiva, setAbaAtiva] = useState('backlog:demanda');
  /** Etapa em foco no mapa do processo — o cabeçalho é também a navegação. */
  const [etapa, setEtapa] = useState<StatusOportunidade | null>(null);
  /**
   * Bloco do fluxo recolhido — **preferência de trabalho, e por isso persistida**.
   *
   * Ele custa 216px: numa tela de 950px é a diferença entre ver 5 e ver 9 linhas. Quem passa o dia
   * na lista o mantém fechado, e reabri-lo a cada F5 seria pedir o mesmo clique para sempre.
   *
   * Aberto por padrão: o mapa do processo é a primeira leitura de quem chega ao quadro, e escondê-lo
   * de quem nunca o viu esconderia também que a etapa é clicável.
   */
  /*
    ==============================================================================================
    ## O mapa nasce recolhido quando não sobra altura para a lista — 14/08/2026
    ==============================================================================================

    Reclamação de um usuário, com print: *"como não tem resolução suficiente, não consigo nem ver o
    que tem nas linhas"* — e, na tela menor, *"nem a primeira linha dá para ver"*. Reproduzido em
    1366×657: **zero linhas inteiras**.

    A conta explica sozinha. Acima da grade há cabeçalho (~120px no modo denso), mapa do processo
    (~275px), barra de abas, barra de ações, cabeçalho de colunas e rodapé — perto de **585px de
    moldura**. Numa janela de 657px sobram 72px, e uma linha tem ~52px.

    **A página foi desenhada supondo que altura é de graça, e não é.** Quem cede primeiro é o mapa:
    ele é um resumo do que a lista já contém, existe o botão "Recolher" desde sempre, e recolhido
    ele custa ~50px em vez de 275.

    O corte em 820px vem da própria conta: 585 de moldura + quatro linhas (~208px) ≈ 793. Abaixo
    disso, o mapa aberto deixaria menos de quatro linhas — pouco demais para uma lista de trabalho.

    **É só o padrão inicial.** A escolha da pessoa é salva e passa a mandar a partir do primeiro
    clique: o layout responde ao tamanho da tela até alguém dizer o que prefere.
  */
  /*
    ============================================================================================
    ## Só a ESCOLHA é persistida — o default não — 14/08/2026
    ============================================================================================

    A correção da véspera ("o mapa nasce recolhido em tela curta") não valia para ninguém que já
    tivesse aberto o app — e a operação voltou com o mesmo print: mapa aberto, zero linhas.

    O furo: um `useEffect(() => salvar(...), [fluxoRecolhido])` persiste **a cada mudança de
    estado, inclusive a montagem**. Na primeira visita de cada pessoa, o default da época foi
    gravado como se fosse escolha dela — e a partir daí o "padrão inicial" novo nunca mais rodava,
    porque havia sempre um valor salvo mandando.

    > **A regra que fica:** persistir preferência dentro de `useEffect` observando o estado
    > transforma qualquer default em escolha no primeiro render. Preferência se grava **no
    > gesto** — é o clique que diz "isto é o que eu quero", não a montagem.

    A chave antiga (`backlogFluxoRecolhido`) está contaminada por defaults gravados e **deixou de
    ser lida** — impossível distinguir, nela, escolha de montagem. A nova (`backlogFluxoEscolha`)
    só recebe escrita no clique do Recolher/Mostrar.
  */
  const [fluxoRecolhido, setFluxoRecolhido] = useState(() => {
    const escolha = carregar<boolean | null>('backlogFluxoEscolha', null);
    return escolha ?? window.innerHeight < ALTURA_CONFORTAVEL;
  });

  /** O gesto é o único lugar que grava: a partir daqui, a preferência da pessoa manda. */
  function alternarFluxo(recolhido: boolean) {
    setFluxoRecolhido(recolhido);
    salvar('backlogFluxoEscolha', recolhido);
  }

  // Membro vê só as linhas em que foi nomeado; responsável da equipe, o quadro todo.
  const permitidas = useMemo(
    () => registrosVisiveis(sessao, 'backlog', oportunidades, nomeadosDoBacklog),
    [sessao, oportunidades],
  );

  const visoesVisiveis = useMemo(() => {
    const contexto = { usuario: sessao.usuario, equipes };
    return visoesDoQuadro('backlog')
      .filter((visao) => podeVerVisao(contexto, visao.id, ehDono(sessao.usuario)))
      .map((visao) => visao.id);
  }, [sessao.usuario, equipes]);

  const colunasOcultas = useMemo(() => {
    const contexto = { usuario: sessao.usuario, equipes };
    const todas = Object.values(COLUNAS_BACKLOG).flat();
    return colunasOcultasNaVisao(contexto, todas, ehDono(sessao.usuario));
  }, [sessao.usuario, equipes]);

  /**
   * Etapa primeiro, filtro depois, busca por último.
   *
   * A etapa é o recorte mais grosso — clicar em "Em Elaboração" no mapa é dizer "quero olhar só
   * esta parte do processo". Os filtros e a busca operam dentro dela.
   */
  const daEtapa = useMemo(() => {
    // Sem etapa em foco, a lista mostra **só o que está em andamento**. Os finalizados vivem no
    // bloco Finalização e entram na lista quando alguém clica num deles.
    if (!etapa) return emAndamento(permitidas);

    const doStatus = permitidas.filter((op) => op.status === etapa);
    // Num desfecho, a lista respeita a mesma janela de 30 dias do card que a abriu — senão o
    // número do cabeçalho e o tamanho da lista discordariam.
    return getStatus(etapa).encerra ? doStatus.filter((op) => finalizadaRecentemente(op)) : doStatus;
  }, [permitidas, etapa]);

  /*
    A etapa do mapa é o único recorte, além da busca.

    Havia uma segunda régua de filtros na barra de ações — com um "Todas" que desfazia o recorte
    escolhido acima e contadores medindo outro conjunto. Duas maneiras de dizer a mesma coisa, e um
    número para cada.
  */
  const doFiltro = daEtapa;

  /**
   * Busca: **as três âncoras, sempre, mais as colunas da aba aberta.**
   *
   * ## Por que este recorte
   *
   * Até 03/08/2026 ela varria as colunas de **todas** as abas liberadas. Era poderoso e
   * imprevisível: na aba Escopo, digitar um termo trazia uma linha por causa de um valor do
   * Financeiro que não estava na tela. A pessoa via um resultado que a tela não explicava.
   *
   * O outro extremo — buscar só o que a aba mostra — quebra o gesto mais comum de todos: procurar
   * pelo talento estando numa aba que não tem a coluna Talento devolveria nada.
   *
   * Daí as duas partes:
   *
   * | Parte | O que cobre | Por quê |
   * |-------|-------------|---------|
   * | **Âncoras** | Projeto, Marca, Talento | Identificam a linha. Funcionam em qualquer aba, sempre |
   * | **Aba aberta** | Todas as colunas dela | O que está na tela é o que a busca enxerga |
   *
   * ## O que continua valendo
   *
   * A regra de permissão não mudou: coluna oculta não entra, aba restrita que a pessoa não vê não
   * entra. Uma busca que varre campo oculto vira oráculo — digita-se um número e a lista responde
   * de quem é, sem nunca exibir o dado.
   *
   * As âncoras não são exceção a isso: Projeto nunca se oculta (é a chave da linha), e Marca e
   * Talento passam pela checagem de coluna oculta como qualquer outra.
   */
  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return doFiltro;

    /*
      **Todas as colunas liberadas** — a grade virou uma tabela só.

      Entre a manhã e a tarde de 03/08/2026 a busca cobriu só a aba aberta, e o argumento era bom:
      trazer uma linha por um valor que não está na tela devolve um resultado que a tela não
      explica. A grade contínua desfez a premissa — não há mais "outra aba", há a mesma tabela um
      scroll adiante, e o valor que casou está lá.

      O que **não** mudou é a regra de permissão: coluna oculta não entra, aba restrita que a
      pessoa não vê não entra. Uma busca que varre campo oculto vira oráculo — digita-se um número
      e a lista responde de quem é, sem nunca exibir o dado.
    */
    const visiveisIds = new Set(
      visoesVisiveis
        .flatMap((visao) => colunasDaVisao(visao))
        .map((coluna) => coluna.id)
        .filter((id) => !colunasOcultas.includes(id)),
    );

    /*
      A busca casa por **campo**, não por id de coluna.

      Sete colunas são espelhadas entre abas — Status, Marca e Talento aparecem em quase todas. Se
      a checagem fosse pelo id da aba de origem, procurar por status na aba Cliente falharia, com a
      coluna Status ali na tela. O sufixo do id (`backlog:escopo:status` -> `status`) é o mesmo em
      toda cópia, que é exatamente o que "espelhar é a mesma coluna" quer dizer.
    */
    const camposVisiveis = new Set([...visiveisIds].map((id) => id.split(':')[2]));

    const porId = new Map(usuarios.map((usuario) => [usuario.id, usuario]));

    return doFiltro.filter((op) => {
      // O Projeto é a âncora que não depende de nada: é a chave da linha e nunca se oculta.
      const campos: string[] = [op.titulo];

      /*
        Cada campo só entra na busca se a coluna que o exibe estiver na tela. Sem isso, procurar
        por um valor do Financeiro acharia a linha para quem não pode ver aquela aba.
      */
      const seVisivel = (campo: string, ...valores: (string | undefined)[]) => {
        if (camposVisiveis.has(campo)) campos.push(...valores.filter(Boolean).map(String));
      };

      // O motivo do declínio entra pelo rótulo: buscar "mercado" acha os declinados por mercado.
      seVisivel('status', rotuloDoStatus(op.status, op.motivoDeclinio));
      seVisivel('marca', op.marca);
      seVisivel('talento', op.talento);
      // Classificação ausente simplesmente não entra na busca — não há rótulo para procurar.
      seVisivel('tipoProjeto', getTipoProjeto(op.tipoProjeto)?.label);
      seVisivel('input', getInput(op.input)?.label);
      seVisivel('origem', getOrigemComercial(op.origem)?.label);

      // Escopo — o pedido em texto. É o campo mais buscável da aba: nele cabe o que o cliente quis.
      seVisivel('escopo', op.escopo);

      /*
        Cliente — segmento e categoria vêm do cadastro da marca, não da linha. Buscar por "Bebidas"
        precisa achar todo projeto de marca daquele setor, e é a marca que sabe qual é.
      */
      seVisivel('segmento', segmentoDaMarca(op.marca, marcas));
      seVisivel('categoria', categoriaDaMarca(op.marca, marcas));
      /*
        `contatoCliente` não entra: a coluna Contato saiu da aba Cliente em 03/08/2026 e o campo
        ficou sem tela. Buscar por um dado que não se exibe é o oráculo que a regra de permissão
        existe para impedir — vale igual quando a coluna sai por decisão de produto.
      */

      // Talento — exclusividade e origem saem da ficha, pelo rótulo.
      const ficha = fichaDoTalento(op, talentos);
      seVisivel('exclusivo', ficha && (ficha.tipo === 'exclusivo' ? 'exclusivo sim' : 'não'));
      seVisivel('origemTalento', getOrigemTalento(ficha?.origem)?.label);

      // Entrega e Produção — classificações pelo rótulo, valores como texto.
      seVisivel('output', getTipoOutput(op.output)?.label);
      seVisivel('impacto', getImpacto(op.impacto)?.label);
      seVisivel('edicao', getTipoEdicao(op.edicao)?.label);
      seVisivel('formatoConteudo', getFormatoConteudo(op.formatoConteudo)?.label);
      seVisivel('alcanceAudiencia', getAlcanceAudiencia(op.alcanceAudiencia)?.label);
      seVisivel('custoProducao', op.custoProducao);
      seVisivel('captacaoProducao', getCaptacaoProducao(op.captacaoProducao)?.label);

      // Financeiro e Pagamento — os valores como foram escritos, e o código do ERP.
      seVisivel('valorProjeto', op.valorProjeto);
      seVisivel('cache', op.cache);
      seVisivel('comissaoGlobo', op.comissaoGlobo);
      seVisivel('comissao', op.comissao);
      seVisivel('impostos', op.impostos);
      seVisivel('saving', op.saving);
      seVisivel('pep', op.pep);

      /*
        Jurídico — razão social e documento saem da ficha do talento. Procurar por CNPJ é gesto
        comum de quem confere contrato, e sem isto a única saída seria abrir ficha por ficha.
      */
      seVisivel('razaoSocial', ficha?.razaoSocial);
      seVisivel('cnpj', ficha?.cnpj);
      seVisivel('tipoContratacao', op.tipoContratacao);
      seVisivel('numeroContrato', op.numeroContrato);

      /*
        Links não entram. Ninguém procura por URL — e uma delas tem 120 caracteres que casariam
        com termos curtos por acidente, trazendo linha errada para quem buscou outra coisa.
      */

      // Observações e id de origem acompanham a linha: são o rastro de quem chegou por integração.
      campos.push(op.observacoes, op.idExterno ?? '');

      /*
        Responsáveis **e apoios**: quem apoia aparece na célula e responde pela linha para efeito
        de acesso, então procurar pelo nome dele precisa achar o projeto. Buscar só responsáveis
        deixava metade da coluna invisível para a busca.
      */
      const pessoasPorArea = [op.responsaveis, op.apoios ?? {}];
      for (const grupo of pessoasPorArea) {
        for (const [area, ids] of Object.entries(grupo)) {
          // A pessoa de uma área é buscável se a coluna daquela área estiver na tela.
          if (!camposVisiveis.has(area)) continue;
          for (const id of ids ?? []) {
            const usuario = porId.get(id);
            if (usuario) campos.push(usuario.nome, usuario.email);
          }
        }
      }

      const conteudo = campos.filter(Boolean).map(normalizar).join(' ');
      return termo.split(/\s+/).every((parte) => conteudo.includes(parte));
    });
    /*
      `marcas` e `talentos` entram nas dependências porque a busca lê deles — segmento vem do
      cadastro da marca, razão social da ficha. Sem isso, corrigir um segmento não mudaria o
      resultado da busca até que outra coisa mudasse.
    */
  }, [doFiltro, busca, usuarios, marcas, talentos, visoesVisiveis, colunasOcultas]);

  /**
   * Insere uma linha vazia e devolve o id, para a tabela abrir o nome em edição.
   *
   * Nasce como "Sem título" porque o nome é a chave da linha: buscar, ordenar e identificar
   * dependem dele, e uma linha anônima não é editável — não haveria onde clicar.
   */
  function handleCriar(): string | null {
    /*
      Criar leva para **Entrada**, que é onde a linha nasce.

      Antes isto largava tudo em "Todas", e o motivo era preguiçoso: a linha nasce em Entrada e não
      apareceria sob outro recorte, então o caminho fácil era desfazer o recorte inteiro. O efeito
      é que a pessoa perdia o lugar onde estava trabalhando para ver uma linha que ela sabe onde
      está.

      Ir para a etapa certa mostra a linha nova **no contexto dela**, e o recorte continua sendo um
      recorte — só que o da etapa que acabou de receber o projeto.
    */
    setEtapa('entrada');
    setBusca('');
    return criarOportunidade(TITULO_PROVISORIO)?.id ?? null;
  }

  return (
    <div className="flex min-h-full flex-col">
      <Header
        /*
          Denso: é o quadro com mais disputa por altura — mapa do processo, 13 abas e uma lista
          longa na mesma tela. Os outros quadros seguem com o cabeçalho cheio.
        */
        denso
        title="Backlog de Agenciados"
        subtitle="Oportunidades em triagem e elaboração — o que chega por e-mail, pelo Salesforce ou pelas mãos do time, antes de virar contrato."
        hints={[
          { icon: Timer, text: 'Triagem em 5 dias úteis' },
          { icon: Inbox, text: 'Entrada manual, por e-mail ou Salesforce' },
          { icon: Workflow, text: 'Da entrada ao negócio fechado' },
        ]}
      />

      {/*
        Sem `min-h-0` desde 14/08/2026: era ele que impedia o miolo de crescer além da folha — a
        cadeia da rolagem de emergência precisa que o conteúdo POSSA exceder para a folha ter o
        que rolar. Quando cabe, o `flex-1` estica igual a antes.
      */}
      <main className="flex flex-1 flex-col bg-[#f4f6fa] p-6">
        <FluxoDoProcesso
          oportunidades={permitidas}
          etapaAtiva={etapa}
          onEtapaChange={setEtapa}
          recolhido={fluxoRecolhido}
          onRecolhidoChange={alternarFluxo}
        />

        {/* `min-h-0` deixa o card encolher abaixo do conteúdo — é o que faz a lista rolar. */}
        <div className="flex flex-1 flex-col">
          <BacklogTable
            oportunidades={visiveis}
            total={doFiltro.length}
            busca={busca}
            onBuscaChange={setBusca}
            visoesVisiveis={visoesVisiveis}
            aba={abaAtiva}
            onAbaChange={setAbaAtiva}
            colunasOcultas={colunasOcultas}
            onCriar={handleCriar}
            onUpdateCampo={(id, campo, valor) => atualizarOportunidade(id, campo, valor)}
            onDeleteMany={(ids) => ids.forEach((id) => excluirOportunidade(id))}
          />
        </div>
      </main>
    </div>
  );
}
