import {
  podeVerPagina, equipesVisiveis, podeGerenciarEquipe, podeCriarEquipe, podeExcluirEquipe,
  podeDefinirAcessoDaEquipe, podeCriarUsuario, podeDefinirPerfil, podeEditarRegistro,
  podeExcluirRegistro, podeSolicitarAcesso, podeDecidirSolicitacao, estaNomeado, nivelDeAcesso,
} from './utils/permissoes.js';

let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

const user = (id, perfil) => ({
  id, perfil, situacao: 'ativo', nome: id, email: `${id}@viu.com.br`, cargo: '', telefone: '', local: '', nascimento: '',
});

const dono = { ...user('u0', 'admin'), ehDono: true };
const admin = user('u1', 'admin');  // Admin Convidado, sem concessões
const resp = user('u2', 'responsavel');       // responsável da equipe A
const respOutro = user('u5', 'responsavel');  // responsável de equipe nenhuma
const membro = user('u3', 'membro');
const forasteiro = user('u9', 'membro');      // sem equipe

const equipeA = {
  id: 'eqA', nome: 'A', paginasPermitidas: ['contratos'], criadaEm: '',
  membros: [
    { usuarioId: 'u2', papel: 'responsavel' },
    { usuarioId: 'u3', papel: 'membro' },
    { usuarioId: 'u5', papel: 'membro' },     // responsável de perfil, mas membro aqui
  ],
};
const equipes = [equipeA];

const ctx = (u) => ({ usuario: u, equipes });

const contrato = (over) => ({
  id: 'CT-001', talento: 'T', contrato: 'Agenciamento', numero: '', inicio: '', fim: '', status: 'Criação',
  responsaveisIds: [], parceirosIds: [], criadoEm: '', ...over,
});

// --- Visibilidade de quadros ---
check('dono vê tudo', ['backlog', 'contratos', 'equipes', 'usuarios'].map((p) => podeVerPagina(ctx(dono), p)), [true, true, true, true]);
check('membro vê só o quadro liberado à equipe', [podeVerPagina(ctx(membro), 'contratos'), podeVerPagina(ctx(membro), 'backlog')], [true, false]);
check('sem equipe não vê nada', [podeVerPagina(ctx(forasteiro), 'contratos'), podeVerPagina(ctx(forasteiro), 'backlog')], [false, false]);
check('membro entra em Equipes (só a dele) e não vê Usuários', [podeVerPagina(ctx(membro), 'equipes'), podeVerPagina(ctx(membro), 'usuarios')], [true, false]);
check('responsável de equipe vê Equipes', podeVerPagina(ctx(resp), 'equipes'), true);
check('só admin vê Usuários', [podeVerPagina(ctx(resp), 'usuarios'), podeVerPagina(ctx(admin), 'usuarios')], [false, true]);

// --- Escopo das equipes ---
check('admin enxerga todas as equipes', equipesVisiveis(ctx(admin)).map((e) => e.id), ['eqA']);
check('quem não participa não enxerga a equipe', equipesVisiveis(ctx(forasteiro)).length, 0);
check('membro enxerga a equipe de que participa', equipesVisiveis(ctx(membro)).map((e) => e.id), ['eqA']);

// --- Gestão: teto do perfil ∩ papel na equipe ---
check('responsável administra a equipe onde é responsável', podeGerenciarEquipe(ctx(resp), equipeA), true);
check('perfil responsável, mas só membro na equipe → não administra', podeGerenciarEquipe(ctx(respOutro), equipeA), false);
check('membro nunca administra', podeGerenciarEquipe(ctx(membro), equipeA), false);
check('admin administra qualquer equipe', podeGerenciarEquipe(ctx(admin), equipeA), true);

check('criar equipe exige dono ou concessão', [podeCriarEquipe(ctx(dono)), podeCriarEquipe(ctx(admin)), podeCriarEquipe(ctx(resp))], [true, false, false]);
check('responsável exclui a própria equipe', podeExcluirEquipe(ctx(resp), equipeA), true);

// Escalada de privilégio: responsável não pode ampliar o próprio acesso.
check('conceder quadros exige dono ou concessão', [podeDefinirAcessoDaEquipe(ctx(dono)), podeDefinirAcessoDaEquipe(ctx(admin))], [true, false]);
check('mudar perfil exige dono ou concessão', [podeDefinirPerfil(ctx(dono), membro, 'responsavel'), podeDefinirPerfil(ctx(admin), membro, 'responsavel'), podeDefinirPerfil(ctx(membro), resp, 'membro')], [true, false, false]);
check('responsável cadastra na equipe que administra', [podeCriarUsuario(ctx(resp), equipeA), podeCriarUsuario(ctx(resp))], [true, false]);
check('membro não cadastra ninguém', podeCriarUsuario(ctx(membro), equipeA), false);

// --- RLS de linha ---
const meu = contrato({ responsaveisIds: ['u3'] });
const meuComoParceiro = contrato({ id: 'CT-002', parceirosIds: ['u3'] });
const alheio = contrato({ id: 'CT-003', responsaveisIds: ['u2'] });

check('estaNomeado', [estaNomeado(meu, 'u3'), estaNomeado(meuComoParceiro, 'u3'), estaNomeado(alheio, 'u3')], [true, true, false]);
check('membro edita o que é dele', podeEditarRegistro(ctx(membro), 'contratos', meu), true);
check('membro edita onde é parceiro', podeEditarRegistro(ctx(membro), 'contratos', meuComoParceiro), true);
check('membro NÃO edita o alheio', podeEditarRegistro(ctx(membro), 'contratos', alheio), false);
check('membro nunca exclui, nem o próprio', podeExcluirRegistro(ctx(membro), 'contratos', meu), false);
check('responsável edita o quadro todo', podeEditarRegistro(ctx(resp), 'contratos', alheio), true);
/*
  **Escrita segue leitura, inclusive para o admin** — 12/08/2026. Este `admin` não está em equipe
  que enxergue Contratos, então não edita: deixá-lo editar o que não vê seria pior que deixá-lo
  ler, porque a leitura ao menos aparece na tela.
*/
check('admin fora da equipe do quadro não edita',
  podeEditarRegistro(ctx(admin), 'contratos', alheio), false);
check('sem acesso ao quadro não edita nada', podeEditarRegistro(ctx(forasteiro), 'contratos', meu), false);
// Regra nova (01/08/2026): a nomeação é uma porta de entrada por si só. Nomear alguém de outra
// área sem lhe dar acesso produziria um responsável incapaz de abrir o próprio registro.
check('nomeado entra em quadro que a equipe dele não libera', podeEditarRegistro(ctx(membro), 'backlog', meu), true);
check('mas só na linha dele — não no quadro todo', podeEditarRegistro(ctx(membro), 'backlog', alheio), false);
check('quadro alheio sem nomeação segue fechado', podeVerPagina(ctx(membro), 'backlog'), false);

// --- Solicitações ---
check('quem não é admin solicita', [podeSolicitarAcesso(ctx(membro)), podeSolicitarAcesso(ctx(resp)), podeSolicitarAcesso(ctx(admin))], [true, true, false]);
check('só admin decide', [podeDecidirSolicitacao(ctx(admin)), podeDecidirSolicitacao(ctx(resp))], [true, false]);


/* ------------------------------------------------------------------ *
 * Interseção perfil × equipe — o caso que passou despercebido
 *
 * "Perfil é teto, equipe é escopo" valia para administrar equipe, mas NÃO para os quadros:
 * `nivelDeAcesso` olhava só o perfil. Alguém responsável pela equipe A e apenas membro na equipe
 * B enxergava e editava o quadro inteiro de B. Corrigido em 01/08/2026.
 * ------------------------------------------------------------------ */
console.log('\n--- Interseção perfil × papel na equipe ---');

const eqContratos = {
  id: 'eqCtr', nome: 'Contratos', paginasPermitidas: ['contratos'], criadaEm: '',
  membros: [
    { usuarioId: 'uResp', papel: 'responsavel' },
    { usuarioId: 'uMisto', papel: 'membro' },      // responsável de perfil, MEMBRO aqui
  ],
};
const eqOutra = {
  id: 'eqOut', nome: 'Orçamentos', paginasPermitidas: ['backlog'], criadaEm: '',
  membros: [{ usuarioId: 'uMisto', papel: 'responsavel' }],
};
const doisTimes = [eqContratos, eqOutra];
const ctx2 = (u) => ({ usuario: u, equipes: doisTimes });

const respAqui = user('uResp', 'responsavel');
const respAlhures = user('uMisto', 'responsavel');

const linha = (over) => contrato({ id: 'X1', responsaveisIds: [], parceirosIds: [], ...over });
const minha = linha({ responsaveisIds: ['uMisto'] });
const alheia = linha({ id: 'X2', responsaveisIds: ['uResp'] });

check('responsável NA equipe do quadro vê tudo', nivelDeAcesso(ctx2(respAqui), 'contratos'), 'total');
// O ponto: ele é responsável, mas de OUTRA equipe. Aqui é membro.
check('responsável de outra equipe vê só o dele', nivelDeAcesso(ctx2(respAlhures), 'contratos'), 'nomeado');
check('e no quadro onde É responsável, vê tudo', nivelDeAcesso(ctx2(respAlhures), 'backlog'), 'total');

check('responsável da equipe edita a linha alheia', podeEditarRegistro(ctx2(respAqui), 'contratos', alheia), true);
check('o de outra equipe NÃO edita a alheia', podeEditarRegistro(ctx2(respAlhures), 'contratos', alheia), false);
check('mas edita a própria', podeEditarRegistro(ctx2(respAlhures), 'contratos', minha), true);
check('e não exclui a alheia', podeExcluirRegistro(ctx2(respAlhures), 'contratos', alheia), false);

// Escrita nunca alcança o que a leitura não alcança.
check('escrita ⊆ leitura, sempre',
  [minha, alheia].every((c) => {
    const nomeado = estaNomeado(c, 'uMisto');
    const nivel = nivelDeAcesso(ctx2(respAlhures), 'contratos', nomeado);
    const edita = podeEditarRegistro(ctx2(respAlhures), 'contratos', c);
    return !edita || nivel === 'total' || nomeado;
  }), true);



console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);