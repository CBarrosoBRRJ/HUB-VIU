# PRD 09 — Fundações Técnicas
## Plataforma de Gestão e Talentos — Globo VIU Agenciamento
**Versão:** 1.6 | **Status:** Vigente | **Data:** 11/08/2026

[← Índice da documentação](README.md) · *Datas, moeda, persistência e IDs*


> As regras que atravessam todas as telas: como se lê uma data, como se soma um valor em reais,
> onde o dado vive enquanto não há banco, e como nasce um identificador.
>
> Estão reunidas aqui porque **cada uma delas já produziu um defeito**. São o tipo de detalhe que
> parece trivial até somar mil vezes menos do que deveria.

---

## 1. Datas

**Onde cada regra mora.** [`dates.ts`](../src/utils/dates.ts) guarda só a *exibição*: `formatDate`,
`todayISO`, `formatDataCurta` e `formatDataHora`. A conversão segura de `yyyy-mm-dd` em `Date`
(`parseISO`/`parseData`) vive **junto de quem a usa** — [`sla.ts`](../src/utils/sla.ts),
[`fluxoStatus.ts`](../src/utils/fluxoStatus.ts), [`oportunidades.ts`](../src/utils/oportunidades.ts)
e [`vigencia.ts`](../src/utils/vigencia.ts) —, e as comparações por dia (`86_400_000` ms) estão
nesses três últimos. Não há um módulo central de aritmética de datas: cada régua fica ao lado da
regra que a explica, e o padrão abaixo é o contrato que todas seguem.

### O formato interno é `yyyy-mm-dd`, sempre

Datas de negócio (entrada, deadline, vigência, `statusDesde`) são strings `yyyy-mm-dd`. Datas de
auditoria (`criadoEm`, `expiraEm`) são ISO completo com hora.

A escolha do formato curto não é estética: `yyyy-mm-dd` **ordena lexicograficamente na mesma ordem
cronológica**, então `localeCompare` funciona sem conversão, e o `<input type="date">` do navegador
fala exatamente esse formato.

### A armadilha do fuso

```ts
new Date('2026-08-01')            // ❌ meia-noite UTC → 31/07 no Brasil
new Date(2026, 7, 1)              // ✅ meia-noite local
```

**`new Date('yyyy-mm-dd')` interpreta a string como UTC.** No fuso do Brasil (UTC-3), isso volta
para as 21h do dia anterior — e toda data exibida aparece **um dia antes**.

A regra: para converter `yyyy-mm-dd` em `Date`, quebre em partes e use o construtor numérico.

```ts
const [ano, mes, dia] = iso.split('-').map(Number);
const data = new Date(ano, mes - 1, dia);
```

> Este defeito é especialmente traiçoeiro porque **não aparece em testes rodados de manhã**: com o
> processo em UTC, ou o fuso local sendo UTC+, a data bate. Ele só se manifesta no navegador do
> usuário, e só às vezes.

### Comparação por dia, não por instante

Ao medir diferença em dias, zere as horas dos dois lados:

```ts
const hoje = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
const dias = Math.floor((hoje.getTime() - desde.getTime()) / 86_400_000);
```

Sem isso, "20 dias" vira 19 ou 21 dependendo da hora em que a página foi aberta.

### `referencia = new Date()` como parâmetro

Toda função que depende de "hoje" recebe a data como **último parâmetro, com default**:

```ts
export function finalizadaRecentemente(op: Oportunidade, referencia = new Date()): boolean
```

Em produção ninguém passa o argumento; nos testes, passa-se uma data fixa. Sem esse parâmetro, a
única forma de testar seria mexer no relógio da máquina — e a suíte passaria a falhar em datas
específicas do calendário.

#### A convenção é antiga; cumpri-la em toda parte é que faltava

Em 11/08/2026 duas funções de permissão foram alinhadas: `podeGerenciarEquipe` e `podeExcluirEquipe`
consultavam o relógio **lá no fundo**, via `getPapelNaEquipe`, e não deixavam ninguém escolher qual
era o "hoje". A responsabilidade temporária vence na leitura ([04 §4](04_pagina_equipes.md)), então
a resposta delas muda com o calendário — e o teste que montava uma janela de sete dias a partir de
uma data fixa **passou a falhar sozinho** quando o tempo andou.

O sintoma vale reconhecer, porque é sempre o mesmo: **um teste que passava começa a falhar sem que
o código mude.** A causa nunca é a regra; é a regra sendo consultada com um "hoje" que ninguém
controla. Registro completo em [00 §5.13](00_status_implementacao.md).

#### O mesmo vale para dado de exemplo

O seed do Backlog tem datas absolutas de julho, e a regra dos 20 dias vai arquivando as linhas
conforme o tempo passa: **a demonstração esvazia sozinha** — em 11/08 já abre com 9 linhas em vez
de 12 — e a suíte de UI ia junto, falhando mais a cada dia.

O relógio dos testes foi fixado (`testes-ui/setup.ts`), o que devolve à suíte a propriedade de
falhar só quando o código muda. O seed continua envelhecendo: é problema de produto, e está no
débito nº 10 de [00 §6](00_status_implementacao.md).

---

## 2. Moeda — [`src/utils/moeda.ts`](../src/utils/moeda.ts)

### O campo é texto livre, de propósito

`valorProjeto`, `cache` e `comissao` são strings. A operação escreve `R$ 120.000`, `120k`,
`a definir`, `R$ 95.000,00 + permuta` — e obrigar um número travaria o cadastro em nome de uma
precisão que aquele momento do processo não tem.

O preço disso é que **somar exige interpretar**.

### A regra de leitura

Quem decide se o separador é milhar ou decimal é **`interpretarValor`** — devolve o número, ou
`undefined` para o que não conseguiu ler. `paraNumero` é só o atalho `interpretarValor(x) ?? 0`,
para quem vai somar e não precisa distinguir:

| Entrada | Lê como | Por quê |
|---------|--------:|---------|
| `R$ 95.000,00` | 95.000 | tem vírgula → vírgula é decimal, ponto é milhar |
| `R$ 500.000` | 500.000 | só ponto, **exatamente 3 casas** → milhar |
| `R$ 1.234.567` | 1.234.567 | mais de um ponto → milhar |
| `10.50` | 10,5 | só ponto, 2 casas → decimal (centavos) |
| `1.5` | 1,5 | só ponto, 1 casa → decimal |
| `R$ 2,50` | 2,5 | vírgula decimal |

```ts
const pontos = (semVirgula.match(/\./g) ?? []).length;
const casasFinais = semVirgula.length - semVirgula.lastIndexOf('.') - 1;
normalizado = pontos > 1 || casasFinais === 3 ? semVirgula.replace(/\./g, '') : semVirgula;
```

> ### O defeito que originou esta regra
>
> Antes, a decisão era só pela **posição** do último separador. Com vírgula presente acertava; sem
> vírgula — a grafia brasileira mais comum para valores redondos — lia o ponto como decimal:
>
> | Digitado | Somava | Correto |
> |----------|-------:|--------:|
> | `R$ 500.000` | **500** | 500.000 |
> | `R$ 1.234.567` | **0** | 1.234.567 |
>
> O segundo caso é o pior: `Number('1.234.567')` é `NaN`, que virava `0`. E como `somarValores`
> conta como ilegível justamente o que dá zero, **o valor saía da soma sem aparecer no contador de
> ilegíveis** — o card mostrava um total menor e afirmava estar completo.
>
> Os totais de Finalização, que a operação usa para conversar sobre dinheiro, estavam errados por
> um fator de mil.

### A soma admite que não sabe

```ts
somarValores(textos): { total: number; ilegiveis: number }
```

O que não vira número é **contado à parte**, e a interface mostra `+2?` ao lado do total. Um total
que engole silenciosamente o que não entendeu é pior que um total menor: ele parece completo.

### Zero não é ilegível

**"R$ 0,00" é resposta; "a definir" é ausência dela.** Enquanto `paraNumero` era a única leitura,
as duas colapsavam no mesmo `0` — e um cachê legítimo de R$ 0,00 inflava o contador de ilegíveis.
Foi por isso que `interpretarValor` nasceu separada (04/08/2026): `undefined` é reservado ao que
**não se leu**, e só isso entra no `+N?`. Zero soma zero e conta como lido.

### Ambiguidade residual

`R$ 1.500` é lido como mil e quinhentos. Não há como distinguir de "um e meio" sem contexto — e no
domínio (valores de projeto), mil e quinhentos é a leitura certa em praticamente todos os casos.
**Registrado como limitação conhecida**, não como bug.

---

### Onde o texto livre de valor aparece

| Quadro | Campos |
|--------|--------|
| Backlog · Produção | **Valor de Produção** (`custoProducao`) |
| Backlog · Financeiro 🔒 | `valorProjeto` · `cache` · `parcelas` · `pep` · `comissaoGlobo` · `comissao` · `impostos` · `saving` — os 8 campos da seção. `parcelas` é a exceção tipada (número: fluxo de caixa se conta) e `pep` é texto por ser código de ERP; os demais são valor em texto livre |
| Contratos | valor do contrato |
| Talentos | faturamento |

**Valor de Produção foi o primeiro campo de dinheiro fora de uma aba restrita** — ver a nota de
acesso em [08 §6](08_backlog_e_integracoes.md).

---

## 3. Persistência — [`src/utils/persistencia.ts`](../src/utils/persistencia.ts)

### O que é

`localStorage`, com prefixo versionado:

```ts
const PREFIXO = 'viu';
const VERSAO = 12; // 04/08/2026
// chave final: viu:v12:oportunidades
```

A versão no meio da chave permite mudar o formato dos dados sem colidir com o que já está gravado
no navegador de quem usou uma versão anterior — o dado velho fica órfão e é ignorado, em vez de
ser lido no formato errado.

### O histórico de versões, e o que cada uma quebrou

Subir a versão **descarta o que estava salvo**. É a ferramenta certa em dois casos: quando o
formato muda, e quando o seed muda de propósito.

| v | Data | O que mudou | Por que exigiu descarte |
|---|------|-------------|------------------------|
| 4 | 02/08 | Seed do Backlog com dois exemplos por status | O seed só é usado quando não há nada salvo — quem já abrira o sistema veria os 6 registros antigos |
| 5 | 02/08 | Entrou a **entidade Marca**; as colunas Marca e Talento passaram a escolher de lista cadastrada | O `localStorage` de quem já usou não teria a chave `marcas`, e as duas colunas abririam vazias. (A guarda contra ids repetidos **não** é desta versão: é permanente, em `semIdsRepetidos` — ver §5) |
| 6 | 02/08 | `Marca.contato` → `contatos: string[]`, mais `categoria` | Um cadastro salvo na forma antiga quebraria a coluna Contato: não há como derivar uma lista de um campo que já não existe |
| 7 | 02/08 | Aba Escopo virou **Demanda**, e o id mudou junto | A configuração de acesso gravada apontaria para uma aba que mudou de sentido — quem liberou "escopo" liberou a primeira aba, não a nova |
| 8 | 02/08 | A rodada das doze abas: 7 campos obrigatórios entraram, 9 órfãos saíram, 2 equipes novas no seed | Um salvamento v7 do meio do dia carregaria linhas sem campos que o código exige, e as colunas de Pagamento/Jurídico abririam o painel de pessoas vazio |
| 9 | 03/08 | `interveniencia` → `exclusivo`, **com o valor invertido**; as 4 contagens do Escopo saíram e entrou `escopo`; a aba Agência foi removida | Ver o quadro abaixo — esta é a versão em que **não subir** teria sido pior que qualquer outra |
| 10 | 03/08 | Tiques do Escopo (`temEdicao`/`temConteudo`/`temAudiencia`), `sem_edicao` saiu de `TipoEdicao`, as abas Talento/Entrega/Conteúdo/Audiência saíram, a **Pagamento fundiu no Financeiro** (Parcelas e PEP viraram `backlog:financeiro:*`) e a dedup removeu `backlog:demanda:exclusivo`/`:marca` | Um v9 carregaria as três colunas da Produção travadas em toda linha; `sem_edicao` gravado apontaria para opção que a lista não oferece; e ids extintos podiam estar em `visoesLiberadas`/`colunasOcultas` de equipe |
| 11 | 04/08 | As **pendências** ("com quem está a bola"): `Oportunidade.pendencias` obrigatório — a tradução dos "status extras" da planilha em esperas nomeadas com relógio | Um v10 carregaria sem o campo, e cada leitura teria de se defender de `undefined` para sempre; descartar traz o seed com os exemplos (`op4`, `op5`) |
| 12 | 04/08 | Ordenação por imagem: Exclusivo e Origem do Talento voltaram à Demanda, e os ids mudaram junto (`backlog:cliente:*` → `backlog:demanda:*`) | Ids antigos podiam estar em `colunasOcultas` de equipe — apontariam para colunas que já não existem |

> ### A v9 é a que mais justifica o mecanismo
>
> As outras oito descartam dados que o código novo **não conseguiria ler**: falta um campo, muda um
> formato, a tela quebra e alguém percebe. A v9 é diferente e mais perigosa:
>
> **Um registro v8 lido como v9 não daria erro nenhum.** `interveniencia: false` viraria
> `exclusivo: false` — carregando em silêncio e exibindo **todo talento exclusivo como
> não-exclusivo**, e vice-versa. Dado que carrega calado e mente é pior que dado que quebra a tela:
> ninguém vai investigar uma coluna que parece funcionar.
>
> A mesma rodada ainda removeu o id `backlog:agencia`, que podia estar gravado em `colunasOcultas`
> de alguma equipe, e tornou `escopo` obrigatório.

> **A v7 é a única que quebrou um id**, e contra a regra de que ids são estáveis. A exceção está
> justificada em [08 §6.0.0](08_backlog_e_integracoes.md): com uma aba **Escopo** nova existindo,
> `backlog:escopo` apontando para "Demanda" seria uma armadilha permanente.
>
> **A v8 ensinou a regra de quando subir**: a versão acompanha a **mudança de forma**, não o fim do
> dia. O v7 ficou aberto enquanto sete campos obrigatórios entravam no modelo — qualquer F5 nesse
> intervalo gravava o formato velho sob o número novo, e o defeito só apareceria no dia seguinte,
> longe da causa.

### Quais coleções são gravadas — e o defeito de deixar uma de fora

**Regra: toda coleção do `DadosProvider` é carregada e salva. Não há coleção de sessão.**

São doze: `usuarios`, `equipes`, `talentos`, `marcas`, `oportunidades`, `contratos`, `concessoes`,
`dominios`, `solicitacoes`, `convites`, `trocasEmail` e `linksEquipe`.

As quatro últimas entraram em **03/08/2026**, corrigindo um defeito que nenhuma suíte pegava. Elas
nasceram como `useState([])` — sem `carregar`, sem `salvar` — e o efeito foi tornar **os três
fluxos de onboarding inalcançáveis pelo caminho para o qual existem**:

| Rota | O que acontecia |
|------|-----------------|
| `#/convite/<token>` | "Este convite não existe" — para um convite emitido minutos antes |
| `#/entrar/<token>` | O link coletivo da equipe nunca validava |
| `#/confirmar-email/<token>` | O fluxo inteiro era impossível: ele **depende** de sair e voltar |

A causa é a natureza dessas rotas. Elas chegam **por e-mail**, e quem recebe cola o endereço na
barra — isso é uma **carga nova** da aplicação, não uma navegação interna. O token chegava a uma
lista que acabara de nascer vazia.

> **Por que 1.353 asserções passavam.** As regras (`convites.ts`, `linkEquipe.ts`, `trocaEmail.ts`)
> estavam corretas, e as suítes as alimentam com a lista pronta. O que faltava não era a regra: era
> a lista chegar até ela. É a mesma lição dos testes de UI — *provar que a regra está certa não
> prova que ela chegou à tela* —, um passo adiante: **nem que o dado chegou à regra.**

O teste que fecha esta classe de defeito não é sobre convites: é perguntar, de cada coleção nova,
*"o que acontece com isto depois de um F5?"*. Se a resposta envolve um link que alguém recebeu, a
coleção é persistida.

> Acrescentar chave nova **não** exige subir `VERSAO`: a chave ausente cai no padrão (`[]`) e a
> aplicação segue. Subir a versão é para mudança de **forma** do que já está gravado.

### Por que existe

**Proteção de demonstração.** Sem isso, um F5 durante uma apresentação zera tudo que foi cadastrado
na reunião. Não foi criado para ser o armazenamento do produto.

### O que ela **não** é

> `localStorage` **não é o banco de dados**. É por navegador, por máquina, por pessoa. Nada é
> compartilhado: dois usuários no mesmo sistema não veem os dados um do outro, e limpar o cache
> apaga tudo.
>
> Quando houver backend, este módulo vira cache de sessão ou desaparece. Ele **não** deve ganhar
> mais responsabilidade enquanto isso.

### Nunca lança

```ts
export function carregar<T>(nome: string, padrao: T): T
```

Modo anônimo, cota estourada, JSON corrompido por uma versão anterior: qualquer falha devolve o
padrão. Uma tela em branco porque o `localStorage` recusou uma escrita seria um custo
desproporcional para um recurso que é conveniência.

Três defesas menores que valem registro:

- **Forma trocada devolve o padrão.** Se o gravado é objeto onde se espera array (ou vice-versa),
  `carregar` descarta e devolve o padrão — `Array.isArray(padrao) !== Array.isArray(valor)`. Um
  array que virou objeto quebraria as telas bem longe da leitura.
- **`temDadosSalvos()` usa `talentos` como sentinela.** A pergunta "há algo desta versão?" é
  respondida olhando uma chave só — a coleção que toda sessão grava — em vez de varrer as doze.
- **`limparTudo()` varre `viu:` de qualquer versão**, não só a atual: o botão de recomeçar precisa
  apagar também o que versões antigas deixaram órfão. E varre **só** o prefixo — o `localStorage`
  é do domínio inteiro, e limpar tudo apagaria dados de outras aplicações.

### O que o schema Prisma já desenha sobre isto

O [`prisma/schema.prisma`](../prisma/schema.prisma) já traz **`Pendencia`** (com o enum
`TipoPendencia` de **8 valores** e o campo `statusAbertura` — a régua da "revisão parcelada":
pendência aberta num status e chegada em outro é fato medido, não julgado) e **`StatusEvento`**,
o log de transições que será **a fonte do relatório de SLA por status no Power BI**
(`LAG(em)` numa view). Decisão de 04/08/2026: **o front ainda não grava o log** — a contabilização
de tempo por status entra junto com o banco; o modelo nasce antes para a migração e o relatório
serem desenhados sobre ele.

---

## 4. Dias úteis × dias corridos — [`src/utils/sla.ts`](../src/utils/sla.ts)

**As duas contagens existem, e a diferença entre elas é deliberada.**

| Regra | Conta | Por quê |
|-------|-------|---------|
| **SLA de triagem** (5 dias) | dias **úteis** | É um compromisso de trabalho: ninguém responde proposta no domingo |
| **Abandono** (20 dias) | dias **corridos** | Mede silêncio real: um projeto parado há três semanas está parado, independente de feriado |

```ts
somarDiasUteis(iso, dias)      // avança pulando sábado e domingo
diasUteisEntre(inicio, fim)    // conta apenas os dias úteis do intervalo
```

> **As duas funções precisam concordar.** Se `somarDiasUteis(x, 5)` devolve `y`, então
> `diasUteisEntre(x, y)` tem de devolver 5. São usadas em pontas diferentes — uma calcula o prazo
> na criação, a outra mede quanto falta — e divergirem produziria um deadline que o próprio farol
> considera errado. Há teste travando essa identidade.

Três detalhes da régua que já produziram (ou evitaram) defeito:

- **O dia da entrada não conta.** Uma demanda que chega hoje tem os 5 dias úteis *seguintes* —
  não 4 e o resto de hoje. `somarDiasUteis` só começa a descontar no dia seguinte.
- **`diasUteisEntre` pode ser negativo** — é como o farol sabe o tamanho do atraso. Quem consumir
  a função esperando só valores positivos lê "atrasada 2 dias" como "faltam 2 dias".
- **Vencer é pergunta de calendário, não de dias úteis:** `hoje > prazoEm`, comparando as strings
  ISO. Sem isso, prazo na sexta e consulta no sábado davam zero dias úteis de diferença — e o
  farol dizia "Vence hoje" com o prazo já estourado. A régua útil mede o *tamanho* do atraso; o
  *fato* de estar vencida é do calendário.

### A cor do farol viaja por `box-shadow`, não por borda

`SLA_TONE_STYLE.faixa` é um **valor hexadecimal** (`#ef4444`), não uma classe — e a barra de 5px na
borda esquerda da linha é pintada com `box-shadow: inset`. A primeira versão usava `border-l-*` e a
barra sumia ao rolar na horizontal: com `border-collapse: collapse`, as bordas da tabela não
acompanham a célula congelada — o `sticky` grudava, a borda ficava para trás. `box-shadow` é
pintura da própria célula e viaja com ela; no tom cinza a faixa é `transparent`, que mantém o
alinhamento sem afirmar nada. Trocar de volta para borda traz o defeito de volta.

### O que ainda não existe

**Feriados não são considerados.** Só fins de semana. Uma tabela de feriados nacionais e da empresa
está registrada como próximo passo — é uma tabela no banco, não código.

### O relógio para ao sair da triagem

O SLA mede **tempo de resposta**, não tempo de vida do projeto. Sair de `entrada` já cumpre a
promessa, mesmo que o projeto siga meses em elaboração. Por isso `getSlaInfo` recebe
`encerrada: saiuDaTriagem(op)` e devolve tom cinza a partir daí.

---

## 5. Identificadores — [`src/context/DadosProvider.tsx`](../src/context/DadosProvider.tsx)

### O contador deriva do que está carregado — [`src/utils/ids.ts`](../src/utils/ids.ts)

```ts
const proximaOportunidade = useRef(proximoNumero(oportunidades, 'op'));
```

`proximoNumero` varre os ids existentes e devolve **o maior + 1**.

> ### O defeito que isto corrigiu
>
> Duas formas erradas conviviam, e as duas geravam id repetido:
>
> | Inicialização | O que acontecia |
> |---------------|-----------------|
> | `useRef(1)` | a **primeira** linha criada nascia como `op1` — que o seed já usava |
> | `useRef(SEED.length + 1)` | acertava na primeira sessão; depois de um F5, voltava ao mesmo número, porque o estado vinha do `localStorage` e o contador não |
>
> Em React, dois registros com a mesma `key` são reconciliados como um: a linha nova aparece com
> os dados da antiga, e editar uma altera a outra. O sintoma relatado foi *"criar um projeto novo
> replica um existente"* — que **não parece problema de id**, e por isso custou caro para achar.
>
> `array.length` tem o mesmo defeito por um terceiro caminho: com exclusões, o contador regride.

São **onze prefixos**, um por entidade — `op` (oportunidades), `tal` (talentos), `mar` (marcas),
`u` (usuários), `cv` (convites), `sol` (solicitações), `eq` (equipes), `cc` (concessões), `te`
(trocas de e-mail), `lk` (links de equipe) e `pd` (pendências) — mais o formato com separador dos
contratos (`CT-001`, via `proximoNumeroFormatado`: o número é lido por gente, e `CT-7` no meio de
`CT-041` atrapalha). O prefixo torna o id legível em depuração e impede que um id de talento seja
aceito onde se espera um de usuário.

**O contador `pd` deriva de uma coleção aninhada.** Pendência não é coleção própria: vive dentro
de cada oportunidade, então o contador varre
`oportunidades.flatMap((op) => op.pendencias ?? [])`. Contar só as listas de primeiro nível
deixaria o `pd` sempre em 1 — e o id repetido voltaria pelo caminho que ninguém olha.

**Excluir libera o número.** Derivando do maior existente, o próximo volta a ser aquele. É
inofensivo — o id excluído não é referenciado por nada que sobreviva — e é o preço de um contador
auto-corretivo. Guardar o último emitido nos devolveria ao problema original: mais um estado a
persistir junto com os dados, e que diverge quando não é.

### Rede de proteção no carregamento

`carregar` descarta registros com id repetido antes de entregá-los à aplicação. Corrigir o
contador impede novos, mas **não desfaz o que já está gravado** no navegador de quem usou a versão
com o defeito. A garantia fica no ponto de entrada, e vale para sempre: nada com id repetido chega
ao render.

> Com backend, isto vira `uuid` gerado pelo banco. O contador é adequado para uma sessão de
> navegador; **não** é adequado para múltiplos clientes escrevendo ao mesmo tempo.

### StrictMode duplica efeitos

Em desenvolvimento, o React monta, desmonta e remonta cada componente. Qualquer criação de
registro dentro de um reducer ou efeito **roda duas vezes**.

Foi assim que uma ficha de talento nascia duplicada: `garantirTalento` era chamada dentro de
`setContratos`. A correção foi movê-la para fora do reducer.

**Regra: reducers e updaters de estado são funções puras.** Criar registro, gerar id ou disparar
efeito colateral dentro deles é um defeito que só aparece em desenvolvimento — ou, pior, só em
produção.

---

## 6. Módulos de regra são puros

Em [`src/utils/`](../src/utils/), **a regra é pura** — entra dado, sai dado, sem React, sem estado,
sem `Date.now()` implícito — **e o efeito, quando existe, é isolado em função nomeada**. Três
módulos tocam o mundo, e cada um confina o efeito num ponto só: `persistencia.ts` (o
`localStorage`, atrás de `carregar`/`salvar` que nunca lançam), `foto.ts` (o canvas do navegador,
no redimensionamento da imagem) e o `baixarXlsx` de `exportacao.ts` (o `import()` da biblioteca e
o download — a montagem da matriz, `montarMatriz`/`largurasDaMatriz`, continua pura e testável).

Três razões:

1. **Testabilidade.** A suíte compila `src/utils/` para JS e roda em Node, sem DOM e sem
   framework. É o que permite **1.451 asserções em 33 suítes** (medição de 04/08/2026) rodando em
   segundos.

2. **Viram política de banco.** `permissoes.ts` é a especificação executável do RLS que o Supabase
   vai implementar. Se a regra estivesse espalhada em componentes, traduzi-la seria reengenharia.

3. **Um lugar por regra.** Quando `podeEditarRegistro` e `nivelDeAcesso` implementavam a mesma
   verificação de formas diferentes, elas divergiram — e o defeito foi real
   ([00 §5.1](00_status_implementacao.md)). Hoje uma **deriva** da outra.

```
components/  →  chamam as regras, não as reimplementam
utils/       →  as regras, puras e testáveis
context/     →  o estado, aplicando as regras nas mutações
```

---

## 7. Tailwind — classes literais

```tsx
className={`bg-${cor}-500`}     // ❌ o JIT não gera esta classe
className={cor === 'verde' ? 'bg-emerald-500' : 'bg-red-500'}   // ✅
```

O compilador do Tailwind **varre o código como texto** e só gera as classes que encontra escritas
por inteiro. Uma classe montada por interpolação não existe no CSS final — e o elemento aparece
sem estilo nenhum, sem erro no console.

Por isso os catálogos guardam a classe completa:

```ts
{ id: 'alta', label: 'Alta', chip: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' }
```

Ver [03 §1](03_padroes_ui.md) para a paleta.

---

## 8. Estrutura do projeto

```
src/
├── main.tsx           ponto de entrada — monta o App no DOM
├── App.tsx            rotas (caminho + hash), página ativa, fallback de acesso
├── index.css          Tailwind e as classes que vencem o fundo da linha (zebra, seleção)
├── types.ts           contratos de dados de toda a aplicação
├── data/              seeds de demonstração
├── utils/             regras puras — testáveis, viram política de banco
├── context/           estado único e mutações validadas
├── components/
│   ├── ui/            blocos reutilizáveis (03 §10)
│   ├── backlog/       específicos do Backlog — grade, seletores, mapa do fluxo
│   ├── talentos/      específicos de Contratos
│   ├── talentos-exclusivos/  específicos de Talentos
│   ├── equipes/       específicos de Equipes
│   └── usuarios/      específicos de Usuários
├── pages/             uma por rota; monta dados e delega
└── services/          integrações externas (hoje só o contrato do e-mail)
```

**A página busca e filtra; o componente de tabela desenha.** A separação importa porque o filtro
por permissão acontece na página — se ficasse no componente, cada tela nova precisaria lembrar de
aplicá-lo.

### O contrato do catálogo de colunas — [`src/utils/colunas.ts`](../src/utils/colunas.ts)

O catálogo tem **dois regimes de largura**, e `testeColunas` trava os dois:

- **Proporção (`peso`, em %)** nos quadros de aba única por vez: as colunas de uma aba de
  **Talentos somam 78** (os 22 restantes são da coluna Talento, fixa) e as de **Contratos somam
  100**. Somas diferentes entre abas fariam as colunas dançarem ao trocar de aba, mesmo com
  `table-fixed`.
- **Pixels (`largura`)** no Backlog, desde a grade contínua: **toda coluna declara largura
  inteira entre 60 e 400px** — o invariante substituiu a antiga soma de 82. `larguraDaColuna`
  mantém o fallback `peso × 11` para quem consultar uma coluna sem o campo, mas no Backlog o
  contrato exige a declaração explícita: largura é decisão sobre o dado, não sobra de proporção.

**`gradeContinua(visoesVisiveis)`** é quem monta o Backlog como tabela única: separa as âncoras
(tiradas da **primeira seção visível** — são a mesma coluna em toda seção, então qualquer uma
serve de fonte, e a grade funciona mesmo sem a Demanda no alcance de quem abriu) das seções
rolantes, já filtradas por permissão — aba sem acesso não vira seção nem deixa buraco no scroll.

### Roteamento por caminho — [`src/utils/navegacao.ts`](../src/utils/navegacao.ts) e [`src/App.tsx`](../src/App.tsx)

**Cada quadro tem um caminho na barra de endereço** — `CAMINHOS` mapeia página → slug curto
(`/backlog`, `/talentos`), e mudar um slug quebra favoritos: é id, não texto. Não há biblioteca de
rotas; o par `history.pushState` + `popstate` em `App.tsx` cobre o que existe:

- **Trocar de página empurra o caminho** (`pushState`); a carga em `/`, que só se normaliza, usa
  `replaceState` para não sujar o histórico.
- **Voltar/avançar do navegador troca a tela** — o listener de `popstate` relê o `pathname`.
- **Na carga inicial, a URL manda e o salvo desempata** (`paginaInicial`): um link compartilhado
  abre o que ele nomeia; abrir `/` cai na página salva, que é o F5 de sempre.
- As telas de entrada seguem no **hash** (`#/convite/`, `#/entrar/`, `#/confirmar-email/`) — links
  que chegam por e-mail, preservados nas trocas de página para não disputarem com os caminhos.

#### A página aberta sobrevive ao F5

Antes do roteamento por caminho, recarregar perdia a tela: todo mundo voltava para Contratos,
independentemente de onde estivesse. Com o resto do estado já preservado (§3), a página era a
única coisa que o F5 ainda descartava. A página salva continua sendo o desempate de quem abre `/`.

```ts
const [activePage, setActivePage] = useState<AppPage>(paginaSalva);
useEffect(() => salvar('pagina', activePage), [activePage]);
```

Três detalhes que a implementação precisa manter:

1. **O valor lido é validado.** O que está no `localStorage` pode ter vindo de uma versão anterior,
   de uma página que saiu do produto, ou de edição manual. Sem `validarPagina`, `PAGINAS[valor]`
   devolveria `undefined` e a tela abriria **em branco**.

2. **A checagem é por lista, não por `valor in PAGINAS`.** O operador `in` percorre a cadeia de
   protótipos: `'toString' in {}` é `true`. Um valor adulterado para `constructor` passaria pela
   validação e quebraria o render.

3. **Salva-se a página escolhida, não a exibida.** Quem perde acesso à página aberta cai na
   primeira permitida; gravar essa substituta apagaria a intenção, e ao recuperar o acesso a
   pessoa voltaria para o fallback em vez da tela que tinha aberto.

> **A URL reflete a página desde 04/08/2026.** Copiar o endereço compartilha a tela, e o botão
> Voltar navega entre quadros — a antiga limitação ("a URL não reflete a página aberta") foi
> resolvida pelo roteamento por caminho acima, sem biblioteca. O que segue como dívida é a
> granularidade: a URL nomeia o **quadro**, não o recorte dentro dele (etapa, busca, aba da grade).

---

## 9. Stack e limites

O que o projeto usa, com a versão que importa e o limite que cada escolha carrega:

| Peça | Versão | O que vale saber |
|------|--------|------------------|
| **React** | 19 | StrictMode duplica efeitos em dev (§5) — reducers puros não são estilo, são sobrevivência |
| **Vite** | 6 | Build e dev server; `VITE_*` vai para o bundle — nunca um segredo ([08 §11](08_backlog_e_integracoes.md)) |
| **Tailwind** | 4, via `@tailwindcss/vite` | **Sem arquivo de config** — o plugin varre o código; classes sempre literais (§7) |
| **motion** | 12 | Animações; `layoutId` único por instância ([03 §7.3](03_padroes_ui.md)) |
| **recharts** | 3 | Gráficos |
| **xlsx (SheetJS)** | 0.18 | Só por `import()` **dinâmico** no clique de Exportar — ~430 kB que a página não paga ([08 §6](08_backlog_e_integracoes.md)) |
| **Prisma** | 7 | Schema-first; a configuração vive em `prisma.config.ts`, não no `package.json` |
| **Vitest** | 4, com jsdom | Roda `testes-ui/` (o `include` do `vitest.config.ts`) — a suíte de UI, não a de regras |
| **Node** | ≥ 20 | `engines` no `package.json`; o runner de regras compila com `tsc` antes de rodar |

## 10. As duas suítes

| Suíte | Como roda | O que cobre |
|-------|-----------|-------------|
| **Regras** — `testes-regras/rodar.sh` | Recompila `src/utils`, `src/types.ts` e `src/data` com `tsc` **antes** de rodar (sem isso a suíte testa o `.js` da rodada anterior e "passa" validando código que não existe) e executa os `.mjs` em Node puro | 33 suítes, 1.451 asserções (04/08/2026) |
| **UI** — `npm run test:ui` | Vitest + jsdom sobre `testes-ui/` | 97 testes que provam que a regra **chegou à tela** |

O runner de regras trata **suíte que nem chega a rodar como falha**: qualquer `ERR_*` (módulo não
encontrado, import quebrado) marca a suíte como `CRASH` e soma no total — zero falhas por não ter
conseguido rodar é a pior categoria de verde.

---

## 11. Limitações conhecidas

| Limitação | Consequência | Onde |
|-----------|--------------|------|
| `localStorage` não é compartilhado | Nada de multiusuário real | §3 |
| Feriados não entram no cálculo de dias úteis | Prazo otimista em semanas com feriado | §4 |
| `R$ 1.500` é sempre mil e quinhentos | Ambiguidade real, sem contexto para resolver | §2 |
| IDs por contador de sessão | Colidiriam com múltiplos clientes escrevendo | §5 |
| URL nomeia o quadro, não o recorte | Compartilhar uma busca ou etapa ainda não é possível | §8 |

---

## 12. Próximos passos

1. **Tabela de feriados** no banco, consumida por `somarDiasUteis`
2. **UUID do banco** substituindo os contadores
3. **`persistencia.ts` vira cache** ou desaparece, quando houver backend
4. Avaliar **valor tipado** para os campos de moeda — decisão que depende da operação
   ([08 §13.1](08_backlog_e_integracoes.md))
5. **Gravar `StatusEvento`** quando o banco entrar — o log de transições que alimenta o relatório
   de SLA por status no Power BI (§3); o front hoje não grava por decisão de 04/08/2026
