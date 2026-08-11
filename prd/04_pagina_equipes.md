# PRD 04 — Página "Equipes"
**Versão:** 4.4 | **Status:** Implementado (front-end, persistência local) | **Data:** 11/08/2026

[← Índice da documentação](README.md) · *Equipes, membros e papéis*


> Bloco **ADMINISTRAÇÃO**. Onde se gerenciam pessoas, equipes e o acesso aos quadros.
> Padrões visuais em [`03_padroes_ui.md`](03_padroes_ui.md).

---

## 1. Propósito

Organizar as pessoas em **equipes**, cadastrar seus dados e definir **quais quadros do Workspace
cada equipe enxerga**.

É a página que substitui a base fictícia de usuários: o que se cadastra aqui alimenta a coluna
Responsável dos [Contratos de Agenciados](02_quadro_talentos.md) e as áreas de responsabilidade
dos [Talentos](06_pagina_talentos.md).

---

## 2. Estrutura

Layout de duas colunas dentro da área de dados:

```
┌──────────────────────── EQUIPES (cabeçalho padrão) ────────────────────────┐
├──────────────────┬─────────────────────────────────────────────────────────┤
│ + Nova equipe    │  ▓ gradiente ▓                                          │
│ 🔍 Pesquisar     │  [AO] Agenciamento Orçamentos        [Excluir equipe]   │
│                  │  4 pessoas · 1 responsável · 3 membros                  │
│ TODAS AS EQUIPES │  Quadros que a equipe enxerga: [Backlog] [Contratos]    │
│ ▸ Agenciamento 4 ├─────────────────────────────────────────────────────────┤
│   Jurídico     2 │  4 pessoas na equipe | 🔍 | + Adicionar existente       │
│   Produção    23 │  NOME | CONTATO | CARGO | TELEFONE | LOCAL | NASC | ... │
│                  │  ▸ linha de criação                                     │
│                  │  ▸ pessoas da equipe                                    │
└──────────────────┴─────────────────────────────────────────────────────────┘
```

---

## 3. Modelo de dados

### 3.1. `Usuario`

| Campo | Tipo | Observação |
|-------|------|------------|
| `id` | `string` | `u1`, sequência própria |
| `nome` | `string` | **Obrigatório** |
| `email` | `string` | **Obrigatório** — é o contato e o acesso |
| `cargo` | `string` | Exibido no cartão de perfil dos quadros |
| `telefone` | `string` | Texto livre |
| `local` | `string` | Cidade, UF |
| `nascimento` | `string` | `yyyy-mm-dd` |
| `perfil` | `PerfilSistema` | Teto de capacidade — [05 §2](05_perfis_usuarios.md) |
| `situacao` | `SituacaoUsuario` | Ativo, férias, afastado, inativo, desligado — [05 §4.5](05_perfis_usuarios.md) |
| `ehDono` | `boolean?` | Trava estrutural do criador da conta — [05 §2.1](05_perfis_usuarios.md) |
| `emailsAlternativos` | `string[]?` | Só o dono — rota de contingência |
| `fotoUrl` | `string?` | Data URL processada no navegador — [05 §4.7](05_perfis_usuarios.md) |

### 3.2. `Equipe`

| Campo | Tipo | Observação |
|-------|------|------------|
| `id` | `string` | `eq1`, sequência própria |
| `nome` | `string` | Editável inline no cabeçalho |
| `paginasPermitidas` | `AppPage[]` | Quadros do Workspace visíveis |
| `membros` | `MembroEquipe[]` | `{ usuarioId, papel }` |
| `areaTalento` | `AreaTalento?` | Área de Talentos que a equipe atende — ver §3.2.2 |
| `visoesLiberadas` | `string[]?` | Abas de dado sensível liberadas — ver §3.2.3 |
| `colunasOcultas` | `string[]?` | Colunas borradas para a equipe — ver §3.2.4 |
| `criadaEm` | `string` | ISO completo |

### 3.2.1. Equipes iniciais

O seed traz **onze** equipes ([`src/data/equipes.ts`](../src/data/equipes.ts)). A equipe é o que dá
acesso ao quadro **e** define quem pode ser nomeado nos registros dele:

| Equipe | Quadros que enxerga | Área |
|--------|---------------------|------|
| **Gestão de Contratos** | Backlog · Contratos de Agenciados · Talentos | — |
| **Gestão de Orçamentos** | Backlog · Talentos | Orçamento |
| **Gestão de Talent Manager** | Talentos | Talent |
| **GP** | Talentos | GP |
| **Gestão de Audiência** | Talentos | Audiência |
| **Gestão de Conteúdo** | Talentos | Conteúdo |
| **Gestão de Produção** | Talentos | Produção |
| **Pagamentos** | Backlog | Pagamento |
| **Jurídico** | Backlog · Contratos de Agenciados | Jurídico |
| **Produção Artística** (`eq10`) | Backlog | Produtor Artístico |
| **Produção Executiva** (`eq11`) | Backlog | Executivo |

As quatro últimas atendem áreas que respondem **por projeto** (colunas de pessoas do Backlog), não
por talento — ficam fora de `areasDoTalento()`. Produção Artística e Produção Executiva entraram
em **03/08/2026**, quando a operação separou as duas frentes: toda área precisa de uma equipe,
senão a coluna de pessoas abre o painel vazio.

> **Visão `backlog:pagamento` extinta.** Em 03/08/2026 a aba Pagamento foi fundida no Financeiro;
> a equipe Pagamentos (`eq8`) passou a liberar `backlog:financeiro` — uma liberação cobre as duas
> de antes.

### 3.2.2. Área de Talentos que a equipe atende

`Equipe.areaTalento` liga a equipe a uma das **10 áreas** de `AreaTalento` — 6 aparecem na ficha
de [Talentos](06_pagina_talentos.md); as 10 aparecem no Backlog. É o que define **de quem sai a
lista de responsáveis** daquela coluna.

Regras:

- **Uma área, uma equipe.** Marcar a área numa equipe desmarca em quem a atendia antes; duas
  equipes na mesma área fariam a lista depender de qual viesse primeiro no array. O chip da área
  já tomada mostra um `•` e o `title` avisa que marcar aqui transfere.
- Clicar na área já marcada **desmarca** — a equipe volta a não atender nenhuma.
- Só quem pode **conceder quadros** edita a marcação.
- **Excluir a equipe não apaga os responsáveis já nomeados por ela.** Some apenas a lista de
  candidatos para novas nomeações, até que outra equipe assuma a área. Tirar os nomes seria apagar
  responsabilidade em vigor por um evento administrativo.

### 3.2.3. Abas de dado sensível

Bloco *"Abas de dado sensível"* no cartão da equipe. Lista **só as abas restritas** dos quadros —
as abertas não aparecem, porque não há o que decidir sobre elas.

São **quatro** no catálogo (`VISOES`), cada uma com o motivo declarado:

| Aba | Quadro | Motivo declarado |
|-----|--------|------------------|
| **Contato** | Talentos | Dados pessoais: e-mail, telefone e localização |
| **Financeiro** | Talentos | CNPJ, faturamento e dados bancários |
| **Jurídico** | Backlog | Tipo de contratação, status e número do contrato |
| **Financeiro** | Backlog | Valores do projeto, cachê, comissões, parcelas e PEP |

- Interruptor com tom **âmbar** quando ligada — cor de alerta, não de ação: é privilégio, não navegação
- Se a equipe não enxerga o quadro daquela aba, aparece *"sem efeito"* — evita a liberação que
  não faz nada e passa por feita
- Exige a mesma capacidade de **conceder quadros**

> **Por que estas abas não vêm junto com o quadro.** Quem trabalha com produção precisa saber
> quem responde pelo talento e como está o contrato; não precisa do telefone pessoal nem do
> faturamento. Modelo completo em [`07_visoes_e_relacoes.md`](07_visoes_e_relacoes.md).

### 3.2.4. Colunas ocultas

Terceiro e último nível do acesso. **Bloqueio por exceção**: quem vê a aba vê todas as colunas
dela, menos as marcadas aqui.

A célula oculta vira um **borrão** que preserva a largura — a tabela não se desmonta. Colunas-chave
(nome, ações, contadores) não aparecem na lista: sem elas a linha ficaria anônima.

A lista é agrupada **por quadro e por aba**, e só mostra os quadros que a equipe enxerga — o que
está fora do alcance dela não tem o que configurar.

> **Contratos de Agenciados** só passou a aparecer aqui na v4.1. O quadro existia, a equipe tinha
> acesso, e nenhuma coluna dele era configurável — sem nenhum aviso de que faltava. A causa era
> uma visão não declarada no catálogo.

> **Limitação conhecida (04/08/2026):** ocultar coluna de **Contratos** ainda não tem efeito na
> grade — a tabela (`ContratosTable.tsx`) mantém uma lista de colunas própria, sem os ids do
> catálogo. A configuração fica registrada, mas a célula não vira borrão
> ([07 §6](07_visoes_e_relacoes.md)). Ver §10.1.

Modelo completo em [`07_visoes_e_relacoes.md`](07_visoes_e_relacoes.md) §3-6.

### 3.2.5. A aba de Configuração

A tela da equipe tem **duas abas**:

| Aba | Conteúdo | Quem vê |
|-----|----------|---------|
| **Pessoas** | Link de entrada e tabela de membros | Todos que veem a equipe |
| **Configuração** | Quadros · abas sensíveis · colunas · área de Talentos | Só quem pode conceder quadros |

A tela tem **uma aba por quadro liberado**, e dentro dela as abas de dado e suas colunas, todas
com interruptor. A aba de cada quadro traz um contador das restrições ativas.

Antes eram dois blocos separados — "abas sensíveis" e "colunas ocultas" —, cada um listando todos
os quadros por dentro: para configurar um quadro era preciso caçá-lo em dois lugares.

Detalhe em [`07_visoes_e_relacoes.md`](07_visoes_e_relacoes.md) §7.

O cartão da equipe mostra o **resumo em leitura** para quem não configura: quantos quadros,
quantas abas sensíveis, qual área atende, quantas colunas ocultas.

> **Por que aba separada:** é decisão de quem administra a plataforma, não do dia a dia da equipe.
> Misturada com a lista de pessoas, empurrava a tabela de gente para baixo da dobra — e a tela de
> equipe existe, antes de tudo, para ver gente.

### 3.3. Papéis

| Papel | Significado | Etiqueta |
|-------|-------------|----------|
| `responsavel` | Responde pela equipe | âmbar, com coroa |
| `membro` | Participa da equipe | cinza |

Uma equipe aceita **vários responsáveis**. Uma pessoa pode estar em **várias equipes**, com papel
diferente em cada uma.

#### Responsável temporário

`MembroEquipe.responsavelAte` guarda um prazo. Enquanto vigente, a pessoa responde pela equipe;
vencido, **volta a membro sozinho**.

> **Onde a expiração acontece:** na leitura (`getPapelNaEquipe`), não numa rotina agendada. Uma
> regra de acesso que depende de job tem um ponto de falha a mais — se o job não roda, o poder
> continua concedido.

Cobre a ausência planejada: o responsável sai de férias, promove alguém por 15 dias e o acesso
se encerra sem ninguém precisar lembrar. A etiqueta mostra a data de término, e a contagem de
responsáveis considera o papel **efetivo** — prazo vencido não infla o número.

### 3.4. O que cada um pode na equipe

| Ação | Admin | Responsável | Membro |
|------|:-----:|:-----------:|:------:|
| Ver a equipe | ✅ | ✅ | ✅ **só a própria, em leitura** |
| Convidar por link | ✅ | ✅ | ❌ |
| Adicionar quem já tem conta | ✅ | ✅ | ❌ |
| Cadastrar pessoa nova | ✅ | ✅ | ❌ |
| Promover a responsável (com ou sem prazo) | ✅ | ✅ | ❌ |
| Férias, afastado, inativo | ✅ | ✅ | ❌ |
| **Desligar** | ✅ | ❌ | ❌ |
| Remover da equipe | ✅ | ✅ | ❌ |
| Renomear / excluir a equipe | ✅ | ✅ | ❌ |
| **Definir quais quadros a equipe enxerga** | só com `conceder_quadros` | ❌ | ❌ |
| Convidar alguém **como responsável** | ✅ | ❌ | ❌ |

> **Definir quadros não vem com o perfil.** Exige a capacidade `conceder_quadros`, que **não está
> na base do Admin Convidado** — o dono a liga por pessoa, com ou sem prazo
> ([05 §2.2](05_perfis_usuarios.md)). Se administrar pessoas bastasse para ampliar o alcance das
> equipes, o teto deixaria de ser teto.

> **Membro não tem poder nenhum na equipe além de ver.** É o que os testes verificam explicitamente.

### 3.4.1. Link de entrada da equipe

Bloco no cartão da equipe, **visível só para quem a administra**. Serve para o caso de "manda no
grupo": um endereço único que qualquer pessoa da empresa usa para entrar como **membro**.

| Ação | O que faz |
|------|-----------|
| **Copiar link** | Só o endereço |
| **Copiar mensagem** | Texto pronto: link + domínios aceitos + prazo |
| **Enviar por e-mail** | Abre o cliente de e-mail com tudo preenchido (`mailto:`, sem custo) |
| **Renovar** | Emite outro token e **desativa o anterior imediatamente** |
| **Desativar** | Corta o acesso na hora |

O rodapé mostra o prazo restante, os domínios aceitos e **quantas pessoas entraram** por ele.

**Rotação:** ao abrir a tela sem link vigente — primeiro acesso ou vencido —, o sistema emite um
novo automaticamente. Com backend, isso vira uma rotina diária ou geração no acesso; o efeito
para quem usa é o mesmo: o endereço de hoje não é o de ontem.

Regras completas e a comparação com o convite nominal em
[`05_perfis_usuarios.md` §4.3.1](05_perfis_usuarios.md).

### 3.5. Quadros visíveis na tela da equipe

Quem **pode conceder** vê todos os quadros, para ligar e desligar. Quem **não pode** vê apenas os
já liberados.

> **Por quê:** listar quadros bloqueados só para mostrar o que a equipe *não* tem é ruído, e
> piora conforme o produto ganha quadros.

---

## 4. Regras — [`src/utils/equipes.ts`](../src/utils/equipes.ts)

```ts
definirMembro(equipe, usuarioId, papel) → Equipe   // adiciona ou troca o papel
removerMembro(equipe, usuarioId)        → Equipe
getPapelNaEquipe(equipe, usuarioId)     → PapelEquipe | null  // papel EFETIVO — expira o temporário
getMembro(equipe, usuarioId)            → MembroEquipe | undefined
responsabilidadeVigente(membro)         → boolean   // prazo do responsável temporário ainda vale?
alternarPagina(equipe, pagina)          → Equipe   // concede/revoga acesso
contarPorPapel(equipe)                  → { responsaveis, membros }
equipesDoUsuario(equipes, usuarioId)    → Equipe[]
equipesDoQuadro(equipes, pagina)        → Equipe[]  // quem opera aquele quadro
usuariosDoQuadro(equipes, pagina)       → string[]  // candidatos a nomeação — ver 05 §8.1
paginasDoUsuario(equipes, usuarioId)    → AppPage[]  // união, acesso cumulativo
```

**Invariantes:**

1. A mesma pessoa nunca aparece duas vezes na mesma equipe — redefinir só troca o papel
2. Redefinir o papel **preserva a posição** na lista
3. Remover quem não é membro é inócuo
4. Acesso é **cumulativo**: quem está em duas equipes enxerga a união dos quadros, sem repetição
5. Todas as funções são **puras** — não mutam a equipe recebida

---

## 5. Coluna esquerda — lista de equipes

| Elemento | Comportamento |
|----------|---------------|
| **Nova equipe** | Botão verde; abre o formulário inline logo abaixo |
| **Pesquisar** | Filtra por nome, tolerante a acento e caixa |
| **Lista** | Avatar com iniciais e cor derivada do nome, nome e contagem de pessoas |
| **Item ativo** | `bg-indigo-50` com barra indigo deslizante |

### 5.1. Formulário de nova equipe

Inline, com fundo verde-claro: **nome** (Enter cria) e os **chips dos quadros** que a equipe
enxergará — todos marcados por padrão. A equipe recém-criada é selecionada automaticamente.

---

## 6. Coluna direita — detalhe da equipe

### 6.1. Cabeçalho

Faixa em gradiente, avatar quadrado com anel branco, **nome editável inline**, contagens
(pessoas · responsáveis · membros) e botão **Excluir equipe**.

### 6.2. Acessos

**Interruptores** (`Switch`) com os quadros do Workspace — todo controle liga/desliga da
Configuração virou interruptor, porque a forma diz o estado sem depender da cor
([07 §7.2](07_visoes_e_relacoes.md)). Sem nenhum ligado, aparece o aviso âmbar
*"Esta equipe não enxerga nenhum quadro do Workspace"*.

> **O acesso é aplicado na interface.** `nivelDeAcesso()` decide o alcance de cada pessoa em cada
> quadro e `registrosVisiveis()` filtra as linhas que ela vê ([05 §3.4](05_perfis_usuarios.md)) —
> desligar o quadro aqui tira a equipe dele na hora. Sem backend, isso continua sendo defesa de
> interface, não segurança ([05 §8](05_perfis_usuarios.md)).

### 6.3. Tabela de pessoas

| Coluna | Editável | Observação |
|--------|----------|------------|
| Nome | ✅ | Com avatar à esquerda |
| Contato | ✅ | E-mail de acesso |
| Cargo | ✅ | Aparece no cartão de perfil dos quadros |
| Telefone | ✅ | |
| Local | ✅ | |
| Nascimento | ✅ | `dd/mm/aaaa` |
| Papel | via etiqueta | Responsável ou Membro |
| Ações | — | Remover da equipe |

Barra de ações: contagem · busca por nome ou e-mail · **Adicionar existente**, que abre painel com
busca na base e lista apenas quem ainda não está na equipe.

### 6.4. Criação de pessoa

Linha de criação inline. Exige **nome e contato**; cria na base **e já vincula** à equipe com o
papel escolhido.

---

## 7. Saída: acesso se corta, histórico não se apaga

Este é o princípio que rege toda saída — de equipe ou da empresa.

| Ação | Onde | Efeito |
|------|------|--------|
| **Remover da equipe** | Lixeira da linha | Desfaz o vínculo; a pessoa continua na base, nas outras equipes e **nomeada nos registros** |
| **Excluir equipe** | Cabeçalho | Apaga a equipe; as pessoas continuam na base |
| **Excluir usuário** | Aba Pessoas | Apaga da base e de todas as equipes — reservado a contas criadas por engano |

### 7.1. O que a confirmação diz

`utils/saida.ts` monta a mensagem com os dois lados do efeito:

- **em quantos registros** a pessoa segue nomeada — o histórico do quadro é preservado
- se ela **fica sem nenhuma equipe** ou em quais continua

> **Por que dizer isso:** sem o aviso, quem opera supõe que remover da equipe apaga a pessoa dos
> contratos — e deixa de fazer a limpeza que deveria fazer, ou faz uma que não queria.

### 7.2. A saída da equipe conversa com a situação

Se a pessoa **ficar sem nenhuma equipe**, a interface pergunta na hora o que fazer com a conta:

| Escolha | Efeito | Quando usar |
|---------|--------|-------------|
| **Desligar** | Sai de todas as equipes e perde o acesso | Deixou a empresa |
| **Inativar** | Perde o acesso, reversível | Saiu da frente de trabalho, segue na casa |
| **Deixar como está** | Nada muda na conta | A pessoa entra em outra equipe em seguida |

Sem essa pergunta, sobraria uma conta **ativa sem equipe nenhuma** — acesso órfão, que
`acessoOrfao()` identifica.

> #### A terceira saída existe desde 11/08/2026, e antes dela havia um defeito
>
> A pergunta era um `window.confirm` cujo texto pedia para ler **"OK" como Desligado** e
> **"Cancelar" como Inativo**. Uma escolha de três vias espremida em dois botões — e, pior, o gesto
> universal de desistir (Cancelar, ou o Esc, ou o clique fora) produzia **uma alteração de
> cadastro**: quem fechasse a caixa sem ler inativava alguém sem saber.
>
> Com o diálogo próprio ([03 §8.1](03_padroes_ui.md)), cada saída tem seu botão e seu rótulo,
> inclusive a de não fazer nada. `MOTIVOS_SAIDA`, em [`utils/saida.ts`](../src/utils/saida.ts), já
> descrevia as duas situações desde que o módulo nasceu **sem nunca ter sido usado** — era a lista
> à espera de uma tela que a mostrasse.
>
> "Deixar como está" devolve o acesso órfão, que é o estado que esta pergunta existe para evitar.
> Ainda assim é a opção correta a oferecer: fingir que Cancelar significa Inativar não impedia o
> órfão — só escondia a decisão de quem a estava tomando.

### 7.3. Efeito em cadeia

Sair da equipe muda o que a pessoa alcança, mas não o que ela fez:

| Depois da saída | Resultado |
|-----------------|-----------|
| Continua nomeada nos contratos | ✅ histórico intacto |
| Some da lista de candidatos a responsável | ✅ `usuariosDoQuadro` |
| Perde acesso de edição no quadro | ✅ o quadro vinha da equipe |
| Conta marcada como inativa/desligada | ✅ bloqueia entrada em tudo |

Todas pedem confirmação nomeando o alvo.

---

## 8. Estado compartilhado — [`src/context/DadosProvider.tsx`](../src/context/DadosProvider.tsx)

Fonte única de **usuários e equipes**, consumida por `useDados()`.

> **Por que existe:** antes, a base de usuários era uma constante importada direto pelos
> contratos. Sem estado compartilhado, uma pessoa cadastrada na administração não apareceria no
> seletor de responsáveis dos quadros.

| Grupo | Operações |
|-------|-----------|
| Usuários | `criarUsuario`, `atualizarUsuario`, `excluirUsuario`, `getUsuario` |
| Equipes | `criarEquipe`, `renomearEquipe`, `excluirEquipe`, `alternarPaginaDaEquipe` |
| Vínculos | `definirMembroDaEquipe`, `removerMembroDaEquipe` |

Ids por contador em `useRef` — nunca derivados do tamanho da lista.
`USUARIOS_SEED` em `data/usuarios.ts` é apenas a **semente** do estado inicial.

---

## 9. Verificação

**15 casos** sobre `utils/equipes.ts`: não duplicação, preservação de ordem ao trocar papel,
remoção inócua, acesso cumulativo sem repetição, contagem por papel e **imutabilidade**.

Mais **41 casos** sobre gestão de equipe (`testeGestaoEquipe`, medição 04/08/2026):

| Grupo | Casos que importam |
|-------|--------------------|
| Responsável temporário | volta a membro sozinho após o prazo · promoção já vencida não vale · contagem não infla · voltar a membro limpa o prazo · substituto administra durante a janela |
| Poderes do responsável | convida, cadastra, promove, coloca em férias · **não desliga** · **não concede quadros** · **não nomeia responsável por convite** |
| Membro | não administra, não convida, não cadastra, não mexe em situação |
| Saída | segue nomeado nos contratos · sai dos candidatos do quadro · perde edição · quem está em duas equipes não fica órfão |
| Acesso órfão | ativo sem equipe é órfão · desligado não é |

---

## 10. Estado atual (04/08/2026)

| Item | Situação |
|------|----------|
| Persistência | ✅ **local** — `localStorage`, formato **v12**; falta o banco |
| Autenticação | ❌ `USUARIO_ATUAL_ID` fixo, com o seletor "Entrar como (demo)" |
| Aplicação das permissões | ✅ na interface — `nivelDeAcesso` e `registrosVisiveis` filtram navegação e linhas (§6.2); **validação no servidor** ❌ |
| Permissões por ação (editar/ver/aprovar) | ❌ Hoje o acesso é por quadro, aba e coluna |
| Foto de perfil | ✅ processada no navegador — [05 §4.7](05_perfis_usuarios.md) |
| Convite por e-mail | ✅ via `mailto:`, sem custo — [05 §4.1.1](05_perfis_usuarios.md); o envio automático depende de backend |
| Excluir usuário pela interface | ✅ na página Usuários, inclusive **em lote** — [05 §2.3](05_perfis_usuarios.md) |

### 10.1. Limitações conhecidas (04/08/2026)

| Limitação | Onde | Efeito |
|-----------|------|--------|
| Ocultar coluna de **Contratos** sem efeito | `ContratosTable.tsx` | A grade não lê o catálogo de colunas; a ocultação fica registrada na equipe e a célula não borra ([07 §6](07_visoes_e_relacoes.md)) |

---

## 11. Próximos passos

1. **Banco de dados** — a persistência local existe; falta o servidor
2. **Autenticação**, para as regras deixarem de ser defesa de interface
3. Perfil da pessoa: painel com dados, equipes de que participa e contratos sob responsabilidade
4. Permissões mais finas que "vê o quadro" — por exemplo, quem pode mover status
5. Ligar a grade de Contratos ao catálogo de colunas, para a ocultação da §10.1 ter efeito
