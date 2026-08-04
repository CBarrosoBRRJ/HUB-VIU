import {
  areasDoTalento, AREAS, getArea, equipeDaArea, candidatosDaArea, alternarResponsavelDaArea, responsaveisDaArea,
  limparArea, fichaVazia, areasDefinidas,
  nomeadosDoTalento, contratosDoTalento, encontrarTalentoPorNome, nomeEmUso,
  TIPOS, getTipo, REDES, REDES_VAZIAS, redesPreenchidas, matchesFiltroTalento, contarTalentos,
} from './utils/talentos.js';
import {
  podeEditarTalento, podeCriarRegistro, podeVerPagina, nivelDeAcesso, registrosVisiveis,
  nomeadosDoContrato,
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

const talento = (over = {}) => ({
  id: 'tal1', nome: 'Marina Duarte', tipo: 'exclusivo', nomeArtistico: '', empresa: '', email: '',
  telefone: '', local: '', observacoes: '', razaoSocial: '', cnpj: '', faturamento: '',
  condicaoPagamento: '', dadosBancarios: '', redes: { ...REDES_VAZIAS }, responsaveis: {},
  criadoEm: '', ...over,
});

const contrato = (over = {}) => ({
  id: 'c1', talento: 'Marina Duarte', contrato: 'Agenciamento', numero: '001',
  inicio: '2026-01-01', fim: '2026-12-31', status: 'Concluído',
  responsaveisIds: [], parceirosIds: [], criadoEm: '', ...over,
});

console.log('\n--- Áreas de responsabilidade ---');
check('dez áreas', AREAS.map((a) => a.id),
  ['talent', 'orcamento', 'gp', 'audiencia', 'conteudo', 'producao', 'pagamento', 'juridico',
   'artistico', 'executivo']);
/*
  Só seis respondem por um **talento** — as colunas da aba Responsáveis em Talentos. As outras
  quatro respondem por projeto e vivem no Backlog: "quem paga este projeto" é pergunta, "quem paga
  a Marina Duarte" não é. Incluí-las aqui abriria colunas num quadro que ninguém pediu para mexer,
  e quebraria a soma de pesos que vale 78 naquela aba.

  Produtor Artístico e Executivo entraram em 03/08/2026 pelo mesmo critério de Pagamento e
  Jurídico — e é o critério, não a contagem, que este par de asserções trava.
*/
check('seis respondem por talento', areasDoTalento().map((a) => a.id),
  ['talent', 'orcamento', 'gp', 'audiencia', 'conteudo', 'producao']);
/* Cor repetida faz a etiqueta deixar de identificar a área. */
check('nenhuma cor repetida', new Set(AREAS.map((a) => a.chip)).size, AREAS.length);
/* Um buraco no literal (`},,`) vira `undefined` ao iterar — e quebrou `getArea` de verdade. */
check('nenhum item vazio', AREAS.every((a) => a && a.id), true);
check('toda área tem rótulo, cor e equipe sugerida', AREAS.every((a) => a.label && a.chip && a.descricao && a.equipeSugerida), true);
check('área desconhecida não resolve', getArea('inexistente'), undefined);

/* Equipes: uma por área, mais uma que não atende área nenhuma. */
const equipes = [
  { id: 'eqTalent', nome: 'Gestão de Talent Manager', paginasPermitidas: ['talentos'], areaTalento: 'talent', criadaEm: '',
    membros: [{ usuarioId: 'u3', papel: 'responsavel' }, { usuarioId: 'u6', papel: 'membro' }] },
  { id: 'eqOrc', nome: 'Gestão de Orçamentos', paginasPermitidas: ['talentos'], areaTalento: 'orcamento', criadaEm: '',
    membros: [{ usuarioId: 'u2', papel: 'membro' }] },
  { id: 'eqContratos', nome: 'Gestão de Contratos', paginasPermitidas: ['contratos'], criadaEm: '',
    membros: [{ usuarioId: 'u7', papel: 'membro' }] },
];

console.log('\n--- Equipe que atende a área ---');
check('acha a equipe da área', equipeDaArea(equipes, 'talent')?.nome, 'Gestão de Talent Manager');
check('área sem equipe devolve nada', equipeDaArea(equipes, 'producao'), undefined);

const usuarios = ['u2', 'u3', 'u6', 'u7', 'u9'].map((id) => user(id, 'membro'));
check('candidatos saem da equipe da área', candidatosDaArea(equipes, usuarios, 'talent').map((u) => u.id), ['u3', 'u6']);
check('área sem equipe não tem candidato', candidatosDaArea(equipes, usuarios, 'producao').map((u) => u.id), []);
// Quem já responde continua na lista mesmo tendo saído da equipe — senão não dá nem para trocá-lo.
check('quem já responde permanece na lista', candidatosDaArea(equipes, usuarios, 'talent', 'u9').map((u) => u.id), ['u3', 'u6', 'u9']);

console.log('\n--- Nomear responsáveis por área ---');
const vazio = talento();
const comTalent = alternarResponsavelDaArea(vazio, 'talent', 'u3');
check('alternar não muta o original', vazio.responsaveis, {});
check('adiciona o primeiro', comTalent.responsaveis, { talent: ['u3'] });
// Uma área aceita vários: dupla de produção e substituto são situações correntes.
const comDois = alternarResponsavelDaArea(comTalent, 'talent', 'u6');
check('adiciona o segundo sem tirar o primeiro', comDois.responsaveis, { talent: ['u3', 'u6'] });
check('o mesmo gesto remove', alternarResponsavelDaArea(comDois, 'talent', 'u3').responsaveis, { talent: ['u6'] });
// Área sem ninguém perde a chave: "vazio" e "lista vazia" não podem ser dois estados distintos.
check('remover o último apaga a chave', alternarResponsavelDaArea(comTalent, 'talent', 'u3').responsaveis, {});
check('limparArea esvazia de uma vez', limparArea(comDois, 'talent').responsaveis, {});
check('responsaveisDaArea sempre devolve lista', responsaveisDaArea(vazio, 'talent'), []);
check('contagem de áreas definidas', areasDefinidas(alternarResponsavelDaArea(comTalent, 'gp', 'u2')), 2);
check('área com dois responsáveis conta uma vez', areasDefinidas(comDois), 1);

console.log('\n--- Ficha vazia (pendência de cadastro) ---');
check('ficha só com nome está vazia', fichaVazia(talento()), true);
check('qualquer campo preenchido a tira do vazio', fichaVazia(talento({ email: 'a@b.c' })), false);
check('rede preenchida também', fichaVazia(talento({ redes: { ...REDES_VAZIAS, instagram: 'x' } })), false);
check('responsável nomeado também', fichaVazia(comTalent), false);
check('espaço em branco não conta', fichaVazia(talento({ empresa: '   ' })), true);

const marina = talento({ responsaveis: { talent: ['u3'], gp: ['u3'], orcamento: ['u2'] } });
check('a mesma pessoa em duas áreas conta uma vez', nomeadosDoTalento(marina), ['u3', 'u2']);
check('ficha vazia não nomeia ninguém', nomeadosDoTalento(vazio), []);

console.log('\n--- Vínculo comercial ---');
check('dois tipos', TIPOS.map((t) => t.id), ['exclusivo', 'interveniencia']);
check('cada tipo tem etiqueta e cor', TIPOS.every((t) => t.label && t.chip && t.dot && t.descricao), true);
check('resolve o tipo', getTipo('exclusivo').label, 'Exclusivo');
// Tipo desconhecido cai em interveniência: o vínculo mais frouxo é o padrão seguro — marcar
// alguém como exclusivo por engano abriria áreas de responsabilidade que ninguém pediu.
check('tipo inválido cai no mais frouxo', getTipo('inventado').id, 'interveniencia');

console.log('\n--- Redes ---');
check('seis redes', REDES.map((r) => r.campo), ['instagram', 'tiktok', 'youtube', 'facebook', 'x', 'site']);
check('vazias começam em branco', Object.values(REDES_VAZIAS).every((v) => v === ''), true);
check('conta as preenchidas', redesPreenchidas(talento({ redes: { ...REDES_VAZIAS, instagram: 'a', tiktok: 'b' } })), 2);
check('espaço em branco não conta', redesPreenchidas(talento({ redes: { ...REDES_VAZIAS, instagram: '   ' } })), 0);
check('ficha nova não tem rede', redesPreenchidas(talento()), 0);

console.log('\n--- Contratos do talento ---');
const lista = [
  contrato({ id: 'c1', talentoId: 'tal1', talento: 'Nome antigo' }),   // vínculo por id vence o nome
  contrato({ id: 'c2', talento: 'marina duarte' }),                    // legado: casa por nome normalizado
  contrato({ id: 'c3', talento: 'MARINA DUÁRTE' }),                    // acento e caixa não separam
  contrato({ id: 'c4', talento: 'Outro Talento' }),
  contrato({ id: 'c5', talentoId: 'tal9', talento: 'Marina Duarte' }), // homônimo de outro cadastro
];
check('reúne por id e por nome', contratosDoTalento(marina, lista).map((c) => c.id), ['c1', 'c2', 'c3']);
check('homônimo vinculado a outro id fica de fora', contratosDoTalento(marina, lista).some((c) => c.id === 'c5'), false);

console.log('\n--- Busca e duplicidade ---');
const talentos = [marina, talento({ id: 'tal2', nome: 'Rafael Nogueira' })];
check('encontra ignorando caixa e acento', encontrarTalentoPorNome('  marina duárte ', talentos)?.id, 'tal1');
check('nome inexistente não encontra', encontrarTalentoPorNome('Fulano', talentos), undefined);
check('nome vazio não encontra', encontrarTalentoPorNome('   ', talentos), undefined);
check('nome duplicado é detectado', nomeEmUso('Rafael Nogueira', talentos), true);
check('editar o próprio nome não é duplicidade', nomeEmUso('Marina Duarte', talentos, 'tal1'), false);

console.log('\n--- Nível de acesso ao quadro ---');
const ctx = (usuario, over = {}) => ({ usuario, equipes, ...over });
const dono = user('u0', 'admin', { ehDono: true });
const admin = user('u1', 'admin');
const respDaArea = user('u3', 'responsavel');   // responsável na eqTalent
const membroDaArea = user('u6', 'membro');      // membro da eqTalent
const membroDeOutroQuadro = user('u7', 'membro'); // só eqContratos — não vê Talentos pela equipe
const forasteiro = user('u9', 'membro');        // equipe nenhuma

check('dono vê tudo', nivelDeAcesso(ctx(dono), 'talentos'), 'total');
check('admin vê tudo', nivelDeAcesso(ctx(admin), 'talentos'), 'total');
check('responsável da equipe vê o quadro todo', nivelDeAcesso(ctx(respDaArea), 'talentos'), 'total');
// A mudança central: membro da equipe também passa a ver só o que é dele.
check('membro da equipe vê só o dele', nivelDeAcesso(ctx(membroDaArea), 'talentos'), 'nomeado');
check('fora da equipe e sem nomeação: nada', nivelDeAcesso(ctx(membroDeOutroQuadro), 'talentos', false), 'nenhum');
check('fora da equipe mas nomeado: vê o dele', nivelDeAcesso(ctx(membroDeOutroQuadro), 'talentos', true), 'nomeado');
check('conta inativa não entra nem nomeada', nivelDeAcesso(ctx(user('u8', 'membro', { situacao: 'inativo' })), 'talentos', true), 'nenhum');

console.log('\n--- Filtro de linhas ---');
const fichas = [
  talento({ id: 'A', nome: 'A', responsaveis: { talent: ['u6'] } }),
  talento({ id: 'B', nome: 'B', responsaveis: { talent: ['u3'] } }),
  talento({ id: 'C', nome: 'C', responsaveis: {} }),
];
const ids = (ctxo) => registrosVisiveis(ctxo, 'talentos', fichas, nomeadosDoTalento).map((t) => t.id);
check('dono vê as três', ids(ctx(dono)), ['A', 'B', 'C']);
check('responsável vê as três', ids(ctx(respDaArea)), ['A', 'B', 'C']);
check('membro vê só a sua', ids(ctx(membroDaArea)), ['A']);
check('nomeado de fora da equipe vê só a sua', ids(ctx(user('u3', 'membro'))), ['B']);
check('quem não é nomeado não vê nada', ids(ctx(forasteiro)), []);

const linhas = [
  contrato({ id: 'x1', responsaveisIds: ['u7'] }),
  contrato({ id: 'x2', parceirosIds: ['u7'] }),
  contrato({ id: 'x3', responsaveisIds: ['u2'] }),
];
check('mesma regra vale nos contratos',
  registrosVisiveis(ctx(membroDeOutroQuadro), 'contratos', linhas, nomeadosDoContrato).map((c) => c.id),
  ['x1', 'x2']);

console.log('\n--- Quem edita a ficha ---');
check('dono edita', podeEditarTalento(ctx(dono), marina), true);
check('admin edita', podeEditarTalento(ctx(admin), marina), true);
check('responsável edita o quadro todo', podeEditarTalento(ctx(respDaArea), marina), true);
// Perfil é teto, equipe é escopo: sem equipe que enxergue o quadro, o teto não vale nada.
check('responsável sem equipe NÃO edita', podeEditarTalento(ctx(user('u8', 'responsavel')), marina), false);
check('membro nomeado numa área edita', podeEditarTalento(ctx(user('u2', 'membro')), marina), true);
check('membro da equipe mas não nomeado NÃO edita', podeEditarTalento(ctx(membroDaArea), marina), false);
check('ficha sem responsável trava todo membro', podeEditarTalento(ctx(membroDaArea), vazio), false);
check('visualização bloqueia até o dono', podeEditarTalento(ctx(dono, { visualizacao: true }), marina), false);
check('conta inativa não edita', podeEditarTalento(ctx(user('u8', 'responsavel', { situacao: 'inativo' })), marina), false);

console.log('\n--- Criar exige a porta da equipe ---');
check('membro da equipe cadastra', podeCriarRegistro(ctx(membroDaArea), 'talentos'), true);
// u7 só está na equipe de Contratos: sua única entrada em Talentos é a nomeação. Quem entra
// por essa porta vê a linha dele e nada além — abrir outra alargaria o próprio alcance.
check('nomeado de fora NÃO cadastra', podeCriarRegistro(ctx(membroDeOutroQuadro), 'talentos'), false);
check('mas ele enxerga o quadro', podeVerPagina(ctx(membroDeOutroQuadro), 'talentos', true), true);
check('e edita a ficha em que foi nomeado',
  podeEditarTalento(ctx(membroDeOutroQuadro), talento({ responsaveis: { conteudo: ['u7'] } })), true);
check('sem enxergar as outras fichas',
  podeEditarTalento(ctx(membroDeOutroQuadro), marina), false);


console.log('\n--- Filtros do quadro ---');
const paraFiltrar = [
  talento({ id: 'f1', nome: 'A', tipo: 'exclusivo' }),
  talento({ id: 'f2', nome: 'B', tipo: 'interveniencia' }),
  talento({ id: 'f3', nome: 'C', tipo: 'interveniencia', cadastroPendente: true }),
  talento({ id: 'f4', nome: 'D', tipo: 'exclusivo', cadastroPendente: true }),
];
const filtrar = (f) => paraFiltrar.filter((t) => matchesFiltroTalento(t, f)).map((t) => t.id);

check('todos devolve tudo', filtrar('todos'), ['f1', 'f2', 'f3', 'f4']);
check('exclusivo', filtrar('exclusivo'), ['f1', 'f4']);
check('interveniência', filtrar('interveniencia'), ['f2', 'f3']);
check('pendentes', filtrar('pendentes'), ['f3', 'f4']);

const c = contarTalentos(paraFiltrar);
check('contagem por tipo', [c.exclusivo, c.interveniencia], [2, 2]);
check('contagem de pendentes', c.pendentes, 2);
check('total confere', c.todos, 4);
// Pendente CRUZA com os tipos — são recortes, não fatias. Somar os quatro não dá o total.
check('os recortes se sobrepõem de propósito', c.exclusivo + c.interveniencia + c.pendentes !== c.todos, true);
check('sem pendentes, o contador zera', contarTalentos([talento()]).pendentes, 0);

console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`);
