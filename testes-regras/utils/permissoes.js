/**
 * Regras de acesso da plataforma.
 *
 * Dois eixos combinados:
 *
 * 1. **Perfil de sistema** (`Usuario.perfil`) — o *teto* de capacidade: admin pode tudo,
 *    responsável pode administrar, membro nunca administra.
 * 2. **Papel na equipe** (`MembroEquipe.papel`) — *onde* esse teto se aplica.
 *
 * A capacidade efetiva é a interseção dos dois: um responsável só administra as equipes em que
 * é responsável; um membro marcado como responsável numa equipe continua sem administrar nada,
 * porque o teto do perfil não permite.
 */
import { getPapelNaEquipe } from './equipes.js';
import { nomeadosDoTalento } from './talentos.js';
import { nomeadosDaOportunidade } from './oportunidades.js';
/** Atalho: nenhuma ação de escrita passa enquanto a sessão está em visualização. */
function escritaBloqueada(contexto) {
    return contexto.visualizacao === true;
}
/* ------------------------------------------------------------------ *
 * Capacidades administrativas
 * ------------------------------------------------------------------ */
/** O que cada perfil já traz sem nenhuma concessão. */
export const ACOES_BASE = {
    // Admin Convidado nasce podendo ver a base e resolver pedidos; o resto o dono libera.
    admin: ['gerenciar_usuarios', 'decidir_solicitacoes'],
    responsavel: [],
    membro: [],
};
export const ACAO_LABEL = {
    gerenciar_usuarios: 'Ver a página de Usuários',
    gerenciar_acessos: 'Abrir a aba de Acessos',
    definir_perfis: 'Alterar perfil de outras pessoas',
    criar_equipe: 'Criar equipes',
    conceder_quadros: 'Conceder quadros às equipes',
    gerenciar_dominios: 'Gerenciar domínios de e-mail',
    excluir_usuarios: 'Excluir pessoas da base',
    decidir_solicitacoes: 'Aprovar pedidos de acesso',
};
export function concessaoAtiva(concessao, agora = new Date()) {
    if (!concessao.expiraEm)
        return true;
    return new Date(concessao.expiraEm).getTime() > agora.getTime();
}
/**
 * Capacidade efetiva = dono ⋁ base do perfil ⋁ concessão ativa.
 *
 * O dono ignora a tabela inteira: é o único nível que não depende de concessão.
 */
export function podeAcao(contexto, acao, agora = new Date()) {
    const { usuario, concessoes = [] } = contexto;
    if (!contaAtiva(usuario))
        return false;
    // Ver a página de Usuários e a aba de Acessos é leitura; o resto some em visualização.
    const somenteLeitura = ['gerenciar_usuarios', 'gerenciar_acessos'];
    if (escritaBloqueada(contexto) && !somenteLeitura.includes(acao))
        return false;
    if (ehDono(usuario))
        return true;
    if (ACOES_BASE[usuario.perfil].includes(acao))
        return true;
    return concessoes.some((concessao) => concessao.usuarioId === usuario.id && concessao.acao === acao && concessaoAtiva(concessao, agora));
}
/** Concessões vigentes de alguém — usado no painel de acessos. */
export function concessoesAtivasDe(concessoes, usuarioId, agora = new Date()) {
    return concessoes.filter((concessao) => concessao.usuarioId === usuarioId && concessaoAtiva(concessao, agora));
}
/* ------------------------------------------------------------------ *
 * Situação da conta
 * ------------------------------------------------------------------ */
/** Situações que barram a entrada. O histórico permanece; o acesso, não. */
const SEM_ACESSO = ['inativo', 'desligado'];
export function contaAtiva(usuario) {
    return !SEM_ACESSO.includes(usuario.situacao);
}
/**
 * Quanto a pessoa enxerga de um quadro.
 *
 * Duas portas de entrada, e a nomeação é uma delas:
 *
 * 1. **Pela equipe** — a equipe tem o quadro liberado. Responsável vê tudo; **membro vê só o que
 *    é dele**, porque dentro da equipe o membro não tem alcance sobre o trabalho dos colegas.
 * 2. **Pela nomeação** — mesmo fora da equipe do quadro, quem foi nomeado em alguma linha entra
 *    para ver aquelas linhas. Sem isso, nomear alguém de outra área produziria um responsável
 *    que não consegue abrir o próprio registro.
 *
 * `nomeadoEmAlgum` é calculado por quem chama, com os registros do quadro em mãos.
 */
export function nivelDeAcesso(contexto, pagina, nomeadoEmAlgum = false) {
    const { usuario, equipes } = contexto;
    // Conta inativa ou desligada não entra em lugar nenhum, seja qual for o perfil.
    if (!contaAtiva(usuario))
        return 'nenhum';
    if (ehDono(usuario))
        return 'total';
    // Páginas de administração não são liberadas por equipe nem por nomeação.
    if (pagina === 'usuarios')
        return podeAcao(contexto, 'gerenciar_usuarios') ? 'total' : 'nenhum';
    if (pagina === 'perfil')
        return 'total';
    if (pagina === 'equipes') {
        // Membro também entra — mas só enxerga a própria equipe, em modo leitura.
        const participa = equipes.some((e) => getPapelNaEquipe(e, usuario.id) !== null);
        return usuario.perfil === 'admin' || participa ? 'total' : 'nenhum';
    }
    if (usuario.perfil === 'admin')
        return 'total';
    const equipesQueLiberam = equipes.filter((equipe) => equipe.paginasPermitidas.includes(pagina) && getPapelNaEquipe(equipe, usuario.id) !== null);
    if (equipesQueLiberam.length > 0) {
        // Perfil é teto: membro nunca alcança o quadro inteiro, seja qual for o papel na equipe.
        if (usuario.perfil === 'membro')
            return 'nomeado';
        /*
          E equipe é escopo: ver o quadro todo exige ser **responsável na equipe que o libera**.
    
          Antes bastava o perfil `responsavel`, de onde quer que ele viesse — e isso furava a regra
          central do modelo. Alguém responsável pela equipe de Orçamentos, mas apenas *membro* na de
          Contratos, enxergava e editava o quadro de Contratos inteiro. O teto do perfil estava
          valendo como se fosse escopo.
        */
        return ehResponsavelDeAlguma({ ...contexto, equipes: equipesQueLiberam }) ? 'total' : 'nomeado';
    }
    return nomeadoEmAlgum ? 'nomeado' : 'nenhum';
}
/** Quadros do Workspace que a pessoa enxerga — por equipe ou por nomeação. */
export function podeVerPagina(contexto, pagina, nomeadoEmAlgum = false) {
    return nivelDeAcesso(contexto, pagina, nomeadoEmAlgum) !== 'nenhum';
}
/* ------------------------------------------------------------------ *
 * Filtro de linhas (RLS de leitura)
 * ------------------------------------------------------------------ */
/**
 * Linhas visíveis de um quadro.
 *
 * Genérica de propósito: contratos nomeiam por `responsaveisIds`/`parceirosIds`, talentos por
 * área. Cada chamador informa como extrair os ids nomeados de um registro.
 */
export function registrosVisiveis(contexto, pagina, registros, nomeadosDe) {
    const meus = registros.filter((registro) => nomeadosDe(registro).includes(contexto.usuario.id));
    const nivel = nivelDeAcesso(contexto, pagina, meus.length > 0);
    if (nivel === 'nenhum')
        return [];
    if (nivel === 'nomeado')
        return meus;
    return registros;
}
/** Ids nomeados numa linha de contrato — responsáveis e parceiros. */
export function nomeadosDoContrato(contrato) {
    return [...contrato.responsaveisIds, ...contrato.parceirosIds];
}
/** Equipes que a pessoa enxerga na administração. Admin vê todas. */
export function equipesVisiveis({ usuario, equipes }) {
    if (usuario.perfil === 'admin')
        return equipes;
    return equipes.filter((equipe) => getPapelNaEquipe(equipe, usuario.id) !== null);
}
function ehResponsavelDeAlguma({ usuario, equipes }) {
    return equipes.some((equipe) => getPapelNaEquipe(equipe, usuario.id) === 'responsavel');
}
/**
 * Cada pessoa mantém os próprios dados atualizados — é quem sabe deles.
 *
 * O **e-mail fica de fora**: é a identidade de acesso e só muda pelo fluxo de confirmação.
 */
export function podeEditarProprioCadastro(contexto, alvo) {
    if (escritaBloqueada(contexto))
        return false;
    return contexto.usuario.id === alvo.id && contaAtiva(contexto.usuario);
}
/** A aba de Acessos: gestão fina de capacidades e equipes de cada pessoa. */
export function podeGerenciarAcessos(contexto) {
    return podeAcao(contexto, 'gerenciar_acessos');
}
/** Responsável de fato: perfil permite **e** é responsável naquela equipe. */
export function podeGerenciarEquipe(contexto, equipe) {
    if (escritaBloqueada(contexto))
        return false;
    if (ehDono(contexto.usuario))
        return true;
    if (contexto.usuario.perfil === 'admin')
        return true;
    if (contexto.usuario.perfil !== 'responsavel')
        return false;
    return getPapelNaEquipe(equipe, contexto.usuario.id) === 'responsavel';
}
/* ------------------------------------------------------------------ *
 * Administração
 * ------------------------------------------------------------------ */
export function podeCriarEquipe(contexto) {
    return podeAcao(contexto, 'criar_equipe');
}
export function podeExcluirEquipe(contexto, equipe) {
    if (escritaBloqueada(contexto))
        return false;
    return contexto.usuario.perfil === 'admin' || podeGerenciarEquipe(contexto, equipe);
}
/**
 * Conceder quadros a uma equipe é privilégio exclusivo do admin.
 *
 * Se o responsável pudesse liberar quadros para a própria equipe, ele ampliaria o próprio
 * acesso — o teto deixaria de ser um teto.
 */
export function podeDefinirAcessoDaEquipe(contexto) {
    return podeAcao(contexto, 'conceder_quadros');
}
/** Cadastrar pessoas: admin em qualquer lugar; responsável dentro da equipe que administra. */
export function podeCriarUsuario(contexto, equipe) {
    if (escritaBloqueada(contexto))
        return false;
    if (ehDono(contexto.usuario) || contexto.usuario.perfil === 'admin')
        return true;
    return Boolean(equipe && podeGerenciarEquipe(contexto, equipe));
}
/* ------------------------------------------------------------------ *
 * Dono do sistema
 * ------------------------------------------------------------------ *
 *
 * O criador da conta é intocável: não perde o perfil, não é inativado e não é excluído.
 * É a trava que garante que a plataforma nunca fique sem alguém no comando.
 */
export function ehDono(usuario) {
    return usuario.ehDono === true;
}
/**
 * Quem pode dar a alguém o perfil `alvoPerfil`.
 *
 * **Só o dono cria admins.** Admins comuns administram pessoas, mas não fabricam pares —
 * senão qualquer admin poderia multiplicar o próprio nível e o dono perderia o controle.
 */
export function podeDefinirPerfil(contexto, alvo, alvoPerfil) {
    if (escritaBloqueada(contexto))
        return false;
    // O dono nunca é rebaixado — nem por ele mesmo, nem por quem recebeu a concessão.
    if (ehDono(alvo))
        return false;
    if (ehDono(contexto.usuario))
        return true;
    if (!podeAcao(contexto, 'definir_perfis'))
        return false;
    // Admin Convidado move entre responsável e membro; criar outro admin é só do dono.
    return alvoPerfil !== 'admin' && alvo.perfil !== 'admin';
}
export function podeExcluirUsuario(contexto, alvo) {
    if (escritaBloqueada(contexto))
        return false;
    if (ehDono(alvo) || alvo.id === contexto.usuario.id)
        return false;
    return podeAcao(contexto, 'excluir_usuarios');
}
/**
 * Alterar a situação de alguém.
 *
 * Admin mexe em qualquer um; responsável apenas em quem está na equipe que administra, e
 * nunca em `desligado` — desligar é ato de RH, fica com o admin.
 */
export function podeDefinirSituacao(contexto, alvo, situacao, equipe) {
    if (escritaBloqueada(contexto))
        return false;
    if (ehDono(alvo))
        return false;
    if (ehDono(contexto.usuario) || contexto.usuario.perfil === 'admin')
        return true;
    if (situacao === 'desligado')
        return false;
    return Boolean(equipe && podeGerenciarEquipe(contexto, equipe));
}
/** A lista de domínios autorizados é configuração da plataforma. */
export function podeGerenciarDominios(contexto) {
    return podeAcao(contexto, 'gerenciar_dominios');
}
/**
 * Conceder e revogar capacidades administrativas é **exclusivo do dono**.
 *
 * Se um admin convidado pudesse conceder, ele se autopromoveria por triangulação — concede a
 * um par, o par concede de volta — e o teto do dono deixaria de existir.
 */
export function podeGerenciarConcessoes(contexto) {
    return !escritaBloqueada(contexto) && ehDono(contexto.usuario);
}
/** Só o dono tem mais de um e-mail de acesso, e só ele mesmo os administra. */
export function podeGerenciarEmailsDeAcesso(contexto, alvo) {
    if (escritaBloqueada(contexto))
        return false;
    return ehDono(contexto.usuario) && contexto.usuario.id === alvo.id;
}
/* ------------------------------------------------------------------ *
 * Convites
 * ------------------------------------------------------------------ */
/** Convidar para uma equipe segue a mesma alçada de administrá-la. */
export function podeConvidar(contexto, equipe) {
    return podeGerenciarEquipe(contexto, equipe);
}
/**
 * Convidar alguém como **responsável** da equipe é privilégio do admin.
 *
 * Um responsável que pudesse nomear outros responsáveis criaria pares com poder sobre a
 * própria equipe, fora do controle de quem concedeu o acesso.
 */
export function podeConvidarComoResponsavel(contexto) {
    return contexto.usuario.perfil === 'admin';
}
/* ------------------------------------------------------------------ *
 * Registros dos quadros
 * ------------------------------------------------------------------ */
/** Está nomeado na linha — como responsável ou parceiro. */
export function estaNomeado(contrato, usuarioId) {
    return contrato.responsaveisIds.includes(usuarioId) || contrato.parceirosIds.includes(usuarioId);
}
/**
 * Criar linha exige a porta da **equipe**, não a da nomeação.
 *
 * Daí o `false` explícito: quem só entrou no quadro porque nomearam seu nome numa linha vê
 * aquela linha, e nada além — abrir uma nova seria alargar sozinho o próprio alcance.
 */
export function podeCriarRegistro(contexto, pagina) {
    return !escritaBloqueada(contexto) && nivelDeAcesso(contexto, pagina, false) !== 'nenhum';
}
/**
 * Edição de uma linha do quadro.
 *
 * - **admin**: sempre
 * - **responsável**: em todo o quadro que sua equipe enxerga — ele responde pela área
 * - **membro**: apenas nas linhas em que está nomeado
 */
export function podeEditarRegistro(contexto, pagina, contrato) {
    if (escritaBloqueada(contexto))
        return false;
    if (ehDono(contexto.usuario) || contexto.usuario.perfil === 'admin')
        return true;
    /*
      Escrita segue a leitura: quem enxerga o quadro todo edita o quadro todo; quem enxerga só as
      próprias linhas edita só as próprias.
  
      Perguntar `perfil === 'responsavel'` aqui era o mesmo furo de `nivelDeAcesso` — dava o quadro
      inteiro a quem é responsável em *outra* equipe. Delegar ao nível mantém as duas regras
      coerentes por construção.
    */
    const nomeado = estaNomeado(contrato, contexto.usuario.id);
    const nivel = nivelDeAcesso(contexto, pagina, nomeado);
    if (nivel === 'nenhum')
        return false;
    return nivel === 'total' || nomeado;
}
/** Excluir é mais restrito que editar: membro nunca exclui. */
export function podeExcluirRegistro(contexto, pagina, contrato) {
    if (contexto.usuario.perfil === 'membro')
        return false;
    return podeEditarRegistro(contexto, pagina, contrato);
}
/**
 * Edição da ficha de um talento exclusivo.
 *
 * Mesma regra do quadro de contratos: **estar nomeado** é o que habilita o membro. Aqui a
 * nomeação é ser o responsável de alguma das áreas da ficha.
 */
export function podeEditarTalento(contexto, talento) {
    if (escritaBloqueada(contexto))
        return false;
    if (ehDono(contexto.usuario) || contexto.usuario.perfil === 'admin')
        return true;
    const nomeado = nomeadosDoTalento(talento).includes(contexto.usuario.id);
    const nivel = nivelDeAcesso(contexto, 'talentos', nomeado);
    if (nivel === 'nenhum')
        return false;
    return nivel === 'total' || nomeado;
}
/** Ids nomeados numa oportunidade — os responsáveis de todas as áreas. */
export function nomeadosDoBacklog(oportunidade) {
    return nomeadosDaOportunidade(oportunidade);
}
/**
 * Edição de uma oportunidade.
 *
 * Mesma regra dos outros quadros: quem enxerga tudo edita tudo, quem enxerga só o seu edita só o
 * seu. Derivar do nível em vez de repetir a checagem de perfil mantém leitura e escrita coerentes.
 */
export function podeEditarOportunidade(contexto, oportunidade) {
    if (escritaBloqueada(contexto))
        return false;
    if (ehDono(contexto.usuario) || contexto.usuario.perfil === 'admin')
        return true;
    const nomeado = nomeadosDaOportunidade(oportunidade).includes(contexto.usuario.id);
    const nivel = nivelDeAcesso(contexto, 'backlog', nomeado);
    if (nivel === 'nenhum')
        return false;
    return nivel === 'total' || nomeado;
}
/** Excluir é mais restrito que editar: membro nunca exclui. */
export function podeExcluirOportunidade(contexto, oportunidade) {
    if (contexto.usuario.perfil === 'membro')
        return false;
    return podeEditarOportunidade(contexto, oportunidade);
}
/* ------------------------------------------------------------------ *
 * Solicitações de acesso
 * ------------------------------------------------------------------ */
/** Quem não pode se conceder acesso pede — o admin não precisa pedir nada. */
export function podeSolicitarAcesso(contexto) {
    return !escritaBloqueada(contexto) && !ehDono(contexto.usuario) && contexto.usuario.perfil !== 'admin';
}
export function podeDecidirSolicitacao(contexto) {
    return podeAcao(contexto, 'decidir_solicitacoes');
}
/* ------------------------------------------------------------------ *
 * Rótulos
 * ------------------------------------------------------------------ */
export const PERFIL_LABEL = {
    admin: 'Admin Convidado',
    responsavel: 'Responsável',
    membro: 'Membro',
};
export const PERFIL_DESCRICAO = {
    admin: 'Ajuda na administração com os poderes que o dono conceder.',
    responsavel: 'Administra as equipes em que é responsável e os quadros liberados a elas.',
    membro: 'Usa os quadros das suas equipes e edita apenas o que está nomeado para ele.',
};
/** Rótulo que aparece na interface — o dono não é um perfil, está acima deles. */
export function rotuloDeNivel(usuario) {
    return ehDono(usuario) ? 'Dono do Sistema' : PERFIL_LABEL[usuario.perfil];
}
export const SITUACAO_LABEL = {
    ativo: 'Ativo',
    ferias: 'Férias',
    afastado: 'Afastado',
    inativo: 'Inativo',
    desligado: 'Desligado',
};
export const SITUACAO_DESCRICAO = {
    ativo: 'Acesso normal.',
    ferias: 'Continua com acesso; a equipe vê o sinal de ausência.',
    afastado: 'Continua com acesso; sinaliza ausência prolongada.',
    inativo: 'Não entra na plataforma. O histórico é preservado.',
    desligado: 'Não entra e sai de todas as equipes. O histórico é preservado.',
};
