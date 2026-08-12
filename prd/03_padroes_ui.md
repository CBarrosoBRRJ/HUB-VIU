# PRD 03 — Padrões de Interface
**Versão:** 4.1 | **Status:** Vigente · **tipografia congelada** | **Data:** 12/08/2026

[← Índice da documentação](README.md) · *Padrões de interface — vale para toda tela nova*


> Identidade visual e padrões de construção da plataforma. **Toda tela nova deve seguir este
> documento** — é o que mantém as páginas parecendo o mesmo produto.

---

## 1. Fundamentos

### 1.1. Cores

| Papel | Valor | Uso |
|-------|-------|-----|
| Fundo da área de dados | `#f4f6fa` | Todo `<main>` de página |
| Superfície | `bg-white` | Cards, tabelas, barras |
| Faixa institucional | `#111a3a` | Faixa de abas do quadro, gradientes de cabeçalho |
| **Ação primária** | `indigo-600` · `indigo-50` | **Todo botão de ação**: criar, convidar, navegar, chips ligados |
| Criação | `emerald-500` | **Só** o botão "Novo…" de cada quadro (§7.8) |
| Destruição | `rose-500` · `rose-50` | Excluir e remover |
| Alerta | `amber-500` | Farol de prazo, papel de responsável |
| Vencido / erro | `red-500` · `red-600` | Farol vencido |
| Texto | `slate-900` título · `slate-700` conteúdo · `slate-500` apoio · `slate-400` auxiliar | |
| Bordas | `slate-200` divisões · `slate-100` linhas de tabela | |

Gradiente de identidade (cabeçalhos de perfil, equipe e convite):
`from-[#111a3a] via-[#233163] to-[#111a3a]` — mesma família do navy institucional.

> **Uma cor de ação só.** Verde e indigo disputando o papel de botão primário faziam a tela
> parecer duas interfaces coladas. Verde ficou reservado ao gesto de "criar uma linha nova",
> que já é sinalizado pelo botão de criação.

### 1.1.0. A paleta de status — a cor diz **o que a linha exige** — 12/08/2026

Cada status tinha a sua cor: slate, sky, indigo, violet, amber, yellow, emerald, rose. **Sete
matizes para nove estados** — e o problema é anterior ao tom, que já tinha sido suavizado uma vez
sem resolver: *cor por etapa é uma convenção que ninguém decora*.

Quem olha a coluna Status não pergunta "em que etapa está?" — o texto responde isso, em caixa alta.
Pergunta **"o que preciso olhar?"**. A paleta passou a responder essa:

| Família | Cor | O que diz | Status |
|---------|-----|-----------|--------|
| `andamento` | cinza-azulado | segue seu curso, nada a fazer agora | Entrada · Em Elaboração · Em Revisão · Aguardando Feedback |
| `acao` | **âmbar** | **parou, e depende de alguém** | Ajustes · StandBy |
| `ganho` | esmeralda | acabou, e deu negócio | Negócio Fechado |
| `perda` | rosa | acabou sem negócio | Declinado |
| `fim` | cinza mais fechado | acabou sem decisão — o arquivamento | Encerrado |

**Quatro matizes** (cinza, âmbar, esmeralda, rosa) em cinco famílias — `fim` é um segundo tom do
mesmo cinza, e dois tons de um matiz lêem como uma cor só.

> **O âmbar é quem mais ganha.** Ele deixa de ser "a cor do Ajustes" e passa a significar *pede
> ação* — a única coisa que alguém precisa achar de relance numa coluna de quarenta linhas. Com
> sete cores, nada saltava; com uma cor para um significado, o que importa salta sozinho.

A distinção entre as quatro etapas de andamento não se perdeu: ela está **escrita**, e a caixa alta
a torna legível de relance. Cor é para o que o texto não diz.

**Onde vive:** `PALETA_STATUS` em [`utils/oportunidades.ts`](../src/utils/oportunidades.ts), com
`suave` (etiqueta), `barra` (cards do cabeçalho) e `dot` (pontos do painel). O status declara só a
**família**; nenhuma classe de cor mora no catálogo de status, e é isso que impede a paleta de
voltar a crescer um matiz por vez.

`testeIngestao` trava a contagem de matizes.

### 1.1.1. Etiquetas: preenchida × suave

| Tipo | Estilo | Onde |
|------|--------|------|
| **Suave** (fundo tênue, texto forte, anel) | `bg-<cor>-50 text-<cor>-700 ring-1 ring-<cor>-200` | **O padrão** — status do registro, perfil, situação, papel na equipe |
| **Pastel** (barra ou faixa) | `bg-<cor>-300` | Superfícies repetidas: as barras do cabeçalho (§1.2.9) |
| **Preenchida** (fundo sólido, texto branco) | `bg-<cor>-500` | Contratos e Talentos, por ora — ver a nota abaixo |

> **Por quê:** com tudo preenchido, cinco cores saturadas competiam por atenção na mesma linha e
> a grade virava um arco-íris. A etiqueta suave mantém o significado da cor sem disputar com o
> conteúdo.

> #### A exceção do status caiu no Backlog — 12/08/2026
>
> Este documento dizia, desde a primeira versão, que a preenchida valia **"apenas para o status do
> registro — dado primário do quadro"**, e o argumento era bom: o status precisa ser o elemento
> mais visível da linha.
>
> **O que mudou foi o contexto, não o argumento.** A regra nasceu quando a coluna Status rolava
> junto com o resto da grade — uma etiqueta cheia por linha, entre colunas de texto. Depois disso a
> coluna virou **congelada**: as etiquetas ficam paradas e empilhadas enquanto a tabela corre ao
> lado, e nove fundos saturados um sob o outro produzem exatamente o arco-íris que o parágrafo
> acima condena. *"As cores dos botões de status estão muito carnaval"* — operação, 12/08/2026.
>
> O status continua sendo o elemento mais visível da linha; o destaque agora vem de **posição**
> (segunda coluna, congelada), **forma** (caixa alta, `font-bold`) e **anel**, não de saturação.
>
> **Contratos e Talentos ainda usam a preenchida.** Não por decisão, e sim porque a leitura foi
> feita no Backlog — a mudança fica para quando cada página for revista, como manda o trabalho por
> quadro. Registrado aqui para que a diferença entre os quadros seja lida como pendência, e não
> como padrão.

> ⚠️ Classes do Tailwind 4 precisam existir **literais** no código. Nunca `bg-${cor}-500`.

### 1.2. Tipografia

> # ⛔ A TIPOGRAFIA ESTÁ CONGELADA — 11/08/2026
>
> **Nenhum tamanho de fonte se altera sem pedido explícito da operação.** Não como sugestão de
> melhoria, não "de brinde" junto com outra correção, não porque um número parece pequeno lido
> fora da tela.
>
> ## O que está aprovado
>
> | Camada | 1024–1366px | 2535px |
> |--------|------------:|-------:|
> | Raiz | 16px | ~16,8px |
> | Escala da interface (`text-selo` … `text-dado`) | 9 · 10 · 11 · 13px | escala com a raiz |
> | Grade: nome do projeto | 13,0px | 13,6px |
> | Grade: **cabeçalho** | 10,0px | 10,5px |
> | Grade: dado | 9,5px | 10,0px |
> | Grade: selos | 9,0px | 9,6px |
>
> ## Por que congelado
>
> Este conjunto custou **oito rodadas de ajuste num único dia**, cada uma validada na tela real da
> operação. Quatro delas foram correções de tentativas minhas que erraram o eixo:
>
> | Tentativa | O que quebrou |
> |-----------|---------------|
> | Subir o piso da escala "de brinde" | Sidebar cortando "Backlog de Agenciad…" e "DONO DO SISTEMA" em duas linhas |
> | Régua + degraus ao mesmo tempo | Cabeçalho saltou 43%, grade perdeu densidade |
> | Comprimir os degraus | Hierarquia achatada: rótulo competindo com o dado |
> | Subir o cabeçalho para inverter | Desfez uma camada que já estava aprovada |
>
> **O tamanho de fonte não é um detalhe ajustável em passagem.** Cada valor aqui é o resultado de
> uma queixa concreta, medida e corrigida — e mexer em um deles isoladamente reintroduz uma das
> quebras acima, porque as camadas se compõem (raiz × régua × degrau × contêiner).
>
> ## O que fazer quando alguém achar que está pequeno ou grande
>
> 1. **Não mexer no código.** A régua pessoal em **Meu Perfil › Tamanho do texto** (90–115%)
>    resolve por pessoa e por navegador, que é onde o desconforto de fato mora (§1.2.5).
> 2. Se a queixa vier da operação e a régua pessoal não resolver, aí sim é conversa de código — e
>    começa por **medir**, não por ajustar: qual camada, em qual tela, quantos pixels.
> 3. A ordem de ajuste, quando houver: **espaçamento → peso → tamanho** (§1.2.6).
>
> `tipografia.test.tsx` trava os valores um a um. Um teste vermelho ali não é obstáculo a
> contornar — é este parágrafo cobrando o pedido explícito.

| Uso | Classe |
|-----|--------|
| Títulos e números de destaque | `font-display` (Outfit) |
| Corpo | Plus Jakarta Sans (padrão do `body`) |
| Códigos e números de contrato | `font-mono` (JetBrains Mono) |
| Cabeçalho de coluna (quadros) | `text-rotulo font-medium uppercase tracking-tight text-slate-500` (§7.10) — no Backlog o `index.css` sobrescreve pela régua da grade (§1.2.1) e pelo peso de §1.2.6 |
| Cabeçalho de coluna (Administração) | `text-rotulo font-bold uppercase tracking-wider text-slate-500` — o `tracking-wider` só sobrevive aqui, onde as colunas são largas e a caixa alta não disputa pixel (§7.10) |
| Rótulo de seção | `text-rotulo font-bold uppercase tracking-wider text-slate-500` — o `tracking-[0.16em]` existe numa instância só, os rótulos da Sidebar |

### 1.2.1. A escala de texto — 11/08/2026

**Nenhum tamanho de fonte se escreve em pixel.** Quatro degraus, declarados no `@theme` do
[`index.css`](../src/index.css) e nomeados pelo **papel**:

| Degrau | rem | ≈ px (raiz 16) | Papel |
|--------|----:|---------------:|-------|
| `text-selo` | 0.5625 | 9 | Selos, contadores, badges — metadado sobre a linha |
| `text-rotulo` | 0.625 | 10 | Cabeçalho de coluna, rótulo de seção |
| `text-apoio` | 0.6875 | 11 | Texto auxiliar, legendas, ajuda |
| `text-dado` | 0.8125 | 13 | Valores de consulta fora da grade |

> #### Estes quatro números não se ajustam por legibilidade — e a tentativa quebrou a tela
>
> A primeira versão subiu cada degrau em 1px (9→10, 10→11, 11→12), com o argumento de que 9px é
> pequeno demais. O argumento estava certo sobre o número e **errado sobre o lugar**:
>
> - a queixa de origem era o **cabeçalho da grade em 7px** — e a grade tem régua própria, corrigida
>   à parte (§1.2.1). Os 9px da interface nunca foram reclamados;
> - os contêineres não acompanham o degrau. `w-64` da sidebar, `size-8` do avatar e todo `px-*`
>   escalam com a **raiz**. Subir só o texto o engordou ~10% dentro da mesma caixa, e a sidebar
>   passou a cortar "Backlog de Agenciad…" e a quebrar "DONO DO SISTEMA" em duas linhas.
>
> **Quem entrega legibilidade são a raiz fluida (§1.2.5) e a régua pessoal** — as duas movem texto
> e caixa juntos, mantendo a razão de 0,051 entre `text-dado` e a largura da sidebar em qualquer
> tela. O degrau é proporção interna do desenho. `tipografia.test.tsx` trava os quatro valores.

> **Por que `rem`, e não px.** `text-[9px]` é 9px sempre — inclusive para quem aumentou a fonte no
> sistema operacional **porque precisa disso para enxergar**. `rem` acompanha essa preferência. Era
> a diferença entre um sistema legível e um que *parece* legível para quem tem um monitor bom.

> **Por que nomes de papel, e não de tamanho.** Quem escolhe entre "selo" e "rótulo" decide
> hierarquia; quem escolhe entre "9px" e "10px" chuta um pixel. É também o que impede a escala de
> virar dezoito degraus na terceira tela nova.

**O piso é 10px, e ele é verificado.** [`testes-ui/tipografia.test.tsx`](../testes-ui/tipografia.test.tsx)
falha se um `text-[Npx]` voltar ao código, se um degrau cair abaixo de 10px, ou se a régua da grade
passar a produzir texto menor que isso. Convenção sem teste derrete — esta já derreteu uma vez, em
silêncio, 202 vezes.

#### A régua da grade, e a conta que faltava

O Backlog não usa a escala: tem régua fluida própria (`--texto-grade`) e cada camada desconta um
degrau dela. **Ninguém somava as duas coisas** — e o cabeçalho de coluna, que é a régua menos o
maior desconto, chegava a **7px numa tela de notebook**.

A correção foi **só nos degraus**; a régua ficou onde estava:

| | Original | Comprimido demais | **Agora** |
|---|------:|------:|------:|
| Régua (`--texto-grade`) | 11–13px | 11–13px | **11–13px** |
| Nome do projeto | 11–13px | 11–13px | **11–13px** |
| Dado da célula | 9–11px | 11–13px | **11–12,6px** |
| Cabeçalho | **7–9px** | 10,8–11,5px | **9–10,5px** |
| **Distância dado → cabeçalho** | 18% | **8%** | **17%** |

> #### A hierarquia é relativa — e foi ela que a operação leu como "grande"
>
> A compressão que resolveu os 7px encostou o cabeçalho no dado: 8% de diferença. A operação
> apontou "headers grandes em monitores grandes" e o número parecia desmentir (11,5px é pequeno).
> **As duas leituras estavam certas**: o problema não era o tamanho absoluto, era a distância —
> com 8% e caixa alta, o rótulo competia com o dado que ele nomeia.
>
> O desconto do cabeçalho voltou para −0,1875rem, e **ficou lá**: é o valor calibrado e aprovado,
> travado por teste.

#### A inversão — o cabeçalho passa o dado, 11/08/2026

Decisão do produto, e ela alinha o código com o que esta documentação sempre descreveu: a tabela
de hierarquia dizia *"dados menores que a placa que os nomeia"* desde 03/08, enquanto o CSS
entregava o inverso. **A divergência sobreviveu oito dias** porque a relação só existia somando
`calc`s espalhados por quatro seletores — foi a operação que a leu na tela e perguntou por que não
batia.

| Camada | Degrau | 1366px | 2535px |
|--------|--------|-------:|-------:|
| Nome do projeto | — (a régua) | 12,8px | 13,6px |
| **Cabeçalho** | −0,1875rem *(intacto)* | **9,8px** | **10,5px** |
| Dado da célula | −0,21875rem | 9,3px | 10,0px |
| Selos, entrada, status | −0,25rem | 8,8px | 9,6px |

> **O caminho importou tanto quanto o destino.** A primeira tentativa subiu o cabeçalho até passar
> o dado, e foi recusada na hora: *"você subiu o header, antes o tamanho do header estava perfeito,
> era só diminuir os dados"*. Mexer numa camada recém-calibrada para resolver outra desfaz um
> acerto para tentar outro — a regra que fica é **ajustar a camada que está errada, não a que está
> ao lado dela**.

**O custo apareceu na hora, e tinha outra causa.** Com a inversão, o dado chegou a 8,5px em
1024px — "nas telas pequenas ficou bem pequeno e não dá para ver". A investigação encontrou algo
que não era da inversão: **duas camadas de fluidez empilhadas.**

#### Uma camada de fluidez, não duas

A régua da grade era `clamp(0.6875rem, 0.42rem + 0.35vh + 0.25vw, 0.8125rem)` — ela mesma media a
janela. Fazia sentido quando foi escrita, porque era a única coisa que respondia ao tamanho da
tela. Quando a raiz fluida (§1.2.5) assumiu esse papel para o produto inteiro, **ninguém removeu a
camada antiga**, e elas passaram a se somar: em 1024px a raiz já estava no piso e a régua encolhia
de novo por conta própria.

| | Duas camadas | **Uma camada** |
|---|---:|---:|
| 1024px — cabeçalho / dado | 9,0 / 8,5px | **10,0 / 9,5px** |
| 1366px — cabeçalho / dado | 9,8 / 9,3px | **10,0 / 9,5px** |
| 2535px — cabeçalho / dado | 10,5 / 10,0px | **10,5 / 10,0px** *(intacto)* |

A régua virou **constante** (`--texto-grade: 0.8125rem`). Toda a variação por tela vem da raiz —
calibrada com a operação, com piso, teto e a régua pessoal por cima. O monitor grande, que estava
aprovado, não muda um pixel.

> **A lição:** quando uma camada nova assume o trabalho de uma antiga, a antiga precisa **sair**.
> Deixá-la ligada não é conservadorismo — é criar um efeito composto que ninguém calcula e que só
> aparece nos extremos. Foi o mesmo tipo de erro do degrau inflado (§1.2.1) e da compressão que
> achatou a hierarquia: **duas coisas fazendo o mesmo trabalho, em desacordo**.

Custo aceito: a linha fica ~1px mais alta em 1024–1366px. O quadro tem o fluxo recolhível (216px)
para quem precisa de densidade.

Os degraus agora são **variáveis nomeadas** (`--degrau-cabecalho`, `--degrau-dado`, `--degrau-selo`)
justamente para que a próxima divergência entre o que se documenta e o que se entrega apareça na
declaração, e não só no monitor de quem usa.

A hierarquia entre nome, dado e rótulo **não precisa de quatro pixels** — ela já vem do peso, da
caixa alta e do espaçamento. Os quatro pixels só empurravam o último degrau para fora do legível.

**9px sustenta o cabeçalho, e só ele:** caixa alta e negrito dão a ele uma altura de maiúscula
equivalente à de um texto comum bem maior, e o rótulo de coluna se lê uma vez, para localizar. O
dado, que é leitura em caixa baixa, não desce de 10px. Os dois pisos são verificados
separadamente em [`tipografia.test.tsx`](../testes-ui/tipografia.test.tsx).

> #### A tentativa que passou do ponto, no mesmo dia
>
> A primeira correção mexeu em **duas variáveis ao mesmo tempo**: subiu a régua para 12–14px *e*
> comprimiu os degraus. O cabeçalho recebeu as duas somadas e saltou 43% — a operação olhou a tela
> e disse, com razão, que estava grande. A grade tinha deixado de ser densa, e densidade ali não é
> capricho: é quantas linhas se vê sem rolar.
>
> **Ajuste de tipografia mexe numa variável por vez.** Com duas, não há como saber qual foi longe
> demais, e a correção vira outro chute.

### 1.2.2. Fora da rede, e fora do Windows

As quatro fontes vêm do Google Fonts. Se a rede corporativa bloquear `fonts.googleapis.com`, nada
carrega e o navegador cai na pilha de alternativas — que agora **nomeia uma por sistema** em vez de
deixar `system-ui` sortear: `-apple-system` e `BlinkMacSystemFont` (macOS), `Segoe UI Variable` e
`Segoe UI` (Windows), `Roboto` e `Noto Sans` (Linux/Android).

Não impede a troca de fonte — nem deveria. Torna o resultado **previsível por sistema**, que é o
que faltava para o mesmo layout não chegar com três larguras diferentes.

### 1.2.5. A raiz acompanha a tela — 11/08/2026

A validação nos **quatro monitores reais da operação** (1051 a 2535px de largura) mostrou o mesmo
defeito em graus diferentes: quanto maior a tela, menor o sistema parecia. O texto batia no teto
fixo das réguas (~13px) e parava — e 13px num monitor de 2500px é proporcionalmente minúsculo.

A correção é **uma regra**, e é o pagamento da conversão para `rem` (§1.2.1):

```css
html { font-size: clamp(16px, 15.1px + 0.065vw, 17.25px); }
```

| Largura da janela | Raiz | Efeito |
|-------------------|-----:|--------|
| até ~1366px | 16px | **o desenho aprovado, intacto** — "nas menores estão ótimo" |
| 1920px | ~16,4px | +2,3% |
| 2535px | ~16,8px | +5% |

> #### A curva foi calibrada por bissecção, e a régua é o veredito da operação
>
> A primeira versão (teto 19px, +19% na tela grande) foi recusada como "imensa" — pela mesma
> operação que tinha recusado o 16px fixo como "pequeno, não dá para ver". **Os dois vereditos
> juntos são o dado**: o ponto bom da tela de 2535px está entre 16 e 19, e a curva atual mira
> ~16,8, com folga para o lado do discreto, porque "grande demais" incomodou mais.
>
> A lição: **presença de interface não escala linear com a tela.** Quem troca de monitor não muda
> a distância do olho — o ganho certo é sutil (+2 a +5%), não proporcional. O ganho grande de
> legibilidade nas telas grandes veio da compressão dos degraus da grade (cabeçalho de 7px para
> 9–11px, §1.2.1); a raiz faz só o acabamento.

#### O tamanho do texto é escolha de quem usa — Meu Perfil › Tamanho do texto

A calibração provou em três rodadas que **não existe um tamanho certo**: a mesma interface foi
"pequena" e "imensa" para o mesmo olho em telas diferentes. A curva resolve a *tela*; a pessoa é
resolvida por um controle de três posições, como no Gmail e no Notion:

| Posição | Fator | Para quem |
|---------|------:|-----------|
| Compacto | ×0,94 | quer mais linhas por tela |
| Padrão | ×1 | a calibração do sistema |
| Confortável | ×1,07 | quer texto um degrau maior |
| **Régua fina** | ×0,90 a ×1,15, passo de 1% | o ponto exato, achado ao vivo |

> **Por que a régua existe além dos atalhos.** No monitor de 32" da operação, 16px foi "pequeno",
> +8% foi "imenso" e +2% "ainda ruim" — a janela de conforto de uma tela real é mais estreita que
> qualquer degrau pré-definido, e não se acerta por tentativa remota. A régua aplica a cada passo,
> **vendo o efeito**, na tela em que o conforto será vivido. Calibração por chat termina aqui.

O fator multiplica a raiz (`--texto-pessoal`, aplicado por [`utils/aparencia.ts`](../src/utils/aparencia.ts))
— e como tudo é `rem`, o sistema inteiro acompanha na hora, coerente. A escolha vale **por
navegador** (localStorage, fora do dado de sessão): é conforto de quem está na frente da tela, não
atributo da conta. Os fatores são de conforto, não de zoom (±7%; zoom é papel do navegador), e o
teste trava a faixa.

> **Mudar o fator também remede a grade**: `useEscalaRaiz` escuta o evento `viu:raiz` disparado
> pela aplicação do fator — sem ele, as larguras ficariam medidas na raiz antiga até o próximo
> resize.

Como nenhum tamanho do produto está mais em pixel, a raiz escala **tudo junto** — sidebar,
cabeçalhos, grade, diálogos, espaçamentos — na mesma proporção. O piso de 16px garante que tela
pequena nunca encolhe abaixo do desenho; o teto de 19px é o "que não fique imenso" do pedido.
As duas pontas são verificadas em [`tipografia.test.tsx`](../testes-ui/tipografia.test.tsx).

> **Ajuste fino por tela é uma variável.** Mexer nos três números do clamp move o produto inteiro
> junto, coerente — o oposto de caçar 202 tamanhos espalhados, que era o estado anterior.

#### As larguras acompanham a raiz — a segunda metade, encontrada em uso

A raiz fluida sozinha tinha um efeito colateral que a operação viu no mesmo dia: o **texto**
crescia nas telas grandes e as **caixas** não — larguras de coluna, mínimos de tabela e os cartões
do fluxo estavam em pixel fixo, e a palavra passou a ser comida ("Aguardando F…").

| Onde | Como escala |
|------|-------------|
| Grade do Backlog | `useEscalaRaiz` multiplica **todas** as larguras na fonte — coluna, congeladas e scroll crescem juntos, e a aritmética "exata por construção" (§3.5) continua exata. `rem` aqui quebraria o `scrollTo`, que fala pixel |
| Contratos · Talentos · Administração | Mínimos de tabela em `rem` (`min-w-[83.75rem]` etc.) — as colunas são percentuais, então escalar o contêiner escala tudo |
| Cartões do fluxo | `min-w-fit`: etiqueta de navegação **não se corta** — o cartão nunca fica menor que o próprio rótulo, e o `flex-wrap` quebra a linha com cartões inteiros |

> A regra geral que fica: **texto que escala exige caixa que escala.** Toda largura nova entra em
> `rem` — ou, na grade do Backlog, passa pelo fator de `useEscalaRaiz`. Largura fixa em px ao lado
> de texto fluido é palavra comida na tela de alguém.

### 1.2.6. Presença ≠ tamanho: o peso do cabeçalho — 11/08/2026

A operação apontou "sensação de grande nos títulos da coluna" **depois** de a régua já ter voltado
ao original. A medição explicou o que o olho via e o número escondia:

| | Valor |
|---|------:|
| Corpo real (monitor de 32") | 11,5px |
| Altura de maiúscula (caixa alta ≈ 0,72 em) | 8,3px |
| **Presença equivalente** em caixa baixa | **~16px** |

**Caixa alta + peso 600 + `letter-spacing` somam presença.** Um rótulo de 11,5px assim ocupa o
campo visual como um texto de 16px — e disputa com o dado que ele deveria apenas nomear.

| | Antes | Agora |
|---|---|---|
| Peso | 600 | **500** |
| Tracking | 0,06em | **0,02em** |
| Corpo | 11,5px | **11,5px — inalterado** |

Baixar o corpo devolveria o problema de origem (o cabeçalho ilegível), e o piso de 9px está
protegido por teste. O peso não tem esse custo: 500 em caixa alta continua perfeitamente legível, e
a placa volta a ser placa.

> #### A ordem de ajuste, destilada de três rodadas no mesmo dia
>
> Quando pedirem "menor", ceda nesta ordem:
>
> **1. espaçamento → 2. peso → 3. só então tamanho.**
>
> Espaçamento e peso são quase sempre onde está o excesso, e nenhum dos dois custa legibilidade.
> Tamanho é a última coisa a ceder — foi ele que produziu o cabeçalho de 7px, e é o único eixo que
> tira gente de fora da leitura. As três rodadas de 11/08 percorreram os três eixos na ordem
> errada; esta nota existe para a próxima começar pela ponta certa.

### 1.2.7. A caixa dos seletores da grade — 11/08/2026

Na mesma leitura, "onde seleciona os dados" também pesava. O corpo do texto **já estava igual ao
dado ao lado** (12,6px, herdado da régua): o que inflava era a caixa — `py-1.5` mais anel mais
fundo branco, e **seis lado a lado** na aba Demanda.

`py-1.5` → `py-1` nas 11 células de seleção do Backlog (`OpcaoSelect`, `EtiquetaSelect`,
`StatusOportunidadeSelect` e as células da grade): ~4px por célula, sem tirar um pixel de letra.

### 1.2.10. Altura fixa na etiqueta de status — 12/08/2026

A etiqueta da coluna Status tem **sempre a altura de duas linhas**, a do maior rótulo do catálogo
("Aguardando Feedback").

A largura nunca variou — `w-full` a torna a da coluna. A **altura** sim: rótulos curtos como
"Ajustes" cabem numa linha, os longos quebram em duas. Numa coluna congelada, que fica parada
enquanto o resto da grade rola, a diferença aparece como um degrau subindo e descendo linha a linha
— *"cada um de um tamanho fica feio ao movimentar"* (operação, 12/08/2026).

```
min-h-[calc(2.5em+0.5rem)]
         │        └─ o py-1 do botão
         └─ duas linhas de leading-tight (1.25 cada)
```

> **A medida está em `em`, e isso não é detalhe.** Ela acompanha a régua fluida da grade — em
> pixel, descolaria dela na primeira tela de tamanho diferente, que foi a lição das rodadas de
> tipografia (§1.2.5). Toda medida que convive com texto fluido se escreve na unidade do texto.

Vale para a etiqueta do Backlog. A dos Contratos (13 status, rótulos de comprimento variado) tem o
mesmo sintoma e **não foi alterada** — a mudança fica para quando a página for revista, como manda
o trabalho por quadro.

### 1.2.8. Simetria em bloco de resumo — 12/08/2026

Pedido da operação: *"eu corto assimetria"*. Duas no cabeçalho do Backlog, com a mesma origem —
cada elemento media a si mesmo em vez de dividir o espaço disponível.

| Onde | O que acontecia | Correção |
|------|-----------------|----------|
| As 5 etapas do fluxo | `flex-1` + `min-w-fit` fazia cada cartão medir o próprio rótulo: "Entrada" estreita, "Aguardando Feedback" larga | `grid` com `repeat(N, minmax(min-content, 1fr))` |
| Os 4 cards de Finalização | Declinado carrega os motivos e ficava mais alto que o Encerrado ao lado | `auto-rows-fr` — a linha mais alta define as duas |
| A seção do Fluxo | Uma fileira só contra as duas linhas da vizinha: ~60px de vazio no pé | `flex-col` + miolo com `flex-1 justify-center` |

**Larguras diferentes numa fileira sugerem peso onde só há ordem.** O fluxo representa um processo
sequencial — as cinco etapas valem o mesmo, e o tamanho não deveria dizer o contrário.

> **`minmax(min-content, 1fr)` é o par exato para este caso.** As colunas se dividem por igual
> enquanto couberem, e nenhuma encolhe abaixo do próprio rótulo — que era a garantia do `min-w-fit`
> depois do "Aguardando F…" cortado (§1.2.7). A regra antiga dava a garantia **por cartão**; esta
> dá para todos ao mesmo tempo, e é dessa diferença que sai a simetria.
>
> O número de colunas vem do catálogo (`ETAPAS_FLUXO.length`), então uma etapa nova entra na conta
> sozinha.

### 1.2.9. O cabeçalho do Backlog — 12/08/2026

Depois da simetria (§1.2.8), o bloco ficou **correto e mudo**: caixas brancas idênticas, que não
diziam nada além do texto dentro delas. O pedido foi "mais elegante e moderno", e a direção
escolhida foi a que **agrega informação**, não acabamento. Levou duas rodadas de leitura na tela.

| O que ficou | Por quê |
|-------------|---------|
| **Cor do status** na borda esquerda, em **tom pastel** | A mesma cor da etiqueta na linha da tabela: o azul do "Em Revisão" aqui é o azul do "Em Revisão" na grade. A ligação entre mapa e tabela existia só no texto |
| **Valor em R$** em cada etapa | Os cards de Finalização sempre o mostraram; os do fluxo, só a contagem. "Dois em elaboração" não diz se são dois projetos de mil ou de duzentos mil |
| Zero recuado, contagem viva destacada | Num quadro em dia quase tudo está zerado, e cinco caixinhas cinzas competiam com a única que tinha trabalho |
| Sombra no hover | Profundidade só onde há interação |
| ~~Conectores `›` entre as etapas~~ | **Saíram.** A legenda já diz "fluxo sequencial" e os cartões são numerados — a seta repetia em desenho o que o número e o texto afirmavam |

> #### O tom pastel, e a regra que o produto já tinha escrito
>
> A primeira versão usou `status.solid` — o tom **500**, o mesmo da etiqueta cheia. Numa etiqueta
> por linha ele está certo; em **nove barras ao mesmo tempo** virou, nas palavras da operação,
> *"muito carnaval"*.
>
> A §1.1.1 já registrava exatamente isso para as etiquetas: *"com tudo preenchido, cinco cores
> saturadas competiam por atenção e a grade virava um arco-íris"*. **A lição existia e não tinha
> sido aplicada aqui** — faltava o tom claro existir no catálogo para poder ser reutilizado. Entrou
> como `status.barra` (um degrau, 500 → 300), e `tipografia`… — o teste de UI trava a ausência do
> tom cheio nas barras.
>
> **Superfície repetida pede tom pastel; superfície única aguenta o cheio.** É a mesma regra da
> etiqueta preenchida × suave, agora dita para barras.

> **A barra fica na borda esquerda** porque é onde o produto já marca estado de linha — o farol de
> SLA usa a mesma posição (§3.3.1). Repetir convenção existente custa zero aprendizado.

> **Cinco colunas, e não três.** Igualar a largura à dos cards de Finalização (374px contra 193px)
> exigiria três colunas — e cinco etapas em três colunas deixam um buraco na segunda linha, a
> assimetria corrigida em §1.2.8. A presença veio pela **altura**: com o valor em R$, o cartão
> ganhou uma terceira linha e o contêiner deixou de parecer vazio.

**Nada de tipografia mudou** — a régua congelada em §1.2 segue intacta. Cor, espaçamento, sombra e
um dado a mais deram o resultado sem tocar em nenhum tamanho de fonte: a ordem de §1.2.6 aplicada
a um pedido de estética.

### 1.2.4. Densidade do topo do quadro — 11/08/2026

Entre a borda do card e a primeira linha há **três faixas empilhadas**: abas temáticas, barra de
ações e cabeçalho da tabela. Somadas, custavam ~135px — numa janela de notebook, o equivalente a
quatro linhas do quadro gastas em cromo.

| Faixa | Antes | Agora |
|-------|------:|------:|
| Abas temáticas | 49px | **35px** |
| Barra de ações | 49px | **35px** |

> **O corte veio do espaçamento, não do corpo do texto.** `py-2.5` → `py-1.5` nas faixas, `py-1.5`
> → `py-1` nos botões, ícones de 14px para 12px, raio `lg` → `md`. O texto desceu um degrau só
> (12px → `text-rotulo`), e em elemento de navegação — que tem ícone ao lado e alto contraste sobre
> o navy.
>
> A ordem importa: **quando pedirem "menor", tire ar antes de tirar letra.** Reduzir o corpo é o
> caminho curto e é o que estraga a legibilidade que a §1.2.1 acabou de comprar; o espaçamento
> quase sempre tem mais a ceder, e ninguém sente falta dele.

Aplicado **só ao Backlog** nesta rodada — é o quadro onde a operação passa o dia e o que a queixa
apontou. Contratos e Talentos seguem com o topo antigo até que a mesma decisão seja tomada para
eles.

### 1.2.3. Contraste

**Texto pequeno não usa cinza claro.** `slate-400` sobre branco dá 3,4:1 e `slate-300`, 2,2:1 —
ambos abaixo dos 4,5:1 que a WCAG pede para texto pequeno. Nos 96 pontos em que um degrau da escala
convivia com esses tons, a cor subiu para `slate-500`.

A regra vale para **texto**; ícone continua podendo ser `slate-400`, porque forma se reconhece com
menos contraste que letra.

### 1.3. Formas

| Elemento | Raio |
|----------|------|
| Cards e painéis grandes | `rounded-2xl` |
| Popovers e menus | `rounded-xl` |
| Botões, inputs, etiquetas | `rounded-lg` / `rounded-md` |
| Chips e avatares | `rounded-full` |

Sombras: `shadow-sm` em cards, `shadow-xl` em popovers, `shadow-2xl` em cartões de perfil.

---

## 2. Estrutura de página

Toda página segue o mesmo esqueleto:

```
<div flex-1 flex-col overflow-hidden>
  <Header />                                    ← fixo, não rola
  <main flex-1 overflow-auto bg-[#f4f6fa] p-6>  ← área de dados, rolagem própria
</div>
```

### 2.1. Cabeçalho (`components/Header.tsx`)

Centralizado, em quatro níveis: **título em caixa alta** (`tracking-[0.22em]`) · **traço indigo**
de 40px · **uma frase** de descrição com `text-balance` · **até três orientações** em linha, com
ícone e separador circular.

> **Regra:** o subtítulo aceita **uma frase**. Parágrafos longos centralizados quebram mal —
> orientações vão em `hints`.

### 2.2. Navegação (`components/Sidebar.tsx`)

Blocos com rótulo em caixa alta: **WORKSPACE** (operação) e **ADMINISTRAÇÃO** (gestão da
plataforma). Item ativo em `bg-indigo-50` com barra indigo à esquerda que desliza entre itens
(`layoutId`). Itens nunca quebram linha (`whitespace-nowrap`).

---

## 3. Padrão de quadro (tabela)

O quadro é um card `rounded-2xl border border-slate-200 bg-white shadow-sm` com esta ordem interna:

1. **Faixa navy** (`#111a3a`) — abas de filtro; a ativa fica em `indigo-600`. Em Contratos cada aba leva bolinha de cor, rótulo e contador; no Backlog e em Talentos, ícone (lucide) e rótulo — e no Backlog o fundo ativo **desliza** entre as abas (`layoutId`, §3.5)
2. **Barra de ações** — contagem à esquerda, ferramentas à direita, separada por `border-b`
3. **Cabeçalho de colunas** — `bg-slate-50` **sólido** (translúcido deixaria as linhas vazarem sob o `sticky`, §7.4), rótulos em caixa alta
4. **Linhas de dados** — `border-b border-slate-100`; hover `bg-slate-50/70` em Contratos e Talentos — no Backlog os fundos são os hexes da grade contínua (§3.5)
5. **Rodapé contextual** — aparece só quando há seleção ou aviso

> A **linha de criação** fixa que abria este sumário saiu dele: criar virou um gesto só (§7.8), e a
> única sobrevivente do modelo antigo é a linha de cadastro da `MembrosTable` de Equipes (§3.2).

### 3.1. Alinhamento

**No Backlog, tudo centralizado — dados e cabeçalhos —, exceto Escopo e Projeto**, os dois campos
de texto corrido, que se leem da esquerda. O **cabeçalho é sempre centralizado**, mesmo sobre essas
duas: rótulo curto alinhado à esquerda fica solto do conteúdo e quebra o ritmo da faixa de títulos.
Em Talentos e Contratos o alinhamento é **por coluna** (`align` do catálogo) — texto à esquerda,
números e etiquetas ao centro.

### 3.2. Linha de criação inline — modelo aposentado

O quadro já teve uma linha de criação fixa no topo do corpo: campos na ordem das colunas, `Enter`
salvando, botão `+` verde travado enquanto faltasse obrigatório. O modelo caiu com a regra **"criar
é um gesto só"** (§7.8) — o botão insere a linha com a chave em edição, sem formulário
intermediário — e já estava aposentado quando este documento fechou a versão 2.4 (03/08/2026). A
única sobrevivente é a linha de cadastro da `MembrosTable` de Equipes.

> **A regra que fica:** nenhuma célula de dado carrega botão.

### 3.3. Célula editável (`components/ui/EditableCell.tsx`)

Comportamento de planilha: clique abre com o conteúdo selecionado · `Enter`/blur confirma ·
`Esc` descarta · sem alteração não dispara commit. Fora da edição, realce sutil no hover.

#### O campo de texto corrido é a exceção — `multilinha`

**Regra: campo que guarda parágrafo edita em `<textarea>`, e aí `Enter` quebra linha.**

Num `<input>` o conteúdo corre para o lado indefinidamente: quem digita um briefing de três frases
vê o começo sumir pela esquerda e perde a noção do que já escreveu. E `Enter` confirmando no meio
da segunda frase torna o campo inútil para o que ele existe.

| | Célula comum | `multilinha` |
|---|---|---|
| Editor | `<input>` | `<textarea>`, altura de `linhas` |
| **Enter** | confirma | **quebra linha** |
| Confirma com | `Enter`, `Tab` ou sair do campo | `Ctrl`/`⌘`+`Enter` ou sair do campo |
| Fora de edição | `truncate` | `whitespace-pre-line`, preservando os parágrafos |

O único campo assim hoje é o **Escopo** do Backlog ([08 §6](08_backlog_e_integracoes.md)). A troca
de teclado é deliberada e vale a pena registrar: é o único lugar do produto onde `Enter` **não**
confirma, e quem estranhar precisa achar o porquê escrito.

### 3.3.1. Estado da linha é **borda**, não objeto dentro dela

**Regra: o que qualifica a linha inteira vai na borda esquerda. O que é dado da linha vai numa
coluna.**

O farol de prazo do Backlog levou três tentativas até acertar, e as duas primeiras erraram pelo
mesmo motivo:

| Tentativa | Por que não funcionou |
|-----------|-----------------------|
| Ponto colorido junto ao nome | Encostava no ponto de Prioridade — duas escalas quentes lidas como a mesma medida |
| Relógio em círculo, na célula de Ações | Ficava colado na etiqueta de Prioridade e competia com os ícones de ação |
| **Barra na borda esquerda** ✅ | Sai do fluxo horizontal: não empurra nada, não pede largura |

Uma linha de quadro já carrega etiqueta de status, etiqueta de prioridade e ícones de ação. **Cada
objeto novo no fluxo horizontal disputa com os que já estavam lá** — e cor sozinha, sem rótulo, é o
que menos se defende nessa disputa.

A barra resolve porque muda de eixo. O olho a lê como "estado desta linha" sem legenda, que é
exatamente o que ela é.

```tsx
// A barra é da primeira célula, e a célula inteira dispara o tooltip:
// 5px seria alvo pequeno demais para o mouse.
<td data-dica={data} data-dica-sub={`Deadline de triagem · ${sla.label}`}
    style={{ boxShadow: `inset 5px 0 0 0 ${SLA_TONE_STYLE[sla.tone].faixa}` }}>
```

> **A barra é `box-shadow: inset`, nunca `border`.** Com `border-collapse`, a borda não acompanha a
> célula congelada — a barra sumia ao rolar (§3.5). Por isso `faixa` em `sla.ts` é uma **cor em
> hex** (`#34d399`, `#fbbf24`, `#ef4444`), não uma classe: `box-shadow` precisa de valor. O estado
> neutro é `faixa: 'transparent'` — a pintura some sem a célula afirmar nada, e nada desloca.

**Corolário aplicado junto:** o ponto de prioridade ao lado do nome foi removido. Ele repetia em
cor o que a coluna Prioridade já diz por extenso — redundância inofensiva até existir um segundo
indicador colorido na linha. Entre dois sinais concorrentes, fica o que **não tem coluna**.

### 3.5. Grade contínua — o padrão do Backlog desde 03/08/2026

**Uma tabela só; as abas são seções que rolam; as âncoras congelam à esquerda.**

Proposto pela operação: *"navegando pelas colunas, automaticamente vai passando a aba — sensação de
continuidade"*. As quatro colunas de identificação (Status, Projeto, Entrada, Talento) apareciam em
toda aba e a leitura recomeçava a cada troca; congeladas, aparecem uma vez, com Ações e a barra do
SLA junto.

As regras que a construção fixou, cada uma nascida de um defeito visto em tela:

| Regra | O defeito que a originou |
|-------|--------------------------|
| Célula congelada usa `box-shadow: inset`, nunca `border` | `border-collapse` não leva a borda junto no `sticky` — a barra do SLA sumia ao rolar |
| Cada célula fixa soma o `left` das anteriores, em px calculado | Proporções herdadas cortavam Status e Entrada |
| Fim do scroll ⇒ última seção ativa, como caso especial | O corte geométrico nunca alcançava a última aba |
| `rolandoPorClique` suspende o listener durante o `scrollTo` | Clique → rola → troca aba → rola: loop |
| Largura em **px pelo dado real**, medida contra seed realista | Somar 82% por aba inflava colunas curtas ("3x" com 350px) |
| `table-layout: fixed` com `width` na soma das larguras declaradas | No layout automático o conteúdo alargava a coluna além do declarado e o `left` sticky ficava curto — a Talento cobria a Entrada ao rolar |
| Dados e cabeçalhos **centralizados**; só Escopo e Projeto (texto corrido) alinham à esquerda | Alinhamentos mistos por coluna quebravam o ritmo da leitura |
| Cabeçalho em `#475569` (slate-600), nunca preto | O cinza claro recuava demais — a operação pediu contraste; a hierarquia fica por conta do tamanho |
| Zebra **por índice**, não `nth-child` | A linha âmbar de "a conferir" furava a contagem: alternância "a cada 3 ou 4" |
| Fundos: selecionada > a conferir > zebra | Quem marca o checkbox precisa reencontrar a linha |
| Tipografia: projeto > dados > cabeçalho, tudo por `calc` de uma régua | Três camadas de tamanho soltas — dado maior que o rótulo que o nomeia |
| Nada dentro de `<td>` escolhe o próprio corpo (herança forçada) | Listar classes (`.text-xs`, …) nunca fecha a lista |

> A busca do quadro voltou a cobrir **todas** as colunas liberadas: numa grade contínua não existe
> "outra aba" — o valor que casou está na mesma tabela, um scroll adiante ([07 §5.1](07_visoes_e_relacoes.md)).

#### 3.5.1. A régua tipográfica (`index.css`)

A base é uma variável só: `--texto-grade: clamp(0.6875rem, 0.42rem + 0.35vh + 0.25vw, 0.8125rem)`
— 11 a 13px, medindo **os dois eixos** da janela. Começou só na altura (`vh`): o que faltava era
linha visível. A grade contínua acrescentou a largura (`vw`), com peso menor, porque num monitor
largo cabem mais colunas por vez e o corpo pede um grau a mais para a leitura não apertar.

As camadas derivam por `calc` — mudar a base move o conjunto junto:

| Camada | Corpo | Por quê |
|--------|-------|---------|
| Nome do projeto (`col-projeto`) | `--texto-grade` | identifica a linha — é o que se procura |
| Dados (`td`) | `− 0.125rem` | valores curtos de consulta, menores que a placa que os nomeia |
| Cabeçalho (`th`) | `− 0.25rem` | placa de localização: bold + caixa alta já a distinguem |
| Entrada, etiqueta de status, selos e `legenda-linha` | `− 0.1875rem` | metadado — com o corpo do dado, competiriam com o nome ao lado |

**Herança forçada:** `.grade-fluida td * { font-size: inherit }` — nada dentro de uma célula
escolhe o próprio corpo. As duas tentativas anteriores listavam classes (`.text-xs`, …) e falharam
porque a lista nunca fecha; a regra estrutural fecha. As exceções são **nominais** (as da tabela
acima), cada uma com o motivo escrito no CSS (`index.css:27-144`).

#### 3.5.2. Os fundos, em hex

Vivem no `index.css` como valores — precisam vencer a zebra e pintar também as células congeladas,
que têm fundo próprio (sem fundo opaco, o que rola aparece por baixo do bloco fixo):

| Estado | Fundo | No hover |
|--------|-------|----------|
| Zebra (por índice, §3.5) | `#f1f5f9` | `#e6edf5` |
| Selecionada | `#e0e7ff` | `#d7dff9` |
| A conferir | `#fffbeb` | `#fef3c7` |
| Bloco congelado sem estado | `#fcfcfd` | `#f8fafc` |

A prioridade é a da tabela de regras acima: **selecionada > a conferir > zebra** — quem marcou o
checkbox precisa reencontrar a linha.

#### 3.5.3. Divisas e scrollbar

- **Divisa do bloco congelado:** `box-shadow: 6px 0 8px -6px rgb(15 23 42 / 0.12)` na última
  célula fixa (`col-fixa-ultima`) — sombra curta, só do lado que encosta no que rola; sem ela, a
  coluna que passa por baixo parece parte do bloco fixo por um instante.
- **Divisa entre seções:** um fio vertical que desce a coluna inteira — `th[data-secao]` em
  `#cbd5e1`, `td[data-secao]` em `#e2e8f0`. O cabeçalho declara o atributo; nas células ele chega
  por `cloneElement` no pós-processo, cobrindo todos os caminhos de célula de uma vez.
- **Scrollbar** (`custom-scrollbar`): 6px nos dois eixos, trilho `rgba(226,232,240,.5)` e polegar
  `rgba(148,163,184,.4)` que escurece no hover — discreta o bastante para não competir com a grade.

#### 3.5.4. O bloco congelado, medido

**Seis células**, na ordem: seleção · **Ações** · Status · Projeto · Entrada · Talento. A barra do
SLA **não é célula** — é a pintura `inset` da célula do checkbox (§3.3.1). As larguras próprias:
checkbox 44px (`L_CHECKBOX`), Ações 72px (`L_ACOES`), Projeto 340px (`L_NOME` — nomes longos em
duas linhas); Status, Entrada e Talento vêm do catálogo (`larguraDaColuna`). Cada `left` é a soma
acumulada das anteriores, e a tabela declara `width` na soma total (`larguraTotal`) com
`minWidth: 100%` — com `table-layout: fixed`, a soma confere por construção (§7.10).

#### 3.5.5. A mecânica scroll ↔ aba

- A posição de cada seção é **somada do catálogo** (`inicioDaSecaoPx`), não medida do DOM: com
  `table-layout: fixed` a largura declarada é a real, e a soma emparelha por construção. Medir
  `offsetLeft` do `<th>` parava *perto*, não alinhado (reporte da operação, 04/08/2026).
- O destino do clique é **clampado ao limite físico** do scroll — sem isso, as seções do fim pedem
  um destino que o navegador nunca alcança, e o observer ficaria surdo esperando a chegada.
- O observer devolve o controle quando a animação **assenta no destino** (±2px), com rede de 2s se
  o navegador nunca chegar. Os 600ms fixos da primeira versão eram mais curtos que o `smooth` de
  uma travessia longa: o observer reassumia no meio e a aba piscava.
- Rolando, a seção ativa é a última cujo início já **passou** da borda do congelado, com 8px de
  tolerância; no **fim do scroll** (folga de 4px) a última seção acende como caso especial — o
  corte geométrico nunca a alcançaria.
- O fundo da aba ativa é um `motion.span` com `layoutId` e spring `stiffness 500 / damping 40`:
  quando o scroll troca a seção, ele **desliza** de uma aba à outra em vez de piscar (§7.3).

### 3.4. Etiquetas

O **status do registro** é etiqueta preenchida ocupando a célula, com texto branco — o dado
primário do quadro (§1.1.1). Mas o painel que ela abre não é uma paleta com tudo: no Backlog, o
`StatusOportunidadeSelect` oferece **só os destinos válidos** e lista os demais em cinza, sem
clique (§3.6); em Contratos, o `StatusSelect` abre os 13 status da esteira.

As demais listas fechadas (`EtiquetaSelect`, `OpcaoSelect`) usam **chip claro** — fundo suave,
texto forte, `ring-1` —, não etiqueta preenchida: colori-las todas competiria com o status e a
prioridade, que precisam saltar aos olhos.

### 3.6. O painel de status

O `StatusOportunidadeSelect` é a etiqueta que move o fluxo — e, desde 04/08/2026, também onde
vivem as **pendências** ([00 §5.11](00_status_implementacao.md), [08 §7](08_backlog_e_integracoes.md)).
O que o padrão fixa:

- **Só destinos válidos.** O painel lista para onde a linha **pode** ir; os demais status aparecem
  em cinza, sem clique, sob "Indisponíveis a partir daqui" — mostrar que existem ensina o fluxo;
  esconder faria a pessoa procurar.
- **Declinar abre por motivo** — e só pelos motivos que a etapa permite
  (`motivosPermitidosDoDeclinio`): da Revisão, apenas "Decl. Talento". Oferecer "Declinado" e
  perguntar depois abriria a porta ao registro sem motivo.
- **Badge de canto** no selo: `absolute -right-1.5 -top-1.5`, `h-4`, `ring-2 ring-white` — âmbar
  (`bg-amber-500`) com `⏳N` esperando; verde (`bg-emerald-600`) com `✓N` quando todas chegaram.
  No canto, não disputa largura com o rótulo — o sufixo com nome "comia texto" e o badge na linha
  do rótulo espremia "Em Elaboração" (print da operação). Os nomes por extenso vivem na dica e no
  painel.
- **Bloco Pendências** dentro do painel: cada espera com ⏳ e os dias correndo, **✓ Chegou** (fato,
  não julgamento), **↩ Reabrir** (marcou sem querer) e **✕** descartar (abriu por engano — sai da
  medição). "+ Abrir pendência" oferece só os tipos que o status catalogou.
- **Aviso âmbar:** avançar com espera aberta é permitido, mas o primeiro clique vira pergunta —
  "Há N pendências abertas — avançar assim mesmo?". Travar geraria contorno; o aviso é a fricção
  certa.
- **Destino travado:** da Elaboração não se sobe à Revisão com espera aberta. O destino aparece
  **desabilitado, com `Lock` e o porquê na dica** — a pessoa precisa saber que o caminho existe.
- **O painel não fecha em interação interna.** O clique-fora soma `botaoRef` **e** `painelRef`: o
  painel vive em portal, e sem a segunda ref qualquer clique dentro dele contava como "fora" —
  marcar "chegou" fechava tudo (bug apontado pela operação). Ele fecha por três caminhos, todos
  intencionais: escolher um destino, clicar fora de verdade, ou clicar no selo de novo.
- **Altura estimada:** o `Floating` recebe uma conta de altura (motivos de declínio, bloco de
  pendências, confirmação) para decidir se o painel abre para baixo ou para cima.

### 3.7. Vocabulário das células

Uma linha por padrão — o detalhe vive no componente citado:

| Padrão | Onde vive |
|--------|-----------|
| Selos da célula do nome: `Congelado` (Lock, indigo), rastro de duplicação (**só o ícone** CopyPlus — "Duplicada" soava a erro) e `Encerrada por inatividade` (Hourglass) | `BacklogTable` |
| Célula travada por tique: sem o tique do Escopo, a coluna homônima da Produção mostra `Ban` + "—" e a dica diz onde destrava; colunas de ficha (Razão Social, CNPJ, Origem do Talento) rendem em **duas etapas** — sem ficha, traço explicado; com ficha, o dado em leitura | `BacklogTable` |
| Botão **Exportar** (`FileSpreadsheet`), desabilitado com o quadro vazio — baixa `.xlsx` real com o que está na tela ([00 §5.9](00_status_implementacao.md)) | `BacklogTable` · `utils/exportacao.ts` |
| Estado vazio de permissão: sem nenhuma aba liberada, a grade não renderiza — "Nenhuma aba do Backlog está liberada para você", com o porquê | `BacklogTable` |
| `EditableCell` por teclado: foco abre a edição (`tabIndex` + `onFocus`), Enter/Tab/blur confirmam, Esc descarta; fora da edição o texto ocupa `linhas` 1, 2 ou 3 (`truncate` / `line-clamp`) | `ui/EditableCell` |
| `CelulaOculta`: borrão de pontos com `blur-[2px]` em **três larguras** (curta · média · longa), para o sigilo não virar padrão uniforme — o valor real nunca chega ao componente | `ui/CelulaOculta` |
| `SelecaoComCadastro`, vocabulário fixo: "Buscar {entidade}…" · "Criar "{texto}"" com "Entra como solicitação de cadastro" · selo âmbar `Pendente` · "Limpar" | `ui/SelecaoComCadastro` |
| Cabeçalho sem acesso: a coluna oculta mantém o rótulo em `text-slate-300` com `EyeOff`, sem ordenação — some o dado, não a coluna | `BacklogTable` |
| `Floating`: portal no `body` com `z-50`, 6px de folga do gatilho, `align` center/start e margem de 8px da janela | `ui/Floating` |
| Rodapé de seleção: barra `border-t bg-slate-50` com "N oportunidade(s) selecionada(s)" — só aparece com seleção | `BacklogTable` |

---

## 4. Painéis flutuantes

**Todo popover usa `components/ui/Floating.tsx`** — portal no `body` com posição fixa.

> **Por quê:** grades vivem dentro de `overflow-x-auto` e cards usam `overflow-hidden` para
> arredondar as bordas. Nos dois casos o conteúdo posicionado com `absolute` é **recortado** —
> foi assim que o resultado da busca na aba Acessos sumiu atrás da borda do card.
>
> Regra prática: **se abre por cima de algo, vai em portal.** Vale para menus, resultados de
> busca, seletores e cartões de hover.

Recursos: recalcula em scroll (com captura) e resize · inverte para cima quando não cabe ·
limita à janela com margem de 8px.

Padrão de conteúdo: busca no topo — no `SelecaoComCadastro` ela aparece **sempre**, porque também
é o campo de criar · lista com `max-h` e rolagem · entrada com fade + escala de 140ms.

**Fechar é clique fora (`mousedown`), não `Esc`.** Nenhum painel do Backlog escuta `Esc` no
documento; a tecla só age com o foco no input de busca do painel. E o clique-fora soma o `ref` do
botão **e** o do painel — o painel vive em portal, e sem a segunda referência qualquer interação
interna contava como "fora" e fechava tudo (§3.6).

---

## 5. Pessoas

| Elemento | Padrão |
|----------|--------|
| Avatar | Iniciais sobre cor derivada do nome (estável por pessoa) |
| Pilha | Sobreposição de `-6px`, anel branco |
| Responsável | Coroa âmbar no canto do avatar |
| Cartão de perfil | Hover, com carência de 180ms para o ponteiro alcançá-lo |
| Busca de pessoas | Por **nome ou e-mail**, com `normalize('NFD')` + `\p{Diacritic}` |
| Usuário atual | Sempre no topo das listas, marcado com `(você)` |

---

## 6. Movimento

Curto e discreto. Nunca gratuito.

| Situação | Efeito |
|----------|--------|
| Entrada de linha | Fade + 6px, 180ms |
| Popover | Fade + escala, 140ms |
| Botão de ação | `whileHover` sobe 1–2px; `whileTap` encolhe 3–4% |
| Botão "Novo…" | `whileHover` sobe 1px (`y: -1`); `whileTap` 0.97 |
| Ícone de criar da linha de cadastro | Gira 90° no hover — só na `MembrosTable`, última linha de criação inline (§3.2) |
| Ícone de excluir | Balança no eixo X |
| Etiqueta e seletor | `whileTap` encolhe 3% (`scale: 0.97`) |
| Item ativo de navegação | Barra que desliza (`layoutId`) |
| Barras de proporção | Largura animada por spring |
| Diálogo | Véu em fade de 150ms; cartão entra com escala 0.96→1 e 8px, 180ms (§8.1) |
| Aviso do desfazer | Sobe 12px com fade, 180ms; sai em 3,2s (§8.2) |

> **Quem pediu para reduzir movimento não recebe nada disto.** A preferência do sistema operacional
> é respeitada nas duas metades: o `index.css` desliga transições e animações de CSS, e o
> `<MotionConfig reducedMotion="user">` no `App.tsx` desliga as do `motion`, que são calculadas em
> JavaScript e escapariam da regra de CSS. Esquecer uma das metades deixa metade do produto
> animando — e é o tipo de coisa que ninguém percebe sem ligar a preferência para testar.

> O "pop de escala + clarão + anel que expande" na troca de valor saiu desta lista em 04/08/2026:
> nunca chegou ao código atual. A troca já se confirma pelo próprio conteúdo da etiqueta, e o
> aperto (`whileTap`) dá o retorno tátil — efeito por cima disso seria movimento gratuito.

---

## 7. Textos

- Português do Brasil, com acentuação correta
- Rótulos de coluna no singular (`Nome`, `Contato`, `Papel`)
- Contagens com plural correto: `1 contrato` / `4 contratos`
- Confirmação de exclusão **nomeia o alvo**: *"Excluir o contrato de Ana Martins?"*
- Estados vazios dizem **o que fazer**, não só que está vazio
- Sem "Deletar" — usar **Excluir** (base) e **Remover** (vínculo)

### 7.1. Placeholders

**Regra: o placeholder tem de caber no menor tamanho em que o campo aparece.**

O cálculo de referência, para `text-xs`:

```
caracteres que cabem ≈ (largura_da_coluna_em_px − 26) ÷ 6,2
```

onde a largura é a **declarada em px** no catálogo (`larguraDaColuna`, §3.5) e os 26px são o
`px-2` mais a folga do anel de foco. A fórmula proporcional que estava aqui —
`largura_mínima_da_tabela × peso%` — morreu com o layout proporcional, em 03/08/2026: desde a
grade contínua, a largura declarada **é** a real (§7.10).

Placeholder que estoura não é só feio: ele **corta a informação no meio** e quem lê fica sem
saber o que o campo pede.

| Coluna estreita | Coluna larga |
|-----------------|--------------|
| `Buscar no quadro…` | `Buscar por nome ou e-mail` |
| `+ Novo talento (Enter)` | — |
| `30 dias` | `30 dias após a entrega` |
| `Ag. / CC` | `Banco, agência e conta` |

O detalhe que não coube vai para o `title` do campo ou para o `hint` do cabeçalho da coluna — não
some, só muda de lugar.

Textos de apoio longos levam `truncate` com o texto completo
no `title`, em vez de empurrar o layout.

---

## 7.2. Ligar e desligar

**Regra: estado binário usa `Switch`, não chip que muda de cor.**

Com um chip, "ligado" e "desligado" são a mesma forma em duas cores — quem não decora a convenção
compara com os vizinhos para descobrir o estado. O interruptor diz a posição pela **forma**; a cor
vira reforço.

| Tom | Quando |
|-----|--------|
| `indigo` | Ação comum — liberar quadro, mostrar coluna |
| `ambar` | **Privilégio** — liberar aba de dado sensível |

Chips continuam válidos para **escolha entre opções** (o farol de vigência, os filtros de tipo),
onde só um está ativo por vez e a comparação entre eles é justamente o ponto.

---

## 7.3. `layoutId` do motion — um por instância

Indicador que desliza (o traço das abas, a marca da página ativa) usa `layoutId`. **O id precisa
ser único por instância do componente**, via `useId()`.

> **Bug que isto corrige:** com um id fixo, todas as abas do produto compartilhavam o mesmo
> indicador. Sair de Equipes e entrar em Usuários fazia o traço **viajar** da posição antiga até a
> nova, atravessando a tela — o motion não sabia que eram telas diferentes; para ele, era o mesmo
> elemento mudando de lugar.
>
> Com `useId`, o traço desliza entre as abas da mesma tela e simplesmente nasce no lugar certo ao
> trocar de tela.

Id fixo só é correto quando **existe uma instância só** na aplicação inteira. São duas exceções
hoje: o indicador da barra lateral e, desde 04/08/2026, a faixa de abas do Backlog
(`backlog-aba-ativa`) — o quadro monta uma vez, e o fundo compartilhado é o que faz a faixa
**deslizar** entre as abas quando o scroll troca a seção (§3.5.5).

E note a divisão de trabalho: o componente `ui/Tabs` (com `useId`) é usado só em **Usuários** e no
**detalhe da equipe** — os quadros desenham a própria faixa de abas à mão, porque a deles carrega
contadores, ícones e restrição por aba.

---

## 7.4. O quadro ocupa a tela; só a lista rola

**Regra: o card do quadro preenche a altura disponível. A página não rola — o corpo da lista sim.
Cabeçalho, busca, filtros e rodapé ficam parados.**

Duas razões:

1. **Volume.** A operação estima ~50 projetos por dia. Rolar a página inteira tira da tela
   justamente o que se usa para navegar: o cabeçalho das colunas, a busca e os filtros. A pessoa
   desce, perde a referência de qual coluna está lendo, e sobe de novo.

2. **Espaço morto.** Um card que cresce com o conteúdo deixa metade da tela vazia quando há
   poucas linhas, e a área de trabalho muda de tamanho a cada filtro aplicado.

```
┌ cabeçalho da página ──────────────┐  altura natural
├───────────────────────────────────┤
│ ┌ abas ─────────────────────────┐ │  shrink-0
│ ├ busca · filtros · ações ──────┤ │  shrink-0
│ ├ cabeçalho das colunas ────────┤ │  sticky top-0
│ │ ▓▓ linhas ▓ ← rola aqui ▓▓    │ │  flex-1 overflow-auto
│ ├ rodapé de totais ─────────────┤ │  shrink-0
│ └───────────────────────────────┘ │  ← o card ocupa tudo que sobra
└───────────────────────────────────┘
```

### A cadeia de flex

```tsx
// página
<div className="flex h-screen flex-col overflow-hidden">
  <Header />                                              {/* altura natural */}
  <main className="flex min-h-0 flex-1 flex-col bg-[#f4f6fa] p-6">
    <div className="min-h-0 flex-1">
      <Tabela />
    </div>
  </main>
</div>

// componente da tabela
<div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border …">
  <div className="shrink-0 …">{/* abas */}</div>
  <div className="shrink-0 …">{/* busca e filtros */}</div>
  <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
    <table className="table-fixed">…</table>
  </div>
  <Rodape />                                              {/* shrink-0 */}
</div>
```

> ### `min-h-0` é o que faz tudo funcionar
>
> Por padrão, um filho flex **não encolhe abaixo do próprio conteúdo** (`min-height: auto`). Sem
> `min-h-0` na cadeia, o container da lista cresce até caber tudo, o `overflow-auto` nunca tem o
> que cortar, e a página inteira volta a rolar — exatamente o que se queria evitar.
>
> Ele precisa estar em **todos os elos**: no `main`, no invólucro e no card.

### O sticky dentro da lista

```tsx
// Backlog — três camadas, porque o sticky é em dois eixos:
<th className="sticky top-0 z-30 … bg-slate-50 px-2 py-2" />  // cabeçalho congelado (topo E esquerda)
<th className="sticky top-0 z-20 … bg-slate-50 px-2 py-2" />  // cabeçalho rolante
<td className="sticky z-10 col-fixa" />                       // corpo congelado
```

Dois detalhes que não são opcionais:

1. **`sticky` vai no `<th>`, não no `<thead>`/`<tr>`.** Em tabelas, o navegador ignora
   `position: sticky` nos elementos de agrupamento — a regra precisa estar na célula.

2. **Fundo sólido, não translúcido.** `bg-slate-50/70` deixaria as linhas aparecerem através do
   cabeçalho enquanto rolam. Com `sticky`, opacidade parcial é sujeira garantida.

No Backlog a pilha tem três degraus — `z-30` no cabeçalho congelado (que gruda no topo **e** na
esquerda), `z-20` no cabeçalho rolante, `z-10` no corpo congelado — para cada camada passar por
cima da de baixo ao rolar nos dois eixos. Em Contratos e Talentos, que só rolam na vertical, basta
o `z-20` — e o `h-9` declarado sobrevive lá; no Backlog o cabeçalho é `px-2 py-2` sem altura fixa,
porque quem dita o corpo é a régua da grade (§3.5.1).

> **Havia uma segunda camada `sticky`**, em `top-9`, para a linha de criação fixa. Ela saiu junto
> com aquele modelo (§7.8) — e com ela a dependência entre a altura declarada do cabeçalho (`h-9`)
> e o `top` da linha de baixo, que era um acoplamento a manter a cada ajuste de altura.

Vale para **todos os quadros** — Backlog, Contratos e Talentos.

---

## 7.5. Linha de tabela não anima a saída

**Regra: `AnimatePresence` nunca envolve linhas de uma grade. Entrada anima; saída, não.**

`AnimatePresence` segura o elemento no DOM até a animação de saída terminar. Numa `<tr>` isso
produz dois defeitos ao mesmo tempo, e ambos apareceram em tela:

1. **A linha continua ocupando a altura toda** enquanto desaparece — um buraco no meio da lista,
   do tamanho exato da linha que saiu. Com várias saindo juntas (trocar de etapa, aplicar filtro),
   são vários buracos.

2. **Ela exibe o dado JÁ ATUALIZADO** durante a saída. Mudar o status de um projeto para
   "Declinado" numa lista de "Negócio Fechado" deixava, por alguns quadros, uma linha "Declinado"
   visível numa lista onde ela não pertence — e o rodapé dizia "Total no grupo: 1" com duas linhas
   na tela.

O segundo é o mais perigoso: não é um artefato visual, é a tela **afirmando algo falso** sobre o
conteúdo do quadro. Quem olha naquele instante lê um número e vê outro.

```tsx
// ERRADO
<AnimatePresence initial={false}>{linhas.map(renderLinha)}</AnimatePresence>
<motion.tr initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

// CERTO — entrada anima, saída é imediata
{linhas.map(renderLinha)}
<motion.tr initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
```

Não há como consertar mantendo o efeito: uma `<tr>` não colapsa altura de forma animável sem
hacks em cada `<td>`. **A saída correta de uma linha é sumir.**

`AnimatePresence` continua certo onde o elemento é sobreposto e não ocupa espaço no fluxo —
popovers, dropdowns, o menu de status. A regra é sobre grades.

---

## 7.6. Seleção é a interseção com o visível

**Regra: nunca limpar a seleção por lista de dependências. Derivá-la das linhas na tela.**

O modelo antigo era `useEffect(() => setSelecionados(new Set()), [aba, busca, filtro])`. A lista
esquecia casos, e sempre esqueceria: a etapa do fluxo é estado da **página**, não da tabela; e uma
linha também sai da lista ao **mudar de status**, sem que filtro algum tenha mudado.

O id ficava marcado e invisível. **"Excluir em Lote (1)" apagava o que ninguém estava vendo.**

```tsx
const selecao = useMemo(
  () => oportunidades.filter((o) => selecionados.has(o.id)).map((o) => o.id),
  [oportunidades, selecionados],
);
```

Toda leitura passa a usar `selecao` — o contador do botão, o texto da confirmação, os ids
excluídos e o estado do "selecionar todas". A regra não depende de **qual** evento tirou a linha
da lista, então não há lista de dependências para manter correta.

Efeito colateral desejável: buscar não descarta mais o que a pessoa tinha marcado de propósito.
As marcações voltam quando a busca é limpa.

---

## 7.7. Ordenação segue a ordem da operação

**Regra: campo com ordem própria ordena por ela; `localeCompare` só para texto livre.**

Ordenar `prioridade` como texto dá **"Alta, Baixa, Média"** — o oposto do que a coluna promete.
Ordenar `status` dá "Aguardando Feedback, Ajuste, Declinado…", uma sequência que não corresponde a
etapa nenhuma do processo.

```ts
const ORDEM_CANONICA: Record<string, string[]> = {
  status: [...ETAPAS_FLUXO.map((e) => e.status), ...DESFECHOS],
  prioridade: PRIORIDADES.map((p) => p.id),
};
```

Três detalhes que a implementação precisa respeitar:

- **A escala vem da lista que a tela desenha.** No Backlog é `ETAPAS_FLUXO`, não
  `STATUS_OPORTUNIDADE` — as duas divergem na posição de Ajuste, e usar a errada faria a coluna
  contradizer o mapa do processo logo acima dela.
- **Valor fora da escala vai para o fim.** `indexOf` devolve `-1`, e um registro corrompido no
  topo da lista é o pior lugar possível para um dado que ninguém sabe ler.
- **A ordenação some junto com a coluna.** Ordenar por Marca no Escopo e ir para o Financeiro
  deixava a lista numa ordem que nenhuma coluna visível explica. A coluna-chave é a exceção:
  existe em todas as abas.

---

## 7.8. Criar é um gesto só

**Regra: o botão insere a linha na lista imediatamente, com a chave em edição. Não há formulário
intermediário.**

```
[+ Novo projeto]  →  linha aparece no topo, cursor no nome, texto selecionado
                     ↓
                     a pessoa digita e vai preenchendo célula a célula,
                     como em qualquer outra linha da grade
```

O registro **existe desde o primeiro clique**. Preencher é editar, com a mesma edição inline que
vale para as linhas antigas — não há um modo "criando" com regras próprias.

### Duas versões descartadas

| Versão | Por que saiu |
|--------|--------------|
| **Linha verde fixa no topo** | Ocupava espaço permanente para um gesto ocasional, e num quadro vazio competia com a mensagem que explica que não há nada ali |
| **Botão que abre a linha para preencher e depois "Inserir"** | Dois cliques para criar uma linha. O preenchimento por célula acontece de qualquer forma depois — a etapa intermediária só adiava o mesmo trabalho |

A segunda tinha aparelhagem própria: rascunho por id de coluna, barra de montagem com contador,
conversão de campos em `utils/rascunho.ts`, catálogo de escolhas só para a criação. **Tudo isso
saiu.** A grade já sabia editar; faltava usar isso.

### O nome provisório

A chave da linha não pode nascer vazia — buscar, ordenar e identificar dependem dela, e uma célula
sem conteúdo não tem onde ser clicada. Então a linha nasce nomeada:

| Quadro | Nome inicial |
|--------|--------------|
| Backlog | `Sem título` |
| Contratos | `Sem talento` |
| Talentos | `Sem nome`, `Sem nome 2`, … |

A célula abre **com o texto selecionado**, então digitar substitui. Quem sair sem preencher vê o
provisório na lista — o que é honesto: a linha existe e falta nomear.

> **Talentos numera o provisório** porque o cadastro recusa nomes repetidos. Sem isso, criar duas
> fichas seguidas sem renomear a primeira falharia — em silêncio, porque `criarTalento` devolve
> `null` e o botão não teria o que fazer com isso.

### A implementação

```tsx
const [recemCriada, setRecemCriada] = useState<string | null>(null);

function novoRegistro() {
  const id = onCriar();          // devolve o id, ou null
  if (id) setRecemCriada(id);
}

// na célula da chave:
<EditableCell
  value={op.titulo}
  editing={op.id === recemCriada}
  onEditingEnd={() => setRecemCriada(null)}
/>
```

`onCriar` devolve o **id** justamente para isto. Sem o cursor posicionado, criar exigiria um
segundo clique para começar a preencher — que é o gesto que o botão eliminou.

`EditableCell` e `CelulaReferencia` aceitam `editing` controlado ([§10](#10-catálogo-de-componentes)).
As duas precisam disso porque a coluna-chave é uma em Contratos (referência) e outra nos demais
quadros (texto).

### O que o formulário nunca escolhe

Status, entrada, deadline e `criadoEm` são preenchidos pelo provider na criação. Não é limite de
tela: aceitar `status` de fora permitiria criar um projeto já "Em Revisão", furando a máquina de
estados, e aceitar as datas quebraria o SLA.

---

## 7.9. Tooltip: um só, e só quando falta informação

### Um componente para o app inteiro

A grade tem ~12 colunas × 50 linhas. Um tooltip por célula seriam **600 instâncias** com estado e
listener próprios para exibir **um** balão por vez. [`Dica`](../src/components/ui/Dica.tsx) monta
uma vez em `App` e escuta o documento: o custo por célula é um atributo no HTML.

```tsx
<span data-dica="Sob Demanda" data-dica-sub="Natureza do projeto">Sob Deman…</span>
```

| Atributo | Papel |
|----------|-------|
| `data-dica` | **O dado** — o que a pessoa foi buscar. Vem primeiro, em destaque |
| `data-dica-sub` | A explicação — contexto, em segundo plano |
| `data-dica-sempre` | Desliga a checagem de corte (abaixo) |

### O balão mostra o dado, não o rótulo da ação

Antes, a dica de uma célula de Marca dizia *"Escolher marca"* — a pessoa passava o mouse sobre um
nome cortado e recebia de volta o nome do botão. Agora diz **Magalu**, e *"Escolher marca"* é o
`aria-label`, que é onde nome de controle sempre deveria ter estado.

### Só aparece quando o texto não coube

Repetir num balão o que já se lê é ruído: a pessoa espera 0,4s e recebe o que já sabia. A `Dica`
mede o elemento e seus filhos (`scrollWidth > clientWidth`, com 1px de tolerância para subpixel)
antes de abrir, e desiste se tudo estiver visível.

`data-dica-sempre` marca o que **não** repete a tela: o significado de uma coluna, o motivo de uma
célula estar travada, o alcance de uma edição. Essas valem cabendo ou não.

> **Por que percorre os filhos.** O texto costuma estar num `<span>` interno com `truncate` ou
> `line-clamp` — é ele quem corta, não o container que carrega o atributo.

### Por que substituiu o `title` nativo

| | `title` do navegador | `Dica` |
|---|---|---|
| Atraso | ~1s, não configurável | 380ms |
| Quebra de linha | não | sim |
| Estilo | nenhum | do produto |
| Duas informações | não | dado + explicação |

**E os dois juntos desenhavam dois balões.** Onde `title` e `data-dica` convivem no mesmo elemento,
o navegador sobrepõe o seu ao nosso. Por isso o `title` saiu das células do Backlog que ganharam
`data-dica` — não é opcional manter os dois, é defeito visível. Ele **ainda vive** onde a `Dica`
não chegou: nas grades de Contratos e Talentos, na `CelulaOculta` (que o Backlog também usa — ali
sem `data-dica` no mesmo elemento, então sem balão duplo) e nas telas de Administração. A regra
vale a cada migração: quando o `data-dica` entra, o `title` sai do mesmo elemento.

> **O nome acessível voltou como `aria-label`.** O `title` também nomeava botões para leitores de
> tela; removê-lo sem repor teria trocado um problema visual por um de acessibilidade.

### Fecha ao rolar

Rolar ou redimensionar invalida a posição medida. Fechar é mais honesto que reposicionar: o ponteiro
provavelmente já não está sobre o mesmo elemento.

---

## 7.10. Texto de célula e de cabeçalho sempre legível

**Nome do projeto:** `line-clamp-2` — é o que identifica a linha, e cortá-lo obrigaria a passar o
mouse em cada uma para saber do que se trata. O que estourar duas linhas cai na `Dica`.

### Cabeçalho de tabela — a métrica é uma só, em todo o projeto

```
text-[10px] font-bold uppercase tracking-wide  ·  line-clamp-2  ·  sem break-words
```

Vale como escrito para Contratos e Talentos. **No Backlog a métrica tem dono maior:** o
`index.css` sobrescreve o corpo do `th` pela régua da grade (`calc(var(--texto-grade) - 0.25rem)`,
`letter-spacing: 0.06em`, peso 600, cor `#475569` — §3.5.1); a classe segue no markup como
fallback, mas quem manda é a régua. A exceção existe pelo mesmo motivo da regra: dentro de uma
grade fluida, um tamanho fixo divergiria do resto a cada redimensionamento.

#### O que quebrava, e por quê

A tela mostrava **"VÍDEO S"** e **"PRIORIDAD E"** — palavra partida no meio. Três causas somadas, e
a segunda era a menos óbvia:

| Causa | Custo |
|-------|-------|
| `text-[11px]` | ~9,5px por caractere maiúsculo |
| **`tracking-wider`** (0,05em) | Letter-spacing **sobre texto já em caixa alta** — soma um pixel por letra numa coluna que conta pixels |
| `break-words` | Autoriza a quebra dentro da palavra quando nada mais cabe |

#### A regra

1. **Fonte 10px com `tracking-wide`** — metade do espaçamento anterior. Custo real medido: **8,5px
   por caractere**
2. **Sem `break-words`** — a palavra que não couber na primeira linha desce **inteira** para a
   segunda. Nunca se parte
3. **`line-clamp-2`** — duas linhas é o teto; o rótulo que precisar de três está longo demais
4. **A largura reserva espaço para a maior palavra**, não para o rótulo inteiro

> **Rótulo curto é decisão de produto, não de layout.** Na aba Links, "Link" prefixava quatro
> colunas seguidas — a aba já se chama Links, e o prefixo gastava justamente a largura que faltava
> para a palavra que importa.

#### O teste que trava isso

`testeColunas` calcula, para **cada coluna de cada aba dos três quadros**: maior palavra ×
8,5px + padding + ícone de ordenar, contra a **largura declarada** da coluna (`larguraDaColuna`) —
que o `table-layout: fixed` torna a largura real. A fração de 1760px que servia de régua morreu
com o layout proporcional (03/08/2026).

> **A constante nasceu errada e o teste passou mentindo.** O primeiro valor foi **estimado em 7px**,
> não medido — e a suíte ficava verde enquanto a tela mostrava "VÍDEO S". Medir na fonte real
> mudou 1,5px por caractere, que vira 20px numa palavra de 14 letras: exatamente o que faltava.
>
> Um teste calibrado por estimativa dá a garantia errada — pior que não ter teste, porque cria
> confiança.

#### Em monitor menor: rolagem, não texto espremido

A tabela declara `width` na **soma das larguras declaradas** (`larguraTotal`), com
`minWidth: 100%` para preencher monitores largos. Quando a janela é menor que a soma, a tabela
rola na horizontal, e essa é a escolha: **rolar é melhor que ler pela metade.** Encolher a fonte
até tudo caber daria uma tabela que ninguém lê em tela nenhuma. (O piso fixo de 1760px era o
contrato do layout proporcional e morreu com ele, 03/08/2026.)

**Etiquetas de status:** o rótulo quebra dentro do botão em vez de encolher a fonte. Fonte menor em
algumas linhas e não em outras faria a coluna parecer desalinhada.

---

## 8. Interações destrutivas

**Duas proteções, para dois problemas diferentes.** Elas não se substituem, e confundi-las produz
ou uma tela que pergunta o tempo todo, ou uma que nunca perdoa:

| Proteção | Protege de | Onde |
|----------|-----------|------|
| **Confirmação em diálogo** (§8.1) | o gesto **deliberado e irreversível** — excluir, apagar tudo | 12 pontos do sistema |
| **Desfazer com `Ctrl+Z`** (§8.2) | o gesto **acidental e reversível** — sobrescrever uma célula | dado dos três quadros |

Pedir confirmação a cada célula editada tornaria a grade impraticável; oferecer desfazer sem
confirmação deixaria a exclusão em lote a um clique de distância. Cada uma cobre o que a outra não
alcança.

Distinguir sempre:

| Ação | Significado |
|------|-------------|
| **Remover** | Desfaz um vínculo — a pessoa sai da equipe, mas continua na base |
| **Excluir** | Apaga o registro |

---

### 8.1. O diálogo — [`components/ui/Dialogo.tsx`](../src/components/ui/Dialogo.tsx)

**Versão 11/08/2026.** Substituiu o `window.confirm` em todos os pontos, a pedido da gestão. A
referência visual pedida foi o alerta do macOS.

#### Por que a caixa do navegador saiu

| Problema | Consequência |
|----------|--------------|
| Aparece colada ao **topo da janela** | A 600px de onde o olho está — fora do campo de atenção de quem clicou numa linha |
| Botões **"OK" e "Cancelar"** | O rótulo não diz o que vai acontecer |
| Tipografia e moldura **do navegador** | Anuncia o endereço do site em cima da pergunta |
| **Trava a aba inteira** | Nenhuma animação corre, nenhum estado atualiza |
| **Não existe no `jsdom`** | Devolvia `undefined`, e **toda exclusão passava sem confirmação nos testes** — a pergunta que protegia o dado era invisível para a suíte que deveria protegê-la |

O último item é o que transforma isto de gosto em correção: a suíte media um caminho que nenhuma
pessoa percorre.

#### Anatomia

Véu `bg-slate-900/25` com `backdrop-blur-[2px]` · cartão `rounded-2xl` centrado, `max-w-sm`,
`shadow-2xl` · ícone opcional em círculo, na cor do tom · título `font-display` · descrição em
`slate-500`, uma frase por linha · botões de largura igual, **confirmação à direita**.

| Regra | Motivo |
|-------|--------|
| O botão **nomeia a ação** — "Excluir", "Duplicar", "Desativar" | "OK" não diz o que se está aprovando (§7) |
| A descrição diz **consequência**, nunca instrução de teclado | "Dá para desfazer com Ctrl+Z" chegou a entrar e saiu no mesmo dia: quem está prestes a excluir precisa decidir se quer excluir, e a dica de atalho disputa a atenção com a única pergunta da tela — some junto com o diálogo, antes da hora em que serviria. O atalho se apresenta **depois**, no aviso do desfazer (§8.2) |
| Sem consequência a declarar, **não há descrição** | Título e dois botões bastam. Texto de enfeite ensina a clicar sem ler |
| Ação destrutiva em `rose-500`; as demais em `indigo-600` | A cor de destruição já é a da lixeira (§1.1) |
| **Foco começa em Cancelar** quando é destrutivo | O Enter reflexo de quem confirma tudo não pode apagar uma linha. Nos demais, o foco vai para a confirmação |
| `Esc` e **clique no véu** cancelam | Sair é sempre não fazer nada |
| `Tab` circula **dentro** do diálogo | Sem isto o foco cai na grade atrás do véu, e a pessoa editaria o que a tela mostra como suspenso |
| Três ou mais ações **empilham em coluna** | Lado a lado, nenhum rótulo cabe |
| Um diálogo por vez — o anterior resolve como cancelado | Empilhados, a pergunta de baixo fica escondida e quem a abriu espera para sempre |

#### A API é imperativa

`await confirmar(...)`, não `<Modal aberto={...}>`. Os 12 pontos viviam como uma linha só
(`if (!window.confirm(…)) return;`) dentro de funções que já faziam outra coisa; a forma declarativa
obrigaria cada um a criar estado, guardar o alvo pendente e partir a função em duas — doze vezes.

| Função | Para |
|--------|------|
| `confirmar({ titulo, descricao, rotuloConfirmar, destrutivo })` | Sim ou não |
| `pedirTexto({ titulo, valorInicial, tipo })` | Uma resposta escrita — o antigo `prompt` |
| `perguntar({ acoes: [...] })` | **Três ou mais saídas** |
| `avisar({ titulo, descricao })` | Um botão só — o antigo `alert` |

> **`perguntar` nasceu de um defeito real.** A saída de alguém que fica sem equipe era um
> `window.confirm` cujo texto pedia para ler "OK" como *Desligado* e "Cancelar" como *Inativo* —
> uma escolha de três vias espremida em dois botões, onde o gesto universal de desistir produzia
> **uma alteração de cadastro**. Hoje cada saída tem seu botão, inclusive a de não fazer nada
> ([04 §7](04_pagina_equipes.md)).

#### Onde está montado

`DialogoProvider` envolve o `App` **por fora do `DadosProvider`**: não depende de dado nenhum, e
quem entra por convite ou por link também merece uma pergunta decente.

> ⚠️ **Teste que monta uma página precisa do `DialogoProvider`.** Sem ele, `useDialogo` lança — de
> propósito: um componente que pergunta sem ter onde perguntar é defeito, não caso a tratar.

---

### 8.2. O desfazer — [`utils/historico.ts`](../src/utils/historico.ts)

**Versão 11/08/2026.** `Ctrl+Z` desfaz; `Ctrl+Shift+Z` e `Ctrl+Y` refazem.

#### O problema

A edição é estilo planilha: clicar já é editar, sair do campo já é salvar. **Não havia momento para
hesitar.** Quem sobrescrevia o valor certo tinha de lembrar o anterior e digitá-lo de novo — e em
coluna de escolha fechada (status, prioridade, responsável) nem isso, porque o valor antigo não
aparece em lugar nenhum depois da troca.

#### O que alcança

| Alcança | Não alcança |
|---------|-------------|
| Oportunidades, contratos, talentos e marcas — o dado dos quadros | **Usuários, equipes, concessões, convites** |
| Editar, criar, duplicar, excluir, mudar status, nomear responsável | Configuração de acesso e situação de conta |

> **Por que permissão fica de fora.** Um `Ctrl+Z` distraído que devolva acesso a quem acabou de ser
> desligado é um furo de segurança com cara de conveniência. Mudança de permissão é ato deliberado,
> tem tela própria, e o caminho de voltar atrás é refazer o gesto — conscientemente.

#### As três regras que o sustentam

1. **Observa o resultado, não a intenção.** Nenhuma das ~50 mutações do provider é instrumentada; o
   histórico compara as coleções antes e depois e **deriva** a descrição. Instrumentar envelhece: a
   mutação nº 51 nasceria fora do desfazer, e o defeito só apareceria quando alguém perdesse
   trabalho.
2. **Dentro de um campo em edição, o `Ctrl+Z` é do texto.** É a guarda `ehCampoDeTexto`. Roubar a
   tecla ali trocaria "apagar a última palavra" por "reverter a linha inteira" — o oposto do pedido,
   no momento de menor expectativa de surpresa.
3. **Registro no `useLayoutEffect`, não no `useEffect`.** O efeito passivo abre uma janela entre o
   commit da mudança e o registro do passo, em que o dado já mudou e o histórico ainda não sabe. No
   navegador são milissegundos; num teste que dispara a tecla logo após o clique, é sempre.

| Decisão | Motivo |
|---------|--------|
| 20 passos de teto | Quem erra percebe em um ou dois gestos. Cada entrada segura as quatro listas do momento em que nasceu |
| **Não sobrevive ao F5** | Desfazer amanhã algo de ontem, que ninguém lembra ter feito — e, com backend, o que outra pessoa fez no meio-tempo |
| Encerramento automático **fora** do histórico | Arquivamento é regra do processo, não gesto de alguém: um `Ctrl+Z` na abertura desarquivaria projetos sem que ninguém tivesse feito nada |
| Bloqueado em **"Ver como"** | Se a escrita está bloqueada, desfazer também está — senão vira a porta dos fundos para alterar dado no lugar de outra pessoa |
| Um caminho novo **apaga o futuro** | Refazer o que foi abandonado montaria um estado que ninguém pediu |

#### O aviso — [`components/ui/AvisoHistorico.tsx`](../src/components/ui/AvisoHistorico.tsx)

Pílula escura no rodapé central, 3,2s, com botão **Refazer**.

Existe porque **desfazer é invisível quando dá certo**: a linha volta ao que era, e quem apertou a
tecla não sabe se o sistema entendeu, se desfez a coisa certa, ou se desfez duas. Pior no caso
comum — o valor anterior de uma célula costuma ser vazio, e a tela depois do desfazer fica idêntica
à de quem não fez nada. O aviso responde as três perguntas de uma vez, e é também **como o atalho de
refazer se apresenta**: ninguém descobre `Ctrl+Shift+Z` sozinho.

Fica no rodapé, e não junto da linha, porque a alteração pode ter saído da vista — desfazer o valor
de um filtro devolve a linha a um grupo fora da tela.

#### Comportamento conhecido

Depois de **duplicar**, o painel de talento abre com o cursor na busca. Enquanto ele estiver aberto,
o `Ctrl+Z` pertence ao campo (regra 2) e não desfaz a duplicação: é preciso fechar o painel antes.
Previsível, e o preço de a regra 2 não ter exceções.

---

## 10. Catálogo de componentes — [`src/components/ui/`](../src/components/ui/)

Os blocos que qualquer quadro reutiliza. **Antes de escrever um componente novo, verifique se um
destes já resolve** — a divergência visual entre telas quase sempre começa com uma reimplementação.

| Componente | Papel | A decisão dentro dele |
|------------|-------|-----------------------|
| [`Floating`](../src/components/ui/Floating.tsx) | Painel flutuante em portal | Sai para o `body` porque `overflow` recorta filho posicionado (§4) |
| [`Tabs`](../src/components/ui/Tabs.tsx) | Abas com indicador deslizante | `useId()` no `layoutId` — um id global fazia o traço atravessar a tela (§7.3). Usado só em Usuários e no detalhe da equipe: os quadros desenham a própria faixa (§7.3) |
| [`EditableCell`](../src/components/ui/EditableCell.tsx) | Célula estilo planilha | Clique edita · Enter/Tab/blur confirmam · Esc descarta · **sem botão de salvar** |
| [`CelulaReferencia`](../src/components/ui/CelulaReferencia.tsx) | Célula com sugestões e alerta de semelhança | Sugere ao digitar e confirma quando é parecido — nunca bloqueia ([07 §10](07_visoes_e_relacoes.md)) |
| [`SelecaoComCadastro`](../src/components/ui/SelecaoComCadastro.tsx) | Escolha de lista cadastrada, **com criar** | O que não está na lista entra como solicitação pendente ([08 §6.0.1](08_backlog_e_integracoes.md)) |
| [`CelulaOculta`](../src/components/ui/CelulaOculta.tsx) | Borrão de coluna sem acesso | **O valor real nunca chega ao componente** ([07 §3](07_visoes_e_relacoes.md)) |
| [`BuscaQuadro`](../src/components/ui/BuscaQuadro.tsx) | Campo de busca da barra de ações | Esc limpa · cresce ao focar · mostra "N de M" |
| [`Switch`](../src/components/ui/Switch.tsx) | Interruptor de duas posições | Estado pela **forma**, não só pela cor (§7.2) |
| [`Dica`](../src/components/ui/Dica.tsx) | **Tooltip do sistema — um só para o app** | Delegação de evento + portal único; só abre quando o texto não coube (§7.9) |
| [`Dialogo`](../src/components/ui/Dialogo.tsx) | **Diálogo do sistema — um só para o app** | API imperativa (`await confirmar`), porque a forma declarativa partiria em duas cada uma das 12 funções que perguntam (§8.1) |
| [`AvisoHistorico`](../src/components/ui/AvisoHistorico.tsx) | Aviso do desfazer | Desfazer é invisível quando dá certo — o aviso é a única prova de que a tecla funcionou (§8.2) |
| [`EtiquetaSelect`](../src/components/backlog/EtiquetaSelect.tsx) | Etiqueta colorida de lista fechada | Para **escalas**, onde a cor é a informação — cada catálogo traz a sua ([08 §6](08_backlog_e_integracoes.md)) |
| [`CelulaNumero`](../src/components/ui/CelulaNumero.tsx) | Quantidade inteira | Recusa não-dígito **na digitação**; vazio ≠ zero; alinhada à direita |
| [`CelulaData`](../src/components/ui/CelulaData.tsx) | Data | `input type=date` nativo; mostra pt-BR, guarda ISO |
| [`CelulaLink`](../src/components/ui/CelulaLink.tsx) | Endereço externo | Mostra "Abrir", não a URL; `noopener noreferrer`; a dica traz o endereço inteiro |

### Por que cada um existe

**`Floating`** — a tabela vive num `overflow-x-auto`, e o CSS promove o eixo Y a `auto` junto.
Qualquer popover `absolute` seria cortado na borda do card. O painel sai para o `body` com posição
fixa recalculada em scroll e resize. **Todo seletor do produto passa por aqui.**

**`EditableCell`** — o padrão de edição do sistema inteiro é planilha: não há formulário modal nem
botão de salvar por célula. Quem vem do Monday.com espera clicar e digitar.

**`CelulaOculta`** — o desfoque é **layout, não segurança**. Um `blur` sobre o dado verdadeiro
deixa o texto no DOM, a um F12 de distância, e ainda dá a impressão de estar protegido. O
componente recebe só um marcador; quem monta a tabela não passa o valor.

O borrão preserva a largura da coluna e sinaliza que **ali existe um dado** — esconder sem sinal
faria a pessoa achar que o campo está vazio e tentar preencher.

**`Switch`** — substituiu o chip que mudava de cor. Com um chip, "ligado" e "desligado" são a
mesma forma em duas cores: quem não decorou a convenção precisa comparar com os vizinhos para
saber o estado.

### Componentes de escolha, por quadro

Não estão em `ui/` porque cada um carrega o vocabulário do seu domínio, mas seguem a mesma anatomia
— etiqueta clicável + painel em `Floating`:

| Componente | Quadro | Particularidade |
|------------|--------|-----------------|
| [`StatusOportunidadeSelect`](../src/components/backlog/StatusOportunidadeSelect.tsx) | Backlog | Só destinos válidos; o resto em cinza. Declinar abre pelos motivos que a etapa permite (`motivosPermitidosDoDeclinio` — da Revisão, só "Decl. Talento"); carrega as pendências, o badge de canto, o aviso e a trava da Elaboração (§3.6, [08 §7.5](08_backlog_e_integracoes.md)) |
| [`PrioridadeSelect`](../src/components/backlog/PrioridadeSelect.tsx) | Backlog | Alta · Média · Baixa |
| [`OpcaoSelect`](../src/components/backlog/OpcaoSelect.tsx) | Backlog | Genérico para lista fechada — etiqueta **neutra**, sem cor própria |
| [`StatusSelect`](../src/components/talentos/StatusSelect.tsx) | Contratos | Abre os 13 status da esteira |
| [`TipoSelect`](../src/components/talentos-exclusivos/TipoSelect.tsx) | Talentos | Exclusivo × Interveniência |
| [`ResponsavelCell`](../src/components/talentos/ResponsavelCell.tsx) | Contratos | Responsáveis (coroa) e parceiros, vários de cada |
| [`AreaResponsavelCell`](../src/components/talentos-exclusivos/AreaResponsavelCell.tsx) | Talentos · Backlog | Candidatos vêm da equipe daquela área |

> **`OpcaoSelect` é neutro de propósito.** Input, Origem e Tipo do Projeto são **classificações**,
> não estados. Colorir todas competiria com status e prioridade, que precisam saltar aos olhos —
> numa tela onde tudo grita, nada é ouvido.

> **`SimNaoSelect` saiu da lista e do código em 04/08/2026.** Ficou órfão quando Interveniência
> virou derivada e somente leitura, foi mantido esperando a próxima coluna booleana — e nenhuma
> apareceu. Componente sem uso é onde o próximo defeito se esconde.

---

## 9. Código

| Regra | Motivo |
|-------|--------|
| Regras de negócio em `utils/` como funções puras | Testáveis sem montar componente |
| Nenhuma regra duplicada entre página e componente | Divergem com o tempo |
| Datas `yyyy-mm-dd` com construtor local, nunca `new Date(string)` | `new Date('2026-08-01')` é UTC e desloca o dia |
| Ids por contador em `useRef`, nunca por `lista.length` | Exclusões causariam ids repetidos |
| Estado de domínio no contexto; estado de apresentação no componente | Fonte única para dados compartilhados |
| Comentários explicam **por quê**, não o quê | O código já diz o quê |
| Classe do Tailwind sempre literal, nunca interpolada | O JIT varre texto — `bg-${cor}-500` não existe no CSS final ([09 §7](09_fundacoes_tecnicas.md)) |
| Reducers e updaters são puros | StrictMode os executa duas vezes ([09 §5](09_fundacoes_tecnicas.md)) |
| `min-h-0` em toda a cadeia flex de um quadro | Sem ele o `overflow` nunca aplica (§7.4) |
| Função que depende de "hoje" recebe `referencia = new Date()` | Sem isso não há como testar sem mexer no relógio ([09 §1](09_fundacoes_tecnicas.md)) |
