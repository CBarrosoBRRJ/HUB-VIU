# PRD 07 — Camadas de Acesso e Relações entre Tabelas
**Versão:** 3.7 | **Status:** Implementado no front-end | **Data:** 12/08/2026

[← Índice da documentação](README.md) · *Permissão por aba e coluna; relações entre quadros*


> Dois mecanismos transversais, que valem para **todo quadro novo**:
>
> 1. **Camadas de acesso** — quadro → aba → coluna
> 2. **Relações** — como as tabelas conversam e como se evita dado duplicado
>
> Regras em [`visoes.ts`](../src/utils/visoes.ts), [`colunas.ts`](../src/utils/colunas.ts),
> [`busca.ts`](../src/utils/busca.ts) e [`referencias.ts`](../src/utils/referencias.ts).

> ### Mudanças da v3.6 (04/08/2026)
>
> | O que | Motivo |
> |-------|--------|
> | **Busca do Backlog cobre a grade contínua** (§5.1) | A grade virou uma tabela só; "aba aberta" deixou de existir como recorte |
> | **Exportação `.xlsx` só do visível** (§5) | O mesmo princípio da busca: o que a permissão esconde não sai por outro canal |
> | Visão `backlog:pagamento` **extinta** (03/08/2026) | A aba Pagamento foi fundida no Financeiro; a equipe Pagamentos passou a liberar `backlog:financeiro` |
> | Limitações registradas em §15 | Grade e busca de Contratos fora do catálogo; quadro de clientes sem visão declarada |
>
> ### Mudanças da v3.0
>
> | O que | Motivo |
> |-------|--------|
> | **Contratos declarado como visão** | O quadro existia mas não aparecia na tela de Configuração — não havia como ocultar coluna nenhuma dele |
> | **Criação automática de ficha** | Nome sem cadastro era um beco: ficava solto e a ficha só surgia se alguém lembrasse |
> | Responsáveis por área viram **lista** | Dupla de produção e substituto são situações correntes |
>
> ### Mudanças da v2.0
>
> | O que | Motivo |
> |-------|--------|
> | **Terceira camada: coluna** | "Tem acesso à aba, mas não a todas as colunas" |
> | Coluna oculta vira **borrão**, não some | Preserva o layout da tabela |
> | Catálogo único de colunas (`colunas.ts`) | Id de permissão e coluna visual não podem divergir |
> | Busca passa de visão para **coluna** | Agrupar por aba deixava coluna oculta pesquisável |
> | **Referência entre tabelas** | "Gil do Vigor" e "Gilberto do Vigor" não podem coexistir |
> | Configuração de acesso em **aba própria** | Decisão de quem administra, não do dia a dia |

---

# Parte 1 — As três camadas de acesso

## 1. O modelo

```
QUADRO   nivelDeAcesso()   →  total | nomeado | nenhum   QUAIS LINHAS
  └ ABA    podeVerVisao()  →  sim | não                  QUAIS GRUPOS DE COLUNA
      └ COLUNA colunaOculta() → visível | borrada        QUAIS CAMPOS
```

Três perguntas diferentes, avaliadas em ordem. Cada uma resolve o que a anterior não alcança:

| Camada | Pergunta | Onde configura |
|--------|----------|----------------|
| **Quadro** | Esta pessoa trabalha com isto? | Equipes › Configuração › Quadros |
| **Aba** | Quais dados deste registro ela precisa? | Equipes › Configuração › Abas sensíveis |
| **Coluna** | Dentro da aba, o que fica de fora? | Equipes › Configuração › Colunas ocultas |

## 1.9. Toda aba tem interruptor — 12/08/2026

Pedido da operação, junto com o defeito de acesso: *"poderíamos ter o flag da aba inteira, e não
somente a coluna, para facilitar e agilizar"*.

Faltava mesmo, e a falta era estrutural: **aba aberta não tinha como ser fechada.** Dava para
desligar coluna por coluna — e a aba **continuava na barra, vazia**, porque a camada de visões só
sabia responder por abas sensíveis.

Agora as duas direções existem, com padrões opostos e listas próprias:

| Aba | Padrão | Lista | Gesto |
|-----|--------|-------|-------|
| sensível (`restrita`) | fechada | `visoesLiberadas` | **liberar** |
| aberta | visível | `visoesOcultas` | **ocultar** |

> **Duas listas para a mesma pergunta parece duplicação, e não é:** elas guardam exceções a
> *padrões opostos*. Uma lista só obrigaria a eleger um padrão para os dois casos, e nenhum dos
> dois serve para o outro — aba sensível precisa nascer fechada, aba aberta precisa nascer visível.

Na tela de Equipes, os dois viram **o mesmo interruptor**, e o tom separa o significado sem
precisar de legenda: âmbar libera dado sensível, índigo oculta aba aberta. Quem configura não
precisa saber de qual lista veio a resposta.

Nada de persistência quebrou: `visoesOcultas` é opcional e lida com `?? []`, então equipe gravada
por versão anterior continua carregando — **não houve virada de versão**, porque não houve
incompatibilidade de forma ([09 §3](09_fundacoes_tecnicas.md)).

### Coluna oculta agora some, em vez de borrar

*"Não quero mais borrar, pode ser ocultar apenas, mais fácil."* — e é mais fácil de um jeito que
melhora além da tela.

A coluna é filtrada **na origem**, onde a grade monta as seções. Com isso ela some de tudo o que
deriva dali de uma vez: cabeçalho, `<colgroup>`, largura congelada, exportação, busca e âncoras de
rolagem. Antes, cada um desses precisava lembrar de perguntar `oculta()` — **e a exportação já
tinha esquecido uma vez**. Seção que perde todas as colunas some junto: aba sem coluna não é aba.

O `CelulaOculta` continua no caminho como cinto, não como regra: as âncoras congeladas não passam
pelo filtro de seções, e se um id fixo aparecer numa lista de ocultas gravada por versão anterior,
é melhor esconder o dado do que exibi-lo.

## 2. Duas políticas opostas, de propósito

| Camada | Política | Por quê |
|--------|----------|---------|
| **Aba** | Fechada por declaração — `restrita` exige liberação | São poucas e sensíveis: dado pessoal, financeiro. Cabe decidir uma a uma |
| **Coluna** | **Aberta, bloqueio por exceção** — `colunasOcultas` | São dezenas. Liberar uma a uma daria uma lista que ninguém manteria, e a permissão viraria decoração |

Em ambas vale a **união**: basta uma equipe da pessoa liberar a aba (ou não ocultar a coluna) para
ela aparecer. É a mesma regra do resto do modelo — acesso é o que as equipes somam.

## 3. Coluna oculta: borrão, não sumiço

A célula vira `••••••` desfocado, com um ícone de olho cortado. A coluna **mantém a largura** e a
linha não se desmonta.

> ### O valor real nunca chega ao DOM
>
> Aplicar `blur` sobre o dado verdadeiro deixaria o texto no HTML, a um F12 de distância — e, pior,
> passaria a impressão de estar protegido. O componente `CelulaOculta` **não recebe o valor**: quem
> monta a tabela nem o passa.
>
> O borrão é decisão de **layout**, não de segurança. Ele existe para dois efeitos:
>
> 1. A tabela não se desmonta — colunas somem e o cabeçalho deixa de bater com os dados
> 2. Fica explícito que ali **há** um dado. Esconder sem sinal faria a pessoa achar que o campo
>    está vazio e tentar preencher

**Coluna oculta não é ordenável.** Ordenar por um dado que não se vê revelaria a ordem dele — o
mesmo raciocínio da busca (§5).

## 4. Colunas que nunca se ocultam

`ColunaCatalogo.fixa` marca as intocáveis:

| Coluna | Por quê |
|--------|---------|
| Talento (nos dois quadros) | É a chave da linha; sem ela sobram linhas anônimas |
| Ações | Sem ela não há como excluir |
| Vigência (Contratos) | O farol é a razão de ser do quadro |
| Áreas, Redes, Contratos (contadores) | Derivados; ocultá-los não protege nada, já que a aba mostra o detalhe |

## 5. A busca respeita as duas camadas

Quem não enxerga a coluna Telefone também não busca por telefone — mesmo tendo a aba Contato.

Uma busca que varre campo oculto vira um oráculo: digita-se um número e a lista responde de quem
é. O dado não aparece na tela e mesmo assim vazou.

Por isso `camposPorColuna()` indexa por **coluna**, não por aba: agrupar por aba deixaria uma
coluna oculta pesquisável através da aba a que pertence.

**Exceção deliberada:** o **nome** é sempre pesquisável, mesmo sem coluna alguma liberada. É a
chave da linha, nunca se oculta, e sem ele a tela fica inutilizável para quem legitimamente
enxerga o quadro.

```ts
// Elisa, da Produção — vê a aba Contato? não. Vê a coluna Telefone? não.
buscar('Marina')       // → 1 resultado   (o nome é sempre buscável)
buscar('98800-1122')   // → 0 resultados  ← o telefone existe, mas não para ela
buscar('marinaduarte') // → 1 resultado   (rede é aba aberta)
```

> **Exceção registrada (04/08/2026):** a regra vale para **Talentos e Backlog**, não para
> **Contratos** — `filtrarContratos` (`busca.ts:35-58`) varre os campos fixos sem consultar
> `colunasOcultas`. Limitação em §15.

**A exportação segue o mesmo princípio.** Desde 04/08/2026 a grade do Backlog exporta **`.xlsx`
real** (`exportacao.ts`, SheetJS por `import()` dinâmico) — e recebe as colunas **visíveis** e as
linhas **filtradas**, com a permissão já aplicada. Exportar mais que isso seria o mesmo vazamento
da busca por outro canal: a planilha viraria o caminho para ler coluna oculta e aba não liberada.

### 5.1. No Backlog, a busca cobre a grade contínua

Desde 04/08/2026 a busca varre **todas as colunas visíveis de todas as seções liberadas**
(`BacklogAgenciados.tsx:137-168`) — mais o **Projeto**, âncora que identifica a linha e nunca se
oculta.

O caminho até aqui teve ida e volta, e vale registrar o porquê:

- **Manhã de 03/08/2026** — a busca varria todas as abas liberadas. Numa tela com abas, era
  imprevisível: na aba Escopo, um termo trazia uma linha por um valor do Financeiro que não estava
  na tela, e a pessoa via um resultado que a tela não explicava.
- **Tarde de 03/08/2026** — passou a recortar pela **aba aberta**, com âncoras (Projeto, Marca,
  Talento) para não quebrar o gesto mais comum. Efeito colateral: procurar por uma pessoa exigia a
  aba Time aberta.
- **04/08/2026** — a **grade contínua** desfez a premissa das abas: não há mais "outra aba", há a
  mesma tabela um scroll adiante, e o valor que casou está lá. A busca voltou a cobrir tudo que
  está na grade — e o efeito colateral da aba Time **caiu**: basta a seção Time estar liberada
  para responsáveis **e apoios** entrarem na busca.

> **A checagem é por campo, não por id de coluna.** Sete colunas são espelhadas entre seções — se
> fosse pelo id da seção de origem, procurar por status na seção Cliente falharia com a coluna
> Status ali na tela. É a mesma ideia de "espelhar é a mesma coluna, não uma cópia".
>
> **A regra de permissão não mudou**: coluna oculta não entra, seção restrita que a pessoa não vê
> não entra. A âncora não é exceção — Projeto nunca se oculta, é a chave da linha.

## 6. O catálogo de colunas

`colunas.ts` é a **fonte única** de que colunas existem. O componente lê de lá e cuida só de
**como** desenhar cada célula.

> **Por que não deixar no `.tsx`:** a permissão precisa de um id estável. Se a lista vivesse no
> componente e o id fosse escrito à mão em outro lugar, os dois divergiriam na primeira coluna
> nova — e uma coluna sem id no catálogo seria uma coluna que ninguém consegue ocultar.

> **Exceção registrada (04/08/2026):** a grade de **Contratos** é exatamente esse caso —
> `ContratosTable.tsx` mantém uma lista `COLUMNS` própria, sem os ids de permissão do catálogo.
> Consequência: **ocultar coluna de Contratos na Configuração não tem efeito** na tela; a
> configuração registra, a célula não borra. Limitação em §15 — corrigir é ligar a grade ao
> catálogo, como Talentos e Backlog.

Nota do catálogo: coluna de **pessoas** declara `area`, e é dela que a célula tira equipe e
candidatos. A exceção é **Orçamento**, que vive no Escopo sem `area` e tem célula própria com
responsável e apoio (`BacklogTable.tsx`) — saber quem vai orçar é parte de aceitar a demanda.

### 6.1. A invariante das larguras

As colunas de uma aba de Talentos somam **78%** (os 22% restantes são da coluna Talento, fixa em
toda aba). As de Contratos somam **100%**, porque ali não há aba.

> **Bug que isto corrige:** as abas somavam 80, 82 e 72. Com `table-fixed`, somas diferentes fazem
> as colunas dançarem ao trocar de aba. `testeColunas.mjs` trava os dois números — qualquer coluna
> nova que desequilibre a soma quebra a suíte.

## 7. Onde se administra — a aba Configuração

A tela da equipe tem duas abas:

| Aba | Conteúdo | Quem vê |
|-----|----------|---------|
| **Pessoas** | Link de entrada e tabela de membros | Todos que veem a equipe |
| **Configuração** | Quadros, abas sensíveis, colunas, área de talentos | Só quem pode conceder quadros |

O cartão da equipe mostra um **resumo em leitura** — quantos quadros, quantas abas sensíveis, qual
área atende, quantas colunas ocultas — para quem não configura.

> **Por que aba separada:** é decisão de quem administra a plataforma, não do dia a dia da equipe.
> Misturada com a lista de pessoas, empurrava a tabela de gente para baixo da dobra — e a tela de
> equipe existe, antes de tudo, para ver gente.

### 7.1. Uma aba por quadro

A tela tem duas partes:

```
┌ Quadros que a equipe enxerga ────────────────────────────────┐
│  [◉] Backlog  [◉] Contratos  [◉] Talentos  [○] Clientes      │  ← 4 interruptores
└──────────────────────────────────────────────────────────────┘
┌ [Contratos de Agenciados] [Talentos ③] ──────────────┐  ← aba por quadro liberado
│  ◉ Identificação                                     │
│      ◉ Tipo   ◉ Nome artístico   ○ Empresa           │  ← interruptor por coluna
│  ○ Contato  🔒 Dados pessoais                        │
│      (colunas esmaecidas — aba não liberada)         │
└──────────────────────────────────────────────────────┘
```

São **quatro** interruptores de quadro — Backlog, Contratos, Talentos e **Cadastro de Clientes**.
O de clientes só liga e desliga a página: o quadro **não tem visão declarada em `VISOES`** nem
colunas no catálogo, então não há o que configurar por aba ou coluna nele — a página ainda é um
placeholder ([§11.2](#112-marca-virou-entidade)). Registrado como limitação em §15, para a visão
ser declarada quando as colunas existirem.

Antes, "abas sensíveis" e "colunas ocultas" eram **dois blocos separados**, cada um listando todos
os quadros por dentro. Para configurar um quadro era preciso caçá-lo em dois lugares. Agora a
navegação segue a pergunta de quem configura: *"o que a equipe vê **neste quadro**?"*.

A aba de cada quadro traz um contador das restrições ativas — abas fechadas mais colunas ocultas —
para que dê para ver onde há configuração sem abrir uma por uma.

### 7.2. Interruptor, não chip colorido

Todo controle liga/desliga virou `Switch`.

> **Por quê.** Com um chip, "ligado" e "desligado" são **a mesma forma em duas cores** — quem não
> decora a convenção precisa comparar com os vizinhos para saber o estado. O interruptor diz a
> posição pela forma, e a cor vira reforço, não a única pista.

O tom âmbar fica reservado às abas sensíveis: sinaliza privilégio, não navegação.

Blocos que não têm efeito continuam avisando: aba liberada num quadro que a equipe não enxerga,
colunas de uma aba não liberada aparecem esmaecidas e sem clique.

## 8. Como adicionar um quadro ou coluna nova

1. Declarar as visões em `VISOES` (`quadro:aba`), com `restrita` + `motivo` se expõe dado sensível
2. Declarar as colunas em `colunas.ts` (`quadro:aba:campo`), respeitando a soma de larguras
3. Marcar `fixa: true` nas colunas-chave
4. Se houver campos pesquisáveis, acrescentá-los a `camposPorColuna()` — **sob a coluna certa**
5. Um ícone de aba em `ICONES`

O passo 4 é o que se esquece. Campo fora do mapa não é buscável; campo na coluna errada vaza.

---

# Parte 2 — Relações entre tabelas

## 9. O grafo

```
Usuário ──membro de──► Equipe ──libera──► Quadro
                          │                  └─ Aba ─ Coluna
                          └──atende──► Área de Talento ──responsável──► Usuário

Talento ◄──talentoId── Contrato
   │                       ▲
   └── resumo de vigência ─┘
```

| Vínculo | Chave | Quando quebra |
|---------|-------|---------------|
| Contrato → Talento | `talentoId`, fallback por nome | Nome digitado sem ficha |
| Talento → Contratos | Derivado (`contratosDoTalento`) | Nunca |
| Área → Equipe | `Equipe.areaTalento` | Equipe excluída: área sem candidatos |
| Área → Pessoa | `Talento.responsaveis[area]` | Pessoa sai da equipe: continua nomeada |

## 10. Referência de coluna — o fim do dado duplicado

O problema, nas palavras da operação: *"evitaria ele criar dados duplicados, como Gil do Vigor e
Gilberto do Vigor, como São Paulo e Sao Paulo"*.

Depois de criados, ninguém percebe: a lista mostra os dois e cada um parece legítimo. A correção
acontece **na digitação**, em duas camadas.

### 10.1. Sugestão

A célula oferece o que já existe enquanto se digita. Escolher é mais rápido que escrever, e a
maior parte das divergências morre aqui por conveniência.

`valoresUsados()` agrupa por forma normalizada e devolve a **grafia mais frequente**. Se "São
Paulo" aparece 8 vezes e "Sao Paulo" 1, a sugestão é a com acento — a lista converge para o certo
em vez de perpetuar o erro.

Quem começa com o termo vem antes de quem apenas o contém: digitar `mar` traz "Marina" na frente
de "Ricardo Martins".

### 10.2. Alerta de parecido

Texto novo que está *perto* de algo existente abre um painel âmbar: *"Já existe um talento
parecido. Você quis dizer um destes?"*, com as opções e uma saída explícita: **"Não — usar X"**.

> **Nunca bloqueia.** Homônimos existem, e travar o cadastro por semelhança deixaria a operação
> sem saída. O alerta informa e devolve a decisão a quem digita.

Escolher da lista não passa pela checagem — foi decisão explícita.

### 10.3. A métrica, e por que não é só Levenshtein

`similaridade()` combina duas leituras e fica com a maior:

| Leitura | Pega | Exemplo |
|---------|------|---------|
| **Caractere a caractere** (Levenshtein normalizado) | Acento, erro de digitação | "Sao Paulo" × "São Paulo" = 1,00 |
| **Token a token** | Abreviação, nome que cresceu | "Gil do Vigor" × "Gilberto do Vigor": 0,71 → **0,95** |

No casamento por token, dois tokens valem 1 se iguais, **0,9 se um é prefixo do outro**, e a
distância de edição no resto. Palavras de até 2 letras ("de", "do", "da") são ignoradas: aparecem
em quase todo nome composto e inflavam a semelhança de coisas sem relação.

> **Por que a leitura por caractere não bastava.** Na primeira calibração, "Gil do Vigor" ×
> "Gilberto do Vigor" — que **deve** alertar — deu **0,71**, contra **0,63** de "Gestão de
> Contratos" × "Gestão de Produção", que **não** deve. Oito centésimos de margem: qualquer nome
> novo cairia no meio. Com o casamento por token a folga passou a **0,23**.

### 10.4. O limiar

`LIMIAR_SEMELHANCA = 0,74`, entre dois grupos calibrados sobre os casos reais:

| Devem alertar | ≥ 0,90 | Gil/Gilberto do Vigor · Sao/São Paulo · Marina/Mariana · Rafael/Rafa · Helena Prado (+Silva) |
| Não devem | ≤ 0,67 | Marina Duarte × Marina Silva · Gestão de Contratos × Gestão de Produção · Coca-Cola × Pepsi |

`testeReferencias.mjs` **trava esses dois grupos e a folga entre eles**. Sem isso, o limiar seria
um número mágico que ninguém sabe se ainda vale depois de mexer na métrica.

### 10.5. Colunas que são referência hoje

| Quadro | Coluna | Referencia | Nome novo cria cadastro? |
|--------|--------|------------|--------------------------|
| Contratos | **Talento** | Cadastro de Talentos **+** nomes já digitados em outros contratos | ✅ `garantirTalento` |
| Backlog | **Talento** | Cadastro de Talentos | ✅ `garantirTalento` |
| Backlog | **Marca** | Cadastro de Marcas | ✅ `garantirMarca` |
| Talentos | **Empresa** | Empresas já usadas | ❌ só sugere |
| Talentos | **Local** | Locais já usados | ❌ só sugere |
| Talentos | **Razão social** | Razões sociais já usadas | ❌ só sugere |

A coluna Talento junta as duas fontes de propósito: quem ainda não tem ficha precisa aparecer,
senão a segunda linha do mesmo talento continuaria livre para divergir.

As três que **criam cadastro** referenciam entidades (§11.1, §11.2): o nome novo vira ficha ou
marca **pendente**, nunca texto solto. As três que só sugerem referenciam valores repetidos, sem
registro por trás.

### 10.6. Auditoria do que já divergiu

`divergencias()` varre uma coluna e reporta os grupos com mais de uma grafia — "onde já existe São
Paulo e Sao Paulo convivendo". Ainda **não tem tela**: é a próxima peça natural, para limpar o que
entrou antes da referência existir.

## 10.4. Dado derivado — o duplicado que a referência não resolve

A referência de coluna resolve **o mesmo dado escrito de dois jeitos**. Sobrou um caso pior: o
mesmo dado guardado em dois lugares.

Enquanto o segmento da Coca-Cola estava na oportunidade *e* no cadastro da marca, nada garantia que
batessem. Ninguém via a divergência — cada tela mostrava a sua cópia, e as duas pareciam certas.

**A regra que saiu disso:** dado que descreve uma entidade mora na entidade. A linha o **lê**.

| Dado | Mora em | Aparece em | Editável na linha |
|------|---------|-----------|:---:|
| Exclusivo | `Talento.tipo` | Backlog · **Demanda** | ❌ |
| Origem do Talento | `Talento.origem` | Backlog · **Demanda** | ✅ grava na ficha |
| Segmento | `Marca.segmento` | Backlog · Cliente | ✅ grava no cadastro |
| Categoria | `Marca.categoria` | Backlog · Cliente | ✅ grava no cadastro |
| Contatos | `Marca.contatos` | Backlog · Cliente (a escolha é da linha) | ✅ acrescenta ao cadastro |
| Razão Social · CPF/CNPJ | `Talento.razaoSocial` · `Talento.cnpj` | Backlog · Jurídico | ❌ |

> **Exclusivo e Origem do Talento vivem na Demanda** desde 04/08/2026 — são parte da triagem, e a
> Demanda abre com eles. As abas **Talento** e **Entrega**, citadas em versões anteriores desta
> tabela, **não existem mais**: saíram em 03/08/2026, quando as colunas foram realocadas e o Time
> passou a fechar o quadro ([08 §6](08_backlog_e_integracoes.md)).

### Editar na linha, gravar na entidade

Só leitura seria mais puro e pior de usar: obrigaria a trocar de tela no meio do preenchimento,
justamente quando a pessoa **sabe** a resposta. Onde a célula edita, ela grava na entidade — e a
dica avisa o alcance:

> *"Do cadastro de Coca-Cola — vale para todos os projetos da marca"*

Sem esse aviso, quem edita acha que está preenchendo uma linha. **Alcance invisível é o que torna
uma edição perigosa**, não o alcance em si.

### O que continua só leitura, e por quê

| Campo | Por que não se edita da linha |
|-------|------------------------------|
| **Exclusivo** | É consequência, não escolha: deriva do `tipo` da ficha. Trocar o vínculo de alguém tem consequência contratual — fazê-lo de dentro de um projeto esconderia o alcance |
| **Razão Social · CPF/CNPJ** | Dados cadastrais da pessoa jurídica: corrigi-los de um projeto esconderia que a correção vale para **todos** os contratos dela |

### Três vazios, três lugares de resolver

Um dado derivado falta por três motivos diferentes, e a tela precisa distingui-los — cada um se
resolve em outro lugar:

| Na tela | Significa | Onde se resolve |
|---------|-----------|-----------------|
| O valor | A entidade respondeu | — |
| `—` *"não classificado"* | A entidade existe, o campo está vazio | Na própria célula |
| `—` *"ainda não tem ficha"* | O nome está na linha, sem cadastro atrás | Coluna Talento/Marca, ou a página do cadastro |
| `—` *"escolha a marca primeiro"* | Não há de onde derivar | Coluna Marca |

Um `—` mudo obrigaria a testar cada hipótese. O seed guarda os quatro estados de propósito.

---

## 11. Selo de vínculo na linha do contrato

Os dois quadros conversam pelo nome digitado — elo invisível por natureza. Abaixo do nome:

| Estado | Sinal |
|--------|-------|
| Ligado a exclusivo | ⭐ `exclusivo` |
| Ligado a interveniência | ● `interveniência` |
| Nome escrito sem ficha | ⚠ `sem cadastro` |

O terceiro é o mais útil: mostra o cadastro que falta **ou** o erro de digitação, no momento em
que acontece.

## 11.1. Criação automática — o nome vira ficha

Escrever um nome novo na coluna Talento de um contrato **abre o cadastro na hora**, marcado como
`cadastroPendente`.

```
digita "Gil do Vigor" no contrato
   ├─ existe ficha com esse nome?  → vincula
   └─ não existe                   → cria ficha (interveniência, pendente) e vincula
```

> **Por que criar, e não só avisar.** Nome sem ficha era um beco: o contrato ficava com um texto
> solto, e o cadastro só apareceria se alguém lembrasse de abri-lo à mão — o que produzia
> exatamente as grafias divergentes que a referência tenta evitar. Criar na hora fecha o ciclo; a
> marca de pendente diz que a ficha ainda precisa de gente.

A ficha nasce como **interveniência**: é o vínculo mais frouxo, e declarar exclusividade é decisão
comercial que ninguém toma digitando um contrato.

### 11.2. Quando a pendência acaba

Ao **primeiro dado preenchido além do nome** — qualquer campo, rede ou responsável. Alguém olhou
para a ficha; não há mais o que sinalizar.

**Renomear não conta.** Trocar o nome é ainda estar mexendo na mesma casca vazia, e zerar a marca
ali esconderia justamente as fichas que ninguém completou.

### 11.3. Onde a pendência aparece

| Onde | Sinal |
|------|-------|
| Linha do talento | Etiqueta âmbar **Cadastro pendente**, no lugar do nome artístico |
| Barra de ações de Talentos | Contador `N pendentes` |
| Linha do contrato | `⚠ cadastro pendente` — o que falta é visível de onde nasceu |

### 11.4. Duas defesas antes de criar

A criação automática só é segura porque vem depois de duas barreiras (§10):

1. **Sugestão** do que já existe enquanto se digita
2. **Alerta de parecido** quando o texto novo está perto de algo cadastrado

Sem elas, cada erro de digitação abriria uma ficha nova — o oposto do objetivo.

---

## 11.2. Marca virou entidade

O mesmo caminho que Talento percorreu: era texto numa coluna, virou **cadastro com ficha**.

```ts
interface Marca {
  id: string;
  nome: string;
  tipo: 'cliente' | 'fornecedor' | 'ambos';
  segmento: string;             // Bebidas, Varejo, Financeiro
  categoria: string;            // Refrigerantes dentro de Bebidas
  contatos: string[];           // a marca tem vários: mídia não é jurídico
  observacoes: string;
  cadastroPendente?: boolean;   // nasceu de um quadro, espera curadoria
}
```

> **`contato` virou `contatos`** em 02/08/2026, com a aba Cliente. Campo único obrigaria a escolher
> entre o contato de mídia e o de jurídico; a linha do Backlog escolhe **qual deles** responde por
> aquele projeto, e para isso precisa de uma lista de onde escolher.
>
> **`categoria` entrou** no mesmo movimento: "quanto faturamos em Bebidas" é uma pergunta, "quanto
> em Cervejas" é outra, e sem os dois níveis a segunda não tem resposta.
>
> A mudança de forma custou uma versão de persistência ([09 §3](09_fundacoes_tecnicas.md)) — um
> cadastro salvo no formato antigo quebraria a coluna Contato.

### Fornecedor e cliente na mesma tabela

`tipo` distingue quem paga de quem presta serviço. São a mesma entidade porque a maior parte dos
dados é a mesma, e porque **uma empresa pode ser as duas coisas** em projetos diferentes — separar
obrigaria a cadastrá-la duas vezes, e as duas fichas divergiriam com o tempo.

### Onde se completa o cadastro

Até 02/08/2026, em lugar nenhum: as marcas pendentes se acumulavam. Hoje há dois caminhos, e
nenhum deles cobre tudo:

| Caminho | Completa | Não completa |
|---------|----------|--------------|
| **Aba Cliente do Backlog** | Segmento, categoria, contatos | Tipo, observações |
| **Página Cadastro de Clientes** | — *ainda sem colunas* | — |

**Preencher qualquer campo tira a marca da pendência**, porque é isso que a pendência pedia:
curadoria, não um campo específico.

### A chave de comparação

`normalizarNomeDeMarca` remove caixa, acento e pontuação. É comparação **exata após normalizar**,
diferente da semelhança aproximada de `similaridade` (§10):

| | `similaridade` | `normalizarNomeDeMarca` |
|---|---|---|
| Responde | "isto **se parece** com aquilo?" | "isto **é** aquilo?" |
| Resultado | número entre 0 e 1 | chave para comparar |
| Uso | alertar sobre possível duplicata | impedir duplicata na lista |
| Quando | texto livre, sem cadastro atrás | lista com registro por trás |

As duas convivem: a segunda resolve onde há cadastro, a primeira onde não há.

### A página existe — ainda sem colunas

A página **Cadastro de Clientes** (`src/pages/CadastroClientes.tsx`) está na barra lateral como
**placeholder consciente**: cabeçalho no padrão do produto, contadores de marcas cadastradas e de
pendentes, e nenhuma coluna — a tela diz isso explicitamente.

Sem colunas **de propósito**, pelo mesmo caminho das abas do Backlog: a estrutura vem da conversa
com quem usa, não do que seria plausível. A pergunta aberta é como representar **agência** — quem
procura a casa nem sempre é a marca.

O próximo passo é a grade, no padrão dos demais quadros, com filtro de pendentes como o de
Talentos ([06 §4.1](06_pagina_talentos.md)) — hoje as marcas pendentes só se completam pela aba
Cliente do Backlog.

---

## 12. Regra geral para quadros futuros

1. **Guardar id, não nome.** Nome é o que a pessoa digita; id é o que o sistema resolve
2. **Aceitar texto livre com fallback.** Obrigar o cadastro antes trava a operação
3. **Coluna que repete valor vira referência.** Se dois registros podem escrever a mesma coisa, use
   `CelulaReferencia`
4. **Sinalizar o vínculo na linha**, incluindo a ausência dele
5. **Nunca cascatear exclusão.** O outro lado perde o vínculo e mantém o dado escrito
6. **Propagar renome** só pelo id
7. **Nome sem ficha deve criar a ficha**, marcada como pendente — nunca deixar o texto solto

---

## 13. Placeholders — regra de layout

Auditados contra a largura real de cada coluna: `largura_da_coluna × peso% − padding ÷ 6,2px por
caractere`.

**Regra:** o placeholder tem de caber no **menor** tamanho em que o campo aparece. Coluna estreita
ganha texto curto; o detalhe vai para o `title` ou para o `hint` do cabeçalho.

| Antes | Depois |
|-------|--------|
| `Buscar talento, contrato, nº, status, pessoa…` | `Buscar no quadro…` |
| `+ Nome do talento... (Enter)` | `+ Novo talento (Enter)` |
| `Nome da equipe... (Pressione Enter)` | `+ Nova equipe (Enter)` |
| `Pesquisar por nome ou e-mail` | `Buscar pessoa…` |
| `Do que é este contrato?` | `Do que é o contrato?` |
| `30 dias após a entrega` | `30 dias` |
| `Banco · Ag. · CC` | `Ag. / CC` |

O texto de apoio da antiga linha de criação de Talentos, que estourava a faixa, virou `truncate` com o
texto completo no `title`.

---

## 14. Cobertura de teste

**`testeColunas.mjs`** — 259 verificações (contagem de 04/08/2026 — conferir em
`testes-regras/rodar.sh`, que imprime o total por suíte):

- Catálogo: id no formato `quadro:aba:campo`, sem repetição, com rótulo/peso/alinhamento
- **Invariante das larguras**: 78 por aba de Talentos, 100 em Contratos
- Cruzamento com o catálogo de visões: toda aba tem colunas, toda coluna tem aba
- Colunas fixas: Talento, Ações e os contadores não aparecem como ocultáveis
- Permissão: sem ocultação, com ocultação, **união entre equipes**, admin, dono, sem equipe
- Alternar: oculta, mostra, acumula, não muta o original
- **Busca por coluna**: aba liberada + coluna oculta = campo não pesquisável — regra verificada
  para **Talentos**; Contratos ainda não a cumpre (§15)
- O nome é sempre buscável; o resto não vaza

**`testeReferencias.mjs`** — 37 verificações:

- Normalização e distância de edição, incluindo acento e vazio
- **Calibração travada**: 7 pares que devem alertar, 5 que não devem, e a folga entre os grupos
- Semelhantes: acha, ordena, respeita limite, exato não gera dúvida
- Sugestões: prefixo antes de contém, sem duplicata, sem vazios
- `valoresUsados`: agrupa variantes e devolve a **mais frequente**
- `divergencias`: acha as duas grafias, ignora grafia única

**`jornadaInterligacao.mjs`** — 24 verificações, 9 etapas, simulando a sequência real de estado:

- Nome novo abre a ficha, pendente, e o contrato aponta para ela
- O mesmo nome **não** abre uma segunda ficha; acento também não
- Grafia parecida é identificada antes de virar duplicata — e insistir cria mesmo assim
- Preencher qualquer campo resolve a pendência; **renomear não**
- Os contratos seguem ligados, inclusive o que veio com outra grafia
- Responsáveis em lista: adiciona, remove um, remove o último e a área some
- Auditoria de grafias divergentes

**`testeVisoes.mjs`** (43) e **`jornadaVisoes.mjs`** (39) seguem cobrindo aba e quadro.

---

## 15. Limitações conhecidas

| Limitação | Impacto |
|-----------|---------|
| Permissão de coluna é só leitura | Não há "vê mas não edita" por coluna |
| Sem abas em Contratos | O quadro é uma visão só; a permissão de aba não se aplica |
| **Ocultar coluna de Contratos sem efeito** | `ContratosTable.tsx` mantém `COLUMNS` própria, sem os ids do catálogo (§6) — a configuração registra, a célula não borra |
| **Busca de Contratos ignora colunas ocultas** | `filtrarContratos` (`busca.ts:35-58`) varre os campos fixos — a regra da §5 vale para Talentos e Backlog, não para Contratos |
| **Quadro de clientes sem visão nem coluna** | `clientes` não está em `VISOES` nem no catálogo (§7.1) — o interruptor de quadro funciona; aba e coluna não têm o que configurar |
| `divergencias()` sem tela | A função existe e é testada, mas ninguém a executa pela interface |
| Referência não normaliza retroativamente | Corrige o que entra; o que já divergiu continua até alguém arrumar |
| Filtros não se combinam | Um por vez: não dá para ver "exclusivos pendentes" |
| Criação automática só nas colunas de entidade | Talento (Contratos e Backlog) e Marca (Backlog) criam cadastro — `garantirTalento` / `garantirMarca` (§10.5); Empresa, Local e Razão social sugerem, mas não criam registro |
| Regra só no cliente | Como todo o resto: precisa virar política de banco |
| Sem auditoria de liberação | Não se sabe quem liberou a aba sensível, nem quando |
