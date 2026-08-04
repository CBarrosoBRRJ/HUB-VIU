import {
  podeAcao, concessaoAtiva, concessoesAtivasDe, ACOES_BASE, ehDono, rotuloDeNivel,
  podeCriarEquipe, podeDefinirAcessoDaEquipe, podeDefinirPerfil, podeExcluirUsuario,
  podeGerenciarConcessoes, podeGerenciarEmailsDeAcesso, podeVerPagina, podeDecidirSolicitacao,
} from './utils/permissoes.js';
import { usuariosDoQuadro, equipesDoQuadro } from './utils/equipes.js';

let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

const user = (id, perfil, over = {}) => ({
  id, perfil, situacao: 'ativo', nome: id, email: `${id}@viu.com.br`,
  cargo: '', telefone: '', local: '', nascimento: '', ...over,
});

const caio = user('u0', 'admin', { nome: 'Caio', email: 'barroso.ccmb@gmail.com', ehDono: true });
const adminConvidado = user('u1', 'admin');
const resp = user('u2', 'responsavel');
const membro = user('u3', 'membro');

const equipes = [
  { id: 'eq1', nome: 'Gestão de Contratos', paginasPermitidas: ['contratos'], criadaEm: '',
    membros: [{ usuarioId: 'u3', papel: 'responsavel' }, { usuarioId: 'u2', papel: 'membro' }] },
  { id: 'eq2', nome: 'Gestão de Orçamentos', paginasPermitidas: ['backlog'], criadaEm: '',
    membros: [{ usuarioId: 'u2', papel: 'responsavel' }] },
];

const ctx = (u, concessoes = []) => ({ usuario: u, equipes, concessoes });

console.log('--- Dois níveis de admin ---');
check('dono é reconhecido', [ehDono(caio), ehDono(adminConvidado)], [true, false]);
check('rótulos distintos', [rotuloDeNivel(caio), rotuloDeNivel(adminConvidado)], ['Dono do Sistema', 'Admin Convidado']);
check('base do Admin Convidado', ACOES_BASE.admin, ['gerenciar_usuarios', 'decidir_solicitacoes']);

check('admin convidado vê Usuários e decide pedidos', [
  podeVerPagina(ctx(adminConvidado), 'usuarios'),
  podeDecidirSolicitacao(ctx(adminConvidado)),
], [true, true]);

check('admin convidado NÃO cria equipe sem concessão', podeCriarEquipe(ctx(adminConvidado)), false);
check('admin convidado NÃO concede quadros sem concessão', podeDefinirAcessoDaEquipe(ctx(adminConvidado)), false);
check('admin convidado NÃO exclui pessoas sem concessão', podeExcluirUsuario(ctx(adminConvidado), membro), false);
check('dono faz tudo', [
  podeCriarEquipe(ctx(caio)), podeDefinirAcessoDaEquipe(ctx(caio)), podeExcluirUsuario(ctx(caio), membro),
], [true, true, true]);

console.log('\n--- Concessões ---');
const concessaoPermanente = [{ id: 'c1', usuarioId: 'u1', acao: 'criar_equipe', concedidaPorId: 'u0', criadaEm: '' }];
check('concessão liga a capacidade', podeCriarEquipe(ctx(adminConvidado, concessaoPermanente)), true);
check('concessão não vaza para outra ação', podeDefinirAcessoDaEquipe(ctx(adminConvidado, concessaoPermanente)), false);
check('concessão não vaza para outra pessoa', podeCriarEquipe(ctx(resp, concessaoPermanente)), false);

const AGORA = new Date(2026, 7, 1, 12, 0, 0);
const janela = (fim) => [{ id: 'c2', usuarioId: 'u1', acao: 'conceder_quadros', concedidaPorId: 'u0', criadaEm: '', expiraEm: fim.toISOString() }];
const daquiUmaSemana = new Date(AGORA.getTime() + 7 * 86400000);
const ontem = new Date(AGORA.getTime() - 86400000);

check('janela vigente vale', podeAcao(ctx(adminConvidado, janela(daquiUmaSemana)), 'conceder_quadros', AGORA), true);
check('janela vencida não vale', podeAcao(ctx(adminConvidado, janela(ontem)), 'conceder_quadros', AGORA), false);
check('concessaoAtiva respeita o prazo', [
  concessaoAtiva(janela(daquiUmaSemana)[0], AGORA),
  concessaoAtiva(janela(ontem)[0], AGORA),
], [true, false]);
check('lista de ativas filtra vencidas', concessoesAtivasDe(janela(ontem), 'u1', AGORA).length, 0);

console.log('\n--- Travas do dono, mesmo com concessão ---');
const tudoConcedido = ['definir_perfis', 'excluir_usuarios', 'conceder_quadros', 'criar_equipe'].map((acao, i) => ({
  id: `t${i}`, usuarioId: 'u1', acao, concedidaPorId: 'u0', criadaEm: '',
}));
const admPoderoso = ctx(adminConvidado, tudoConcedido);
check('não rebaixa o dono', podeDefinirPerfil(admPoderoso, caio, 'membro'), false);
check('não exclui o dono', podeExcluirUsuario(admPoderoso, caio), false);
check('não promove ninguém a admin', podeDefinirPerfil(admPoderoso, membro, 'admin'), false);
check('não mexe em outro admin', podeDefinirPerfil(admPoderoso, user('u9', 'admin'), 'membro'), false);
check('move responsável ↔ membro', podeDefinirPerfil(admPoderoso, membro, 'responsavel'), true);
check('conceder capacidades é só do dono', [
  podeGerenciarConcessoes(admPoderoso), podeGerenciarConcessoes(ctx(caio)),
], [false, true]);
check('e-mails de acesso: só o dono, sobre si mesmo', [
  podeGerenciarEmailsDeAcesso(ctx(caio), caio),
  podeGerenciarEmailsDeAcesso(ctx(caio), adminConvidado),
  podeGerenciarEmailsDeAcesso(admPoderoso, adminConvidado),
], [true, false, false]);

console.log('\n--- Responsáveis limitados à equipe do quadro ---');
check('equipe que opera Contratos', equipesDoQuadro(equipes, 'contratos').map((e) => e.nome), ['Gestão de Contratos']);
check('candidatos de Contratos', usuariosDoQuadro(equipes, 'contratos').sort(), ['u2', 'u3']);
check('candidatos de Backlog', usuariosDoQuadro(equipes, 'backlog'), ['u2']);
check('quadro sem equipe não tem candidatos', usuariosDoQuadro(equipes, 'equipes'), []);

console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
