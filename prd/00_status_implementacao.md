# PRD 00 — Status de Implementação
## Plataforma de Gestão e Talentos — Globo VIU Agenciamento
**Versão:** 24.2 | **Data:** 12/08/2026 | **Base:** código em `src/`

[← Índice da documentação](README.md) · *Retrato factual do repositório*


> Retrato factual do repositório. Descreve o que está escrito em código e o que está
> efetivamente acessível na interface.

---

## 1. Resumo Executivo

| Indicador | Situação |
|-----------|----------|
| Superfície de código | 24.205 linhas TS/TSX em 96 arquivos |
| Páginas | 6 — **todas funcionais**: Backlog, Contratos, Talentos, Equipes, Usuários e Meu Perfil |
| Controle de acesso | ✅ Dono + 3 perfis + escopo por equipe + filtro de linhas por nomeação + **permissão por aba e por coluna** + concessões com janela |
| Onboarding | ✅ Convite nominal por link (24h, uso único), link coletivo de equipe com rotação diária, conta única por e-mail, domínios autorizados — **os três fluxos por link só passaram a funcionar em 03/08** (§5.6) |
| Autenticação | ⏸️ Decidido **SSO corporativo**, sem senha — simulado até existir backend |
| Verificação de tipos | ✅ `tsc --noEmit` sem erros, agora em **`strict: true`** com `noUnusedLocals` · build de produção OK |
| Testes | ✅ 36 suítes · 1.544 verificações · **0 falhas** + 144 testes de UI (ver §5) |
| **Confirmação e desfazer** | ✅ Diálogo próprio nos **12 pontos** de confirmação (o `window.confirm` saiu do produto) + **`Ctrl+Z`** no dado dos três quadros (§5.13) |
| **Legibilidade** | ✅ **Tipografia aprovada e congelada em 11/08/2026** ([03 §1.2](03_padroes_ui.md)) — escala em `rem`, raiz fluida, régua pessoal, fontes por SO, contraste AA e movimento reduzido. **Não se altera sem pedido explícito** |
| Layout por faixa de largura | ❌ Débito nº 11 — a grade ainda rola na horizontal num notebook de 1366px |
| Exportação de Dados | ✅ Exportação nativa em **`.xlsx` (Excel)** via Blob ArrayBuffer em **Backlog**, **Contratos** e **Talentos** |
| Modelo de dados | ✅ `prisma/schema.prisma` — 18 tabelas e 25 enums, `prisma validate` OK e SQL de migração gerado (§8) |
| Escopo desta fase | Front-end + regras de negócio + **o modelo de dados, executável** |
| Fora de escopo | Autenticação, servidor e API — o banco já tem esquema, falta quem o sirva |

**Contexto:** em 01/08/2026 o projeto foi **reiniciado por decisão do produto**. A implementação
anterior (~6.900 linhas: quadro de orçamentos, Kanban, calendário, analytics, modais de
integração e o proxy Express para SharePoint/Gemini) foi removida, mantendo-se apenas o esqueleto
e a documentação. A reconstrução começou pela página de Contratos de Agenciados.

---

## 2. Estado por página

A navegação tem dois blocos: **Workspace** (operação) e **Administração** (gestão da plataforma).

| Bloco | Página | Rota interna | Situação |
|-------|--------|--------------|----------|
| Workspace | **Backlog de Agenciados** | `backlog` | ✅ Funcional — 12 abas temáticas funcionais (Demanda, Escopo, Cliente, Agência, Talento, Entrega, Produção, Conteúdo, Audiência, Financeiro, Pagamento, Jurídico, Links, Time); auditoria de UX e testes de UI 100% aprovados |
| Workspace | **Contratos de Agenciados** | `contratos` | ✅ Funcional — ver [`02_quadro_talentos.md`](02_quadro_talentos.md) |
| Workspace | **Talentos** | `talentos` | ✅ Funcional — exclusivos **e** interveniência; ver [`06_pagina_talentos.md`](06_pagina_talentos.md) |
| Administração | **Equipes** | `equipes` | ✅ Funcional — ver [`04_pagina_equipes.md`](04_pagina_equipes.md) |
| Administração | **Usuários** | `usuarios` | ✅ Funcional — 4 abas; ver [`05_perfis_usuarios.md`](05_perfis_usuarios.md) |
| Rodapé | **Meu Perfil** | `perfil` | ✅ Funcional — dados próprios, foto e troca de e-mail confirmada |

> **Atenção ao histórico:** a rota `talentos` designava o quadro de **Contratos** até 01/08/2026.
> Hoje `contratos` é o quadro de contratos e `talentos` é a página de talentos exclusivos.
> Documentos e fixtures anteriores a essa data usam o nome antigo.

O que cada pessoa enxerga depende do **perfil de sistema** e das **equipes** de que participa —
matriz completa em [`05_perfis_usuarios.md`](05_perfis_usuarios.md).

> Padrões visuais e de construção em [`03_padroes_ui.md`](03_padroes_ui.md) — leitura obrigatória
> antes de criar qualquer tela nova. Camadas de acesso e relações entre tabelas em
> [`07_visoes_e_relacoes.md`](07_visoes_e_relacoes.md).

### 2.1. Backlog de Agenciados

| Recurso | Situação |
|---------|----------|
| **Mapa do fluxo** acima da tabela, clicável, com totais de fechamento | ✅ |
| Pipeline de 9 status, com **máquina de estados** — o status só anda pelo processo | ✅ |
| **Encerramento automático** aos 20 dias parados, com aviso antes | ✅ |
| Lista mostra **só o que está em andamento**; finalizados no cabeçalho (30 dias) | ✅ |
| **Quadro ocupa a tela**, com lista rolável e cabeçalho fixo — nos três quadros | ✅ |
| **SLA de triagem em 5 dias úteis**, com farol | ✅ |
| **9 abas** no vocabulário da operação, na ordem do trabalho ([08 §6](08_backlog_e_integracoes.md)) | ✅ |
| **Aba Demanda** — 12 colunas: identificação, classificações, Output, Impacto, Captação e Prioridade | ✅ |
| **Aba Escopo** — o pedido em **texto livre**, mais Data de Veiculação | ✅ |
| **Aba Cliente** — as duas metades: Talento, Exclusivo e Origem; Marca, Segmento e Categoria | ✅ |
| **Aba Produção** — Edição, **Conteúdo**, **Audiência** e Valor de Produção | ✅ |
| **Aba Time** — as **8 áreas** do projeto numa tela só ([§5.7](#57-rodada-de-ajustes-do-backlog--03082026)) | ✅ |
| **Seção Financeiro** — restrita: valores, comissões, **parcelas e PEP** (absorveu a Pagamento) | ✅ |
| **Aba Jurídico** — restrita: razão social e CPF/CNPJ da ficha, contrato e fechamento | ✅ |
| **Aba Links** — quatro endereços externos | ✅ |
| **Nenhuma aba vazia**, e nenhuma só com espelhadas | ✅ |
| **Prazo como barra na borda da linha** — sem coluna Deadline em aba nenhuma | ✅ |
| **Quadro cabe na tela**: fluxo recolhível, linhas densas, cabeçalho denso, fonte fluida | ✅ |
| **Duplicar projeto** — mesmo trabalho, outro talento; sem vínculo entre as linhas | ✅ |
| **Duplicar pergunta antes** — diálogo com o que a cópia leva ([08 §6.6](08_backlog_e_integracoes.md)) | ✅ |
| **Ctrl+Z** desfaz edição, criação, duplicação, exclusão e status ([03 §8.2](03_padroes_ui.md)) | ✅ |
| **Busca**: Projeto, Marca e Talento sempre, mais as colunas da **aba aberta** | ✅ |
| Segmento, categoria e contatos vêm do **cadastro da marca**, e a célula escreve nele | ✅ |
| Campos de escolha: Input · Origem comercial · Tipo · Origem do talento | ✅ |
| **Exclusivo** derivado do vínculo do talento, somente leitura | ✅ |
| **Rodapé de totais**: farol, exclusivos e distribuição de input | ✅ |
| ~~6 filtros~~ — removidos: duplicavam os cards do cabeçalho | ✅ |
| **Tooltip do sistema**, com o dado cortado e só quando o texto não coube | ✅ |
| Tela de cadastro de Clientes e Fornecedores | ⏸️ Página criada em branco — ver §2.1.1 |
| Responsáveis pelas **mesmas 6 áreas** dos Talentos | ✅ |
| Prioridade (alta, média, baixa) | ✅ |
| **Contrato de ingestão** para e-mail e Salesforce, com deduplicação | ✅ regra pronta e testada |
| Transporte das integrações (endpoint) | ⏸️ Aguarda backend |
| Feriados no cálculo do SLA | ❌ Só sábado e domingo |
| Kanban, calendário e anexos | ❌ |

### 2.1.1. Cadastro de Clientes

| Recurso | Situação |
|---------|----------|
| Página criada e na barra lateral | ✅ Em branco, de propósito |
| Marcas como dado, alimentando as colunas do Backlog | ✅ 19 no seed, 3 pendentes |
| Estrutura da tela (colunas) | ❌ A definir com a operação — a dependência de agência caiu (§5.7) |
| ~~Cadastro de agências~~ | ✅ **Encerrado em 03/08**: a operação decidiu não trabalhar com agência |

### 2.2. Contratos de Agenciados

| Recurso | Situação |
|---------|----------|
| Grade com 10 colunas (inclui descrição do contrato e ações) | ✅ |
| Criação inline, com equipe definida antes de salvar | ✅ |
| Edição inline estilo planilha (texto e datas) | ✅ |
| 13 status canônicos em etiqueta colorida | ✅ |
| Farol de vigência com alerta de 30 dias | ✅ |
| Filtro por farol (4 abas com contadores) | ✅ |
| Agrupamento por Status, Talento ou Responsável | ✅ |
| Múltiplos responsáveis e parceiros, com migração entre papéis | ✅ |
| Vínculo automático com a ficha do talento, com selo na linha | ✅ |
| **Busca** por talento, contrato, número, status, vigência e pessoa | ✅ |
| Coluna Talento como **referência**, com alerta de nome parecido | ✅ |
| **Nome sem cadastro abre a ficha do talento**, marcada como pendente | ✅ |
| Exclusão individual e em lote, com confirmação | ✅ |
| Persistência | 🟡 Salva no navegador (localStorage) — não é banco, cada pessoa tem sua cópia |

### 2.3. Talentos

| Recurso | Situação |
|---------|----------|
| **Exclusivos e interveniência no mesmo cadastro**, separados por `tipo` | ✅ |
| 6 abas de colunas: Identificação · Contato · Redes · Financeiro · Responsáveis · Contratos | ✅ |
| **Permissão por aba** — Contato e Financeiro exigem liberação à equipe | ✅ |
| **Busca** que respeita as abas **e as colunas** visíveis | ✅ |
| Colunas Empresa, Local e Razão social como **referência** | ✅ |
| Criação inline só com o nome, recusando duplicidade | ✅ |
| Edição inline estilo planilha em todos os campos | ✅ |
| 6 redes sociais, guardando só o identificador | ✅ |
| Dados comerciais: razão social, CNPJ, faturamento, pagamento, banco | ✅ |
| 6 áreas de responsabilidade, cada uma com **uma ou mais pessoas** da equipe da área | ✅ |
| Linha de criação preenche **todas as colunas** da aba de uma vez | ✅ |
| **Filtros clicáveis**: Todos · Exclusivos · Interveniência · Pendentes | ✅ |
| Resumo de contratos por farol, com o próximo vencimento | ✅ |
| Exclusão individual e em lote, preservando os contratos | ✅ |
| Ordenação por coluna | ✅ |
| Agrupamento (como nos Contratos) | ❌ |
| Significado operacional de **GP** | ⏸️ Pendente com a operação |
| Foto do talento | ❌ Só iniciais |

### 2.4. Equipes e Usuários

| Recurso | Situação |
|---------|----------|
| Criar equipe, definir quadros visíveis, cadastrar membros | ✅ |
| Responsável temporário com prazo, expirando **na leitura** | ✅ |
| Saída da equipe preservando histórico nos quadros | ✅ |
| Marcar qual área de Talentos a equipe atende | ✅ |
| **Liberar abas de dado sensível** (Contato, Financeiro) | ✅ |
| **Ocultar colunas** por equipe, com borrão na célula — nos dois quadros | ✅ |
| Aba de **Configuração** com uma aba por quadro e interruptores | ✅ |
| Convite nominal (24h, uso único, ligado ao e-mail) | ✅ |
| Link coletivo por equipe, token aleatório com rotação diária | ✅ |
| Domínios autorizados editáveis (`@g.globo`, `@globo.com`, `@viu.com.br`) | ✅ |
| Concessões administrativas com janela de tempo | ✅ |
| "Ver como" — simulação de sessão com escrita bloqueada | ✅ |
| Meu Perfil: dados próprios, foto e troca de e-mail confirmada | ✅ |
| Envio real de e-mail | ⏸️ Camada pronta (`services/email.ts`), aguarda endpoint no backend |

---

## 3. Inventário de arquivos

93 arquivos TS/TSX em `src/`, 21.142 linhas. Os maiores:

| Arquivo | Linhas | Papel |
|---------|-------:|-------|
| `context/DadosProvider.tsx` | 1.731 | Fonte única de dados e todas as mutações validadas |
| `components/backlog/BacklogTable.tsx` | 1.512 | 12 abas, fluxo, criação e grade |
| `utils/colunas.ts` | 1.341 | Catálogo de colunas dos três quadros |
| `utils/oportunidades.ts` | 810 | Catálogos, filtros, resumos e ordenação do Backlog |
| `components/talentos-exclusivos/TalentosTable.tsx` | 768 | Abas de colunas, busca, grade e criação |
| `types.ts` | 706 | Contratos de dados de toda a aplicação |
| `components/talentos/ContratosTable.tsx` | 650 | Abas do farol, busca, ações, grade, agrupamento |
| `data/oportunidades.ts` | 573 | Seed do Backlog — dois exemplos por status |
| `utils/permissoes.ts` | 534 | **Todas** as regras de acesso, em funções puras |
| `components/equipes/MembrosTable.tsx` | 520 | Membros da equipe, papéis e situação |

### Os que nasceram na rodada de 11/08/2026

| Arquivo | Linhas | Papel | Documentado em |
|---------|-------:|-------|----------------|
| `components/ui/Dialogo.tsx` | 420 | **Diálogo do sistema — um só para o app.** Provider + `confirmar`/`pedirTexto`/`perguntar`/`avisar` | [03 §8.1](03_padroes_ui.md) |
| `utils/historico.ts` | 250 | Regras puras do desfazer: instantâneo, descrição da mudança, pilhas, atalhos | [03 §8.2](03_padroes_ui.md) |
| `components/ui/AvisoHistorico.tsx` | 85 | O aviso do desfazer, com botão Refazer | [03 §8.2](03_padroes_ui.md) |
| `testes-regras/testeHistorico.mjs` | — | 51 verificações das regras do histórico | §5 |
| `testes-ui/confirmacao-e-desfazer.test.tsx` | — | 19 testes de UI: diálogo, foco, atalhos, aviso | §5.13 |

### Os que nasceram na rodada anterior

| Arquivo | Papel | Onde está documentado |
|---------|-------|----------------------|
| `components/ui/Dica.tsx` | Tooltip do sistema — um só para o app | [03 §7.9](03_padroes_ui.md) |
| `components/backlog/EtiquetaSelect.tsx` | Etiqueta colorida de lista fechada | [03 §10](03_padroes_ui.md) |
| `utils/marcas.ts` | Leitura do cadastro de marcas pela linha | [08 §6](08_backlog_e_integracoes.md) |
| `pages/CadastroClientes.tsx` | Página de cadastro — em branco | §2.1.1 |
| `testes-ui/` | 144 testes de UI, em cinco arquivos | §5.3 |
| `components/ui/CelulaNumero.tsx` | Quantidade inteira — vazio ≠ zero | [08 §6](08_backlog_e_integracoes.md) |
| `components/ui/CelulaData.tsx` | Data em pt-BR, guardada em ISO | [08 §6](08_backlog_e_integracoes.md) |
| `components/ui/CelulaLink.tsx` | Endereço externo — mostra o destino, não a URL | [08 §6](08_backlog_e_integracoes.md) |
| `components/usuarios/AbaAcessos.tsx` | 432 | Concessões, equipes e simulação de acesso |
| `utils/colunas.ts` | 428 | Catálogo único de colunas dos três quadros |
| `components/usuarios/AbaPessoas.tsx` | 407 | Base de pessoas, perfis e edição em lote |
| `utils/ingestao.ts` | 376 | Contrato de entrada por e-mail e Salesforce |
| `pages/MeuPerfil.tsx` | 326 | Dados próprios, foto, troca de e-mail |

> As tabelas encolheram ~200 linhas cada quando a criação virou um gesto só: saíram a linha de
> rascunho, a barra de montagem e a conversão de campos ([03 §7.8](03_padroes_ui.md)).

### Distribuição

| Pasta | Arquivos | Papel |
|-------|---------:|-------|
| `utils/` | 26 | Regras puras — testáveis e traduzíveis em política de banco |
| `components/` | 47 | Interface, agrupada por quadro + `ui/` reutilizável |
| `pages/` | 10 | Uma por rota; monta dados e delega |
| `data/` | 5 | Seeds de demonstração |
| `context/` | 1 | Estado único |
| `services/` | 1 | Contrato de e-mail (sem implementação — ver [08 §11](08_backlog_e_integracoes.md)) |

> **Um arquivo órfão, mantido de propósito:** `components/backlog/SimNaoSelect.tsx` perdeu o uso
> quando Interveniência virou derivada e somente leitura (§5.6). Continua no repositório porque é
> um seletor sim/não genérico e a próxima coluna booleana o reaproveita — apagar e reescrever é
> mais caro que deixar. Se nenhuma aparecer até o fim da Fase 1, ele sai.

> Os arquivos de tabela são grandes porque concentram abas, barra de ações, criação e grade de um
> quadro inteiro. Fatiá-los é candidato a refatoração, **não** urgência: a alternativa —
> componentes de célula espalhados — dificultaria mais a leitura do que a extensão resolve.

---

## 4. Stack e execução

| Item | Valor |
|------|-------|
| Runtime | Node 20+ (validado no 22.20) |
| Front | React 19 · Vite 6 · Tailwind 4 |
| Bibliotecas | `motion`, `lucide-react`, `recharts` (instalada, ainda sem uso) |
| Modelo de dados | **Prisma 7** — `prisma/schema.prisma`, provider `postgresql` |
| Backend | **Nenhum** — há esquema, não há servidor |
| TypeScript | `strict: true`, `noUnusedLocals`, `noUnusedParameters` — desde 03/08 (§5.6) |
| Comandos | `npm run dev` · `npm run build` · `npm run typecheck` · `npm run test:ui` |
| Porta | **3001** (`strictPort`) |
| Bundle | 995 kB (294 kB gzip) — acima do aviso de 500 kB do Vite; o SheetJS responde pela maior parte ([09 §6](09_fundacoes_tecnicas.md)) |

> A porta 3000 foi liberada para o projeto `viu-saas`, que roda em paralelo na mesma máquina.
> Enquanto os dois coexistirem, manter portas distintas evita servir o app errado.

---

## 5. Testes

36 suítes de regras puras em **`testes-regras/`, dentro do repositório**, executadas compilando
`src/utils/` e `src/data/` para JS e rodando no Node, via `rodar.sh`:

| Suíte | Cobre |
|-------|-------|
| `testePermissoes` | Nível de acesso, edição, exclusão, criação |
| **`testeHistorico`** | O desfazer: o passo guardado é o estado **anterior**, simetria entre desfazer e refazer, teto da pilha descartando pela base, atalhos, e a guarda que preserva o `Ctrl+Z` dentro de campo de texto |
| `testeVisoes` · `testeColunas` | Permissão por aba e por coluna; pesos somando o total fixo; **as espelhadas são a mesma coluna** entre abas; colunas de área declarando a sua |
| `testeCliente` | Segmento, categoria e contatos lidos do cadastro da marca; a ponte nome → cadastro; captação como lista fechada |
| `testeDuplicacao` | O contrato da duplicação: o que se herda, o que se zera, e por que o status final volta ao começo |
| `testeVisualizacao` | "Ver como" — leitura sem escrita |
| `testeConcessoes` | Capacidades administrativas, com e sem prazo |
| `testeEquipes` · `testeGestaoEquipe` | Equipes, papéis, saída sem perda de histórico |
| `testeOnboarding` · `testeLinkEquipe` | Convite nominal, link coletivo, domínios |
| `testePerfilProprio` · `testePessoas` | Dados próprios, troca de e-mail, situação |
| `testeTalentos` · `testeVigencia` | Cadastro, tipos, farol de vigência |
| `testeReferencias` | Semelhança entre grafias — "Gil do Vigor" × "Gilberto do Vigor" |
| `testeBusca` | Busca respeitando aba e coluna |
| `testeFluxo` | Máquina de status, SLA, encerramento aos 20 dias |
| `testeDeclinio` | Motivo do declínio como qualificador; quebra do card; leitura de moeda BR |
| `testeOrdenacao` | Ordem canônica de status e prioridade; seleção ∩ visível |
| `testeNavegacao` | Página restaurada do `localStorage`, validada contra o catálogo |
| `testeIngestao` | Dedup, mesclagem, idempotência |
| `jornada` · `jornadaVisoes` · `jornadaInterligacao` | Percorrem o **seed real** ponta a ponta |
| `jornadaBacklog` | O quadro inteiro: mapa, cards, filtros e faróis sobre o seed |
| `testeMarcas` | Normalização de nome, lista cobrindo o Backlog, criar × escolher |
| `testeIds` | Geração de id sem colisão — buracos, prefixos, F5, exclusão |
| `testeInterveniencia` | Derivação do vínculo do talento; congelamento por etapa |
| **`qaBacklog`** | **Varredura de estado impossível** — ver §5.2 |
| `matrizPerfis` | Matriz completa pessoa × quadro × aba × coluna × linha |

**`matrizPerfis`** imprime a matriz completa de acesso — cada pessoa × cada quadro, aba, coluna e
linha — e verifica as invariantes do modelo em vez de números fixos:

- Nível e `podeVerPagina` sempre concordam
- Sem acesso ao quadro ⇒ zero linhas e nada de criar
- `nomeado` nunca mostra mais que `total` mostraria
- Nenhuma coluna **fixa** foi ocultada para ninguém
- A busca só acha o dado sensível de quem enxerga aquela coluna
- Excluir ⇒ editar; membro nunca exclui; escrita ⊆ leitura
- Férias mantém acesso, inativo e desligado cortam — **inclusive para o dono**
- "Ver como" não muda a leitura e bloqueia toda escrita
- Integridade do seed: sem referência órfã, sem área com duas equipes, ids únicos

> Foi ela que encontrou o furo de permissão descrito em §5.1 — **nenhuma das outras 18 suítes
> da época pegou**, porque todas montavam fixtures em que perfil e papel coincidiam.

> **O runner conta suíte morta como falha.** Contar só linhas `FALHA` deixava passar arquivo que
> nem chegava a rodar por erro de importação — falha silenciosa, a pior categoria. Ele também
> recompila antes de cada execução: sem isso a suíte testaria o `.js` da rodada anterior.

**Estado atual: 1.544 verificações em 36 suítes de regra, mais 144 testes de UI. 0 falhas.**

> A contagem **caiu** de 1.353 em 03/08, e isso é esperado: a rodada de ajustes do Backlog (§5.7)
> removeu quatro colunas de contagem, duas abas e uma coluna redundante. Menos superfície, menos
> asserções. `testeInterveniencia` virou `testeExclusividade`, com o sentido invertido.

### Como uma correção é dada por concluída

1. **Escrever o teste antes de declarar pronto.** Foi assim que apareceram a divergência entre as
   duas listas de status ([03 §7.7](03_padroes_ui.md)) e o defeito de leitura de moeda
   ([09 §2](09_fundacoes_tecnicas.md)) — nenhum dos dois estava no alvo da investigação.
2. **Verificar revertendo.** Reintroduz-se o defeito e conta-se quantas asserções ficam vermelhas.
   Um teste que passa com e sem a correção não testa nada. Os números medidos nesta rodada: 3
   (permissões), 6 (ordenação), 8 (rascunho).
3. **Medir, não estimar.** Toda contagem desta documentação vem de execução.

### 5.3. Os testes de UI — `testes-ui/`, dentro do repositório

**144 testes** sobre a aplicação montada: `DadosProvider` verdadeiro, `BacklogTable` verdadeiro,
nenhum mock. Vitest + jsdom + Testing Library. Em cinco arquivos:

| Arquivo | Testes | O que cobre |
|---|---:|---|
| `backlog.test.tsx` | 107 | a grade, o fluxo, as etiquetas, as colunas de pessoas |
| `confirmacao-e-desfazer.test.tsx` | 19 | o diálogo do sistema e o Ctrl+Z (desde 11/08) |
| `tipografia.test.tsx` | 9 | a escala, a raiz fluida e a régua da grade |
| `aparencia.test.tsx` | 5 | a régua pessoal de Meu Perfil |
| `documentacao.test.tsx` | 4 | **o PRD contra o código** (desde 12/08) |

> **Três desses arquivos não clicam em nada: eles leem o código-fonte.** `tipografia` procura
> tamanho cravado em pixel e faz a conta das camadas da grade; `documentacao` confere o PRD contra
> o repositório. São testes de **convenção**, e existem porque convenção quebrada não falha em
> lugar nenhum — só engana quem chega depois.

**Por que existem, se há 1.503 verificações de regra.** As suítes puras provam que a regra está
certa; não provam que ela chegou à tela. Os defeitos que estes testes acharam são todos disso:

| Defeito | Por que nenhuma suíte de regra pegaria |
|---------|---------------------------------------|
| `EditableCell` nunca chamava `focus()` | A regra de edição estava certa. O cursor é que ficava no `body` |
| O painel normalizava mais fraco que a entidade | `garantirMarca` reconhecia "coca cola"; o painel oferecia **criar** |
| **A confirmação de exclusão não existia no `jsdom`** | A regra não tem confirmação — ela é da tela. E `window.confirm` devolvia `undefined`, deixando tudo passar (§5.13) |
| **O passo do desfazer chegava depois da tecla** | A pilha estava correta; o **momento** do registro é que não era (§5.13) |

> **O relógio da suíte é fixo em 04/08/2026** (`testes-ui/setup.ts`). O seed tem datas absolutas e
> o produto arquiva o que fica 20 dias parado — sem fixar, a suíte falha mais a cada dia que passa,
> sem que uma linha de código mude (§5.13).

O que eles cobrem hoje:

| Grupo | Verifica |
|-------|----------|
| Abas | As 12 na ordem da operação; a vazia explica em vez de mostrar grade |
| Colunas | Ordem, Ações sempre no fim, espelhadas renderizando fora da aba de origem |
| Fluxo | Status avança, congelado bloqueia edição mas não o fluxo |
| Listas cadastradas | Painel abre, grava, e **não** oferece criar o que já existe com outra grafia |
| Dado derivado | Editar o segmento alcança todos os projetos da marca; sem ficha, a célula diz qual é o problema |
| Tooltip | A dica é o **valor**, não o rótulo da ação; o `title` nativo não coexiste |
| Valores | Texto livre aceito, incluindo "a definir" |

> Rodam com `npm run test:ui`.

---

> **As duas suítes vivem no repositório.** As de regra em `testes-regras/` (`bash rodar.sh`), as de
> UI em `testes-ui/` (`npm run test:ui`). Eram um diretório temporário até 02/08 — o runner agora
> compila o `src` do próprio projeto, e o comentário no topo de `rodar.sh` explica por quê: as 31
> suítes se perderiam numa limpeza de disco. **Falta CI**, que depende de versionar em Git (§6).

---

## 5.2. Varredura de estado impossível — `qaBacklog`

As demais suítes verificam que **cada regra faz o que promete**. Esta pergunta o contrário:

> *Existe alguma combinação de dados que o sistema aceita e que não deveria existir?*

É a varredura que pega contradição entre regras que, isoladas, estão certas — e foi assim que as
sete linhas com interveniência divergente apareceram.

### O que ela procura

| Categoria | Invariante |
|-----------|------------|
| **Estado da linha** | interveniência bate com a ficha · motivo só em declinado · classificação da lista ou ausente · prazo depois da entrada · `talentoId` resolve · marca cadastrada |
| **Máquina de estados** | todo destino existe · todos os status alcançáveis desde Entrada · **nenhuma etapa congelada é beco** · ativas e desfechos particionam o catálogo |
| **Cabeçalho × lista** | cada card mostra o mesmo número da lista que abre · a quebra de declínios soma o card |
| **Filtros e rodapé** | triagem e andamento particionam · atrasada só em triagem · manual nunca precisa conferência · o rodapé não perde nem duplica linha |
| **Leitura** | todo status rende rótulo · todo SLA rende tom e texto — nada exibe `undefined` |
| **Criação** | o próximo id está livre · a linha nova aparece na lista de abertura |

### Verificada plantando defeito

Com duas contradições introduzidas de propósito — interveniência divergindo da ficha, e motivo de
declínio num status que não é declinado — a suíte acusa as duas e nomeia as linhas:

```
FALHA interveniência bate com a ficha -> ["op5"]
FALHA motivo só em declinado          -> ["op1"]
```

Um QA que passa com o defeito presente não é QA.

---

## 5.4. Auditoria de código — 02/08/2026

Feita depois de definir as doze abas, a pedido do produto: *"faz uma auditoria, testes, e
usabilidade de todo código"*. Cinco defeitos, todos corrigidos e todos com teste que os impede de
voltar.

### Furo: um buraco no array de áreas derrubava a tela

```ts
    chip: 'bg-rose-50 …',
  },,          // ← vírgula dupla
  {
```

Em JavaScript, `[a,,b]` não é erro de sintaxe: cria um **buraco** que vira `undefined` ao iterar.
`getArea` fazia `AREAS.find((area) => area.id === id)` e quebrava no elemento vazio — **tela branca
ao abrir qualquer aba do Backlog**.

Nem `tsc --noEmit` nem o `vite build` acusam: para o TypeScript, o tipo do array continua correto.
Quem pegou foi o teste de UI que percorre as doze abas clicando.

> **Verificação que ficou:** `AREAS.every((a) => a && a.id)`.

### Duas áreas com a mesma cor

Jurídico nasceu com o `chip` de Produção. A etiqueta de área existe para **identificar** — duas
iguais fazem exatamente o contrário.

> **Verificação:** `new Set(AREAS.map((a) => a.chip)).size === AREAS.length`.

### Colunas de pessoas sem ninguém para escolher

As áreas Pagamento e Jurídico foram criadas, mas nenhuma equipe as atendia. Os candidatos de uma
coluna de pessoas saem da equipe da área — o painel abriria **vazio**. Uma coluna que não funciona
parece defeito porque é.

O seed ganhou as equipes *Pagamentos* e *Jurídico*, e `jornadaVisoes` passou a exigir equipe para
**toda** área, não só as seis originais.

### A busca ficou na aba Demanda

Onze abas foram definidas; a busca continuou cobrindo seis campos de uma só. Procurar por um número
de PEP, uma razão social ou um segmento não achava nada — e o comentário no código até prometia
que cada campo voltaria junto com a coluna que o justifica.

Agora cobre **24 campos**, respeitando a mesma regra de sempre: um campo só entra na busca se a
coluna que o exibe estiver visível para aquela sessão.

Dois defeitos menores vieram junto:

| Defeito | Consequência |
|---------|--------------|
| `useMemo` sem `marcas` e `talentos` nas dependências | Corrigir um segmento não mudava o resultado da busca até que outra coisa mudasse |
| Busca varria só `responsaveis`, não `apoios` | Metade da coluna de pessoas invisível para quem procurava pelo nome |

### Nove campos órfãos do modelo antigo

`veiculacao`, `captacao`, `formato`, `entregaveis`, `cotas`, `praca`, `alcanceEstimado`,
`publicoAlvo` e `statusJuridico` sobreviviam do desenho anterior. Enquanto havia abas por definir,
guardá-los custava nada e podia poupar trabalho. **Com as doze definidas, não há onde
reaproveitá-los.**

O mais perigoso era `captacao`: com `captacaoProducao` existindo, dois campos guardavam a mesma
coisa e um estava morto — exatamente a armadilha que o produto documentou ao nomear
`captacaoComercial`.

> **`captacaoComercial` continua**, sem coluna: a de Cliente foi removida a pedido, e o campo espera
> uma decisão sobre onde voltar.

---

## 5.5. Verificação de fim de dia — 02/08/2026

Passada final antes de encerrar: baseline verde (31 suítes, 78 testes de UI, build, tipos), e
depois uma caçada dirigida aos pontos que mudaram no dia. Três defeitos, nenhum visível em teste —
todos do tipo que só aparece com o tempo ou com dados reais.

### O rastro da duplicação procurava na lista errada

`origemDaDuplicacao` buscava a linha de origem no **prop** `oportunidades` — que chega à grade já
filtrado por permissão, janela e busca. O cenário que quebrava é corriqueiro:

1. Duplico um projeto em andamento — o rastro funciona
2. Semanas depois, o original **fecha** e sai da janela de 30 dias
3. A dica do rastro passa a dizer *"a linha de origem não existe mais"* — **com ela existindo**

Sumir da tela não é deixar de existir. A função agora busca na lista completa do contexto.

> Nenhum teste pegava porque todos duplicavam e verificavam **na mesma tela**. O defeito só
> aparecia com o tempo — a categoria de defeito que auditoria dirigida existe para achar.

### O mapa aba → área sobreviveu à sua própria substituição

`AREA_DA_ABA` era o mecanismo de quando cada aba tinha uma área. Desde a Produção a coluna declara
a sua — mas o mapa ficou como "retaguarda", com uma entrada já **errada**: `'backlog:juridico':
'gp'`, resquício de quando GP responderia pelo Jurídico, antes de a área Jurídico existir.

Retaguarda que ninguém consulta é onde o próximo defeito se esconde. O mapa foi removido; a última
coluna que dependia dele (Talent Manager, na aba Talento) passou a declarar a área como as demais.
**A fonte é uma só: o catálogo de colunas.**

### A versão de persistência ficou aberta enquanto o formato mudava

`VERSAO = 7` foi gravada de manhã, na troca Escopo → Demanda. Ao longo do dia, `Oportunidade`
ganhou **sete campos obrigatórios** (comissão Globo, saving, PEP, quatro links), perdeu nove
órfãos, e o seed de equipes ganhou Pagamentos e Jurídico.

Qualquer F5 no meio do dia gravava dados no formato velho **sob o número novo** — e o carregamento
de amanhã produziria linhas sem campos que o código exige, e colunas de pessoas com painel vazio.

Agora é **v8**, e a lição está registrada no próprio módulo: *a versão sobe junto com a mudança de
forma, não no fim do dia.*

### Dois comentários mentindo

O rastro de refatorações do dia: um comentário citava o `AREA_DA_ABA` já removido como se existisse,
e outro prometia que `praca`, `alcanceEstimado` e `publicoAlvo` "continuam no modelo" — a auditoria
da tarde os havia apagado. Comentário desatualizado é pior que nenhum: quem lê confia.

---

## 5.16. Identidade, profundidade e legibilidade — 12/08/2026, décima primeira rodada

A rodada mais longa até aqui, e a mais conduzida pela operação: **onze leituras de tela**, cada uma
apontando uma coisa que o código não sabia que estava errada. Nenhuma delas foi encontrada por
teste, auditoria ou revisão — todas vieram de alguém olhando o produto.

### A paleta parou de ser escolhida e passou a ser construída

As três primeiras versões da paleta ainda eram **escolhas**: tons tirados a dedo das rampas prontas
do Tailwind. O problema é que o tier `600` é o **pico de croma** dessas rampas — `blue-600` tem
croma 0,245. São cores feitas para chamar atenção sozinhas numa página, não para conviver quarenta
vezes numa coluna. E o equilíbrio de peso batia por conferência manual: escolher, calcular a
luminância, torcer.

Agora os sete tons saem de uma regra em OKLCH, onde os três eixos são independentes:

| Eixo | Papel | Valor |
|---|---|---|
| **claridade** | o **peso** — quanta atenção o bloco puxa | fixo |
| **croma** | quanto a cor grita | 0,10 no fluxo · 0,13 nos acentos |
| **matiz** | qual é o estado | a única variável |

**Claridade travada é o que impede o carnaval**, e não a ausência de cor: o que faz uma paleta cheia
parecer aleatória é um bloco quase preto ao lado de um amarelo luminoso. Com o peso constante, a
coluna varia em cor sem variar em **atenção** — e todos passam de 4,5:1 com texto branco sem que
ninguém confira tom a tom. Detalhe em [03 §1.1.0](03_padroes_ui.md).

No fim do dia a regra atravessou para **Contratos**, que carregava treze matizes a dedo — com
âmbar, laranja e amarelo em três status distintos, e rosa e vermelho em dois desfechos. Ele não
ganhou paleta nova: ganhou a **mesma regra**, subdividida em nove passos em vez de quatro, reusando
os três acentos. Com treze status a cor não consegue ser identificador — ninguém decora treze cores
—, então ela virou **indicador de posição**: passos vizinhos propositalmente próximos, para se ler
de longe se a linha está no começo ou no fim ([02 §5.3](02_quadro_talentos.md)).

O quadro **Talentos** ficou de fora, e não por esquecimento: ele não exibe status de esteira, e sim
o farol de vigência — semáforo de prazo é outro vocabulário, com significado próprio que a rampa
não substitui.

Conferida contra o logo (azul elétrico + amarelo), a paleta já tinha caído na família da
marca: o plano em 266°, a rampa atravessando o azul, o acento de ação no parente escuro do amarelo.
Os dois ajustes que a conferência produziu foram **subtrações** — o plano trocou o slate neutro pelo
matiz da marca, e o navy `#111a3a` das faixas saiu. Nenhuma cor nova entrou ([03 §1.0.4](03_padroes_ui.md)).

### O shell ganhou profundidade — e depois perdeu a superfície que sobrava

Pedido com duas referências: *"a sidebar parece que está em um plano abaixo da área de trabalho"*.
Plano escuro ao fundo, folha clara flutuando com vão de 8px, canto arredondado e sombra.

O que veio depois é a parte que interessa. Para dar cara de vidro, a sidebar recebeu um véu de
branco a 4% com `backdrop-blur` e um brilho de 1px na aresta. A operação olhou e disse: *"tem uma
linha e os tons escuros são diferentes"*. As duas queixas eram a mesma coisa — **um segundo plano
escuro dentro do primeiro**:

```
 sidebar (com véu) │ linha 1px │ moldura (sem véu) │ folha
 └──────────── três superfícies em 8px ───────────┘
```

**E reduzir o véu não resolve — só torna o degrau mais difícil de nomear.** Foi o que fiz numa
primeira correção (4% → 3%), e por isso ela voltou. O vidro não morreu: **mudou de escala.** O plano
inteiro é o vidro, iluminado por trás por três manchas nos matizes da própria paleta, e a sidebar
*participa* dele em vez de flutuar sobre ele.

> A estrutura foi aprovada e **congelada** em [03 §1.0.0](03_padroes_ui.md), a pedido da operação —
> mesmo tratamento que a tipografia recebeu em 11/08. Congelam-se os invariantes, não os valores.

### A sidebar virou identidade

Marca no topo (logo oficial de `assets/img/`, importado — o arquivo da operação é a única cópia),
nome e subtítulo centralizados, seções centralizadas, itens à esquerda porque têm ícone, pessoa no
rodapé.

Duas regras de dado saíram daí, ambas em [`utils/identidade.ts`](../src/utils/identidade.ts):

- **`nomeCurto`** — primeiro e último nome. O cadastro guarda o nome **civil**, e ele não cabe em
  256px: o truncamento cortava justamente a palavra que identifica a pessoa. Trata dois casos que o
  corte ingênuo erra — sufixo de geração viaja com o sobrenome ("Ana de Souza Neto" → "Ana Souza
  Neto", não "Ana Neto") e partícula não vale como nome.
- **`sanearCargos`** — a etiqueta debaixo do nome mostra o **cargo**, não o nível de acesso: são
  perguntas diferentes ("quem é esta pessoa?" contra "o que ela pode fazer?"). O campo guardava
  "Dono do Sistema" desde a semente, que é vocabulário de permissão. Era **dado errado, não rótulo
  errado**.

> **E corrigir a semente não bastou.** A etiqueta seguia errada no navegador da operação um dia
> depois: a persistência versiona por formato e descarta tudo na virada, então não há migração
> pontual, e derrubar a versão inteira por causa de uma string apagaria os dados de todos.
> `sanearCargos` roda na leitura e corrige só o valor que um defeito antigo escreveu — mesma lógica
> do `semIdsRepetidos` ([09 §3](09_fundacoes_tecnicas.md)).

### A legibilidade da grade, e o defeito que a subida revelou

Queixa: *"os dados não estão legíveis… no monitor pequeno fica visível, mas no grande parece que
fica pixelado"*.

**"Pixelado" é literal, e o diagnóstico muda o alvo.** Monitor grande costuma ter densidade *menor*
que um notebook — 32" em 1440p dá ~93 PPI contra ~147 de uma tela de 15". O dado estava em ~10px, e
10px com menos pixels por caractere não fica pequeno: fica **áspero**. A saída já estava escrita no
código desde 11/08 — *"se a queixa for 'o dado está pequeno', a saída é subir a régua inteira"*.

O achado veio de um **teste**, não do olho. Ao subir a régua, a guarda da hierarquia reprovou: a
distância entre cabeçalho e dado, negociada em 5%, havia caído para 4,2% sem ninguém tocar nela. Os
degraus eram **subtrativos** — o vão absoluto continuou o mesmo e a base cresceu embaixo dele. **A
hierarquia foi acordada em porcentagem e estava escrita em pixel**, e o comentário do código
prometia o contrário desde sempre.

Cada camada virou uma **fração da régua**, e a refatoração se pagou na hora seguinte: a operação
devolveu os quatro tamanhos que queria, e os quatro caíam exatos numa régua de 13,6px. **Um número
trocado.** Com degraus subtrativos seria um sistema de equações, e cada recalibragem uma chance de
perder a hierarquia sem perceber — que é exatamente o que tinha acabado de acontecer
([03 §1.2.6](03_padroes_ui.md)).

### Três botões que nasceram um de cada vez

*"Olha que o Novo projeto está menor"* — e estava: raio, padding e corpo diferentes dos outros dois.
A correção não foi igualar na mão, foi extrair a forma para uma constante, **porque foi assim que
eles divergiram**: cada edição mexeu num só. Detalhe fino que quase escapou — o botão preenchido
precisa da `border` mesmo sendo invisível, senão sai 2px mais baixo com o padding idêntico.

### O que esta rodada ensinou

| Lição | Onde nasceu |
|---|---|
| **Num shell de dois planos, só existem dois.** Uma terceira superfície entre eles aparece como linha, por mais sutil que seja o tom | o véu da sidebar |
| **Relação acordada em porcentagem precisa ser escrita em porcentagem.** Como diferença absoluta, ela se desfaz em silêncio no dia em que a base se move | os degraus da grade |
| **Corrigir a semente não corrige o que já foi gravado.** Defeito que escreveu dado precisa de reparo na leitura | o cargo "Dono do Sistema" |
| **Teste que mira classe de cor está preso à decisão estética do dia** | a faixa de abas selecionada por `[class*="111a3a"]` |
| **Paleta cheia não vira carnaval por ser cheia**, e sim por ter peso irregular | as cinco versões da paleta |
| **Documentação errada não falha em lugar nenhum.** O que é mecanicamente verificável no PRD tem de ser verificado por teste — o resto envelhece em silêncio | a auditoria de sincronia do fim do dia |
| **"Produção está diferente" se responde por hash, não por olho.** Os bundles eram idênticos; a diferença era zoom por site e `localStorage` — estado do navegador, por origem | a primeira publicação no Easypanel ([09 §5.1](09_fundacoes_tecnicas.md)) |

### A primeira publicação externa

O produto foi ao ar no Easypanel (`npm run start` = `vite preview` sobre o build). A conferência
"produção × localhost" encontrou os bundles **byte a byte idênticos** no `.js` e com uma única
regra morta de diferença no `.css` — resíduo da varredura do Tailwind sobre testes e PRD, que foi
restrita a `src/` + `index.html` na sequência. O build agora é **determinístico**: mesmo `src/`,
mesmo hash — detalhe em [09 §5.1](09_fundacoes_tecnicas.md).

O que legitimamente difere entre origens (zoom por site, régua pessoal, dados do `localStorage`)
está registrado lá, com o reset de cada um.

### Os números

| Medida | Antes | Depois |
|--------|------:|-------:|
| Tons escuros diferentes no produto | 3 | **1** |
| Matizes a dedo na paleta do Backlog | 7 | **0** *(todos por regra)* |
| Matizes a dedo na esteira de Contratos | 13 | **0** *(todos por regra)* |
| Superfícies entre o plano e a folha | 3 | **2** |
| Suítes de regras | 34 | **36** |
| Testes de UI | 139 | **140** |
| Leituras de tela que originaram correção | — | **11** |

---

## 5.15. Três defeitos apontados pela operação — 12/08/2026, décima rodada

Uma leitura da tela, três defeitos. Os dois primeiros vinham de rodadas anteriores; o terceiro era
um recurso que existia numa coluna só.

### O card Declinado, e o "Talento 2"

O card abreviava o motivo e colava a contagem: `Talento 2` — que a operação leu como o nome de um
talento numerado. Foram **três voltas** até assentar: nome inteiro (passou a repetir "Declinado"
sob um cabeçalho escrito Declinado), um por linha (esticava o card com os três motivos), e enfim
os três lado a lado com a contagem num **badge**. O badge é o que resolve de fato — a ambiguidade
nunca foi do rótulo, era da colagem entre rótulo e número ([08 §7.5](08_backlog_e_integracoes.md)).

### O tique que não desmarcava — e o erro que ninguém via

Reporte: *"se eu colocar algum dado, eu não consigo desabilitar"*. Com valor preenchido, o clique
no tique do Escopo **não fazia nada**: sem diálogo, sem erro, sem reação.

A causa era uma constante declarada fora de ordem — o catálogo `LISTAS` vivia no meio do render,
depois do bloco que o usava, e o de cima o alcançava na *temporal dead zone*. `ReferenceError`
exatamente ao montar a frase "isto apaga X da coluna Y".

**O que o tornou invisível foi a mudança de ontem**: a função virou `async` quando a confirmação
deixou de ser `window.confirm`, e exceção em `async` sem `catch` vira `unhandledrejection` — não
aparece na tela, não quebra o render, não deixa rastro. O defeito nasceu com a troca do diálogo e
atravessou uma suíte inteira verde, porque nenhum teste exercitava **desmarcar com valor
preenchido** — só o caminho vazio, que não toca a constante.

> **A lição:** função `async` em manipulador de evento engole exceção. Onde o gesto depende dela, o
> teste precisa exercitar o caminho **com dado**. Foi a diferença entre uma suíte verde e um botão
> morto.

### Responsável e apoio em todas as colunas de pessoas

A distinção existia **só em Orçamento**, por uma célula própria; as outras nove nomeavam uma lista
plana. A operação pediu a mesma regra em toda parte, e o argumento que valia lá vale igual nas
demais: uma dupla de produção tem titular e substituto, e a lista plana dizia que os dois
respondem.

**A exceção sumiu junto, e isso importa mais que o recurso.** Orçamento era a única coluna sem
`area` no catálogo, com um `if` próprio na tabela desenhando um segundo painel igual ao primeiro.
Agora há **uma célula e um caminho** — e `testeColunas` trava a ausência da exceção em vez da
exceção. Saiu também a ação `alternarResponsavelDaOportunidade`, órfã no mesmo gesto.

### A simetria do cabeçalho

Na mesma leitura: *"eu corto assimetria"*. As cinco etapas do fluxo mediam o próprio rótulo
(larguras diferentes numa fileira que representa **ordem**, não peso), o card de Declinado ficava
mais alto que o Encerrado, e a seção do Fluxo tinha ~60px de vazio no pé contra a vizinha. Resolvido
com colunas em fração, `auto-rows-fr` e o miolo centrado — [03 §1.2.8](03_padroes_ui.md).

### O cabeçalho ganhou cor, valor — e perdeu as setas

Fechando a rodada, o pedido de "design mais elegante". Duas leituras na tela até assentar:

- **cor do status** na borda de cada card, ligando o mapa à etiqueta da linha — em tom **pastel**,
  depois que a versão saturada virou "muito carnaval" com nove barras ao mesmo tempo. A regra já
  existia para as etiquetas ([03 §1.1.1](03_padroes_ui.md)) e não tinha sido aplicada às barras;
- **valor em R$** em cada etapa, que os cards de Finalização sempre mostraram e os do fluxo não;
- **conectores `›` removidos** — a legenda e a numeração já diziam que o fluxo é sequencial.

Detalhe em [03 §1.2.9](03_padroes_ui.md).

Nada de tipografia foi tocado: cor, espaçamento e um ícone deram o resultado.

### A etiqueta de status ficou suave, e em caixa alta

A última leitura do dia: *"as cores dos botões de status estão muito carnaval"*. A etiqueta era a
única preenchida do produto, e a regra que a mantinha assim ([03 §1.1.1](03_padroes_ui.md)) nasceu
quando a coluna Status **rolava** com a grade. Congelada, as etiquetas ficam paradas e empilhadas —
nove fundos saturados um sob o outro são o arco-íris que a própria regra condena.

Passou ao par suave (`bg-50` · `text-700` · anel) com **caixa alta**, que devolve por forma o
destaque que a saturação dava.

> **A etiqueta suave durou algumas horas.** A leitura seguinte da operação foi *"cores no quadro, e
> não na fonte, e menos pastéis"*, e ela estava certa — a regra acertava o **risco** e errava a
> **causa**. O que produz arco-íris não é saturação: é matiz arbitrário com peso irregular. Ver
> §5.16 e [03 §1.1.1](03_padroes_ui.md). Contratos e Talentos seguem com a preenchida antiga até
> serem revistos.

E o tom não bastava. A paleta passou por **cinco versões no mesmo dia** antes de assentar:

1. **original** — uma cor por status, escolhidas uma a uma: sete matizes de famílias conflitantes;
2. **semântica** — quatro matizes por significado: perdeu a distinção entre etapas e, pior, pintou
   **Entrada e Encerrado do mesmo cinza**, deixando começo e fim do processo idênticos;
3. **rampa suave** — a rampa certa, mas em etiqueta clara com texto colorido: *"cores no quadro, e
   não na fonte, e menos pastéis"*;
4. **rampa preenchida** — a rampa com os tons `600` do Tailwind, que é o **pico de croma** das
   rampas dele: cores de demonstração, genéricas;
5. **rampa construída** — os tons **gerados por regra** em OKLCH.

O erro da primeira não era *ter cor*: era a paleta ser **arbitrária**. E o da quarta foi continuar
escolhendo tom a tom, mesmo com a rampa certa. Agora a claridade é fixa (o peso — nenhum status
puxa mais atenção que outro, e todos passam de 4,5:1 com texto branco), o croma diz o papel (0,10
no fluxo, 0,13 nos acentos) e o **matiz é a única variável**. Um degrau novo entra pela regra, não
por gosto. Detalhe em [03 §1.1.0](03_padroes_ui.md); nenhuma classe de cor mora no catálogo de
status, e os tons moram no `@theme`.

Junto veio o **shell em dois planos** — pedido com duas referências, *"a sidebar parece que está em
um plano abaixo da área de trabalho"*. A sidebar perdeu `bg-white` e `border-r` porque ela **é** o
plano; a área de trabalho virou uma folha clara com canto arredondado, sombra e um vão de 8px que
deixa o plano aparecer em volta. O vão é o detalhe que faz a diferença entre "um objeto em cima" e
"uma coluna ao lado" — [03 §1.0.1](03_padroes_ui.md).

### Os números

| Medida | Antes | Depois |
|--------|------:|-------:|
| Caminhos para nomear pessoas numa área | 2 | **1** |
| Colunas de pessoas sem papéis | 9 | **0** |
| Testes de UI | 131 | **139** |
| Versões de paleta até assentar | — | **5** |

---

## 5.14. Legibilidade: a escala de texto — 11/08/2026, nona rodada

Pedido da gestão: *"o sistema tem que ser legível em todo tamanho de tela e sistema operacional."*
Esta rodada é a **fundação** — o que vale para as seis páginas de uma vez. O ajuste de layout por
faixa de largura (1024 · 1366 · 1920) vem em seguida, quadro a quadro.

### O que a medição mostrou

| Achado | Número |
|--------|-------:|
| Classes responsivas (`sm:` `md:` `lg:`) em 96 arquivos | **19** — quase todas `grid-cols` |
| Tamanhos de fonte cravados em px | **202**, sendo **115 abaixo de 11px** |
| Larguras mínimas fixas nas tabelas | 900 a **1340px** |
| Texto pequeno em cinza claro (abaixo de AA) | **96** literais de classe |
| `prefers-reduced-motion` | não respeitado |

### O cabeçalho de coluna estava em 7px, e ninguém tinha somado

O achado central da rodada, e ele não estava visível em lugar nenhum: a grade tem régua fluida
própria (`--texto-grade`, 11–13px) e **cada camada desconta um degrau dela**. O cabeçalho descontava
`0.25rem`. Onze menos quatro dá **sete** — e era o corpo com que estavam escritos os nomes de todas
as colunas do quadro onde a operação passa o dia. Num monitor grande chegava a 9px.

Cada número isolado parecia defensável; o problema só existia na soma, que nenhum documento fazia.

**A primeira correção passou do ponto, e foi refeita no mesmo dia.** Ela mexeu em duas variáveis ao
mesmo tempo — subiu a régua para 12–14px *e* comprimiu os degraus —, e o cabeçalho recebeu as duas
somadas: saltou 43% de uma vez. A operação olhou a tela e recusou: a grade tinha deixado de ser
densa, e densidade ali é quantas linhas se vê sem rolar.

A régua voltou ao original; o que ficou foi a compressão dos degraus, que era o que resolvia o 7px
sem inchar nada. Cabeçalho e selos passaram de **7–9px para 9–11px**, o dado de 9–11 para 10–12, e
o nome do projeto não mudou. Nove pixels sustentam o cabeçalho porque ele é caixa alta e negrito —
o dado, que é leitura corrida, tem piso de 10px, e os dois são verificados separadamente.

> **A lição, registrada porque vai se repetir:** ajuste de tipografia mexe numa variável por vez.
> Com duas, não há como saber qual foi longe demais — e a correção vira outro chute.

### Pixel ignora quem precisa enxergar

Os 202 tamanhos em px viraram uma escala em `rem` com quatro degraus nomeados pelo papel
(`text-selo` · `text-rotulo` · `text-apoio` · `text-dado` — [03 §1.2.1](03_padroes_ui.md)). O ganho
não é estético: **`text-[9px]` é 9px inclusive para quem aumentou a fonte do sistema porque precisa
disso para ler.** `rem` acompanha a preferência; px a ignora. O piso subiu junto — nada abaixo de
10px.

### O mesmo layout chegava com três larguras diferentes

As fontes vêm do Google Fonts, e a pilha de alternativas era `system-ui` sozinho. Numa rede que
bloqueie o domínio — hipótese nada remota aqui —, o Windows resolvia para Segoe UI, o macOS para SF
Pro e o Linux para o que houvesse: três métricas, três larguras de texto, e um layout calculado
para nenhuma delas. A pilha agora **nomeia uma alternativa por sistema**.

### Duas metades da mesma preferência

`prefers-reduced-motion` não era respeitado. Foi ligado nas duas pontas, porque uma sem a outra
deixa metade do produto animando: o `index.css` cobre transições e animações de CSS, e o
`<MotionConfig reducedMotion="user">` cobre as do `motion`, que são feitas em JavaScript.

### Os quatro monitores, e a raiz fluida

A validação com as telas reais da operação (1051 a 2535px de largura) mostrou o defeito que nenhuma
régua interna resolvia: o texto batia no teto fixo (~13px) e parava, então **quanto maior o
monitor, menor o sistema parecia**. A correção coroa a conversão para `rem`: a raiz do documento
virou fluida (`html { font-size: clamp(16px, 12.6px + 0.25vw, 19px) }`), e o produto inteiro escala
por tela — 16px até ~1366px (o desenho aprovado, intacto), ~19px num monitor de 2535px. Piso e teto
verificados por teste ([03 §1.2.5](03_padroes_ui.md)).

### A curva recalibrada por bissecção, e o controle por pessoa

A primeira curva da raiz (teto 19px) foi recusada como "imensa" — pela mesma operação que tinha
recusado o 16px fixo como "pequeno". Os dois vereditos viraram o dado da recalibração: teto em
17,25px, +5% na tela de 2535px (o meio do intervalo, com folga para o discreto).

E a conclusão das três rodadas virou produto: **Meu Perfil ganhou o controle "Tamanho do texto"**
(Compacto · Padrão · Confortável), porque o tamanho confortável varia por pessoa e monitor e
nenhuma curva automática fecha essa conta. O fator multiplica a raiz por navegador — detalhes em
[03 §1.2.5](03_padroes_ui.md) e [`utils/aparencia.ts`](../src/utils/aparencia.ts).

### Presença ≠ tamanho — e a ordem de ajuste que faltava

A última leitura da operação foi a mais informativa: "sensação de grande nos títulos da coluna e
onde seleciona os dados" — com a régua **já de volta ao original**. A medição mostrou que nenhum
dos dois era tamanho de letra:

| Ponto | Corpo real | O que pesava |
|-------|-----------:|--------------|
| Título de coluna | 11,5px | caixa alta + peso 600 + tracking = presença de um texto de ~16px |
| Célula de seleção | 12,6px (igual ao dado ao lado) | a **caixa**: `py-1.5` + anel + fundo, seis lado a lado |

Corrigidos pela causa: peso 600→500 e tracking 0,06→0,02em no cabeçalho; `py-1.5`→`py-1` nas 11
células de seleção. **Nenhum pixel de letra foi cedido** — o piso de 9px segue protegido por teste.

> **A ordem destilada das rodadas do dia, agora escrita em [03 §1.2.6](03_padroes_ui.md):** quando
> pedirem "menor", ceda em **espaçamento → peso → tamanho**, nessa ordem. Os dois primeiros quase
> sempre têm o excesso e não custam legibilidade; tamanho é o único eixo que tira gente de fora da
> leitura — e foi ele que produziu o cabeçalho de 7px. As rodadas de 11/08 percorreram os três
> eixos na ordem errada.

### O degrau inflado estourou o layout — e foi revertido

A escala tinha subido cada degrau em 1px "de brinde", junto com a correção do cabeçalho de 7px. Era
o lugar errado: **os contêineres escalam com a raiz, não com o degrau**, então o texto ficou ~10%
maior dentro da mesma caixa. A sidebar passou a exibir "Backlog de Agenciad…", "Caio Cesar Mour…" e
um "DONO DO SISTEMA" quebrado em duas linhas.

Revertido aos valores originais (9 · 10 · 11 · 13px em raiz 16), com os quatro travados por teste.
A legibilidade nas telas grandes continua vindo de onde deve: a raiz fluida e a régua pessoal, que
movem texto **e** caixa na mesma proporção.

> **A lição fecha a trinca do dia:** espaçamento → peso → tamanho, e *nunca* o degrau isolado.
> Mexer no corpo do texto sem mexer no contêiner quebra a razão texto/caixa que toda tela assume.

### A convenção agora tem teste

[`testes-ui/tipografia.test.tsx`](../testes-ui/tipografia.test.tsx) — 5 verificações que falham se
um `text-[Npx]` voltar, se um degrau cair abaixo de 10px, se a régua da grade voltar a produzir
texto ilegível, se a pilha de fontes perder uma alternativa, ou se o movimento reduzido for
esquecido em qualquer das duas metades.

**É um teste de convenção, e é o tipo que faltava.** Nenhum teste de comportamento pegaria isto:
`text-[9px]` renderiza, clica e passa em tudo — o defeito só aparece na mesa de quem precisa
aproximar o rosto do monitor. A escala derreteu para pixel uma vez, em silêncio, 202 vezes.

### Os números da rodada

| Medida | Antes | Depois |
|--------|------:|-------:|
| Tamanhos em px no código | 202 | **0** |
| Menor texto da grade | 7px | **9px** (cabeçalho, caixa alta) · **10px** (dado) |
| Menor texto fora da grade | 9px | **10px** |
| Texto pequeno abaixo do contraste AA | 96 | **0** |
| Testes de UI | 116 | **121** |

---

## 5.13. Confirmação em diálogo e desfazer — 11/08/2026, oitava rodada

Três pedidos da gestão, numa entrega só: **`Ctrl+Z`** para voltar atrás numa edição errada, uma
**pergunta antes de duplicar**, e a substituição da *"mensagem feia no topo da tela"* por um
diálogo centrado, no estilo do alerta do macOS.

O padrão vive em [03 §8](03_padroes_ui.md); aqui ficam os achados da rodada.

### O `window.confirm` desligava a proteção justamente nos testes

A "mensagem feia" era a caixa nativa do navegador, em 12 pontos do sistema. Trocá-la parecia
assunto de aparência até a primeira execução da suíte: **o `jsdom` não implementa `window.confirm`**
e o devolvia como `undefined`. Toda exclusão passava direto — o teste dizia que a linha sumia, e
sumia, por um caminho que nenhuma pessoa percorre. A pergunta que protegia o dado era invisível
para a suíte que deveria protegê-la.

Com o diálogo em React, a pergunta existe no DOM e o teste tem de respondê-la. Cinco testes novos
cobrem o que antes não existia: cancelar não exclui, `Esc` não exclui, confirmar exclui, e o foco
começa em **Cancelar** quando a ação é destrutiva.

### Uma escolha de três vias vivia espremida em dois botões

Quando alguém sai da última equipe, o sistema pergunta o que fazer com a conta. A pergunta era um
`window.confirm` cujo texto pedia para ler **"OK" como Desligado** e **"Cancelar" como Inativo** —
de modo que o gesto universal de desistir produzia **uma alteração de cadastro**. Quem fechasse a
caixa sem ler inativava alguém sem saber.

`MOTIVOS_SAIDA`, em `utils/saida.ts`, já descrevia as duas situações **desde que o módulo nasceu,
sem nunca ter sido usado** — a lista estava pronta, faltava a tela. Registrado em
[04 §7.2](04_pagina_equipes.md).

### O desfazer expôs uma janela entre o commit e o registro

A primeira versão registrava o passo do histórico num `useEffect`. Efeito passivo roda depois da
pintura, e entre o commit da mudança e o registro abria-se uma janela em que **o dado já mudou e o
histórico ainda não sabe**. No navegador são milissegundos e nenhuma mão a alcança; num teste que
dispara a tecla logo após o clique, ela é alcançada sempre — e foi assim que apareceu.

Trocado por `useLayoutEffect`: o passo passa a ser gravado no mesmo commit da alteração, e não
existe instante em que os dois discordem. **O teste não estava sendo chato; estava certo.**

### O teste da reordenação encontrou um comentário mentindo

`descreverMudanca` prometia, em comentário, tratar reordenação de lista — e não tratava: comparava
índice a índice e acusava a primeira linha que mudou de lugar como se tivesse sido editada. O aviso
nomearia uma linha em que ninguém tocou. Corrigido comparando identidade antes de posição.

### Duas funções de permissão consultavam "hoje" sem deixar ninguém escolher qual

`podeGerenciarEquipe` e `podeExcluirEquipe` dependem do relógio — a responsabilidade temporária
vence na leitura ([04 §4](04_pagina_equipes.md)) — e **não aceitavam referência de tempo**, contra
a convenção do próprio projeto ([03 §9](03_padroes_ui.md)). O efeito: `testeGestaoEquipe` montava
uma janela de sete dias a partir de uma data fixa e **passou a falhar sozinho quando o calendário
andou**. Não era defeito da regra; era a regra sendo consultada com um "hoje" que o teste não
controlava. Agora recebem `agora = new Date()`, como todas as outras.

### A suíte de UI apodrecia com o calendário — e ninguém veria isso chegando

O seed do Backlog tem datas absolutas de julho, e o produto encerra sozinho o que fica 20 dias
parado. A conta é contra o relógio do sistema, então **a cada dia mais linhas do seed cruzam o
limite e saem da lista**:

| Data da execução | Testes de UI falhando |
|------------------|----------------------:|
| 04/08/2026 (quando foram escritos) | 0 |
| 10/08/2026 | 8 |
| 11/08/2026 | 10 |

Nenhuma linha de código havia mudado. Pior: as mensagens acusavam contagens de linha e apontavam
para a grade, quando a causa era o calendário. O relógio da suíte foi fixado em 04/08/2026
(`testes-ui/setup.ts`), devolvendo a ela a propriedade que a torna útil — **falhar só quando o
código muda**.

> **O envelhecimento do seed continua no produto, e é dele que se trata agora.** Em 11/08 o
> Backlog abre com **9 linhas em andamento**, não 12: três já foram arquivadas pela regra dos 20
> dias. A demonstração vai esvaziando sozinha, e em algumas semanas abre quase vazia. A correção é
> de produto — seed com datas relativas a hoje — e está no débito nº 10.

### Os números da rodada

| Medida | Antes | Depois |
|--------|------:|-------:|
| `window.confirm` · `alert` · `prompt` no produto | 12 | **0** |
| Suítes de regra | 33 | **34** |
| Verificações de regra | 1.452 | **1.503** |
| Testes de UI | 97 (8–10 falhando) | **116 (0 falhando)** |
| Linhas TS/TSX | 23.244 | 24.205 |

---

## 5.12. A ordenação por imagem e o scroll que assenta — 04/08/2026, sétima rodada

A operação mandou a planilha definitiva Aba × Coluna e três reportes de navegação. O que mudou:

| Mudança | Detalhe |
|---------|---------|
| **Ordem das seções** | Demanda · Escopo · **Produção** · Cliente · **Jurídico** · Financeiro · Links · Time. Produção colou no Escopo (os tiques de lá destravam as colunas homônimas daqui — os trios Edição/Conteúdo/Audiência se leem lado a lado); Jurídico veio antes do Financeiro (primeiro o que assina, depois o que se cobra) |
| **O lado do talento voltou à Demanda** | Exclusivo e Origem do Talento abrem a seção — vínculo é informação de decisão, e a costura com o bloco congelado (que termina em Talento) fica visível. A Cliente ficou com o lado da marca (Marca · Segmento · Categoria). A dedup segue: cada coluna existe numa seção só. Ids mudaram → **persistência v12** |
| **Bug da piscada na aba** | O clique soltava o observer de scroll em 600ms fixos — menos que o `smooth` de uma travessia longa; ele reassumia no meio do caminho, marcava a seção intermediária e a aba piscava. Agora o observer devolve o controle quando a animação **assenta no destino** (com rede de 2s), e o destino é **clampado ao limite físico** do scroll |
| **Emparelhamento exato** | Clicar na aba para com a primeira coluna da seção encostada na borda do congelado. Precisou de segunda rodada: medir `offsetLeft` do `<th>` parava *perto* — a posição agora é **somada do catálogo** (`inicioDaSecaoPx`): com `table-layout: fixed`, a largura declarada é a real, e a soma emparelha por construção. Clique e observer usam a mesma régua |
| **Abas com efeito de navegação** | O fundo da aba ativa é um elemento compartilhado (`layoutId`): rolando a tabela, ele **desliza** de uma aba à outra em vez de piscar — a faixa mostra a navegação, não só o estado |
| **Invariante 82 aposentada** | A soma de pesos era o contrato do layout proporcional; desde a grade contínua quem manda é a largura em px. O contrato novo, travado em `testeColunas` e `qaBacklog`: **toda coluna declara largura** (60–400px, medida contra o seed realista) |

---

## 5.11. As pendências — 04/08/2026, sexta rodada

A operação trouxe a lista de "status extras" que anota na planilha — *"Em elaboração – Validação
Gestão Esporte"*, *"Em revisão – Validação Talento"* — e perguntou como desdobrar a Elaboração por
área. A resposta veio da própria lista: **nenhum daqueles nomes é etapa; todos são esperas**, com
nome e endereço. O desenho, validado num simulador interativo antes de qualquer código:

| Decisão | O quê |
|---------|-------|
| **Status continua um só** | A máquina de transições não mudou. A espera é uma etiqueta com relógio (`Pendencia`): abre quando a bola sai da mão, marca "chegou" quando volta |
| **Menu por status** | Elaboração: Retorno Marca/Executivo · Validação Gestão Esporte · Cotação Gestão de Elenco · **Validação Externa** · Cálculo de Produção. Revisão: **Validação Planejamento** · Validação Talent Manager · Validação Talento. Os demais não oferecem — mas a aberta **viaja** se o status mudar. (Externa e Planejamento entraram na confirmação da lista, 04/08/2026) |
| **Tudo no painel de status** | Nenhum botão novo na linha: o popover que já move o fluxo ganhou o bloco Pendências. O selo sinaliza com um **badge de canto**, estilo notificação — âmbar `⏳N` esperando, verde `✓N` quando todas chegaram. Duas versões caíram no diálogo: o sufixo com nome ("comia texto") e o badge na linha do rótulo (espremia o "Em Elaboração" — print da operação). No canto, não disputa largura com nada; os nomes por extenso vivem na dica do hover e no painel — que **não fecha em interação interna**, só ao escolher destino, clicar fora ou no selo (bug apontado pela operação: o clique-fora tratava o portal como "fora") |
| **Todo gesto tem volta** | "Resolvida" caiu no diálogo: virou **✓ Chegou** (fato, não julgamento), com **↩ Reabrir** (marcou sem querer) e **✕** (abriu por engano — sai da medição). Descartar não apaga espera que já chegou: história não se remove |
| **Política híbrida, calibrada em uso** | A proposta inicial era "livre, com aviso" em tudo; a operação endureceu onde importa: **da Elaboração não se sobe para a Revisão com espera aberta** ("não pode ir para revisão se tiver faltando alguma coisa") — o destino aparece travado, com cadeado e o porquê na dica. Nas demais transições o aviso continua ("avançar assim mesmo?"): na Revisão, a validação aberta pode atravessar para o Feedback, porque ali a espera é do próprio destino. A "revisão parcelada" segue como fato medido (`statusAbertura` ≠ status atual) |
| **SLA por status fica para o banco** | Decisão explícita da operação: a contabilização do tempo em cada status entra com o Postgres + Power BI. O modelo `StatusEvento` já nasceu no schema Prisma como fonte desse relatório; o front grava o que ele vai ler — as datas das pendências |

**A rodada também abriu a Revisão para o Declinado** — pedido da operação, com a razão certa: a
Validação Talento acontece na Revisão, e quando o talento recusa, o projeto morre naquela etapa.
Passar por Aguardando Feedback para declinar registraria um retorno de cliente que nunca houve.
E com o refinamento da própria operação: **da Revisão, o único declínio oferecido é o "Decl.
Talento"** — é ele quem está revisando ali; Interno e Mercado são conversas do retorno do cliente
e seguem exclusivas do Aguardando Feedback (`motivosPermitidosDoDeclinio`, travado em regra, tela
e teste — ver [08 §7.5](08_backlog_e_integracoes.md)).

O que descartamos: sub-status compostos (multiplicariam a máquina por cada terceiro), multi-status
por área (mataria o fluxo clicável e os totais) e a trava dura na transição. Números da rodada:
persistência **v11** (campo obrigatório `pendencias`), 32ª suíte (`testePendencias`, 37 asserções,
com os três estados impossíveis plantados e acusados), 5 testes UI novos — **1.429 asserções ·
95 UI · 0 falhas**.

---

## 5.10. A grade fixa e centrada — 03/08/2026, quinta rodada

Três reportes da operação em sequência, todos na mesma tela:

**"A Talento entra um pouco para cima da Entrada"** — o bug clássico do congelamento. O `left` de
cada célula sticky é a soma das larguras **declaradas**; com `table-layout` automático, o navegador
alargava a Entrada além dos 74px declarados (o cabeçalho não cabia), e o `left` da Talento ficava
curto. Parada, a tabela parecia certa — as células sticky descansam na posição natural; rolando, a
Talento pinava no `left` errado e cobria o fim da Entrada. A correção é estrutural: a tabela virou
`table-layout: fixed` com `width` na soma das larguras declaradas — o `<colgroup>` é lei, e a soma
confere **por construção**. A investigação ainda achou dois ids comidos pelo antigo defeito do
heredoc (`:escopo:entradaEm`, `:time:entradaEm`, sem o prefixo `backlog`) que nenhum teste pegava:
`ehAncora` compara pelo sufixo.

**"Tem coluna com o nome comido"** — consequência direta do layout fixo: cabeçalho maior que a
coluna agora corta em vez de empurrar. A medição rótulo a rótulo (maior palavra × fonte do
cabeçalho + ícone de ordenar + padding) apertou em três lugares: Entrada (74 → 96), o tique
Conteúdo (74 → 104) e Exclusivo (96 → 104).

**"Centraliza tudo, menos Escopo e Projeto; e dá mais contraste ao cabeçalho"** — todos os dados e
cabeçalhos centralizados (Talento, Marca, Segmento, Categoria e links inclusive); as duas
exceções são os campos de texto corrido, que se leem da esquerda. O cabeçalho subiu de `#94a3b8`
para `#475569` — escuro sem ser preto: a hierarquia projeto > dados > cabeçalho passou a se
sustentar só pelo tamanho, não mais pela cor apagada.

**"Editar uma linha muda outra também"** — investigado e não reproduzido nos campos por linha: os
caminhos de escrita são imutáveis, as linhas têm `key` por id, e dois testes de regressão novos
travam isso (editar um valor não toca as demais; a duplicada é independente da origem). O que muda
outras linhas **por desenho** são as colunas que gravam no cadastro — Segmento, Categoria, Origem
do Talento, Razão Social, Exclusivo, a lista de contatos —, onde a célula escreve na ficha da marca
ou do talento e a dica avisa o alcance ("vale para todos os projetos"). Se o reporte for de outra
coluna, é caso novo e ainda não visto.

---

## 5.9. A ordenação final e a dedup — 03/08/2026, quarta rodada

A operação entregou **a ordem completa das colunas, numa lista**, e mandou excluir as repetidas.
Aplicada coluna a coluna, a lista reorganizou as seções:

| Mudança | Motivo |
|---------|--------|
| **Exclusivo e Marca saíram da Demanda** | Eram espelhos da Cliente; numa tabela única, a cópia só gastava largura. Ficou a ocorrência da Cliente |
| **Pagamento fundiu no Financeiro** | A lista pôs Parcelas e PEP **entre** os valores — e seção é um trecho contíguo. Duas restritas viraram uma; a liberação `backlog:financeiro` cobre tudo |
| Ordem das 8 seções naquela data | **Demanda** · Escopo · Cliente · Produção · Financeiro · Jurídico · Links · Time — superada em 04/08 pela planilha definitiva da operação; a vigente é a do §5.12: Demanda · Escopo · **Produção** · Cliente · **Jurídico** · Financeiro · Links · Time |

> **A ordem foi corrigida no mesmo dia.** Da lista de colunas eu havia lido a Cliente na frente, e
> a operação corrigiu: *"devemos começar por demanda"* — a Demanda é a triagem, e o quadro existe
> para triar. Links ficou **antes do Time** por escolha deixada em aberto pela operação ("por
> último ou antes do Time"): referência de projeto junto das seções de projeto, e o Time fechando,
> porque é a única seção que fala de quem toca o projeto, não dele.

Os trios de mesmo nome — Edição/Conteúdo/Audiência como **tique** (Escopo), **classificação**
(Produção) e **pessoas** (Time) — ficaram, por decisão da operação: mesmo rótulo, dados diferentes.

**Exportar para Excel** entrou na barra de ações. Nasceu como CSV com BOM ("que o Excel abre") e
virou **`.xlsx` de verdade** em 04/08/2026, a pedido da operação — SheetJS com **import estático**:
a versão por `import()` dinâmico morria em silêncio no servidor de desenvolvimento (dependência
instalada com o `dev` no ar chega desatualizada ao otimizador do Vite), e confiabilidade ganhou de
143 kB gzip. Arquivo "Backlog de Agenciados - dd-mm-aaaa.xlsx", aba "Backlog de Agenciados",
larguras de coluna pela maior célula com teto de 48 caracteres, erro visível por `window.alert`.
Exporta **o que está na tela** — linhas do recorte atual, colunas visíveis, com
rótulos de leitura ("VIU First", não `viu_first`). Mais que isso seria a planilha virando o caminho
para ler coluna oculta ([`exportacao.ts`](../src/utils/exportacao.ts), suíte `testeExportacao`).

---

## 5.8. A grade contínua — 03/08/2026, terceira rodada

A operação propôs, nas palavras dela: *"além de separado por tema, um scroll na tabela onde vamos
navegando pelas colunas e automaticamente vai passando a aba, para dar sensação de continuidade"*.
O Backlog deixou de ser nove tabelas com abas e virou **uma tabela só**.

### O modelo

| Peça | Como funciona |
|------|---------------|
| **Âncoras congeladas** | **Seis células** fixas à esquerda — Seleção · **Ações** · Status · Projeto · Entrada · Talento —, aparecendo **uma vez** (antes se repetiam nas nove abas). A barra do SLA não é célula: é `box-shadow: inset` pintado na célula do checkbox ([03 §3.3.1](03_padroes_ui.md)) |
| **Seções** | Cada aba virou um trecho contíguo de colunas; uma divisa vertical marca onde um assunto começa |
| **Scroll ↔ aba** | Rolar marca a aba da seção visível; clicar na aba rola até ela (`scrollTo` suave). Um `rolandoPorClique` evita o loop clique→rola→troca aba→rola |
| **Largura por conteúdo** | Cada coluna pede os **pixels** que o dado real exige (`largura`, com o peso × 11 de fallback). Acabou o "3x ocupando 350px porque a aba tinha de somar 82%" |
| **Busca total** | Voltou a cobrir todas as colunas liberadas: não há mais "outra aba", há a mesma tabela um scroll adiante |

Três defeitos apareceram em tela durante a construção, todos corrigidos com a causa registrada no
código: o scroll não marcava a última aba (o corte geométrico nunca a alcançava — caso especial de
fim de rolagem); as larguras congeladas cortavam Status e Entrada (proporção herdada, virou px
medido); e a barra do SLA **sumia ao rolar** — `border-left` não acompanha célula `sticky` sob
`border-collapse`, virou `box-shadow: inset`.

### Ações congeladas no início

Numa tabela que rola na horizontal, a última coluna some da vista assim que se avança — e duplicar
ou excluir passava a exigir rolar de volta. As Ações vieram do fim para o bloco congelado.

### A tipografia, decidida em tela com a operação

Hierarquia final: **nome do projeto > dados > cabeçalho**. A régua é uma variável só
(`--texto-grade`, `clamp` nos dois eixos da janela) e as camadas derivam por `calc` — mudar a base
move o conjunto junto. Levou três tentativas, e a lição virou regra: *nada dentro de uma célula
escolhe o próprio tamanho* (herança forçada no CSS); as exceções têm nome e motivo escrito.

### Fundo de linha

Zebra **por índice**, não por `nth-child`: a linha âmbar de "a conferir" furava a contagem do CSS e
a alternância virava "a cada 3 ou 4", como visto em tela. Prioridade dos fundos: **selecionada**
(índigo claro) > a conferir (âmbar) > zebra (slate-100).

---

## 5.7. Rodada de ajustes do Backlog — 03/08/2026

Pedido da operação, em seis itens, com dois ajustes que vieram durante a conversa. **Todos aplicados
apenas ao Backlog** — os outros quadros não foram tocados.

| # | Pedido | O que mudou |
|---|--------|-------------|
| 1 | Busca por Projeto, Marca, Talento **ou** pelas colunas da aba | As três âncoras sempre, **mais** as colunas da aba aberta |
| 2 | Renomear **Interveniência** → **Exclusivo** | Renomeado **e invertido** — no modelo inteiro |
| 3 | Tirar Reels, Vídeos, Cotas e Post da aba Escopo | Colunas e campos removidos |
| 4 | Criar coluna **Escopo**, texto livre grande | Área de texto de 3 linhas — hoje com **360px declarados** no catálogo; os 31% eram do layout proporcional, aposentado em §5.8 |
| 5 | Excluir a aba **Agência** | Removida — nunca chegou a ter colunas |
| 6 | Excluir a coluna **Tipo de Talento** | Removida: dizia o mesmo que Exclusivo |
| 7 | *(durante)* Escopo em área que quebra linha | `<textarea>`: Enter quebra, `Ctrl`+Enter confirma |
| 8 | *(durante)* Aba **Time** com todas as pessoas | Criada; Conteúdo e Audiência saíram junto |
| 9 | *(durante)* Tirar **Contato** e **Deadline** da aba Cliente | Removidas; a aba ficou com o que descreve o cliente |

### A inversão que o rename escondia

**A coluna mostrava `Sim` para quem NÃO era exclusivo.** `interveniencia: true` significa "há
terceiro no contrato", ou seja, talento não-exclusivo. Renomear o rótulo sem inverter o valor
compila, passa no typecheck, não quebra teste algum — e faz **toda linha do quadro mentir**.

A decisão foi levar a inversão até o modelo: `interveniencia` virou `exclusivo`, com o valor
trocado em `types.ts`, no schema Prisma, na ingestão, no seed, no rodapé e em ~60 asserções.

> **O teste que ficou**, em `testeExclusividade`: quem é exclusivo responde `true`, quem tem
> interveniência responde `false`, e as duas respostas nunca coincidem. Se alguém reverter a
> inversão, morre ali — e não em produção, seis meses depois, na leitura de um contrato.

### O que a migração do seed errou, e quem pegou

A conversão mecânica (`interveniencia: X` → `exclusivo: !X`) produziu **quatro linhas erradas**, e
o motivo é sutil: o `false` antigo era **ambíguo**. Significava tanto "não tem interveniência"
(= é exclusivo) quanto "não sabemos" — o valor com que toda linha nasce.

Nas quatro linhas do talento *Bruno Salles*, que não tem ficha em Talentos, o `false` era o
segundo caso. Invertido, virou `exclusivo: true`: uma **afirmação que ninguém fez**.

```
FALHA as sem ficha não são marcadas como exclusivas -> false (esperado true)
```

> Quem pegou foi a asserção que já existia — "linha sem ficha não afirma exclusividade". **Inverter
> um campo ambíguo transforma "não sei" em "sim".** Vale para qualquer migração de booleano: antes
> de inverter, é preciso saber se o `false` é resposta ou ausência de resposta.

### A aba Time reverte uma decisão documentada

Até hoje cada aba trazia o responsável da sua área, e o código dizia isso com todas as letras —
*"a coluna de responsável mora junto do assunto dela, **não numa aba separada de 'time'**"*.

A operação pediu o contrário, e o motivo dela é mais forte na prática: *"quem está nesse projeto?"*
é pergunta sobre o projeto inteiro, não sobre uma área de cada vez. Respondê-la custava abrir seis
abas e montar a lista de cabeça.

**O que se perde:** a área deixa de aparecer ao lado do que ela decide. Quem abre Produção precisa
de um clique a mais para saber quem produz — o inverso do custo anterior, para uma pergunta que se
faz menos vezes.

**Consequência não pedida, decidida na conversa:** sem as colunas de pessoas, **Conteúdo e
Audiência** ficavam só com as cinco espelhadas de identificação — idênticas uma à outra e sem nada
próprio. Foram removidas. As **áreas** continuam vivas em `AreaTalento`, com equipe, responsáveis
e permissão; o que mudou foi onde se olha para elas.

### A busca: âncoras fixas mais a aba aberta

| Parte | O que cobre | Por quê |
|-------|-------------|---------|
| **Âncoras** | Projeto, Marca, Talento | Identificam a linha. Valem em qualquer aba, sempre |
| **Aba aberta** | Todas as colunas dela | O que está na tela é o que a busca enxerga |

Antes ela varria as colunas de **todas** as abas liberadas. Era poderoso e imprevisível: na aba
Escopo, um termo trazia uma linha por causa de um valor do Financeiro que não estava na tela — a
pessoa via um resultado que a tela não explicava.

Duas consequências técnicas:

1. **A aba subiu para a página.** A busca vive em `BacklogAgenciados` e a aba vivia na tabela; sem
   levantar o estado, a página teria de adivinhar onde a pessoa está.
2. **A busca casa por campo, não por id de coluna.** Sete colunas são espelhadas entre abas — se a
   checagem fosse pelo id da aba de origem, procurar por status na aba Cliente falharia, com a
   coluna Status ali na tela.

> **Efeito colateral registrado:** procurar pelo nome de alguém agora exige a aba Time aberta. É
> consequência direta da regra, e o motivo de as três âncoras existirem.

### A realocação de colunas — o segundo tempo da rodada

Depois dos seis pedidos iniciais, a conversa seguiu **aba por aba**, movendo colunas até o quadro
fechar. O caminho importa mais que o destino, porque três abas saíram, voltaram e saíram de novo:

| Aba | O que houve |
|-----|-------------|
| **Talento** | Absorvida pela **Cliente** — as duas eram metades da mesma pergunta: a marca que paga e o talento que aparece |
| **Entrega** | Output e Impacto foram para a Demanda; sem elas, restavam só as espelhadas |
| **Conteúdo** · **Audiência** | Nomeavam áreas; com as pessoas na aba Time, ficariam idênticas entre si |
| **Produção** | Ganhou **Conteúdo** (formato editorial) e **Audiência** (porte do alcance), ao lado da Edição |
| **Demanda** | Recebeu Output, Impacto e Captação — informação de decisão, junto de quem decide |

> **A lição do vaivém.** Entrega, Conteúdo e Audiência foram removidas, restauradas horas depois e
> removidas de novo. O erro da primeira vez não foi a decisão: foi **decidir antes da hora**. Com a
> realocação em curso, uma aba que ainda não teve a sua vez parece vazia sem estar — e quem move as
> colunas é quem sabe o que ainda vai para lá.

### O prazo saiu de coluna e virou barra

A coluna **Deadline** existia em cinco abas. Ela saiu de todas, e o farol do SLA virou **a borda
esquerda da linha** — a terceira tentativa, depois de um ponto colorido e de um relógio em círculo.
As duas primeiras erraram pelo mesmo motivo, e a lição virou regra em [03 §3.3.1](03_padroes_ui.md):

> **O que qualifica a linha inteira vai na borda. O que é dado da linha vai numa coluna.**

Junto saiu o ponto de prioridade ao lado do nome, que repetia em cor o que a coluna Prioridade diz
por extenso. Entre dois sinais coloridos concorrentes, fica o que não tem coluna.

### O quadro coube na tela

Numa janela de ~950px sobravam **330px para as linhas** — 5 de 12 visíveis. Quatro medidas, medidas
antes de aplicar:

| Medida | Ganho |
|--------|------:|
| Fluxo do processo recolhível, com o estado persistido | **+216px** |
| Linhas mais densas (`py-3` → `py-2`) | +96px |
| Cabeçalho da página em modo denso — **opt-in, só no Backlog** | +50px |
| Fonte fluida pela janela (`clamp` — hoje nos dois eixos, `0.35vh + 0.25vw`, 11–13px) | +24px |

> A fonte fluida foi o que a operação pediu primeiro, e é o **menor** dos quatro ganhos: 12px → 11px
> rende meia linha. Medir antes evitou entregar o ajuste que menos resolvia.

### Os tiques do Escopo destravam a Produção

A pedido da operação, a aba Escopo ganhou três **tiques** — Edição, Conteúdo, Audiência — que
declaram o que o projeto inclui. Cada um destrava a coluna de mesmo nome na Produção; sem o tique,
a célula lá fica travada e diz onde se resolve. É a diferença entre *"ninguém preencheu"* e *"este
projeto não tem isso"* — duas respostas que uma coluna vazia dava ao mesmo tempo.

- **"Sem edição" saiu da lista**: a pergunta "tem edição?" virou o tique. Uma pergunta, um lugar.
- **Desmarcar apaga o valor, com confirmação** — e só quando há o que perder. Valor órfão num campo
  que a tela nega é o estado impossível que `qaBacklog` agora vigia (`comValorSemTique`), verificado
  plantando o defeito: acusa e nomeia a linha.
- Na Produção nasceram **Conteúdo** (formato editorial: publieditorial → institucional) e
  **Audiência** (porte do alcance: massa → nicho). Alcance **não é** Impacto: um mede a peça, o
  outro mede o projeto — por isso vivem em seções diferentes.

### Duas áreas novas: as frentes da produção

**Produtor Artístico** e **Executivo** entraram na aba Time, ao lado de Produção — o artístico cuida
do que se vê na tela, o executivo do que faz a filmagem acontecer. São áreas por **projeto** (como
Pagamento e Jurídico), cada uma com equipe própria no seed, porque coluna de pessoas sem equipe abre
painel vazio.

### Os números da rodada (as três levas somadas)

| Antes | Depois |
|-------|-------:|
| 13 abas, cada uma sua tabela | **8 seções de uma grade contínua** — então na ordem do §5.9; a vigente é a do §5.12: Demanda · Escopo · Produção · Cliente · Jurídico · Financeiro · Links · **Time no fim** |
| 4 âncoras repetidas por aba | **congeladas, uma vez** — mesma largura e posição, travadas em teste |
| Colunas de pessoas em 10 abas | **todas em Time** — 9 colunas declaram `area`, mais o Orçamento, que não declara (é célula própria) |
| Larguras em % somando 82 por aba | **pixels pelo dado real**, medidos contra seed realista |
| Coluna Exclusivo em 9 abas | **1** (Cliente) — a dedup tirou a cópia da Demanda (§5.9) |
| Abas restritas Financeiro · Pagamento · Jurídico | **Financeiro · Jurídico** — a Pagamento fundiu no Financeiro (§5.9) |
| Persistência v8 | **v10** — inversão do Exclusivo (v9); tiques do Escopo e fusão (v10) |
| 1.353 asserções · 78 UI | **1.392 asserções · 90 UI** |

---

## 5.6. Auditoria de validação — 03/08/2026

Pedido do produto: *"valida o código, vê se está tudo certo"*, ampliado para *"verifica se estamos
prontos para o backend com Prisma e Postgres"*.

**A baseline já estava verde** — 31 suítes, 78 testes de UI, tipos e build. Foi a auditoria dirigida
que achou o que os testes verdes não viam. Quatro defeitos e uma lacuna de modelo.

### O convite que não chegava a lugar nenhum

**O mais grave da rodada, e o único que tornava um recurso inteiro inalcançável.**

`convites`, `linksEquipe`, `trocasEmail` e `solicitacoes` eram `useState([])` — as únicas quatro
coleções do `DadosProvider` sem `carregar`/`salvar`. O comentário logo acima delas dizia "Estado
com persistência local", o que confirma que a omissão não foi decisão.

O efeito não é perder rascunho: é que **as três rotas públicas nunca funcionavam**. Elas chegam por
e-mail e são coladas na barra de endereço — uma carga nova da aplicação —, e o token era procurado
numa lista que acabara de nascer vazia:

| Rota | O que a pessoa via |
|------|--------------------|
| `#/convite/<token>` | "Este convite não existe" — para um convite emitido minutos antes |
| `#/entrar/<token>` | O link coletivo da equipe nunca validava |
| `#/confirmar-email/<token>` | Impossível por construção: o fluxo **depende** de sair e voltar |

> **Por que 1.353 asserções passavam.** As regras estavam certas — as suítes as alimentam com a
> lista pronta. Faltava a lista chegar até elas. Um passo além da lição dos testes de UI: provar
> que a regra está certa não prova que ela chegou à tela, **nem que o dado chegou à regra**.
> Regra em [09 §3](09_fundacoes_tecnicas.md).

Corrigido também um risco latente que vinha junto: os contadores de id (`cv`, `lk`, `te`, `sol`)
derivam do que está **carregado**. Com a lista sempre vazia na carga, todos reiniciavam em 1 — o
mesmo defeito de id repetido descrito em §5.1, esperando a persistência para aparecer.

### A tabela de membros violava uma regra que o próprio PRD já tinha escrito

`MembrosTable` envolvia as linhas em `AnimatePresence` com `exit={{ opacity: 0 }}` — **o exemplo
"ERRADO" de [03 §7.5](03_padroes_ui.md), copiado linha por linha.**

A correção de 01/08 foi aplicada "nos três quadros"; Equipes é da Administração e ficou de fora.
Consequência: tirar alguém da equipe deixava a linha ocupando a altura toda enquanto sumia, e o
contador "N pessoas na equipe", logo acima, discordava do que a grade mostrava.

> Regra escrita não é regra aplicada. As duas outras `AnimatePresence` de lista foram conferidas e
> estão certas — são `<div>` sobreposta e painel que colapsa, não linha de grade.

### O modo estrito estava a três erros de distância

O débito de `strict` desligado (nº 8 na lista de 02/08) dizia "o modo estrito não foi validado".
Medido: **3 erros no projeto inteiro**, dois deles do mesmo tipo largo demais.

| Onde | O que era |
|------|-----------|
| `MembrosTable` | `CampoUsuario` incluía `fotoUrl`, campo opcional, numa grade que só edita texto obrigatório — foto se troca em Meu Perfil |
| `totalDePecas` | Sobrecarga do `reduce`: com array de `number \| undefined`, o acumulador herda o tipo do item e o `0` inicial não convence o compilador |

Nenhum dos dois produzia erro em tela. Corrigidos, `strict: true` entrou junto com `noUnusedLocals`
e `noUnusedParameters` — **o débito está fechado**, e a categoria não volta.

### Dezesseis pontos de código morto — e dois deles não eram só código morto

`noUnusedLocals` acusou 16 imports e variáveis sem uso. Catorze eram resto de refatoração. Dois
diziam outra coisa:

| Achado | O que significa |
|--------|-----------------|
| `marcarOportunidadeRevisada` desestruturada e nunca chamada | O gesto existe no contexto, está testado e **não tem porta na interface**: dá para entrar no filtro "A conferir" e não dá para sair |
| `SimNaoSelect` importado e não usado | O componente ficou **órfão** quando Interveniência virou derivada e somente leitura |

Os imports saíram. Os dois achados **não** foram "consertados" inventando tela: onde colocar o
gesto de revisão é decisão de produto, e está em §6.0 como pendência. O arquivo órfão foi mantido.

### O schema Prisma cobria os quadros e esquecia a porta de entrada

Ver §8. As entidades de **acesso** — convite, link, pedido, concessão, troca de e-mail e domínio
autorizado — não tinham tabela, justamente as que o front implementa e testa. Somadas ao que
faltava em `Oportunidade`, eram seis modelos e dois campos.

---

## 5.1. Auditoria de perfis — 01/08/2026

Varredura completa antes da apresentação das telas. Resultado: **um furo de permissão** e **uma
contradição na documentação**.

### Furo: a interseção perfil × equipe não valia nos quadros

`nivelDeAcesso` decidia o alcance apenas pelo **perfil de sistema**. Quem tem perfil
`responsavel` — mesmo que por causa de uma equipe — enxergava e editava por inteiro **qualquer**
quadro a que tivesse acesso, ainda que fosse apenas membro da equipe que o libera.

| | Antes | Depois |
|---|---|---|
| Bruno Carvalho em Contratos (membro da equipe, perfil responsável) | todas as 3 linhas, com edição e exclusão | só a 1 linha dele |

Corrigido em `nivelDeAcesso`, e `podeEditarRegistro`/`podeEditarTalento` passaram a **derivar do
nível** em vez de repetir a checagem de perfil — as duas regras não podem mais divergir.

> **Nenhuma das 18 suítes pegou isso**, porque todas montavam fixtures em que perfil e papel
> coincidiam. O caso só apareceu ao rodar a matriz sobre o seed real, onde uma pessoa tem papéis
> diferentes em equipes diferentes. `testePermissoes` ganhou o caso, e ele foi verificado
> revertendo a correção: a suíte fica vermelha em 3 pontos.

### Contradição: quem concede quadros

O PRD 05 dizia, em duas tabelas, coisas opostas sobre o Admin Convidado poder definir os quadros
de uma equipe. A implementação sempre seguiu a versão restritiva — **só com `conceder_quadros`
concedido pelo dono**. A documentação foi corrigida, não o código.

### A lista mentindo sobre si mesma

Ao mover projetos entre status, a tela mostrava **duas linhas com "Total no grupo: 1"** no rodapé,
e status de finalização numa lista que só exibe o que está em andamento. Havia também buracos
vazios entre as linhas.

Um defeito só, com dois sintomas: `AnimatePresence` segurava a `<tr>` no DOM até a animação de
saída terminar. Enquanto isso ela **ocupava a altura toda** (o buraco) e **exibia o dado já
atualizado** (a linha "Declinado" numa lista de "Negócio Fechado").

O segundo sintoma é o grave: não era artefato visual, era a tela afirmando algo falso sobre o
conteúdo do quadro. Corrigido nos três quadros removendo a animação de saída — regra em
**PRD 03 §7.5**. A de entrada permanece: ela não segura elemento nenhum.

### Exclusão em lote apagando o invisível

A seleção era limpa por `useEffect(…, [aba, busca, filtro])`. A lista esquecia dois casos, e
sempre esqueceria: a **etapa do fluxo** é estado da página, não da tabela, e uma linha também sai
da lista ao **mudar de status**, sem que filtro algum mude.

Marcar uma linha e trocar de etapa deixava **"Excluir em Lote (1)" apontando para uma linha fora
da tela** — e a confirmação nomeava um registro que a pessoa não estava vendo.

Substituído por seleção derivada da interseção com o visível (**PRD 03 §7.6**), que não depende de
qual evento tirou a linha da lista. Nenhuma lista de dependências para manter.

### Ordenação alfabética em campos com ordem própria

Clicar em **Prioridade** dava "Alta, Baixa, Média" — o oposto do que a coluna promete. Clicar em
**Status** dava uma sequência sem relação com o processo, nos dois quadros que têm esteira.

Ao escrever o teste da correção, ele apontou uma divergência que eu não tinha visto: o mapa do
processo (`ETAPAS_FLUXO`) põe **Ajustes antes de Aguardando Feedback**; o catálogo
(`STATUS_OPORTUNIDADE`), o inverso. Ordenar pelo catálogo faria a coluna **contradizer o mapa
desenhado logo acima dela**. A escala passou a vir do mapa — regra em **PRD 03 §7.7**.

> Duas coisas que só apareceram porque a suíte é escrita antes de declarar a correção pronta: a
> divergência entre as duas listas de status, e o comportamento de valor fora da escala, que
> subiria ao topo por conta do `-1` do `indexOf`.

### Coluna Deadline exibindo o comentário no lugar do dado

A coluna mostrava "Triada" ou "3d restantes" — o rótulo do SLA — em vez da data. A data que a
coluna promete não aparecia em lugar nenhum da tela. O farol virou cor e ponto; a data voltou ao
lugar dela (**PRD 08 §6.2**).

### Botão que anunciava o contrário do que fazia

"Marcar Visíveis (N)" é um toggle: no segundo clique, desmarca. O rótulo continuava dizendo
"Marcar". Agora alterna para "Desmarcar Todas (N)" quando tudo está marcado.

### StandBy era um beco sem saída

Pela regra inicial, nada saía de StandBy. Pausar um projeto equivalia a matá-lo: retomar exigia
cadastrar de novo, perdendo histórico e data de entrada.

O efeito era pior que a limitação — quem sabia disso **deixava de usar o status** e mantinha o
projeto em Aguardando Feedback, sujando o farol com uma espera que não era do cliente.

A operação decidiu em 02/08/2026 que StandBy volta para Aguardando Feedback. A mudança expôs uma
ambiguidade que já existia: o bloco "Finalização" misturava desfechos com uma pausa. Daí
`DESFECHOS_TERMINAIS` e o selo **Pausa** no card ([08 §3.1](08_backlog_e_integracoes.md)).

> Foi a asserção antiga — "todo desfecho é final" — que apontou isso ao ficar vermelha. O teste
> que existia para travar a regra acabou revelando que a categoria estava errada.

### A ingestão inventava classificação

`normalizarPrioridade` devolvia `'media'` quando o e-mail não trazia prioridade; `normalizarInput`,
`'interno'`; e as outras duas caíam em "outro"/"outros". O mesmo default silencioso removido da
criação manual, entrando por outra porta — **e aqui pesa mais, porque não há ninguém olhando a
tela**.

Corrigido: não reconhecer devolve `undefined`, o registro entra como *a conferir*, e alguém
classifica olhando o conteúdo original ([08 §10.1](08_backlog_e_integracoes.md)).

### Sete linhas do seed contradiziam a ficha do talento

Enquanto a interveniência era campo digitado à parte, nada impedia o estado impossível: projeto com
talento **não-exclusivo** marcado como "sem interveniência", e vice-versa. O seed tinha **7 linhas**
nessa condição, e ninguém havia percebido — porque não havia com o que comparar.

Foi o teste da regra derivada que as encontrou, no primeiro `check` que cruzou linha com ficha
([08 §6.0.2b](08_backlog_e_integracoes.md)).

> Dois campos dizendo a mesma coisa por caminhos diferentes sempre acabam discordando. A pergunta
> útil não é "como manter os dois sincronizados", é "qual dos dois é a verdade".

### Criar um projeto replicava um existente

O mais grave da rodada. `proximaOportunidade` era `useRef(1)`, e o seed já usava `op1` — **a
primeira linha criada nascia com um id que já existia**. Em React, duas linhas com a mesma `key`
são reconciliadas como uma: a nova aparecia com os dados da antiga, e editar uma alterava a outra.

Os outros contadores tinham o mesmo defeito por outro caminho: `useRef(SEED.length + 1)` acertava
na primeira sessão, mas **depois de um F5 voltava ao mesmo número**, porque o estado vinha do
`localStorage` e o contador não.

Corrigido em `utils/ids.ts`, derivando do que está carregado, mais uma rede de proteção em
`carregar` que descarta ids repetidos já gravados ([09 §5](09_fundacoes_tecnicas.md)).

> O relato foi *"ao incluir novo, está replicando linhas existentes"* e *"vem com dados
> preenchidos"* — dois sintomas do mesmo defeito. Nenhum dos dois aponta para geração de id, que é
> o que torna esta classe de bug cara: o sintoma está longe da causa.

### Painéis fechavam antes de escolher

Os componentes novos (`SelecaoComCadastro`, `SimNaoSelect`) renderizam o painel em **portal**. O
handler de "clique fora" checava apenas `botaoRef.contains(alvo)` — e portanto tratava o próprio
painel como *fora de si mesmo*, fechando no `mousedown`, antes de o clique registrar.

A `CelulaReferencia` já resolvia isso com `onMouseDown` + `preventDefault`. Os dois novos passaram
a ignorar cliques dentro do painel, via ref própria.

### Classificação com default silencioso

Ver [08 §6.0.3](08_backlog_e_integracoes.md). A linha nova nascia classificada como
"Interno · Outros · Outro · Média" sem que ninguém tivesse escolhido.

### `talentoId` não acompanhava o nome

Trocar o talento de uma oportunidade mudava o texto e mantinha o vínculo antigo — a linha exibiria
um nome e puxaria o tipo de vínculo e os contratos de outro.

### Criar com o quadro filtrado não mostrava nada

A linha nasce em **Entrada**. Com o quadro recortado por outra etapa, por um filtro que ela não
satisfaz ou por uma busca que o nome provisório não casa, ela era criada **fora da vista** — a
pessoa clicava em "Novo projeto" e concluía que o botão não funcionava.

`handleCriar` passou a limpar etapa, filtro e busca antes de inserir. O recorte é fácil de refazer;
criar no escuro, não.

### O seed novo não chegava a quem já tinha aberto o sistema

O seed só é usado quando **não** há nada no `localStorage`. Ao dobrar os exemplos do Backlog, quem
já tinha aberto continuaria vendo os 6 registros antigos — e concluiria que a mudança não saiu.

Resolvido subindo `VERSAO` em `utils/persistencia.ts` (3 → 4), que é exatamente o mecanismo
previsto para isso ([09 §3](09_fundacoes_tecnicas.md)). O custo é descartar o que estava gravado —
aceitável quando o próprio exemplo mudou de propósito.

### Recarregar a página voltava para Contratos

`useState<AppPage>('contratos')` era fixo. Quem estava no Backlog conferindo uma linha perdia o
lugar a cada F5 — e como o resto do estado já era preservado, a tela era a **única** coisa que o
recarregamento ainda descartava.

Corrigido restaurando a página do `localStorage`, com validação contra o catálogo
([09 §8](09_fundacoes_tecnicas.md)). A URL continua sem refletir a página: é a consequência
conhecida de não haver router.

### Campos de outra aba descartados na criação

Preencher o Financeiro, voltar ao Escopo e inserir gravava o registro **sem** os campos
financeiros. Sem erro, sem aviso: a conversão do rascunho procurava a coluna apenas entre as da
aba **aberta**, e o que não encontrava, ignorava.

Somado a isso, o rascunho era apagado a cada troca de aba — então o caminho mais provável era
perder o dado antes mesmo de chegar ao momento de inserir.

Corrigido na época em `utils/rascunho.ts`, verificado reintroduzindo o bug (8 asserções vermelhas).
O módulo **não existe mais**: a criação passou a inserir a linha direto na lista, sem etapa de
montagem, e o problema deixou de ter onde acontecer (**PRD 03 §7.8**).

### Valores em reais somando mil vezes menos

O mais grave encontrado até aqui, e o único que produzia **número errado em tela**:

| Digitado | Somava | Correto |
|----------|-------:|--------:|
| `R$ 500.000` | **500** | 500.000 |
| `R$ 10.000` | **10** | 10.000 |
| `R$ 1.234.567` | **0** | 1.234.567 |

`paraNumero` desambiguava ponto-milhar × ponto-decimal pela **posição do último separador**. Com
vírgula presente (`R$ 95.000,00`) acertava. Sem vírgula — a grafia brasileira mais comum para
valores redondos — lia o ponto como decimal.

O terceiro caso é o pior: `Number('1.234.567')` é `NaN`, que virava `0`. E como `somarValores`
conta como ilegível justamente o que dá zero, o valor **saía da soma sem aparecer no contador de
ilegíveis** — o card mostrava um total menor e afirmava que estava completo.

A regra passou a ser a posição das casas: **exatamente três dígitos após o separador, ou mais de
um separador, é milhar**; uma ou duas casas é decimal, que é como se escrevem centavos.

> Apareceu ao escrever o teste da quebra de declínios: `"R$ 10.000" + "R$ 5.000"` deu **15** em vez
> de 15.000. Eu tinha ido conferir uma asserção de agrupamento e encontrei um defeito de moeda —
> os totais de Finalização, que a operação usa para conversar sobre dinheiro, estavam errados por
> um fator de mil desde sempre.

---

## 6.0. Onde paramos — 03/08/2026

Para retomar sem reler o dia inteiro:

### O que está pronto e verificado

- **9 abas** no Backlog, todas com colunas próprias — inclusive a **Time**, com as 8 áreas (§5.7)
- **Duplicar projeto** — linhas independentes, rastro por ícone, título se corrige ao escolher o
  novo talento
- **Tooltip único** do app; cabeçalhos com métrica única nos três quadros
- **Busca**: Projeto, Marca e Talento sempre; o resto acompanha a aba aberta (§5.7)
- **Exclusivo** no lugar de Interveniência — renomeado **e invertido** no modelo inteiro
- **8 áreas** (6 por talento + Pagamento e Jurídico por projeto), todas com equipe no seed
- Persistência em **v9**, cobrindo **as doze coleções** — as quatro do onboarding entraram em
  03/08 ([09 §3](09_fundacoes_tecnicas.md))
- **Os três fluxos por link funcionam** — convite, entrada por link e confirmação de e-mail (§5.6)
- **`strict: true`** ligado, com `noUnusedLocals` e `noUnusedParameters`
- **Schema Prisma completo**, validado e com SQL gerado — 18 tabelas (§8)

### As decisões em aberto, e de quem são

| Pendência | Quem decide | Registro |
|-----------|-------------|----------|
| ~~Modelagem de **agência**~~ — **encerrada em 03/08**: a operação não vai usar, e a aba saiu | — | §5.7 |
| **Valor de Produção** visível em aba não restrita | Operação | [08 §6](08_backlog_e_integracoes.md) |
| Listas de Output, Edição e Captação são proposta | Operação | [08 §6](08_backlog_e_integracoes.md) |
| "Apoio" × "parceiro" — mesmo papel, dois nomes | Produto | [08 §13.1](08_backlog_e_integracoes.md) |
| `Talento.origem` sem coluna na página Talentos | Produto | [06 §5.1](06_pagina_talentos.md) |
| `captacaoComercial` sem coluna em lugar nenhum | Produto | [08 §6](08_backlog_e_integracoes.md) |
| Estrutura do **Cadastro de Clientes** (página em branco) | Operação | §2.1.1 |
| **Onde fica o gesto "marcar como revisada"** — a regra existe, a porta não | Produto | §5.6 |
| **`contatoCliente` ficou sem coluna** — o campo existe, nada o exibe ou edita | Produto | §5.7 |

### Os riscos que valem lembrar

1. **Sem Git** — nenhum commit existe; o histórico está só nos PRDs. É o que também impede o CI
2. **Duplicação sem vínculo é decisão, com custo aceito**: briefing que muda se edita linha a
   linha ([08 §6.6](08_backlog_e_integracoes.md))
3. **O esquema existe, o servidor não** — enquanto isso, toda permissão continua sendo máscara

---

## 6. Débito técnico

Ordenado por impacto real, não por facilidade.

| # | Débito | Consequência | Registro |
|---|--------|--------------|----------|
| 1 | **Sem banco rodando** | Nada compartilhado: cada navegador tem sua realidade. O **esquema** já existe (§8) | [09 §3](09_fundacoes_tecnicas.md) |
| 2 | **Sem autenticação** | A sessão troca por um seletor "Entrar como (demo)" | [05 §7](05_perfis_usuarios.md) |
| 3 | **Regras só no cliente** | Toda permissão desta documentação é **máscara**, não barreira | [05 §10](05_perfis_usuarios.md) |
| 4 | **Sem CI** | As 36 suítes e os 144 testes de UI rodam só quando alguém lembra. O Git foi resolvido em 12/08/2026 — o projeto está versionado e publicado —, mas nada dispara a bateria a cada push | — |
| 5 | **Sem paginação nem virtualização** | 500 linhas montam de uma vez | §7 |
| 6 | **Busca sem debounce** | Filtra a cada tecla sobre a lista inteira | §7 |
| 7 | **Feriados fora do cálculo de dias úteis** | Prazo otimista em semanas com feriado | [09 §4](09_fundacoes_tecnicas.md) |
| 8 | **Arquivos de tabela grandes** (1.500+ linhas) | Custo de leitura; sem defeito associado | §3 |
| 9 | **Gesto de "marcar revisada" sem interface** | Dá para entrar no filtro "A conferir" e não dá para sair | §5.6 |
| 10 | **Seed com datas absolutas** | A demonstração **esvazia sozinha**: a regra dos 20 dias arquiva o seed conforme o calendário anda. Em 11/08 o Backlog já abre com 9 linhas em vez de 12 | §5.13 |
| 11 | **Layout não se adapta à largura da tela** | 19 classes responsivas no projeto inteiro; a grade pede 1340px mais a sidebar de 256px, e num notebook de 1366px já rola na horizontal. A tipografia foi resolvida (§5.14); o layout, não | §5.14 |
| 12 | **Desfazer não alcança a administração** | Decisão, não esquecimento (§5.13 e [03 §8.2](03_padroes_ui.md)) — mas quem desfaz no quadro vai tentar desfazer em Usuários | [03 §8.2](03_padroes_ui.md) |

> **Os três primeiros são o mesmo assunto: falta o servidor.** Não adianta atacar do 5 em diante
> antes disso — paginação sem servidor é otimização de um problema que muda de forma quando os
> dados saem do navegador.

### Fechados em 03/08/2026

| Débito | Como foi fechado |
|--------|------------------|
| ~~Testes fora do repositório~~ | As 36 suítes vivem em `testes-regras/`, versionadas com o código que verificam. Falta só o CI, que virou o item 4 |
| ~~PRD desatualizado sem ninguém notar~~ | Resolvido em 12/08/2026 por `documentacao.test.tsx`: link quebrado, variável CSS fantasma, símbolo sumido e documento sem versão passaram a **falhar a suíte**. O que o teste não cobre — se o texto está certo — segue sendo trabalho de quem escreve |
| ~~Projeto não versionado em Git~~ | Resolvido em 12/08/2026: repositório publicado, histórico com mensagem por decisão. O que restou do débito — **nenhum gatilho automático** — é o item 4 |
| ~~`strict` do TypeScript desligado~~ | Medido: 3 erros no projeto inteiro. Corrigidos, e `strict` + `noUnusedLocals` + `noUnusedParameters` entraram (§5.6) |

### Fechados em 11/08/2026

| Débito | Como foi fechado |
|--------|------------------|
| ~~Sem Git~~ | O repositório existe desde 04/08 e tem histórico. O item 4 encolheu para **falta de CI** |
| ~~"Não há desfazer"~~ | `Ctrl+Z` no dado dos três quadros ([03 §8.2](03_padroes_ui.md)). A frase estava em [03 §8] desde a primeira versão do documento |
| ~~Confirmação pela caixa do navegador~~ | Diálogo próprio nos 12 pontos — e, com ele, a confirmação passou a **existir nos testes** (§5.13) |
| ~~Suíte de UI dependente do dia da execução~~ | Relógio fixo em `testes-ui/setup.ts`. O envelhecimento do **seed** continua, e virou o débito nº 10 |

---

## 7. Escalabilidade — avaliação honesta

Pergunta feita pelo produto: *"está pronto para 500 usuários simultâneos?"*

**Não, e o motivo não é a interface.** O que falta é estrutural:

| Bloqueio | Consequência |
|----------|--------------|
| Sem banco | Cada aba do navegador tem sua própria realidade; nada é compartilhado |
| Sem autenticação | Qualquer pessoa é qualquer pessoa |
| Regras só no cliente | Toda permissão desta documentação é **conselho**, não barreira — o servidor precisa repeti-las (RLS) |
| Sem paginação | 500 pessoas na tabela = 500 linhas montadas de uma vez |
| Busca sem debounce | Filtra a cada tecla sobre a lista inteira |

O trabalho feito **não é desperdiçado**: as regras estão isoladas em funções puras
(`permissoes.ts`, `equipes.ts`, `convites.ts`, `linkEquipe.ts`, `identidade.ts`), justamente para
serem traduzidas em políticas de banco sem reescrever a lógica.

---

## 8. Próximos passos

### Fase 1 — Backend (a próxima)

#### Onde o modelo de dados está — verificado em 03/08/2026

`prisma/schema.prisma` **cobre o front inteiro**. Não é rascunho: `prisma validate` passa e o SQL
de criação foi gerado para conferir que é aplicável ao Postgres.

| Medida | Valor |
|--------|------:|
| Tabelas | 18 |
| Enums | 25 |
| Chaves estrangeiras | 23 |
| Índices únicos | 10 |

```bash
npx prisma validate
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
```

> No Prisma 7 a flag é `--to-schema`; `--to-schema-datamodel` foi removida.

**O que faltava, e entrou nesta rodada.** O schema modelava os quadros — usuários, equipes,
talentos, marcas, oportunidades, contratos — e não modelava **a porta de entrada da plataforma**:
seis entidades que o front implementa e testa, e que são a parte mais sensível do modelo, porque é
por elas que alguém passa a existir.

| Modelo | O que guarda |
|--------|--------------|
| `Convite` | Convite nominal: 24h, uso único, preso a um e-mail |
| `LinkEquipe` + `UsoLinkEquipe` | Link coletivo com rotação diária, e a auditoria de quem entrou por ele |
| `SolicitacaoAcesso` | Pedido de acesso de quem não pode se conceder sozinho |
| `Concessao` | Capacidade administrativa com janela de tempo |
| `TrocaEmail` | Troca de e-mail pendente de confirmação |
| `DominioAutorizado` | Os domínios que o admin edita em tela |

Mais dois ajustes em `Oportunidade`: `recebidoEm` (usado pela ingestão de e-mail e Salesforce)
estava ausente, e `prazoEm` era opcional apesar de os três caminhos de criação sempre o calcularem.

**Duas decisões de modelagem que o schema registra como regra, não como índice:**

1. `Concessao @@unique([usuarioId, acao])` — escreve no banco a regra "conceder o que já está
   concedido atualiza o prazo, não duplica a linha". Sem ela, revogar teria de apagar N linhas, e
   bastaria uma sobrar para o acesso continuar de pé.
2. `Convite` guarda **datas** (`aceitoEm`, `revogadoEm`), não um enum de status: o estado é
   derivado delas mais o relógio. Um campo de status precisaria de uma rotina agendada para não
   mentir sobre convite expirado; a data não precisa de nada.

**Resposta curta: para o modelo de dados, sim — estamos prontos.** O que falta é servidor, não
esquema. O dia 1 é `prisma migrate dev`.

#### Ordem sugerida

| # | Passo | Base pronta |
|---|-------|-------------|
| 1 | **`prisma migrate dev`** contra o Postgres | [`prisma/schema.prisma`](../prisma/schema.prisma) — validado, 18 tabelas |
| 2 | **Seed** a partir dos dados de demonstração | [`src/data/`](../src/data) — 5 seeds já no formato das entidades |
| 3 | **RLS** espelhando as regras de acesso | [`utils/permissoes.ts`](../src/utils/permissoes.ts) é a especificação executável |
| 4 | **SSO corporativo** (Microsoft/Google), sem senha | [05 §4.1](05_perfis_usuarios.md) |
| 5 | **Endpoint de ingestão** para o agente de e-mail e o Salesforce | [`utils/ingestao.ts`](../src/utils/ingestao.ts) — puro e idempotente, chamável do servidor |
| 6 | **Envio de e-mail** pela conta de serviço sedmail | [`services/email.ts`](../src/services/email.ts) tem o contrato |
| 7 | **Deploy** e migração dos seeds | — |

> **Ao ligar o backend, as rotas públicas mudam de dono.** Convite, link de equipe e confirmação de
> e-mail são hoje validados no cliente contra o `localStorage` (§5.6). Com servidor, o token passa a
> ser resolvido por ele — e aí a validade de 24h e o uso único deixam de ser convenção e viram
> barreira. É a mesma passagem de "máscara" para "barreira" do débito nº 3.

> ### Dois avisos para quem for executar
>
> **A credencial do sedmail nunca vai para o front-end** — nem em variável `VITE_*`, que é
> embutida no bundle e fica visível para qualquer pessoa que abrir o DevTools. O envio acontece no
> servidor, sempre. ([08 §11](08_backlog_e_integracoes.md))
>
> **A RLS não é tradução mecânica.** As funções puras dizem *o quê*; a política precisa dizer o
> mesmo em SQL, e a auditoria de perfis (§5.1) mostra que o detalhe importa: a diferença entre
> checar o perfil e checar o papel **na equipe que libera o quadro** foi um defeito real de
> vazamento de linhas.

### Fase 2 — Produto

7. **Página de Clientes e Fornecedores** — o cadastro de marcas existe como dado e regra, mas não tem tela ([07 §11.2](07_visoes_e_relacoes.md))
8. **Alerta de contratos vencidos** com status desatualizado, e correção em lote
8. **Tabela de feriados** alimentando o cálculo de dias úteis ([09 §4](09_fundacoes_tecnicas.md))
9. Decisões que dependem da operação — ver [08 §13.1](08_backlog_e_integracoes.md):
   significado de **GP**, formato do número de contrato, se faturamento vira valor tipado, se os
   filtros combinam

> **Dashboard de análise fica fora deste sistema.** Decisão do produto: o **Power BI lê o banco**.
> Este sistema é controle de processo e máscara de dados — relatório e série histórica não são
> dele. É o que justifica a lista soltar os finalizados após 30 dias.

### Fase 3 — Engenharia

11. **Pôr as 36 suítes em CI** — o Git saiu do débito em 12/08/2026; as suítes já estão no repositório, falta o gatilho
12. ~~Avaliar `strict: true`~~ — **feito em 03/08** (§5.6)
13. Paginação/virtualização e debounce nas listas grandes
14. UUID do banco no lugar dos contadores de sessão ([09 §5](09_fundacoes_tecnicas.md)) — o schema
    já usa `@default(cuid())`, então a troca é do lado do cliente
15. Estender o `include` do `tsconfig` a `testes-ui/` — hoje os testes não passam pelo `typecheck`

---

## 9. Linha do tempo das decisões

Ordem em que o sistema foi construído, e o que cada etapa fixou. Serve para entender **por que uma
regra existe antes de outra** — várias decisões posteriores foram moldadas pelas anteriores.

| Etapa | O que fixou |
|-------|-------------|
| **Contratos de Agenciados** | O padrão de quadro: tabela, faixa navy, edição inline, farol de vigência ([02](02_quadro_talentos.md)) |
| **Equipes e Usuários** | Perfil como teto, equipe como escopo, dono inrebaixável, onboarding por convite e link ([04](04_pagina_equipes.md), [05](05_perfis_usuarios.md)) |
| **Talentos** | Exclusivo e interveniência no mesmo cadastro; responsável por área vindo da equipe certa ([06](06_pagina_talentos.md)) |
| **Visões e colunas** | As três camadas de acesso e as duas políticas opostas ([07](07_visoes_e_relacoes.md)) |
| **Referências entre quadros** | Fim do dado duplicado; nome digitado abre ficha ([07 §10–11](07_visoes_e_relacoes.md)) |
| **Backlog** | Máquina de status, SLA, encerramento automático, contrato de ingestão ([08](08_backlog_e_integracoes.md)) |
| **Rodada de correções** | Altura do quadro, saída de linha, seleção, ordenação, moeda, criação ([03 §7.4–7.8](03_padroes_ui.md), §5.1) |

### Decisões de rumo tomadas pelo produto

| Decisão | Quando | Efeito |
|---------|--------|--------|
| Cancelar a assinatura do **Monday.com** | Origem do projeto | O sistema precisa cobrir o processo inteiro, não só uma parte |
| **Análise no Power BI**, não aqui | Ao desenhar o Backlog | Sem tela de relatório; a lista solta finalizados após 30 dias |
| Construir o **Backlog antes do backend** | 01/08/2026 | Contra a recomendação de esperar a reunião — o produto avaliou que o modelo de dados não mudaria |
| **SSO corporativo**, sem senha | Ao desenhar o onboarding | Nenhuma senha trafega ou é guardada |
| Domínios autorizados **editáveis pelo admin** | Ao desenhar o onboarding | `@g.globo`, `@globo.com`, `@viu.com.br` e o que for necessário |
| **Uma página por vez** | 02/08/2026 | Mudança de padrão não se propaga entre quadros sem a conversa — cada um tem a sua |
| **Colunas nascem da operação**, não do sistema antigo | 02/08/2026 | As abas foram esvaziadas e voltam uma a uma, definidas com quem usa |
| **Modelar o banco antes de ter servidor** | 03/08/2026 | O esquema sai do front, que já tomou as decisões de produto. O dia 1 da Fase 1 é `migrate dev`, não redesenho — §8 |
| **As pessoas numa aba só** (Time) | 03/08/2026 | Reverte "a área mora junto do assunto". "Quem está nesse projeto?" é pergunta sobre o projeto inteiro — §5.7 |
| **O quadro fala "Exclusivo", não "Interveniência"** | 03/08/2026 | O rótulo da operação virou o nome do campo, com o valor invertido no modelo inteiro — §5.7 |
| **Sem agência intermediária** | 03/08/2026 | Encerra a pendência de modelagem aberta em 02/08; a aba saiu |
| **O escopo é texto, não contagem** | 03/08/2026 | Um briefing não cabe em quatro números. Perde-se a soma de peças, que é pergunta do Power BI |

---

### As decisões de arquitetura da rodada de 02/08/2026

Seis abas do Backlog foram definidas neste dia. As decisões abaixo **valem para as próximas** — é
o que se aprendeu construindo estas.

| # | Decisão | Onde apareceu | Registro |
|---|---------|---------------|----------|
| 1 | **Dado que descreve uma entidade mora na entidade**; a linha o lê | Interveniência ← talento · Segmento ← marca · Tipo e Origem ← ficha | [07 §10.4](07_visoes_e_relacoes.md) |
| 2 | Editar na linha, **gravar na entidade** — com a dica avisando o alcance | Segmento, categoria, contatos, origem do talento | [07 §10.4](07_visoes_e_relacoes.md) |
| 3 | **Espelhar é a mesma coluna**, não uma cópia | 7 colunas repetidas entre Demanda, Cliente, Talento, Entrega, Produção, Escopo | [08 §6](08_backlog_e_integracoes.md) |
| 4 | **Ausente ≠ nenhum valor da lista** | Toda classificação nova: output, impacto, edição, captação, origem | [08 §6.1](08_backlog_e_integracoes.md) |
| 5 | **Vazio ≠ zero** nas contagens | Reels, Vídeos, Post, Cotas | [08 §6](08_backlog_e_integracoes.md) |
| 6 | A **coluna** declara sua área, não a aba | Produção e GP na mesma aba | [08 §6](08_backlog_e_integracoes.md) |
| 7 | **Um tooltip** no app, e só quando o texto não coube | Toda a grade | [03 §7.9](03_padroes_ui.md) |
| 7b | **Cabeçalho nunca parte palavra** — métrica única nos três quadros | Toda tabela | [03 §7.10](03_padroes_ui.md) |
| 8 | Escalas de cor **não se repetem** entre colunas vizinhas | Prioridade (quente) × Impacto (frio) | [08 §6](08_backlog_e_integracoes.md) |
| 9 | Id é identidade — com **uma exceção documentada** | `backlog:escopo` → `backlog:demanda` | [08 §6.0.0](08_backlog_e_integracoes.md) |
| 10 | Texto livre para **valor**, número para **contagem** | `custoProducao` × `qtdReels` | [09 §2](09_fundacoes_tecnicas.md) |
| 11 | **Linhas independentes**, não grupo — duplicar copia trabalho, não vínculo | Projeto com mais de um talento | [08 §6.6](08_backlog_e_integracoes.md) |

#### O que ficou pendente da rodada

| Pendência | Quem decide |
|-----------|-------------|
| ~~Modelagem de **agências**~~ — **encerrada em 03/08**: não será usada, e a aba saiu (§5.7) | — |
| **Valor de Produção** numa aba não restrita | Operação — [08 §6](08_backlog_e_integracoes.md) |
| "Apoio" no Backlog × "parceiro" em Contratos | Produto — [08 §13.1](08_backlog_e_integracoes.md) |
| Listas de **Output, Edição e Captação** são proposta, não vocabulário confirmado | Operação |
| `Talento.origem` só editável pelo Backlog; a página Talentos não tem a coluna | Produto — [06 §5.1](06_pagina_talentos.md) |
| `captacaoComercial` e `CAPTACOES` sem coluna — a de Cliente foi removida | Produto |
| **Cadastro de Clientes** existe em branco | Operação — §2.1.1 |

---

## 10. Como auditar este sistema

Para quem precisar verificar o que está escrito aqui:

```bash
npm install
npm run dev                    # porta 3001 (strictPort — 3000 é de outro projeto)
npm run typecheck              # tipos, em modo strict
npm run build                  # build de produção
npm run test:ui                # 144 testes de UI
cd testes-regras && bash rodar.sh   # 36 suítes de regra — espere "TOTAL DE FALHAS: 0"
npx prisma validate            # modelo de dados
```

**As duas suítes estão no repositório** (§5). O runner recompila `src/utils/` e `src/data/` antes
de cada execução — sem isso, testaria o JavaScript da rodada anterior e passaria validando código
que já não existe. Ele também **conta suíte que não roda como falha**: um erro de importação
deixaria o arquivo mudo, e zero falhas por não ter executado nada é a pior categoria de verde.

**Para conferir uma regra específica**, comece pelo [índice](README.md): ele mapeia arquivo →
documento e lista onde cada decisão estrutural está registrada.

**Para conferir um número** desta documentação (contagem de testes, linhas, arquivos), meça de
novo. Todos foram coletados, não estimados — e ficam desatualizados a cada entrega.
