import {
  podeEditarProprioCadastro, podeVerPagina, equipesVisiveis, podeGerenciarEquipe,
} from './utils/permissoes.js';
import {
  criarTrocaEmail, statusTroca, validarConfirmacao, trocaPendenteDe, VALIDADE_HORAS_EMAIL,
} from './utils/trocaEmail.js';
import { validarEmail } from './utils/identidade.js';

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

const membro = user('u4', 'membro');
const outro = user('u5', 'membro');
const inativo = user('u6', 'membro', { situacao: 'inativo' });

const equipes = [
  { id: 'eq1', nome: 'Gestão de Contratos', paginasPermitidas: ['contratos'], criadaEm: '',
    membros: [{ usuarioId: 'u4', papel: 'membro' }] },
  { id: 'eq2', nome: 'Gestão de Orçamentos', paginasPermitidas: ['backlog'], criadaEm: '',
    membros: [{ usuarioId: 'u5', papel: 'responsavel' }] },
];
const ctx = (u, extra = {}) => ({ usuario: u, equipes, concessoes: [], ...extra });

console.log('--- Membro e a página de Equipes ---');
check('membro entra na página Equipes', podeVerPagina(ctx(membro), 'equipes'), true);
check('mas enxerga só a equipe dele', equipesVisiveis(ctx(membro)).map((e) => e.id), ['eq1']);
check('e não administra nada', podeGerenciarEquipe(ctx(membro), equipes[0]), false);
check('quem não está em equipe nenhuma não entra', podeVerPagina(ctx(user('u9', 'membro')), 'equipes'), false);
check('página Meu perfil é de todos', [
  podeVerPagina(ctx(membro), 'perfil'),
  podeVerPagina(ctx(user('u9', 'membro')), 'perfil'),
], [true, true]);

console.log('\n--- Cadastro próprio ---');
check('edita o próprio cadastro', podeEditarProprioCadastro(ctx(membro), membro), true);
check('não edita o de outra pessoa', podeEditarProprioCadastro(ctx(membro), outro), false);
check('conta inativa não edita nem o próprio', podeEditarProprioCadastro(ctx(inativo), inativo), false);
check('em visualização não edita nada', podeEditarProprioCadastro(ctx(membro, { visualizacao: true }), membro), false);

console.log('\n--- Troca de e-mail com confirmação ---');
const AGORA = new Date(2026, 7, 1, 10, 0, 0);
const troca = criarTrocaEmail({ id: 'te1', usuarioId: 'u4', novoEmail: 'Novo.Email@VIU.com.br' }, AGORA);
check('e-mail normalizado', troca.novoEmail, 'novo.email@viu.com.br');
check('nasce pendente', statusTroca(troca, AGORA), 'pendente');
check('validade de 24h', VALIDADE_HORAS_EMAIL, 24);

const em25h = new Date(AGORA.getTime() + 25 * 3_600_000);
check('expira em 25h', statusTroca(troca, em25h), 'expirada');
check('link expirado não confirma', validarConfirmacao(troca, em25h), 'expirada');
check('link válido confirma', validarConfirmacao(troca, AGORA), null);

const confirmada = { ...troca, confirmadaEm: AGORA.toISOString() };
check('uso único: segunda confirmação falha', validarConfirmacao(confirmada, AGORA), 'confirmada');
check('link inexistente', validarConfirmacao(undefined, AGORA), 'inexistente');

check('detecta pendência da pessoa', trocaPendenteDe([troca], 'u4', AGORA)?.id, 'te1');
check('confirmada não conta como pendente', trocaPendenteDe([confirmada], 'u4', AGORA), undefined);
check('expirada não conta como pendente', trocaPendenteDe([troca], 'u4', em25h), undefined);
check('não confunde pessoas', trocaPendenteDe([troca], 'u9', AGORA), undefined);

console.log('\n--- Regra de domínio vale para a troca ---');
const base = { usuarios: [membro, outro], dominios: ['viu.com.br'] };
check('gmail barrado na troca', validarEmail('pessoal@gmail.com', base), 'dominio');
check('e-mail de outra pessoa barrado', validarEmail(outro.email, { ...base, ignorarId: membro.id }), 'duplicado');
check('o próprio e-mail não acusa duplicidade', validarEmail(membro.email, { ...base, ignorarId: membro.id }), null);
check('e-mail novo e válido passa', validarEmail('novo@viu.com.br', { ...base, ignorarId: membro.id }), null);

console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
