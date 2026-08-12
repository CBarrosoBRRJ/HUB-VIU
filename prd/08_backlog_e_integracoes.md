# PRD 08 — Backlog de Agenciados e Integrações
**Versão:** 8.6 | **Status:** Front-end totalmente implementado e auditado | **Data:** 12/08/2026

[← Índice da documentação](README.md) · *Oportunidades, status, SLA e ingestão*


> Documento de replicação do quadro **Backlog de Agenciados** e do **contrato de ingestão** que
> permite ao agente de e-mail e ao Salesforce escreverem nele.
>
> Código em [`src/pages/BacklogAgenciados.tsx`](../src/pages/BacklogAgenciados.tsx),
> [`src/components/backlog/`](../src/components/backlog/),
> [`src/utils/oportunidades.ts`](../src/utils/oportunidades.ts),
> [`src/utils/exportacao.ts`](../src/utils/exportacao.ts),
> [`src/utils/ingestao.ts`](../src/utils/ingestao.ts), [`src/utils/sla.ts`](../src/utils/sla.ts) e
> [`src/utils/moeda.ts`](../src/utils/moeda.ts).

> ### Mudanças da v8.3 (04/08/2026)
>
> | O que | Motivo |
> |-------|--------|
> | **Garantia de Download `.xlsx` via Blob ArrayBuffer** | Geração direta de ArrayBuffer com Blob de tipo MIME `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, contornando falhas de detecção do ambiente Node em servidores de desenvolvimento Vite |
> | **Extensão da Exportação para Todos os Quadros** | Adicionado botão de **Exportar** em `.xlsx` também para **Contratos de Agenciados** e **Talentos** |

> ### Mudanças da v8.2 (04/08/2026)
>
> | O que | Motivo |
> |-------|--------|
> | **Exportação em `.xlsx` de verdade** (SheetJS por `import()` dinâmico) | O CSV "que o Excel abre" não **era** Excel, e a operação pediu o formato real — o CSV fica registrado como primeira versão (§6) |
> | **Auditoria de aderência documento ↔ código** | O modelo, as seções, a máquina de estados e as contagens de teste abaixo foram conferidos contra o código em 04/08/2026; seções sobre abas extintas viraram registro histórico curto |
>
> ### Mudanças da v8.1 (04/08/2026)
>
> | O que | Motivo |
> |-------|--------|
> | **Auditoria de UX & Testes Simulados no Navegador** | 100% de aprovação na suíte de testes (78/78) e navegação interativa sem falhas |
> | **Refinamento do Parser Monetário (`moeda.ts`)** | `interpretarValor` isolado de `paraNumero` garantindo que R$ 0 não infle ilegíveis |
> | **SLA de Finais de Semana (`sla.ts`)** | Comparação explicita por calendário (`hoje > alvo.prazoEm`) impedindo falso "Vence hoje" no domingo |
> | **Auto-Cadastro de Marcas e Talentos Pendentes** | Entrada imediata de novas marcas/talentos em modo pendente no Backlog sem travar digitação |

> ### Mudanças da v4.0
>
> | O que | Motivo |
> |-------|--------|
> | A lista mostra **só o que está em andamento** | Finalizados empilhados obrigariam a rolar por cima deles todo dia |
> | Finalizados agrupados no cabeçalho, **janela de 30 dias** | O histórico completo é do Power BI; aqui é controle de processo |
> | **Lista rolável** com cabeçalho fixo | ~50 projetos/dia — rolar a página tira da tela o que se usa para navegar |
>
> ### Mudanças da v3.0
>
> | O que | Motivo |
> |-------|--------|
> | **Máquina de estados**: o status só anda pelo caminho do processo | Pular etapa não é atalho — é registrar algo que não aconteceu |
> | **Encerramento automático** aos 20 dias parados | Projeto esquecido não pode ficar aberto para sempre |
> | Campo `statusDesde` | Sem ele não há como medir há quanto tempo travou |
> | Marca `encerradaAutomaticamente` | Distinguir abandono de decisão |
>
> ### Mudanças da v2.0
>
> | O que | Motivo |
> |-------|--------|
> | **Mapa do fluxo acima da tabela**, clicável | Quem abre o quadro precisa do processo antes das linhas |
> | **11 abas** no vocabulário da operação | Escopo · Cliente · Talento · Entrega · Produção · Conteúdo · Audiência · Financeiro · Pagamento · Jurídico · Links |
> | Colunas de escopo conforme a operação | Status · Nome do projeto · Entrada · Marca · Input · Origem · Tipo do projeto · Talento · Interveniência · Prioridade · Deadline |
> | `origem` passou a ser **comercial**; a via técnica virou `entradaPor` | A operação chama de "origem" a frente comercial, não o canal de ingestão |
> | **Rodapé de totais** por grupo | Farol de SLA, interveniência e distribuição de input, de relance |
> | Cada aba temática traz **o responsável da sua área** | Quem abre Produção quer ver o que produzir e quem produz |

---

## 1. Propósito

É a **porta de entrada da operação**. Toda demanda que pode virar contrato passa por aqui
primeiro — venha de um e-mail, do Salesforce ou das mãos de quem atende — e é triada em **5 dias
úteis**.

### 1.1. O lugar dele no produto

```
BACKLOG            →  TALENTOS         →  CONTRATOS
oportunidade          quem é a pessoa     o que foi assinado
em triagem            e quem cuida        e até quando vale
```

O Backlog é o **antes**: o momento em que ainda se decide se o negócio existe. Os outros dois
quadros tratam do que já existe.

---

## 2. Modelo de dados

```ts
/** Por onde o dado ENTROU no sistema — a via técnica. */
type EntradaPorOportunidade = 'manual' | 'email' | 'salesforce';

/** De onde vem o NEGÓCIO — o vocabulário da operação. */
type OrigemComercial = 'globoplay' | 'tv_globo' | 'canais_pagos' | 'viu_agencia' | 'outros';
type InputOportunidade = 'interno' | 'mercado' | 'inbound' | 'proativo' | 'viu_first';
type TipoProjeto = 'patrocinio' | 'sob_demanda' | 'projeto_especial' | 'outro';

type StatusOportunidade =
  | 'entrada' | 'elaboracao' | 'revisao' | 'aguardando_feedback'
  | 'ajuste' | 'standby' | 'fechado' | 'declinado' | 'encerrado';

/** Como o negócio chegou — a pergunta é "de onde vem nosso pipeline". */
type TipoCaptacao = 'ativa' | 'passiva' | 'indicacao' | 'renovacao';

/** Como o talento chegou — atributo da FICHA, não do projeto. */
type OrigemTalento = 'casting' | 'indicacao' | 'prospeccao' | 'globo' | 'inbound';

/** O que será entregue. */
type TipoOutput = 'post' | 'reels' | 'stories' | 'video' | 'live' | 'evento' | 'merchandising';
/** Quanto o projeto pesa — tamanho, não urgência. */
type ImpactoProjeto = 'alto' | 'medio' | 'baixo';
/**
 * Quem edita o material — 4 valores. `sem_edicao` saiu em 03/08/2026, quando o tique
 * `temEdicao` nasceu no Escopo: os dois respondiam "tem edição?" por caminhos diferentes.
 */
type TipoEdicao = 'interna' | 'talento' | 'agencia' | 'produtora';
/** O formato editorial da peça — coluna Conteúdo da Produção. */
type FormatoConteudo =
  | 'publieditorial' | 'review' | 'tutorial' | 'depoimento' | 'entretenimento' | 'institucional';
/** O porte do alcance — coluna Audiência da Produção. ≠ impacto, que mede o projeto. */
type AlcanceAudiencia = 'massa' | 'amplo' | 'segmentado' | 'nicho';
/** Como o material é gravado — ≠ `TipoCaptacao`, que é como o negócio chegou. */
type TipoCaptacao_Producao =
  | 'estudio' | 'externa' | 'remota' | 'material_talento' | 'sem_captacao';

/** Uma espera com nome e endereço — "com quem está a bola" (§6.5). */
type TipoPendencia =
  | 'retorno_marca_executivo' | 'validacao_gestao_esporte' | 'cotacao_gestao_elenco'
  | 'validacao_externa' | 'calculo_producao'
  | 'validacao_planejamento' | 'validacao_talent_manager' | 'validacao_talento';

interface Pendencia {
  id: string;
  tipo: TipoPendencia;
  statusAbertura: StatusOportunidade; // régua da "revisão parcelada"
  abertaEm: string;                   // yyyy-mm-dd — quando a bola saiu da mão
  chegouEm?: string;                  // ausente = ainda esperando
}

interface Marca {
  id, nome, tipo, observacoes, criadoEm;
  segmento: string;                   // Bebidas, Varejo, Financeiro
  categoria: string;                  // Refrigerantes dentro de Bebidas
  contatos: string[];                 // a marca tem vários — mídia não é jurídico
  cadastroPendente?: boolean;         // entrou por um quadro, espera curadoria
}

interface Oportunidade {
  id, titulo, marca, talento, observacoes, criadoEm;
  talentoId?: string;                 // vínculo com a ficha, quando o nome casa

  /* Demanda — classificações opcionais: ausente é "não classificado" (§6.0.3) */
  tipoProjeto?: TipoProjeto;
  input?: InputOportunidade;
  origem?: OrigemComercial;
  exclusivo: boolean;                 // derivado da ficha; era `interveniencia`, invertido (v9)
  prioridade?: 'baixa' | 'media' | 'alta';
  output?: TipoOutput;
  impacto?: ImpactoProjeto;

  /* Fluxo */
  status: StatusOportunidade;
  statusDesde: string;                // relógio do abandono — 20 dias corridos
  encerradaAutomaticamente?: boolean; // encerrada pelo tempo, não por decisão
  motivoDeclinio?: 'interno' | 'mercado' | 'talento';  // só com status declinado (§7.5)
  entradaEm: string;                  // yyyy-mm-dd, automático
  prazoEm: string;                    // entrada + 5 dias úteis, automático
  pendencias: Pendencia[];            // obrigatório desde a v11 — a lista completa, não só abertas
  duplicadaDe?: string;               // rastro da duplicação — não é vínculo (§6.6)

  /* Escopo — o pedido em texto corrido, desde 03/08/2026 */
  escopo: string;                     // substituiu qtdReels/Videos/Posts/Cotas
  temEdicao?: boolean;                // os três tiques que destravam as colunas da Produção
  temConteudo?: boolean;
  temAudiencia?: boolean;
  veiculacaoEm?: string;              // yyyy-mm-dd; vazio = não agendado
  captacaoProducao?: TipoCaptacao_Producao;

  /* Produção — só se preenchem com o tique correspondente marcado */
  edicao?: TipoEdicao;
  formatoConteudo?: FormatoConteudo;
  alcanceAudiencia?: AlcanceAudiencia;
  custoProducao: string;              // Valor de Produção — texto livre

  /* Cliente — segmento e categoria NÃO estão aqui: são da marca */
  contatoCliente: string;             // sem coluna desde 03/08/2026; o campo segue no modelo
  captacaoComercial?: TipoCaptacao;   // sem coluna; ≠ captacaoProducao (filmagem)

  /* Time — as áreas de `AreaTalento`, com responsáveis E apoios */
  responsaveis: Partial<Record<AreaTalento, string[]>>;
  apoios?: Partial<Record<AreaTalento, string[]>>;  // contam como nomeados para acesso

  /* Financeiro 🔒 — valores em texto livre; parcelas é número, pep é código de ERP */
  valorProjeto, cache, comissaoGlobo, comissao, impostos, saving, pep: string;
  parcelas?: number;

  /* Jurídico 🔒 */
  tipoContratacao, numeroContrato: string;
  fechamentoEm?: string;              // marco de vigência — não se move depois de posto

  /* Links — texto, sem validação de formato */
  linkProposta, linkSalesforce, linkPastaOrcamento, linkPastaPlanejamento: string;

  /* Ingestão */
  entradaPor: EntradaPorOportunidade;
  idExterno?: string;                 // chave no sistema de origem
  recebidoEm?: string;
  revisada: boolean;                  // alguém conferiu o que a integração trouxe?
}
```

> **`AreaTalento` tem 10 áreas, e o Backlog usa todas.** Às 6 dos Talentos (Talent, Orçamento,
> GP, Audiência, Conteúdo, Produção) somaram-se as que respondem **por projeto**: Pagamento,
> Jurídico, Produtor Artístico (`artistico`) e Executivo. `areasDoTalento()` recorta as 6
> primeiras — é o que a página Talentos mostra; criar área nova exige decidir em qual lista ela
> entra. Mesmo tipo, mesmo seletor, mesmos candidatos vindos da equipe que atende a área: um time
> diferente por quadro seria a mesma pergunta respondida duas vezes.

> **Os campos fantasma morreram.** `veiculacao`, `captacao`, `formato`, `entregaveis`, `cotas`,
> `praca`, `alcanceEstimado`, `publicoAlvo`, `statusJuridico`, `segmento` e `categoria` — herdados
> do sistema antigo — não existem mais em `Oportunidade`. Segmento e categoria são da **marca**;
> os demais saíram nas auditorias de 02–03/08/2026, quando cada seção foi redefinida com a
> operação e nenhum tinha onde ser reaproveitado.

---

## 3. Pipeline

```
                              ┌──────── StandBy ────────┐
                              ↓                         │  (volta)
Entrada → Em Elaboração → Em Revisão ⇄ Ajustes           │
   ↑                       │  ↓                          │
   │                       │  Aguardando Feedback ──────┘
 SLA corre aqui            │            ↘ Negócio Fechado
                           │            ↘ Declinado
                           └──────────────↗   ↘ Encerrado
                    (Decl. Talento, desde 04/08/2026 — §7.5)
```

| Status | Cor | SLA corre? | Encerra? | Volta ao fluxo? |
|--------|-----|:----------:|:--------:|:---------------:|
| Entrada | `slate-500` | **sim** | — | — |
| Em Elaboração | `sky-500` | — | — | — |
| Em Revisão | `indigo-500` | — | — | — |
| Ajustes | `amber-500` | — | — | → Em Revisão |
| Aguardando Feedback | `violet-500` | — | — | — |
| StandBy | `yellow-500` | — | — | **→ Aguardando Feedback** |
| Negócio Fechado | `emerald-500` | — | **sim** | — |
| Declinado | `rose-500` | — | **sim** | — |
| Encerrado | `slate-400` | — | **sim** | — |

> **Dois retornos, não um.** `Ajustes` volta para Em Revisão — é o loop de correção. `StandBy`
> volta para Aguardando Feedback — é a retomada de uma pausa. Os dois existem porque o processo
> real não é uma linha reta, e forçá-lo a ser produziria registro falso.

### 3.1. A máquina de estados

**Há bloqueio de transição** — ao contrário do quadro de Contratos.

| De | Para |
|----|------|
| **Entrada** | Em Elaboração |
| **Em Elaboração** | Em Revisão |
| **Em Revisão** | Ajustes · Aguardando Feedback · **Declinado** (só pelo motivo Talento, §7.5) |
| **Ajustes** | Em Revisão |
| **Aguardando Feedback** | **Ajustes** · Negócio Fechado · StandBy · **Declinado** (em três motivos, §7.5) · Encerrado — **cinco destinos** |
| **StandBy** | Aguardando Feedback |
| **Fechado · Declinado · Encerrado** | — nada sai |

```
                       ┌──────────────┐
                       ↓              │ pede ajuste
Entrada → Elaboração → Revisão ⇄ Ajustes
                        │ ↓
                        │ Aguardando Feedback ⇄ StandBy
                        │      ↓
                        └→ Fechado · Declinado · Encerrado
                 (da Revisão, só Declinado — o talento recusou)
```

**O retorno do cliente abre cinco caminhos, e Ajustes vem primeiro.** *"Quero mudar isto"* é a
resposta mais comum, e é a única que mantém o projeto vivo — as outras quatro encerram ou pausam.

### StandBy é pausa, não desfecho

**Ele volta para Aguardando Feedback.** Enquanto era terminal, pausar equivalia a matar o projeto:
retomar exigia cadastrar de novo, perdendo o histórico e a data de entrada.

O efeito prático era pior que a limitação: quem sabia disso **deixava de usar o StandBy** e mantinha
o projeto em Aguardando Feedback, sujando o farol com uma espera que não era do cliente. Uma regra
que as pessoas contornam não protege nada — só esconde o que está acontecendo.

Volta para **Aguardando Feedback** e não para a etapa anterior: é de lá que ele saiu, e é lá que a
decisão continua pendente.

Três consequências que o teste trava:

| | |
|---|---|
| **Não tem `encerra`** | Continua contando como projeto vivo na lista e no farol |
| **Não é etapa ativa** | O relógio dos 20 dias não corre nele — pausa deliberada não é abandono |
| **Está no bloco de fechamento, sem ser desfecho** | O card exibe o selo **Pausa**, e `DESFECHOS_TERMINAIS` separa quem de fato encerra |

> ### `DESFECHOS` × `DESFECHOS_TERMINAIS`
>
> `DESFECHOS` é o que o bloco do cabeçalho mostra — quatro cards, incluindo StandBy, porque a
> pergunta que ele responde é a mesma: *o que saiu da fila de trabalho, e por quê*.
>
> `DESFECHOS_TERMINAIS` são os três que encerram de verdade. A distinção nasceu quando StandBy
> deixou de ser terminal: a asserção "todo desfecho é final" ficou vermelha e apontou que o bloco
> misturava duas coisas.

> **Por que aqui é diferente dos Contratos.** Lá qualquer status leva a qualquer outro, e é
> deliberado: a esteira jurídica varia caso a caso, e travá-la obrigaria a inventar passos.
>
> Aqui é o contrário. O Backlog **é** o processo: cada etapa existe porque a anterior terminou.
> Pular de Entrada direto para Negócio Fechado não é um atalho — é um registro de algo que não
> aconteceu. A restrição não protege o sistema, protege o **significado do dado**.

**A regra vale em dois lugares.** A interface oferece só os destinos válidos, e a mutação valida
de novo: uma tela é um convite, não uma trava. Repetir a checagem fecha o caminho de um componente
chamar o que a tela não deveria ter oferecido — o mesmo raciocínio das permissões.

Reafirmar o **mesmo** status sempre passa: é idempotência, não transição. Recusar quebraria
salvamentos repetidos.

### 3.2. Congelamento: Revisão e Aguardando Feedback

**Nessas duas etapas o projeto não se edita.**

Em Revisão o material está sendo analisado; em Aguardando Feedback já saiu para o cliente. Nos dois
casos existe uma **versão circulando fora do quadro** — mexer nos dados aqui faria a tela descrever
algo diferente do que foi enviado, e ninguém saberia qual das duas está certa.

```
Entrada · Elaboração · Ajustes            →  edita
Revisão · Aguardando Feedback · StandBy   →  CONGELADO
Fechado · Declinado · Encerrado           →  sem fluxo, sem edição
```

**StandBy congela pelo mesmo motivo, e por mais um.** Ele é a pausa de um projeto que **já estava
com o cliente** — só se chega nele a partir de Aguardando Feedback. O material lá fora continua o
mesmo, e editar durante a pausa faria a retomada partir de dados que ninguém conferiu.

### O status escapa do congelamento

Travar o fluxo junto prenderia o projeto para sempre — inclusive fechando o caminho de Revisão para
**Ajustes**, que é justamente como se corrige. Os dados congelam; o processo anda.

| | Congela? |
|---|:---:|
| Campos da linha | **sim** |
| Nome do projeto | **sim** |
| Responsáveis | **sim** |
| **Status** | não |
| Excluir | não |

### Para corrigir, mova para Ajustes

É o que o loop do processo existe para fazer: a correção fica registrada como **etapa**, não como
edição silenciosa de um material que já saiu.

### Congelar não pode virar prender

**Toda etapa congelada tem saída para onde se edita.**

| Congelada | Como se volta a editar |
|-----------|------------------------|
| **Revisão** | → Ajustes |
| **Aguardando Feedback** | → Ajustes |
| **StandBy** | → Aguardando Feedback → Ajustes |

O caminho de Aguardando Feedback para Ajustes existe porque **o cliente pede alteração** — e é a
resposta mais comum ao receber uma proposta. Sem ele, atender esse pedido exigiria declinar e
recadastrar, perdendo histórico e data de entrada: o mesmo problema que o StandBy sem volta causava.

Há um teste que trava essa invariante — **nenhuma etapa congelada é um beco**, em um ou dois
passos. Se uma mudança futura no fluxo fechar um desses caminhos, ele acusa antes de virar
problema na operação.

> ### Como esta regra apareceu
>
> Ao congelar o StandBy, um teste que passava começou a falhar. Não era o teste: era a regra
> revelando que, depois do envio ao cliente, o projeto não voltava a ser editável em lugar nenhum.
>
> A transição que faltava foi apontada pela operação na mesma conversa — *"mas o aguardando
> feedback não pode ter uma solicitação de ajuste?"*. O congelamento não criou o buraco; ele o
> tornou visível.

Na linha, um selo **Congelado** explica por que os campos não respondem ao clique. Sem ele, a linha
pareceria quebrada: a pessoa clicaria numa célula, nada aconteceria, e não haveria como distinguir
regra de defeito.

---

## 3.2. O que a tela mostra

O painel do status lista os destinos permitidos e, abaixo, **os demais em cinza, sem clique**.
Mostrar que existem — e que este não é o momento deles — ensina o fluxo; esconder faria a pessoa
procurar onde não há.

Em estado final, a etiqueta perde o clique e ganha um cadeado.

---

## 3.3. Encerramento automático — 20 dias

**Qualquer oportunidade parada mais de 20 dias numa etapa ativa é encerrada pelo sistema.**

Etapas ativas: Entrada, Em Elaboração, Em Revisão, Ajuste e Aguardando Feedback. Os quatro
desfechos ficam de fora — já acabaram.

### Dias corridos, não úteis

As duas réguas do quadro medem coisas diferentes:

| Régua | Unidade | Por quê |
|-------|---------|---------|
| **SLA de triagem** (5 dias) | Úteis | É um **compromisso de resposta**; contar corridos puniria quem recebe na sexta |
| **Abandono** (20 dias) | **Corridos** | É **abandono**, e abandono se mede em tempo real: um projeto parado há três semanas está parado há três semanas, tenha havido feriado ou não |

### `statusDesde` — o relógio

Campo novo, gravado a cada mudança de status. `entradaEm` diz quando a demanda **chegou**;
`statusDesde` diz há quanto tempo ela **travou onde está**. Sem o segundo, não há o que medir.

Dado antigo, anterior ao campo, cai para `entradaEm` — a melhor aproximação disponível.

### Quando roda

**Uma vez ao carregar o sistema**, não por rotina agendada. É a mesma escolha feita na
responsabilidade temporária das equipes: uma regra que depende de job tem um ponto de falha a
mais, e um projeto que deveria estar encerrado não pode seguir aberto porque o agendador caiu.

O custo é que a mudança só acontece quando alguém abre o sistema. Para arquivamento, é aceitável.

A função é **pura** (`aplicarEncerramentoAutomatico`): recebe a lista, devolve a lista nova e
quem mudou, sem escrever. Quem chama decide persistir — e é o que permite testar a regra sem
montar React nem banco. **É idempotente**: rodar duas vezes não muda nada além da primeira.

### Abandono ≠ decisão

Quem é encerrado pelo tempo recebe `encerradaAutomaticamente: true`. Distinguir importa: quem
olha um projeto encerrado precisa saber se foi escolha ou esquecimento, e reabrir um caso
esquecido é uma conversa diferente de reabrir um caso decidido.

Encerrar manualmente apaga a marca — foi decisão de alguém.

### O aviso antes

A linha mostra um contador quando faltam **8 dias ou menos**: âmbar até 4 dias, vermelho nos
últimos 3. Antes disso seria ruído; um aviso que aparece sempre não é lido.

Encerrada, a linha exibe **"Encerrada por inatividade"**.

---

## 4. SLA — 5 dias úteis

### 4.1. Por que dias úteis

O compromisso é operacional: quem recebe a demanda responde em 5 dias de **trabalho**. Contar
corridos faria uma demanda que chega na sexta ter metade do prazo consumido antes de alguém abrir
o sistema — e a régua deixaria de medir o que promete.

`somarDiasUteis` e `diasUteisEntre` são a mesma régua, e um teste trava isso: se as duas
divergirem, o prazo calculado e a contagem regressiva contam coisas diferentes.

### 4.2. O relógio para quando sai da triagem

O SLA mede o **tempo de resposta**, não o tempo de vida do projeto. Sair de `Entrada` cumpre a
promessa, mesmo que o projeto siga meses em elaboração. Deixar o relógio correndo pintaria de
vermelho tudo o que já foi resolvido — e um farol que está sempre vermelho não é lido.

### 4.3. O farol

| Cor | Condição |
|-----|----------|
| 🟢 Verde | mais de 2 dias úteis restantes |
| 🟡 Amarelo | 1 a 2 dias · "Vence hoje" quando zero |
| 🔴 Vermelho | prazo ultrapassado — "Atrasada Nd" |
| ⚫ Cinza | já triada, ou sem prazo |

O prazo nasce junto com a linha (`prazoDeTriagem`): SLA que depende de alguém lembrar de
preencher não é SLA.

**Na tela, o farol é uma barra de 5px na borda esquerda da linha** — não uma coluna nem um ponto
no fluxo (as duas formas anteriores disputavam a leitura com etiquetas e ícones que já estavam
lá). A cor viaja por `box-shadow: inset`, porque borda não acompanha célula congelada ao rolar
([09 §4](09_fundacoes_tecnicas.md)); no cinza a faixa é `transparent` — mantém o alinhamento sem
afirmar nada. **A dica da linha traz a data do prazo** e o estado por extenso: a barra sinaliza,
a data mora no hover.

---

## 5. O cabeçalho: o processo antes da tabela

Quem abre o Backlog vê primeiro **o fluxo**, depois os números de fechamento, e só então as
linhas. A ordem não é decorativa: uma tabela de 40 projetos sem o mapa do processo obriga cada
pessoa a reconstruir mentalmente em que ponto cada linha está.

```
┌ FLUXO DO PROCESSO ─────────────────────────┐ ┌ FINALIZAÇÃO ──────────────┐
│ 1.Início  2.Produção  3.Análise  ⟲Loop  4.│ │ Fechado 40  R$ 18.620.000 │
│  Entrada  Elaboração   Revisão  Ajustes ...│ │ StandBy 40  R$ 20.670.000 │
└────────────────────────────────────────────┘ └───────────────────────────┘
```

**As etapas são clicáveis e filtram o quadro** — o mapa é também a navegação. A ordem de recorte
é: etapa → filtro → busca, do mais grosso ao mais fino.

O bloco de Finalização soma `valorProjeto` por desfecho. Como o campo é texto livre, parte dele
pode não ser somável: o total mostra `+N?` ao lado quando há registros que ficaram de fora. **Um
total que esconde o que não leu convida a decisões erradas** — ver [`moeda.ts`](../src/utils/moeda.ts).

### 5.1. A busca

A busca varre **todas as colunas visíveis da grade** — desde a grade contínua não há "outra aba",
há a mesma tabela um scroll adiante, e o valor que casou está lá. O contrato (`testeBusca`):

- **Casa por campo, não por id de coluna**: o sufixo do id (`backlog:escopo:status` → `status`) é
  o mesmo em toda cópia espelhada — é o que "espelhar é a mesma coluna" quer dizer. Coluna oculta
  por equipe e seção sem permissão **não entram**: busca que varre campo oculto vira oráculo.
- **Três campos entram sempre**: `titulo` (a chave da linha), `observacoes` e `idExterno` (o
  rastro de quem chegou por integração).
- **Dois nunca entram**: `contatoCliente` (a coluna saiu em 03/08/2026 — buscar por dado que não
  se exibe é o mesmo oráculo, mesmo quando a coluna saiu por decisão de produto) e os **links**
  (ninguém procura por URL, e 120 caracteres casariam com termos curtos por acidente).
- **Pessoas por área visível, incluindo apoios**: o nome e o e-mail de quem responde — ou apoia —
  são buscáveis se a coluna daquela área está na tela. Buscar só responsáveis deixava metade da
  célula invisível para a busca.
- **Classificações entram pelo rótulo** (`VIU First`, `Decl. Mercado`); ausente não entra — não há
  rótulo para procurar. Segmento e razão social vêm do cadastro da marca e da ficha do talento.
- **Termos em E lógico, normalizados** (sem caixa, acento ou pontuação): "marina 2026" acha a
  linha em que os dois aparecem, em qualquer campo.

---

## 6. As oito seções da grade contínua

Faixa `bg-plano`, no padrão dos demais quadros — o mesmo tom da sidebar desde 12/08/2026 ([03 §1.0.1](03_padroes_ui.md)). Desde a grade contínua ([03 §3.5](03_padroes_ui.md))
as abas são **seções de uma tabela só**: as âncoras — seleção · Ações · Status · **Projeto** ·
Entrada · Talento — congelam à esquerda e aparecem **uma vez**; clicar na aba rola até a seção, e
rolar marca a aba. As colunas de cada seção são **a lista definitiva da operação** (imagem de
03/08/2026); a ordem das seções é a do trabalho, corrigida pela operação no mesmo dia — Demanda
abre, Links antecede o Time:

| # | Seção | Restrita | Colunas próprias | Responsável |
|---|-------|:--------:|------------------|-------------|
| 1 | **Demanda** | — | **Exclusivo · Origem do Talento** · Tipo de Input · Tipo de Projeto · Origem do Projeto · Tipo de Output · Impacto · Captação · Prioridade | — |
| 2 | **Escopo** | — | **Escopo** (texto livre) · Edição ✓ · Conteúdo ✓ · Audiência ✓ · Data de Veiculação | — |
| 3 | **Produção** | — | Edição · Conteúdo · Audiência · Valor de Produção | — |
| 4 | **Cliente** | — | Marca · Segmento · Categoria | — |
| 5 | **Jurídico** | 🔒 | Razão Social · CPF/CNPJ · Contrato · Nº Contrato · Data de Fechamento | — |
| 6 | **Financeiro** | 🔒 | Valor Projeto · Valor Cachê · Parcelas · PEP · Comissão Globo · Comissão · Imposto · Saving | — |
| 7 | **Links** | — | Proposta · Salesforce · Pasta de Orçamento · Pasta de Planejamento | — |
| 8 | **Time** | — | Talent Manager · Orçamento · GP · Conteúdo · Audiência · Produção · Produtor Artístico · Executivo · Pagamento · Jurídico | **as 10 áreas** |

Os ✓ do Escopo são **tiques que destravam** a coluna homônima da Produção ([00 §5.7](00_status_implementacao.md)).
Os trios Edição/Conteúdo/Audiência não são repetição: tique no Escopo, classificação na Produção,
pessoas no Time — mesmo rótulo, dados diferentes, mantidos por decisão da operação.

O botão **Exportar** na barra de ações baixa a tabela em **`.xlsx`** (desde 04/08/2026; era CSV) —
só as linhas do recorte atual e as colunas visíveis ([00 §5.9](00_status_implementacao.md)).

> ### O que mudou em 03/08/2026
>
> **Todas as colunas de pessoas foram para a aba Time**, a pedido da operação: *"quem está nesse
> projeto?"* é pergunta sobre o projeto inteiro, e respondê-la custava abrir seis abas. Isso reverte
> a decisão de que a área mora junto do assunto — o que se perde e por que se aceita está em
> [00 §5.7](00_status_implementacao.md).
>
> **Saíram sete abas.** *Agência* (a operação não vai usar; nunca teve colunas); *Talento* e
> *Entrega*, cujas colunas a lista realocou; *Conteúdo* e *Audiência* — que existiam para nomear as
> suas áreas e, sem as colunas de pessoas, ficariam idênticas uma à outra; e *Pagamento*, fundida
> no Financeiro quando a lista pôs Parcelas e PEP entre os valores. As **áreas** continuam vivas,
> com equipe e responsáveis.
>
> **Interveniência virou Exclusivo**, com o valor **invertido** no modelo inteiro. *Tipo de
> Talento* saiu: dizia o mesmo, em outras palavras. E as repetidas de verdade — Exclusivo e Marca
> na Demanda — saíram na dedup ([00 §5.9](00_status_implementacao.md)): numa tabela única, a cópia
> só gastava largura.

### 6.0.0. A primeira aba se chama Demanda

Ela se chamava **Escopo**, e o nome estava errado por dois motivos. Primeiro, ela não descreve o
escopo do projeto — descreve **o que se precisa saber para aceitar ou declinar**: quem pediu, para
qual marca, com qual talento, até quando. Segundo, "Projeto" já é o nome de uma coluna dela.

**Demanda** é a palavra que a operação já usava — *"data de cadastro da demanda"*, *"como a demanda
chegou"* — e cobre tanto o que ainda não foi aceito quanto o que já virou projeto. As alternativas
consideradas:

| | Por que não |
|---|---|
| **Lead** | Vocabulário de vendas, e anglicismo num produto em português. Descreve só a ponta inicial: uma linha em Elaboração ou Fechado não é lead |
| **Projeto** | Colidiria com a coluna Projeto — na tela e no código. E boa parte das linhas ainda não é projeto |

O ícone acompanhou: `Layers` (camadas) virou `Inbox` — é a caixa onde a demanda chega, e é o gesto
da aba: triar o que entrou.

**O id mudou junto**, de `backlog:escopo` para `backlog:demanda`. Isso contraria a regra de ids
estáveis ([§6](#6-as-oito-seções-da-grade-contínua)), e a exceção se justifica: existe agora uma aba **Escopo**
separada, e deixar `backlog:escopo` apontando para "Demanda" seria uma armadilha permanente para
quem lesse o código depois. Custou uma versão de persistência; manter custaria mais.

### A ordem é a do trabalho

Ela acompanha o projeto, não o organograma — e **abre pela Demanda**, por correção direta da
operação no mesmo 03/08/2026 (*"devemos começar por demanda"*): a Demanda é a triagem, e o quadro
existe para triar.

```
  tria           o que se pede e como     de quem é    formaliza e cobra    referencia   quem faz
┌─────────┐ ┌──────────────────────┐ ┌───────────┐ ┌───────────────────┐ ┌──────────┐ ┌──────┐
 Demanda     Escopo → Produção        Cliente       Jurídico               Links        Time
             (os tiques destravam)                  Financeiro
```

| Bloco | Seções | A pergunta |
|-------|--------|-----------|
| **Tria** | Demanda | Aceitar ou declinar — e abre com o **vínculo do talento** (Exclusivo, Origem), que é a primeira coisa que se confere |
| **O que se pede, e como** | Escopo · Produção | Coladas de propósito (04/08/2026): os tiques do Escopo destravam as colunas homônimas da Produção — lado a lado, a relação se lê sem rolar |
| **De quem é** | Cliente | O lado da marca: Marca, Segmento e Categoria, do cadastro dela |
| **Formaliza e cobra** | Jurídico · Financeiro | Primeiro o que assina, depois o que se cobra — ordem da operação |
| **Referencia** | Links | Proposta, Salesforce e pastas — antes do Time, por escolha da operação |
| **Quem faz** | Time | As pessoas das 10 áreas, numa tela só — fecha porque é a única seção que não fala do projeto |

Quem rola a grade em sequência percorre o projeto. **A ordem é especificação da operação** e está
travada em `testeColunas` — não é detalhe de layout que se reorganiza por conveniência.

### Largura por conteúdo, e o layout é fixo

Cada coluna declara a própria largura **em pixels** — no Backlog o contrato exige `largura`
inteira **entre 60 e 400px** em toda coluna (`testeColunas` trava; o fallback `peso × 11` de
`larguraDaColuna` fica para quem consultar coluna sem o campo), medida contra um seed com os dados
mais longos que a operação escreve. O invariante substituiu a antiga soma de pesos 82, aposentada
em 04/08/2026: largura é decisão sobre o dado, não sobra de proporção. A tabela usa
`table-layout: fixed` com a soma das larguras declaradas — e isso não é estilo, é **correção**: no
layout automático o navegador alargava qualquer coluna cujo conteúdo mínimo não coubesse, o `left`
acumulado das congeladas ficava curto, e a Talento deslizava por cima da Entrada ao rolar.

`testeColunas` confere rótulo a rótulo que a maior palavra de cada cabeçalho cabe na largura
declarada (`larguraDaColuna`) — aumentar um rótulo ou apertar uma coluna derruba a suíte antes de
alguém ver o nome "comido" na tela.

### O scroll e a aba concordam

Clicar na aba rola até a seção; rolar marca a aba. Os dois usam **a mesma régua**: `inicioDaSecaoPx`,
a soma das larguras declaradas no catálogo — com `table-layout: fixed` a largura real **é** a
declarada, então a posição é exata por construção (medir `offsetLeft` do `<th>` parecia mais
seguro e era o contrário: o clique parava perto, não emparelhado — reporte da operação,
04/08/2026). Os detalhes que os testes travam:

| Detalhe | Por quê |
|---------|---------|
| **Clamp ao limite físico** do scroll | As seções do fim pedem um destino que o navegador nunca alcança; sem o clamp, o observer ficaria surdo esperando uma chegada impossível |
| O observer devolve o controle quando a animação **assenta no destino (±2px)** | Os 600ms fixos da primeira versão eram mais curtos que o `smooth` de uma travessia longa — a aba piscava na seção intermediária |
| **Rede de 2s** | Se o navegador nunca chegar ao destino, o observer é solto mesmo assim |
| Fora do fim, a ativa é a última seção que **passou da borda** do congelado, com 8px de tolerância | Medir a "mais visível" faria a aba piscar entre duas no meio da rolagem |
| **No fim do scroll, a última seção é a ativa** | Ela começa perto do limite direito e o corte nunca a alcançaria — rolou até o fim, está olhando para ela |
| O fundo da aba ativa é um elemento compartilhado (`layoutId`) | Quando o scroll troca a seção, o realce **desliza** de uma aba à outra em vez de piscar |

### Ordenar segue a ordem da operação

Clicar num cabeçalho ordenável cicla **ascendente → descendente → sem ordenação**. Campos com
ordem própria usam `ORDEM_CANONICA`: o `status` ordena **pela ordem do mapa do processo**
(`ETAPAS_FLUXO` + `DESFECHOS` — Ajuste antes de Aguardando Feedback, como o mapa desenha; ordenar
pelo catálogo faria a coluna discordar do mapa logo acima dela), `prioridade` pela urgência.
Valor **fora da escala vai para o fim**, em vez de fingir que é o primeiro; `exclusivo` ordena
"sim" antes de "não" — mais útil que `false` antes de `true`. O resto compara como texto em
pt-BR. Rolar para uma seção que **não tem** a coluna ordenada apaga a ordenação — exceto pelo
`titulo`, que existe em toda seção. `testeOrdenacao` cobre o conjunto.

### Zebra, realce e seleção

A zebra vem do **índice** da linha, não de `nth-child` — filtro e ordenação mudam quem é par. A
prioridade dos fundos é **selecionada > a conferir > zebra**: quem marcou o checkbox precisa ver a
marca vencer o realce âmbar de "veio de integração e ninguém conferiu" (§9.2), que por sua vez
vence a zebra. As classes vivem no `index.css`, porque precisam vencer o fundo da linha.

**Seleção em lote:** o botão alterna **"Marcar Visíveis" / "Desmarcar Todas"**, e a ação em lote
opera sobre a **interseção** da seleção com o que está visível — o recorte pode ter mudado desde a
marcação, e agir sobre linha que a pessoa não está vendo seria agir às cegas. A exclusão em lote
pede `confirm`, nomeando quantas linhas vão junto.

### O estado da página

- **A grade abre na Demanda** — a primeira seção da ordem da operação.
- **O mapa do fluxo é recolhível, e a escolha persiste** — quem trabalha com ele fechado não o
  reabre a cada F5.
- **"Novo projeto" força o recorte para Entrada e limpa a busca**, e a linha nasce com o nome em
  edição ("Sem título" selecionado — digitar substitui). A linha nova nasce em Entrada e não
  apareceria sob outro recorte; desfazer o recorte inteiro, como era antes, tirava a pessoa do
  lugar onde estava trabalhando.

### A exportação — `.xlsx` de verdade

O botão **Exportar** baixa a grade em **`.xlsx` real** desde 04/08/2026 — a primeira versão era
CSV com BOM e `;`, que o Excel brasileiro abria mas **não era** Excel, e a operação pediu o
formato de verdade. O contrato ([`exportacao.ts`](../src/utils/exportacao.ts)):

| Decisão | Motivo |
|---------|--------|
| SheetJS por **`import()` dinâmico** — ~430 kB só no clique | A página não paga pela biblioteca que a maioria das sessões não usa |
| Interop CJS: `const XLSX = modulo.default ?? modulo` | O pacote é CommonJS e, conforme o empacotador, os exports vêm na raiz **ou** em `default` — sem a guarda, `XLSX.utils` vem `undefined` e o clique falha em silêncio (foi o "não está exportando" reportado em 04/08/2026) |
| Arquivo **"Backlog de Agenciados - dd-mm-aaaa.xlsx"**, aba **"Backlog de Agenciados"** | Na pasta Downloads, a data no nome distingue a planilha de ontem da de hoje sem abrir nenhuma |
| Larguras `wch` pela **maior célula**, piso 10 e teto 48 | Sem o teto, um Escopo de parágrafo atravessaria o monitor de quem abre |
| Erro visível por `window.alert` | Falha silenciosa foi o defeito original — se a biblioteca não carregar, a pessoa fica sabendo |
| Sai **o recorte da tela**: linhas filtradas, colunas visíveis, na ordenação atual | Exportar mais seria vazamento — a planilha viraria o caminho para ler coluna oculta e aba não liberada |
| Valores como **rótulo de leitura** (`VIU First`, não `viu_first`); datas em pt-BR | Quem recebe a planilha não decorou o vocabulário do código |
| Colunas de pessoas exportam **responsáveis e apoios**, por nome | É o que a célula mostra |
| Botão **desabilitado com a lista vazia** | Uma planilha só de cabeçalho não responde nada |

A montagem da matriz (`montarMatriz`/`largurasDaMatriz`) é pura; `testeExportacao` faz a
**ida-e-volta com a biblioteca real** — gera o arquivo e o relê, conferindo célula a célula.

### As duas restritas — sem cadeado na aba

As seções restritas **não** exibem cadeado na faixa de navegação. Quem não tem acesso não as vê;
para quem tem, o ícone marcava toda visita a Financeiro e Jurídico como exceção.

A restrição continua visível onde importa: na dica da aba, na configuração por equipe
([04 §8](04_pagina_equipes.md)) e no **borrão da célula** ([07 §3](07_visoes_e_relacoes.md)), que é
onde ela de fato muda o que se pode fazer.

> **O cadeado permanece em dois lugares**, e nos dois ele qualifica um estado, não um lugar: o selo
> **Congelado** na linha, e o ícone de "você não responde por esta oportunidade" na coluna Ações.

| Seção | Por que é fechada por padrão |
|-------|------------------------------|
| **Financeiro** | Valores do projeto, cachê, comissões, parcelas e PEP |
| **Jurídico** | Tipo de contratação, status e número do contrato |

Eram três: a **Pagamento** era restrita pelos mesmos motivos e foi fundida no Financeiro — a
liberação `backlog:financeiro` passou a cobrir Parcelas e PEP. As demais seções seguem o acesso do
quadro ([07 §2](07_visoes_e_relacoes.md)).

### A seção Cliente — e o que "espelhar" significa hoje

Depois da grade contínua, "espelhada" sobrou para **as âncoras**: Status, Entrada e Talento
existem uma vez por seção no catálogo, com o mesmo `field`, o mesmo `campo` e a **mesma largura e
posição** — é o que permite tomá-las da primeira seção visível e congelá-las. `testeColunas` trava
isso seção a seção; se divergirem, a grade despacharia para outro componente e a edição numa aba
deixaria de aparecer na outra.

Todo o resto aparece **uma vez só** — a dedup de 03/08/2026 continua valendo; o que mudou na
ordenação por imagem de 04/08/2026 foi o **endereço**: o lado do talento (Exclusivo, Origem)
voltou para a frente da Demanda, porque vínculo é informação de decisão e a costura com o bloco
congelado (que termina em Talento) fica visível no primeiro pixel rolante. A Cliente ficou com o
lado da marca — Marca, Segmento e Categoria, os três lendo e escrevendo no cadastro dela.

#### As colunas que leem o cadastro da marca

| Coluna | Onde o dado mora | Por quê |
|--------|------------------|---------|
| **Segmento** | `Marca.segmento` | Setor da marca — Bebidas, Varejo, Financeiro |
| **Categoria** | `Marca.categoria` | Recorte dentro do segmento — Refrigerantes dentro de Bebidas |

> **Contato e Deadline saíram em 03/08/2026**, a pedido da operação. A aba ficou com o que
> **descreve o cliente**, e nada mais: o prazo de triagem é pergunta de agenda e vive nas abas onde
> ela se faz. `Oportunidade.contatoCliente` continua no modelo, agora **sem coluna** — pendência
> registrada em [00 §5.7](00_status_implementacao.md). Os contatos seguem em `Marca.contatos`, que
> é de onde a coluna os lia.

> **A coluna Captação foi removida** em 02/08/2026, a pedido da operação. O campo
> `captacaoComercial` e o catálogo `CAPTACOES` continuam no código, como os demais campos de abas
> ainda por definir — se ela voltar, volta pronta, e enquanto isso não custa nada.

#### Segmento e categoria são da marca, não da linha

A Coca-Cola é de Bebidas em toda linha em que aparecer. Guardar o segmento na oportunidade faria a
mesma marca ser Bebidas numa linha e Varejo noutra — exatamente o problema que a lista de marcas
existe para impedir (§6.0.1).

É a mesma decisão já tomada na interveniência, que vem da ficha do talento: **um dado com um dono
só não tem como divergir de si mesmo.**

> **Havia `segmento` e `categoria` em `Oportunidade`**, herdados do modelo antigo, preenchidos no
> seed. Saíram nesta rodada. Eram duplicação silenciosa: nada garantia que o segmento da linha
> batesse com o da marca, e nenhuma tela mostrava a divergência.

**A célula escreve de volta no cadastro da marca.** Quem descobre o segmento no meio do
preenchimento não precisa de outra tela — e a marca sai da pendência pelo mesmo gesto. A dica avisa
o alcance: *"Do cadastro de Coca-Cola — vale para todos os projetos da marca"*. Sem esse aviso, a
pessoa acharia que está preenchendo uma linha.

A lista do painel nasce dos **valores já usados**, não de uma tabela fixa que ninguém manteria.
Quem escreve "Bebidas" na segunda marca escolhe da lista em vez de digitar — e "bebidas" com
minúscula deixa de existir como um segundo setor.

#### Sem marca, a célula explica em vez de aceitar

Segmento e Categoria dependem da marca. Enquanto ela não estiver definida, as duas mostram
`—` com a dica *"Escolha a marca primeiro: este dado vem do cadastro dela"*. Aceitar texto ali
guardaria um dado que se perderia no instante seguinte.

### A aba Talento — registro histórico (saiu em 03/08/2026, v10)

**A aba não existe mais.** Suas colunas foram realocadas na rodada de 03/08/2026: **Exclusivo** e
**Origem do Talento** hoje abrem a seção **Demanda** (§6.0) — vínculo é informação de decisão —,
**Talent Manager** foi para a seção **Time**, e **Tipo de Talento** morreu de vez: dizia o mesmo
que Exclusivo, em outras palavras, saindo da mesma ficha.

As decisões nascidas aqui **continuam valendo nas colunas atuais**:

- **Tipo e origem vêm da ficha** — o terceiro caso do padrão "dado que descreve uma entidade mora
  na entidade" (interveniência ← talento, segmento ← marca). O vínculo não muda de projeto para
  projeto.
- **Origem é editável da grade e grava na ficha** (é dado que costuma faltar, e quem preenche o
  Backlog sabe como o talento chegou — a dica avisa: *"Da ficha de Marina Duarte — vale para todos
  os projetos dela"*); **o vínculo, não**: trocá-lo é decisão de cadastro, com consequência
  contratual, e se muda na ficha.
- **Os três estados da célula de origem** seguem na Demanda: valor (a ficha respondeu) · `—`
  *"não classificado"* (ficha sem o campo — resolve-se ali) · `—` *"ainda não tem ficha"*
  (resolve-se na coluna Talento ou na página Talentos). O seed guarda os três: Marina e Rafael com
  origem, Helena sem, Bruno Salles sem ficha.
- **A coluna chama "Talent Manager", não "Resp. Talent Manager"** — a coluna nomeia a área; que
  ali estão as pessoas que respondem por ela é o que a coluna faz, não parte do nome.

### A seção Escopo — o que foi pedido

O Escopo diz **o que o cliente pediu**, o que o projeto **inclui**, e quando vai ao ar:

| Coluna | O que é | Tipo |
|--------|---------|------|
| **Escopo** | O pedido do projeto, como ele chegou | texto livre, 360px — a coluna mais larga do quadro |
| **Edição ✓** | O projeto inclui edição? | tique — destrava a coluna Edição da Produção |
| **Conteúdo ✓** | Inclui produção de conteúdo? | tique — destrava a coluna Conteúdo da Produção |
| **Audiência ✓** | Tem meta de audiência? | tique — destrava a coluna Audiência da Produção |
| **Data de Veiculação** | Quando vai ao ar | data |

> **A coluna Captação mudou de endereço:** está na **Demanda** desde 04/08/2026 (ordenação por
> imagem da operação) — como o material será gravado é informação de decisão. Os valores seguem os
> mesmos: Estúdio · Externa · Remota · Material do talento · Sem captação.

#### Os tiques: desmarcar apaga, e avisa

Cada tique destrava a coluna homônima da Produção (`ESCOPO_DESTRAVA` é a fonte do par).
**Desmarcar apaga o valor correspondente da Produção, com `confirm`** nomeando o que vai ser
perdido — guardar um dado que a tela afirma não existir é o estado impossível que `qaBacklog`
procura (`comValorSemTique`), e o Power BI leria o valor órfão sem saber que foi renegado. Sem o
tique, a célula da Produção aparece **travada, com o ícone de bloqueio (`Ban`)** e a explicação na
dica: "este projeto não tem isso" é resposta diferente de "ninguém preencheu ainda".

> #### O defeito que impedia desmarcar — corrigido em 12/08/2026
>
> Reporte da operação: *"se eu colocar algum dado, eu não consigo desabilitar"*. E era exato — com
> valor preenchido, o clique no tique **não fazia absolutamente nada**: sem diálogo, sem erro, sem
> reação.
>
> A causa era uma constante declarada fora de ordem. O catálogo de opções (`LISTAS`) vivia **no
> meio** do render da célula, depois do bloco dos tiques e antes do bloco das listas — e o de cima
> a alcançava na *temporal dead zone*, lançando `ReferenceError` justamente ao montar a frase
> "isto apaga X da coluna Y". Sem valor preenchido o código não chegava a tocá-la, e por isso
> desmarcar funcionava nesse caso.
>
> **O erro era invisível porque a função virou `async`** quando a confirmação deixou de ser
> `window.confirm` (11/08/2026): exceção em função `async` sem `catch` vira `unhandledrejection` —
> não aparece na tela, não quebra o render, não deixa rastro para quem está usando. O defeito
> nasceu com a troca do diálogo e sobreviveu a uma suíte inteira verde.
>
> A correção foi mover o catálogo para o escopo do módulo (`OPCOES_DA_COLUNA`), onde nenhuma ordem
> de declaração o alcança antes da hora — e a duplicação sumiu junto: os dois blocos que o usavam
> passaram a ler a mesma fonte.
>
> **A lição:** função `async` em manipulador de evento engole exceção. Onde o gesto depende dela, o
> teste precisa exercitar o **caminho com dado**, e não só o caminho vazio — foi exatamente a
> diferença entre uma suíte verde e um botão morto.

#### De quatro números para um texto — 03/08/2026

A aba guardava **Reels · Vídeos · Post · Cotas**: quatro contagens, estreitas de propósito. A
operação pediu a troca, e o motivo é simples de ver lado a lado:

| Como era | Como é |
|----------|--------|
| `3 · 1 · 2 · 2` | *"3 reels, 1 vídeo de 60s, 2 posts e 2 cotas — uso de 6 meses"* |

**Um briefing real não cabe em quatro números.** O que a operação precisa registrar é o pedido como
ele chegou, e os campos numéricos obrigavam a jogar fora tudo que não fosse contagem — prazo de uso,
duração, condição de entrega.

> **O que se perde:** a soma automática de peças (`totalDePecas` foi removida). Decisão consciente
> do produto: contagem exata é pergunta do Power BI sobre o **contrato fechado**, não do quadro que
> ainda está negociando. Se voltar, nasce da lista de entregáveis do contrato.

O seed foi migrado, não descartado: as seis linhas que tinham quantidades ganharam o texto
equivalente. O dado não se perdeu na troca de forma.

#### Uma área de texto, não um campo de uma linha

É o **único** campo do quadro que guarda texto corrido, e por isso a única célula que edita em
`<textarea>`:

| | Célula comum | Escopo |
|---|---|---|
| Editor | `<input>` | `<textarea>` de 3 linhas |
| **Enter** | confirma | **quebra linha** |
| Confirma com | Enter, ou sair do campo | `Ctrl`/`⌘`+Enter, ou sair do campo |
| Fora de edição | corta em 1 linha | quebra em até 3, preservando os parágrafos |

Num campo de uma linha o briefing corre para o lado e o começo some pela esquerda enquanto se
digita — a pessoa perde a noção do que já escreveu. E Enter confirmando no meio da segunda frase
tornaria o campo inútil para o que ele existe.

#### Duas captações, dois ofícios

O produto tem duas coisas chamadas "captação". Elas convivem porque são **perguntas diferentes**,
e o nome interno de cada uma foi escolhido para que ninguém preencha uma achando que preenche
outra (o `captacao` texto livre do modelo original morreu na auditoria de 02/08/2026 — com
`captacaoProducao` existindo, dois campos guardavam a mesma coisa e um deles estava morto):

| Coluna | Campo | Pergunta |
|--------|-------|----------|
| Demanda · **Captação** | `captacaoProducao` | Como o material será gravado |
| *(sem coluna hoje)* | `captacaoComercial` | Como o negócio chegou |

A ordem de `CAPTACOES_PRODUCAO` vai do mais caro ao mais barato — estúdio pede equipe e diária;
material do talento não pede nenhum dos dois.

#### Data de Veiculação não é o prazo de triagem

| | Prazo de triagem (`prazoEm`) | Data de Veiculação |
|---|---|---|
| O que é | Entrada + 5 dias úteis | Quando vai **ao ar** |
| Origem | Automático | Digitado |
| Farol | Sim — a faixa colorida da linha (§4.3) | Não |

Uma data de veiculação no futuro é só uma data futura. Atrasar a triagem é problema; por isso só
ela tem farol.

> **Guarda em ISO, mostra em pt-BR.** A tela lê `15/09/2026`; o dado guarda `2026-09-15`. Guardar
> no formato de exibição faria a ordenação virar alfabética — e `01/12` viria antes de `02/01`.

---

### A aba Entrega — registro histórico (saiu em 03/08/2026, v10)

**A aba não existe mais.** Suas duas colunas próprias — **Tipo de Output** e **Impacto** — foram
para a **Demanda** (§6.0): são informação de decisão, e quem vai aceitar ou declinar quer vê-las
sem trocar de aba. Sem elas, a aba ficava só com as espelhadas de identificação. As decisões
seguem valendo onde as colunas estão:

- `output` era **texto livre** no modelo antigo e virou lista fechada pelo motivo de sempre: a
  pergunta é de contagem. A ordem é a do **esforço crescente**, do post à presença física.
- **Impacto não é prioridade.** Prioridade é **urgência** — o que se faz primeiro. Impacto é
  **tamanho** — o que muda o ano. Por isso as cores são deliberadamente diferentes: prioridade usa
  a escala quente (rosa/âmbar), impacto a fria (violeta/azul) — e as duas convivem lado a lado na
  Demanda, onde "Alta" vermelha junto de "Alto" vermelho faria as escalas parecerem a mesma medida.

### A seção Produção — como o material é feito, e por quanto

**Quatro colunas próprias, nenhuma de pessoas** — o Time reúne todas as colunas de pessoas do
quadro:

| Coluna | O que é | Campo |
|--------|---------|-------|
| **Edição** | Interna · Talento · Agência · Produtora — *quem* edita | `edicao` |
| **Conteúdo** | Publieditorial · Review · Tutorial · Depoimento · Entretenimento · Institucional — o formato editorial | `formatoConteudo` |
| **Audiência** | Massa · Amplo · Segmentado · Nicho — o porte do alcance | `alcanceAudiencia` |
| **Valor de Produção** | Quanto se gastou — texto livre | `custoProducao` |

As três primeiras **só aceitam valor com o tique correspondente do Escopo marcado** (§ acima) —
sem ele, a célula aparece travada e explica por quê. Conteúdo e Audiência **não são** as antigas
abas de mesmo nome: aquelas nomeavam áreas de pessoas; estas guardam dado do projeto — a
coincidência é do assunto, não da função. E **Audiência não é Impacto**: impacto mede quanto o
projeto pesa para a casa; alcance, quanta gente a peça atinge — um projeto pequeno pode falar com
a massa.

**Valor de Produção** vem depois porque fecha a mesma pergunta em sequência: como se faz, e por
quanto. É **texto livre** como os demais valores — a operação escreve "R$ 12.000", "12 mil" e "a
definir" no mesmo campo, e recusar qualquer um faria o dado não entrar.

> **Atenção ao acesso.** Produção **não é uma seção restrita**, e Valor de Produção é a primeira
> coluna de dinheiro fora das duas fechadas (Financeiro, Jurídico). Quem enxerga a seção enxerga o
> custo. Se isso não for desejado, há duas saídas: fechar a coluna por equipe — a permissão já é
> por coluna ([07 §3](07_visoes_e_relacoes.md)) — ou mover o campo para o Financeiro. **A decisão
> é da operação**; o estado atual é o que foi pedido.

A ordem de `TIPOS_EDICAO` vai do que a casa controla ao que ela não controla — que é a mesma ordem
em que o risco de prazo cresce.

> **Toda coluna de pessoas declara a própria área no catálogo** — `{ id: 'backlog:time:gp',
> label: 'GP', area: 'gp', … }`. A regra nasceu quando Produção e GP dividiram uma aba (o mapa
> "uma área por aba" só renderizaria a primeira) e sobreviveu à mudança das pessoas para o Time,
> onde hoje **dez colunas de área dividem a mesma seção**. O mapa antigo foi removido de vez em
> 02/08/2026 — a verificação de fim de dia o encontrou com uma entrada já errada (`juridico → gp`).
> Retaguarda que ninguém consulta é onde o próximo defeito se esconde. Orçamento é a exceção
> nomeada, com célula própria e papéis.

> **O `EtiquetaSelect` nasceu aqui.** Impacto tem o comportamento de Prioridade com outra escala de
> cor. Em vez de duplicar o componente, ele foi generalizado — e `PrioridadeSelect` virou um
> envelope fino sobre ele. Continua existindo com nome próprio porque é assim que a coluna se chama
> em toda a base ([03 §10](03_padroes_ui.md)).

### A seção Time — as dez áreas numa tela só

Criada em **03/08/2026**, a pedido da operação. Reúne todas as colunas de pessoas do quadro; as
demais seções ficaram só com o assunto delas.

| Coluna | Área | Candidatos vêm de |
|--------|------|-------------------|
| **Talent Manager** | `talent` | equipe da área de Talent |
| **Orçamento** | *(sem `area`)* | equipe de Orçamento — célula própria, com papéis |
| **GP** | `gp` | equipe de GP |
| **Conteúdo** | `conteudo` | equipe de Conteúdo |
| **Audiência** | `audiencia` | equipe de Audiência |
| **Produção** | `producao` | equipe de Produção |
| **Produtor Artístico** | `artistico` | equipe da área — cuida do que se vê na tela |
| **Executivo** | `executivo` | equipe da área — viabiliza a filmagem: equipe, agenda, locação |
| **Pagamento** | `pagamento` | equipe de Pagamento |
| **Jurídico** | `juridico` | equipe do Jurídico |

As dez na ordem em que o projeto passa por elas, e não em ordem alfabética: quem lê a linha da
esquerda para a direita percorre o caminho do trabalho. **Produtor Artístico e Executivo** vêm
logo depois da Produção, nesta ordem: primeiro quem responde pelo todo, depois as metades — numa
produção pequena é a mesma pessoa nas três colunas; o modelo não obriga a diferença, só permite
registrá-la.

**Todas declaram `area`, inclusive Orçamento** — desde 11/08/2026. Era a única exceção, com
célula própria; quando os papéis de responsável e apoio passaram a valer em toda coluna de pessoas
(§6.0.3), a exceção perdeu o motivo e saiu. A área é o que leva a coluna ao painel com papéis.

#### A decisão que ela reverte

Cada aba trazia o responsável da **sua** área — quem abria Produção via o que produzir *e quem
produz*. O argumento era bom, e o código dizia com todas as letras que as pessoas não deveriam ir
"para uma aba separada de time".

A operação pediu o contrário, e o motivo dela é mais forte na prática: *"quem está nesse projeto?"*
é pergunta sobre o projeto inteiro, não sobre uma área de cada vez. Respondê-la custava abrir seis
abas e montar a lista de cabeça.

> **O que se perde:** a área deixa de aparecer ao lado do que ela decide. Quem abre Produção precisa
> de um clique a mais para saber quem produz — o inverso do custo anterior, para uma pergunta que se
> faz menos vezes. Registro completo em [00 §5.7](00_status_implementacao.md).

#### O que aconteceu com Conteúdo e Audiência

**Saíram.** As duas existiam para nomear as suas áreas: fora as colunas de pessoas, tinham só as
cinco espelhadas de identificação. Com as pessoas aqui, ficariam **idênticas uma à outra** — duas
entradas na barra levando à mesma tela.

As **áreas** continuam vivas em `AreaTalento`, com equipe, responsáveis, permissão e coluna própria
nesta aba. O que mudou foi onde se olha para elas.

> Elas eram o exercício do que a aba Produção construiu — o nome da coluna coincidia com o da aba, e
> antes de a coluna declarar a própria área isso funcionava por coincidência. A regra sobreviveu à
> remoção: **na seção Time são dez colunas de área na mesma tela**, e nenhuma poderia herdar a área
> da aba. `testeColunas` verifica que **nove declaram a sua** — Orçamento é a exceção nomeada, com
> célula própria e papéis.

### 6.6. Um projeto, mais de um talento — duplicar

**A pergunta:** um projeto com dois talentos é uma linha com dois nomes, ou duas linhas?

#### Dois nomes numa célula não funciona

E o motivo não é estético. Seis colunas do quadro perdem a resposta única:

| Coluna | Por que não comporta dois |
|--------|---------------------------|
| **Exclusivo** | Deriva do talento. Com um exclusivo e um não-exclusivo, qual é? |
| **Origem do Talento** | Vem da ficha — de qual ficha? |
| **Valor Cachê** | É por pessoa |
| **PEP · Parcelas** | Pertencem ao contrato daquela pessoa |
| **Talent Manager** | Quem responde por um talento não responde pelo outro |

#### Duas linhas, e **sem vínculo entre elas**

A alternativa considerada era um **grupo**: linhas irmãs que se movem juntas, editam juntas, e
contam como um projeto só nos cards.

**A operação escolheu o contrário:** cada talento é uma negociação própria, com contrato e cachê
próprios. Um grupo traria regras de sincronização para um caso que não pede sincronia — e cada
regra dessas é uma pergunta a mais ("este campo é do grupo ou da linha?").

> **O custo aceito, explicitamente:** se o briefing mudar, edita-se cada linha. Se o projeto for
> declinado, movem-se todas. Nada avisa se uma ficar para trás.

#### O gesto pergunta antes — 11/08/2026

Pedido da gestão, e a primeira leitura é que não faria falta: duplicar não destrói nada. O que
mudou essa leitura foi **onde o botão mora** — encostado na lixeira, na coluna congelada que
acompanha a rolagem. Errar o alvo por um ícone é fácil, e o resultado aparece **no topo da lista**,
fora da vista de quem estava rolando lá embaixo. A linha extra só é descoberta depois, por outra
pessoa, sem ninguém saber se é engano ou projeto de verdade.

A pergunta é também o único lugar onde cabe dizer **o que a cópia leva** — informação que antes
vivia só na dica do botão e nesta seção. E quando o projeto está num desfecho terminal, ela avisa
que a cópia começa em Entrada, porque é a única parte do comportamento que surpreende.

Padrão do diálogo em [03 §8.1](03_padroes_ui.md). Cancelar não cria nada; o teste que garante isso
é `duplicar pergunta antes` em [`testes-ui/confirmacao-e-desfazer.test.tsx`](../testes-ui/confirmacao-e-desfazer.test.tsx).

> **Duplicar entrou no desfazer junto.** `Ctrl+Z` remove a cópia ([03 §8.2](03_padroes_ui.md)) —
> com uma ressalva: a linha nova abre com o painel de talento no ar, e enquanto o cursor está na
> busca o atalho pertence ao campo. Fecha-se o painel, e aí sim.

#### O que a duplicação herda, e o que não

O gesto é um botão na coluna Ações. Ele copia **o trabalho de digitar** — não o vínculo, não a
negociação.

| Vem junto | Fica vazio | Por quê |
|-----------|-----------|---------|
| Marca, classificações, escopo | **Talento** | É o que muda — e o motivo do gesto |
| Links, observações, responsáveis | **Cachê, comissões, imposto, saving, custo** | Valor é por negociação. Um número copiado **parece conferido**, e ninguém revisa o que já está preenchido |
| Contato do cliente | **PEP, parcelas, nº do contrato, fechamento** | Pertencem a um contrato que ainda não existe |
| | **`idExterno`** | É a chave que impede a integração de trazer a mesma oportunidade duas vezes. Copiá-la faria duas linhas disputarem a mesma origem |
| | **Motivo do declínio, encerramento automático** | Um desfecho herdado é uma decisão que ninguém tomou |
| | **Pendências** | A espera é da negociação antiga — a nova nasce com `pendencias: []`; herdar um relógio correndo cobraria da linha nova uma resposta que ninguém pediu para ela |

**As datas recomeçam.** Entrada, `statusDesde` e o prazo de triagem são da linha nova — o relógio
dela começa agora. **E a duplicada nasce `revisada: true`**: quem duplicou estava olhando para a
linha, que é exatamente o que a marca de conferência atesta.

**A linha nova abre com o Talento em edição.** Ele é o que muda — e o motivo do gesto; abrir a
célula pronta para digitar poupa o clique que toda duplicação faria em seguida.

#### O status acompanha, salvo quando é final

Se o projeto está em Elaboração e alguém lembra do segundo talento, a linha nova está no mesmo
ponto: nascer em Entrada obrigaria a reencenar o fluxo. Mas duplicar um projeto num **desfecho
terminal** — fechado, declinado ou **encerrado** — para nascer nele afirmaria um desfecho que
ninguém decidiu: aí ela volta ao começo. É `DESFECHOS_TERMINAIS` quem responde, e não uma lista
própria — StandBy, que está em `DESFECHOS` sem ser terminal, acompanha normalmente.

#### Escolher o talento corrige o nome do projeto

A operação nomeia o projeto com o talento dentro: *"[Carta Orçamento] **Marina Duarte** |
Coca-Cola Verão"*. Sem tratar isso, a duplicada nasceria com o título mentindo, e reescrevê-lo à
mão é justamente o trabalho que o gesto existe para poupar.

Ao definir o talento numa linha duplicada, o nome antigo é trocado pelo novo **no título**. Só uma
vez, e só se o nome antigo estiver mesmo lá — fora disso o título é texto livre e ninguém mexe.

> Foi um teste de UI que encontrou isso. A implementação estava correta em tudo que eu havia
> previsto, e o título passou despercebido até uma asserção reclamar do nome errado na linha nova.

#### O rastro é um ícone, sem palavra

A linha mostra um ícone discreto; a dica diz *"Criada a partir de [projeto] — são projetos
independentes"*. **Não cria dependência:** mudar uma linha não mexe na outra, e nada as move junto.

O ícone **permanece mesmo se a origem for excluída** — a dica passa a dizer que ela já não existe.
Um rastro que desaparece junto com o outro lado não responde à pergunta que o justifica.

> **E procura na lista completa, não na visível.** A primeira versão buscava a origem entre as
> linhas da tela — filtradas por permissão, janela e busca. Quando o original fechasse e saísse da
> janela de andamento, a dica diria "não existe mais" com ele existindo. **Sumir da tela não é
> deixar de existir** — defeito achado na verificação de fim de dia ([00 §5.5](00_status_implementacao.md)).

##### Por que nenhuma palavra serviu

A primeira versão dizia **"Duplicada"**, e a palavra soava como **erro**: registro repetido por
engano, duplicidade que alguém deveria limpar. A linha existe de propósito.

As alternativas com metáfora familiar foram descartadas por um motivo mais sério:

| Nome | O que promete | O que o modelo entrega |
|------|---------------|------------------------|
| **Filha / pai** | Mexer no pai afeta a filha; excluir o pai leva a filha | Nada disso — as linhas são independentes |
| **Subprojeto** | Existe um projeto-pai que as agrupa e as conta como uma | Não existe |
| **Clonada** | *(sinônimo de duplicada)* | O mesmo problema |

> **Nome que promete vínculo inexistente estranha mais que nome nenhum.** Quem lê "filha" vai
> procurar o pai, e não vai encontrar comportamento nenhum que justifique a palavra.
>
> Se um dia a operação quiser a hierarquia de verdade, o vocabulário familiar volta **junto com o
> comportamento**: editar o pai refletindo nas filhas, o status movendo todas, e os cards contando
> projetos em vez de linhas. As duas coisas andam juntas ou nenhuma delas.

---

### A aba Agência — criada vazia em 02/08/2026, removida em 03/08

**Viveu um dia e nunca teve uma coluna.** A operação decidiu que a casa não vai trabalhar com
agência intermediária no quadro, o que encerra a pendência de modelagem aberta na véspera.

Fica o registro do que se pensou, porque o problema que ela resolveria **continua existindo**:

> O contato do cliente é ambíguo num projeto intermediado: quem responde costuma ser da agência, e
> o cadastro só conhece contatos da marca. (A coluna Contato saiu da Cliente em 03/08/2026 e
> `contatoCliente` ficou sem tela — mas o campo, e a ambiguidade, continuam no modelo.)

Se a agência voltar, volta **com as colunas definidas junto**, não vazia esperando definição. E o
argumento que nunca sustentou a separação continua valendo: nem todo projeto tem agência, e uma aba
vazia na maioria das linhas é custo permanente de navegação. Se for só por organização, o lugar do
dado é a aba Cliente.

#### A lição que ela deixou

**Aba criada vazia tende a continuar vazia.** Ela nasceu esperando uma conversa que, quando veio,
decidiu removê-la. O invariante do catálogo mudou de forma por causa disso: antes o teste nomeava a
exceção (*"a que falta é a Agência"*), o que **aceitava** a existência de uma aba vazia; hoje ele
exige que não haja nenhuma.

> **O teste que quebrou quando ela nasceu era o teste, não o produto.** A versão anterior exigia
> que *nenhuma* aba estivesse vazia — o que era verdade no dia em que foi escrita, e virou regra
> por descuido. O invariante correto é outro: **toda aba ou mostra colunas ou explica que ainda não
> tem.** Codificar o estado de um dia como se fosse regra é uma armadilha que só aparece no dia
> seguinte.

---

### Financeiro — a seção de dinheiro

Restrita. Absorveu a antiga aba **Pagamento** em 03/08/2026: a lista definitiva da operação pôs
Parcelas e PEP **entre** os valores, e seção é um trecho contíguo — não há como uma aba morar no
meio da outra. A ordem final responde, em sequência: quanto vale, quanto sai, em quantas vezes,
sob qual código no ERP, e o que sobra:

> Valor Projeto · Valor Cachê · **Parcelas** · **PEP** · Comissão Globo · Comissão · Imposto · Saving

**Comissão Globo é campo próprio**, não uma segunda leitura de `comissao`: são duas fatias do mesmo
bolo, e somá-las de cabeça a cada linha é conta que ninguém confere.

**Saving é digitado, não calculado.** Seria tentador derivá-lo de valor − custos, mas o que conta
como economia depende do que foi negociado — desconto de tabela, permuta, escopo ampliado sem
acréscimo. Um número produzido pela fórmula errada é pior que um campo em branco.

**Parcelas é número** (fluxo de caixa se conta); **PEP é texto**, porque o formato pertence ao ERP
e um dia muda sem avisar. A fusão não mudou permissão de ninguém no seed: a equipe que via
Pagamento via Financeiro também, e hoje a liberação `backlog:financeiro` cobre tudo.

---

### Jurídico — o quinto caso do dado derivado

**Razão Social e CPF/CNPJ vêm da ficha do talento**, e são só leitura. Corrigi-los de dentro de um
projeto esconderia que a correção vale para **todos** os contratos daquela pessoa.

| Coluna | Origem |
|--------|--------|
| Razão Social · CPF/CNPJ | Ficha do talento — só leitura |
| Contrato · Nº Contrato | Da linha |
| Data de Fechamento | Da linha — marco de vigência |

**Data de Fechamento não se move.** Diferente de `statusDesde`, que marca a última movimentação,
esta data é o marco que o jurídico usa para contar vigência.

---

### Links — onde está o resto

O quadro guarda o processo; o material vive em Drive, Salesforce e apresentações. Quatro endereços
fazem a ponte: **Proposta · Salesforce · Pasta de Orçamento · Pasta de Planejamento** — sem o
prefixo "Link" nos rótulos: a seção já se chama Links, e repeti-lo quatro vezes gastava a largura
da palavra que importa.

Antecede o Time por escolha da operação (04/08/2026): o que se procura **depois** de saber de que
projeto se trata. **Sem colunas de pessoas** — todas vivem no Time.

#### A célula mostra o destino, não a URL

Uma URL de pasta compartilhada tem 120 caracteres e nenhum deles ajuda a decidir se é o link certo.
Numa coluna de 130–150px, vira um borrão. A célula mostra **"Abrir"** com ícone, e a dica traz o
endereço inteiro — conferir antes de clicar é o gesto prudente num link externo.

| Decisão | Por quê |
|---------|---------|
| `target="_blank"` | O quadro é o lugar de trabalho: quem abre uma proposta volta para a linha |
| `rel="noopener noreferrer"` | O destino não precisa saber de onde veio, e não deve poder manipular esta página pelo `window.opener` |
| Sem validação de formato | Caminhos de rede e links internos são legítimos; um endereço errado custa um clique que não abre, não um dado corrompido |

> **Links não entram na busca.** Ninguém procura por URL, e uma delas casaria com termos curtos
> por acidente — trazendo linha errada para quem buscou outra coisa.

---

### As áreas que respondem por projeto: Pagamento, Jurídico, Produtor Artístico e Executivo

As seis primeiras áreas respondem **por um talento** — a página Talentos tem uma coluna para cada.
Estas quatro respondem **por um projeto**: "quem paga a Marina Duarte" não é pergunta; "quem paga
este projeto" é.

Por isso `AREAS` ganhou um recorte. `areasDoTalento()` é o que a página Talentos mostra, e continua
sendo as seis. Sem ele, criar a área aqui abriria uma coluna lá — mudança num quadro que ninguém
pediu para mexer, e que quebraria a soma de pesos de 78 daquela aba.

> **Ao criar uma área nova, decida em qual das duas listas ela entra.** É a diferença entre
> aparecer num quadro e aparecer em todos.

**Toda área precisa de uma equipe que a atenda** — é de lá que saem os candidatos da coluna. O seed
ganhou as equipes correspondentes pelo mesmo motivo, e `jornadaVisoes` verifica isso para
**todas** as áreas, não só as seis originais.

> ### As oito seções têm colunas — e como elas chegaram aqui
>
> A primeira versão das abas foi desenhada a partir do **sistema antigo**, não da operação. Elas
> foram **esvaziadas** em 01/08/2026 e voltaram uma a uma, cada coluna nascendo de uma pergunta
> que alguém faz no dia a dia. As que não ganharam pergunta própria saíram (Agência, Talento,
> Entrega, Conteúdo, Audiência, Pagamento — cada uma com seu registro neste documento), e o
> invariante do catálogo hoje exige o resultado: **as 8 seções da grade têm colunas, todas, e
> nenhuma veio do sistema antigo**. Aba vazia esperando definição não existe mais — nem na tela,
> nem como estado aceito pelo teste.
>
> Duas seções são **restritas** (Financeiro e Jurídico). E o estado vazio que restou é **global**,
> não por aba: quem não tem nenhuma seção liberada vê *"Nenhuma aba do Backlog está liberada para
> você."* — uma frase, não uma grade que parece defeito.
>
> Dos campos do modelo antigo, os que ficaram sem coluna e sem pergunta foram removidos na
> auditoria (ver §2 — "os campos fantasma morreram"). O mais perigoso era `captacao`: com
> `captacaoProducao` existindo, dois campos guardavam a mesma coisa e um deles estava morto.

### Seção não declara área — a coluna declara

**Nenhuma seção do Backlog tem uma área que responda por ela.** A relação coluna ↔ área existe
onde ela é real: cada coluna de pessoas do Time declara `area` no catálogo. Um "responsável da
seção" seria dado sem dono — as seções são recortes de assunto, não unidades de trabalho.

### 6.0. Regra de cada coluna da Demanda

O bloco **congelado** abre toda a grade, numa ordem única que não muda por seção —
**seleção · Ações · Status · Projeto · Entrada · Talento**. Ações vem no **início**, ao lado do
checkbox: os gestos da linha (duplicar, excluir, o cadeado de "você não responde por esta
oportunidade") precisam estar à mão sem rolar até o fim de uma tabela que atravessa oito seções.
Não há mais posição condicional do nome (`posicaoDoNome`/`comNome` morreram com a grade contínua):
uma ordem só, para toda seção.

As colunas **próprias** da Demanda, na ordem do catálogo:

| # | Coluna | Comportamento | Origem do valor |
|---|--------|---------------|-----------------|
| 1 | **Exclusivo** | **Derivada, somente leitura** | vínculo do talento — §6.0.2 |
| 2 | **Origem do Talento** | Lista fechada, **grava na ficha** | `Talento.origem` |
| 3 | **Tipo de Input** | Lista fechada | `INPUTS` |
| 4 | **Tipo de Projeto** | Lista fechada | `TIPOS_PROJETO` |
| 5 | **Origem do Projeto** | Lista fechada | `ORIGENS_COMERCIAIS` |
| 6 | **Tipo de Output** | Lista fechada | `TIPOS_OUTPUT` |
| 7 | **Impacto** | Lista fechada, etiqueta fria | `IMPACTOS` |
| 8 | **Captação** | Lista fechada | `CAPTACOES_PRODUCAO` |
| 9 | **Prioridade** | Lista fechada, etiqueta quente | `PRIORIDADES` |

> **Exclusivo e Origem do Talento abrem a seção** (ordenação por imagem da operação, 04/08/2026):
> a costura com o bloco congelado — que termina em Talento — deixa o vínculo colado a quem ele
> descreve, e vínculo é a primeira coisa que se confere para decidir. As três classificações
> comerciais vêm agrupadas; Output, Impacto e Captação (vindas de Entrega e Escopo em 03/08/2026)
> descrevem o trabalho; Prioridade fecha.
>
> **Marca não está aqui:** vive na seção Cliente — a dedup da grade contínua deixou cada coluna
> numa seção só. **Deadline também não:** o prazo de triagem virou a faixa colorida da linha
> (§4.3), com a data na dica. **E o Orçamento saiu em 03/08/2026**, com todas as demais colunas
> de pessoas, para o Time.

#### 6.0.3. Responsável e apoio — em **todas** as colunas de pessoas

Com mais de uma pessoa na área, *"quem responde"* e *"quem ajuda"* são perguntas diferentes — e a
operação precisa saber a quem cobrar a entrega. O painel mostra **dois botões por pessoa**,
`Resp.` e `Apoio`, lado a lado; clicar no papel que a pessoa já tem a remove da linha.

Os dois ficam visíveis em vez de esconder o segundo atrás de um menu: trocar de apoio para
responsável é gesto corrente, e vale um clique, não três.

| | Guardado em | No cartão de perfil |
|---|---|---|
| Responsável | `responsaveis[area]` | "responsável" |
| Apoio | `apoios[area]` | "parceiro" |

> #### Valia só para Orçamento até 11/08/2026
>
> A distinção nasceu na coluna de Orçamento, com célula própria; as **outras nove** colunas de
> pessoas nomeavam uma lista plana de responsáveis. A operação pediu a mesma regra em toda parte —
> *"a regra deve ser como fizemos na de Orçamento"* —, e o argumento que a justificou lá vale
> igual nas demais: uma dupla de produção tem titular e substituto, e a lista plana dizia que os
> dois respondem.
>
> **A exceção sumiu junto, e isso importa mais que o recurso.** Orçamento era a única coluna sem
> `area` declarada no catálogo, justamente porque tinha caminho próprio — havia um `if (chave ===
> 'orcamento')` na tabela desenhando um segundo painel igual ao primeiro. Duas implementações do
> mesmo desenho divergem, sempre; agora existe **uma célula e um caminho**, e `testeColunas`
> trava a ausência da exceção em vez da exceção.
>
> Saiu junto a ação `alternarResponsavelDaOportunidade` do provider, órfã no mesmo gesto: duas
> formas de nomear a mesma pessoa na mesma linha divergiriam também.

**Apoios contam como nomeados.** Quem apoia precisa ver a linha — `nomeadosDaOportunidade` inclui
os dois, e a permissão de edição segue junto.

> **Pendência de nomenclatura.** Contratos chama o mesmo papel de **"parceiro"**. Vale unificar —
> a decisão está em [§13.1](#131-decisões-que-precisam-da-operação).

---

#### 6.0.1. Marca e Talento: lista fechada **com escape**

O componente é [`SelecaoComCadastro`](../src/components/ui/SelecaoComCadastro.tsx). Ele resolve um
problema que texto livre não resolve, sem criar o problema que lista fechada criaria.

**Por que não texto livre.** "Coca-Cola", "Coca Cola" e "coca-cola" eram três marcas distintas para
qualquer contagem — e o Power BI agruparia por string. Escolher de uma lista resolve na origem: o
nome fica igual em todos os quadros porque é o **mesmo registro**.

**Por que não lista fechada.** Obrigaria a parar o cadastro, abrir outra tela, criar a marca e
voltar. Ninguém faz isso no meio do trabalho — a saída seria devolver o campo a texto livre, e com
ele as três grafias.

**O meio-termo:** criar é um gesto explícito dentro do próprio painel, e o registro nasce
**pendente de cadastro**.

```
┌ Buscar marca… ─────────────────┐
│ Ambev                          │
│ Coca-Cola                    ✓ │
│ Fast Burger        [PENDENTE]  │
├────────────────────────────────┤
│ + Criar "Vivo Fibra"           │  ← só aparece se não existir na lista
│   Entra como solicitação       │
└────────────────────────────────┘
```

| Detalhe | Por quê |
|---------|---------|
| Criar só aparece se o texto **não existe** | Digitar "coca cola" ofereceria criar uma segunda Coca-Cola — o que o componente existe para impedir |
| Comparação **normalizada** | Sem caixa, acento nem pontuação: `Ypê` = `Ype`, `Coca-Cola` = `coca cola` |
| Pendente **continua escolhível** | É estado de trabalho, não de erro: a marca vale, falta completar o cadastro |
| Selo âmbar na grade | Quem lê a linha precisa saber que o nome entrou como solicitação |
| "Limpar" no rodapé do painel | Nem todo projeto tem marca definida no início |

> **A lista vem do cadastro, não dos valores já digitados.** Uma lista montada a partir da própria
> coluna se alimentaria dos próprios erros: a grafia errada de ontem viraria sugestão hoje. Foi por
> isso que a `CelulaReferencia` — que sugeria por semelhança — saiu destas duas colunas.

##### A diferença para `CelulaReferencia`

| | `CelulaReferencia` | `SelecaoComCadastro` |
|---|---|---|
| Natureza | texto livre | escolha de lista |
| Lista | valores já usados na coluna | **cadastro** |
| Ao digitar algo novo | aceita, com alerta se parecido | **filtra**; criar é outro gesto |
| Resultado | ajuda a não duplicar | **impede** duplicar |

A `CelulaReferencia` continua certa onde não há cadastro por trás — ver [07 §10](07_visoes_e_relacoes.md).

---

#### 6.0.2. Exclusivo deriva do vínculo do talento

**A regra, nas palavras da operação: exclusivo é o talento agenciado pela casa.**

Um exclusivo é agenciado pela VIU, que contrata direto. Quando não é, quem o representa precisa
figurar no contrato como interveniente anuente — é o mesmo fato, lido pelo lado que a operação usa
para falar dele. Não é uma segunda decisão a tomar: é **consequência** de quem representa o talento.

| Vínculo na ficha | Exclusivo |
|------------------|:---------:|
| `exclusivo` | **Sim** |
| `interveniencia` | Não |
| sem talento definido | — |
| nome sem ficha cadastrada | — |

```ts
exclusividadeDe(oportunidade, talentos): boolean | undefined
```

**A coluna é leitura.** Para mudar, muda-se o vínculo na ficha do talento — é lá que a informação
nasce. A dica da célula diz de onde o valor veio: *"Não — Rafael Nogueira não é exclusivo, o
contrato tem interveniência"*.

##### Trocou de lado em 03/08/2026

A coluna chamava-se **Interveniência** e o campo era `interveniencia: boolean`, com o valor
**oposto** ao de hoje. A operação lê a coluna como "Exclusivo", e a troca foi levada até o modelo:

> **Renomear sem inverter é o erro silencioso desta mudança.** Compila, passa no typecheck, não
> quebra teste nenhum que só verifique tipos — e faz **toda linha do quadro mentir**. `Sim` passaria
> a aparecer exatamente para quem *não* é exclusivo.

A mesma rodada removeu a coluna **Tipo de Talento**, que exibia `Exclusivo`/`Interveniência` em
palavras: dizia o mesmo por outro ângulo, e as duas saíam da mesma ficha.

> **O que a migração do seed errou.** Converter `interveniencia: X` em `exclusivo: !X` produziu
> quatro linhas erradas, porque o `false` antigo era **ambíguo**: significava tanto "não tem
> interveniência" (= é exclusivo) quanto "não sabemos" — o valor com que toda linha nasce. Nas
> quatro linhas de talento sem ficha, inverter o "não sei" gerou uma afirmação que ninguém fez.
> Antes de inverter um booleano, é preciso saber se o `false` é resposta ou ausência de resposta.

##### `undefined` não é `false`

Sem talento definido, a resposta é **indefinida**, não "não". A ausência de talento não é ausência
de interveniência: é ausência de resposta. Exibir "Não" ali faria o jurídico ler uma decisão que
ninguém tomou.

##### Mudar o vínculo repercute nos projetos

Promover alguém a exclusivo tira a interveniência de todos os projetos dele; o caminho inverso a
acrescenta. Sem isso, a ficha diria uma coisa e as linhas outra — e a primeira pessoa a notar seria
o jurídico, tarde demais.

> **O campo continua na oportunidade**, mantido pelo provider, porque o rodapé, os filtros e o
> Power BI leem dele. O que mudou é quem manda: a ficha. Enquanto era digitado à parte, o quadro
> permitia o estado impossível — projeto com talento não-exclusivo marcado como "sem
> interveniência". **O seed tinha 7 linhas nessa condição**, e ninguém havia percebido; foi o teste
> da regra nova que as encontrou.

---

#### 6.0.3. Classificação não tem default

`input`, `origem`, `tipoProjeto` e `prioridade` são **opcionais**. Ausente significa "ainda não
classificado", e é diferente de qualquer valor da lista.

```ts
tipoProjeto?: TipoProjeto;
input?: InputOportunidade;
origem?: OrigemComercial;
prioridade?: PrioridadeOportunidade;
```

> ### O defeito que isto corrigiu
>
> A linha nova nascia com `input: 'interno'`, `origem: 'outros'`, `tipoProjeto: 'outro'` e
> `prioridade: 'media'`. Na tela: **"Interno · Outros · Outro · Média"** — o quadro afirmando uma
> classificação que ninguém fez.
>
> Quem filtrasse por "Input: Interno" levaria junto todo projeto recém-criado. E o Power BI
> contaria o mesmo erro, com a agravante de ninguém ter como perceber lá.
>
> Os `get*` também mascaravam: `getPrioridade('lixo')` devolvia "média". Agora devolvem
> `undefined` — a diferença entre *escolhido* e *não escolhido* precisa sobreviver até a tela.

| Onde | Como aparece |
|------|--------------|
| Etiqueta na grade | **Definir**, em cinza |
| Ponto de prioridade | neutro (`bg-slate-200`) em vez de colorido |
| Rodapé de inputs | faixa **A definir: N**, à parte das cinco |
| Busca | não entra — não há rótulo para procurar |

O rodapé conta à parte de propósito: distribuir o não classificado por um default inflaria uma das
faixas com projetos que ninguém classificou.

**Status é a exceção**: nasce sempre em `entrada`, porque é regra do fluxo (§3.1), não classificação.

---

#### 6.0.2c. Como a interveniência deixou de ser editável — o histórico

Ela passou por três formas, e cada mudança respondeu a um problema da anterior:

| Forma | Problema que resolveu | Problema que sobrou |
|-------|----------------------|---------------------|
| **Botão que alternava** | — | Não anunciava o que ia acontecer: quem não conhecia a convenção clicava para descobrir, e descobria alterando o dado |
| **Lista Sim/Não** | O painel mostra as opções antes de escolher | Dois campos diziam a mesma coisa — a ficha do talento e a coluna — e divergiam |
| **Derivada, somente leitura** | Um dado, um dono (§6.0.2b) | — |

A cor permanece: **verde no "sim"** porque, aqui, sim é a exceção que exige atenção. A cor marca o
que precisa ser notado, não o que é bom.

---

### 6.1. Onde a coluna-chave entra

**O Status vem antes do nome, no bloco congelado — uma vez, para a grade inteira.**

Quem varre o quadro procura primeiro **em que ponto do fluxo** cada demanda está — é a pergunta
que o quadro existe para responder — e só então lê o nome da linha que interessou. Na grade
contínua isso é resolvido de uma vez: Status e Projeto estão no bloco congelado, visíveis em
qualquer seção; a lógica de posição condicional por aba (`posicaoDoNome`/`comNome`, que precisava
concordar em quatro pontos do componente) **morreu com a grade** — a ordem é uma só.

O nome (Projeto) fica **fora do catálogo** de propósito. Ele é a chave da linha: nunca se oculta
por permissão de coluna e é sempre pesquisável — se saísse na configuração de acessos, restaria
uma lista de linhas sem identificação.

### 6.2. A coluna calculada, e o prazo que virou faixa

| O quê | Exibe | Origem | Editável |
|-------|-------|--------|:--------:|
| **Entrada** (coluna, âncora) | a data | Data de cadastro da demanda, gravada na criação | — |
| **Prazo de triagem** (faixa da linha) | cor — verde/amarelo/vermelho | Entrada **+ 5 dias úteis** (`prazoEm`) | — |

**Não há coluna Deadline desde 03/08/2026.** O prazo saiu das colunas, não do quadro: o farol é a
**barra de 5px na borda esquerda da linha** (§4.3), e a **dica traz a data** e o estado por
extenso. Uma bolinha custa 12px; a coluna custava largura que as treze colunas da Demanda de então
não tinham. `prazoEm` continua no modelo, preenchido na criação — **dias úteis, não corridos**: o
prazo é compromisso de trabalho. O relógio de abandono dos 20 dias é o oposto: dias corridos,
porque mede tempo real de silêncio (§3.3).

**E não há coluna `fixa: true` no Backlog.** Toda coluna do catálogo pode ser ocultada por equipe;
o que nunca some — Projeto — vive fora do catálogo (§6.1). A marca `fixa` segue em uso nos outros
quadros.

**Financeiro e Jurídico são restritas.** Valor, cachê e comissão pelo mesmo motivo que o
financeiro dos talentos; o jurídico porque status de contrato circula antes de estar fechado.

Colunas derivadas de outra entidade: **Exclusivo** e **Origem do Talento** leem a ficha (§6.0.2);
**Segmento** e **Categoria** leem o cadastro da marca; **Razão Social** e **CPF/CNPJ** do Jurídico
leem a ficha do talento. O Backlog lê, não guarda — um talento sem ficha mostra o convite para
criá-la.

---

## 6.1. Campos de escolha fechada

Todas as listas do quadro, num lugar só.

| Campo | Seção | Valores |
|-------|-------|---------|
| **Input** | Demanda | Interno · Mercado · Inbound · Proativo · VIU First |
| **Origem** | Demanda | Globoplay · TV Globo · Canais Pagos · VIU Agência · Outros |
| **Tipo do projeto** | Demanda | Patrocínio · Sob Demanda · Projeto Especial · Outro |
| **Prioridade** | Demanda | Alta · Média · Baixa *(etiqueta quente)* |
| **Exclusivo** | Demanda | Sim · Não — **derivada** da ficha, só leitura |
| **Origem do Talento** | Demanda | Casting · Indicação · Prospecção · Globo · Inbound — grava na ficha |
| **Tipo de Output** | Demanda | Post · Reels · Stories · Vídeo · Live · Evento · Merchandising |
| **Impacto** | Demanda | Alto · Médio · Baixo *(etiqueta fria)* |
| **Captação** | Demanda | Estúdio · Externa · Remota · Material do talento · Sem captação |
| **Edição** | Produção | Interna · Talento · Agência · Produtora — *(Sem edição saiu com o tique, v10)* |
| **Conteúdo** | Produção | Publieditorial · Review · Tutorial · Depoimento · Entretenimento · Institucional |
| **Audiência** | Produção | Massa · Amplo · Segmentado · Nicho |
| **Segmento · Categoria** | Cliente | **Lista aberta** — nasce dos valores já usados |
| **Marca · Talento** | Cliente · bloco congelado | **Lista cadastrada, com criar** (§6.0.1) |

### Ausente não é nenhum valor da lista

Vale para **todas** as classificações acima. `undefined` significa "ninguém classificou", que é
diferente de qualquer opção — inclusive da que pareceria neutra.

Um default aqui faria o quadro afirmar o que ninguém disse, e o relatório contaria linhas
recém-criadas como se tivessem sido classificadas. Foi um defeito real: a ingestão devolvia
`'media'` para prioridade ausente, e as linhas importadas entravam classificadas sem ninguém
tê-las olhado.

A tela mostra "Definir" ou `—`, nunca um valor emprestado.

> ### `origem` × `entradaPor` — dois conceitos, um nome
>
> A operação chama de **origem** a frente comercial de onde vem o negócio. O sistema também
> precisa saber por onde o dado **entrou** — manual, e-mail, Salesforce.
>
> São coisas diferentes: uma oportunidade da TV Globo pode entrar por e-mail. Na v1.0 os dois
> disputavam o nome `origem`; hoje a via técnica se chama **`entradaPor`** e o campo comercial
> ficou com o nome que a operação usa. **O vocabulário da tela é o da operação, não o do código.**

Etiquetas neutras, sem cor própria: são classificações, não estados. Colorir todas competiria com
status e prioridade, que precisam saltar aos olhos.

---

## 6.2. Rodapé de totais

Abaixo da grade, a leitura de relance do grupo aberto:

```
Total no grupo: 40 | Farol SLA: ●12 atrasados ●12 em atenção ●16 no prazo |
Exclusivos: 26 de 40            Input: Interno:8 Mercado:8 Inbound:8 Proativo:8 VIU First:8
```

O rodapé fala a língua da coluna: se a grade pergunta "Exclusivo?", o total ao pé dela não pode
responder pelo avesso. Contava interveniências até 03/08/2026.

O farol conta **só quem ainda espera resposta**. O que já saiu da triagem não entra em nenhuma das
três faixas — somar projetos resolvidos ao "no prazo" inflaria o número que deveria medir pressão.

---

## 6.3. O que a lista mostra

**Por padrão, só o que está em andamento — e isso são seis status.** `emAndamento` corta pelo
`encerra`, então ficam as cinco etapas ativas **e o StandBy**: pausa é projeto vivo, e sumir com
ele da lista seria matá-lo por outro caminho. De fora ficam só os três desfechos terminais
(Fechado, Declinado, Encerrado).

> ### Por que os finalizados saem da lista
>
> Este sistema é **controle de processo e máscara de dados**, não ferramenta de análise: quem quer
> série histórica lê o banco pelo Power BI. Manter meses de projetos encerrados na lista faria a
> operação rolar por cima deles todo dia para chegar ao que está vivo.

Os finalizados vivem no bloco **Finalização** do cabeçalho, com **janela de 30 dias**
(`DIAS_FINALIZADOS_VISIVEIS = 30`) — tempo suficiente para "o que fechamos recentemente" continuar
à mão. Clicar num card os traz para a lista: a consulta é deliberada, não o padrão.

**O card e a lista que ele abre mostram o mesmo conjunto.** `resumirPorStatus` aplica a mesma
janela que o filtro — um número de cabeçalho que não bate com a lista é um número em que ninguém
confia.

O que saiu da janela é **contado, não escondido**: o cabeçalho diz *"N finalizadas há mais de 30
dias não aparecem aqui — o histórico completo fica no banco, para o Power BI"*. Some sem aviso e
alguém vai achar que o dado se perdeu.

---

## 6.4. Lista rolável

Cabeçalho das colunas, busca, filtros, mapa do fluxo e rodapé ficam parados; **só o corpo da lista
se move**. Padrão completo em [`03_padroes_ui.md`](03_padroes_ui.md) §7.4.

Vale para os três quadros, não só este.

---

## 6.5. Pendências — com quem está a bola

**Desde 04/08/2026.** A operação anotava na planilha "Em elaboração – Validação Gestão Esporte",
"Em revisão – Validação Talento" — status compostos que não são etapas: são **esperas**, com nome
e endereço. A tradução: o status continua um só, e a espera vira uma etiqueta com relógio
(`Pendencia`), aberta quando a bola sai da mão e marcada **✓ Chegou** quando volta.

### O menu, por status — a lista da operação

| Etiqueta | Status | Significa |
|----------|--------|-----------|
| Retorno Marca/Executivo | Em Elaboração | Falta informação; a bola está com a marca/executivo |
| Validação Gestão Esporte | Em Elaboração | Aguardando o "pode prosseguir" |
| Cotação Gestão de Elenco | Em Elaboração | Talento com programa na casa; aguardando cotação |
| Validação Externa | Em Elaboração | Cotação ou validação de alguém de fora da casa — o par externo do Elenco |
| Cálculo de Produção | Em Elaboração | Aguardando custo de cabelo, maquiagem e afins |
| Validação Planejamento | Em Revisão | Proposta em análise pelo Planejamento |
| Validação Talent Manager | Em Revisão | Proposta com o talent manager |
| Validação Talento | Em Revisão | Proposta em análise pelo talento |

Da lista original morreu *"– Orçamentos"* (elaborar já é o trabalho). Na confirmação da lista
(04/08/2026), *"Cotação Externa"* renasceu como **Validação Externa** — o nome que a própria
operação sugeriu — e **Validação Planejamento entrou** na Revisão, primeira da ordem dela.
*Conteúdo/Audiência* ficam fora do menu de Orçamentos — outra equipe pendura as suas **sem criar
status novo**.

### Onde vive, e os três botões

Tudo no **painel de status** — nenhum botão novo na linha. O selo sinaliza com um **badge de
canto**, estilo notificação: âmbar `⏳N` = esperando; verde `✓N` = todas as esperas chegaram.
Sem texto e fora da linha do rótulo — as duas versões anteriores ou comiam o nome da espera ou
espremiam o do status ("Em Elaboraçã…", no print da operação). A dica do
hover diz os nomes por extenso e há quantos dias. O painel lista as esperas e oferece "+ Abrir
pendência" com as opções do status atual — e **não fecha em interação interna**: só ao escolher um
destino, clicar fora de verdade ou clicar no selo de novo (o clique-fora tratava o portal como
"fora", e cada clique interno fechava o painel — apontado pela operação em 04/08/2026). São **três
gestos** por espera, além do "+ Abrir pendência", todos reversíveis:

| Gesto | O quê | O limite |
|-------|-------|----------|
| **✓ Chegou** | A resposta veio; o relógio para | — |
| **↩ Reabrir** | O "chegou" foi engano, ou a resposta veio incompleta | **O relógio original segue valendo** — reabrir não zera a espera |
| **✕ Descartar** | Aberta por engano; sai do registro **e da medição** | **Só remove abertas**: espera que já chegou é história do projeto, e história não se apaga por clique — se o "chegou" estava errado, o caminho é reabrir |

> **"Resolvida" caiu no diálogo com a operação**: julga e soa definitivo. "Chegou" diz o fato — e
> um registro de espera não pode dar medo de errar; daí cada gesto ter desfazer.

#### O percurso da espera — 11/08/2026, pedido da gestão

Cada espera exibe, numa segunda linha em `font-mono`, **quando abriu e quando chegou**:

| Estado | Linha do percurso |
|--------|-------------------|
| Aberta | `30/07 → hoje · 5d esperando` |
| Chegada | `28/07 → 29/07 · 1d de espera` |

As datas sempre existiram no modelo (`abertaEm`, `chegouEm` — a matéria-prima do SLA); o painel só
mostrava a contagem, e "5d esperando" não responde a pergunta que a operação faz de verdade:
*desde quando?* O formato é `dd/mm` (`formatDiaMes`) — o ano é ruído na linha e mora na dica, por
extenso. Na aberta, o fim é **"hoje"**, e não uma data: espera aberta ainda não tem fim.

Junto entrou a largura: o painel passou de 260 para **320px**, porque "Cotação Gestão de Elenco"
abria cortado ("Cotação …", no print da gestão). O nome inteiro é o mínimo; reticências são último
recurso, não estado normal.

Três regras da régua que valem registro:

- **Os dias de espera são corridos** (`diasDeEspera`), de propósito: a espera de um terceiro não
  folga no fim de semana do ponto de vista de quem espera. A régua em dias úteis, se a operação
  preferir, entra com o relatório no banco.
- **Abrir espera de um tipo já aberto é ignorado** (`comPendenciaAberta`): duas "Validação Gestão
  Esporte" abertas na mesma linha não são duas esperas — são um clique duplo. Uma já **chegada**
  do mesmo tipo não impede: pedir de novo ao mesmo terceiro é rotina.
- **A trava da Elaboração não vira invariante de QA** de propósito: o encerramento automático
  (20 dias parado) fecha a linha esteja ela como estiver — uma encerrada com espera aberta da
  Elaboração é história legítima, não estado impossível.

### A política de avanço: trava onde a espera é do caminho, avisa onde ela é do destino

Calibrada em uso, com a operação:

| Transição | Com espera aberta | Por quê |
|-----------|-------------------|---------|
| **Elaboração → Revisão** | **Trava** — o destino aparece desabilitado, com cadeado e o motivo na dica | *"Não pode ir para revisão se tiver faltando alguma coisa"*: revisar um número que ainda depende do Elenco é revisar um rascunho |
| **Demais** (Revisão → Feedback, etc.) | **Avisa** ("avançar assim mesmo?") e registra | Na Revisão, a espera é do próprio destino — o cliente responde enquanto o talento valida. Travar tudo geraria contorno: quem tem pressa pararia de etiquetar |

A regra vive em `bloqueadaPorPendencias` e é aplicada em três camadas — função pura, provider
(recusa em silêncio, como transição inválida) e tela (botão desabilitado). Quando a espera
atravessa uma transição avisada, `statusAbertura` ≠ status atual é a "revisão parcelada", medida
em vez de proibida. As três formas de estado impossível (chegou antes de abrir, tipo fora do
status de abertura, aberta duplicada) são acusadas por `comPendenciaImpossivel` —
`testePendencias` planta cada uma e confere.

### O que fica para o banco

A contabilização do **tempo por status** (e o relatório de SLA) entra com o Postgres + Power BI —
decisão da operação. O schema Prisma já traz `Pendencia` e `StatusEvento` (o log de transições que
a view do relatório vai ler com `LAG(em)`); o front grava desde já as datas que alimentam tudo.

---

## 7. Filtros — removidos

A faixa de chips (*Todas · Em triagem · Em andamento · Atrasadas · A conferir · Encerradas*) **saiu
da tela**. Ela duplicava o que os cards do cabeçalho já fazem: os cards contam e recortam pelo mesmo
critério, e ter os dois obrigava a decidir qual dos dois estava valendo.

**O recorte padrão continua sendo a janela do fluxo:** o quadro abre com o que está em andamento —
12 das 19 linhas do seed. Finalizados entram pelos cards de Finalização.

> A busca por texto continua. Ela responde outra pergunta — "onde está aquele projeto" — e nenhum
> card responde essa.

---

# Parte 2 — Integrações

## 7.5. Declinado abre em três motivos

**Regra: entrar em Declinado exige dizer de onde partiu a recusa** — valendo pelos dois caminhos
que levam até lá: de **Aguardando Feedback** e, desde 04/08/2026, de **Em Revisão**. O segundo
entrou junto com as pendências: a Validação Talento acontece na Revisão, e quando o talento
recusa, o projeto morre naquela etapa — passar por Aguardando Feedback para declinar registraria
um retorno de cliente que nunca houve.

**E cada etapa oferece só os motivos que fazem sentido nela** (`motivosPermitidosDoDeclinio`): da
Revisão, apenas **Decl. Talento** — é ele quem está revisando; Interno e Mercado são conversas do
retorno do cliente e só aparecem no Aguardando Feedback. O provider recusa a combinação inválida
mesmo que a tela falhe.

| Motivo | Rótulo na etiqueta | O que significa |
|--------|-------------------|-----------------|
| `interno` | Decl. Interno | A agência recusou — capacidade, agenda, conflito ou fit |
| `mercado` | Decl. Mercado | O cliente desistiu, escolheu outro caminho ou não avançou |
| `talento` | Decl. Talento | O talento não aceitou o projeto |

"12 declinados" não diz se o problema é de **capacidade**, de **proposta** ou de **elenco** — três
conversas diferentes, com donos diferentes. A quebra é a informação mais útil do desfecho.

### É um qualificador, não um status

Os três continuam sendo `declinado`. O motivo é um campo à parte:

```ts
status: 'declinado';
motivoDeclinio?: 'interno' | 'mercado' | 'talento';
```

Fatiar em três status multiplicaria por três **tudo** que trata desfecho — a máquina de
transições, o farol, os filtros, `DESFECHOS`, a janela de 30 dias — para expressar uma distinção
que é de **motivo**, não de etapa. E o Power BI agruparia por um campo dedicado em vez de fatiar
strings de status.

Consequências que o teste trava (`testeDeclinio.mjs`):

- `STATUS_OPORTUNIDADE` continua com **9** entradas e `DESFECHOS` com **4**
- `TRANSICOES.aguardando_feedback` continua com **5** destinos (Ajustes · Fechado · StandBy ·
  Declinado · Encerrado), e `declinado` segue terminal
- da Revisão, `motivosPermitidosDoDeclinio` devolve **só `talento`** — o provider recusa a
  combinação inválida mesmo que a tela falhe
- **quem grava o motivo é o provider**, não a máquina de estados

### Onde cada rótulo aparece

| Lugar | Rótulo | Por quê |
|-------|--------|---------|
| Menu de decisão | `Declinado pelo Mercado` | há espaço, e é o momento da escolha |
| Etiqueta na linha | `Decl. Mercado` | a coluna Status tem ~110px |
| Card de Finalização | `Mercado` + badge `2` | ver abaixo |
| `title` | nome completo + explicação | onde cabe tudo |

> #### Três leituras da operação até o card ficar de pé — 11 e 12/08/2026
>
> | Versão | O que a tela mostrava | O que quebrou |
> |--------|----------------------|---------------|
> | Original | `Interno 1` · `Talento 2` | **"Talento 2" lia como um talento numerado** — abreviação colada na contagem |
> | 1ª correção | `Declinado pelo Talento 2`, um por linha | cada linha repetia "Declinado" sob um cabeçalho escrito **Declinado** |
> | 2ª correção | `Internamente 1` · `Talento 2`, um por linha | com os três motivos, o card **esticava** e desalinhava do vizinho |
> | **Atual** | `Internamente` `1` · `Talento` `2`, lado a lado | — |
>
> O que ficou: **só a metade que varia** (`soMotivo` — o "Declinado" está no título, três
> centímetros acima), os três **lado a lado** com `flex-wrap`, e a contagem num **badge** de fundo
> próprio.
>
> O badge é o detalhe que fecha o caso: ele dá a pausa entre o nome e o número que o espaço em
> branco não dava. Sem ele, voltar ao layout lado a lado devolveria o "Talento 2" da primeira
> versão — a ambiguidade nunca foi do rótulo, era da **colagem** entre rótulo e contagem.
>
> A forma curta (`curto`) continua existindo — e continua certa — **na etiqueta da linha**, onde a
> coluna tem 106px e a própria coluna Status diz do que se trata. São três rótulos para três
> lugares, cada um com o espaço e o contexto que tem.

### A pergunta vem antes, não depois

A opção única "Declinado" é **substituída** pelas três no menu. Oferecer "Declinado" e perguntar o
motivo em seguida abriria a porta para o registro sem motivo — exatamente o que a quebra do card
não consegue ler.

Declínios **sem** motivo continuam válidos e legíveis como "Declinado": dado anterior ao campo, ou
importado por uma integração que não o conhece, não pode quebrar a tela. Eles aparecem na quebra
como "Sem motivo", para que **a soma das partes continue batendo com o número do card**.

### Mudar de ideia limpa o motivo

`definirStatusDaOportunidade` grava `motivoDeclinio: undefined` quando o destino não é `declinado`.
Motivo de declínio numa oportunidade que não está declinada é dado órfão, e dado órfão vira
relatório errado.

---

## 7.6. O seed: dois exemplos por status, três no Declinado

`src/data/oportunidades.ts` traz **19 oportunidades — duas de cada um dos nove status, e uma
terceira no Declinado** para que cada um dos três motivos apareça. A intenção é que cada card do
cabeçalho tenha número, cada filtro tenha resultado e cada estado visual apareça sem ninguém
precisar preparar dado antes de abrir a tela.

| O que demonstra | Onde ver |
|-----------------|----------|
| SLA atrasado · a vencer | `op2` · `op1` — o farol só corre em Entrada |
| Aviso de encerramento | `op10` (3 dias) · `op2` (4) · `op6` (8) |
| **StandBy não encerra por tempo** | `op12`, parada há 21 dias e ainda viva |
| Declínio por motivo | `op15` interno · `op16` mercado · `op19` talento |
| Finalizado fora da janela de 30 dias | `op18` — some da lista e entra no "e mais N" |
| Veio de integração, sem conferência | `op3` (e-mail) · `op9` (Salesforce) |
| Exclusivo "Não" e indefinido | os projetos de **Helena Prado** (a única não-exclusiva do cadastro) e de **Bruno Salles** (sem ficha — a célula diz "ainda não tem ficha") |
| Pendências abertas | `op4` · `op5` |

### As datas são fixas, contra 02/08/2026

Foram escolhidas para produzir aqueles estados. Rodando muito depois, o quadro segue coerente, mas
os faróis mudam — e o encerramento automático passa a recolher o que estiver parado há mais de 20
dias, desfazendo parte da demonstração.

> **Três avisos de encerramento, não cinco.** A primeira versão do seed deixava cinco das doze
> linhas alarmando. Quando quase tudo alarma, nada alarma: dois exemplos foram afastados do limite
> para que o vermelho continue significando alguma coisa.

### `jornadaBacklog` percorre a tela inteira

A suíte abre o quadro, clica em cada etapa do mapa, em cada card de finalização e em cada filtro,
verificando **coerência entre número e lista** — o defeito que importa aqui não é uma função
errada, é o cabeçalho dizer 3 e a lista mostrar 2.

Ela também confere a integridade do próprio seed: ids únicos, `prazoEm` depois de `entradaEm`,
motivo de declínio só em declinado, e que **nenhum exemplo é recolhido pelo encerramento automático
ao abrir** — senão o seed deixaria de demonstrar o que promete.

---

## 8. O problema

O quadro recebe demanda por três caminhos, e dois deles são máquinas:

| Origem | Quem escreve | Chave de deduplicação |
|--------|--------------|-----------------------|
| `manual` | Alguém do time, na linha de criação | — |
| `email` | Agente que lê a caixa de entrada | `Message-ID` do cabeçalho |
| `salesforce` | Sincronização com o CRM | Id da oportunidade |

## 9. Três garantias

### 9.1. Nunca duplicar

**Toda integração reprocessa.** O agente relê a caixa depois de uma queda; a sincronização roda de
novo após falha de rede. Sem `idExterno`, cada reprocessamento criaria linhas repetidas até alguém
notar — e ninguém nota a tempo.

Por isso:

- Origem automática **sem `idExterno` é recusada** (`erro: 'sem_id_externo'`). Aceitar seria criar
  uma linha que a próxima execução não consegue reconhecer.
- A deduplicação é por **origem + id**: o mesmo id vindo do e-mail e do Salesforce são registros
  diferentes, porque os espaços de identificação não se misturam.
- `ingerirLote` acumula o que vai criando: **duplicata dentro do mesmo lote** também é pega, e é
  justamente o que acontece quando uma origem reenvia.

### 9.2. Nunca confiar cegamente

O que entra por integração nasce **`revisada: false`**. O agente acerta o essencial e erra o
resto — um assunto de e-mail vira um título ruim com frequência.

Na tela, a linha não conferida ganha **realce âmbar de fundo** (`linha-conferir`) — não há botão
"Conferir" nem aba dedicada: a marca cai quando alguém **edita qualquer campo** da linha, o gesto
que exige ter olhado para ela. O realce perde só para o fundo de linha selecionada (§6, "Zebra,
realce e seleção").

Cadastro manual nasce `revisada: true` — quem digitou é o revisor. E a **duplicação** também
(§6.6): quem duplicou estava olhando para a linha.

### 9.3. Nunca perder o que já foi corrigido

Quando a origem reenvia um registro que já existe, `mesclar` decide campo a campo:

| Situação | O que vale |
|----------|-----------|
| Registro **já revisado**, campo preenchido | O que está no sistema |
| Registro **já revisado**, campo vazio | O dado novo |
| Registro **não revisado** | O dado novo, em tudo |

> **Por que a correção humana vence.** "Origem sempre vence" desfaria correções toda vez que a
> sincronização rodasse, e quem corrigiu veria o trabalho sumir sem explicação. Perder um dado
> novo é recuperável; ver a correção evaporar destrói a confiança no quadro inteiro.
>
> A exceção do não-revisado é coerente: ali nada foi conferido, e a origem é a melhor informação
> disponível.

## 10. O contrato de ingestão

```ts
ingerir(bruta, origem, existentes, { proximoId })
  → { situacao: 'criada' | 'atualizada' | 'ignorada', oportunidade?, erro? }

ingerirLote(brutas, origem, existentes, { proximoId })
  → { oportunidades, resumo: { criadas, atualizadas, ignoradas, erros } }
```

**As funções são puras.** Não conhecem HTTP, fila nem banco: recebem o que existe, devolvem o que
deveria existir. Quem chama decide persistir.

Isso é deliberado. Quando houver backend, o endpoint chama **estas mesmas funções** e grava o
resultado — a regra não muda de lugar, e o teste que a cobre continua valendo.

### 10.1. Campos frouxos de propósito

`OportunidadeBruta` exige só o título. Um e-mail de proposta raramente traz valor e prazo, e
recusar o registro inteiro por falta de um campo faria a oportunidade se perder. **Melhor entrar
incompleta e marcada para revisão do que não entrar.** Ela também aceita `escopo` — o pedido em
texto corrido, quando a origem o traz.

**O que a linha ingerida afirma, e o que não:** nasce com `exclusivo: false` (o rodapé e os
filtros leem um booleano; a leitura derivada da ficha corrige na tela assim que o nome casar) e
`pendencias: []` — nenhuma espera que ninguém abriu. E **entra no topo da lista**: o mais recente
primeiro é onde quem tria procura o que acabou de chegar.

### 10.2. Adaptadores

Cada origem tem uma função que traduz o formato dela para `OportunidadeBruta`:

**`deEmail(EmailBruto)`**

```ts
{
  messageId: string;      // vira idExterno — único e estável no reprocessamento
  assunto: string;        // vira o título
  remetente: string;
  recebidoEm: string;
  extraido?: { marca?, talento?, tipoProjeto?, valor?, prioridade? };
  resumo?: string;        // trecho do corpo, guardado como rastro
}
```

Sem assunto, o título vira `E-mail de <remetente>` — a linha não pode nascer anônima.

**`deSalesforce(SalesforceBruto)`** — campos nos nomes do CRM (`Id`, `Name`, `Account.Name`,
`Amount`, `StageName`, `Talent__c`, `Priority__c`; **`LeadSource` vira o input e `Origem__c` a
origem comercial**, pelas mesmas normalizações tolerantes). `Amount` numérico vira moeda brasileira
formatada; conta sem valor **não inventa número**.

A prioridade é normalizada em ambos: `High`, `alta`, `urgente` e `critica` viram `alta`.

### 10.3. A integração não inventa classificação

As normalizações — input, origem, tipo do projeto, prioridade — devolvem **`undefined`** quando não
reconhecem o valor, ou quando o campo simplesmente não veio.

| Recebido | Antes | Agora |
|----------|-------|-------|
| `prioridade: "Alta"` | alta | alta |
| `prioridade: "Média"` | media | media |
| `prioridade: "urgentíssimo"` | **media** | *em branco* |
| campo ausente | **media** | *em branco* |
| `tipoProjeto: "Campanha qualquer"` | **outro** | *em branco* |
| `tipoProjeto: "Outro"` | outro | outro |

> **"Outro" é uma escolha, não um palpite.** Quando alguém marca "Outro", está dizendo *"não é
> nenhum dos três"*. Quando a integração não entende o texto do e-mail, está dizendo outra coisa —
> e misturar as duas na mesma faixa esconde exatamente o que precisava ser conferido.

Isto é o mesmo princípio de [§6.0.3](#603-classificação-não-tem-default), aplicado à porta de
entrada automática. **Aqui pesa mais:** na criação manual há uma pessoa vendo a tela; na ingestão,
não há ninguém.

O que não foi classificado entra com `revisada: false`, ganha o **realce âmbar** de linha a
conferir (§9.2), e alguém resolve olhando o conteúdo original — que é onde a informação está.

---

## 11. Como conectar de verdade

O que existe hoje é o **contrato** e a regra. Falta o transporte. Quando houver backend:

```
Agente de e-mail                    Backend                     Backlog
─────────────────                   ───────                     ───────
lê a caixa
extrai os campos
POST /api/ingestao/email  ──────►   valida o segredo
                                    deEmail(payload)
                                    ingerirLote(...)     ─────► grava
                                    devolve o resumo
```

**Regras que já valem para esse dia:**

1. **O segredo do endpoint nunca no front-end** — nem em variável `VITE_*`, que vai para o bundle
   e é visível a qualquer pessoa (ver `services/email.ts`).
2. **A ingestão é idempotente**: chamar duas vezes com o mesmo lote produz o mesmo resultado. É o
   que permite reprocessar sem medo.
3. **O resumo do lote é a resposta** — `{ criadas, atualizadas, ignoradas, erros }`. Uma
   integração que não sabe dizer quantas linhas recusou e por quê é uma integração que falha em
   silêncio.

---

## 12. Permissões

O Backlog usa exatamente as três camadas do [PRD 07](07_visoes_e_relacoes.md):

| Camada | Aplicação aqui |
|--------|----------------|
| **Quadro** | Equipe com `backlog` liberado; membro vê só o que é dele |
| **Aba** | **Financeiro e Jurídico** exigem liberação explícita — as duas restritas |
| **Coluna** | **Toda coluna do catálogo** pode ser ocultada por equipe — não há `fixa: true` no Backlog; o que nunca some (Projeto) vive fora do catálogo (§6.1) |

`podeEditarOportunidade` deriva do nível de acesso, como nos demais quadros: escrita segue
leitura, e as duas não podem divergir.

---

## 13. Cobertura de teste

Contagens medidas em 04/08/2026 — o conjunto do repositório soma **33 suítes de regra e 1.451
asserções**, mais **97 testes de UI** (`testes-ui/`, Vitest + jsdom).

**`testeFluxo.mjs`** — 79 verificações:

- **O caminho**: cada origem com seus destinos exatos — incluindo Revisão → Declinado (04/08/2026)
- **Estados finais**: os **três desfechos terminais** sem saída; **StandBy tem saída**
  (→ Aguardando Feedback) — está em `DESFECHOS` sem ser terminal
- **O que não pode**: pular etapa, voltar, fechar direto, reabrir
- **Integridade da máquina**: todo status na tabela, todo destino conhecido, nenhum aponta para si
- **Alcançabilidade**: os 9 status são atingíveis desde Entrada — nenhum é código morto
- **Relógio**: dias corridos, fim de semana conta, sem data não mede, fallback para `entradaEm`
- **Limite**: 19 e exatamente 20 não encerram; 21 encerra
- **Desfecho nunca é encerrado de novo**
- **`aplicarEncerramentoAutomatico`**: encerra só quem passou, marca como automática, reinicia o
  relógio, **não muta a lista original** e é **idempotente**
- **Percurso completo** com o loop de ajuste, terminando em estado final
- **Janela de finalizados**: 30 dias inclusive, 31 sai; em andamento nunca conta; sem data aparece
- **Coerência card × lista**: `resumirPorStatus` e o filtro aplicam a mesma janela
- **Etapa ativa ignora a janela** — só desfecho tem prazo de validade na tela

**`testeColunas.mjs`** — 259 verificações:

- **Integridade**: todo id no formato `quadro:aba:campo`, nenhum repetido, toda coluna com rótulo
  e alinhamento (`left`/`center` — não há coluna alinhada à direita)
- **O contrato de largura**: pesos somam 78 em Talentos e 100 em Contratos; no Backlog, **toda
  coluna declara `largura` inteira entre 60 e 400px** — a soma 82 foi aposentada em 04/08/2026
- **Rótulo cabe na coluna**: a maior palavra de cada cabeçalho é medida contra `larguraDaColuna`
- **Espelhamento das âncoras**: mesmas colunas, mesmo rótulo, `field`, `campo`, largura e posição
  em toda seção — é o que permite tomá-las da primeira seção visível e congelá-las
- **Ordem das seções**, que é especificação da operação (Demanda abre; Links antecede o Time)
- **Colunas de área** declaram qual é — as nove do Time; Orçamento é a exceção nomeada
- **Nenhuma contagem sobrou do Escopo antigo** — as quatro (Reels/Vídeos/Post/Cotas) morreram com
  o texto corrido; o invariante hoje é o inverso do que era
- **Ações no início** do bloco congelado; o nome nunca no catálogo (é buscável à parte)

**`testeCliente.mjs`** — 25 verificações:

- **A ponte nome → cadastro**: acha sem hífen, sem caixa, sem acento — a mesma normalização da
  entidade, sem a qual "Coca Cola" perderia o cadastro da "Coca-Cola"
- **Os três vazios são distinguíveis**: sem marca · marca fora do cadastro · cadastro sem o campo
- **Campo em branco vira `undefined`**, não string vazia — a tela mostra os dois diferente
- **Contatos**: lista vazia (nunca `undefined`) para marca sem contato e para marca inexistente
- **A lista do painel**: uma entrada por valor mesmo com grafias diferentes, ordenada em pt-BR,
  ignorando os vazios
- **Captação**: opções com ids estáveis, toda opção explica o que é, e **ausente não vira a
  primeira** — o mesmo princípio das demais classificações

**`testeIngestao.mjs`** — 133 verificações:

- **Dias úteis:** sexta + 1 = segunda; somar e contar são a mesma régua
- **Farol:** verde, amarelo, "vence hoje", vermelho, cinza; percentual satura em 100
- **Pipeline:** só Entrada corre o SLA; o relógio para ao sair, mesmo atrasada
- **Ingestão:** entra não revisada, `exclusivo: false`, `pendencias: []`; manual entra revisada
- **Recusa:** sem título, e automática sem `idExterno`
- **Deduplicação:** por origem + id; id igual de outra origem não casa; reprocessar atualiza
- **Mesclagem:** revisado não é sobrescrito; campo vazio recebe; não revisado aceita tudo
- **Lote:** duplicata dentro do lote, contagem de recusas e o porquê de cada uma
- **Adaptadores:** Message-ID como chave, assunto como título, `Amount` em moeda, `High` → alta,
  `LeadSource`/`Origem__c` → input e origem
- **Filtros:** os seis recortes e a sobreposição deliberada
- **Campos comerciais:** os cinco inputs, cinco origens e quatro tipos; valor desconhecido cai no
  genérico, nunca num palpite
- **Normalização:** "Patrocínio", "sob demanda", "Inbound", "VIU First", "Globoplay" reconhecidos;
  e-mail entra como `inbound` por definição
- **Etapas:** cinco no fluxo, uma delas o loop; fluxo e desfechos **não se cruzam**
- **Resumo por status:** soma o legível e **reporta quantos ficaram de fora**
- **Rodapé:** farol, exclusivos, distribuição de input; encerrada fica fora do farol

**As demais suítes do quadro** — cada regra deste documento tem a sua:

| Suíte | O que trava |
|-------|-------------|
| **`testePendencias.mjs`** | Os gestos e as guardas do §6.5 — abrir/chegar/reabrir/descartar, a trava Elaboração→Revisão, e `comPendenciaImpossivel` com os três estados impossíveis plantados um a um |
| **`testeDeclinio.mjs`** | O §7.5 — motivo como qualificador, motivos por etapa, limpeza ao mudar de ideia |
| **`testeExportacao.mjs`** | O contrato do `.xlsx` (§6) — matriz, larguras `wch`, e a **ida-e-volta com a biblioteca real**: gera o arquivo e o relê |
| **`testeBusca.mjs`** | O §5.1 — campos visíveis, os sempre/nunca, apoios, E lógico normalizado |
| **`testeDuplicacao.mjs`** | O §6.6 — o que herda e o que não, datas que recomeçam, título corrigido, rastro que sobrevive à exclusão da origem |
| **`testeOrdenacao.mjs`** | O ciclo asc→desc→sem e a `ORDEM_CANONICA` (§6) |
| **`qaBacklog.mjs`** | Os estados impossíveis no seed e nos fluxos — valor sem tique (`comValorSemTique`), pendência impossível |
| **`jornadaBacklog.mjs`** | A tela inteira: cada etapa do mapa, cada card, coerência número × lista, e a integridade do próprio seed (§7.6) |
| **`testes-ui/backlog.test.tsx`** | Os 97 testes de UI — a prova de que a regra **chegou à tela** |

---

## 13.1. Decisões que precisam da operação

Escolhas feitas para não travar a implementação, e que valem confirmação:

### "Apoio" no Backlog, "parceiro" em Contratos

O mesmo papel — quem ajuda sem responder — tem dois nomes em dois quadros. O cartão de perfil da
coluna Orçamento já traduz um no outro, o que funciona e esconde o problema. **Vale escolher um.**

### A tela de cadastro existe, ainda sem colunas — e falta decidir a agência

A página **Cadastro de Clientes** foi criada em 02/08/2026, em branco. As marcas já existem como
dado e alimentam as colunas do Backlog; o que falta é a estrutura da tela. E a pergunta que precisa
ser respondida antes de desenhá-la é como representar a **agência**.

#### O problema

Uma demanda chega de dois jeitos:

1. **Direto da marca** — a Coca-Cola procura a casa
2. **Por uma agência** — a agência procura a casa **em nome da** Coca-Cola

Nos dois casos a marca é a mesma, e é dela que saem segmento, categoria e o nome que aparece no
relatório. O que muda é **quem está do outro lado da mesa**.

#### Proposta: uma entidade, com papéis — e a agência no projeto, não na marca

**Um cadastro só.** Marca e agência compartilham quase tudo: razão social, CNPJ, contatos,
observações. Duas tabelas obrigariam a cadastrar duas vezes a empresa que é as duas coisas — e ela
existe: uma agência que também contrata para si.

```ts
interface Organizacao {                    // hoje se chama `Marca`
  id, nome, contatos, observacoes, criadoEm;
  papeis: ('cliente' | 'agencia' | 'fornecedor')[];   // hoje é `tipo`, um só
  segmento: string;                        // só faz sentido para cliente
  categoria: string;
  cadastroPendente?: boolean;
}
```

**A agência é do projeto, não da marca.** Este é o ponto que decide o resto:

| Onde amarrar | O que acontece quando |
|--------------|----------------------|
| Agência **na marca** (cadastro) | A marca troca de agência → o histórico reescreve; usa duas ao mesmo tempo → não cabe |
| Agência **no projeto** ✅ | Cada linha guarda quem intermediou *aquele* negócio; trocar de agência não mexe no passado |

Uma agência atende várias marcas, e uma marca trabalha com várias agências ao longo do tempo. A
relação não é do cadastro — é **de cada negócio**.

```ts
interface Oportunidade {
  marca: string;        // quem é o cliente final — sempre preenchido
  agencia?: string;     // quem intermediou — ausente = negócio direto
}
```

**Ausente significa direto.** Não é preciso um campo "tipo de relação": a presença da agência já
diz. Um campo a mais poderia contradizer o outro.

#### O que isso muda nas telas

| Onde | Mudança |
|------|---------|
| **Backlog · aba Cliente** | Coluna **Agência** ao lado de Marca, mesma `SelecaoComCadastro`, filtrando por quem tem o papel `agencia` |
| **Backlog · coluna Contato** | Passa a oferecer os contatos **da marca e da agência** do projeto — num negócio intermediado, quem responde costuma ser da agência |
| **Cadastro de Clientes** | Duas abas sobre a mesma tabela: **Clientes** (papel `cliente`) e **Agências** (papel `agencia`). Quem tem os dois papéis aparece nas duas |
| **Relatório** | "Quanto veio por agência" vira contagem, não leitura de observação |

#### O que fica de fora por ora

- **Comissão de agência** — provavelmente existe e é assunto da aba Financeiro, não do cadastro
- **Contato por papel** (mídia, jurídico, financeiro) — hoje `contatos` é lista de strings; se a
  operação precisar distinguir, vira `{ nome, email, papel }`
- **Vínculo histórico marca ↔ agência** — deriva das oportunidades; não precisa de tabela própria

> **A decisão que se pede à operação:** confirmar que a agência é do projeto. Se na prática cada
> marca tem **uma** agência estável e a casa raramente vê duas, amarrar no cadastro seria mais
> simples de preencher — ao custo de reescrever o passado quando a marca trocar.

### Segmento e categoria ficam sem lista fechada

A lista do painel nasce dos valores já usados. É melhor que texto livre e pior que uma taxonomia
acordada: nada impede que alguém crie "Bebidas" e "Bebida" no mesmo mês, se digitar exatamente
assim. **Se a operação tiver uma lista oficial de segmentos, ela deve virar catálogo fixo.**

### ~~StandBy é um estado final~~ — resolvido em 02/08/2026

**Resolvido pela operação: StandBy volta para Aguardando Feedback** (§3.1). A pergunta registrada
aqui era exatamente essa — *se StandBy deve voltar, para onde?* — e a resposta veio junto com a
constatação de que ninguém usava o status justamente por ele ser sem volta.

### O relógio dos 20 dias reinicia a cada movimento

Como `statusDesde` é regravado a cada transição, mover de Revisão para Ajuste e voltar zera a
contagem duas vezes. Um projeto pode ficar meses vivo enquanto alguém o empurra de um lado para
outro sem avançar.

*Se o que importa é o tempo total sem desfecho, a régua deveria ser `entradaEm`* — e aí um
projeto legítimo mas longo seria encerrado. A escolha atual favorece quem está trabalhando; a
alternativa favorece a faxina.

---

## 14. Limitações conhecidas

| Limitação | Impacto |
|-----------|---------|
| **Sem transporte** | O contrato existe e é testado; falta o endpoint que o chama |
| Feriados não contam | O SLA pula só sábado e domingo — falta o calendário da operação |
| Sem histórico de status | Sabe-se onde está e desde quando, **não por onde passou** — o desenho `StatusEvento` já existe no schema Prisma; o front não grava por decisão de 04/08/2026 (§6.5) |
| Encerramento só ao carregar | Sem backend, não há job; a mudança acontece quando alguém abre o sistema |
| Valor é texto livre | A soma interpreta o que consegue e reporta o resto; sem máscara nem validação |
| Sem agrupamento por status na grade | O mapa do fluxo filtra, mas a tabela não agrupa |
| Finalizados antigos só no banco | Por decisão: a análise é do Power BI. A tela conta quantos são, mas não os lista |
| Sem virtualização | A lista rola, mas renderiza todas as linhas — reavaliar acima de ~500 no mesmo recorte |
| Sem anexos | O PRD 01 previa aba de anexos e links |
| Sem Kanban nem calendário | Só a visão de tabela |

Duas linhas saíram desta tabela por terem sido **resolvidas**: *StandBy é terminal* (tem saída
para Aguardando Feedback desde 02/08/2026 — §3.1) e *vínculo com Talentos não cria ficha* — hoje
nome novo nas colunas Talento e Marca **cria o cadastro pendente na hora** (`garantirTalento` /
`garantirMarca`, §6.0.1), como no quadro de Contratos.
