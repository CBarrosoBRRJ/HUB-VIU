/**
 * O perfil `admin` não fura nenhuma das camadas de dado — 12/08/2026.
 *
 * ## Por que esta suíte existe separada
 *
 * O mesmo furo apareceu **quatro vezes** no mesmo arquivo, e três delas sobreviveram a uma
 * correção que ficou a uma linha de distância:
 *
 * | Onde | O que fazia |
 * |---|---|
 * | `nivelDeAcesso` | `admin` → `total` em qualquer quadro |
 * | `podeVerVisao` | `admin` → vê aba sensível sem liberação |
 * | `colunaOculta` | `admin` → nenhuma coluna oculta |
 * | `podeEditarRegistro` · `podeEditarTalento` · `podeEditarOportunidade` | `admin` → edita tudo |
 *
 * Em `nivelDeAcesso` e em `podeEditarRegistro` havia, **logo abaixo da linha do furo**, um
 * comentário explicando por que a mesma coisa era errada para o perfil `responsavel` — corrigido
 * numa rodada anterior. A lição tinha sido escrita e não tinha sido aplicada um nível acima.
 *
 * A operação encontrou o resto: configurou uma equipe, simulou a visualização e viu tudo aberto.
 *
 * ## O que se trava aqui
 *
 * Não é o comportamento de um usuário do seed — isso as outras suítes já fazem. É a **regra**:
 * para um admin sem equipe, toda camada de dado responde "não", e para o dono responde "sim".
 * Um atalho novo em qualquer uma delas quebra esta suíte na hora.
 */
import { nivelDeAcesso, podeEditarRegistro, registrosVisiveis, nomeadosDoContrato, ehDono } from './utils/permissoes.js';
import { podeVerVisao, colunaOculta } from './utils/visoes.js';

let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

const usuario = (id, perfil, extra = {}) => ({
  id, nome: id, email: `${id}@viu.com.br`, cargo: '', perfil, situacao: 'ativo', ...extra,
});

const dono = usuario('u0', 'admin', { ehDono: true });
const admin = usuario('u1', 'admin');

/*
  Uma equipe que **tem** o admin dentro e fecha tudo o que dá para fechar. É o cenário da operação:
  configurar e esperar que a configuração valha.
*/
const equipeFechada = {
  id: 'e1',
  nome: 'Equipe que fecha tudo',
  paginasPermitidas: [],
  membros: [{ usuarioId: 'u1', papel: 'responsavel' }],
  visoesLiberadas: [],
  visoesOcultas: ['backlog:demanda'],
  colunasOcultas: ['backlog:demanda:talento'],
};

const ctx = (u, equipes = [equipeFechada]) => ({ usuario: u, equipes, concessoes: [] });

console.log('--- Camada 1: o quadro ---');
check('equipe sem o quadro não o abre para o admin',
  nivelDeAcesso(ctx(admin), 'backlog'), 'nenhum');
check('e o dono continua passando', nivelDeAcesso(ctx(dono), 'backlog'), 'total');

console.log('\n--- Camada 2: as abas ---');
check('aba sensível sem liberação não abre para o admin',
  podeVerVisao(ctx(admin), 'backlog:financeiro'), false);
check('aba aberta que a equipe ocultou também não',
  podeVerVisao(ctx(admin), 'backlog:demanda'), false);
check('aba aberta que ninguém ocultou, sim',
  podeVerVisao(ctx(admin), 'backlog:escopo'), true);
check('para o dono, todas', [
  podeVerVisao(ctx(dono), 'backlog:financeiro', true),
  podeVerVisao(ctx(dono), 'backlog:demanda', true),
], [true, true]);

console.log('\n--- Camada 3: as colunas ---');
check('coluna oculta pela equipe fica oculta para o admin',
  colunaOculta(ctx(admin), 'backlog:demanda:talento'), true);
check('e visível para o dono',
  colunaOculta(ctx(dono), 'backlog:demanda:talento', true), false);

/*
  Escrita é a camada que mais importa: ler o que não se deveria ao menos aparece na tela; editar o
  que não se enxerga não deixa rastro nenhum para quem usa.
*/
console.log('\n--- Escrita segue a leitura ---');
const contrato = { id: 'c1', responsaveisIds: [], parceirosIds: [] };
check('admin sem o quadro não edita',
  podeEditarRegistro(ctx(admin), 'contratos', contrato), false);
check('o dono edita', podeEditarRegistro(ctx(dono), 'contratos', contrato), true);
check('e o filtro de linhas concorda com o nível',
  registrosVisiveis(ctx(admin), 'contratos', [contrato], nomeadosDoContrato).length, 0);

console.log('\n--- O dono é o único acima do modelo ---');
check('e é reconhecido pela flag, não pelo perfil',
  [ehDono(dono), ehDono(admin)], [true, false]);

console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
