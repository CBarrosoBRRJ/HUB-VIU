# Plataforma de Gestão e Talentos — Globo VIU Agenciamento

Aplicação web para gestão da esteira de **orçamentos e campanhas publicitárias** e do **ciclo de
contratação de talentos agenciados**, no estilo Monday.com.

> **Estágio atual:** reconstrução em andamento. A página de **Contratos de Agenciados** está
> funcional; o **Backlog de Agenciados** é um esqueleto.
> Autenticação, banco de dados e backend estão fora do escopo desta fase — os dados vivem em
> memória e se perdem ao recarregar a página.

---

## Páginas

A navegação tem dois blocos: **Workspace** (operação) e **Administração** (gestão da plataforma).

| Bloco | Página | Conteúdo |
|-------|--------|----------|
| Workspace | **Contratos de Agenciados** | Esteira de contratação: 13 status, farol de vigência com alerta de 30 dias, agrupamentos, edição inline e gestão de responsáveis |
| Workspace | **Backlog de Agenciados** | Esqueleto — a construir |
| Administração | **Equipes** | Cadastro de equipes e pessoas, papéis e acesso aos quadros |
| Administração | **Usuários** | Base de pessoas, perfis de sistema e pedidos de acesso |

O que cada pessoa enxerga depende do **perfil** (Admin, Responsável ou Membro) e das **equipes** de
que participa. Enquanto não há login, o rodapé da barra lateral permite trocar de sessão para
conferir as regras na prática.

Documentação, detalhada o bastante para replicar cada tela do zero:

- [`prd/02_quadro_talentos.md`](prd/02_quadro_talentos.md) — Contratos de Agenciados
- [`prd/03_padroes_ui.md`](prd/03_padroes_ui.md) — **padrões visuais e de construção** (ler antes de criar telas)
- [`prd/04_pagina_equipes.md`](prd/04_pagina_equipes.md) — Equipes
- [`prd/05_perfis_usuarios.md`](prd/05_perfis_usuarios.md) — **perfis, permissões e isolamento de dados**

---

## Como rodar

**Pré-requisitos:** Node.js 20+

```bash
npm install
npm run dev          # http://localhost:3001
```

A porta é **3001** com `strictPort` — a 3000 está reservada ao projeto `viu-saas`, que roda em
paralelo na mesma máquina. Para mudar, edite [`vite.config.ts`](vite.config.ts).

### Scripts

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run preview` | Serve o build local |
| `npm run typecheck` | Verificação de tipos sem emitir arquivos |

---

## Arquitetura

```
src/
├─ App.tsx                       Layout: sidebar + página ativa
├─ types.ts                      TalentContract, Usuario, AppPage
├─ pages/
│  ├─ ContratosTalentos.tsx      Estado, CRUD e composição da página
│  ├─ BacklogAgenciados.tsx      Esqueleto
│  └─ Equipes.tsx                Esqueleto — administração de pessoas
├─ components/
│  ├─ Header.tsx                 Cabeçalho centralizado com orientações
│  ├─ Sidebar.tsx                Blocos Workspace e Administração
│  ├─ talentos/                  Grade, etiqueta de status, farol, pessoas e grupos
│  ├─ equipes/                   Lista, detalhe, tabela de pessoas e etiqueta de papel
│  ├─ usuarios/                  Avatar e cartão de perfil
│  └─ ui/                        Célula editável e painel flutuante em portal
├─ context/DadosProvider.tsx     Fonte única de usuários e equipes
├─ data/usuarios.ts              Semente da base de usuários
└─ utils/
   ├─ vigencia.ts                Farol de vigência, filtros e contagens
   ├─ pessoas.ts                 Responsáveis, parceiros e migração de papéis
   ├─ equipes.ts                 Membros, papéis e acesso aos quadros
   ├─ talentosStatus.ts          13 status canônicos e paleta
   └─ dates.ts                   Formatação e data de hoje
```

**Stack:** React 19 · Vite 6 · Tailwind 4 · `motion` · `lucide-react`. Sem backend e sem router.

---

## Regras de negócio implementadas

- **Uma linha por contrato** — o mesmo talento pode ter vários contratos, simultâneos ou sucessivos
- **Farol de vigência** — verde acima de 30 dias, amarelo até 30 dias, vermelho vencido, cinza para
  cancelados ou sem data de fim; a barra mostra o percentual de tempo decorrido
- **13 status canônicos** — esteira de 10 passos mais Parado, Cancelado e Vencido, sem bloqueio de transição
- **Responsáveis e parceiros** — vários de cada por linha, com migração entre papéis; ninguém ocupa
  os dois papéis ao mesmo tempo
- **Data de criação** automática, com hora completa no tooltip

Todas as regras, valores exatos e casos de borda estão em [`prd/02_quadro_talentos.md`](prd/02_quadro_talentos.md).
