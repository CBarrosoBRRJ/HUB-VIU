import {
  VISOES, visoesDoQuadro, visoesRestritasDoQuadro, getVisao, podeVerVisao, alternarVisao,
} from './utils/visoes.js';
import { filtrarContratos, filtrarTalentos, camposPorColuna, normalizar } from './utils/busca.js';
import { TODAS_AS_COLUNAS, colunasDaVisao } from './utils/colunas.js';

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

const equipe = (id, over = {}) => ({
  id, nome: id, paginasPermitidas: ['talentos'], membros: [], criadaEm: '', ...over,
});

const talento = (over = {}) => ({
  id: 'tal1', nome: 'Marina Duarte', tipo: 'exclusivo', nomeArtistico: 'Marina',
  empresa: 'MD Produções', email: 'contato@md.com.br', telefone: '(21) 98800-1122',
  local: 'Rio de Janeiro, RJ', observacoes: '', razaoSocial: 'MD Produções LTDA',
  cnpj: '12.345.678/0001-90', faturamento: 'R$ 45.000', condicaoPagamento: '', dadosBancarios: '',
  redes: { instagram: 'marinaduarte', tiktok: '', youtube: '', facebook: '', x: '', site: '' },
  responsaveis: { talent: ['u3'] }, criadoEm: '', ...over,
});

const contrato = (over = {}) => ({
  id: 'c1', talento: 'Marina Duarte', contrato: 'Contrato de agenciamento', numero: 'CTR-2026-001',
  inicio: '2026-01-01', fim: '2026-12-31', status: 'Em Assinatura',
  responsaveisIds: [], parceirosIds: [], criadoEm: '', ...over,
});

console.log('\n--- Catálogo de visões ---');
check('seis abas em Talentos', visoesDoQuadro('talentos').map((v) => v.id.split(':')[1]),
  ['identificacao', 'contato', 'redes', 'financeiro', 'responsaveis', 'contratos']);
check('só duas são restritas', visoesRestritasDoQuadro('talentos').map((v) => v.id.split(':')[1]),
  ['contato', 'financeiro']);
check('toda restrita explica o motivo', visoesRestritasDoQuadro('talentos').every((v) => v.motivo), true);
check('visão inexistente não resolve', getVisao('talentos:nada'), undefined);
check('todo id segue quadro:aba', VISOES.every((v) => v.id.startsWith(`${v.quadro}:`)), true);

console.log('\n--- Quem enxerga as abas ---');
const eqAberta = equipe('eqA', { membros: [{ usuarioId: 'u5', papel: 'membro' }] });
const eqComContato = equipe('eqB', {
  membros: [{ usuarioId: 'u6', papel: 'membro' }],
  visoesLiberadas: ['talentos:contato'],
});
const equipes = [eqAberta, eqComContato];
const ctx = (usuario) => ({ usuario, equipes });

const dono = user('u0', 'admin', { ehDono: true });
const admin = user('u1', 'admin');
const semLiberacao = user('u5', 'membro');
const comContato = user('u6', 'membro');

check('dono vê a aba restrita', podeVerVisao(ctx(dono), 'talentos:financeiro', true), true);
/*
  O admin perdeu o atalho em 12/08/2026: aba sensível exige liberação **da equipe dele**, como
  para qualquer pessoa. Ver a nota em `nivelDeAcesso`.
*/
check('admin sem liberação não vê a aba restrita',
  podeVerVisao(ctx(admin), 'talentos:financeiro'), false);
check('aba aberta dispensa liberação', podeVerVisao(ctx(semLiberacao), 'talentos:redes'), true);
check('aba restrita sem liberação: não', podeVerVisao(ctx(semLiberacao), 'talentos:contato'), false);
check('aba restrita liberada: sim', podeVerVisao(ctx(comContato), 'talentos:contato'), true);
// Liberar Contato não abre Financeiro: cada aba sensível é uma decisão separada.
check('liberar uma não libera a outra', podeVerVisao(ctx(comContato), 'talentos:financeiro'), false);
check('visão inexistente nunca abre', podeVerVisao(ctx(dono), 'talentos:inventada', true), false);
// A liberação é por equipe: quem não é membro dela não herda nada.
check('liberação não vaza para quem não é da equipe',
  podeVerVisao({ usuario: user('u9', 'membro'), equipes }, 'talentos:contato'), false);

console.log('\n--- Alternar liberação ---');
const semNada = equipe('eqC');
const comUma = alternarVisao(semNada, 'talentos:contato');
check('alternar não muta o original', semNada.visoesLiberadas, undefined);
check('liga a visão', comUma.visoesLiberadas, ['talentos:contato']);
check('clicar de novo desliga', alternarVisao(comUma, 'talentos:contato').visoesLiberadas, []);
check('acumula sem apagar a anterior',
  alternarVisao(comUma, 'talentos:financeiro').visoesLiberadas,
  ['talentos:contato', 'talentos:financeiro']);

console.log('\n--- Busca em contratos ---');
const usuarios = [user('u3', 'membro', { nome: 'Camila Souza', email: 'camila.souza@viu.com.br' })];
const contratos = [
  contrato({ id: 'c1', talento: 'Marina Duarte', responsaveisIds: ['u3'] }),
  contrato({ id: 'c2', talento: 'Rafael Nogueira', contrato: 'Campanha Coca-Cola', numero: 'CTR-2026-014', status: 'Concluído' }),
  contrato({ id: 'c3', talento: 'Helena Prado', contrato: 'Campanha de verão', numero: 'X-99' }),
];
const ids = (termo) => filtrarContratos(contratos, termo, usuarios).map((c) => c.id);

check('busca vazia devolve tudo', ids('').length, 3);
check('por nome do talento', ids('marina'), ['c1']);
check('ignora acento e caixa', ids('HELENA prado'), ['c3']);
check('pela descrição', ids('coca'), ['c2']);
check('pelo número', ids('CTR-2026-014'), ['c2']);
check('pelo status', ids('concluído'), ['c2']);
check('pelo nome de quem está na linha', ids('camila'), ['c1']);
check('pelo e-mail de quem está na linha', ids('camila.souza@viu.com.br'), ['c1']);
// Termos múltiplos se somam: cada um precisa aparecer em algum campo da mesma linha.
check('todos os termos precisam casar', ids('campanha verao'), ['c3']);
check('termo que não existe zera', ids('inexistente'), []);
check('parceiro também é encontrado',
  filtrarContratos([contrato({ id: 'p1', parceirosIds: ['u3'] })], 'camila', usuarios).map((c) => c.id),
  ['p1']);

console.log('\n--- Busca em talentos respeita as visões ---');
// O segundo é o "controle": nenhum campo em comum com o primeiro, para que qualquer termo
// que case com ele denuncie vazamento entre visões.
const outro = talento({
  id: 'tal2', nome: 'Helena Prado', nomeArtistico: '', empresa: 'Prado Comunicação',
  email: 'helena@pradocom.com.br', telefone: '(31) 99120-4455', local: 'Belo Horizonte, MG',
  razaoSocial: 'Prado Comunicação LTDA', cnpj: '45.678.912/0001-33', faturamento: 'Por projeto',
  redes: { instagram: 'helenaprado', tiktok: '', youtube: '', facebook: '', x: '', site: '' },
  responsaveis: {},
});
const fichas = [talento(), outro];
// A busca passou a receber COLUNAS, não visões: a permissão tem dois níveis e agrupar por aba
// deixaria uma coluna oculta pesquisável através da aba a que pertence.
const TODAS = TODAS_AS_COLUNAS.map((c) => c.id);
/** Busca com as colunas das VISÕES informadas — é assim que a página monta a lista. */
const buscar = (termo, visoes) =>
  filtrarTalentos(
    fichas, termo, usuarios,
    visoes.flatMap((v) => colunasDaVisao(v)).map((c) => c.id),
  ).map((t) => t.id);

/** Busca com todas as colunas do catálogo — o caso de quem enxerga tudo. */
const buscarTudo = (termo) => filtrarTalentos(fichas, termo, usuarios, TODAS).map((t) => t.id);

check('acha pelo nome com identificação', buscar('marina', ['talentos:identificacao']), ['tal1']);
check('acha pela empresa', buscar('produções', ['talentos:identificacao']), ['tal1']);
check('acha pelo telefone quando vê Contato', buscarTudo('98800'), ['tal1']);
// O ponto central: sem a aba, o campo não é pesquisável — senão a busca confirmaria o dado oculto.
check('NÃO acha pelo telefone sem a aba Contato', buscar('98800', ['talentos:identificacao', 'talentos:redes']), []);
check('NÃO acha pelo CNPJ sem a aba Financeiro', buscar('12.345.678', ['talentos:identificacao']), []);
check('acha pelo CNPJ com a aba Financeiro', buscar('12.345.678', ['talentos:financeiro']), ['tal1']);
check('acha pela rede social', buscar('marinaduarte', ['talentos:redes']), ['tal1']);
check('acha pelo responsável', buscar('camila', ['talentos:responsaveis']), ['tal1']);
// O nome é a chave da linha e nunca se oculta; buscar por ele funciona sempre.
check('o nome é buscável mesmo sem visão alguma', buscar('marina', []), ['tal1']);
check('mas o telefone não vaza sem a aba', buscar('98800', []), []);
check('busca vazia devolve tudo mesmo sem visão', filtrarTalentos(fichas, '', usuarios, []).length, 2);

console.log('\n--- Mapa de campos por coluna ---');
// O detalhe do mapa vive em `testeColunas.mjs`; aqui só a integridade contra o catálogo.
const mapa = camposPorColuna(talento(), usuarios);
check('toda chave do mapa é uma coluna do catálogo',
  Object.keys(mapa).every((id) => TODAS.includes(id)), true);
check('toda visão de Talentos tem ao menos uma coluna no mapa',
  visoesDoQuadro('talentos')
    .filter((v) => !v.id.endsWith(':contratos'))  // a aba Contratos é derivada, sem campo próprio
    .every((v) => Object.keys(mapa).some((id) => id.startsWith(`${v.id}:`))), true);

console.log('\n--- Normalização ---');
check('remove acento', normalizar('Produções'), 'producoes');
check('apara e minúscula', normalizar('  MARINA  '), 'marina');

console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`);
