# Documentação — VIU Agenciamento

**Atualizado:** 04/08/2026 · **Base:** código em [`src/`](../src/)

Esta pasta é a documentação de projeto do sistema: **por que** cada coisa é como é, não só o que
ela faz. Serve para três usos — auditar uma decisão, recriar o sistema do zero, e dar manutenção
sem reabrir discussões já encerradas.

> **Regra de ouro desta documentação:** toda decisão registrada vem com o **motivo** e, quando
> houve, a **alternativa descartada**. Documento que só descreve comportamento é redundante com o
> código; o que se perde quando alguém sai da equipe é o raciocínio.

---

## Por onde começar

| Se você quer… | Leia |
|---------------|------|
| Entender o produto e o problema que ele resolve | [01 — Visão de produto](01_visao_produto.md) |
| Saber o que está pronto e o que falta | [00 — Status de implementação](00_status_implementacao.md) |
| Mexer na interface | [03 — Padrões de UI](03_padroes_ui.md) |
| Entender quem vê o quê | [05 — Perfis e usuários](05_perfis_usuarios.md) → [07 — Visões e relações](07_visoes_e_relacoes.md) |
| Construir o backend | [00 §8](00_status_implementacao.md) — começa pelo esquema, que já existe —, [05 §10](05_perfis_usuarios.md), [08 §10–11](08_backlog_e_integracoes.md) |
| Adicionar um quadro novo | [07 §8](07_visoes_e_relacoes.md) e [07 §12](07_visoes_e_relacoes.md) |
| Auditar uma decisão específica | a tabela de decisões abaixo |

---

## Os documentos

| # | Documento | Cobre |
|---|-----------|-------|
| **00** | [Status de implementação](00_status_implementacao.md) | Retrato factual do repositório, inventário, testes, bugs encontrados, débito técnico, próximos passos |
| **01** | [Visão de produto](01_visao_produto.md) | Propósito, objetivos, processo da operação, pipeline |
| **02** | [Quadro de Contratos](02_quadro_talentos.md) | A página de Contratos de Agenciados, ponta a ponta |
| **03** | [Padrões de UI](03_padroes_ui.md) | Cores, tipografia, estrutura de página, tabelas, movimento, textos — **o que vale para toda tela nova** |
| **04** | [Página de Equipes](04_pagina_equipes.md) | Equipes, membros, papéis, saída sem perda de histórico |
| **05** | [Perfis e usuários](05_perfis_usuarios.md) | Hierarquia, permissões, onboarding, sessão, "Ver como" |
| **06** | [Página de Talentos](06_pagina_talentos.md) | Cadastro de talentos, abas, vínculo com contratos |
| **07** | [Visões e relações](07_visoes_e_relacoes.md) | Permissão por aba e por coluna, referências entre quadros |
| **08** | [Backlog e integrações](08_backlog_e_integracoes.md) | Oportunidades, máquina de status, SLA, ingestão por e-mail/Salesforce |
| **09** | [Fundações técnicas](09_fundacoes_tecnicas.md) | Datas, moeda, persistência, IDs — as regras que atravessam tudo |

---

## Mapa: código → documento

Ao mexer num arquivo, o documento que explica as decisões dele:

| Código | Documento |
|--------|-----------|
| `utils/permissoes.ts` | [05 §3](05_perfis_usuarios.md), [05 §3.4](05_perfis_usuarios.md) |
| `utils/visoes.ts` · `utils/colunas.ts` | [07 §1–6](07_visoes_e_relacoes.md); larguras em px e grade contínua: [08 §6](08_backlog_e_integracoes.md), [00 §5.12](00_status_implementacao.md), [09 §8](09_fundacoes_tecnicas.md) |
| `utils/referencias.ts` | [07 §10](07_visoes_e_relacoes.md) |
| `utils/fluxoStatus.ts` | [08 §3](08_backlog_e_integracoes.md), [08 §3.3](08_backlog_e_integracoes.md) |
| `utils/sla.ts` | [08 §4](08_backlog_e_integracoes.md), [09 §4](09_fundacoes_tecnicas.md) |
| `utils/ingestao.ts` | [08 §10](08_backlog_e_integracoes.md) |
| `utils/oportunidades.ts` | [08 §2](08_backlog_e_integracoes.md), [08 §7.5](08_backlog_e_integracoes.md) |
| `utils/moeda.ts` | [09 §2](09_fundacoes_tecnicas.md) |
| `utils/dates.ts` | [09 §1](09_fundacoes_tecnicas.md) |
| `utils/persistencia.ts` | [09 §3](09_fundacoes_tecnicas.md) |
| `utils/ids.ts` | [09 §5](09_fundacoes_tecnicas.md) |
| `utils/navegacao.ts` · `App.tsx` | [09 §8](09_fundacoes_tecnicas.md) |
| `utils/vigencia.ts` · `utils/talentosStatus.ts` | [02 §5–6](02_quadro_talentos.md) |
| `utils/equipes.ts` · `utils/saida.ts` | [04 §4](04_pagina_equipes.md), [04 §7](04_pagina_equipes.md) |
| `utils/convites.ts` · `utils/linkEquipe.ts` · `utils/identidade.ts` · `utils/trocaEmail.ts` | [05 §4.1](05_perfis_usuarios.md) |
| `utils/talentos.ts` · `utils/busca.ts` | [06](06_pagina_talentos.md) |
| `utils/exportacao.ts` | [08 §6](08_backlog_e_integracoes.md) — o contrato do `.xlsx`, [09 §6](09_fundacoes_tecnicas.md) |
| `utils/pessoas.ts` | [02 §11](02_quadro_talentos.md) — responsáveis e parceiros |
| `data/marcas.ts` · `components/ui/SelecaoComCadastro.tsx` | [08 §6.0.1](08_backlog_e_integracoes.md), [07 §11.2](07_visoes_e_relacoes.md) |
| `utils/marcas.ts` | [08 §6 — aba Cliente](08_backlog_e_integracoes.md) |
| `components/ui/Dica.tsx` | [03 §7.9](03_padroes_ui.md) |
| `components/ui/CelulaNumero.tsx` · `CelulaData.tsx` | [03 §10](03_padroes_ui.md), [08 §6](08_backlog_e_integracoes.md) |
| `components/backlog/EtiquetaSelect.tsx` | [03 §10](03_padroes_ui.md) |
| `pages/CadastroClientes.tsx` | [00 §2.1.1](00_status_implementacao.md), [08 §13.1](08_backlog_e_integracoes.md) |
| `utils/foto.ts` | [05 §4.7](05_perfis_usuarios.md) |
| `components/ui/*` | [03 §10](03_padroes_ui.md) |
| `context/DadosProvider.tsx` | [04 §8](04_pagina_equipes.md), [09 §5](09_fundacoes_tecnicas.md) |
| `services/email.ts` | [08 §11](08_backlog_e_integracoes.md) |
| `prisma/schema.prisma` | [00 §8](00_status_implementacao.md) — o modelo de dados e as decisões de mapeamento |

---

## Decisões estruturais — onde cada uma está registrada

As escolhas que mudariam o sistema se fossem revisadas. Toda alteração numa delas deveria começar
por reler o registro correspondente.

### Modelo de acesso

| Decisão | Onde |
|---------|------|
| Três camadas: quadro → aba → coluna | [07 §1](07_visoes_e_relacoes.md) |
| Abas são fechadas por declaração; colunas, abertas com bloqueio por exceção | [07 §2](07_visoes_e_relacoes.md) |
| Perfil é teto, equipe é escopo — a capacidade é a interseção | [05 §1](05_perfis_usuarios.md) |
| Membro só vê as linhas em que foi nomeado | [05 §3.4](05_perfis_usuarios.md) |
| Quadro sem acesso aparece com cadeado, não sumido | [05 §3.4](05_perfis_usuarios.md) |
| Coluna oculta vira borrão, e o valor **não chega ao DOM** | [07 §3](07_visoes_e_relacoes.md) |
| A busca não varre campo oculto | [07 §5](07_visoes_e_relacoes.md) |
| O dono não pode ser rebaixado por ninguém | [05 §2](05_perfis_usuarios.md) |
| Expiração é avaliada **na leitura**, nunca por rotina agendada | [05 §4.4](05_perfis_usuarios.md) |

### Processo e dados

| Decisão | Onde |
|---------|------|
| Máquina de status com transições fechadas | [08 §3](08_backlog_e_integracoes.md) |
| Encerramento automático aos 20 dias corridos | [08 §3.3](08_backlog_e_integracoes.md) |
| SLA de triagem: 5 dias **úteis**, e o relógio para ao sair da triagem | [08 §4](08_backlog_e_integracoes.md) |
| Declinado é um status com **motivo**, não três status | [08 §7.5](08_backlog_e_integracoes.md) |
| Exclusivo (invertido de `interveniencia` na v9) deriva do vínculo do talento — não se digita | [08 §6.0.2](08_backlog_e_integracoes.md) |
| Revisão e Aguardando Feedback congelam a edição; o status não | [08 §3.2](08_backlog_e_integracoes.md) |
| Finalizados saem da lista após 30 dias — análise é no Power BI | [08 §6.3](08_backlog_e_integracoes.md) |
| Exclusivo e interveniência são o mesmo cadastro, com um campo `tipo` | [06 §5](06_pagina_talentos.md) |
| Nome digitado num contrato **abre ficha** de talento pendente | [07 §11.1](07_visoes_e_relacoes.md) |
| Referência de coluna previne "Gil do Vigor" × "Gilberto do Vigor" | [07 §10](07_visoes_e_relacoes.md) |
| Marca e Talento escolhem de lista cadastrada, com escape para criar | [08 §6.0.1](08_backlog_e_integracoes.md) |
| Classificação não tem default — ausente é "por definir" | [08 §6.0.3](08_backlog_e_integracoes.md) |
| A integração não inventa classificação; deixa para conferência | [08 §10.1](08_backlog_e_integracoes.md) |
| Id deriva do que está carregado, nunca de constante ou `length` | [09 §5](09_fundacoes_tecnicas.md) |
| Quem sai da equipe permanece como responsável nos registros | [04 §7](04_pagina_equipes.md) |
| Ingestão é pura e idempotente, com dedup por `origem + idExterno` | [08 §10](08_backlog_e_integracoes.md) |
| Correção humana vence o que vem da integração | [08 §10](08_backlog_e_integracoes.md) |
| Pendência é post-it com relógio, não status: trava só Elaboração→Revisão; Chegou/Reabrir/✕ sempre reversíveis | [08 §6.5](08_backlog_e_integracoes.md) |
| SLA por status é do banco + Power BI, via `StatusEvento` — o front não grava o log | [08 §6.5](08_backlog_e_integracoes.md), [09 §3](09_fundacoes_tecnicas.md) |

### Interface

| Decisão | Onde |
|---------|------|
| Tudo é tabela; a navegação mora na faixa navy | [03 §3](03_padroes_ui.md) |
| O quadro ocupa a tela; só a lista rola | [03 §7.4](03_padroes_ui.md) |
| Linha de tabela **não** anima a saída | [03 §7.5](03_padroes_ui.md) |
| Seleção é a interseção com o que está visível | [03 §7.6](03_padroes_ui.md) |
| Ordenação segue a ordem da operação, não o alfabeto | [03 §7.7](03_padroes_ui.md) |
| Criar é um gesto só: o botão insere a linha, com a chave em edição | [03 §7.8](03_padroes_ui.md) |
| A página aberta sobrevive ao F5, e a URL a reflete — roteamento por caminho, sem biblioteca | [09 §8](09_fundacoes_tecnicas.md) |
| Popovers em portal — `overflow` recorta filho posicionado | [03 §4](03_padroes_ui.md) |
| `layoutId` do motion precisa ser único por instância | [03 §7.3](03_padroes_ui.md) |
| Pesos de coluna somam um total fixo por aba | [03 §3](03_padroes_ui.md), [07 §6](07_visoes_e_relacoes.md) |

### Segurança

| Decisão | Onde |
|---------|------|
| Credencial **nunca** no front — nem em `VITE_*`, que vai no bundle | [08 §11](08_backlog_e_integracoes.md) |
| SSO corporativo, sem senha no sistema | [05 §4.1](05_perfis_usuarios.md) |
| Conta única por e-mail; domínios autorizados editáveis | [05 §4.1](05_perfis_usuarios.md) |
| Troca de e-mail exige confirmação — e-mail é identidade | [05 §4.6](05_perfis_usuarios.md) |
| Convite nominal: 24h, uso único, só para o e-mail convidado | [05 §4.1](05_perfis_usuarios.md) |
| Link coletivo: domínio + 24h + rotação diária + desativação | [05 §4.1](05_perfis_usuarios.md) |
| "Ver como" é leitura, com faixa permanente na tela | [05 §6.1](05_perfis_usuarios.md) |
| **O que existe hoje é máscara de interface, não segurança** | [05 §10](05_perfis_usuarios.md) |

---

## O que este sistema **não** é

Registrado aqui porque é a origem de metade das decisões:

- **Não é ferramenta de análise.** É controle de processo e máscara de dados. Séries históricas,
  cruzamentos e gráficos são feitos no **Power BI lendo o banco** — por isso a lista solta os
  finalizados após 30 dias e não há tela de relatório. ([08 §6.3](08_backlog_e_integracoes.md))
- **Não tem segurança de verdade ainda.** Sem backend, todo o controle de acesso é máscara de
  interface: os dados estão no navegador de quem abre. ([05 §10](05_perfis_usuarios.md))
- **Não é multiusuário hoje.** `localStorage` é por navegador; nada é compartilhado.
  ([09 §3](09_fundacoes_tecnicas.md))

---

## Convenções

**Versão e data** no topo de cada documento. Ao alterar comportamento, atualize o documento
correspondente **na mesma entrega** — documentação que fica para depois não é escrita.

**Links de código** em caminho relativo (`../src/utils/permissoes.ts`), clicáveis no editor.

**Números vêm de medição.** Contagens de teste, linhas e arquivos são coletadas, não estimadas.
Ver [00 §5](00_status_implementacao.md).
