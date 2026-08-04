# PRD 05 — Perfis, Permissões e Isolamento de Dados
**Versão:** 6.2 | **Status:** Implementado no front-end | **Data:** 04/08/2026

[← Índice da documentação](README.md) · *Perfis, permissões e onboarding*


> Modelo de acesso da plataforma. Define **quem pode o quê**, **sobre o quê** e **como entra**.
> Regras em [`permissoes.ts`](../src/utils/permissoes.ts), [`convites.ts`](../src/utils/convites.ts)
> e [`identidade.ts`](../src/utils/identidade.ts) — funções puras, testáveis.

---

## 0. Hierarquia em quatro níveis

```
DONO DO SISTEMA        criador da conta · intocável · único que nomeia admins e concede capacidades
   └─ ADMIN CONVIDADO  ajuda na administração com o que o dono ligar para ele
        └─ RESPONSÁVEL   controle da sua equipe · convida e gerencia pessoas
             └─ MEMBRO   usa o que lhe foi liberado · edita o que é dele · pode pedir acesso
```

O dono **não é um perfil**: é a marca `ehDono`, acima da tabela de perfis. `admin` no código
significa **Admin Convidado**.

---

## 1. O modelo em uma frase

> **O perfil diz o que a pessoa pode fazer. A equipe diz onde.**

São dois eixos independentes que se cruzam:

| Eixo | Onde vive | Responde |
|------|-----------|----------|
| **Perfil de sistema** | `Usuario.perfil` | Qual o **teto** de capacidade |
| **Papel na equipe** | `MembroEquipe.papel` | **Onde** esse teto se aplica |

A capacidade efetiva é a **interseção** dos dois. Um `membro` marcado como responsável de uma
equipe continua sem administrar nada — o teto do perfil não permite. Um `responsavel` que é apenas
membro da equipe A não administra a equipe A.

> ### Correção da v6.0 — a interseção não valia nos quadros
>
> A regra acima era aplicada à **administração de equipes**, mas não ao **alcance nos quadros**:
> `nivelDeAcesso` decidia apenas pelo perfil de sistema.
>
> Consequência real, encontrada na auditoria de perfis: Bruno Carvalho é **responsável** da equipe
> de Orçamentos e apenas **membro** da equipe de Contratos. Como o perfil dele é `responsavel`,
> ele enxergava e editava **todo** o quadro de Contratos — inclusive linhas de outras pessoas —
> quando deveria ver só as próprias.
>
> Hoje o alcance no quadro pergunta pelo **papel na equipe que libera aquele quadro**:
>
> | Situação | Alcance |
> |----------|---------|
> | Responsável em alguma equipe que libera o quadro | `total` |
> | Apenas membro nas equipes que liberam | `nomeado` |
> | Perfil `membro`, qualquer papel na equipe | `nomeado` — o teto continua valendo |
>
> `podeEditarRegistro` e `podeEditarTalento` passaram a derivar do nível em vez de repetir a
> checagem de perfil: **escrita segue leitura**, e as duas não podem mais divergir por descuido.

---

## 2. Os três perfis

| Perfil | Escopo |
|--------|--------|
| **Admin do Sistema** | Administra a base de pessoas com o que o dono ligar para ele. **Não concede capacidades nem promove ninguém a admin** — os dois são exclusivos do dono (`podeGerenciarConcessoes`, `podeDefinirPerfil`); com `definir_perfis`, move apenas entre Responsável e Membro |
| **Responsável** | Administra as equipes em que é **responsável** e opera os quadros liberados a elas |
| **Membro** | Usa os quadros das suas equipes; edita **apenas o que está nomeado para ele**; não configura nada; pode **solicitar** acesso |

### 2.1. O Dono do sistema

O criador da conta (`Usuario.ehDono`) é uma trava estrutural, não um perfil:

| Regra | Por quê |
|-------|---------|
| Perfil e situação **imutáveis** | A plataforma nunca fica sem alguém no comando |
| **Não pode ser excluído nem inativado** — por ninguém | Idem |
| **Só ele promove alguém a Admin** | Se admin fabricasse admin, o nível se multiplicaria fora do controle do dono |
| **Só ele concede e revoga capacidades** | Se admins concedessem entre si, se autopromoveriam por triangulação |
| Admin Convidado move apenas entre Responsável e Membro | Idem |
| Ninguém exclui a si mesmo | Evita o administrador se trancar para fora |
| **Única identidade com mais de um e-mail**, e fora dos domínios corporativos | O dono precisa de acesso garantido mesmo se o domínio corporativo falhar |

Estas travas valem **mesmo com todas as capacidades concedidas** — foi o caso testado.

### 2.2. Capacidades concedíveis

O perfil dá um mínimo; o resto o dono liga por pessoa, com ou sem prazo.

São **oito** as capacidades de `AcaoConcedivel`:

| Capacidade | Id | Admin Convidado (base) | Concedível |
|------------|----|:----------------------:|:----------:|
| Ver a página de Usuários | `gerenciar_usuarios` | ✅ | — |
| Aprovar pedidos de acesso | `decidir_solicitacoes` | ✅ | — |
| **Abrir a aba de Acessos** | `gerenciar_acessos` | ❌ | ✅ |
| Criar equipes | `criar_equipe` | ❌ | ✅ |
| Conceder quadros às equipes | `conceder_quadros` | ❌ | ✅ |
| Alterar perfil de outras pessoas | `definir_perfis` | ❌ | ✅ |
| Gerenciar domínios de e-mail | `gerenciar_dominios` | ❌ | ✅ |
| Excluir pessoas da base | `excluir_usuarios` | ❌ | ✅ |

```
capacidade efetiva = ehDono ⋁ base do perfil ⋁ concessão ativa
```

**Concessão com janela** (`Concessao.expiraEm`): resolve a ausência sem promover ninguém — o
dono sai de férias, liga o que for necessário por N dias, e o acesso **cai sozinho** no
vencimento. Sem `expiraEm`, a concessão não tem prazo.

### 2.3. Onde se administra isso

A página **Usuários** é dividida em **abas**, cada uma com sua própria porta de entrada:

| Aba | Conteúdo | Quem vê |
|-----|----------|---------|
| **Pessoas** | Base de pessoas, edição inline e **ações em lote** | `gerenciar_usuarios` |
| **Acessos** | Capacidades, equipes e "Ver como" de uma pessoa | `gerenciar_acessos` |
| **Convites e pedidos** | Solicitações pendentes e convites em aberto | `gerenciar_usuarios` |
| **Configurações** | Domínios autorizados e e-mails de acesso do dono | `gerenciar_dominios` |

> **Por que separar:** a base cresce e a gestão de acesso não. Numa página só, a parte sensível
> ficaria soterrada sob centenas de linhas — e a permissão para vê-la seria a mesma de ver a lista,
> quando são coisas de risco diferente.

#### Aba Acessos

Busca em vez de listagem (com centenas de pessoas, uma lista aberta é inútil). Escolhida a
pessoa, três blocos:

1. **Capacidades** — tique por capacidade, com prazo opcional em dias
2. **Equipes** — tique de participação e alternância entre Responsável e Membro
3. **Quadros que enxerga** — resultado, só leitura. Três estados: ✅ **total**, 👤 **só os dela**
   (entra por nomeação ou é membro) e ✕ **sem acesso**

#### Ações em lote (aba Pessoas)

Seleção por checkbox e, na barra: **definir situação**, **adicionar/remover de equipe** e
**excluir**.

> **Regra:** o lote aplica só onde há permissão e **informa quantos ficaram de fora**. Silenciar
> os ignorados faria o operador acreditar que mudou 10 quando mudou 7.

---

## 3. Matriz de permissões

### 3.1. Navegação e leitura

| Ação | Admin | Responsável | Membro |
|------|:-----:|:-----------:|:------:|
| Ver quadro do Workspace | ✅ | se alguma equipe sua o libera, **ou** se está nomeado em alguma linha | idem |
| Ver **todas as linhas** do quadro | ✅ | só onde é **responsável da equipe** que libera | ❌ — sempre só as dele |
| Ver página **Equipes** | ✅ | se participa de alguma equipe | idem — **só a própria, em leitura** |
| Ver página **Usuários** | ✅ | ❌ | ❌ |
| Ver página **Meu perfil** | ✅ | ✅ | ✅ |
| Ver uma equipe na administração | todas | as que participa | as que participa |

### 3.2. Administração

| Ação | Admin | Responsável | Membro |
|------|:-----:|:-----------:|:------:|
| Criar equipe | ✅ | ❌ | ❌ |
| Renomear / excluir equipe | ✅ | nas que é responsável | ❌ |
| Adicionar e remover pessoas da equipe | ✅ | nas que é responsável | ❌ |
| Convidar por link | ✅ | nas que é responsável | ❌ |
| Definir papel na equipe | ✅ | nas que é responsável | ❌ |
| **Promover a responsável temporário** | ✅ | nas que é responsável | ❌ |
| Situação: férias, afastado, inativo | ✅ | de quem está na equipe dele | ❌ |
| Situação: **desligado** | ✅ | ❌ | ❌ |
| **Definir quais quadros a equipe enxerga** | só com `conceder_quadros` | ❌ | ❌ |
| Cadastrar pessoa | ✅ | nas que é responsável | ❌ |
| **Alterar perfil de sistema** | ✅ | ❌ | ❌ |
| Excluir pessoa da base | ✅ | ❌ | ❌ |
| Solicitar acesso | — | ✅ | ✅ |
| Aprovar / recusar solicitação | ✅ | ❌ | ❌ |

> ### ⚠️ Por que conceder quadros não vem de graça
>
> Se o responsável pudesse liberar quadros para a própria equipe, ele ampliaria o próprio acesso —
> e o teto deixaria de ser um teto. Ele monta o time; **quem define o alcance do time é quem tem
> `conceder_quadros`**.
>
> Isso **não** está na base do Admin Convidado: é uma capacidade que o dono liga por pessoa, com
> ou sem prazo (§2.2). Admin recém-convidado administra pessoas, não o alcance das equipes.
>
> *Corrigido na v6.0: a tabela acima dizia ✅ para Admin, contradizendo a §2.2. A implementação
> sempre seguiu a §2.2 — era a documentação que estava errada.*

### 3.3. Registros dos quadros (RLS de linha)

| Ação | Admin | Responsável | Membro |
|------|:-----:|:-----------:|:------:|
| Criar registro | ✅ | se a **equipe** libera o quadro | idem — nomeação não basta |
| **Editar registro** | ✅ | todo o quadro que sua equipe enxerga | **só onde está nomeado** |
| **Excluir registro** | ✅ | todo o quadro que sua equipe enxerga | ❌ nunca |
| Alterar responsáveis/parceiros da linha | ✅ | idem editar | idem editar |

**Estar nomeado** = constar em `responsaveisIds` **ou** `parceirosIds` do registro. No **Backlog**,
é constar em `Oportunidade.responsaveis` **ou** `Oportunidade.apoios` de alguma área
(`nomeadosDaOportunidade`): quem apoia precisa enxergar a linha para poder apoiar — o papel
distingue de quem se cobra a entrega, não quem pode ver.

> **Revertido em 01/08/2026.** Valia aqui: *"perder acesso ao quadro bloqueia tudo; um membro
> nomeado num contrato de um quadro que ele não enxerga não edita aquele contrato"*. Hoje a
> nomeação **é** uma porta de entrada — ele vê e edita aquela linha, e só ela. Ver §3.4.

#### 3.3.1. Talentos — o que conta como "nomeado"

A ficha do talento não tem `responsaveisIds`: ela nomeia **uma lista de pessoas por área** (lista
desde a v3.2 do PRD 06 — dupla de produção e substituto são situações correntes), entre as 6 áreas
da ficha. `AreaTalento` tem **10 valores**, mas 4 respondem **por projeto** e vivem no Backlog
(ver [`06_pagina_talentos.md` §5](06_pagina_talentos.md)). Estar nomeado é ser responsável de
qualquer uma delas — daí para frente, a regra é idêntica à dos contratos.

Ficha sem nenhum responsável definido trava todo membro: não há a quem atribuir.

---

## 3.4. Visibilidade de linhas — a regra que vale em todos os quadros

> **Mudança de 01/08/2026.** Antes, quem estava na equipe do quadro via **todas** as linhas e
> editava só as suas. Agora leitura e escrita andam juntas para o membro.

Um quadro tem **duas portas de entrada**, e o alcance depende de qual foi usada:

```
                            ┌─ perfil admin ou dono ─────────────→ TOTAL
                            │
  pessoa ──┬─ equipe libera ├─ perfil responsável ───────────────→ TOTAL
           │   o quadro     └─ perfil membro ───────────────────→ NOMEADO
           │
           └─ equipe NÃO libera ─┬─ nomeada em alguma linha ────→ NOMEADO
                                 └─ não nomeada ────────────────→ NENHUM
```

| Nível | Significa |
|-------|-----------|
| `total` | Vê todas as linhas do quadro |
| `nomeado` | Vê **só** as linhas em que foi nomeada |
| `nenhum` | O quadro não abre |

Implementado em `nivelDeAcesso()` e aplicado por `registrosVisiveis()`, genérica: cada quadro
informa como extrair os ids nomeados de um registro (`nomeadosDoContrato`, `nomeadosDoTalento`).

### 3.4.1. Por que a nomeação é uma porta

Nomear alguém de outra área sem lhe dar acesso produziria um responsável **incapaz de abrir o
próprio registro** — a atribuição existiria no dado e não na prática. A porta da nomeação resolve
isso sem inflar equipe: a pessoa entra, vê o que é dela, e nada mais.

### 3.4.2. Criar linha exige a porta da equipe

`podeCriarRegistro` chama `nivelDeAcesso(..., false)` — com o `false` explícito, ignorando a
nomeação. Quem entrou só porque nomearam seu nome numa linha vê aquela linha e nada além; abrir
uma nova seria alargar sozinho o próprio alcance.

### 3.4.3. Consequência na saída da equipe

Sair da equipe **corta o quadro, não as linhas**: quem continua nomeado segue enxergando e
editando os próprios registros. É o mesmo princípio do histórico — o vínculo com o registro
sobrevive à saída.

O aviso de remoção diz isso explicitamente e ensina o corte de fato: *"Para cortar o acesso por
completo, inative ou desligue a conta."* Um texto que prometesse "sem acesso a quadro algum"
estaria mentindo.

### 3.4.4. Reflexo na navegação

Quadros com nível `nenhum` continuam **visíveis na barra lateral, com cadeado e esmaecidos**.
Esconder faz a pessoa achar que o quadro não existe; mostrar trancado diz o que existe e a quem
pedir. Quadros em nível `nomeado` levam a etiqueta **Meus**.

As páginas de **Administração** seguem ocultas quando não há acesso — ali a existência do menu já
é informação restrita.

---

## 4. Isolamento de dados (RLS)

**Leitura e escrita têm a mesma granularidade: a linha.** Quem edita só o que é seu também
enxerga só o que é seu.

| Nível | Granularidade | Regra |
|-------|---------------|-------|
| **Leitura** | Por linha | Admin e responsável veem o quadro todo; membro e nomeado-de-fora, só as próprias linhas |
| **Escrita** | Por linha | Idêntica à leitura, menos excluir — membro nunca exclui |

Acesso é **cumulativo**: quem está em duas equipes enxerga a **união** dos quadros delas, sem
duplicação (`paginasDoUsuario`).

> ### Reversão registrada — 01/08/2026
>
> Até esta data valia o oposto, e o argumento estava escrito aqui: *"leitura não é filtrada linha
> a linha; a equipe precisa enxergar o todo para coordenar"*.
>
> O produto decidiu o contrário, e a razão vence: **coordenar é papel do responsável**, que
> continua vendo tudo. O membro não coordena — ele executa o que lhe cabe, e ver a carteira
> inteira de contratos da casa não é necessário para isso. Menos exposição por padrão.
>
> O custo é real e fica registrado: um membro **não descobre sozinho** um contrato do qual
> deveria participar. Depende de alguém nomeá-lo. Se isso virar atrito na operação, a saída é
> uma visão de quadro explicitamente compartilhada — não afrouxar a regra de volta.

---

## 4.1. Entrada na plataforma (onboarding)

```
DONO/ADMIN
 └─ cria a Equipe e marca os quadros que ela enxerga
     └─ convida o RESPONSÁVEL (e-mail + papel)
         └─ ele aceita pelo link e entra na equipe
             └─ convida os MEMBROS da equipe dele
                 └─ ou cadastra manualmente na grade
```

O responsável monta o time; **quem define o alcance do time é o admin**.

### 4.1.1. Como o convite chega até a pessoa

| Forma | Custo | Situação |
|-------|-------|----------|
| **Copiar link** e colar onde quiser | zero | ✅ implementado |
| **Copiar mensagem** pronta (link + domínios + prazo) | zero | ✅ implementado |
| **Enviar por e-mail** via `mailto:` | zero | ✅ implementado |
| Envio automático pela plataforma | depende do provedor | ⏸️ requer backend |

O `mailto:` abre o cliente de e-mail de quem convida, já preenchido. Vantagem além do custo: a
mensagem **sai do endereço corporativo de quem convidou**, o que entrega melhor do que um
remetente genérico da plataforma e dá contexto a quem recebe.

#### A camada de transporte

Toda tela chama `enviarEmail()` de [`src/services/email.ts`](../src/services/email.ts). Trocar
`mailto` por API é mudar **uma linha** naquele arquivo — nenhuma tela precisa ser tocada.

```ts
export const transporteAtual: TransporteEmail = transporteCliente; // → transporteApi
```

#### ⚠️ A credencial nunca vem para o front

Uma API de envio — a conta de serviço da Globo, Graph ou provedor transacional — exige chave,
segredo ou token OAuth. **Nada disso pode ficar em código que roda no navegador:**

- Qualquer pessoa abre o DevTools e copia a credencial
- Passa a disparar e-mail **em nome da empresa**
- Variável `VITE_*` não resolve: ela é embutida no bundle e fica visível igual

O desenho correto:

```
navegador → POST /api/email (com a sessão) → backend guarda a credencial → provedor
```

O backend valida **quem** está pedindo, monta a mensagem a partir de um modelo e só então chama o
provedor. `transporteApi` já fala com esse endpoint; falta o endpoint existir.

Opções de provedor, quando chegar a hora:

1. **Conta de serviço da Globo / Microsoft Graph** (`/sendMail`) — usa a licença corporativa que
   já existe, sem contratar serviço de e-mail. Combina com o SSO por Entra ID
2. **Resend / Brevo** — camadas gratuitas de milhares de e-mails/mês; exigem domínio verificado
   (SPF/DKIM)
3. **SMTP do Supabase** — simples, porém com limites baixos no plano inicial

### 4.2. Autenticação: SSO, sem senha

Decisão de produto: entrada por **SSO corporativo** (Microsoft Entra / Google Workspace).

| Consequência | Detalhe |
|--------------|---------|
| **Não existe senha** no sistema | Nada de hash, nada de "esqueci minha senha", nenhuma credencial sob nossa guarda |
| **Sem custo de e-mail transacional** | Não há envio de link de recuperação nem de login |
| Identidade vem do provedor | O e-mail corporativo devolvido pelo SSO **é** a identidade |
| O convite não carrega credencial | Ele apenas **autoriza** um e-mail a existir na plataforma |

### 4.3. Convite

`Convite` = `{ token, email, equipeId, papel, criadoPorId, criadoEm, expiraEm, aceitoEm?, revogadoEm? }`

| Regra | Por quê |
|-------|---------|
| Token de `crypto.randomUUID` | Token previsível seria porta aberta a quem adivinhasse a sequência |
| Vinculado a **e-mail + equipe + papel** | Quem recebe não escolhe onde entra nem com que poder |
| **Uso único** — queima ao ser aceito | Impede repasse do link |
| Expira em **24h** (`VALIDADE_HORAS`) | Limita a janela caso vaze |
| **Revogável** antes do uso | Convite errado se conserta |
| Aceite exige o **e-mail convidado** | Se o link for repassado, quem autenticar com outra conta é barrado |
| Um pendente por e-mail + equipe | Evita dois links válidos para a mesma pessoa |
| Convidar como **responsável** é só do admin | Responsável nomeando responsável criaria pares fora do controle de quem concedeu o acesso |

Precedência de estado: **revogado > aceito > expirado > pendente**.

Link: `#/convite/<token>` — rota por hash, já que não há servidor de rotas.

### 4.3.1. Link coletivo da equipe

O convite nominal é seguro, mas lento: um link por pessoa. Para o caso real de **"manda no grupo
da equipe"**, existe um segundo caminho — o link coletivo (`LinkEquipe`).

| | Convite nominal | Link coletivo |
|---|---|---|
| Destinatário | **um e-mail específico** | qualquer pessoa com o link |
| Papel concedido | membro **ou responsável** | **sempre membro** |
| Usos | um só | vários |
| Prazo | 24h | 24h, **com rotação** |
| Quem emite | admin e responsável | admin e responsável |
| Onde fica | página Equipes | página Equipes, dentro da equipe |

**Os cinco limites que o tornam aceitável:**

| Limite | O que contém |
|--------|--------------|
| **Domínio autorizado** | Só entra quem tem e-mail da empresa — a mesma `validarEmail` |
| **Prazo de 24h** | Um link vazado morre no dia seguinte |
| **Token aleatório** | `crypto.randomUUID` — 128 bits, imprevisível e sem relação com o id da equipe |
| **Rotação** | Renovar emite outro token e **desativa o anterior na hora**; cópias antigas param de servir mesmo dentro do prazo |
| **Visibilidade** | O bloco do link aparece só para **admin e responsáveis daquela equipe** — nunca para membro |
| **Sempre `membro`** | O link nunca concede responsabilidade — limita o dano de um vazamento |
| **Desativação** | Corta o acesso imediatamente, sem esperar o prazo |

Além disso, cada entrada é **registrada** (`usos: { usuarioId, em }`), então dá para auditar quem
entrou por ali.

> **A troca que está sendo feita:** menos burocracia em troca de um alcance maior. Quem tem o
> link e um e-mail corporativo entra sem aprovação. É aceitável porque o papel concedido é o mais
> baixo possível e a janela é curta — mas **não** é o caminho para conceder responsabilidade,
> que continua exigindo convite nominal do admin.

Na tela de entrada, os domínios aceitos aparecem **dinamicamente**, a partir da lista que o admin
mantém — não há texto fixo a atualizar quando a lista mudar.

### 4.4. Conta única

O **e-mail normalizado** (minúsculas, sem espaços) é a chave de identidade.

> **Exceção do dono:** ele é a única identidade que entra por **mais de um e-mail** e por
> **domínio livre** (`Usuario.emailsAlternativos`). Serve de rota de acesso alternativa se o
> domínio corporativo ficar indisponível. Todos os demais: um e-mail, dentro da lista autorizada.

| Regra | Onde vale |
|-------|-----------|
| Formato válido | Cadastro manual e convite |
| **Domínio autorizado** | Idem — lista editável pelo admin, começa com `g.globo`, `globo.com`, `viu.com.br` |
| E-mail ainda não cadastrado | Idem |
| Aceite com e-mail **já existente** apenas **vincula** à equipe | Não cria segunda conta |

As duas portas de entrada (manual e convite) chamam a **mesma** função `validarEmail` — validações
duplicadas divergem com o tempo e abrem caminho para conta duplicada por um dos lados.

---

## 4.4.1. Situação e equipe são o mesmo assunto

A saída de uma equipe e a situação da conta estão **ligadas**: quando alguém fica sem equipe
nenhuma, a interface pergunta na hora se é **Inativo** ou **Desligado**. Detalhes do fluxo em
[`04_pagina_equipes.md` §7](04_pagina_equipes.md).

Motivo: uma conta **ativa sem equipe alguma** não enxerga nada, mas continua podendo entrar —
é acesso órfão, e órfão ninguém revisa. `acessoOrfao()` identifica esses casos.

## 4.5. Situação da pessoa

Campo separado do perfil, porque responde a outra pergunta: não *o que ela pode*, mas *se está aí*.

| Situação | Acesso | Efeito | Quem altera |
|----------|:------:|--------|-------------|
| 🟢 **Ativo** | ✅ | Normal | — |
| 🔵 **Férias** | ✅ | Sinal de ausência no avatar e na tabela | Admin, ou responsável na equipe dele |
| 🟡 **Afastado** | ✅ | Sinal de ausência prolongada | Admin, ou responsável na equipe dele |
| ⚫ **Inativo** | ❌ | Não entra; histórico preservado | Admin, ou responsável na equipe dele |
| 🔴 **Desligado** | ❌ | Não entra e **sai de todas as equipes**; histórico preservado | **Só admin** |

> **Inativar × excluir:** a pessoa aparece como responsável de contratos. Inativar preserva esse
> rastro; excluir apaga a pessoa e o histórico perde o "quem fez". A recomendação é **desligar**,
> e reservar a exclusão para contas criadas por engano.

Uma conta sem acesso é bloqueada **antes** de qualquer outra regra: `contaAtiva` é a primeira
verificação de `podeVerPagina`, então nem um admin inativo entra.

---

## 4.6. Meu perfil: cada um mantém os próprios dados

Página **Meu perfil**, acessível a **qualquer pessoa** pelo rodapé da barra lateral.

| Campo | Quem edita | Observação |
|-------|-----------|------------|
| Nome, cargo, telefone, local, nascimento | A própria pessoa | Quem sabe o telefone atual é ela |
| Foto | A própria pessoa (admin pode remover) | Ver §4.7 |
| **E-mail de acesso** | A própria pessoa, **com confirmação** | Ver abaixo |
| Perfil, situação, equipes | Só a administração | Exibidos em leitura |

> **Por que descentralizar:** dado de contato mantido só pela administração envelhece. Quem sabe
> que mudou de cidade é a pessoa.

### Troca do e-mail de acesso

O e-mail é a identidade — trocar sem confirmar permitiria assumir a conta de outra pessoa apenas
digitando o endereço dela. O fluxo espelha o do convite:

| Regra | Detalhe |
|-------|---------|
| Validação | Formato, **domínio autorizado** e e-mail ainda não usado — a mesma `validarEmail` |
| Token | `crypto.randomUUID`, link `#/confirmar-email/<token>` |
| Prazo | 24h (`VALIDADE_HORAS_EMAIL`) |
| Uso único | Confirmar duas vezes falha |
| Uma pendência por vez | Duas trocas abertas deixariam ambíguo qual link vale |
| Efetivação | O e-mail só muda **ao abrir o link** — é o gesto que prova acesso à caixa nova |

**Exceção do dono:** e-mails alternativos (§4.4) continuam sendo adicionados direto, sem
confirmação, porque são a rota de contingência do próprio dono.

## 4.7. Foto de perfil

Sem servidor de arquivos, a imagem é processada **no navegador** (`utils/foto.ts`):

| Etapa | Regra |
|-------|-------|
| Tipos aceitos | JPG, PNG, WebP |
| Tamanho de origem | até 5 MB |
| Processamento | recorte quadrado central + redução para **256 px** + JPEG 85% |
| Armazenamento | data URL no próprio registro |
| Sem foto | Iniciais coloridas, cor derivada do nome |

> **Por que redimensionar antes:** uma foto de celular tem ~4 MB. Guardada crua, entraria inteira
> no estado e depois no banco, a cada usuário. Reduzida, fica na casa de dezenas de KB.
>
> **Quando houver backend:** `processarFoto` passa a devolver o arquivo para upload em storage
> (ex.: Supabase Storage) e `Usuario.fotoUrl` guarda a URL. **Não é preciso "banco de imagens"
> próprio** — um bucket de objetos resolve, e o modelo já está preparado.

---

## 5. Fluxo de solicitação de acesso

```
Membro/Responsável abre a equipe → "Solicitar acesso" → justificativa
   → pedido entra na página Usuários, faixa âmbar
      → Admin aprova  → pessoa entra na equipe como membro
      → Admin recusa  → pedido fica registrado como recusado
```

`SolicitacaoAcesso` guarda solicitante, equipe, justificativa, status, data e quem decidiu.
Aprovar **já cria o vínculo** — não exige um segundo passo manual.

---

## 6. Onde cada coisa é gerenciada

Decisão de produto: **duas páginas separadas** no bloco ADMINISTRAÇÃO.

| Página | Responde por | Quem acessa |
|--------|--------------|-------------|
| **Equipes** | Composição dos times e quais quadros cada um enxerga | Admin e responsáveis |
| **Usuários** | Base global de pessoas, **perfil de sistema** e solicitações | Só admin |

> **Por que separar:** perfil de sistema é global; composição de equipe é local. Editar poder
> global dentro do contexto de uma equipe induz ao erro de "promover a admin sem perceber" —
> a pessoa acha que está mexendo naquele time e mexeu na plataforma inteira.

---

## 6.1. "Ver como": auditar sem virar a pessoa

Na aba Acessos, o botão **Ver como** renderiza a plataforma inteira com os olhos de outra
pessoa — navegação, quadros, cadeados — **sem trocar de identidade**.

| Aspecto | Comportamento |
|---------|---------------|
| Leitura | Reflete exatamente a visão da pessoa observada |
| **Escrita** | **Bloqueada em tudo**, mesmo sendo o dono por trás |
| Identidade | Você continua conectado como você; o rodapé da barra lateral segue mostrando seu nome |
| Sinalização | Faixa âmbar fixa no topo, impossível de ignorar, com botão de sair |
| Troca de sessão | Desabilitada enquanto a visualização estiver ativa |

> **Por que somente leitura:** agir no lugar de alguém produziria alterações sem rastro de quem
> realmente as fez. Para auditar acesso basta ver; para agir, saia da visualização e aja como você.

Implementação: `Contexto.visualizacao` entra em todas as funções de escrita como primeira
verificação. Não há caminho que escape — foi o objeto do teste dedicado.

### 6.2. "Ver como" × "Entrar como (demo)"

| | Ver como | Entrar como (demo) |
|---|---|---|
| Natureza | **Funcionalidade de produto** | Ferramenta de desenvolvimento |
| Onde | Aba Acessos | Rodapé da barra lateral |
| Escrita | Bloqueada | Liberada — é uma sessão de verdade |
| Futuro | Permanece com o SSO | **Sai** quando houver login |

---

## 7. Sessão (provisório)

Não há autenticação. A sessão é uma constante (`USUARIO_ATUAL_ID`) e o rodapé da barra lateral
traz um seletor **"Entrar como (demo)"** que troca o usuário corrente.

> Serve para **verificar as regras na prática**: entre como Membro e veja os cadeados aparecerem,
> os blocos sumirem da navegação e o botão de criação desaparecer.
>
> **Este seletor sai quando existir login.** Enquanto ele existir, não há segurança real: as
> regras vivem no cliente e protegem contra erro de operação, não contra usuário mal-intencionado.

---

## 8. Aplicação real × declarativa

| Regra | Situação |
|-------|----------|
| Navegação filtrada por permissão | ✅ Aplicada |
| Blocos da barra lateral somem sem itens visíveis | ✅ Aplicada |
| Página aberta que perde acesso cai na primeira permitida | ✅ Aplicada |
| Edição e exclusão por linha | ✅ Aplicada |
| Gestão de equipe restrita | ✅ Aplicada |
| Perfil só editável pelo admin | ✅ Aplicada |
| **Validação no servidor** | ❌ Não existe servidor |

Sem backend, tudo é **defesa de interface**. Quando houver persistência, cada regra desta matriz
precisa ser reimplementada no servidor — idealmente como *row level security* no banco, espelhando
`podeEditarRegistro` e `podeVerPagina`.

---

## 8.1. Quem pode ser nomeado num registro

A coluna Responsável dos quadros **não lista a base inteira**: lista quem participa das equipes
que operam aquele quadro (`usuariosDoQuadro`).

> **Por quê:** nomear alguém de fora criaria um responsável **sem acesso ao próprio registro** —
> a pessoa apareceria como dona de um contrato que não consegue abrir.

Quem já está na linha continua aparecendo mesmo depois de sair da equipe, para não sumir com o
histórico. Sem ninguém na equipe, o seletor explica onde cadastrar em vez de mostrar lista vazia.

---

## 9. Verificação

O repositório tem **33 suítes automatizadas** (1.451 asserções, medição 04/08/2026), todas
verdes — incluindo uma **simulação da jornada completa** em 12 etapas (dono cria equipe → convida
responsável → link repassado é recusado → responsável convida membro → operação nos contratos →
liberação de quadro → férias e desligamento → travas do dono). Abaixo, as que cobrem este PRD.

### 9.0. Modo "Ver como" (28 casos)

| Caso | Resultado esperado |
|------|--------------------|
| Leitura na visualização | idêntica à da pessoa observada |
| Editar registro que a pessoa editaria | **bloqueado** |
| Criar, excluir, convidar, decidir pedido | bloqueado |
| Mudar perfil, situação, capacidades, domínios | bloqueado |
| Visualizando **o próprio dono** | vê tudo, **não escreve nada** |
| Sessão normal depois de sair | intacta |

Sobre `permissoes.ts`, `convites.ts`, `identidade.ts` e `equipes.ts`:

### 9.1. Onboarding e identidade (47 casos)

| Caso | Resultado esperado |
|------|--------------------|
| Convite aberto por **outro e-mail** (link repassado) | bloqueado |
| **Segundo** aceite do mesmo convite | bloqueado |
| Aceite em 23h / em 25h | vale / expirado |
| Convite revogado depois de aceito | conta como **revogado** |
| Domínio fora da lista | bloqueado |
| E-mail duplicado com caixa diferente | detectado |
| Editar o próprio e-mail | não acusa duplicidade |
| Admin promovendo alguém a admin | bloqueado — é do dono |
| Admin rebaixando o dono | bloqueado |
| Responsável desligando alguém | bloqueado |
| Admin **inativo** acessando qualquer página | bloqueado |

### 9.1.1. Perfil próprio e troca de e-mail (25 casos)

| Caso | Resultado esperado |
|------|--------------------|
| Membro editando o próprio cadastro | liberado |
| Membro editando o de outra pessoa | bloqueado |
| Conta inativa editando o próprio | bloqueado |
| Edição própria durante "Ver como" | bloqueado |
| Troca de e-mail para domínio não autorizado | bloqueado |
| Troca para e-mail de outra pessoa | bloqueado |
| Confirmar link expirado ou já usado | bloqueado |
| Membro abrindo a página Equipes | liberado, **só a própria equipe** |

### 9.1.2. Link coletivo da equipe (36 casos)

| Caso | Resultado esperado |
|------|--------------------|
| Entrar com o link no prazo | liberado |
| Entrar às 25h | bloqueado — expirado |
| Link desativado | bloqueado, mesmo dentro do prazo |
| Desativado **e** expirado | reporta desativado (precedência) |
| Equipe apagada depois do link | bloqueado |
| Renovar | token novo **e** anterior desativado na hora |
| Vigentes por equipe | sempre **um** |
| E-mail de fora do domínio | bloqueado |
| Papel concedido | **sempre membro** |
| Mensagem de compartilhamento | cita equipe, domínios, prazo e link |
| 200 emissões seguidas | 200 tokens distintos |
| Formato do token | 32 hex, sem relação com o id da equipe |
| Quem vê o bloco do link | dono, admin e responsável **daquela** equipe |
| Membro e responsável de outra equipe | não veem |
| Durante "Ver como" | ninguém vê |

> **Frequência da rotação:** o endereço muda **a cada dia** ou quando alguém clica em Renovar.
> Trocar a cada carregamento de página quebraria o link que acabou de ser colado no chat da
> equipe — o objetivo do link coletivo é justamente durar o expediente.

### 9.2. Níveis de admin e concessões (26 casos)

| Caso | Resultado esperado |
|------|--------------------|
| Admin Convidado criando equipe **sem** concessão | bloqueado |
| A mesma ação **com** concessão | liberado |
| Concessão vazando para outra ação ou outra pessoa | não vaza |
| Janela vencida | deixa de valer sozinha |
| Admin com **todas** as capacidades rebaixando o dono | bloqueado |
| Idem, promovendo alguém a admin | bloqueado |
| Admin concedendo capacidades a outro | bloqueado — só o dono |
| E-mails alternativos de outra pessoa | bloqueado — só o dono, sobre si |
| Candidatos a responsável | só quem opera aquele quadro |

### 9.3. Permissões e RLS (40 casos)

| Caso | Resultado esperado |
|------|--------------------|
| Perfil `responsavel`, mas só **membro** naquela equipe | **não** administra |
| Membro editar linha alheia | bloqueado |
| Membro excluir a **própria** linha | bloqueado |
| Nomeado em quadro que não enxerga | bloqueado |
| Responsável conceder quadro à própria equipe | bloqueado (escalada de privilégio) |
| Responsável alterar perfil de alguém | bloqueado |
| Pessoa sem equipe | não vê nada |
| Acesso por duas equipes | união, sem duplicar |

---

## 10. O que falta para virar segurança de verdade

O fluxo está **simulado no cliente**. O que precisa existir no servidor:

| Item | O que muda |
|------|------------|
| **SSO real** | Entra ID / Google devolve o e-mail autenticado; a tela de aceite deixa de perguntar quem você é |
| **Envio de e-mail** | Convites e confirmações de troca hoje aparecem como link na tela; passam a ser enviados |
| **Storage de imagens** | A foto deixa de ser data URL e vira objeto num bucket, com `fotoUrl` apontando para ele |
| **Sessão assinada** | Hoje a sessão é um estado React e o seletor "Entrar como" some |
| **Convites no banco** | Token com hash, checagem de expiração no servidor, e não no navegador |
| **RLS no banco** | Cada regra da §3 reimplementada como política de linha |
| **Rota real** `/convite/:token` | Hoje é hash; com servidor, vira rota de verdade |

> Enquanto isso não existir, as regras protegem contra **erro de operação**, não contra usuário
> mal-intencionado: tudo roda no navegador e pode ser contornado por quem quiser.

---

## 11. Próximos passos

1. **Autenticação SSO** — sem ela nada disso é segurança de verdade
2. **RLS no banco**, espelhando a matriz da §3
3. Permissões por ação dentro do quadro (ex.: quem pode mover status para `Concluído`)
4. Registro de auditoria: quem mudou o quê e quando
5. Notificar o solicitante quando o pedido for decidido
6. Reenviar convite expirado em um clique, reaproveitando e-mail, equipe e papel
