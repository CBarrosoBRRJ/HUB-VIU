import {
  criarLinkEquipe, statusLink, validarEntrada, linkVigenteDaEquipe, horasRestantesLink,
  mensagemDeCompartilhamento, linkDeEntrada, VALIDADE_HORAS_LINK,
} from './utils/linkEquipe.js';
import { validarEmail } from './utils/identidade.js';
import { definirMembro, getPapelNaEquipe } from './utils/equipes.js';
import { podeGerenciarEquipe } from './utils/permissoes.js';

// `window` não existe no Node: os helpers de URL recebem a origem por parâmetro.
globalThis.window = { location: { origin: 'https://app.viu' } };

let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

const AGORA = new Date(2026, 7, 1, 10, 0, 0);
const em23h = new Date(AGORA.getTime() + 23 * 3_600_000);
const em25h = new Date(AGORA.getTime() + 25 * 3_600_000);

const equipe = {
  id: 'eq1', nome: 'Gestão de Contratos', paginasPermitidas: ['contratos'], criadaEm: '', membros: [],
};
const DOMINIOS = ['g.globo', 'viu.com.br'];

console.log('--- Ciclo de vida do link ---');
const link = criarLinkEquipe({ id: 'lk1', equipeId: 'eq1', criadoPorId: 'u2' }, AGORA);
check('nasce ativo', statusLink(link, AGORA), 'ativo');
check('token não trivial', link.token.length >= 32, true);
check('validade de 24h', horasRestantesLink(link, AGORA), VALIDADE_HORAS_LINK);
check('sem usos no início', link.usos.length, 0);

check('ainda vale em 23h', statusLink(link, em23h), 'ativo');
check('expira em 25h', statusLink(link, em25h), 'expirado');
check('entrada bloqueada após expirar', validarEntrada(link, equipe, em25h), 'expirado');
check('entrada válida no prazo', validarEntrada(link, equipe, AGORA), null);

const desativado = { ...link, desativadoEm: AGORA.toISOString() };
check('desativado não deixa entrar', validarEntrada(desativado, equipe, AGORA), 'desativado');
check('desativado vence expirado na precedência', statusLink({ ...desativado, expiraEm: AGORA.toISOString() }, em25h), 'desativado');
check('link inexistente', validarEntrada(undefined, equipe, AGORA), 'inexistente');
check('equipe apagada invalida o link', validarEntrada(link, undefined, AGORA), 'equipe_inexistente');

console.log('\n--- Rotação: um vigente por equipe ---');
const antigo = criarLinkEquipe({ id: 'lk0', equipeId: 'eq1', criadoPorId: 'u2' }, AGORA);
const renovado = criarLinkEquipe({ id: 'lk2', equipeId: 'eq1', criadoPorId: 'u2' }, AGORA);
check('tokens diferentes a cada renovação', antigo.token !== renovado.token, true);

// O provider desativa o anterior ao renovar — aqui simulamos esse estado.
const apos = [renovado, { ...antigo, desativadoEm: AGORA.toISOString() }];
check('só um vigente por equipe', linkVigenteDaEquipe(apos, 'eq1', AGORA)?.id, 'lk2');
check('o antigo deixa de funcionar', validarEntrada(apos[1], equipe, AGORA), 'desativado');
check('equipe sem link não devolve nada', linkVigenteDaEquipe(apos, 'eq9', AGORA), undefined);
check('expirado não conta como vigente', linkVigenteDaEquipe([link], 'eq1', em25h), undefined);

console.log('\n--- Domínio continua sendo a barreira ---');
const usuarios = [{
  id: 'u1', nome: 'Ana', email: 'ana@viu.com.br', cargo: '', telefone: '', local: '',
  nascimento: '', perfil: 'membro', situacao: 'ativo',
}];
check('e-mail de fora barrado', validarEmail('alguem@gmail.com', { usuarios, dominios: DOMINIOS }), 'dominio');
check('e-mail corporativo passa', validarEmail('novo@g.globo', { usuarios, dominios: DOMINIOS }), null);
check('e-mail já cadastrado é detectado', validarEmail('ana@viu.com.br', { usuarios, dominios: DOMINIOS }), 'duplicado');

console.log('\n--- Entrada sempre como membro ---');
const comNovato = definirMembro(equipe, 'u9', 'membro');
check('entra como membro', getPapelNaEquipe(comNovato, 'u9', AGORA), 'membro');
check('link não concede responsabilidade', comNovato.membros.find((m) => m.usuarioId === 'u9')?.papel, 'membro');

console.log('\n--- Compartilhamento ---');
check('endereço no formato de rota', linkDeEntrada(link, 'https://app.viu'), `https://app.viu/#/entrar/${link.token}`);
const mensagem = mensagemDeCompartilhamento(equipe, link, DOMINIOS);
check('mensagem cita a equipe', mensagem.includes('Gestão de Contratos'), true);
check('mensagem lista os domínios', mensagem.includes('@g.globo') && mensagem.includes('@viu.com.br'), true);
check('mensagem avisa o prazo', mensagem.includes(`${VALIDADE_HORAS_LINK} horas`), true);
check('mensagem carrega o link', mensagem.includes(link.token), true);

console.log('\n--- Aleatoriedade do token ---');
const amostra = new Set(
  Array.from({ length: 200 }, (_, i) =>
    criarLinkEquipe({ id: `x${i}`, equipeId: 'eq1', criadoPorId: 'u2' }, AGORA).token),
);
check('200 emissões, 200 tokens distintos', amostra.size, 200);
check('token com 32 hex (128 bits)', /^[0-9a-f]{32}$/.test(link.token), true);
check('token não deriva do id da equipe', link.token.includes('eq1'), false);

console.log('\n--- Quem enxerga o link ---');
const eqComTime = {
  ...equipe,
  membros: [{ usuarioId: 'u2', papel: 'responsavel' }, { usuarioId: 'u3', papel: 'membro' }],
};
const pessoa = (id, perfil, over = {}) => ({
  id, perfil, situacao: 'ativo', nome: id, email: `${id}@viu.com.br`,
  cargo: '', telefone: '', local: '', nascimento: '', ...over,
});
const ctxLink = (u) => ({ usuario: u, equipes: [eqComTime], concessoes: [] });

// O bloco do link é renderizado sob `podeGerenciarEquipe`.
check('dono vê', podeGerenciarEquipe(ctxLink(pessoa('u0', 'admin', { ehDono: true })), eqComTime), true);
check('admin convidado vê', podeGerenciarEquipe(ctxLink(pessoa('u1', 'admin')), eqComTime), true);
check('responsável da equipe vê', podeGerenciarEquipe(ctxLink(pessoa('u2', 'responsavel')), eqComTime), true);
check('membro NÃO vê', podeGerenciarEquipe(ctxLink(pessoa('u3', 'membro')), eqComTime), false);
check('responsável de outra equipe NÃO vê', podeGerenciarEquipe(ctxLink(pessoa('u8', 'responsavel')), eqComTime), false);
check('em "Ver como" ninguém vê', podeGerenciarEquipe({ ...ctxLink(pessoa('u2', 'responsavel')), visualizacao: true }, eqComTime), false);

console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
