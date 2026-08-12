# PRD 06 — Página "Talentos"
**Versão:** 3.8 | **Status:** Implementado (front-end, exportação nativa em Excel `.xlsx`, persistência local) | **Data:** 12/08/2026

[← Índice da documentação](README.md) · *Cadastro de talentos*


> Documento de replicação. Descreve **tudo** que a página faz hoje — regras, comportamentos,
> valores exatos e decisões — em nível suficiente para reconstruí-la do zero sem consultar o
> código.
>
> Código em [`src/pages/Talentos.tsx`](../src/pages/Talentos.tsx),
> [`src/components/talentos-exclusivos/`](../src/components/talentos-exclusivos/),
> [`src/utils/exportacao.ts`](../src/utils/exportacao.ts) e
> [`src/utils/talentos.ts`](../src/utils/talentos.ts).
> Permissão por aba e busca em [`07_visoes_e_relacoes.md`](07_visoes_e_relacoes.md).
> Padrões visuais em [`03_padroes_ui.md`](03_padroes_ui.md).

> ### Histórico de mudanças
>
> | Versão | O que mudou | Motivo |
> |--------|-------------|--------|
> | **3.7** | **Exportação em `.xlsx` de verdade** | Botão Exportar adicionado na barra de tarefas para baixar a grade cadastral completa em arquivo Excel nativo (04/08/2026) |
> | **3.6** | `AreaTalento` passa a **10 valores** — Pagamento, Jurídico (02/08/2026) e as duas frentes de produção, Produtor Artístico e Executivo (03/08/2026), respondem **por projeto** e vivem no Backlog, fora de `areasDoTalento()` | "Quem paga a Marina Duarte" não é pergunta; a ficha segue com 6 áreas |
> | **3.3** | **Filtros clicáveis** na barra: Todos · Exclusivos · Interveniência · Pendentes | O contador de pendentes informava, mas não levava a lugar nenhum |
> | **3.2** | Responsáveis por área viram **lista** | Dupla de produção e substituto são situações correntes |
> | **3.2** | Linha de criação preenche **todas as colunas** | Quem já tem os dados não deve digitar o nome, salvar e voltar célula a célula |
> | **3.2** | Ficha pode nascer de um contrato, como **pendente** | Nome sem cadastro era um beco |
> | **3.1** | **Permissão por coluna** — célula vira borrão | "Tem acesso à aba, mas não a todas as colunas" |
> | **3.1** | Empresa, Local e Razão social viram **referência** | Evita "São Paulo" e "Sao Paulo" convivendo |
> | **3.1** | Colunas migram para o catálogo `colunas.ts` | Id de permissão e coluna visual não podem divergir |
> | **3.0** | Passa a abrigar **interveniência** no mesmo cadastro, via campo `tipo` | Mesma pessoa, muda o vínculo comercial. Dois cadastros duplicariam tudo |
> | **3.0** | Abas passam a **6**, com Redes e Financeiro novas | Redes saiu de uma coluna solta; financeiro não existia |
> | **3.0** | **Permissão por aba** (Contato e Financeiro restritas) | "Sou da área X, não devo ter acesso a dados pessoais" |
> | **3.0** | **Busca** que respeita as abas visíveis | Buscar em campo oculto confirmaria o dado |
> | **3.0** | `table-fixed` + `<colgroup>` | O cabeçalho saía do lugar ao trocar de aba |
> | **3.0** | Página renomeada de "Talentos Exclusivos" para **"Talentos"** | Já não é só de exclusivos |
> | 2.0 | Grade de cards → **tabela** com abas | O produto tem um padrão: quadro é tabela |
> | 2.0 | Área → **pessoa** (era equipe) | "Quem responde?" pede um nome |
> | 2.0 | Área `produto` → `conteudo` | Alinhamento com as equipes reais |

---

## 1. Propósito

Guardar o **cadastro dos talentos agenciados** — exclusivos e de interveniência — e registrar
**quem responde por cada frente de trabalho** deles.

### 1.1. A distinção que justifica a página

| | Contratos de Agenciados | Talentos |
|---|---|---|
| Unidade | Uma linha por **contrato** | Uma linha por **pessoa** |
| Vive de | Prazo, status, esteira | Contato, redes, dados comerciais, responsabilidade |
| Cresce com | O tempo — um talento acumula contratos | A carteira |

Um talento tem vários contratos ao longo do tempo; os dados dele (empresa, contato, quem cuida)
não pertencem a nenhum contrato específico. Guardá-los na linha do contrato significaria
repeti-los e vê-los divergir. Daí a separação.

### 1.2. Exclusivo e interveniência no mesmo cadastro

`Talento.tipo` distingue os dois:

| Tipo | Significado | Áreas de responsabilidade |
|------|-------------|---------------------------|
| **Exclusivo** | Agenciado pela casa | Sim — as 6 áreas |
| **Interveniência** | Contratos tocados sem exclusividade | Não se aplicam |

> **Por que um campo, e não dois cadastros.** É a mesma pessoa: mesmo nome, mesmo contato, mesmas
> redes, mesmo CNPJ. O que muda é o vínculo comercial. Dois quadros separados duplicariam tabela,
> busca e permissões — e, no dia em que alguém virasse exclusivo, exigiriam migrar o registro de
> um lado para o outro, com risco de partir o histórico. Aqui, promover é trocar um campo.

Talento novo **nasce como interveniência** — o vínculo mais frouxo. Declarar exclusividade é uma
decisão comercial; nascer no grau mais alto faria a lista de exclusivos inchar por descuido.

Na aba **Responsáveis**, a linha de um talento de interveniência não mostra 6 botões inúteis: ela
vira um aviso — *"Áreas de responsabilidade valem para talentos exclusivos"*.

---

## 2. Estrutura

Tabela única, no padrão dos demais quadros. As **abas trocam o grupo de colunas visível**, não o
conjunto de linhas — é o mesmo quadro visto por outro ângulo.

```
Header (padrão do produto)
└── main #f4f6fa
    └── TalentosTable
        ├── faixa bg-plano → 6 abas (só as que a sessão enxerga)
        ├── barra de ações → busca · contagem · excluir em lote · marcar visíveis
        └── tabela         → checkbox + Talento (fixa) + colunas da aba + Ações
```

### 2.1. Cabeçalho

- **Título:** `Talentos` (o componente aplica `uppercase` + `tracking-[0.22em]`)
- **Subtítulo:** *"Cadastro dos talentos agenciados — exclusivos e de interveniência — com contato, redes, dados comerciais e quem responde por cada frente."*
- **Hints:** ⭐ Exclusivos e interveniência no mesmo lugar · 🪪 Uma linha por talento · 👥 Cada área puxa gente da sua equipe

### 2.2. As seis abas

Faixa `bg-plano` — o mesmo tom da sidebar desde 12/08/2026 ([03 §1.0.1](03_padroes_ui.md)) —, aba ativa em `indigo-600`, exatamente como o farol dos Contratos. Abas restritas
levam um cadeado.

| Aba | Restrita | Colunas | Largura mín. |
|-----|:--------:|---------|--------------|
| **Identificação** | — | Tipo · Nome artístico · Empresa · Áreas · Criado em | `900px` |
| **Contato** | 🔒 | E-mail · Telefone · Local · Observações | `900px` |
| **Redes** | — | Instagram · TikTok · YouTube · Facebook · X · Site · contador | `1100px` |
| **Financeiro** | 🔒 | Razão social · CNPJ · Faturamento · Pagamento · Dados bancários | `1050px` |
| **Responsáveis** | — | Talent · Orçamento · GP · Audiência · Conteúdo · Produção | `1100px` |
| **Contratos** | — | Contratos · Vigentes · A vencer · Vencidos · Próximo fim | `900px` |

A coluna **Talento** aparece em todas, à esquerda, com avatar de iniciais, um ponto colorido do
tipo no canto e o nome artístico abaixo. **Ações** fecha toda aba.

**Abas que a sessão não enxerga não são renderizadas** — não aparecem desabilitadas. Uma aba cinza
anuncia o dado que esconde. Detalhes em [`07_visoes_e_relacoes.md`](07_visoes_e_relacoes.md).

> **Por que abas e não uma tabela larga:** 25 colunas numa rolagem horizontal única é ilegível.
> Agrupadas por assunto, cada uma responde a uma pergunta: "quem é?", "como falo?", "onde
> publica?", "como fatura?", "quem cuida?", "como está?".

Trocar de aba **ou buscar** limpa a seleção — excluir em lote a partir de uma tela que a pessoa
não estava olhando é como se perde registro.

Se a sessão perder acesso à aba aberta (troca de "Ver como", por exemplo), a tabela cai
automaticamente na primeira aba que sobrou.

### 2.3. Alinhamento — `table-fixed` obrigatório

A tabela usa `table-fixed` com um `<colgroup>` de larguras explícitas que **somam 100%**.

> **O bug que isto corrige:** sem `table-fixed`, o navegador redistribui a sobra entre as colunas
> conforme o conteúdo de cada linha. Como cada aba tem um número diferente de colunas, o cabeçalho
> saía do lugar ao trocar de aba — "TALENTO" aparecia no meio da tela, o checkbox desalinhado do
> resto. Rótulos longos também quebravam em duas linhas; por isso `truncate` no rótulo e
> `shrink-0` no ícone de ordenação.
>
> A mesma correção foi aplicada ao quadro de Contratos, cujas larguras foram reajustadas para
> somar exatamente 100%.

---

## 3. Colunas por aba

### 3.1. Identificação

| Coluna | Comportamento |
|--------|---------------|
| **Tipo** | Etiqueta clicável (`TipoSelect`) — abre em portal com as duas opções e suas descrições |
| Nome artístico · Empresa | Texto, edição estilo planilha |
| **Áreas** | Contador de áreas definidas para exclusivo; `—` para interveniência. *Deveria ser `N/6` (as áreas da ficha); hoje exibe `N/10` — limitação registrada na §11* |
| Criado em | Somente leitura, `title` com data e hora |

### 3.2. Contato — 🔒 restrita

E-mail · Telefone · Local · Observações. Todas em edição estilo planilha.

### 3.3. Redes

Uma coluna por rede, guardando **só o identificador** — sem `@` e sem URL.

| Rede | Prefixo exibido |
|------|-----------------|
| Instagram · TikTok · YouTube · X | `@` |
| Facebook | `/` |
| Site | nenhum |

A escrita normaliza na entrada: `@marina` e `https://instagram.com/marina` viram `marina`. Guardar
a URL inteira quebraria a montagem do link quando houver navegação.

A última coluna conta quantas das 6 estão preenchidas.

### 3.4. Financeiro — 🔒 restrita

Razão social · CNPJ · Faturamento · Condição de pagamento · Dados bancários.

Todos **texto livre**: moeda, periodicidade e formato de conta variam por contrato, e uma máscara
rígida hoje só produziria dado torto até a operação fixar o padrão.

> **Razão social ≠ Empresa.** `empresa` é o nome comercial, que aparece na identificação;
> `razaoSocial` é o nome jurídico, que vai no contrato. Costumam divergir.

### 3.5. Responsáveis

Uma coluna por área, cada célula com **uma ou mais** pessoas (`AreaResponsavelCell`).

| Área | Descrição | Equipe que atende |
|------|-----------|-------------------|
| **Talent** | Acompanha e trata diretamente com o talento | Gestão de Talent Manager |
| **Orçamento** | Orça os projetos que envolvem o talento | Gestão de Orçamentos |
| **GP** | Gerência de Produto — *atribuição a definir com a operação* | GP |
| **Audiência** | Acompanha desempenho e dados de audiência | Gestão de Audiência |
| **Conteúdo** | Responde pelo conteúdo e pelos formatos do talento | Gestão de Conteúdo |
| **Produção** | Executa e viabiliza as entregas | Gestão de Produção |

> **Pendência de negócio:** o significado operacional de **GP** ainda não foi definido pela
> operação. A área existe e funciona; a descrição é provisória.

> **As 6 são as áreas da ficha, não todas.** `AreaTalento` tem **10 valores**: as 4 restantes —
> Pagamento, Jurídico e, desde 03/08/2026, **Produtor Artístico** e **Executivo** — respondem
> **por projeto** e aparecem como colunas de pessoas do Backlog, não aqui. `areasDoTalento()`
> filtra as 6 desta aba (ver §5).

**Vários por área.** A v2.0 aceitava uma pessoa só, com o argumento de que "duas respostas para
'quem responde' seriam nenhuma". A operação mostrou o contrário: dupla de produção e um titular
com substituto são situações correntes, e forçar uma pessoa deixava a segunda fora do registro —
e portanto **fora do acesso**, já que a nomeação é o que abre a linha para o membro.

Comportamento da célula:

- Um avatar por responsável, empilhados, com cartão de perfil no hover
- Botão `+` abre o painel; **o painel fica aberto** ao escolher, porque adicionar vários seguidos
  é o caso comum
- O painel mostra no topo **qual equipe atende a área**, o total quando há mais de um, e busca por
  nome ou e-mail
- Clicar em quem já responde o **remove** — o mesmo gesto liga e desliga
- Área que fica sem ninguém **perde a chave** em vez de guardar lista vazia: "sem responsável" e
  "lista vazia" seriam dois jeitos de dizer a mesma coisa, e um deles acabaria não testado
- Vazio, o painel orienta: *"Crie a equipe X em Administração › Equipes e marque a área Y"*

### 3.6. Contratos

Somente leitura, derivado do quadro de Contratos:

| Coluna | Cálculo |
|--------|---------|
| Contratos | Total ligado ao talento |
| Vigentes · A vencer · Vencidos | Contagem por cor do farol; zero fica cinza |
| Próximo fim | Menor data de término entre os que ainda não venceram |

---

## 4. Busca, filtros e criação

### 4.1. Filtros

Chips clicáveis na barra de ações, à direita da busca:

| Filtro | O que recorta |
|--------|---------------|
| **Todos** | Tudo que a sessão enxerga |
| **Exclusivos** | `tipo === 'exclusivo'` |
| **Interveniência** | `tipo === 'interveniencia'` |
| **Pendentes** | `cadastroPendente` — só aparece quando há o que resolver |

- Clicar no filtro ativo volta para **Todos** — o mesmo gesto liga e desliga
- Os contadores medem o **quadro inteiro** que a pessoa enxerga, não o resultado da busca; senão
  o número mudaria a cada tecla
- Trocar de filtro limpa a seleção, como a busca

> **São recortes, não fatias.** Uma ficha pendente também é exclusiva ou de interveniência: somar
> os quatro contadores **não** dá o total, e é o esperado.

### 4.2. Busca

Campo na barra de ações, com contador `N de M` e `Esc` para limpar. Varre nome, nome artístico,
empresa, contato, redes, dados financeiros e responsáveis — **restrito às colunas que a sessão
enxerga**. A regra e o porquê estão em [`07_visoes_e_relacoes.md`](07_visoes_e_relacoes.md) §5.

**Ordem:** filtro primeiro, busca depois — a busca opera dentro do recorte escolhido.

### 4.3. Criação — o botão insere a ficha

**"Novo talento" insere a linha no topo da lista, com o nome já em edição.** Não há formulário nem
linha de rascunho: preencher é editar, com a mesma edição inline das linhas antigas.

| O que nasce preenchido | Valor |
|------------------------|-------|
| **Nome** | `Sem nome` — provisório, selecionado para digitar por cima |
| **Tipo** | `interveniencia`, o vínculo mais comum |
| **Criado em** | agora |
| Contato · redes · dados comerciais | vazios |
| Responsáveis por área | **vazios** — atribuir é escolha explícita |

> ### O provisório é numerado: `Sem nome`, `Sem nome 2`, `Sem nome 3`…
>
> O cadastro **recusa nomes repetidos** (§6). Sem numerar, criar duas fichas seguidas sem renomear
> a primeira falharia — e falharia **em silêncio**, porque `criarTalento` devolve `null` e o botão
> não teria o que fazer com isso.

Some inteiro para quem não pode criar. A regra completa, comum aos três quadros, está em
[03 §7.8](03_padroes_ui.md).

#### Modelo anterior, descartado

Houve uma **linha verde fixa** com um campo por coluna da aba aberta, e um botão "Inserir na
lista". Ela chegou a preservar o rascunho entre abas — mas o custo era **dois gestos para criar uma
linha**, e o preenchimento por célula acontece de qualquer forma depois. A etapa intermediária só
adiava o mesmo trabalho.

### 4.4. Ficha criada a partir de um contrato

Escrever um nome novo na coluna Talento de um contrato **abre a ficha aqui**, marcada como
`cadastroPendente`: etiqueta âmbar na linha e contador na barra de ações.

A marca some ao primeiro dado preenchido além do nome. Regra completa em
[`07_visoes_e_relacoes.md`](07_visoes_e_relacoes.md) §11.1.

---

## 5. Modelo de dados

```ts
type TipoTalento = 'exclusivo' | 'interveniencia';
/** Como o talento chegou à casa — atributo da FICHA, não de cada projeto. */
type OrigemTalento = 'casting' | 'indicacao' | 'prospeccao' | 'globo' | 'inbound';
type AreaTalento =
  | 'talent' | 'orcamento' | 'gp' | 'audiencia' | 'conteudo' | 'producao'  // ficha (6 áreas)
  | 'pagamento' | 'juridico' | 'artistico' | 'executivo';                  // por projeto (Backlog)

interface RedesTalento {
  instagram, youtube, tiktok, facebook, x, site: string;   // só o identificador
}

interface Talento {
  id, nome, nomeArtistico, empresa, criadoEm;
  tipo: TipoTalento;
  /** Ausente é "não classificado", que não é nenhuma das opções — ver §5.1. */
  origem?: OrigemTalento;
  // Contato (aba restrita)
  email, telefone, local, observacoes;
  redes: RedesTalento;
  // Financeiro (aba restrita)
  razaoSocial, cnpj, faturamento, condicaoPagamento, dadosBancarios;
  /** usuarioIds por área. Chave ausente ou lista vazia = a definir. */
  responsaveis: Partial<Record<AreaTalento, string[]>>;
  /** Ficha aberta por um contrato e ainda sem curadoria. */
  cadastroPendente?: boolean;
}

interface Equipe {
  /* ... */
  areaTalento?: AreaTalento;      // qual área esta equipe atende
  visoesLiberadas?: string[];     // abas restritas liberadas
}
```

### 5.1. Dois níveis: equipe define, pessoa responde

A **equipe** atende a área e define quem pode ser nomeado; a **pessoa** dessa equipe é quem
responde por aquele talento naquela área.

Só a equipe seria genérico demais — ninguém sabe a quem falar. Só a pessoa seria frágil — ela sai
de férias e o campo vira um nome morto. Os dois juntos dão nome e continuidade.

**Uma área é atendida por uma equipe só.** Marcar a área numa equipe desmarca em quem a atendia
antes — `definirAreaDaEquipe`, operação do **`DadosProvider`** ([04 §8](04_pagina_equipes.md)),
não de `utils/`; duas equipes na mesma área fariam a lista de candidatos depender de qual viesse
primeiro no array.

### 5.2. Quem já responde nunca some da lista

`candidatosDaArea` inclui o responsável atual mesmo que ele tenha saído da equipe — senão a ficha
mostraria um nome impossível de trocar.

Do mesmo modo, **excluir a equipe não apaga os responsáveis já nomeados por ela**: some apenas a
lista de candidatos para novas nomeações, até que outra equipe assuma a área. Tirar os nomes seria
apagar responsabilidade em vigor por um evento administrativo.

---

## 5.1. `origem` — o campo que a página ainda não mostra

Entrou em 02/08/2026 com a aba Talento do Backlog, que **lê e escreve** nele. A página Talentos
ainda não tem coluna para ele.

Não é esquecimento — é a regra de trabalhar uma página por vez. Acrescentar a coluna aqui seria
propagar uma mudança do Backlog para este quadro sem que ninguém tenha pedido, e cada quadro tem
sua conversa.

**Onde ele deveria entrar quando entrar:** aba Identificação, ao lado de Tipo. As duas descrevem o
vínculo — uma diz qual é, a outra como começou.

> **Enquanto isso, o dado é editável só pelo Backlog.** É um caminho estranho — preencher a ficha
> de uma pessoa a partir de um projeto —, mas melhor que não ter caminho nenhum. A dica na célula
> avisa o alcance: *"Da ficha de Marina Duarte — vale para todos os projetos dela"*.

---

## 6. Vínculo entre talento e contrato

`TalentContract.talentoId?: string` — opcional, porque contrato de interveniência não tem ficha.

### 6.1. Como o vínculo nasce

Ao **digitar ou criar** a linha do contrato, o nome é comparado com os talentos cadastrados
(normalizado); casando, `talentoId` é preenchido sozinho. Trocar por outro nome desfaz o vínculo.
Ninguém precisa saber que existe um id.

### 6.2. Como os contratos são reunidos

`contratosDoTalento()` aplica, nesta ordem:

1. `contrato.talentoId === talento.id` — vínculo explícito, **vence sempre**
2. `!contrato.talentoId && nome normalizado bate` — legado, para contratos criados antes da ficha

Comparar **só** por nome seria frágil: dois "João Silva" virariam um. Por isso o id tem
precedência e um contrato já vinculado a **outro** talento nunca é capturado por homonímia.

### 6.3. Renomear e excluir

| Ação | Efeito |
|------|--------|
| Renomear o talento | Os contratos **vinculados por id** recebem o novo nome |
| Excluir o cadastro | Os contratos **permanecem**; perdem só o `talentoId` e mantêm o nome escrito |

Princípio da plataforma: **acesso se corta, histórico não se apaga**.

---

## 7. Permissões

Duas camadas independentes, aplicadas nesta ordem:

### 7.1. Quais linhas — regra de quadro

Completa em [`05_perfis_usuarios.md`](05_perfis_usuarios.md) §3.4; vale para **todos** os quadros.

| Quem | Enxerga | Edita |
|------|---------|-------|
| Dono / Admin | Todas as fichas | Todas |
| Responsável (equipe com o quadro) | Todas as fichas | Todas |
| Membro (equipe com o quadro) | **Só as fichas em que é responsável de alguma área** | As mesmas |
| Nomeado, fora da equipe do quadro | **Só as fichas em que é responsável** | As mesmas |
| Sem equipe e sem nomeação | Nada — quadro aparece com cadeado na barra lateral | — |
| "Ver como" | Igual à pessoa simulada | ❌ escrita bloqueada |

**Criar ficha exige a porta da equipe**, não a da nomeação: quem entrou só porque nomearam seu
nome vê aquela linha e nada além — abrir outra alargaria sozinho o próprio alcance.

Ficha sem nenhum responsável definido trava todo membro: não há a quem atribuir. É por isso que
uma ficha de **interveniência** (que não tem responsáveis por área) só é editada por responsável
ou admin.

### 7.2. Quais colunas — regra de aba e de coluna

Completa em [`07_visoes_e_relacoes.md`](07_visoes_e_relacoes.md).

| Aba | Quem vê |
|-----|---------|
| Identificação · Redes · Responsáveis · Contratos | Quem vê o quadro |
| **Contato** · **Financeiro** | Dono, admin, ou equipe com a aba liberada |

Dentro da aba, o admin ainda pode **ocultar colunas** específicas: a célula vira um borrão que
preserva a largura da tabela. Modelo completo em
[`07_visoes_e_relacoes.md`](07_visoes_e_relacoes.md).

As três camadas se combinam livremente: alguém pode ver **todas as linhas** e nenhuma aba
sensível; ou **uma linha só** com todas as abas menos duas colunas.

---

## 8. Decisões e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---------|------------------------|--------|
| Exclusivo e interveniência num cadastro só, com `tipo` | Dois quadros separados | Mesma pessoa; separar duplicaria tabela, busca e permissões, e exigiria migrar registro ao promover |
| Nasce como interveniência | Nasce como exclusivo | Exclusividade é decisão comercial; o padrão frouxo evita inchar a lista por descuido |
| Permissão por **aba** | Permissão só por quadro | "Não devo ver dado pessoal, mas posso ver contrato e rede" não cabe em tudo-ou-nada |
| Aberta por padrão, restrita por declaração | Tudo fechado até liberar | Equipe nova nasceria cega; alguém liberaria tudo e a distinção morreria |
| Busca limitada às abas visíveis | Busca em todos os campos | Buscar em campo oculto confirma o dado sem exibi-lo |
| Redes em aba própria, uma coluna por rede | Uma coluna "Redes" com texto livre | Seis perfis não cabem num campo; separados dá para filtrar e, depois, linkar |
| Guardar só o identificador da rede | Guardar a URL | URL varia de formato e quebra a montagem do link |
| Financeiro em texto livre | Campos tipados com máscara | Moeda, periodicidade e conta variam; máscara rígida produziria dado torto |
| `table-fixed` + `<colgroup>` | Larguras no `className` do `<th>` | Sem isto o cabeçalho sai do lugar ao trocar de aba |
| Tabela com abas de colunas | Grade de cards (v1.0) | O produto tem um padrão: quadro é tabela |
| Abas na faixa escura (`bg-plano`) | Abas claras sobre a tabela | A faixa já é o lugar da navegação do quadro nos Contratos |
| Área → pessoa, da equipe da área | Área → equipe (v1.0) | "Quem responde?" pede um nome; equipe sozinha é genérica |
| `Equipe.areaTalento` | Casar equipe pelo nome | Nome se edita; id não |
| **Vários** por área | Uma pessoa só (v2.0) | Dupla e substituto existem; forçar uma deixava a segunda sem acesso |
| Linha de criação com todas as colunas | Só o nome (v3.0) | Quem tem os dados não deve salvar e voltar célula a célula |
| Nome sem ficha **cria** a ficha | Só avisar "sem cadastro" | O aviso dependia de alguém lembrar de abrir o cadastro depois |
| Coluna oculta vira borrão | Célula some | Coluna que some desmonta a tabela e o cabeçalho perde o alinhamento |
| Colunas de repetição viram referência | Texto livre em tudo | "Gil do Vigor" e "Gilberto do Vigor" coexistiriam sem ninguém notar |
| Vínculo automático por nome | Seletor de talento na linha do contrato | Quem opera digita o nome; um seletor obrigaria a cadastrar antes |
| Id vence nome | Só o nome | Homônimos fundiriam históricos distintos |
| Excluir preserva contratos | Cascata | Histórico não se apaga |

---

## 9. Arquivos

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/pages/Talentos.tsx` | Página, filtro de linhas e de abas, busca, criação |
| `src/components/talentos-exclusivos/TalentosTable.tsx` | Abas, colunas, grade, criação, exclusão |
| `src/components/talentos-exclusivos/AreaResponsavelCell.tsx` | Célula de responsável por área |
| `src/components/talentos-exclusivos/TipoSelect.tsx` | Etiqueta do vínculo comercial |
| `src/components/ui/BuscaQuadro.tsx` | Campo de busca, compartilhado com Contratos |
| `src/utils/talentos.ts` | `AREAS`, `TIPOS`, `REDES`, equipe da área, candidatos, nomeados |
| `src/utils/visoes.ts` | Catálogo de abas e permissão por aba |
| `src/utils/busca.ts` | Filtros dos dois quadros, respeitando as abas |
| `src/utils/permissoes.ts` | `nivelDeAcesso`, `registrosVisiveis`, `podeEditarTalento` |
| `src/data/talentos.ts` · `src/data/equipes.ts` | Seeds |
| `src/types.ts` | `Talento`, `TipoTalento`, `RedesTalento`, `AreaTalento`, `Equipe.*` |

---

## 10. Cobertura de teste

**`testeTalentos.mjs`** — 79 verificações (medição 04/08/2026):

- **Áreas:** trava as **10** de `AreaTalento` — rótulo/cor/descrição/equipe sugerida — e as 6 de
  `areasDoTalento()` na ordem das colunas da ficha
- **Vínculo comercial:** dois tipos; tipo inválido cai em interveniência (padrão seguro)
- **Redes:** as 6 na ordem; vazias em branco; contagem ignora espaço em branco
- **Equipe da área:** acha, não acha, e área sem equipe não tem candidato
- **Candidatos:** saem da equipe da área; quem já responde permanece mesmo tendo saído
- **Nomear:** define, troca, limpa, **não muta o original**, conta as definidas
- **Contratos:** reúne por id e por nome; homônimo de outro cadastro fica de fora
- **Nível de acesso · filtro de linhas · edição · criação:** os casos da §7.1

**`testeVisoes.mjs`** — 43 verificações sobre abas e busca (detalhe no PRD 07).

**`jornadaVisoes.mjs`** — 39 verificações sobre o **seed real**, 8 etapas, percorrendo o caso
completo de "sou da área X".

---

## 11. Limitações conhecidas

| Limitação | Impacto |
|-----------|---------|
| Contador de Áreas usa `AREAS.length` (`TalentosTable.tsx:269-277`) | Exibe `N/10`, mas a ficha só nomeia as 6 de `areasDoTalento()` — o verde de "todas definidas" é **inalcançável** |
| Aviso de interveniência com `colSpan` de 10 (`TalentosTable.tsx:347`) | A aba Responsáveis tem 6 colunas de área; o `colSpan={AREAS.length}` estoura a largura declarada da linha |
| Linha de exclusivo itera as 10 áreas sobre um catálogo de 6 colunas (`TalentosTable.tsx:353-369`) | `colunas[indice].id` é um **TypeError latente** a partir da 7ª área — o `AREAS.map` deveria ser sobre `areasDoTalento()` |
| Filtros não se combinam | Um por vez: não dá para ver "exclusivos pendentes" |
| Redes não viram link | Guarda o identificador, mas ainda não monta a URL clicável |
| Financeiro sem validação | CNPJ e valores são texto livre — sem máscara nem verificação |
| Sem foto do talento | Só iniciais; o upload existe para usuários, não para talentos |
| Sem paginação | A tabela renderiza tudo — reavaliar acima de ~200 fichas |
| Sem histórico de troca de responsável | Sabe-se quem responde hoje, não quem respondia antes |
| Sem agrupamento | Contratos agrupa por status/talento/responsável; aqui ainda não |
| `GP` sem definição | Área funciona, significado pendente com a operação |
