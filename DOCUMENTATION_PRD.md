# PRD & Documentação Técnica
## Plataforma de Gestão e Talentos — Globo VIU Agenciamento

**Versão:** 2.2 | **Status:** ⚠️ descreve o escopo anterior | **Última revisão:** 31/07/2026

> ## ⚠️ Aviso de status — 01/08/2026
>
> Em 01/08/2026 o projeto foi **reiniciado por decisão do produto**: a implementação descrita
> **neste documento foi removida do código** (quadro de orçamentos, Kanban, calendário, analytics,
> modais de integração e o proxy Express para SharePoint/Gemini).
>
> O conteúdo abaixo permanece como **registro da intenção de produto** e será reescrito conforme
> cada quadro for reconstruído. Para o estado real do código, use:
>
> - [`prd/00_status_implementacao.md`](prd/00_status_implementacao.md) — **retrato factual atual**
> - [`prd/02_quadro_talentos.md`](prd/02_quadro_talentos.md) — **Contratos de Agenciados, documentação completa e vigente**
>
> Divergências conhecidas: a janela do farol de vigência é de **30 dias** (não 90); o quadro se
> chama **Contratos de Agenciados**; não há backend nem integração com SharePoint.

> **Documentos relacionados**
> - [`prd/00_status_implementacao.md`](prd/00_status_implementacao.md) — auditoria do código
> - [`prd/01_visao_produto.md`](prd/01_visao_produto.md) — visão do quadro de Orçamentos
> - [`prd/02_quadro_talentos.md`](prd/02_quadro_talentos.md) — regras da página de Contratos de Agenciados
> - [`prd/05_perfis_usuarios.md`](prd/05_perfis_usuarios.md) — modelo de perfis (fase futura)

---

## 1. Visão Geral

Aplicação web para gestão de **orçamentos, campanhas publicitárias e contratos de agenciamento
de talentos**, substituindo planilhas descentralizadas por uma plataforma interativa no estilo
Monday.com.

### Objetivo
Organizar as esteiras operacionais da VIU com visibilidade em tempo real: prazos, status,
responsáveis e valores — cada informação sob a regra que a governa.

---

## 2. Quadros

A plataforma opera em quadros independentes, cada um com sua esteira, seus status e suas regras.
O cabeçalho da aplicação sempre exibe **o nome do quadro ativo**.

| Quadro | Esteira | Status | Documento |
|--------|---------|--------|-----------|
| **Backlog Agenciamento** | Entrada → Elaboração → Revisão → Feedback → Fechamento | 9 canônicos + 3 subtipos de declínio | [`prd/01`](prd/01_visao_produto.md) |
| **Contratos de Talentos** | Criação → Chancela → Conecta/CGA → Assinatura → Concluído | 13 canônicos | [`prd/02`](prd/02_quadro_talentos.md) |

---

## 3. Navegação

### 3.1. Barra lateral
- **Espaço de Trabalho** — indica o modo de conexão (Demo ou SharePoint) e abre a configuração
- **Quadros** — Backlog Agenciamento e Contratos de Talentos, com contagem de registros
- **Configurações & Integrações** — Sincronizar dados · Conexão & Logo · Fluxo de Etapas ·
  Insights por IA · API Proxy REST

### 3.2. Cabeçalho
Nome do quadro ativo, subtítulo, marcador de conexão, seletor de visualização, botão de
sincronização e acesso à configuração.

### 3.3. Visualizações (quadro Backlog)
| Visão | Conteúdo |
|-------|----------|
| **Dashboard** | KPIs, pipeline por status e atividade recente — clicar num status abre a Tabela já filtrada |
| **Tabela** | Quadro operacional com agrupamento, abas temáticas e edição inline |
| **Kanban** | Cartões por status |
| **Calendário** | Projetos distribuídos por data |
| **Analytics** | Gráficos de distribuição e valores |

O quadro de Contratos de Talentos tem visão única, com esteira e abas de status próprias.

---

## 4. Pipeline de Status — Backlog

```
Entrada → Em Elaboração → Em Revisão → Aguardando Feedback → Negócio Fechado
                                    ↘ Ajuste (loop)
                                    ↘ StandBy
                                    ↘ Declinados (Talento / Mercado / Internamente)
                                    ↘ Encerrado
```

A normalização de status tolera variantes de escrita (`getCanonicalStatusKey`): `Novo`↔`Entrada`,
`Em Elab.`↔`Em Elaboração`, `StandyBy`↔`StandBy`.

---

## 5. Abas Temáticas e Matriz de Estados

As 79 colunas do Backlog são organizadas em **10 abas temáticas**. Cada aba assume um de 5
estados conforme o status do projeto (`TAB_STATUS_MATRIX`):

| Símbolo | Estado | Significado |
|---------|--------|-------------|
| ● | **ABERTA** | Edição total |
| ◐ | **PARCIAL** | Edição restrita a campos específicos |
| ○ | **LEITURA** | Somente visualização |
| ❄ | **CONGELADA** | Travada para histórico |
| 🔒 | **BLOQUEADA** | Indisponível até mudança de status |

| Aba | Campos-chave |
|-----|--------------|
| Resumo Geral | Title, Data_Entrada, Status, Marca, Talento, Valor, Prazo, Responsáveis |
| Escopo & Projeto | Tipo_Input, Origem, Tipo_Projeto, Interveniência, Prioridade, Total_Score |
| Marca & Talento | Marca, Segmento, Categoria, Talento, Origem/Tipo Talento |
| Time & Áreas | Orçamento, Talent Manager, GP, Audiência, Conteúdo, Produção |
| Produção & Entrega | Tipo_Output, Data_Veiculação, Captação, Edição, Qtd_Cotas |
| Financeiro | Valor_Projeto, Cachê, Comissões, Impostos, Custos, Saving |
| Pagamento & Fornecedor | Fornecedor, CPF/CNPJ, PEP, Liberação, Status_Pagamento |
| Jurídico & Contrato | Tipo_Contratação, Contratos, Status_Jurídico, Advogado |
| Histórico & SLA | Datas de SLA e transições (leitura) |
| Anexos & Links | Links de pasta, proposta, SF, planejamento |

**Sub-abas de Elaboração:** Escopo · Financeiro · Jurídico · Produção · Conteúdo · Audiência ·
Talentos · Cliente.

**Regras especiais de campo**
- Time & Áreas em `Entrada` → PARCIAL, libera apenas `Resp_Orcamento`, `Resp_GP`, `Resp_Talent_Manager`
- Pagamento em `Negócio Fechado` → PARCIAL, libera dados de fornecedor
- `Liberacao_Pagamento` só habilita com `Status_Juridico = Assinado`

---

## 6. SLA e Automações

### Farol de SLA (Backlog)
| Cor | Condição |
|-----|----------|
| 🟢 Verde | Mais de 2 dias úteis restantes |
| 🟡 Amarelo | 1 a 2 dias úteis restantes |
| 🔴 Vermelho | Deadline ultrapassado |
| ⚫ Cinza | `Negócio Fechado`, `Declinados` ou `Encerrado` — fora do controle de SLA |

O cálculo usa **dias úteis** em toda a aplicação (`src/utils/dates.ts`), e os status finalizados
são identificados pela chave canônica.

### Campos automáticos
| Campo | Regra |
|-------|-------|
| `Data_Entrada` | Timestamp na criação |
| `Prazo_Entrega` | `Data_Entrada` + 5 dias úteis |
| `Inicio_Elaboracao` | Ao entrar em "Em Elaboração" |
| `Fim_Elaboracao` | Ao sair de "Em Elaboração" |
| `SLA_Entrada_Demanda` | Dias entre início e fim da elaboração |

Estas regras vivem em `applyLifecycleRules()` (`src/App.tsx`) e são aplicadas **tanto no modo demo
quanto no modo SharePoint**.

### Farol de vigência (Contratos de Talentos)
Verde acima de 30 dias · Amarelo dentro da janela de 30 dias · Vermelho vencido ·
Cinza para cancelados ou sem data. Detalhes em [`prd/02`](prd/02_quadro_talentos.md#6-farol-de-vigência).

---

## 7. Funcionalidades por Quadro

### Backlog Agenciamento
Agrupamento por status com cores e colapso · abas temáticas e sub-abas · edição inline por célula ·
inserção rápida no topo do grupo · multi-seleção e ação em lote "Enviar para Elaboração" ·
redimensionamento de colunas · busca multi-termo · filtro de interveniência · ordenação ·
totalizadores por grupo · contadores de Etapas Ativas · farol de SLA · exportação CSV.

### Contratos de Talentos
KPIs clicáveis · esteira por fases · abas para os 13 status · seletor de status com transições
sugeridas · farol de vigência · correção em lote de contratos vencidos · criação inline ·
busca multi-termo · filtro por tipo · agrupamento por status, fase, tipo ou gestor ·
grupos colapsáveis com barra de progresso · exportação CSV.

---

## 8. Arquitetura Técnica

### Frontend
React 19 · TypeScript 5.8 · Vite 6 · Tailwind CSS 4 · Lucide Icons · Motion · Recharts

```
src/
├─ App.tsx                  Estado, CRUD e regras de ciclo de vida
├─ types.ts                 Contratos de dados compartilhados
├─ components/
│  ├─ DataTable.tsx         Quadro de orçamentos
│  ├─ Header.tsx            Nome do quadro + seletor de visualização
│  ├─ Sidebar.tsx           Quadros e integrações
│  ├─ KanbanBoard · CalendarView · AnalyticsDashboard
│  ├─ *Modal.tsx            Conexão, etapas, IA e documentação da API
│  └─ talentos/             Quadro de contratos (página, controles, seletor de status)
├─ pages/DashboardHome.tsx  Visão executiva
├─ utils/
│  ├─ dates.ts              Dias úteis, prazos e formatação — fonte única
│  ├─ statusRules.ts        Status e matriz aba × status do Backlog
│  ├─ talentosRules.ts      Status, fases, transições e vigência dos Contratos
│  └─ pipeline.ts           Contagem por estágio
├─ data/                    Mocks (79 colunas do Backlog, 15 contratos)
└─ context/AuthContext.tsx  Modelo de perfis — reservado para a fase de autenticação
```

### Backend
Express (`server.ts`) como proxy para Microsoft Graph e Gemini.

| Rota | Método | Função |
|------|--------|--------|
| `/api/sharepoint/token` | POST | OAuth client_credentials |
| `/api/sharepoint/site-details` | POST | Resolve siteUrl → siteId |
| `/api/sharepoint/lists` | POST | Lista as listas do site |
| `/api/sharepoint/columns` | POST | Schema de colunas |
| `/api/sharepoint/items/query` | POST | Itens com `expand=fields` |
| `/api/sharepoint/items/create` | POST | Criação |
| `/api/sharepoint/items/update` | PATCH | Atualização |
| `/api/sharepoint/items/delete` | DELETE | Exclusão |
| `/api/ai/analyze` | POST | Análise via `gemini-2.5-flash` |

### Persistência
- Configuração de conexão: `localStorage`
- Dados do Backlog: estado React (demo) ou SharePoint Lists (live)
- Dados de Talentos: estado React (mock)
- Banco de dados próprio: **fora do escopo desta fase**

---

## 9. Próximos Passos

**Curto prazo**
1. Edição inline dos campos de texto no quadro de Talentos
2. Painel de detalhe do contrato (histórico e anexos)
3. Exportação `.xlsx` e `.json`; importação de Excel

**Quando a fase de plataforma começar**
4. Autenticação e aplicação efetiva de `canEditTab()` na interface
5. Camada de persistência e isolamento por workspace
6. Decomposição do `DataTable.tsx`
