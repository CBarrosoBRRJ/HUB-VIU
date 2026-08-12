import {
  COLUNAS_TALENTOS, COLUNAS_CONTRATOS, COLUNAS_BACKLOG, TODAS_AS_COLUNAS, colunasDaVisao,
  larguraDaColuna,
  colunasOcultaveis, getColuna, visaoDaColuna, quadroDaColuna,
} from './utils/colunas.js';
import { VISOES, visoesDoQuadro, colunaOculta, colunasOcultasNaVisao, alternarColuna } from './utils/visoes.js';
import { camposPorColuna, filtrarTalentos } from './utils/busca.js';
import { ESCOPO_DESTRAVA, TIPOS_EDICAO } from './utils/oportunidades.js';

let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

const user = (id, perfil, over = {}) => ({
  id, perfil, situacao: 'ativo', nome: id, email: `${id}@viu.com.br`,
  cargo: '', telefone: '', local: '', nascimento: '', ...over,
});

const talento = (over = {}) => ({
  id: 'tal1', nome: 'Marina Duarte', tipo: 'exclusivo', nomeArtistico: 'Marina',
  empresa: 'MD Produções', email: 'contato@md.com.br', telefone: '(21) 98800-1122',
  local: 'Rio de Janeiro, RJ', observacoes: '', razaoSocial: 'MD Produções LTDA',
  cnpj: '12.345.678/0001-90', faturamento: 'R$ 45.000', condicaoPagamento: '', dadosBancarios: '',
  redes: { instagram: 'marinaduarte', tiktok: '', youtube: '', facebook: '', x: '', site: '' },
  responsaveis: { talent: ['u3'] }, criadoEm: '', ...over,
});

console.log('\n--- Integridade do catálogo ---');
check('todo id segue quadro:aba:campo',
  TODAS_AS_COLUNAS.every((c) => c.id.split(':').length === 3), true);
check('nenhum id repetido',
  new Set(TODAS_AS_COLUNAS.map((c) => c.id)).size === TODAS_AS_COLUNAS.length, true);
check('toda coluna tem rótulo, peso e alinhamento',
  TODAS_AS_COLUNAS.every((c) => c.label && c.peso > 0 && ['left', 'center'].includes(c.align)), true);

// A soma das larguras é o que mantém o cabeçalho sobre a coluna certa em `table-fixed`.
for (const [visao, colunas] of Object.entries(COLUNAS_TALENTOS)) {
  const soma = colunas.reduce((total, c) => total + c.peso, 0);
  // 22% da coluna Talento + ~78% distribuídos nas colunas da aba.
  check(`${visao.split(':')[1]}: pesos somam 78`, soma, 78);
}
check('contratos: pesos somam 100',
  COLUNAS_CONTRATOS.reduce((total, c) => total + c.peso, 0), 100);

/*
  Aba **sem colunas é estado válido**: as abas além das já definidas foram esvaziadas para serem
  desenhadas junto com a operação. O invariante vale para quem tem colunas — quando uma delas
  voltar, a soma precisa fechar 82 como as demais.
*/
const comColunas = Object.entries(COLUNAS_BACKLOG).filter(([, cols]) => cols.length > 0);
/*
  Aba sem colunas é **estado válido**: nasce declarada, e as colunas vêm da conversa com quem usa.
  A versão anterior deste bloco exigia que todas tivessem colunas — codificava o estado de um dia
  como regra, e quebrou no primeiro dia seguinte.

  **A soma de pesos = 82 foi aposentada em 04/08/2026.** Ela era o contrato do layout proporcional
  (82% distribuídos + 18% do nome); desde a grade contínua quem manda é a largura em pixels, e
  remanejar colunas entre abas (Exclusivo e Origem voltando à Demanda) deixaria o rebalanceio de
  pesos como burocracia sem tela. O contrato que vale agora: **toda coluna declara a largura**, em
  px medidos contra o seed realista — sem isso o `table-layout: fixed` herdaria o fallback e a
  coluna nasceria com largura de chute.
*/
check('toda coluna do Backlog declara largura em px', comColunas.every(([, cols]) =>
  cols.every((c) => Number.isInteger(c.largura) && c.largura >= 60 && c.largura <= 400)), true);
/*
  **Nenhuma aba vazia.** A Agência era a última, e saiu em 03/08/2026 junto com a decisão de não
  trabalhar com agência intermediária.

  A asserção mudou de forma de propósito: antes nomeava a exceção ("a que falta é a Agência"), o
  que aceitava a existência de uma. Agora exige que não haja nenhuma — uma aba que abre sem colunas
  é uma promessa que a tela não cumpre, e foi assim que a Agência viveu meses sem ganhar conteúdo.
*/
check('nenhuma aba está vazia',
  Object.entries(COLUNAS_BACKLOG).filter(([, c]) => c.length === 0).map(([v]) => v), []);

/*
  **A aba Time** — todas as oito áreas numa tela só, desde 03/08/2026.

  Antes cada aba trazia o responsável da sua área. A operação pediu o contrário: "quem está nesse
  projeto?" é pergunta sobre o projeto inteiro, e respondê-la custava abrir seis abas.

  Este bloco tranca as duas metades da mudança: as oito estão **aqui**, e não sobrou nenhuma
  espalhada pelas demais abas. Sem a segunda metade, uma coluna esquecida em Produção passaria
  despercebida — e apareceria como pessoa duplicada em duas telas.
*/
/*
  **A exceção do Orçamento caiu em 11/08/2026.**

  Ela era a única coluna de pessoas sem `area` declarada, porque tinha célula própria — a única com
  papéis de responsável e apoio. Quando a operação pediu a distinção em todas as áreas ("a regra
  deve ser como fizemos na de Orçamento"), a exceção perdeu a razão de existir: a área é o que leva
  a coluna ao caminho com papéis, e não havia mais motivo para uma coluna ficar fora dele.

  O teste virou o contrário do que era: antes travava a exceção, agora trava a ausência dela.
*/
const time = COLUNAS_BACKLOG['backlog:time'];
check('Time declara as áreas, na ordem do trabalho',
  time.filter((c) => c.area).map((c) => c.area),
  ['talent', 'orcamento', 'gp', 'conteudo', 'audiencia', 'producao', 'artistico', 'executivo',
   'pagamento', 'juridico']);
check('nenhuma coluna de pessoas fica sem área — nem o Orçamento',
  time.some((c) => c.id.endsWith(':orcamento') && !c.area), false);
/*
  Dez desde 03/08/2026: **Produtor Artístico** e **Executivo** entraram como as duas frentes da
  Produção. Numa produção pequena é a mesma pessoa nas três colunas — o modelo não obriga a
  diferença, só permite registrá-la.
*/
check('são dez colunas de pessoas ao todo',
  time.filter((c) => c.area || c.id.endsWith(':orcamento')).length, 10);
// As duas novas ficam ao lado de quem responde pelo todo, e não no fim da lista.
const areasTime = time.filter((c) => c.area).map((c) => c.area);
check('as frentes vêm logo depois da Produção',
  areasTime.slice(areasTime.indexOf('producao'), areasTime.indexOf('producao') + 3),
  ['producao', 'artistico', 'executivo']);

const forasteiras = Object.entries(COLUNAS_BACKLOG)
  .filter(([aba]) => aba !== 'backlog:time')
  .flatMap(([, cols]) => cols.filter((c) => c.area || c.id.endsWith(':orcamento')))
  .map((c) => c.id);
check('nenhuma coluna de pessoas ficou em outra aba', forasteiras, []);

/*
  A aba Escopo guarda o pedido em **texto**, não em contagem.

  Até 03/08/2026 eram quatro números — Reels, Vídeos, Post e Cotas. Um briefing real não cabe neles:
  "3 reels + 1 vídeo de 60s, uso de 6 meses" é o que a operação precisa registrar, e "3 · 1 · 0 · 0"
  não dizia. A troca aceita perder a soma automática de peças.
*/
const escopoAba = COLUNAS_BACKLOG['backlog:escopo'];
check('nenhuma coluna de contagem sobrou',
  escopoAba.filter((c) => c.id.includes(':qtd')).map((c) => c.label), []);
const colunaEscopo = escopoAba.find((c) => c.id.endsWith(':escopo'));
check('a coluna Escopo existe e é editável como texto', colunaEscopo?.campo, 'escopo');
check('alinhada à esquerda, como todo texto corrido', colunaEscopo?.align, 'left');
/*
  É a coluna mais larga da aba, e por larga margem.

  Texto corrido precisa de largura para ser lido sem passar o mouse. Se um dia ela empatar com uma
  vizinha, alguém redistribuiu peso sem olhar para o que a coluna carrega.
*/
const maisLarga = Math.max(...escopoAba.filter((c) => c !== colunaEscopo).map((c) => c.peso));
check('Escopo é a coluna mais larga da aba', colunaEscopo?.peso > maisLarga, true);
/*
  Ao menos o **triplo** da segunda. Era o dobro até 03/08/2026, quando as âncoras foram
  padronizadas pelos pesos da Demanda: Talento encolheu, e a folga do Escopo cresceu junto.
  O número sobe com a realidade — o que não pode é a coluna de texto empatar com uma vizinha.
*/
check('e com folga — ao menos o triplo da segunda', colunaEscopo?.peso >= maisLarga * 3, true);

/*
  **Os três tiques do Escopo**, e o par que cada um destrava na Produção.

  O Escopo declara o que o projeto inclui; a Produção detalha como. Sem o tique, a coluna lá fica
  travada — é a diferença entre "ninguém preencheu ainda" e "este projeto não tem isso", duas
  respostas que uma coluna vazia dá ao mesmo tempo.
*/
check('a aba tem os três tiques',
  escopoAba.filter((c) => c.id.includes(':tem')).map((c) => c.label),
  ['Edição', 'Conteúdo', 'Audiência']);
check('cada tique tem par na Produção',
  ESCOPO_DESTRAVA.map((par) => par.tique),
  ['temEdicao', 'temConteudo', 'temAudiencia']);
const producaoCols = COLUNAS_BACKLOG['backlog:producao'];
for (const par of ESCOPO_DESTRAVA) {
  check(`${par.label}: a coluna destravada existe na Produção`,
    producaoCols.some((c) => c.id.endsWith(`:${par.campo}`)), true);
}
/*
  **"Sem edição" saiu da lista** no mesmo dia: a pergunta "tem edição?" passou a ser o tique, e
  ter as duas no mesmo lugar criava um estado que nada na tela resolvia — tique marcado com
  "Sem edição" escolhido. Uma pergunta, um lugar.
*/
check('a lista de Edição responde só QUEM edita',
  TIPOS_EDICAO.map((t) => t.id), ['interna', 'talento', 'agencia', 'produtora']);
check('a data de veiculação não é o deadline',
  escopoAba.some((c) => c.field === 'veiculacaoEm' && !c.fixa), true);

/*
  **As âncoras têm a mesma largura e a mesma posição em toda aba** — 03/08/2026.

  Status, Projeto, Entrada e Talento identificam a linha e se repetem no quadro inteiro. Enquanto
  cada aba escolhia o próprio peso, elas iam de 6 a 10: trocar de aba mexia as quatro primeiras
  colunas de lugar, e a leitura recomeçava do zero a cada clique.

  Projeto não entra na conta por não estar no catálogo — é a coluna-chave, fixa em 18%, inserida
  pela tabela na posição que a aba define.

  A ordem também é travada: Status abre, Entrada e Talento vêm em seguida. Uma aba que as
  reordenasse passaria neste bloco pelo peso e falharia na posição, que é o que se quer.
*/
console.log('\n--- As âncoras são iguais em toda aba ---');
const ANCORAS = ['status', 'entradaEm', 'talento'];
const pesoAncora = {};
const posicaoAncora = {};
// **Todas as abas têm as três** — é o que faz delas padrão, e não coincidência.
for (const [aba, cols] of Object.entries(COLUNAS_BACKLOG)) {
  for (const chave of ANCORAS) {
    check(`${aba.split(':')[1]}: tem a âncora ${chave}`,
      cols.some((c) => c.id.endsWith(`:${chave}`)), true);
  }
}
for (const [aba, cols] of Object.entries(COLUNAS_BACKLOG)) {
  cols.forEach((coluna, indice) => {
    const chave = coluna.id.split(':')[2];
    if (!ANCORAS.includes(chave)) return;
    if (pesoAncora[chave] === undefined) {
      pesoAncora[chave] = coluna.peso;
      posicaoAncora[chave] = indice;
      return;
    }
    check(`${aba.split(':')[1]}/${chave}: mesma largura`, coluna.peso, pesoAncora[chave]);
    check(`${aba.split(':')[1]}/${chave}: mesma posição`, indice, posicaoAncora[chave]);
  });
}
// A Demanda é a referência: se ela mudar, todas mudam junto — e não só ela.
const demandaCols = COLUNAS_BACKLOG['backlog:demanda'];
for (const chave of ANCORAS) {
  const naDemanda = demandaCols.find((c) => c.id.endsWith(`:${chave}`));
  check(`${chave}: a referência é a Demanda`, pesoAncora[chave], naDemanda?.peso);
}

/*
  As colunas espelhadas precisam ser **a mesma coluna**, não uma cópia com outro nome: mesmo
  `field` e mesmo `campo`. Se divergirem, a grade despacha para outro componente e a edição numa
  aba deixa de aparecer na outra.
*/
const porCampo = (visao) => new Map(
  COLUNAS_BACKLOG[visao].map((c) => [c.id.split(':')[2], c]),
);
const escopo = porCampo('backlog:demanda');

/*
  **Marca e Talento** — a união de *Cliente* e *Talento*, em 03/08/2026.

  As duas respondiam à mesma pergunta por metades: a marca que paga e o talento que aparece.
  Separadas, obrigavam a trocar de aba para ler um projeto inteiro, e cinco das colunas eram as
  mesmas espelhadas de identificação, repetidas nas duas telas.
*/
const cliente = porCampo('backlog:cliente');
/*
  Só as âncoras seguem espelhadas — 03/08/2026, dedup da grade contínua.

  Exclusivo e Marca saíram da Demanda: numa tabela única a Cliente está a um scroll de distância,
  e a cópia só gastava largura. A ocorrência única vive na Cliente.
*/
for (const chave of ['status', 'entradaEm', 'talento']) {
  const a = escopo.get(chave);
  const b = cliente.get(chave);
  check(`espelhada ${chave}: mesmo rótulo`, b?.label, a?.label);
  check(`espelhada ${chave}: mesmo field`, b?.field, a?.field);
  check(`espelhada ${chave}: mesmo campo`, b?.campo, a?.campo);
  // Sem isto, uma chave que sumisse dos dois lados passaria comparando ausência com ausência.
  check(`espelhada ${chave}: a coluna existe`, cliente.has(chave), true);
}

/*
  A dedup continua valendo — cada coluna existe numa seção só —, mas os lados trocaram de casa na
  ordenação de 04/08/2026 (imagem da operação): o lado do TALENTO (Exclusivo, Origem) voltou para
  a frente da Demanda, porque vínculo é informação de decisão; o lado da MARCA ficou na Cliente.
*/
check('Exclusivo mora na Demanda', escopo.has('exclusivo'), true);
check('Origem do Talento mora na Demanda', escopo.has('origemTalento'), true);
check('a Cliente não repete Exclusivo', cliente.has('exclusivo'), false);
check('a Cliente não repete a origem do talento', cliente.has('origemTalento'), false);
check('a Demanda não repete Marca', escopo.has('marca'), false);
for (const chave of ['marca', 'segmento', 'categoria']) {
  check(`${chave} é da Cliente, do cadastro da marca`, cliente.has(chave), true);
}
// O Talent Manager mudou-se para a aba Time, com as outras sete áreas.
check('não nomeia mais o Talent Manager', cliente.has('talent'), false);
// Contato saiu em 03/08, junto com o Deadline: o campo ficou sem coluna em nenhuma aba.
check('sem Contato', cliente.has('contato'), false);
/*
  As quatro abas que saíram em 03/08/2026 — nem no catálogo, nem na navegação.

  `backlog:cliente` **não** está na lista: ela é a aba que absorveu a Talento, e manteve id e nome.
  Isso é o desejável — `backlog:escopo` → `backlog:demanda` custou uma versão de persistência e é a
  exceção documentada à regra de ids estáveis, não o padrão a seguir.
*/
for (const antiga of ['backlog:agencia', 'backlog:talento', 'backlog:entrega',
  'backlog:conteudo', 'backlog:audiencia']) {
  check(`${antiga} não existe mais`, COLUNAS_BACKLOG[antiga], undefined);
  check(`${antiga} saiu das visões`, VISOES.some((v) => v.id === antiga), false);
}
// E a que ficou manteve a identidade: mesma chave de permissão de antes da união.
check('backlog:cliente seguiu com o id', Boolean(COLUNAS_BACKLOG['backlog:cliente']), true);

/*
  **Nenhuma aba tem coluna Deadline** — 03/08/2026.

  Ela existia em cinco. O prazo continua sendo a métrica que a operação confere de relance, mas
  virou o **farol na célula de Ações**, com a data no tooltip: uma bolinha custa 12px, a coluna
  custava 6% da largura em toda aba. A Demanda tinha chegado a treze colunas, todas apertadas
  demais para o dado que carregavam.

  A asserção é sobre **todas** as abas, e não sobre a que motivou a remoção: reintroduzir a coluna
  numa aba só é exatamente o descuido que este teste existe para pegar.
*/
const comDeadline = Object.entries(COLUNAS_BACKLOG)
  .filter(([, cols]) => cols.some((c) => c.id.endsWith(':prazoEm')))
  .map(([aba]) => aba);
check('nenhuma aba tem coluna Deadline', comDeadline, []);
for (const [visao, colunas] of comColunas) {
  // O contrato por aba: nenhuma coluna sem largura declarada (ver a nota da invariante acima).
  check(`backlog/${visao.split(':')[1]}: todas as colunas com largura`,
    colunas.every((c) => Number.isInteger(c.largura)), true);
}
/*
  Onze abas, desde 03/08/2026.

  Saíram três — Agência (a operação não vai usar), Conteúdo e Audiência (existiam para nomear as
  suas áreas; com as pessoas na aba Time, ficariam idênticas uma à outra e sem nada próprio). Entrou
  uma: Time. As áreas de Conteúdo e Audiência **continuam vivas** em `AreaTalento`, com equipe e
  responsáveis — o que mudou foi onde se olha para elas.
*/
check('as 8 abas do Backlog seguem no catálogo', Object.keys(COLUNAS_BACKLOG).length, 8);

/*
  A ordem das abas veio da operação, não de conveniência de código.

  E veio **duas vezes** em 03/08/2026: uma leitura minha da lista de colunas pôs a Cliente na
  frente, e a correção foi direta — "devemos começar por demanda". A Demanda é a triagem, e o
  quadro existe para triar. Links ficou antes do Time por escolha deixada em aberto pela operação
  ("por último ou antes do Time"): referência de projeto junto das seções de projeto; o Time fecha
  porque é a única aba que não descreve o projeto, e sim quem o toca.

  Pagamento não existe mais: foi fundida no Financeiro (Parcelas e PEP entraram entre os valores).

  Em 04/08/2026 a operação mandou a ordenação por imagem, e ela reposicionou duas: **Produção
  colou no Escopo** (os tiques de lá destravam as colunas daqui — lado a lado, a relação se lê) e
  **Jurídico passou à frente do Financeiro** (primeiro o que assina, depois o que se cobra).
*/
console.log('\n--- Ordem e restrições das abas do Backlog ---');
check('a ordem é a que a operação pediu',
  visoesDoQuadro('backlog').map((v) => v.label),
  ['Demanda', 'Escopo', 'Produção', 'Cliente', 'Jurídico', 'Financeiro', 'Links', 'Time']);
// Toda aba precisa de entrada no catálogo de colunas, ainda que vazia — senão a tela quebra ao abri-la.
check('toda aba tem entrada no catálogo de colunas',
  visoesDoQuadro('backlog').every((v) => Array.isArray(COLUNAS_BACKLOG[v.id])), true);
/*
  Duas restritas, e são as que guardam dinheiro e contrato. Eram três: a Pagamento — que entrou na
  lista por carregar dado bancário — foi fundida no Financeiro, e a liberação dele passou a cobrir
  Parcelas e PEP.
*/
check('as restritas são Jurídico e Financeiro, nesta ordem desde 04/08',
  visoesDoQuadro('backlog').filter((v) => v.restrita).map((v) => v.label),
  ['Jurídico', 'Financeiro']);
check('e toda restrita explica o motivo',
  visoesDoQuadro('backlog').filter((v) => v.restrita).every((v) => v.motivo), true);

/*
  A ordem do Escopo veio de especificação da operação, não de conveniência de código: Status
  primeiro, e o Nome do projeto logo depois. Sem este teste, qualquer refatoração reordena as
  colunas sem que nada acuse.

  O nome não está no catálogo — é a coluna-chave, inserida pela tabela na posição que a aba define
  (`posicaoDoNome` em BacklogTable). Aqui o `null` marca onde ela entra.
*/
console.log('\n--- Ordem das colunas do Escopo ---');
check('a ordem é a que a operação pediu',
  [
    ...colunasDaVisao('backlog:demanda').slice(0, 1).map((c) => c.label),
    null,
    ...colunasDaVisao('backlog:demanda').slice(1).map((c) => c.label),
  ],
  [
    'Status', null, 'Entrada', 'Talento',
    // O lado do talento abre a seção (04/08/2026): vínculo é informação de decisão.
    'Exclusivo', 'Origem do Talento',
    'Tipo de Input',
    'Tipo de Projeto', 'Origem do Projeto',
    // As três que vieram de Entrega e Escopo em 03/08 — descrevem o trabalho, e ficam juntas.
    'Tipo de Output', 'Impacto', 'Captação',
    'Prioridade',
  ]);

/*
  A vizinhança deliberada que restou: **Talento → Exclusivo**.

  A segunda deriva da primeira — a exclusividade vem do vínculo na ficha do talento. Lado a lado, a
  relação fica visível na leitura, e quem estranhar o valor sabe onde ir mudá-lo.

  A outra vizinhança travada aqui, "Resp. Orçamento → Deadline", saiu em 03/08/2026: as colunas de
  pessoas foram todas para a aba Time.
*/
/*
  A vizinhança **Talento → Exclusivo está de volta ao lugar de origem** (04/08/2026): o bloco
  congelado termina em Talento, e a Demanda abre com o vínculo dele — a costura fica visível no
  primeiro pixel rolante da grade. A Cliente ficou com o lado da marca, e abre com ela.
*/
const demandaRolantes = colunasDaVisao('backlog:demanda').filter((c) => !['status', 'entradaEm', 'talento'].includes(c.id.split(':')[2]));
check('a Demanda abre com Exclusivo, colado no Talento congelado',
  demandaRolantes[0]?.label, 'Exclusivo');
const clienteCols = colunasDaVisao('backlog:cliente').filter((c) => !['status', 'entradaEm', 'talento'].includes(c.id.split(':')[2]));
check('a Cliente abre com a Marca',
  clienteCols[0]?.label, 'Marca');
const ordem = colunasDaVisao('backlog:demanda').map((c) => c.label);
void ordem;
// Não tem `campo`: é atribuição de pessoa, não texto digitado. Agora mora na aba Time.
check('Resp. Orçamento não é campo de texto',
  colunasDaVisao('backlog:time').find((c) => c.label === 'Orçamento').campo, undefined);
check('Status abre o Escopo', colunasDaVisao('backlog:demanda')[0].id, 'backlog:demanda:status');
/*
  Output, Impacto e Captação ficam **entre as classificações e a Prioridade**.

  As três descrevem o trabalho — o que se entrega, quanto pesa, como se grava — e são informação de
  decisão: quem vai aceitar ou declinar quer vê-las sem trocar de aba. Prioridade fecha a linha
  porque é a única que responde "e daí, faço primeiro?".
*/
check('Output e Impacto lado a lado',
  ordem.indexOf('Impacto') - ordem.indexOf('Tipo de Output'), 1);
check('as três vêm antes da Prioridade',
  ordem.indexOf('Captação') < ordem.indexOf('Prioridade'), true);
// Nenhuma das três é texto digitado: as três são lista fechada.
for (const rotulo of ['Tipo de Output', 'Impacto', 'Captação']) {
  check(`${rotulo} não é campo de texto`,
    colunasDaVisao('backlog:demanda').find((c) => c.label === rotulo).campo, undefined);
}

console.log('\n--- Catálogo × catálogo de visões ---');
// Toda aba declarada precisa ter colunas, e toda coluna precisa pertencer a uma aba existente.
check('toda visão de Talentos tem colunas',
  visoesDoQuadro('talentos').every((v) => colunasDaVisao(v.id).length > 0), true);
const idsDeVisao = new Set(VISOES.map((v) => v.id));
check('toda coluna de Talentos pertence a uma visão declarada',
  Object.values(COLUNAS_TALENTOS).flat().every((c) => idsDeVisao.has(visaoDaColuna(c.id))), true);
check('visaoDaColuna extrai os dois primeiros segmentos',
  visaoDaColuna('talentos:contato:telefone'), 'talentos:contato');
check('quadroDaColuna extrai o primeiro', quadroDaColuna('talentos:contato:telefone'), 'talentos');
check('coluna inexistente não resolve', getColuna('talentos:nada:nada'), undefined);

console.log('\n--- Colunas ocultáveis ---');
// A chave da linha e os totais derivados não podem sumir: sobrariam linhas anônimas.
check('Talento dos contratos é fixa',
  colunasOcultaveis('contratos:grade').some((c) => c.id.endsWith(':talento')), false);
check('Ações é fixa',
  colunasOcultaveis('contratos:grade').some((c) => c.id.endsWith(':acoes')), false);
check('o contador de áreas é fixo',
  colunasOcultaveis('talentos:identificacao').some((c) => c.id.endsWith(':areas')), false);
check('mas o telefone é ocultável',
  colunasOcultaveis('talentos:contato').some((c) => c.id.endsWith(':telefone')), true);
check('visão inexistente não tem colunas', colunasDaVisao('inventada:aba'), []);

console.log('\n--- Permissão de coluna ---');
const TELEFONE = 'talentos:contato:telefone';
const CNPJ = 'talentos:financeiro:cnpj';

const eqSemNada = { id: 'eqA', nome: 'A', paginasPermitidas: ['talentos'], criadaEm: '', membros: [{ usuarioId: 'u5', papel: 'membro' }] };
const eqQueOculta = {
  id: 'eqB', nome: 'B', paginasPermitidas: ['talentos'], criadaEm: '',
  membros: [{ usuarioId: 'u6', papel: 'membro' }, { usuarioId: 'u7', papel: 'membro' }],
  colunasOcultas: [TELEFONE],
};
const eqQueMostra = {
  id: 'eqC', nome: 'C', paginasPermitidas: ['talentos'], criadaEm: '',
  membros: [{ usuarioId: 'u7', papel: 'membro' }],
};
const equipes = [eqSemNada, eqQueOculta, eqQueMostra];
const ctx = (u) => ({ usuario: u, equipes });

check('sem ocultação, a coluna aparece', colunaOculta(ctx(user('u5', 'membro')), TELEFONE), false);
check('equipe que oculta esconde', colunaOculta(ctx(user('u6', 'membro')), TELEFONE), true);
// União, como em todo o resto do modelo: basta uma equipe não ocultar.
check('basta UMA equipe não ocultar', colunaOculta(ctx(user('u7', 'membro')), TELEFONE), false);
check('admin ignora a ocultação', colunaOculta(ctx(user('u1', 'admin')), TELEFONE), false);
check('dono ignora a ocultação', colunaOculta(ctx(user('u0', 'membro')), TELEFONE, true), false);
check('quem não está em equipe alguma não é afetado',
  colunaOculta(ctx(user('u9', 'membro')), TELEFONE), false);
check('outra coluna segue visível', colunaOculta(ctx(user('u6', 'membro')), CNPJ), false);

check('lista as ocultas da aba',
  colunasOcultasNaVisao(ctx(user('u6', 'membro')), colunasDaVisao('talentos:contato')), [TELEFONE]);
check('nada oculto devolve vazio',
  colunasOcultasNaVisao(ctx(user('u5', 'membro')), colunasDaVisao('talentos:contato')), []);

console.log('\n--- Alternar coluna ---');
const semNada = { ...eqSemNada };
const comUma = alternarColuna(semNada, TELEFONE);
check('alternar não muta o original', semNada.colunasOcultas, undefined);
check('oculta a coluna', comUma.colunasOcultas, [TELEFONE]);
check('clicar de novo mostra', alternarColuna(comUma, TELEFONE).colunasOcultas, []);
check('acumula', alternarColuna(comUma, CNPJ).colunasOcultas, [TELEFONE, CNPJ]);

console.log('\n--- A busca respeita a coluna, não só a aba ---');
const fichas = [talento()];
const TODAS = TODAS_AS_COLUNAS.map((c) => c.id);
const buscar = (termo, colunas) => filtrarTalentos(fichas, termo, [], colunas).map((t) => t.id);

check('acha pelo telefone com a coluna', buscar('98800', TODAS), ['tal1']);
// O ponto: a aba Contato está liberada, mas a coluna Telefone não.
check('NÃO acha pelo telefone sem a coluna',
  buscar('98800', TODAS.filter((id) => id !== TELEFONE)), []);
check('outras colunas da mesma aba seguem buscáveis',
  buscar('Rio de Janeiro', TODAS.filter((id) => id !== TELEFONE)), ['tal1']);
// O nome é a chave da linha e nunca se oculta — buscar por ele sempre funciona.
check('o nome é sempre buscável', buscar('Marina', []), ['tal1']);
check('mas o resto não vaza sem coluna', buscar('98800', []), []);

console.log('\n--- Mapa de campos por coluna ---');
const mapa = camposPorColuna(talento(), []);
check('telefone mora na sua própria coluna', mapa[TELEFONE], ['(21) 98800-1122']);
check('cnpj idem', mapa[CNPJ], ['12.345.678/0001-90']);
check('cada rede tem sua coluna', mapa['talentos:redes:instagram'], ['marinaduarte']);
check('o nome NÃO está no mapa (é sempre buscável à parte)',
  Object.values(mapa).flat().includes('Marina Duarte'), false);

console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`);

/* ------------------------------------------------------------------ *
 * A palavra cabe na coluna?
 *
 * `break-words` parte no meio da palavra quando ela não cabe — foi assim que "Vídeos" virou
 * "VÍDE OS" e "Cotas" virou "COTA S" na aba Escopo. Rótulo partido assim é pior que rolagem.
 *
 * A conta é aproximada de propósito: mede a **maior palavra** do rótulo contra a largura que o
 * peso reserva. Não substitui olhar a tela — trava a regressão, que é o que um teste pode fazer.
 * ------------------------------------------------------------------ */

/*
  Medida na fonte real do cabeçalho: 10px, bold, uppercase, `tracking-wide`.

  O primeiro valor aqui era 7 — estimado, não medido — e por isso a suíte passava enquanto a tela
  mostrava "VÍDEO S" e "PRIORIDAD E". Maiúscula com letter-spacing custa **8,5px**, e a diferença
  de 1,5px por caractere vira 20px numa palavra de 14 letras: exatamente o que faltava.
*/
const PX_POR_CARACTERE = 8.5;
const PADDING = 16;           // px-2 dos dois lados
const ICONE_ORDENAR = 18;     // ícone (12px) + gap (4px), só nas colunas com `field`

/*
  A régua mudou com a grade contínua (04/08/2026): quem reserva espaço não é mais a fração
  `peso/1760` — é a **largura declarada em px**, que o `table-layout: fixed` torna a largura real.
  O teste antigo validava um layout que já não era o da tela.
*/
console.log('\n--- Rótulo cabe na coluna ---');
for (const [visao, colunas] of comColunas) {
  for (const coluna of colunas) {
    /*
      A conta é sobre a **maior palavra**, não o rótulo inteiro: o rótulo pode ocupar duas linhas,
      mas a palavra não se parte — é o que `line-clamp-2` sem `break-words` garante.
    */
    const maiorPalavra = coluna.label.split(' ').reduce((a, b) => (a.length >= b.length ? a : b), '');
    const precisa = maiorPalavra.length * PX_POR_CARACTERE + PADDING + (coluna.field ? ICONE_ORDENAR : 0);
    check(`${visao.split(':')[1]}/${coluna.label}: "${maiorPalavra}" cabe`,
      larguraDaColuna(coluna) >= precisa, true);
  }
}
