/**
 * Modo "Ver como": a permissão responde pela pessoa observada — SEMPRE — 12/08/2026.
 *
 * ## A semântica virou
 *
 * Esta suíte nasceu afirmando o contrário: toda função de escrita respondia `false` durante a
 * visualização, e os casos daqui garantiam isso. O efeito colateral só apareceu quando a operação
 * usou o modo para o que ele serve — auditar acesso — e a tela escondeu dela os botões que a
 * pessoa simulada tem: *"algumas funções não aparecem, como criar novo projeto"*.
 *
 * **Uma auditoria que não mostra o que a pessoa vê não audita.** Foi olhando por esses olhos que a
 * própria operação encontrou o furo do admin, horas antes.
 *
 * A garantia de que nada é gravado não sumiu: **mudou de camada**. Mora nos setters de coleção do
 * `DadosProvider` — o único caminho até o dado — e é verificada pelo teste de UI `verComo.test`,
 * que clica de verdade. Aqui fica o outro lado do contrato: nenhuma função de permissão pode
 * voltar a mentir para a simulação.
 */
import {
  podeVerPagina, equipesVisiveis, podeGerenciarEquipe, podeCriarEquipe,
  podeExcluirEquipe, podeDefinirAcessoDaEquipe, podeCriarUsuario, podeDefinirPerfil,
  podeDefinirSituacao, podeExcluirUsuario, podeGerenciarConcessoes, podeGerenciarDominios,
  podeGerenciarEmailsDeAcesso, podeCriarRegistro, podeEditarRegistro, podeExcluirRegistro,
  podeConvidar, podeSolicitarAcesso, podeAcao,
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

const membro = user('u3', 'membro');
const responsavel = user('u4', 'responsavel');

const equipes = [{
  id: 'eq1', nome: 'Gestão de Contratos', paginasPermitidas: ['contratos'], criadaEm: '',
  membros: [
    { usuarioId: 'u3', papel: 'membro' },
    { usuarioId: 'u4', papel: 'responsavel' },
  ],
}];

const contrato = {
  id: 'CT-001', talento: 'T', contrato: 'Agenciamento', numero: '', inicio: '', fim: '', status: 'Criação',
  responsaveisIds: ['u3'], parceirosIds: [], criadoEm: '',
};

/** O mesmo contexto, com e sem o modo — a dupla que todo caso compara. */
const real = (u) => ({ usuario: u, equipes, concessoes: [] });
const vendo = (u) => ({ usuario: u, equipes, concessoes: [], visualizacao: true });

console.log('--- Leitura reflete a pessoa observada ---');
check('vê o quadro da equipe dela', podeVerPagina(vendo(membro), 'contratos'), true);
check('não vê o quadro que ela não tem', podeVerPagina(vendo(membro), 'backlog'), false);
check('equipes visíveis são as dela', equipesVisiveis(vendo(membro)).map((e) => e.id), ['eq1']);

/*
  O coração da suíte: para TODA função de permissão, `visualizacao: true` não muda a resposta.
  A lista cobre as mesmas dezesseis funções que o desenho antigo bloqueava, uma a uma — se alguém
  reintroduzir um `if (visualizacao) return false` em qualquer delas, o par diverge e o caso cai.
*/
console.log('\n--- Escrita: a simulação responde exatamente o que a pessoa real recebe ---');
const CASOS = [
  ['podeEditarRegistro', (c) => podeEditarRegistro(c, 'contratos', contrato)],
  ['podeCriarRegistro', (c) => podeCriarRegistro(c, 'contratos')],
  ['podeExcluirRegistro', (c) => podeExcluirRegistro(c, 'contratos', contrato)],
  ['podeGerenciarEquipe', (c) => podeGerenciarEquipe(c, equipes[0])],
  ['podeCriarEquipe', (c) => podeCriarEquipe(c)],
  ['podeExcluirEquipe', (c) => podeExcluirEquipe(c, equipes[0])],
  ['podeDefinirAcessoDaEquipe', (c) => podeDefinirAcessoDaEquipe(c)],
  ['podeCriarUsuario', (c) => podeCriarUsuario(c, equipes[0])],
  ['podeDefinirPerfil', (c) => podeDefinirPerfil(c, membro, 'responsavel')],
  ['podeDefinirSituacao', (c) => podeDefinirSituacao(c, membro, 'ferias', equipes[0])],
  ['podeExcluirUsuario', (c) => podeExcluirUsuario(c, membro)],
  ['podeGerenciarConcessoes', (c) => podeGerenciarConcessoes(c)],
  ['podeGerenciarDominios', (c) => podeGerenciarDominios(c)],
  ['podeGerenciarEmailsDeAcesso', (c) => podeGerenciarEmailsDeAcesso(c, membro)],
  ['podeConvidar', (c) => podeConvidar(c, equipes[0])],
  ['podeSolicitarAcesso', (c) => podeSolicitarAcesso(c)],
  ['podeAcao(gerenciar_usuarios)', (c) => podeAcao(c, 'gerenciar_usuarios')],
];

for (const alvo of [membro, responsavel]) {
  for (const [nome, fn] of CASOS) {
    check(`${alvo.id}: ${nome} igual com e sem visualização`, fn(vendo(alvo)), fn(real(alvo)));
  }
}

/*
  E o caso concreto do reporte: o responsável (que pode criar) continua podendo criar na
  simulação — é o botão "Novo projeto" que tinha sumido da tela.
*/
console.log('\n--- O caso do reporte ---');
check('responsável simulado ainda "pode criar" — o botão aparece',
  podeCriarRegistro(vendo(responsavel), 'contratos'), true);
check('membro simulado edita o que é dele — a célula abre',
  podeEditarRegistro(vendo(membro), 'contratos', contrato), true);

console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
