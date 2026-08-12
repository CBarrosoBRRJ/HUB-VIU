import {
  definirMembro, removerMembro, getPapelNaEquipe, getMembro, responsabilidadeVigente,
  contarPorPapel, usuariosDoQuadro,
} from './utils/equipes.js';
import {
  podeGerenciarEquipe, podeConvidar, podeConvidarComoResponsavel, podeCriarUsuario,
  podeDefinirSituacao, podeDefinirAcessoDaEquipe, podeEditarRegistro,
} from './utils/permissoes.js';
import { analisarSaidaDaEquipe, contarRegistros, acessoOrfao, mensagemSaida } from './utils/saida.js';

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

const AGORA = new Date(2026, 7, 1, 12, 0, 0);
const daquiUmaSemana = new Date(AGORA.getTime() + 7 * 86400000);
const ontem = new Date(AGORA.getTime() - 86400000);

const resp = user('u2', 'responsavel');
const membro = user('u3', 'membro');
const substituto = user('u4', 'membro');

const eq = (over) => ({
  id: 'eq1', nome: 'Gestão de Contratos', paginasPermitidas: ['contratos'], criadaEm: '',
  membros: [{ usuarioId: 'u2', papel: 'responsavel' }, { usuarioId: 'u3', papel: 'membro' }],
  ...over,
});

const equipes = [eq()];
const ctx = (u, lista = equipes) => ({ usuario: u, equipes: lista, concessoes: [] });

console.log('--- Responsável temporário ---');
const comTemp = definirMembro(eq(), 'u4', 'responsavel', daquiUmaSemana.toISOString());
check('entra como responsável com prazo', getPapelNaEquipe(comTemp, 'u4', AGORA), 'responsavel');
check('prazo fica registrado', Boolean(getMembro(comTemp, 'u4')?.responsavelAte), true);
check('vigente antes do prazo', responsabilidadeVigente(getMembro(comTemp, 'u4'), AGORA), true);

const depoisDoPrazo = new Date(daquiUmaSemana.getTime() + 86400000);
check('volta a membro sozinho após o prazo', getPapelNaEquipe(comTemp, 'u4', depoisDoPrazo), 'membro');
check('contagem não infla com prazo vencido', contarPorPapel(comTemp, depoisDoPrazo), { responsaveis: 1, membros: 2 });
check('contagem durante o prazo', contarPorPapel(comTemp, AGORA), { responsaveis: 2, membros: 1 });

const jaVencido = definirMembro(eq(), 'u4', 'responsavel', ontem.toISOString());
check('promoção já vencida não vale', getPapelNaEquipe(jaVencido, 'u4', AGORA), 'membro');

check('voltar a membro limpa o prazo', getMembro(definirMembro(comTemp, 'u4', 'membro'), 'u4')?.responsavelAte, undefined);
check('responsável permanente não tem prazo', getMembro(definirMembro(eq(), 'u4', 'responsavel'), 'u4')?.responsavelAte, undefined);

// O substituto passa a administrar a equipe durante a janela — e deixa de administrar depois.
const equipesComTemp = [comTemp];
// `AGORA` explícito: a janela é de sete dias a partir dele, e sem passar a referência a resposta
// dependia do dia em que a suíte rodasse — foi assim que este teste começou a falhar sozinho.
check('substituto administra durante o prazo',
  podeGerenciarEquipe({ usuario: user('u4', 'responsavel'), equipes: equipesComTemp }, comTemp, AGORA), true);
check('e deixa de administrar depois do prazo',
  podeGerenciarEquipe({ usuario: user('u4', 'responsavel'), equipes: equipesComTemp }, comTemp, depoisDoPrazo), false);

console.log('\n--- Poderes do responsável ---');
check('responsável convida', podeConvidar(ctx(resp), equipes[0]), true);
check('responsável NÃO nomeia outro responsável por convite', podeConvidarComoResponsavel(ctx(resp)), false);
check('responsável cadastra pessoa na equipe dele', podeCriarUsuario(ctx(resp), equipes[0]), true);
check('responsável coloca em férias', podeDefinirSituacao(ctx(resp), membro, 'ferias', equipes[0]), true);
check('responsável inativa', podeDefinirSituacao(ctx(resp), membro, 'inativo', equipes[0]), true);
check('responsável NÃO desliga', podeDefinirSituacao(ctx(resp), membro, 'desligado', equipes[0]), false);
check('responsável NÃO concede quadros', podeDefinirAcessoDaEquipe(ctx(resp)), false);

console.log('\n--- Membro não tem poder algum ---');
check('membro não administra a equipe', podeGerenciarEquipe(ctx(membro), equipes[0]), false);
check('membro não convida', podeConvidar(ctx(membro), equipes[0]), false);
check('membro não cadastra', podeCriarUsuario(ctx(membro), equipes[0]), false);
check('membro não mexe em situação', podeDefinirSituacao(ctx(membro), substituto, 'ferias', equipes[0]), false);
check('membro não concede quadros', podeDefinirAcessoDaEquipe(ctx(membro)), false);

console.log('\n--- Saída preserva histórico ---');
const contratos = [
  { id: 'CT-001', talento: 'A', contrato: 'Agenciamento', numero: '', inicio: '', fim: '', status: 'Criação',
    responsaveisIds: ['u3'], parceirosIds: [], criadoEm: '' },
  { id: 'CT-002', talento: 'B', contrato: 'Campanha', numero: '', inicio: '', fim: '', status: 'Criação',
    responsaveisIds: ['u2'], parceirosIds: ['u3'], criadoEm: '' },
];
check('conta registros em que está nomeada', contarRegistros('u3', contratos), 2);

const analise = analisarSaidaDaEquipe('u3', 'eq1', equipes, contratos);
check('avisa sobre o histórico', analise.registrosNomeados, 2);
check('detecta que fica sem equipe', analise.ficaSemEquipe, true);

const semEquipe = removerMembro(equipes[0], 'u3');
check('saiu da equipe', getPapelNaEquipe(semEquipe, 'u3'), null);
check('mas segue nomeado nos contratos', contarRegistros('u3', contratos), 2);
check('deixa de ser candidato do quadro', usuariosDoQuadro([semEquipe], 'contratos').includes('u3'), false);
/*
  **A porta da nomeação fechou em 12/08/2026**, por decisão da operação: *"mesmo que a equipe só
  veja Backlog, ela está conseguindo ver a página de Talentos"*. Uma tela de configuração que
  promete controlar o acesso e é contornada por um caminho lateral não configura nada.

  O custo, aceito com a decisão: nomear alguém num registro de quadro que a equipe dela não libera
  passa a não dar acesso nenhum. O caminho é liberar o quadro para a equipe.
*/
check('sair da equipe corta o acesso, mesmo seguindo nomeada',
  podeEditarRegistro(ctx(membro, [semEquipe]), 'contratos', contratos[0]), false);
const alheio = { ...contratos[0], id: 'CT-003', responsaveisIds: ['u2'], parceirosIds: [] };

// O aviso de saída precisa dizer a consequência de **acesso**, não só a de histórico: quem lê
// "sem acesso a quadro algum" e continua nomeado foi informado errado.
const avisoComHistorico = mensagemSaida('Camila', 'Gestão de Contratos', analise);
check('aviso conta os registros', avisoComHistorico.includes('2 registros'), true);
check('aviso diz que ela segue enxergando', avisoComHistorico.includes('seguirá enxergando'), true);
check('aviso ensina como cortar de fato', avisoComHistorico.includes('inative ou desligue'), true);

const avisoLimpo = mensagemSaida('Fulano', 'X', { registrosNomeados: 0, ficaSemEquipe: true, equipesRestantes: [] });
check('sem histórico, o aviso volta a ser absoluto', avisoLimpo.includes('sem acesso a quadro algum'), true);
check('e não promete acesso que não existe', avisoLimpo.includes('seguirá enxergando'), false);
check('mas perde o resto do quadro', podeEditarRegistro(ctx(membro, [semEquipe]), 'contratos', alheio), false);

const emDuas = [eq(), { ...eq({ id: 'eq2', nome: 'Orçamentos' }), membros: [{ usuarioId: 'u3', papel: 'membro' }] }];
check('quem está em duas equipes não fica órfão',
  analisarSaidaDaEquipe('u3', 'eq1', emDuas, contratos).ficaSemEquipe, false);
check('e as restantes são listadas',
  analisarSaidaDaEquipe('u3', 'eq1', emDuas, contratos).equipesRestantes, ['Orçamentos']);

console.log('\n--- Acesso órfão ---');
check('ativo sem equipe é órfão', acessoOrfao('u9', 'ativo', equipes), true);
check('quem está em equipe não é órfão', acessoOrfao('u3', 'ativo', equipes), false);
check('desligado não conta como órfão', acessoOrfao('u9', 'desligado', equipes), false);
check('férias sem equipe ainda é órfão', acessoOrfao('u9', 'ferias', equipes), true);

console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
