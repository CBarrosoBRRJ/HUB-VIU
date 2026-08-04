/**
 * Simulação da jornada completa, do zero até a operação do dia a dia.
 *
 * Reproduz o que o DadosProvider faz, chamando as MESMAS funções de regra que a interface usa.
 * Valida a dinâmica; não substitui o teste visual da tela.
 */
import { definirMembro, removerMembro, alternarPagina, paginasDoUsuario, getPapelNaEquipe } from './utils/equipes.js';
import { criarConvite, validarAceite, statusConvite } from './utils/convites.js';
import { validarEmail, encontrarPorEmail, normalizarEmail } from './utils/identidade.js';
import {
  podeVerPagina, podeCriarEquipe, podeDefinirAcessoDaEquipe, podeGerenciarEquipe, podeConvidar,
  podeConvidarComoResponsavel, podeEditarRegistro, podeExcluirRegistro, podeDefinirPerfil,
  podeDefinirSituacao, contaAtiva, equipesVisiveis,
} from './utils/permissoes.js';

let passo = 0;
let falhas = 0;

function etapa(titulo) {
  passo += 1;
  console.log(`\n${passo}. ${titulo}`);
}

function ok(descricao, condicao) {
  if (!condicao) falhas += 1;
  console.log(`   ${condicao ? '✓' : '✗ FALHOU:'} ${descricao}`);
}

// ------------------------------------------------------------------ estado
const DOMINIOS = ['g.globo', 'globo.com', 'viu.com.br'];
let usuarios = [{
  id: 'u1', nome: 'Caio (dono)', email: 'caio@viu.com.br', cargo: 'Head', telefone: '', local: '',
  nascimento: '', perfil: 'admin', situacao: 'ativo', ehDono: true,
}];
let equipes = [];
let convites = [];
let contratos = [];
let seqUsuario = 2;

const dono = () => usuarios[0];
const por = (id) => usuarios.find((u) => u.id === id);
const ctx = (u) => ({ usuario: u, equipes });

/** Consome o convite como o provider faz: cria ou vincula, e queima o token. */
function aceitar(token, emailAutenticado, nome) {
  const convite = convites.find((c) => c.token === token);
  const erro = validarAceite(convite, emailAutenticado);
  if (erro) return { erro };

  const email = normalizarEmail(emailAutenticado);
  let pessoa = encontrarPorEmail(email, usuarios);
  if (!pessoa) {
    pessoa = {
      id: `u${seqUsuario++}`, nome, email, cargo: '', telefone: '', local: '', nascimento: '',
      perfil: convite.papel === 'responsavel' ? 'responsavel' : 'membro', situacao: 'ativo',
    };
    usuarios = [...usuarios, pessoa];
  }
  equipes = equipes.map((e) => (e.id === convite.equipeId ? definirMembro(e, pessoa.id, convite.papel) : e));
  convites = convites.map((c) => (c.id === convite.id ? { ...c, aceitoEm: new Date().toISOString() } : c));
  return { pessoa };
}

// ------------------------------------------------------------------ jornada
etapa('Dono cria a equipe e libera só o quadro de Contratos');
ok('dono pode criar equipe', podeCriarEquipe(ctx(dono())));
equipes = [{
  id: 'eq1', nome: 'Gestão de Contratos', paginasPermitidas: ['contratos'], membros: [],
  criadaEm: new Date().toISOString(),
}];
ok('equipe criada sem membros', equipes[0].membros.length === 0);
ok('só Contratos liberado', JSON.stringify(equipes[0].paginasPermitidas) === '["contratos"]');

etapa('Dono convida a responsável da equipe');
ok('dono pode nomear responsável', podeConvidarComoResponsavel(ctx(dono())));
ok('e-mail de domínio válido', validarEmail('marcela@g.globo', { usuarios, dominios: DOMINIOS }) === null);
ok('gmail é barrado', validarEmail('alguem@gmail.com', { usuarios, dominios: DOMINIOS }) === 'dominio');

const cvResp = criarConvite({ id: 'cv1', email: 'marcela@g.globo', equipeId: 'eq1', papel: 'responsavel', criadoPorId: 'u1' });
convites.push(cvResp);
ok('convite nasce pendente', statusConvite(cvResp) === 'pendente');

etapa('Alguém tenta usar o link com outro e-mail');
ok('link repassado é recusado', aceitar(cvResp.token, 'intruso@g.globo', 'Intruso').erro === 'outro_email');
ok('ninguém foi criado', usuarios.length === 1);

etapa('A responsável aceita o convite');
const r1 = aceitar(cvResp.token, 'Marcela@G.Globo', 'Marcela Nascimento');
const marcela = r1.pessoa;
ok('conta criada', Boolean(marcela) && marcela.email === 'marcela@g.globo');
ok('perfil veio do papel do convite', marcela.perfil === 'responsavel');
ok('entrou como responsável da equipe', getPapelNaEquipe(equipes[0], marcela.id) === 'responsavel');
ok('convite queimou', statusConvite(convites[0]) === 'aceito');
ok('segundo uso do mesmo link falha', aceitar(cvResp.token, 'marcela@g.globo', 'X').erro === 'aceito');

etapa('Acesso da responsável');
ok('vê Contratos', podeVerPagina(ctx(marcela), 'contratos'));
ok('NÃO vê Backlog (não liberado)', !podeVerPagina(ctx(marcela), 'backlog'));
ok('vê a página Equipes', podeVerPagina(ctx(marcela), 'equipes'));
ok('NÃO vê a página Usuários', !podeVerPagina(ctx(marcela), 'usuarios'));
ok('administra a própria equipe', podeGerenciarEquipe(ctx(marcela), equipes[0]));
ok('NÃO concede quadros a si mesma', !podeDefinirAcessoDaEquipe(ctx(marcela)));
ok('NÃO cria equipe', !podeCriarEquipe(ctx(marcela)));

etapa('Responsável convida um membro');
ok('pode convidar para a equipe dela', podeConvidar(ctx(marcela), equipes[0]));
ok('NÃO pode nomear outro responsável', !podeConvidarComoResponsavel(ctx(marcela)));

const cvMembro = criarConvite({ id: 'cv2', email: 'dani@g.globo', equipeId: 'eq1', papel: 'membro', criadoPorId: marcela.id });
convites.push(cvMembro);
const dani = aceitar(cvMembro.token, 'dani@g.globo', 'Danielle Nhoque').pessoa;
ok('membro entrou', getPapelNaEquipe(equipes[0], dani.id) === 'membro');
ok('nasceu como perfil membro', dani.perfil === 'membro');
ok('base tem 3 pessoas', usuarios.length === 3);

etapa('Convite para quem já tem conta apenas vincula (conta única)');
equipes.push({ id: 'eq2', nome: 'Jurídico', paginasPermitidas: ['contratos'], membros: [], criadaEm: '' });
const cvExistente = criarConvite({ id: 'cv3', email: 'dani@g.globo', equipeId: 'eq2', papel: 'membro', criadoPorId: 'u1' });
convites.push(cvExistente);
aceitar(cvExistente.token, 'dani@g.globo', 'Danielle Nhoque');
ok('não criou segunda conta', usuarios.filter((u) => u.email === 'dani@g.globo').length === 1);
ok('agora está nas duas equipes', equipes.filter((e) => getPapelNaEquipe(e, dani.id)).length === 2);

etapa('Operação: contratos do quadro');
contratos = [
  { id: 'CT-001', talento: 'Gaby', contrato: 'Agenciamento', numero: '', inicio: '2026-01-01', fim: '2026-12-31', status: 'Criação', responsaveisIds: [dani.id], parceirosIds: [], criadoEm: '' },
  { id: 'CT-002', talento: 'Felipe', contrato: 'Campanha', numero: '', inicio: '2026-01-01', fim: '2026-12-31', status: 'Criação', responsaveisIds: [marcela.id], parceirosIds: [], criadoEm: '' },
];
ok('membro edita o contrato em que está nomeado', podeEditarRegistro(ctx(por(dani.id)), 'contratos', contratos[0]));
ok('membro NÃO edita o contrato alheio', !podeEditarRegistro(ctx(por(dani.id)), 'contratos', contratos[1]));
ok('membro NÃO exclui nem o próprio', !podeExcluirRegistro(ctx(por(dani.id)), 'contratos', contratos[0]));
ok('responsável edita o quadro todo', podeEditarRegistro(ctx(por(marcela.id)), 'contratos', contratos[0]));
ok('dono edita tudo', podeEditarRegistro(ctx(dono()), 'contratos', contratos[0]));

etapa('Dono libera o Backlog para a equipe');
equipes = equipes.map((e) => (e.id === 'eq1' ? alternarPagina(e, 'backlog') : e));
ok('membro passou a ver o Backlog', podeVerPagina(ctx(por(dani.id)), 'backlog'));
ok('acesso é a união das equipes, sem repetir', JSON.stringify(paginasDoUsuario(equipes, dani.id).sort()) === '["backlog","contratos"]');

etapa('Ciclo de vida: férias e desligamento');
ok('responsável marca férias na equipe dela', podeDefinirSituacao(ctx(por(marcela.id)), por(dani.id), 'ferias', equipes[0]));
usuarios = usuarios.map((u) => (u.id === dani.id ? { ...u, situacao: 'ferias' } : u));
ok('em férias continua com acesso', podeVerPagina(ctx(por(dani.id)), 'contratos'));

ok('responsável NÃO desliga ninguém', !podeDefinirSituacao(ctx(por(marcela.id)), por(dani.id), 'desligado', equipes[0]));
ok('dono desliga', podeDefinirSituacao(ctx(dono()), por(dani.id), 'desligado'));
usuarios = usuarios.map((u) => (u.id === dani.id ? { ...u, situacao: 'desligado' } : u));
equipes = equipes.map((e) => removerMembro(e, dani.id));
ok('desligado perde o acesso', !contaAtiva(por(dani.id)) && !podeVerPagina(ctx(por(dani.id)), 'contratos'));
ok('saiu de todas as equipes', equipes.every((e) => getPapelNaEquipe(e, dani.id) === null));
ok('histórico preservado: segue na base', Boolean(por(dani.id)));
ok('e segue nomeado no contrato', contratos[0].responsaveisIds.includes(dani.id));

etapa('Travas do dono');
ok('responsável não vira admin pelas mãos de um admin comum', !podeDefinirPerfil(ctx(por(marcela.id)), por(dani.id), 'admin'));
ok('dono promove a admin', podeDefinirPerfil(ctx(dono()), por(marcela.id), 'admin'));
ok('ninguém rebaixa o dono', !podeDefinirPerfil(ctx(dono()), dono(), 'membro'));
ok('dono não é inativado', !podeDefinirSituacao(ctx(dono()), dono(), 'inativo'));

etapa('Escopo de visão na administração');
ok('dono enxerga as 2 equipes', equipesVisiveis(ctx(dono())).length === 2);
ok('responsável enxerga só a dela', equipesVisiveis(ctx(por(marcela.id))).map((e) => e.id).join() === 'eq1');

console.log(
  falhas === 0
    ? `\n✅ Jornada completa: ${passo} etapas, nenhuma falha.`
    : `\n❌ ${falhas} verificação(ões) falharam.`,
);
process.exit(falhas === 0 ? 0 : 1);
