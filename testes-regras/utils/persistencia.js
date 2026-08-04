/**
 * Persistência local — o que impede a demonstração de perder tudo num F5.
 *
 * ## Por que existe, e o que NÃO é
 *
 * Não é o banco de dados, nem um ensaio dele. É uma rede de proteção para o período em que o
 * produto ainda vive só no navegador: sem ela, recarregar a página apaga cada contrato cadastrado
 * e cada permissão configurada.
 *
 * Guarda em `localStorage`, por chave, e **não** define esquema: quando o backend existir, este
 * módulo sai inteiro sem deixar rastro nas regras — nenhuma delas o conhece.
 *
 * ## Versão do formato
 *
 * `VERSAO` entra na chave. Mudou o formato de um dado (como `responsaveis`, que era texto e virou
 * lista), sobe o número: o que estava salvo é ignorado e o seed volta. Ler dado antigo com código
 * novo produz erro silencioso e difícil de rastrear — preferimos perder o rascunho a exibir uma
 * tela quebrada.
 */
const PREFIXO = 'viu';
/*
  v9 — 03/08/2026: a rodada de ajustes do Backlog. `Oportunidade` teve três mudanças de forma ao
  mesmo tempo, e qualquer uma sozinha já exigiria subir:

  1. `interveniencia` virou `exclusivo` — **com o valor invertido**. Esta é a que torna o descarte
     obrigatório: um registro v8 lido como v9 não daria erro nenhum, apenas exibiria todo talento
     exclusivo como não-exclusivo e vice-versa. Dado que carrega em silêncio e mente é pior que
     dado que quebra a tela.
  2. `qtdReels`, `qtdVideos`, `qtdPosts` e `qtdCotas` saíram; entrou `escopo`, obrigatório.
  3. A aba Agência foi removida, e com ela o id `backlog:agencia` que podia estar em
     `colunasOcultas` de alguma equipe.

*/
/*
  v5 — 02/08/2026: entrou a entidade Marca, e as colunas Marca e Talento passaram a escolher de
  lista cadastrada. Sem subir, o `localStorage` de quem já usou não teria a chave `marcas` e as
  duas colunas abririam vazias.

  v4 — 02/08/2026: o seed do Backlog passou a ter dois exemplos por status.

  v8 — 02/08/2026, fim do dia: a rodada das doze abas. `Oportunidade` ganhou sete campos
  obrigatórios (comissão Globo, saving, PEP e os quatro links), perdeu nove órfãos do modelo
  antigo, e o seed de equipes ganhou Pagamentos e Jurídico — sem elas, as colunas de pessoas
  dessas áreas abrem o painel vazio. Um salvamento v7 feito no meio do dia carregaria linhas sem
  campos que o código agora exige.

  A lição desta versão: **a versão sobe junto com a mudança de forma, não no fim do dia.** O v7
  ficou aberto enquanto sete campos obrigatórios entravam — qualquer F5 nesse intervalo gravava
  dados no formato velho sob o número novo.

  v7 — 02/08/2026: a primeira aba virou **Demanda**, e o id mudou junto (`backlog:escopo` →
  `backlog:demanda`). Uma aba nova, vazia, ficou com o nome Escopo. Sem subir a versão, a
  configuração de acesso gravada apontaria para uma aba que mudou de sentido — quem liberou
  "escopo" liberou a primeira aba, não a nova.

  v6 — 02/08/2026: a aba Cliente. `Marca.contato` virou `contatos` (lista) e ganhou `categoria`;
  o segmento saiu da oportunidade, que agora o lê da marca. Um cadastro salvo na forma antiga
  quebraria a coluna Contato — não há como derivar a lista de um campo que já não existe.

  Sem subir o número, quem já abriu o sistema continuaria vendo os 6 registros antigos: o seed só
  é usado quando **não** há nada salvo. Subir a versão descarta o que estava gravado e traz o
  conjunto novo — que é o comportamento desejado quando o exemplo muda de propósito.
*/
/*
  v10 — 03/08/2026, ainda na mesma rodada de realocação de colunas:

  1. A aba Escopo ganhou três tiques (`temEdicao`, `temConteudo`, `temAudiencia`), e cada um
     **destrava** a coluna de mesmo nome na Produção. Um registro v9 carregaria com os três
     ausentes, e as três colunas apareceriam travadas em toda linha — inclusive nas que já tinham
     `edicao` preenchida, que passariam a exibir "sem edição" guardando o valor.
  2. `TipoEdicao` perdeu `sem_edicao`: quem tivesse esse valor gravado ficaria com uma opção que a
     lista já não oferece, e a célula abriria sem nada selecionado.
  3. As abas Talento, Entrega, Conteúdo e Audiência saíram, e seus ids podiam estar em
     `visoesLiberadas` ou `colunasOcultas` de alguma equipe.
  4. Ainda na mesma rodada, a **Pagamento foi fundida no Financeiro** (Parcelas e PEP viraram
     `backlog:financeiro:*`) e a dedup removeu `backlog:demanda:exclusivo` e
     `backlog:demanda:marca` — mais ids que podiam estar gravados em configuração de equipe.
*/
/*
  v11 — 04/08/2026: as **pendências** ("com quem está a bola"). `Oportunidade` ganhou o campo
  obrigatório `pendencias: Pendencia[]` — a tradução dos "status extras" que a operação anotava
  na planilha ("Em elaboração – Validação Gestão Esporte") em esperas nomeadas com relógio.

  Um registro v10 carregaria sem o campo, e cada leitura de pendência teria de se defender de
  `undefined` para sempre — o `?? []` espalhado é exatamente o tipo de ruído que a versão de
  formato existe para evitar. Descarta e o seed volta com os exemplos (`op4`, `op5`).
*/
/*
  v12 — 04/08/2026, na ordenação por imagem da operação: Exclusivo e Origem do Talento voltaram
  da Cliente para a frente da Demanda, e os **ids mudaram junto** (`backlog:cliente:exclusivo` →
  `backlog:demanda:exclusivo`, idem `origemTalento`). Ids antigos podiam estar gravados em
  `colunasOcultas` de alguma equipe — apontariam para colunas que já não existem.
*/
const VERSAO = 12;
function chave(nome) {
    return `${PREFIXO}:v${VERSAO}:${nome}`;
}
/**
 * Lê um valor salvo; devolve `padrao` em qualquer sinal de problema.
 *
 * Nunca lança: um `localStorage` indisponível (aba anônima, cota estourada, política do
 * navegador) não pode impedir a aplicação de abrir.
 */
export function carregar(nome, padrao) {
    try {
        const bruto = window.localStorage.getItem(chave(nome));
        if (!bruto)
            return padrao;
        const valor = JSON.parse(bruto);
        // Um array que virou objeto — ou vice-versa — quebraria as telas mais adiante.
        if (Array.isArray(padrao) !== Array.isArray(valor))
            return padrao;
        return Array.isArray(valor) ? semIdsRepetidos(valor) : valor;
    }
    catch {
        return padrao;
    }
}
/**
 * Descarta registros com `id` repetido, mantendo o primeiro.
 *
 * ## Por que isto existe
 *
 * Um defeito nos contadores de id gerou registros duplicados **e os gravou** (ver `utils/ids.ts`).
 * Corrigir o contador impede novos, mas não desfaz o que já está no navegador de quem usou a
 * versão com o problema — e dois registros com a mesma `key` fazem o React juntar as linhas.
 *
 * Fica aqui, e não numa migração pontual, porque a garantia vale para sempre: **nada com id
 * repetido entra na aplicação**, venha de onde vier. É a última linha de defesa antes do render.
 *
 * Mantém o **primeiro** porque as listas são gravadas com o mais recente à frente: em caso de
 * colisão, o primeiro é o que a pessoa acabou de criar.
 */
function semIdsRepetidos(lista) {
    const vistos = new Set();
    return lista.filter((item) => {
        // Item sem id não é registro de entidade — passa sem ser avaliado.
        if (typeof item !== 'object' || item === null || !('id' in item))
            return true;
        const id = String(item.id);
        if (vistos.has(id))
            return false;
        vistos.add(id);
        return true;
    });
}
export function salvar(nome, valor) {
    try {
        window.localStorage.setItem(chave(nome), JSON.stringify(valor));
    }
    catch {
        // Cota estourada ou escrita bloqueada: seguir sem salvar é melhor que travar a tela.
    }
}
/** Apaga tudo desta versão — o botão de "recomeçar do zero" da demonstração. */
export function limparTudo() {
    try {
        const alvos = [];
        for (let i = 0; i < window.localStorage.length; i += 1) {
            const nome = window.localStorage.key(i);
            if (nome?.startsWith(`${PREFIXO}:`))
                alvos.push(nome);
        }
        alvos.forEach((nome) => window.localStorage.removeItem(nome));
    }
    catch {
        // Idem.
    }
}
/** Há algo salvo desta versão? Usado para decidir entre o seed e o que a pessoa cadastrou. */
export function temDadosSalvos() {
    try {
        return window.localStorage.getItem(chave('talentos')) !== null;
    }
    catch {
        return false;
    }
}
