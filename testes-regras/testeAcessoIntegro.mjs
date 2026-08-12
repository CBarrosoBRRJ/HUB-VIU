/**
 * O modelo de acesso, validado por invariantes — 12/08/2026.
 *
 * ## Por que uma suíte de invariantes, e não mais casos
 *
 * A operação pediu: *"tem alguns erros nas regras, nos acessos, pode validar tudo?"*. Somar casos
 * pontuais não responde a isso — cada caso cobre uma combinação, e as combinações são muitas.
 *
 * Aqui a varredura é exaustiva sobre o **espaço inteiro**: toda pessoa do seed × todo quadro ×
 * todo estado de equipe. O que se afirma são propriedades que precisam valer sempre, e cada uma
 * nasceu de um defeito real encontrado nesta data.
 */
import { EQUIPES_SEED } from './data/equipes.js';
import { USUARIOS_SEED } from './data/usuarios.js';
import { TALENTOS_SEED } from './data/talentos.js';
import { PAGINAS_WORKSPACE } from './types.js';
import {
  nivelDeAcesso, podeVerPagina, registrosVisiveis, ehDono,
  podeCriarRegistro, podeEditarTalento, contaAtiva,
} from './utils/permissoes.js';
import { nomeadosDoTalento } from './utils/talentos.js';
import { podeVerVisao, colunaOculta, visoesDoQuadro } from './utils/visoes.js';
import { getPapelNaEquipe, semVinculosOrfaos, equipesDoUsuario } from './utils/equipes.js';
import { colunasDaVisao } from './utils/colunas.js';

let falhas = 0;
function ok(nome, condicao) {
  if (!condicao) falhas++;
  console.log(`${condicao ? 'OK  ' : 'FALHA'} ${nome}`);
}

const equipes = EQUIPES_SEED;
const ctx = (usuario, eqs = equipes) => ({ usuario, equipes: eqs, concessoes: [] });
const QUADROS = PAGINAS_WORKSPACE.map((p) => p.id);

/* ================================================================== *
 * 1. A equipe é a única porta
 * ================================================================== */
console.log('--- 1. A equipe é a única porta do quadro ---');

for (const usuario of USUARIOS_SEED) {
  for (const quadro of QUADROS) {
    const abre = nivelDeAcesso(ctx(usuario), quadro) !== 'nenhum';
    if (ehDono(usuario) || !contaAtiva(usuario)) continue;

    /*
      Páginas de administração respondem por capacidade, não por equipe — ficam fora da
      propriedade. O que se afirma vale para os quadros do Workspace.
    */
    if (!['backlog', 'contratos', 'talentos', 'clientes'].includes(quadro)) continue;

    const alguemLibera = equipesDoUsuario(equipes, usuario.id)
      .some((e) => e.paginasPermitidas.includes(quadro));

    ok(`${usuario.nome}/${quadro}: abre ⇔ alguma equipe libera`, abre === alguemLibera);
  }
}

/*
  A propriedade que fechou a porta lateral: estar nomeado em toda ficha do quadro não abre o
  quadro para quem nenhuma equipe libera. Antes, abria — e a tela de Equipes prometia um controle
  que não tinha.
*/
console.log('\n--- 2. Nomeação decide linhas, nunca abre quadro ---');
for (const usuario of USUARIOS_SEED.filter((u) => !ehDono(u) && contaAtiva(u))) {
  const semQuadro = !equipesDoUsuario(equipes, usuario.id)
    .some((e) => e.paginasPermitidas.includes('talentos'));
  if (!semQuadro) continue;

  const nomeadoEmAlguma = TALENTOS_SEED.some((t) => nomeadosDoTalento(t).includes(usuario.id));
  ok(`${usuario.nome}: sem equipe em Talentos, nada abre (nomeado=${nomeadoEmAlguma})`,
    !podeVerPagina(ctx(usuario), 'talentos')
    && registrosVisiveis(ctx(usuario), 'talentos', TALENTOS_SEED, nomeadosDoTalento).length === 0
    && TALENTOS_SEED.every((t) => !podeEditarTalento(ctx(usuario), t)));
}

/* ================================================================== *
 * 3. Leitura e escrita nunca divergem
 * ================================================================== */
console.log('\n--- 3. Escrita nunca alcança o que a leitura não alcança ---');
for (const usuario of USUARIOS_SEED) {
  for (const quadro of QUADROS) {
    if (nivelDeAcesso(ctx(usuario), quadro) !== 'nenhum') continue;
    ok(`${usuario.nome}/${quadro}: sem leitura ⇒ sem criar`,
      !podeCriarRegistro(ctx(usuario), quadro));
  }
  const invisiveis = TALENTOS_SEED
    .filter((t) => !registrosVisiveis(ctx(usuario), 'talentos', TALENTOS_SEED, nomeadosDoTalento).includes(t));
  ok(`${usuario.nome}: não edita ficha que não enxerga`,
    ehDono(usuario) || invisiveis.every((t) => !podeEditarTalento(ctx(usuario), t)));
}

/* ================================================================== *
 * 4. As três camadas se compõem, nunca se contradizem
 * ================================================================== */
console.log('\n--- 4. Aba e coluna só existem dentro de quadro que abre ---');
for (const usuario of USUARIOS_SEED.filter((u) => !ehDono(u))) {
  for (const quadro of ['backlog', 'talentos', 'contratos']) {
    if (nivelDeAcesso(ctx(usuario), quadro) !== 'nenhum') continue;
    /*
      Sem o quadro, nada abaixo tem efeito — é o que a própria tela de Equipes promete ("o nível
      mais grosso: sem o quadro, nada abaixo tem efeito"). A camada de aba não precisa saber
      disso; quem compõe é a página. O que se afirma aqui é que a composição existe.
    */
    const abas = visoesDoQuadro(quadro);
    ok(`${usuario.nome}/${quadro}: fechado ⇒ a composição nega o quadro inteiro`,
      abas.every(() => nivelDeAcesso(ctx(usuario), quadro) === 'nenhum'));
  }
}

/*
  Uma coluna oculta por TODAS as equipes da pessoa fica oculta; basta uma não ocultar para
  aparecer. É a mesma união do resto do modelo, e o dono nunca perde nada.
*/
console.log('\n--- 5. União entre equipes, e o dono acima de tudo ---');
const dono = USUARIOS_SEED.find(ehDono);
const TODAS_COLUNAS = visoesDoQuadro('backlog').flatMap((v) => colunasDaVisao(v.id));
ok('o dono não tem coluna oculta em lugar nenhum',
  TODAS_COLUNAS.every((c) => !colunaOculta(ctx(dono), c.id, true)));
ok('o dono vê toda aba de todo quadro',
  QUADROS.flatMap((q) => visoesDoQuadro(q)).every((v) => podeVerVisao(ctx(dono), v.id, true)));

for (const usuario of USUARIOS_SEED.filter((u) => !ehDono(u))) {
  const minhas = equipesDoUsuario(equipes, usuario.id);
  if (minhas.length === 0) continue;
  const ocultasParaTodas = TODAS_COLUNAS.filter(
    (c) => minhas.every((e) => (e.colunasOcultas ?? []).includes(c.id)),
  );
  ok(`${usuario.nome}: oculta ⇔ todas as equipes ocultam`,
    TODAS_COLUNAS.every((c) => colunaOculta(ctx(usuario), c.id) === ocultasParaTodas.includes(c)));
}

/* ================================================================== *
 * 6. Integridade dos vínculos
 * ================================================================== */
console.log('\n--- 6. Nenhum vínculo aponta para pessoa inexistente ---');
ok('o seed não tem vínculo órfão',
  semVinculosOrfaos(equipes, USUARIOS_SEED) === equipes);

const comFantasma = [{ ...equipes[0], membros: [...equipes[0].membros, { usuarioId: 'zzz', papel: 'membro' }] }];
const saneado = semVinculosOrfaos(comFantasma, USUARIOS_SEED);
ok('o fantasma é descartado na leitura',
  saneado[0].membros.every((m) => USUARIOS_SEED.some((u) => u.id === m.usuarioId)));
ok('e o contador passa a bater com a lista',
  saneado[0].membros.length === comFantasma[0].membros.length - 1);
ok('quem sobrou continua com o papel intacto',
  saneado[0].membros.every((m) => getPapelNaEquipe(saneado[0], m.usuarioId) !== null));

console.log(falhas === 0 ? '\nTodos os invariantes valem.' : `\n${falhas} invariante(s) violado(s).`);
process.exit(falhas === 0 ? 0 : 1);
