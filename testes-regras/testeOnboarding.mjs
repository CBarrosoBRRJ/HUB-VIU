import {
  normalizarEmail, dominioPermitido, emailEmUso, validarEmail, encontrarPorEmail,
} from './utils/identidade.js';
import {
  criarConvite, statusConvite, validarAceite, horasRestantes, convitePendenteExistente, VALIDADE_HORAS,
} from './utils/convites.js';
import {
  ehDono, contaAtiva, podeDefinirPerfil, podeDefinirSituacao, podeExcluirUsuario,
  podeVerPagina, podeConvidar, podeConvidarComoResponsavel, podeGerenciarDominios,
} from './utils/permissoes.js';

let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

const DOMINIOS = ['g.globo', 'globo.com', 'viu.com.br'];
const user = (id, perfil, over = {}) => ({
  id, perfil, situacao: 'ativo', nome: id, email: `${id}@g.globo`,
  cargo: '', telefone: '', local: '', nascimento: '', ...over,
});

const dono = user('u1', 'admin', { ehDono: true });
const admin = user('u2', 'admin');
const resp = user('u3', 'responsavel');
const membro = user('u4', 'membro');

const equipeA = {
  id: 'eqA', nome: 'A', paginasPermitidas: ['contratos'], criadaEm: '',
  membros: [{ usuarioId: 'u3', papel: 'responsavel' }, { usuarioId: 'u4', papel: 'membro' }],
};
const equipes = [equipeA];
const ctx = (u) => ({ usuario: u, equipes });

console.log('--- Identidade: uma pessoa, uma conta ---');
check('normaliza caixa e espaços', normalizarEmail('  Ana.Martins@G.Globo '), 'ana.martins@g.globo');
check('domínio autorizado', dominioPermitido('x@viu.com.br', DOMINIOS), true);
check('domínio de fora barrado', dominioPermitido('x@gmail.com', DOMINIOS), false);
check('duplicidade ignora caixa', emailEmUso('U1@G.GLOBO', [dono]), true);
check('editar a si mesmo não acusa duplicidade', emailEmUso('u1@g.globo', [dono], 'u1'), false);
check('erro de formato', validarEmail('sem-arroba', { usuarios: [], dominios: DOMINIOS }), 'formato');
check('erro de domínio', validarEmail('a@gmail.com', { usuarios: [], dominios: DOMINIOS }), 'dominio');
check('erro de duplicado', validarEmail('u1@g.globo', { usuarios: [dono], dominios: DOMINIOS }), 'duplicado');
check('e-mail válido passa', validarEmail('novo@g.globo', { usuarios: [dono], dominios: DOMINIOS }), null);
check('encontrar por e-mail ignora caixa', encontrarPorEmail('U1@G.GLOBO', [dono])?.id, 'u1');

console.log('\n--- Convite: uso único, 24h, e-mail vinculado ---');
const AGORA = new Date(2026, 7, 1, 10, 0, 0);
const base = criarConvite(
  { id: 'cv1', email: 'Novo@G.Globo', equipeId: 'eqA', papel: 'membro', criadoPorId: 'u1' },
  AGORA,
);
check('e-mail do convite é normalizado', base.email, 'novo@g.globo');
check('token não trivial', base.token.length >= 32, true);
check('validade de 24h', horasRestantes(base, AGORA), VALIDADE_HORAS);
check('nasce pendente', statusConvite(base, AGORA), 'pendente');

const em23h = new Date(AGORA.getTime() + 23 * 3_600_000);
const em25h = new Date(AGORA.getTime() + 25 * 3_600_000);
check('ainda vale em 23h', statusConvite(base, em23h), 'pendente');
check('expira em 25h', statusConvite(base, em25h), 'expirado');
check('aceite bloqueado após expirar', validarAceite(base, 'novo@g.globo', em25h), 'expirado');

check('aceite vale para o e-mail convidado', validarAceite(base, 'NOVO@g.globo', AGORA), null);
check('outro e-mail é barrado (link repassado)', validarAceite(base, 'outro@g.globo', AGORA), 'outro_email');

const aceito = { ...base, aceitoEm: AGORA.toISOString() };
check('uso único: segundo aceite falha', validarAceite(aceito, 'novo@g.globo', AGORA), 'aceito');
check('status de aceito', statusConvite(aceito, AGORA), 'aceito');

const revogado = { ...base, revogadoEm: AGORA.toISOString() };
check('revogado não aceita', validarAceite(revogado, 'novo@g.globo', AGORA), 'revogado');
check('revogado vence aceito na precedência', statusConvite({ ...aceito, revogadoEm: AGORA.toISOString() }, AGORA), 'revogado');
check('link inexistente', validarAceite(undefined, 'x@g.globo', AGORA), 'inexistente');

check('detecta convite pendente duplicado', convitePendenteExistente([base], 'NOVO@g.globo', 'eqA', AGORA)?.id, 'cv1');
check('não confunde equipe diferente', convitePendenteExistente([base], 'novo@g.globo', 'eqB', AGORA), undefined);
check('convite expirado não conta como pendente', convitePendenteExistente([base], 'novo@g.globo', 'eqA', em25h), undefined);

console.log('\n--- Dono do sistema ---');
check('dono é identificado', [ehDono(dono), ehDono(admin)], [true, false]);
check('ninguém rebaixa o dono', [
  podeDefinirPerfil(ctx(admin), dono, 'membro'),
  podeDefinirPerfil(ctx(dono), dono, 'membro'),
], [false, false]);
check('só o dono cria admin', [
  podeDefinirPerfil(ctx(dono), membro, 'admin'),
  podeDefinirPerfil(ctx(admin), membro, 'admin'),
], [true, false]);
check('dono move entre responsável e membro', podeDefinirPerfil(ctx(dono), membro, 'responsavel'), true);
check('admin convidado sem concessão não muda perfil', podeDefinirPerfil(ctx(admin), membro, 'responsavel'), false);
check('admin não rebaixa outro admin', podeDefinirPerfil(ctx(admin), user('u9', 'admin'), 'membro'), false);
check('dono não é excluído', podeExcluirUsuario(ctx(admin), dono), false);
check('ninguém exclui a si mesmo', podeExcluirUsuario(ctx(admin), admin), false);
check('dono não é inativado', podeDefinirSituacao(ctx(admin), dono, 'inativo'), false);

console.log('\n--- Situação da conta ---');
check('ativo e férias mantêm acesso', [contaAtiva(user('x', 'membro')), contaAtiva(user('x', 'membro', { situacao: 'ferias' }))], [true, true]);
check('inativo e desligado perdem acesso', [
  contaAtiva(user('x', 'membro', { situacao: 'inativo' })),
  contaAtiva(user('x', 'membro', { situacao: 'desligado' })),
], [false, false]);
check('conta inativa não vê nada, mesmo admin', podeVerPagina(ctx(user('u9', 'admin', { situacao: 'inativo' })), 'contratos'), false);
check('responsável marca férias na equipe dele', podeDefinirSituacao(ctx(resp), membro, 'ferias', equipeA), true);
check('responsável NÃO desliga ninguém', podeDefinirSituacao(ctx(resp), membro, 'desligado', equipeA), false);
check('responsável não mexe fora da equipe', podeDefinirSituacao(ctx(resp), user('u8', 'membro'), 'ferias'), false);
check('admin desliga', podeDefinirSituacao(ctx(admin), membro, 'desligado'), true);

console.log('\n--- Convidar ---');
check('responsável convida para a equipe dele', podeConvidar(ctx(resp), equipeA), true);
check('membro não convida', podeConvidar(ctx(membro), equipeA), false);
check('só admin nomeia responsável', [
  podeConvidarComoResponsavel(ctx(admin)),
  podeConvidarComoResponsavel(ctx(resp)),
], [true, false]);
check('domínios: dono sim, admin convidado só com concessão', [
  podeGerenciarDominios(ctx(dono)),
  podeGerenciarDominios(ctx(admin)),
  podeGerenciarDominios({ usuario: admin, equipes, concessoes: [{ id: 'x', usuarioId: admin.id, acao: 'gerenciar_dominios', concedidaPorId: 'u1', criadaEm: '' }] }),
], [true, false, true]);

console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
