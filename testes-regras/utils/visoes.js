/**
 * Visões — os grupos de colunas de um quadro, e a unidade de permissão dentro dele.
 *
 * O acesso ao quadro responde "esta pessoa trabalha com isto?". A visão responde a pergunta
 * seguinte: "**quais dados** deste registro ela precisa ver?". Quem cuida da produção de um
 * talento precisa saber quem responde por ele e como está o contrato — não precisa do telefone
 * pessoal nem do faturamento.
 *
 * ## Aberta por padrão, restrita por declaração
 *
 * Uma visão sem `restrita` é vista por quem vê o quadro. Só as marcadas exigem liberação
 * explícita à equipe (`Equipe.visoesLiberadas`).
 *
 * O contrário — tudo fechado até liberar — soa mais seguro e é pior na prática: toda equipe nova
 * nasceria cega, alguém liberaria tudo de uma vez para destravar, e a distinção morreria. Marcar
 * o que é sensível mantém a lista curta e a decisão consciente.
 */
import { getPapelNaEquipe } from './equipes.js';
export const VISOES = [
    /*
      Contratos é um quadro de visão única: não tem abas, mas **precisa** estar declarado aqui.
      Sem isto a tela de Configuração não listava as colunas dele — a equipe tinha o quadro e não
      havia como esconder nenhuma coluna, sem nenhum aviso de que faltava.
    */
    { id: 'contratos:grade', quadro: 'contratos', label: 'Grade' },
    /*
      As 8 abas do Backlog seguem o vocabulário da operação — são as áreas por onde o projeto passa,
      não agrupamentos técnicos. Cada uma traz, além dos seus campos, **o responsável da área
      correspondente**: quem abre a aba Produção quer ver o que produzir e quem produz.
    */
    /*
      A ordem é a do trabalho, não a do organograma — refeita com a operação em 03/08/2026, depois
      que uma leitura minha da lista de colunas pôs a Cliente na frente e veio a correção: *"devemos
      começar por demanda"*.
  
      Triagem (Demanda) → o que se pede (Escopo) → de quem é (Cliente) → como se faz (Produção) →
      quanto e o que assina (Financeiro, Jurídico) → onde estão as referências (Links) → quem toca
      (Time). Quem rola a grade em sequência percorre o projeto.
    */
    /*
      **Demanda abre o quadro**: é a triagem — o que se precisa saber para aceitar ou declinar — e o
      quadro existe para triar. O nome é o da operação, a mesma palavra de "data de cadastro da
      demanda" e "como a demanda chegou"; cobre o que ainda não foi aceito e o que já virou projeto,
      sem colidir com a coluna Projeto nem com a aba Escopo.
  
      O id acompanhou o rótulo, contra a regra de ids estáveis: existir uma aba **Escopo** separada
      faria de `backlog:escopo` apontando para "Demanda" uma armadilha permanente. A troca custou
      uma versão de persistência ([09 §3](../../prd/09_fundacoes_tecnicas.md)); mantê-la custaria
      todo mundo que abrisse o código depois.
  
      Exclusivo e Marca saíram daqui na dedup da grade contínua: eram espelhos da Cliente, e numa
      tabela única a cópia só gastava largura.
    */
    { id: 'backlog:demanda', quadro: 'backlog', label: 'Demanda' },
    { id: 'backlog:escopo', quadro: 'backlog', label: 'Escopo' },
    /*
      **Produção cola no Escopo** desde a ordenação de 04/08/2026 (imagem da operação): os tiques
      Edição/Conteúdo/Audiência do Escopo destravam as colunas homônimas daqui — lado a lado, a
      relação se lê sem rolar.
    */
    { id: 'backlog:producao', quadro: 'backlog', label: 'Produção' },
    /*
      **Cliente** — o lado da marca: Marca, Segmento e Categoria, lendo e escrevendo no cadastro
      dela. O lado do talento voltou para a Demanda em 04/08/2026.
    */
    { id: 'backlog:cliente', quadro: 'backlog', label: 'Cliente' },
    /*
      Jurídico antes do Financeiro, na ordem da operação: primeiro o que assina, depois o que se
      cobra.
    */
    {
        id: 'backlog:juridico',
        quadro: 'backlog',
        label: 'Jurídico',
        restrita: true,
        motivo: 'Tipo de contratação, status e número do contrato',
    },
    {
        /*
          Absorveu a aba **Pagamento** em 03/08/2026: a ordenação da operação pôs Parcelas e PEP entre
          os valores, e seção é um trecho contíguo — duas restritas viraram uma. O motivo soma os dois.
        */
        id: 'backlog:financeiro',
        quadro: 'backlog',
        label: 'Financeiro',
        restrita: true,
        motivo: 'Valores do projeto, cachê, comissões, parcelas e PEP',
    },
    /*
      **Links vem depois do que ele documenta** — a operação deixou a escolha ("por último ou antes
      do Time") e aqui fica antes do Time: proposta, Salesforce e pastas são referência do projeto,
      e o Time é a única seção que não fala do projeto, e sim de quem o toca. Referência de projeto
      junto das seções de projeto; pessoas fechando.
    */
    { id: 'backlog:links', quadro: 'backlog', label: 'Links' },
    /*
      **Time fecha o quadro** — quem responde por cada área do projeto, as dez numa tela só.
  
      Criada em 03/08/2026, e com ela saíram **Entrega**, **Conteúdo** e **Audiência**: as três
      ficaram só com as colunas espelhadas de identificação depois que as suas foram realocadas.
      Chegaram a voltar por algumas horas no mesmo dia — remover uma aba que ainda não teve a sua vez
      é decidir antes da hora. Saíram quando a vez chegou.
  
      Vai por último porque é a única que **não descreve o projeto**, e sim quem o toca: as demais
      respondem "o que é este trabalho?", em ordem de execução; esta responde "quem está nele?".
  
      As áreas continuam em `AreaTalento`, com equipe, responsáveis e permissão. O que mudou foi onde
      se olha para elas.
    */
    { id: 'backlog:time', quadro: 'backlog', label: 'Time' },
    { id: 'talentos:identificacao', quadro: 'talentos', label: 'Identificação' },
    {
        id: 'talentos:contato',
        quadro: 'talentos',
        label: 'Contato',
        restrita: true,
        motivo: 'Dados pessoais: e-mail, telefone e localização',
    },
    { id: 'talentos:redes', quadro: 'talentos', label: 'Redes' },
    {
        id: 'talentos:financeiro',
        quadro: 'talentos',
        label: 'Financeiro',
        restrita: true,
        motivo: 'CNPJ, faturamento e dados bancários',
    },
    { id: 'talentos:responsaveis', quadro: 'talentos', label: 'Responsáveis' },
    { id: 'talentos:contratos', quadro: 'talentos', label: 'Contratos' },
];
export function visoesDoQuadro(quadro) {
    return VISOES.filter((visao) => visao.quadro === quadro);
}
export function getVisao(id) {
    return VISOES.find((visao) => visao.id === id);
}
/** Visões restritas — as únicas que aparecem para liberar na tela de Equipes. */
export function visoesRestritasDoQuadro(quadro) {
    return visoesDoQuadro(quadro).filter((visao) => visao.restrita);
}
/**
 * A pessoa enxerga esta visão?
 *
 * Não verifica o acesso ao quadro — isso é `nivelDeAcesso`. Aqui é só a camada de dado: as duas
 * se compõem, e a de quadro vem primeiro.
 */
export function podeVerVisao({ usuario, equipes }, visaoId, ehDono = false) {
    const visao = getVisao(visaoId);
    if (!visao)
        return false;
    if (ehDono || usuario.perfil === 'admin')
        return true;
    if (!visao.restrita)
        return true;
    return equipes.some((equipe) => getPapelNaEquipe(equipe, usuario.id) !== null &&
        (equipe.visoesLiberadas ?? []).includes(visaoId));
}
/** Alterna a liberação de uma visão restrita para a equipe. */
export function alternarVisao(equipe, visaoId) {
    const atuais = equipe.visoesLiberadas ?? [];
    const liberadas = atuais.includes(visaoId)
        ? atuais.filter((id) => id !== visaoId)
        : [...atuais, visaoId];
    return { ...equipe, visoesLiberadas: liberadas };
}
/* ------------------------------------------------------------------ *
 * Terceira camada: colunas
 * ------------------------------------------------------------------ */
/**
 * A coluna está oculta para esta pessoa?
 *
 * **Bloqueio por exceção**, ao contrário das visões: quem enxerga a aba enxerga as colunas dela,
 * salvo as que o admin ocultou. Liberar coluna a coluna daria uma lista de dezenas de tiques por
 * equipe — ninguém manteria, e a permissão viraria decoração.
 *
 * Basta **uma** equipe da pessoa não ocultar a coluna para ela aparecer: o acesso é sempre a
 * união do que as equipes dão, como em todo o resto do modelo.
 */
export function colunaOculta({ usuario, equipes }, colunaId, ehDono = false) {
    if (ehDono || usuario.perfil === 'admin')
        return false;
    const minhas = equipes.filter((equipe) => getPapelNaEquipe(equipe, usuario.id) !== null);
    if (minhas.length === 0)
        return false;
    return minhas.every((equipe) => (equipe.colunasOcultas ?? []).includes(colunaId));
}
/** Colunas ocultas para a pessoa, dentro de uma visão. */
export function colunasOcultasNaVisao(contexto, colunasDaVisao, ehDono = false) {
    return colunasDaVisao
        .filter((coluna) => colunaOculta(contexto, coluna.id, ehDono))
        .map((coluna) => coluna.id);
}
/** Alterna a ocultação de uma coluna para a equipe. */
export function alternarColuna(equipe, colunaId) {
    const atuais = equipe.colunasOcultas ?? [];
    const ocultas = atuais.includes(colunaId)
        ? atuais.filter((id) => id !== colunaId)
        : [...atuais, colunaId];
    return { ...equipe, colunasOcultas: ocultas };
}
