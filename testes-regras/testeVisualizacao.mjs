/**
 * Modo "Ver como": leitura pelos olhos de outra pessoa, escrita bloqueada.
 *
 * O risco que estes casos cobrem é o pior possível: o admin abrir a visão de alguém e, sem
 * perceber, continuar podendo agir — gerando alterações sem rastro de quem as fez.
 */
import {
  podeVerPagina, equipesVisiveis, podeGerenciarAcessos, podeGerenciarEquipe, podeCriarEquipe,
  podeExcluirEquipe, podeDefinirAcessoDaEquipe, podeCriarUsuario, podeDefinirPerfil,
  podeDefinirSituacao, podeExcluirUsuario, podeGerenciarConcessoes, podeGerenciarDominios,
  podeGerenciarEmailsDeAcesso, podeCriarRegistro, podeEditarRegistro, podeExcluirRegistro,
  podeConvidar, podeSolicitarAcesso, podeDecidirSolicitacao, podeAcao,
} from './utils/permissoes.js';

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

const dono = user('u0', 'admin', { ehDono: true });
const membro = user('u3', 'membro');

const equipes = [{
  id: 'eq1', nome: 'Gestão de Contratos', paginasPermitidas: ['contratos'], criadaEm: '',
  membros: [{ usuarioId: 'u3', papel: 'membro' }],
}];

const contrato = {
  id: 'CT-001', talento: 'T', contrato: 'Agenciamento', numero: '', inicio: '', fim: '', status: 'Criação',
  responsaveisIds: ['u3'], parceirosIds: [], criadoEm: '',
};

// O dono navegando normalmente.
const normal = { usuario: dono, equipes, concessoes: [] };
// O dono vendo com os olhos do membro: contexto passa a ser do membro + visualizacao.
const vendo = { usuario: membro, equipes, concessoes: [], visualizacao: true };
// Referência: o membro de verdade, sem visualização.
const membroReal = { usuario: membro, equipes, concessoes: [] };

console.log('--- Leitura reflete a pessoa observada ---');
check('vê o quadro da equipe dela', podeVerPagina(vendo, 'contratos'), true);
check('não vê o quadro que ela não tem', podeVerPagina(vendo, 'backlog'), false);
check('reflete a administração que ela vê: Equipes sim, Usuários não', [
  podeVerPagina(vendo, 'usuarios'), podeVerPagina(vendo, 'equipes'),
], [false, true]);
check('mesma visão de quadros que a pessoa real', [
  podeVerPagina(vendo, 'contratos'), podeVerPagina(membroReal, 'contratos'),
], [true, true]);
check('equipes visíveis são as dela', equipesVisiveis(vendo).map((e) => e.id), ['eq1']);

console.log('\n--- Escrita bloqueada, mesmo sendo o dono por trás ---');
check('não edita registro que ela editaria', [
  podeEditarRegistro(membroReal, 'contratos', contrato),
  podeEditarRegistro(vendo, 'contratos', contrato),
], [true, false]);
check('não cria registro', podeCriarRegistro(vendo, 'contratos'), false);
check('não exclui registro', podeExcluirRegistro(vendo, 'contratos', contrato), false);
check('não gerencia equipe', podeGerenciarEquipe(vendo, equipes[0]), false);
check('não cria nem exclui equipe', [podeCriarEquipe(vendo), podeExcluirEquipe(vendo, equipes[0])], [false, false]);
check('não concede quadros', podeDefinirAcessoDaEquipe(vendo), false);
check('não cadastra pessoa', podeCriarUsuario(vendo, equipes[0]), false);
check('não muda perfil', podeDefinirPerfil(vendo, membro, 'responsavel'), false);
check('não muda situação', podeDefinirSituacao(vendo, membro, 'ferias', equipes[0]), false);
check('não exclui pessoa', podeExcluirUsuario(vendo, membro), false);
check('não concede capacidades', podeGerenciarConcessoes(vendo), false);
check('não mexe em domínios', podeGerenciarDominios(vendo), false);
check('não mexe em e-mails de acesso', podeGerenciarEmailsDeAcesso(vendo, membro), false);
check('não convida', podeConvidar(vendo, equipes[0]), false);
check('não solicita acesso em nome de outro', podeSolicitarAcesso(vendo), false);
check('não decide solicitações', podeDecidirSolicitacao(vendo), false);

console.log('\n--- Visualizando um admin: continua sem escrever ---');
const admin = user('u1', 'admin');
const vendoAdmin = { usuario: admin, equipes, concessoes: [], visualizacao: true };
check('vê a página de Usuários (leitura)', podeVerPagina(vendoAdmin, 'usuarios'), true);
check('mas não decide solicitações', podeDecidirSolicitacao(vendoAdmin), false);
check('nem exclui ninguém', podeExcluirUsuario(vendoAdmin, membro), false);

console.log('\n--- Visualizando o dono: nem assim libera escrita ---');
const vendoDono = { usuario: dono, equipes, concessoes: [], visualizacao: true };
check('dono observado enxerga tudo', [
  podeVerPagina(vendoDono, 'contratos'), podeVerPagina(vendoDono, 'usuarios'),
], [true, true]);
check('mas nenhuma escrita passa', [
  podeCriarEquipe(vendoDono),
  podeDefinirPerfil(vendoDono, membro, 'admin'),
  podeExcluirUsuario(vendoDono, membro),
  podeGerenciarConcessoes(vendoDono),
], [false, false, false, false]);

console.log('\n--- Sessão normal segue intacta ---');
check('dono fora da visualização faz tudo', [
  podeCriarEquipe(normal),
  podeDefinirPerfil(normal, membro, 'admin'),
  podeGerenciarConcessoes(normal),
  podeAcao(normal, 'gerenciar_acessos'),
], [true, true, true, true]);
check('aba de Acessos é leitura e aparece na visualização', podeGerenciarAcessos(vendoAdmin), false);

console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
