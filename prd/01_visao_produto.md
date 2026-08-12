# PRD 01 — Visão do Produto
## Plataforma de Gestão e Talentos — Globo VIU Agenciamento
**Versão:** 4.6 | **Status:** Vigente | **Data:** 04/08/2026

[← Índice da documentação](README.md) · *O produto e o problema que resolve*

> **Esta versão substitui integralmente a 3.0**, que descrevia a implementação anterior —
> SharePoint, Kanban, Analytics, insights por IA, `statusRules.ts`. Nada daquilo existe no código
> atual. Manter aquele texto tornava a documentação enganosa justamente para quem viesse auditar.
>
> O que o sistema anterior deixou de herança está registrado em §9.

---

## 1. O problema

A operação de agenciamento de talentos da Globo VIU roda hoje no **Monday.com**. A assinatura é
cara, e o produto de prateleira não entrega o que a operação precisa:

| Falta | Consequência |
|-------|--------------|
| **Integração com a caixa de e-mail** | Toda demanda que chega por e-mail é recadastrada à mão |
| **Integração com o Salesforce** | Oportunidade comercial e projeto de agenciamento vivem separados |
| **Permissão por coluna** | Dado pessoal e financeiro ficam visíveis para quem só precisa da data |
| **Relação entre quadros** | O mesmo talento vira "Gil do Vigor" e "Gilberto do Vigor" em telas diferentes |

**O objetivo é cancelar essa assinatura** substituindo-a por uma plataforma própria que faça o que
o Monday faz **e** o que ele não faz.

---

## 2. O que este sistema é

**Controle de processo e máscara de dados.** Ele registra o andamento das demandas de agenciamento,
diz quem enxerga o quê, e serve de porta de entrada para o que chega por integração.

### O que ele não é

> **Não é ferramenta de análise.** Séries históricas, cruzamentos e gráficos são feitos no
> **Power BI lendo o banco**. Esta decisão é do produto e explica muita coisa: por que não há tela
> de relatório, por que a lista solta os projetos finalizados após 30 dias, e por que os totais na
> tela são de conferência rápida, não de análise.

Consequência prática: **o banco é o produto tanto quanto a interface**. Um campo mal modelado aqui
vira um dashboard impossível lá.

---

## 3. Os quatro quadros

| Quadro | Responde a pergunta | Documento |
|--------|--------------------|-----------|
| **Backlog de Agenciados** | O que chegou, em que ponto está, quem responde | [08](08_backlog_e_integracoes.md) |
| **Contratos de Agenciados** | Que contratos existem, vigentes até quando, em que etapa jurídica | [02](02_quadro_talentos.md) |
| **Talentos** | Quem são as pessoas, exclusivos e interveniência, com quem falar | [06](06_pagina_talentos.md) |
| **Cadastro de Clientes** | Que marcas e agências existem, de onde os quadros puxam cliente e segmento | [07 §11.2](07_visoes_e_relacoes.md) |

O quarto é um **placeholder consciente**: as marcas já existem como dado e alimentam o Backlog,
mas a página ainda não tem colunas — a estrutura será desenhada com a operação, em especial como
representar **agência** ([07 §11.2](07_visoes_e_relacoes.md)).

Eles **se comunicam**: um nome digitado no Backlog ou em Contratos abre uma ficha de talento
pendente — e um nome de marca abre o cadastro dela — em vez de deixar o nome solto
([07 §11.1](07_visoes_e_relacoes.md)).

Mais duas páginas de administração — **Equipes** ([04](04_pagina_equipes.md)) e **Usuários**
([05](05_perfis_usuarios.md)) — mais **Meu Perfil**.

---

## 4. O fluxo da operação

```
                    ┌──────────── entra por ────────────┐
                    │                                   │
              manual · agente de e-mail · Salesforce    │
                    │                                   │
                    ▼                                   │
   Entrada ──► Em Elaboração ──► Em Revisão ⇄ Ajustes   │  SLA de triagem
      │                              │                  │  5 dias úteis
      │                              ▼                  │  (corre só na Entrada)
      │                     Aguardando Feedback ⇄ StandBy  ← pausa, e volta
      │                              │                  │
      │              ┌───────────────┼──────────────┐   │
      │              ▼               ▼              ▼   │
      │      Negócio Fechado    Declinado      Encerrado│  ← interno · mercado · talento
      │                                                 │
      └──── 20 dias corridos parado ────► Encerrado ────┘  automático
```

**Três retornos**: `Ajustes` volta para Em Revisão (loop de correção), `StandBy` volta para
Aguardando Feedback (retomada), e **Aguardando Feedback volta para Ajustes** quando o cliente pede
alteração. O processo real não é uma linha reta.

**Em Revisão, Aguardando Feedback e StandBy congelam a edição** — há uma versão do material
circulando fora do quadro. Para corrigir, move-se para Ajustes ([08 §3.2](08_backlog_e_integracoes.md)).

As transições são **fechadas**: de cada status só se vai para os destinos previstos, e o seletor
mostra apenas esses. Regras completas em [08 §3](08_backlog_e_integracoes.md).

---

## 5. Os dois relógios

Existem duas contagens de tempo, com unidades diferentes de propósito:

| Relógio | Mede | Unidade | Para quando |
|---------|------|---------|-------------|
| **SLA de triagem** | tempo de **resposta** — 5 dias | dias **úteis** | ao sair de Entrada |
| **Abandono** | tempo de **silêncio** — 20 dias | dias **corridos** | a cada movimento |

O SLA é um compromisso de trabalho: ninguém responde proposta no domingo. O abandono mede tempo
real — um projeto parado há três semanas está parado, feriado ou não.
([09 §4](09_fundacoes_tecnicas.md))

### Farol de SLA

| Cor | Condição |
|-----|----------|
| 🟢 Verde | mais de 2 dias úteis restantes |
| 🟡 Amarelo | 1 a 2 dias, ou vence hoje |
| 🔴 Vermelho | prazo ultrapassado |
| ⚫ Cinza | saiu da triagem — o relógio parou |

---

## 6. Quem vê o quê

Três camadas, aplicadas em ordem ([07 §1](07_visoes_e_relacoes.md)):

```
quadro  →  a equipe tem acesso a este quadro?
  aba   →  esta aba foi liberada? (restritas são fechadas por padrão)
coluna  →  esta coluna foi bloqueada? (abertas, com exceção)
```

Mais uma regra que corta por cima de tudo: **membro vê apenas as linhas em que foi nomeado**. Quem
está fora da equipe do quadro, mas foi nomeado numa linha, vê aquela linha — e o quadro aparece na
barra lateral com **cadeado**, não escondido ([05 §3.4](05_perfis_usuarios.md)).

> O caso que originou o modelo por coluna, nas palavras do produto: *"eu sou da área X, não devo
> ter acesso a dados pessoais, mas posso ver dados de contrato e data e rede"*.

---

## 7. Campos que o sistema preenche

| Campo | Regra |
|-------|-------|
| **Entrada** | data de cadastro da demanda |
| **Deadline** | entrada + 5 dias úteis |
| **Status** | nasce em Entrada; muda só pelas transições válidas |
| **`statusDesde`** | reinicia a cada movimento — é o relógio do abandono |
| **Criado em** | carimbo de auditoria |

Nenhum deles é editável: o provider os define no momento da criação, e a linha nasce na lista já
com eles preenchidos ([03 §7.8](03_padroes_ui.md)).

---

## 8. Integrações

| Origem | Estado | Onde |
|--------|--------|------|
| **Manual** | ✅ funcionando | [03 §7.8](03_padroes_ui.md) |
| **Agente de e-mail** | 🚧 contrato pronto, falta o transporte | [08 §10–11](08_backlog_e_integracoes.md) |
| **Salesforce** | 🚧 idem | [08 §10–11](08_backlog_e_integracoes.md) |
| **Power BI** | ⏸️ depende do banco | §2 |
| **Envio de e-mail (sedmail)** | 🚧 contrato pronto, credencial **só no servidor** | [08 §11](08_backlog_e_integracoes.md) |

A ingestão é **pura e idempotente**: reprocessar o mesmo lote não duplica nada, e correção humana
vence o que vem da integração. É o que permite religar o agente sem medo depois de uma queda.

---

## 9. Herança do sistema anterior

O projeto foi reiniciado em 01/08/2026 e reconstruído do zero. O que veio de lá:

| Conceito | Como está hoje |
|----------|----------------|
| Quadro de Orçamentos | Virou **Backlog de Agenciados** — mesmo propósito, modelo enxuto |
| Declínio em três motivos | Preservado como **qualificador** de um status só ([08 §7.5](08_backlog_e_integracoes.md)) |
| SLA de 5 dias úteis | Preservado, com o relógio parando na saída da triagem |
| 79 colunas tipadas, 10 abas + 8 sub-abas | Redesenhado em **8 abas, todas com colunas** — Demanda · Escopo · Produção · Cliente · Jurídico · Financeiro · Links · Time ([08 §6](08_backlog_e_integracoes.md)) |
| Kanban, Calendário, Analytics, insights por IA | **Removidos** — análise é no Power BI (§2) |
| SharePoint / Graph | **Removido** — o destino é banco próprio com RLS |
| Export CSV | **Substituído** — desde 04/08/2026 a grade exporta **`.xlsx` real**, só com o que a pessoa vê ([07 §5](07_visoes_e_relacoes.md)); a análise continua no Power BI |

> A redução não foi perda de escopo: 79 colunas tipadas produziam telas que ninguém preenchia
> inteiras. O corte veio de perguntar, coluna a coluna, **quem usa isto e quando**.

---

## 10. Estado atual

| Frente | Situação |
|--------|----------|
| Interface dos 4 quadros (Backlog, Contratos, Talentos e Cadastro de Clientes — este ainda sem colunas) | ✅ funcional |
| Administração: Equipes + Usuários + Meu Perfil | ✅ funcional |
| Regras de acesso (quadro, aba, coluna, linha) | ✅ implementadas como funções puras |
| Onboarding (convite, link de equipe, domínios) | ✅ simulado, pronto para SSO |
| Máquina de status, SLA, encerramento automático | ✅ com teste |
| **Banco de dados** | 🚧 — o **schema Prisma está completo e versionado** ([`prisma/schema.prisma`](../prisma/schema.prisma)); o que falta é o servidor, não o modelo |
| Contrato de ingestão | ✅ pronto e testado; falta o transporte |
| **Autenticação** | ❌ — decidido SSO corporativo |

> **Sem backend, todo o controle de acesso é máscara de interface.** Os dados vivem no navegador de
> quem abre a página. Isto está registrado sem meio-termo em [05 §10](05_perfis_usuarios.md), e é a
> razão de a próxima fase ser o banco e não mais produto.

Retrato completo e medido em [00](00_status_implementacao.md).
