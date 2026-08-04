# PRD 02 — Página "Contratos de Agenciados"
**Versão:** 2.7 | **Status:** Implementado (front-end, exportação nativa em Excel `.xlsx`, persistência local) | **Data:** 04/08/2026

[← Índice da documentação](README.md) · *Quadro de Contratos de Agenciados*


> Documento de replicação. Descreve **tudo** que a página faz hoje — regras, comportamentos,
> valores exatos e decisões técnicas — em nível suficiente para reconstruí-la do zero sem
> consultar o código.
>
> Código em [`src/pages/ContratosTalentos.tsx`](../src/pages/ContratosTalentos.tsx),
> [`src/components/talentos/`](../src/components/talentos/), [`src/utils/exportacao.ts`](../src/utils/exportacao.ts) e [`src/utils/`](../src/utils/).

---

## 1. Propósito

Acompanhar o **ciclo de contratação dos talentos agenciados** — da minuta à assinatura — e a
**vigência dos contratos**, com alerta antecipado de renovação.

Princípio de modelagem: **uma linha por contrato**. O mesmo talento pode ter vários contratos,
simultâneos ou sucessivos; eles não se fundem numa linha só.

---

## 2. Identidade e navegação

| Propriedade | Valor |
|-------------|-------|
| Título exibido | `CONTRATOS DE AGENCIADOS` (caixa alta, `tracking-[0.22em]`) |
| Item na barra lateral | Contratos de Agenciados |
| Seção da barra lateral | `WORKSPACE` |
| Rota / estado | `AppPage = 'contratos'` (navegação por estado, sem router) |
| Origem dos dados | Estado React no `DadosProvider`, **persistido em `localStorage`** (formato v12 — §18) |

### 2.1. Cabeçalho da página

Centralizado, em quatro níveis verticais:

1. **Título** em caixa alta com espaçamento entre letras
2. **Traço** indigo de 40 px (`h-0.5 w-10 bg-indigo-500/70`)
3. **Subtítulo** — uma única frase, com `text-balance` para equilibrar as linhas:
   > Gestão dos contratos dos talentos agenciados — da minuta à assinatura, com controle de vigência e renovações.
4. **Três orientações de uso**, em linha, com ícone e separador circular entre elas:

| Ícone | Texto |
|-------|-------|
| `Rows3` | Uma linha por contrato |
| `CalendarClock` | Datas de início e fim sempre atualizadas |
| `Workflow` | Status movimentado conforme a esteira |

> **Regra de composição:** o subtítulo aceita **uma frase apenas**. Parágrafos longos
> centralizados produzem quebras irregulares — orientações vão sempre em `hints`.

---

## 3. Anatomia da página

```
┌──────────────┬────────────────────────────────────────────────────────────┐
│ VIU          │                CONTRATOS DE AGENCIADOS                     │
│ Agenciamento │                          ▁▁                                │
│              │        Gestão dos contratos dos talentos agenciados…       │
│ WORKSPACE    │   ▸ Uma linha por contrato · ▸ Datas… · ▸ Status…          │
│  Backlog     ├────────────────────────────────────────────────────────────┤
│  Contratos ◄ │  ▓▓ Todos 4 · Vigentes 2 · A vencer 1 · Vencidos 1  ▓▓     │ ← faixa navy
│              │  4 contratos no grupo | Agrupar por ▾ | Excluir em Lote     │ ← barra de ações
│              │  ┌──────────────────────────────────────────────────────┐  │
│              │  │ CABEÇALHO DAS COLUNAS                                │  │
│              │  │ ▸ linhas — a criação insere no topo (§9)             │  │
│              │  │ ▸ linhas de dados                                    │  │
│              │  └──────────────────────────────────────────────────────┘  │
└──────────────┴────────────────────────────────────────────────────────────┘
```

---

## 4. Modelo de dados

### 4.1. `TalentContract` — [`src/types.ts`](../src/types.ts)

| Campo | Tipo | Origem | Observação |
|-------|------|--------|------------|
| `id` | `string` | Automático | Formato `CT-001`, sequência própria |
| `talento` | `string` | Usuário | **Obrigatório** — único campo que trava o salvamento |
| `contrato` | `string` | Usuário | **Do que é** o contrato: "Contrato de agenciamento", "Campanha Coca-Cola" |
| `numero` | `string` | Usuário | Número ou código do contrato. Opcional, **formato livre** — a operação ainda não fixou um |
| `talentoId` | `string?` | Automático | Vínculo com a ficha de talento exclusivo, quando o nome casa. Ausente em interveniência |
| `inicio` | `string` | Usuário | `yyyy-mm-dd`. Default: hoje |
| `fim` | `string` | Usuário | `yyyy-mm-dd`. Opcional — sem ela não há farol |
| `status` | `TalentoStatus` | Usuário | Um dos 13 canônicos. Default: `Criação` |
| `responsaveisIds` | `string[]` | Usuário | **Vários**. O primeiro é o principal |
| `parceirosIds` | `string[]` | Usuário | **Vários** |
| `criadoEm` | `string` | Automático | ISO completo (`new Date().toISOString()`) |

### 4.2. `Usuario`

```ts
interface Usuario {
  id: string; nome: string; email: string; cargo: string;
  telefone: string; local: string; nascimento: string;   // yyyy-mm-dd
  perfil: PerfilSistema;          // admin | responsavel | membro
  situacao: SituacaoUsuario;      // ativo | ferias | afastado | inativo | desligado
  ehDono?: boolean;               // trava estrutural — ver 05 §2.1
  emailsAlternativos?: string[];  // só o dono tem
  fotoUrl?: string;               // data URL processada no navegador — 05 §4.7
}
```

O seed em [`src/data/usuarios.ts`](../src/data/usuarios.ts) traz **6 pessoas** (`u0` a `u5`) e a
constante `USUARIO_ATUAL_ID = 'u0'` — o dono. O seed é só a **semente**: quem manda é o estado do
`DadosProvider`, alimentado pelas páginas de Equipes ([04](04_pagina_equipes.md)) e Usuários
([05](05_perfis_usuarios.md)).

### 4.3. Geração de `id`

A regra do projeto está em [`src/utils/ids.ts`](../src/utils/ids.ts): o próximo número vem **do que
está carregado** (`proximoNumero` / `proximoNumeroFormatado`), não do tamanho da lista nem de uma
constante. Derivar de `contracts.length` reaproveita números depois de exclusões; um contador fixo
ignora o que veio do `localStorage` ou do seed — nos dois casos, id repetido, e em React duas
linhas com a mesma `key` se fundem na tela.

> **Contradição vigente (04/08/2026):** `ContratosTalentos.tsx:31` ainda usa `useRef(1)`, contra a
> regra de `ids.ts` — o primeiro contrato criado pode nascer `CT-001` duplicando um persistido.
> Registrada na tabela de limitações (§18.1).

Contratos novos entram **no topo** da lista.

---

## 5. Status canônicos

**13 status**, em ordem de esteira. A ordem do array é a fonte da verdade para o agrupamento.

### 5.1. Esteira sequencial (10 passos)

```
Criação → Revisão Inicial → Aprovação Inicial → Chancela →
Revisão Conecta → Via CGA → Aprovação Conecta →
Requisição Enviada → Em Assinatura → Concluído
```

### 5.2. Interrupção (3)

| Status | Significado |
|--------|-------------|
| `Parado` | Tramitação suspensa por pendência |
| `Cancelado` | Encerrado sem efeito — sai do farol de cores |
| `Vencido` | Vigência expirada |

### 5.3. Paleta exata — `STATUS_STYLE[status].solid`

| Status | Classe | Status | Classe |
|--------|--------|--------|--------|
| Criação | `bg-slate-500` | Aprovação Conecta | `bg-teal-500` |
| Revisão Inicial | `bg-sky-500` | Requisição Enviada | `bg-amber-500` |
| Aprovação Inicial | `bg-indigo-500` | Em Assinatura | `bg-orange-500` |
| Chancela | `bg-violet-500` | Concluído | `bg-emerald-500` |
| Revisão Conecta | `bg-blue-500` | Parado | `bg-yellow-500` |
| Via CGA | `bg-cyan-600` | Cancelado | `bg-rose-500` |
| | | Vencido | `bg-red-600` |

> **Restrição do Tailwind 4:** as classes precisam existir **literais** no código. Nada de
> `bg-${cor}-500` — o JIT não gera a regra e a etiqueta sai sem cor.

### 5.4. Transições

**Não há bloqueio de transição.** Qualquer status leva a qualquer outro. A paleta apresenta os 13
numa grade 2 colunas, na ordem canônica.

---

## 6. Farol de vigência

Regra central da página. Implementada em [`src/utils/vigencia.ts`](../src/utils/vigencia.ts).

### 6.1. Constante

```ts
export const VIGENCIA_ALERTA_DIAS = 30;
```

### 6.2. Algoritmo — `getVigenciaInfo(contract, referencia = new Date())`

Avaliado **nesta ordem**:

| # | Condição | Cor | Rótulo | Percentual |
|---|----------|-----|--------|-----------|
| 1 | `status === 'Cancelado'` | ⚫ cinza | `Cancelado` | `null` |
| 2 | Sem `fim` | ⚫ cinza | `Sem vigência` | `null` |
| 3 | `diasRestantes < 0` | 🔴 vermelho | `Vencido há Nd` | `100` |
| 4 | `diasRestantes <= 30` | 🟡 amarelo | `Vence em Nd` | calculado |
| 5 | Demais | 🟢 verde | `Vigente · Nd` | calculado |

```
diasRestantes = round((fim − hoje) / 86.400.000)
percentual    = clamp((hoje − inicio) / (fim − inicio), 0, 1) × 100
```

`percentual` é `null` quando não há `inicio` ou quando `fim <= inicio` — o que também **evita
divisão por zero** em contrato de um dia só.

### 6.3. Normalização de datas — obrigatória

Datas `yyyy-mm-dd` são convertidas com `new Date(ano, mes-1, dia)` (construtor local), **nunca**
com `new Date('2026-08-01')`, que é interpretado como UTC e desloca o dia em fusos negativos.
A data de referência passa por `meiaNoite()` antes da subtração.

**Efeito:** a contagem de dias é idêntica às 00h01 e às 23h59 do mesmo dia.

### 6.4. Casos de borda que devem ser respeitados

| Cenário | Resultado esperado |
|---------|--------------------|
| Faltam 31 dias | 🟢 verde |
| Faltam exatos 30 dias | 🟡 amarelo |
| Vence hoje (0 dia) | 🟡 amarelo, `Vence em 0d` |
| Venceu ontem | 🔴 vermelho, `Vencido há 1d` |
| `inicio` no futuro | percentual `0` (clamp inferior) |
| Contrato vencido | percentual `100` (clamp superior) |
| `fim === inicio` | percentual `null`, sem barra |
| Sem `inicio`, com `fim` | farol normal, percentual `null` |

---

## 7. Abas de filtro (faixa navy)

Quatro abas, cada uma com bolinha da cor, rótulo e contador. A ativa fica com fundo `indigo-600`.

| Aba | Mostra | Cor da bolinha |
|-----|--------|----------------|
| Todos | tudo, inclusive cinza | `bg-slate-400` |
| Vigentes | apenas 🟢 | `bg-emerald-500` |
| A vencer | apenas 🟡 | `bg-amber-500` |
| Vencidos | apenas 🔴 | `bg-red-500` |

**Contratos cinza** (cancelados ou sem data de fim) aparecem **somente** em "Todos" — não têm aba
própria. Por isso `vigentes + a_vencer + vencidos` pode ser menor que `todos`.

Os contadores vêm de `contarPorFarol(contracts)`, calculado sobre a lista **completa**, não sobre
a filtrada — senão cada aba zeraria as outras.

---

## 8. Colunas da tabela

Largura mínima da tabela: `1340px` (rolagem horizontal abaixo disso).
**Alinhamento: tudo centralizado, exceto Talento e Contrato.**

| # | Coluna | Largura | Alinh. | Ordenável | Editável | Conteúdo |
|---|--------|---------|--------|-----------|----------|----------|
| 0 | checkbox | 40px | centro | — | — | Seleção da linha |
| 1 | Talento | 15% | esquerda | ✅ | ✅ texto | Negrito, `slate-800` |
| 2 | **Contrato** | 16% | esquerda | ✅ | ✅ texto | Do que é o contrato |
| 3 | Responsável | 11% | centro | ❌ | via painel | Pilha de avatares + botão `+` |
| 4 | Número | 9% | centro | ✅ | ✅ texto | Fonte monoespaçada |
| 5 | Início | 8% | centro | ✅ | ✅ data | `dd/mm/aaaa` |
| 6 | Fim | 8% | centro | ✅ | ✅ data | `dd/mm/aaaa` |
| 7 | Status | 12% | centro | ✅ | via paleta | Etiqueta preenchida |
| 8 | Vigência | 11% | centro | ❌ | derivado | Farol + barra de % |
| 9 | Criado em | 6% | centro | ✅ | ❌ | `dd/mm/aaaa`, tooltip com hora |
| 10 | Ações | 4% | centro | — | — | Editar e excluir |

As larguras percentuais **somam exatamente 100** — invariante do `table-fixed`
([06 §2.3](06_pagina_talentos.md)).

> **Duas colunas à esquerda, não uma.** Talento e Contrato são textos de leitura corrida;
> centralizá-los prejudicaria a varredura vertical da lista. O resto segue centralizado.
>
> **Por que separar "Contrato" de "Número":** o mesmo talento costuma ter vários contratos, e o
> número não diz qual é qual. A descrição é o que permite reconhecer a linha de relance —
> "Campanha Coca-Cola" resolve o que `CTR-2026-014` não resolve.
>
> **Por que o placeholder do Número é só "Número":** o formato do código de contrato ainda não foi
> definido pela operação. Um placeholder de exemplo (`CTR-0000-000`) estourava a largura da coluna
> e, pior, sugeria uma máscara que não existe. Quando a operação fixar o padrão, ele volta.

### 8.1. Ordenação

Ciclo de três estados ao clicar no cabeçalho: **ascendente → descendente → sem ordenação**.
Ícones: `ChevronsUpDown` (inativo), `ArrowUp`, `ArrowDown`.

Comparação sempre por `String(valor).localeCompare(valor, 'pt-BR')` — acentos ordenam corretamente
e datas ISO (`yyyy-mm-dd`) ordenam bem lexicograficamente.

---

## 9. Criação — o botão insere a linha

**"Novo contrato" insere a linha no topo da lista, com a coluna Talento já em edição.** Não há
formulário nem linha de rascunho: preencher é editar, com a mesma edição inline das linhas antigas.

| O que nasce preenchido | Valor |
|------------------------|-------|
| **Talento** | `Sem talento` — provisório, selecionado para digitar por cima |
| **Início** | hoje |
| **Status** | `Criação`, a primeira da esteira |
| **Criado em** | agora |
| Contrato · Número · Fim | vazios |
| Responsáveis e parceiros | **vazios** — atribuir é escolha explícita de quem cadastra |

### A ficha do talento não nasce agora

`garantirTalento` roda quando o **nome de verdade** é digitado, não na criação. Se rodasse antes, o
cadastro de Talentos se encheria de fichas "Sem talento" a cada clique no botão
([07 §11.1](07_visoes_e_relacoes.md)).

### Modelo anterior, descartado

Havia uma **linha verde fixa** no topo da tabela, com um campo por coluna e um `+` para salvar. Ela
saiu por dois motivos: ocupava espaço permanente para um gesto ocasional, e num quadro vazio
competia com a mensagem que explica que não há nada ali.

A regra completa, comum aos três quadros, está em [03 §7.8](03_padroes_ui.md).

---

## 10. Edição inline (estilo planilha)

[`src/components/ui/EditableCell.tsx`](../src/components/ui/EditableCell.tsx)

| Ação | Resultado |
|------|-----------|
| Clique na célula | Vira input com o conteúdo **selecionado** (digitar substitui) |
| `Enter` | Confirma e sai |
| Sair do foco (blur) | Confirma e sai |
| `Esc` | Restaura o valor anterior e sai |
| Sem alteração | `onCommit` **não** é chamado |

Fora da edição, a célula mostra só o valor, com realce sutil no hover (`hover:bg-white hover:ring-1`).
Em edição, anel indigo (`ring-2 ring-indigo-400`). A seleção do conteúdo usa
`requestAnimationFrame` para rodar depois que o input existe no DOM.

**Botão lápis (coluna Ações):** coloca a linha em modo de edição — fundo azulado e a célula
**Talento** aberta para digitação. O ícone vira ✓ para concluir.

---

## 11. Pessoas: responsáveis e parceiros

[`src/utils/pessoas.ts`](../src/utils/pessoas.ts) — regras puras, sem UI.

### 11.1. Papéis

| Papel | Significado | Marca visual |
|-------|-------------|--------------|
| `responsavel` | Responde pelo contrato | Avatar com **coroa** âmbar no canto |
| `parceiro` | Apoia a tramitação | Avatar sem marca |

Uma linha aceita **vários de cada**. O **primeiro responsável** é o principal e define o
agrupamento por responsável.

### 11.2. API

```ts
definirPapel(pessoas, usuarioId, papel | null) → Pessoas   // atribui, migra ou remove
getPapel(pessoas, usuarioId)                   → Papel|null
alternarPapel(pessoas, usuarioId, papel)       → Pessoas   // no papel atual = remove
```

**Implementação obrigatória:** `definirPapel` remove a pessoa das **duas** listas antes de
reinseri-la no papel pedido. É isso que faz migrar parceiro→responsável (e vice-versa) ser a
mesma operação, e o que garante o invariante abaixo.

### 11.3. Invariantes

1. Ninguém ocupa os dois papéis ao mesmo tempo
2. Atribuir o papel que a pessoa já tem **não a duplica**
3. Remover tira a pessoa das duas listas
4. O responsável principal se mantém estável quando parceiros entram e saem

### 11.4. Painel de pessoas (botão `+`)

Botão **único** para tudo. Conteúdo do painel:

- **Busca** por nome **ou** e-mail, tolerante a acento e caixa
- **Lista de pessoas**, com o **usuário atual sempre no topo**, marcado com `(você)`; os demais em
  ordem alfabética
- Dois botões por pessoa: 👑 **coroa** (responsável) e 👥 **grupo** (parceiro), com o papel atual
  destacado. Clicar no papel que a pessoa já ocupa a **remove da linha**

Normalização da busca:

```ts
texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
```

> Usar `\p{Diacritic}` com flag `u`, **não** um intervalo de caracteres combinantes literais —
> estes se corrompem conforme o encoding do arquivo.

### 11.5. Cartão de perfil (hover no avatar)

[`src/components/usuarios/UserHoverCard.tsx`](../src/components/usuarios/UserHoverCard.tsx)

Conteúdo, de cima para baixo:

1. Faixa em gradiente `indigo-500 → violet-500 → indigo-600`
2. Avatar grande sobreposto, com anel branco de 4px
3. Chip do papel — âmbar para responsável, indigo para parceiro
4. Nome (fonte display, negrito) e cargo
5. E-mail — link `mailto:` + botão **copiar**, que vira ✓ verde por 1,8 s
6. Hora corrente em **Brasília** (`Intl.DateTimeFormat` com `timeZone: 'America/Sao_Paulo'`)
7. Ações: **Tornar parceiro / Tornar responsável** e **Remover**

**Carência de 180 ms** ao sair do avatar, e o cartão se mantém aberto enquanto o ponteiro estiver
sobre ele. Sem isso o cartão fecha no caminho e os botões ficam inalcançáveis.

### 11.6. Avatares

Iniciais (primeiro + último nome) sobre cor **derivada do nome**: soma dos códigos dos caracteres
módulo 6, numa paleta fixa de indigo, emerald, amber, rose, sky e violet. A cor é estável por
pessoa entre sessões. Tamanhos: `sm` 28px, `md` 36px, `lg` 56px. Avatares em pilha usam anel
branco e sobreposição de `-6px`.

---

## 12. Agrupamento

Seletor na barra de ações, com quatro modos:

| Modo | Chave do grupo | Ordem dos grupos | Cor da barra |
|------|----------------|------------------|--------------|
| Sem agrupamento | — | — | — |
| **Status** | `contract.status` | **Ordem canônica da esteira** | cor do status |
| **Talento** | `talento.trim() \|\| '—'` | alfabética pt-BR | `bg-violet-500` |
| **Responsável** | `responsaveisIds[0] ?? ''` | alfabética pt-BR | `bg-indigo-500` |

- Grupos **vazios não aparecem**
- Sem responsável → título `Sem responsável`
- Agrupar por status usa a ordem da esteira, não a alfabética — o quadro lê como o fluxo real
- Com vários responsáveis, **o principal define o grupo**: cada contrato aparece uma única vez e a
  soma dos grupos continua batendo com o total

### 12.1. Cabeçalho de grupo

[`src/components/talentos/GrupoHeader.tsx`](../src/components/talentos/GrupoHeader.tsx)

Da esquerda para a direita: chevron que gira ao colapsar · barra vertical colorida · título em
fonte display · pill com `N contratos` · **mini-farol** à direita, com a contagem por cor e uma
**barra empilhada** proporcional (verde/amarelo/vermelho/cinza) daquele grupo.

Colapso é por chave, guardado num `Set` de grupos fechados.

---

## 13. Seleção e exclusão

| Ação | Comportamento |
|------|---------------|
| Checkbox da linha | Alterna a seleção |
| Checkbox do cabeçalho | Marca/desmarca **todos os visíveis** |
| Botão `Marcar Visíveis (N)` | Mesmo efeito |
| Rodapé | Aparece com a contagem quando há seleção |
| `Excluir em Lote` | Só habilita com seleção; confirma antes |
| Lixeira da linha | Exclui uma, confirmando com o **nome do talento** na pergunta |

> **Regra de segurança:** trocar de aba **limpa a seleção**. Sem isso, marcar linhas em "Todos",
> mudar para "Vencidos" e clicar em Excluir em Lote apagaria contratos fora da tela.

Toda exclusão passa por `window.confirm` — não há desfazer.

---

## 14. Arquitetura

```
src/
├─ App.tsx                            Layout: sidebar + página ativa
├─ types.ts                           TalentContract, Usuario, AppPage
├─ pages/
│  ├─ ContratosTalentos.tsx           Estado, CRUD e composição da página
│  └─ BacklogAgenciados.tsx           Página completa do Backlog ([08](08_backlog_e_integracoes.md))
├─ components/
│  ├─ Header.tsx                      Cabeçalho centralizado com hints
│  ├─ Sidebar.tsx                     Seção WORKSPACE + indicador deslizante
│  ├─ talentos/
│  │  ├─ ContratosTable.tsx           Abas, ações, grade, criação, agrupamento
│  │  ├─ StatusSelect.tsx             Etiqueta + paleta + efeito de troca
│  │  ├─ VigenciaCell.tsx             Farol da linha + barra de %
│  │  ├─ ResponsavelCell.tsx          Avatares + painel de pessoas
│  │  └─ GrupoHeader.tsx              Faixa de grupo com mini-farol
│  ├─ usuarios/
│  │  ├─ Avatar.tsx                   Iniciais + cor derivada do nome
│  │  └─ UserHoverCard.tsx            Cartão de perfil
│  └─ ui/
│     ├─ EditableCell.tsx             Célula estilo planilha
│     └─ Floating.tsx                 Painel flutuante em portal
└─ utils/
   ├─ vigencia.ts                     Farol, filtros e contagens
   ├─ pessoas.ts                      Papéis e invariantes
   ├─ talentosStatus.ts               13 status + paleta
   └─ dates.ts                        Formatação e data de hoje
```

**Stack:** React 19 · Vite 6 · Tailwind 4 · `motion` · `lucide-react`. Sem backend, sem router,
sem gerenciador de estado externo.

> **Árvore parcial.** Ela mostra o que este quadro usa; omite o `context/DadosProvider.tsx`
> (fonte única do estado — [04 §8](04_pagina_equipes.md)) e vários utils que entraram depois
> (`ids`, `busca`, `permissoes`, `colunas`, `persistencia`, entre outros).

### 14.1. Onde mora o estado

| Estado | Local | Motivo |
|--------|-------|--------|
| `contracts`, `filtro` | `ContratosTalentos.tsx` | Fonte da verdade da página |
| `draft`, `sort`, `selectedIds`, `agrupamento`, `gruposFechados`, `linhaEmEdicao` | `ContratosTable.tsx` | Estado de apresentação |
| Abertura de painéis e hover | Componente de cada célula | Local por natureza |

A página passa para a tabela a lista **já filtrada** pela aba, mais os `counts` calculados sobre a
lista completa.

---

## 15. Decisões técnicas não óbvias

Estas são as armadilhas que custaram tempo — replicar sem elas gera bugs sutis.

### 15.1. Painéis flutuantes precisam de portal

A grade vive dentro de `overflow-x-auto`. O CSS transforma o **eixo Y em `auto` junto**, então
qualquer popover posicionado com `absolute` é **cortado** nas últimas linhas.

Solução ([`Floating.tsx`](../src/components/ui/Floating.tsx)): renderizar em portal no `body`, com
`position: fixed` e coordenadas calculadas a partir do `getBoundingClientRect()` da âncora:

- recalcula em `scroll` (com `capture: true`, para pegar contêineres internos) e em `resize`
- **inverte para cima** quando não cabe embaixo
- limita horizontalmente à janela, com margem de 8px

### 15.2. Datas sem fuso

Ver §6.3. Vale para qualquer campo `yyyy-mm-dd` do projeto.

### 15.3. Classes do Tailwind precisam ser literais

Ver §5.3. Vale para cores de status, tons do farol e cores de avatar.

### 15.4. `id` por contador, não por tamanho da lista

Ver §4.3.

### 15.5. Seleção é limpa ao trocar de aba

Ver §13.

### 15.6. Contadores calculados sobre a lista completa

Ver §7.

---

## 16. Animações

Todas com `motion`. Duração curta, sem gratuidade.

| Elemento | Efeito |
|----------|--------|
| **Etiqueta de status (troca)** | Pop de escala `[1, 1.12, 0.98, 1]` + clarão branco + anel que expande para fora + texto novo deslizando. **Não dispara na primeira renderização** — só em mudanças reais |
| Linhas novas | Entram com fade e deslocamento de 6px |
| Avatares | Sobem 2px e crescem 8% no hover (spring) |
| Cartão de perfil | Fade + escala, 160 ms |
| Botão `+` de salvar | Gira 90° e cresce no hover |
| Lápis | Cresce e inclina −12° |
| Lixeira | Balança no eixo X |
| Chevron do grupo | Gira 90° ao colapsar (spring) |
| Barras do mini-farol | Largura animada por spring |
| Item ativo da sidebar | Barrinha indigo **desliza** entre itens (`layoutId`) |

---

## 17. Verificação

O repositório tem **33 suítes de regra** em `testes-regras/` (**1.451 asserções**) mais
**97 testes de UI** — medição de 04/08/2026, `rodar.sh`. As que cobrem este quadro:

| Suíte | Casos | Cobertura |
|-------|------:|-----------|
| `testeVigencia` | 16 | fronteiras 31/30/0/−1 dias, clamps, divisão por zero, cinza fora das abas, contagem estável às 23h59 |
| `testePessoas` | 13 | migração nos dois sentidos, sem duplicação, remoção, invariante dos dois papéis, estabilidade do principal |
| `testeBusca` | 9 | acento ↔ sem acento, maiúsculas, e-mail |

Ao replicar, esses são os casos que **devem** passar. `tsc --noEmit` limpo é pré-requisito.

---

## 17.1. Quem enxerga quais linhas

> **Mudança de 01/08/2026.** Antes, quem estava na equipe do quadro via **todas** as linhas e
> editava só as suas. Agora leitura e escrita andam juntas para o membro.

| Quem | Vê |
|------|-----|
| Dono / Admin | Todas as linhas |
| Responsável (equipe com o quadro) | Todas as linhas |
| Membro (equipe com o quadro) | **Só as linhas em que está nomeado** |
| Nomeado, fora da equipe do quadro | **Só as linhas em que está nomeado** |
| Sem equipe e sem nomeação | Nada — o quadro aparece com cadeado na barra lateral |

**Estar nomeado** = constar em `responsaveisIds` **ou** `parceirosIds`.

Os contadores do farol (`Todos · Vigentes · A vencer · Vencidos`) somam **em cima do que a pessoa
enxerga**. Contar o total real denunciaria, no número, contratos que a grade não mostra.

Criar linha exige a porta da **equipe**: quem entrou só por nomeação vê a própria linha e nada
além. Regra completa em [`05_perfis_usuarios.md` §3.4](05_perfis_usuarios.md).

---

## 17.2. Vínculo com Talentos

Este quadro abrange **todos** os contratos tocados. A página [Talentos](06_pagina_talentos.md)
guarda o cadastro das pessoas por trás deles — exclusivos **e** interveniência, distinguidos por
um campo `tipo`.

### A coluna Talento é uma referência

Não é texto livre. A célula sugere os talentos já cadastrados **e** os nomes já digitados em
outros contratos, e alerta quando o nome novo se parece com um existente — é o que impede o mesmo
talento de virar "Gil do Vigor" numa linha e "Gilberto do Vigor" noutra.

Escrever um nome que não existe **abre a ficha do talento na hora**, marcada como pendente. Antes,
o nome ficava solto e o cadastro só surgiria se alguém lembrasse de criá-lo à mão.

### Selo de vínculo na linha

Abaixo do nome, o estado do elo:

| Estado | Sinal |
|--------|-------|
| Ligado a exclusivo | ⭐ `exclusivo` |
| Ligado a interveniência | ● `interveniência` |
| Ficha criada por este contrato, ainda vazia | ⚠ `cadastro pendente` |
| Nome sem ficha — dado antigo ou ficha excluída | ⚠ `sem cadastro` |

Regras completas em [`07_visoes_e_relacoes.md`](07_visoes_e_relacoes.md) §10-11.

O campo **Talento** continua sendo **texto livre** — contrato de interveniência não tem ficha e
não pode ser barrado por isso. O que acontece por baixo:

- Ao criar ou editar a célula Talento, o nome é comparado (sem acento, sem caixa) com os talentos
  cadastrados. Casando, `talentoId` é preenchido automaticamente; trocando por outro nome, é
  limpo.
- Renomear o talento na ficha **propaga** o novo nome para os contratos vinculados por id.
- Excluir a ficha **não apaga contrato nenhum**: eles perdem só o `talentoId` e mantêm o nome
  escrito.

Regra de precedência ao reunir os contratos de um talento: **id vence nome**. Contratos antigos,
criados antes de a ficha existir, ainda casam por nome; um contrato já vinculado a outro id nunca
é capturado por homonímia.

---

## 17.3. Busca

Campo na barra de ações, à esquerda da contagem. Varre:

| Campo | Exemplo de uso |
|-------|----------------|
| Talento | `marina` |
| Descrição do contrato | `coca` |
| Número | `CTR-2026-014` |
| Status | `concluído` |
| **Vigência calculada** | `vencido` |
| **Nome ou e-mail de quem está na linha** | `camila` — responsáveis **e** parceiros |

Regras:

- Ignora acento e caixa (`NFD` + `\p{Diacritic}`)
- **Termos múltiplos se somam**: `campanha verao` exige os dois na mesma linha
- `Esc` limpa · o contador mostra `N de M` dentro da aba do farol aberta
- Buscar **limpa a seleção** — excluir em lote a partir de uma lista filtrada que já mudou é como
  se perde registro

Ordem de aplicação: **farol primeiro, busca depois**. Os contadores das abas medem o quadro
inteiro que a pessoa enxerga; o `N de M` mede dentro da aba aberta.

> **Limitação registrada (04/08/2026):** a busca deste quadro **não respeita colunas ocultas** —
> `filtrarContratos` (`busca.ts:35-58`) varre os campos fixos sem consultar `colunasOcultas`,
> contradizendo a regra de [07 §5](07_visoes_e_relacoes.md), que vale para Talentos e Backlog.
> Ver §18.1.

---

## 18. Fora de escopo (estado atual)

| Item | Situação |
|------|----------|
| Persistência | ✅ **local** — `localStorage`, formato **v12** (mudou a forma de um dado, sobe a versão e o seed volta). Além dos dados, guarda preferências de tela — ex.: o fluxo recolhido do Backlog (`backlogFluxoRecolhido`). Falta o **banco** |
| Autenticação | ❌ Sessão trocada pelo seletor "Entrar como (demo)" |
| Backend / API | ❌ Removido do projeto |
| Bloqueio de transição de status | ❌ Por decisão — qualquer status leva a qualquer outro |
| Histórico e anexos | ❌ |
| Exportação | ❌ neste quadro — o **Backlog** exporta `.xlsx` real desde 04/08/2026 ([07 §5](07_visoes_e_relacoes.md)) |
| Fases da esteira | ❌ Removidas — o filtro hoje é por vigência, não por fase |

### 18.1. Limitações conhecidas (04/08/2026)

Registradas para não passar por funcionamento — corrigir no código, não no texto:

| Limitação | Onde | Efeito |
|-----------|------|--------|
| Contador de id em `useRef(1)` | `ContratosTalentos.tsx:31` | Contraria a regra de `utils/ids.ts` (`proximoNumeroFormatado`): com contratos persistidos ou de seed, o primeiro criado pode nascer com id repetido — e ids repetidos fundem linhas na reconciliação do React |
| Busca ignora colunas ocultas | `busca.ts:35-58` | `filtrarContratos` não recebe `colunasOcultas`; quem tem coluna borrada ainda busca pelo valor dela — o oráculo que [07 §5](07_visoes_e_relacoes.md) proíbe |
| Ocultar coluna deste quadro não tem efeito | `ContratosTable.tsx` | A grade mantém `COLUMNS` própria, sem os ids do catálogo — a configuração registra, a célula não borra ([07 §6](07_visoes_e_relacoes.md)) |

---

## 19. Próximos passos sugeridos

1. **Banco de dados** — a persistência local (v12) existe; falta o servidor ([01 §10](01_visao_produto.md))
2. Alerta de inconsistência: contrato com data vencida mas status ainda em tramitação, com ação em
   lote para movê-los a `Vencido`
3. Ordenar pela coluna Vigência (hoje não é ordenável) para priorizar renovações
4. Corrigir as limitações da §18.1 — contador de id e busca/ocultação por coluna
5. Definir o formato do número do contrato e restaurar o placeholder de exemplo
