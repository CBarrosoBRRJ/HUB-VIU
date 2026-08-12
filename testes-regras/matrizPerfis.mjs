/**
 * Matriz de perfis — o que CADA pessoa do seed enxerga em CADA página, aba e coluna.
 *
 * As outras suítes testam regras isoladas com fixtures montadas. Esta percorre o **estado real
 * da aplicação** e imprime a matriz inteira, para conferir de olho antes de mostrar as telas.
 *
 * Falha quando uma invariante do modelo é violada — não quando um número muda.
 */
import { USUARIOS_SEED } from './data/usuarios.js';
import { EQUIPES_SEED } from './data/equipes.js';
import { TALENTOS_SEED } from './data/talentos.js';
import { PAGINAS_WORKSPACE } from './types.js';
import {
  nivelDeAcesso, registrosVisiveis, podeEditarTalento, podeEditarRegistro, podeExcluirRegistro,
  podeCriarRegistro, nomeadosDoContrato, podeVerPagina, ehDono, contaAtiva, podeAcao,
  equipesVisiveis, podeGerenciarEquipe, podeDefinirAcessoDaEquipe,
} from './utils/permissoes.js';
import { nomeadosDoTalento, contarTalentos } from './utils/talentos.js';
import { getPapelNaEquipe } from './utils/equipes.js';
import { VISOES, podeVerVisao, visoesDoQuadro, colunaOculta } from './utils/visoes.js';
import { colunasDaVisao, TODAS_AS_COLUNAS } from './utils/colunas.js';
import { filtrarTalentos } from './utils/busca.js';

let falhas = 0;
function ok(nome, condicao) {
  if (condicao) return;
  falhas += 1;
  console.log(`   ✗ FALHOU: ${nome}`);
}

const equipes = EQUIPES_SEED;
const talentos = TALENTOS_SEED;

/** Contratos de exemplo — o seed sobe vazio, mas a matriz precisa de linhas para medir. */
const contratos = [
  {
    id: 'CT-001', talento: 'Marina Duarte', talentoId: 'tal-exemplo-1',
    contrato: 'Contrato de agenciamento', numero: 'CTR-2026-001',
    inicio: '2026-01-01', fim: '2026-12-31', status: 'Em Assinatura',
    responsaveisIds: ['u3'], parceirosIds: ['u4'], criadoEm: '2026-07-01T10:00:00.000Z',
  },
  {
    id: 'CT-002', talento: 'Helena Prado', talentoId: 'tal-exemplo-3',
    contrato: 'Campanha de verão', numero: 'CTR-2026-002',
    inicio: '2026-06-01', fim: '2026-08-20', status: 'Concluído',
    responsaveisIds: ['u2'], parceirosIds: [], criadoEm: '2026-07-10T10:00:00.000Z',
  },
  {
    id: 'CT-003', talento: 'Rafael Nogueira', talentoId: 'tal-exemplo-2',
    contrato: 'Campanha Coca-Cola', numero: 'CTR-2026-003',
    inicio: '2026-03-01', fim: '2026-05-30', status: 'Parado',
    responsaveisIds: ['u5'], parceirosIds: [], criadoEm: '2026-07-15T10:00:00.000Z',
  },
];

const ctx = (usuario, over = {}) => ({ usuario, equipes, concessoes: [], ...over });

function nomeadoEm(usuario, pagina) {
  if (pagina === 'contratos') return contratos.some((c) => nomeadosDoContrato(c).includes(usuario.id));
  if (pagina === 'talentos') return talentos.some((t) => nomeadosDoTalento(t).includes(usuario.id));
  return false;
}

function linhasVisiveis(usuario, pagina) {
  if (pagina === 'contratos') {
    return registrosVisiveis(ctx(usuario), 'contratos', contratos, nomeadosDoContrato).length;
  }
  if (pagina === 'talentos') {
    return registrosVisiveis(ctx(usuario), 'talentos', talentos, nomeadosDoTalento).length;
  }
  return 0;
}

const SIGLA = { total: 'TODAS', nomeado: 'SÓ AS DELE', nenhum: '—' };

/* ================================================================== *
 * 1. Matriz de quadros
 * ================================================================== */
console.log('\n╔══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║ 1. QUADROS — o que cada pessoa enxerga                                            ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════╝\n');
console.log('PESSOA                    PERFIL        BACKLOG      CONTRATOS         TALENTOS');
console.log('─'.repeat(84));

for (const usuario of USUARIOS_SEED) {
  const rotulo = ehDono(usuario) ? 'DONO' : usuario.perfil.toUpperCase();
  const celulas = PAGINAS_WORKSPACE.map((pagina) => {
    const nivel = nivelDeAcesso(ctx(usuario), pagina.id, nomeadoEm(usuario, pagina.id));
    const linhas = nivel === 'nenhum' ? '' : ` (${linhasVisiveis(usuario, pagina.id)})`;
    return `${SIGLA[nivel]}${linhas}`.padEnd(17);
  });
  console.log(`${usuario.nome.padEnd(25)} ${rotulo.padEnd(13)} ${celulas.join('')}`);
}

console.log('\n--- Invariantes ---');
for (const usuario of USUARIOS_SEED) {
  for (const pagina of PAGINAS_WORKSPACE) {
    const nomeado = nomeadoEm(usuario, pagina.id);
    const nivel = nivelDeAcesso(ctx(usuario), pagina.id, nomeado);

    // Coerência entre a função de nível e a de "pode ver".
    ok(`${usuario.nome}/${pagina.id}: nível e podeVerPagina concordam`,
      (nivel !== 'nenhum') === podeVerPagina(ctx(usuario), pagina.id, nomeado));

    // Quem não vê o quadro não vê linha alguma.
    if (nivel === 'nenhum') {
      ok(`${usuario.nome}/${pagina.id}: sem acesso, zero linhas`, linhasVisiveis(usuario, pagina.id) === 0);
      ok(`${usuario.nome}/${pagina.id}: sem acesso, não cria`, !podeCriarRegistro(ctx(usuario), pagina.id));
    }

    // Nível "nomeado" nunca mostra mais do que "total" mostraria.
    if (nivel === 'nomeado' && pagina.id !== 'backlog') {
      const meu = linhasVisiveis(usuario, pagina.id);
      const todos = pagina.id === 'contratos' ? contratos.length : talentos.length;
      ok(`${usuario.nome}/${pagina.id}: nomeado vê ≤ total`, meu <= todos);
    }
  }

  /*
    **Só o dono nunca fica de fora.** Até 12/08/2026 o admin entrava aqui junto, e era o furo que a
    operação encontrou: equipe configurada, acesso simulado, e o admin via tudo assim mesmo.
  */
  if (ehDono(usuario)) {
    ok(`${usuario.nome}: o dono vê tudo em todo quadro`,
      PAGINAS_WORKSPACE.every((p) => nivelDeAcesso(ctx(usuario), p.id) === 'total'));
  }
}

/* ================================================================== *
 * 2. Matriz de abas
 * ================================================================== */
console.log('\n╔══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║ 2. ABAS DE TALENTOS — 🔒 = restrita                                               ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════╝\n');

const abas = visoesDoQuadro('talentos');
console.log(
  'PESSOA'.padEnd(25) + abas.map((a) => (a.restrita ? `${a.label}🔒` : a.label).padEnd(16)).join(''),
);
console.log('─'.repeat(25 + abas.length * 16));

for (const usuario of USUARIOS_SEED) {
  const celulas = abas.map((aba) => {
    const ve = podeVerVisao(ctx(usuario), aba.id, ehDono(usuario));
    return (ve ? '✓' : '·').padEnd(16);
  });
  console.log(usuario.nome.padEnd(25) + celulas.join(''));
}

console.log('\n--- Invariantes ---');
for (const usuario of USUARIOS_SEED) {
  const abertas = abas.filter((a) => !a.restrita);
  ok(`${usuario.nome}: abas abertas nunca são negadas`,
    abertas.every((a) => podeVerVisao(ctx(usuario), a.id, ehDono(usuario))));

  if (ehDono(usuario)) {
    ok(`${usuario.nome}: o dono vê as 6 abas`,
      abas.every((a) => podeVerVisao(ctx(usuario), a.id, ehDono(usuario))));
  }

  /*
    O contrapositivo, que é a garantia que a operação pediu: **aba sensível não abre sem liberação
    da equipe**, seja qual for o perfil. Sem isto, a correção poderia ser desfeita por um atalho
    novo em qualquer camada, e o teste continuaria verde.
  */
  if (!ehDono(usuario)) {
    const semLiberacao = abas.filter(
      (a) => a.restrita && !equipes.filter((e) => getPapelNaEquipe(e, usuario.id) !== null)
        .some((e) => (e.visoesLiberadas ?? []).includes(a.id)),
    );
    ok(`${usuario.nome}: aba sensível sem liberação não abre`,
      semLiberacao.every((a) => !podeVerVisao(ctx(usuario), a.id, false)));
  }
}

/* ================================================================== *
 * 3. Colunas ocultas
 * ================================================================== */
console.log('\n╔══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║ 3. COLUNAS OCULTAS por pessoa                                                     ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════╝\n');

for (const usuario of USUARIOS_SEED) {
  const ocultas = TODAS_AS_COLUNAS.filter((c) => colunaOculta(ctx(usuario), c.id, ehDono(usuario)));
  console.log(`${usuario.nome.padEnd(25)} ${ocultas.length === 0 ? 'nenhuma' : ocultas.map((c) => c.label).join(', ')}`);
}

console.log('\n--- Invariantes ---');
for (const usuario of USUARIOS_SEED) {
  const ocultas = TODAS_AS_COLUNAS.filter((c) => colunaOculta(ctx(usuario), c.id, ehDono(usuario)));
  // Coluna fixa nunca pode sumir: a linha ficaria anônima.
  ok(`${usuario.nome}: nenhuma coluna fixa foi ocultada`, ocultas.every((c) => !c.fixa));
  if (ehDono(usuario) || usuario.perfil === 'admin') {
    ok(`${usuario.nome}: dono/admin não tem coluna oculta`, ocultas.length === 0);
  }
}

/* ================================================================== *
 * 4. A busca não vaza coluna oculta
 * ================================================================== */
console.log('\n╔══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║ 4. BUSCA — o dado oculto não pode ser confirmado por ela                           ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════╝\n');

/** Termos que só existem em colunas sensíveis do seed. */
const SEGREDOS = [
  { termo: '98800-1122', coluna: 'talentos:contato:telefone', oque: 'telefone da Marina' },
  { termo: '12.345.678', coluna: 'talentos:financeiro:cnpj', oque: 'CNPJ da Marina' },
  { termo: '45.000', coluna: 'talentos:financeiro:faturamento', oque: 'faturamento da Marina' },
  { termo: 'Itaú', coluna: 'talentos:financeiro:dadosBancarios', oque: 'banco da Marina' },
];

for (const usuario of USUARIOS_SEED) {
  const colunasVisiveis = abas
    .filter((a) => podeVerVisao(ctx(usuario), a.id, ehDono(usuario)))
    .flatMap((a) => colunasDaVisao(a.id))
    .filter((c) => !colunaOculta(ctx(usuario), c.id, ehDono(usuario)))
    .map((c) => c.id);

  const permitidos = registrosVisiveis(ctx(usuario), 'talentos', talentos, nomeadosDoTalento);
  const achados = [];

  for (const segredo of SEGREDOS) {
    const resultado = filtrarTalentos(permitidos, segredo.termo, USUARIOS_SEED, colunasVisiveis);
    const enxerga = colunasVisiveis.includes(segredo.coluna);

    // A regra: só acha quem enxerga a coluna.
    ok(`${usuario.nome}: ${segredo.oque} — busca coerente com a coluna`,
      resultado.length === 0 || enxerga);

    if (resultado.length > 0) achados.push(segredo.oque);
  }

  console.log(`${usuario.nome.padEnd(25)} acha: ${achados.length ? achados.join(', ') : 'nada sensível'}`);
}

/* ================================================================== *
 * 5. Edição e exclusão, linha a linha
 * ================================================================== */
console.log('\n╔══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║ 5. CONTRATOS — quem edita e quem exclui cada linha                                 ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════╝\n');
console.log('PESSOA'.padEnd(25) + contratos.map((c) => c.id.padEnd(19)).join(''));
console.log('─'.repeat(25 + contratos.length * 19));

for (const usuario of USUARIOS_SEED) {
  const celulas = contratos.map((contrato) => {
    const edita = podeEditarRegistro(ctx(usuario), 'contratos', contrato);
    const exclui = podeExcluirRegistro(ctx(usuario), 'contratos', contrato);
    return `${edita ? 'edita' : '—'}${exclui ? ' + exclui' : ''}`.padEnd(19);
  });
  console.log(usuario.nome.padEnd(25) + celulas.join(''));
}

console.log('\n--- Invariantes ---');
for (const usuario of USUARIOS_SEED) {
  for (const contrato of contratos) {
    // Excluir é mais restrito que editar, sempre.
    ok(`${usuario.nome}/${contrato.id}: exclui ⇒ edita`,
      !podeExcluirRegistro(ctx(usuario), 'contratos', contrato) ||
      podeEditarRegistro(ctx(usuario), 'contratos', contrato));

    // Membro nunca exclui.
    if (usuario.perfil === 'membro') {
      ok(`${usuario.nome}/${contrato.id}: membro não exclui`,
        !podeExcluirRegistro(ctx(usuario), 'contratos', contrato));
    }

    // Editar exige enxergar a linha.
    if (podeEditarRegistro(ctx(usuario), 'contratos', contrato)) {
      const visiveis = registrosVisiveis(ctx(usuario), 'contratos', contratos, nomeadosDoContrato);
      ok(`${usuario.nome}/${contrato.id}: só edita o que enxerga`,
        visiveis.some((c) => c.id === contrato.id));
    }
  }

  for (const talento of talentos) {
    if (podeEditarTalento(ctx(usuario), talento)) {
      const visiveis = registrosVisiveis(ctx(usuario), 'talentos', talentos, nomeadosDoTalento);
      ok(`${usuario.nome}/${talento.nome}: só edita ficha que enxerga`,
        visiveis.some((t) => t.id === talento.id));
    }
  }
}

/* ================================================================== *
 * 6. Situações da conta
 * ================================================================== */
console.log('\n╔══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║ 6. SITUAÇÕES — férias mantém acesso; inativo e desligado cortam                    ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════╝\n');

const base = USUARIOS_SEED.find((u) => u.id === 'u3');
for (const situacao of ['ativo', 'ferias', 'afastado', 'inativo', 'desligado']) {
  const alterado = { ...base, situacao };
  const nivel = nivelDeAcesso(ctx(alterado), 'talentos', true);
  const ativa = contaAtiva(alterado);
  console.log(`${situacao.padEnd(12)} conta ${ativa ? 'ativa  ' : 'barrada'}  →  talentos: ${SIGLA[nivel]}`);

  if (situacao === 'inativo' || situacao === 'desligado') {
    ok(`${situacao}: quadro fechado mesmo nomeado`, nivel === 'nenhum');
    ok(`${situacao}: não cria registro`, !podeCriarRegistro(ctx(alterado), 'talentos'));
    ok(`${situacao}: nenhuma capacidade administrativa`,
      !podeAcao(ctx(alterado), 'gerenciar_usuarios'));
  } else {
    ok(`${situacao}: mantém o acesso`, nivel !== 'nenhum');
  }
}

// O dono é intocável mesmo inativado por engano? Não — a regra de conta vale para todos.
const donoInativo = { ...USUARIOS_SEED.find(ehDono), situacao: 'inativo' };
ok('dono inativado também perde acesso (a regra de conta é acima do dono)',
  nivelDeAcesso(ctx(donoInativo), 'talentos') === 'nenhum');

/* ================================================================== *
 * 7. Modo "Ver como"
 * ================================================================== */
console.log('\n╔══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║ 7. VER COMO — leitura igual, escrita bloqueada                                     ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════╝\n');

for (const usuario of USUARIOS_SEED) {
  const normal = ctx(usuario);
  const vendo = ctx(usuario, { visualizacao: true });

  const leituraIgual =
    nivelDeAcesso(normal, 'talentos', nomeadoEm(usuario, 'talentos')) ===
    nivelDeAcesso(vendo, 'talentos', nomeadoEm(usuario, 'talentos'));

  ok(`${usuario.nome}: visualização não muda a leitura`, leituraIgual);
  /*
    A semântica virou em 12/08/2026: a visualização não muda NENHUMA resposta — a tela precisa
    mostrar o que a pessoa simulada tem ("algumas funções não aparecem, como criar novo projeto").
    O bloqueio de escrita mudou de camada: mora nos setters do provider, provado por verComo.test.
  */
  ok(`${usuario.nome}: visualização não muda o criar`,
    podeCriarRegistro(vendo, 'talentos') === podeCriarRegistro(normal, 'talentos'));
  ok(`${usuario.nome}: visualização não muda o editar ficha`,
    talentos.every((t) => podeEditarTalento(vendo, t) === podeEditarTalento(normal, t)));
  ok(`${usuario.nome}: visualização não muda o editar contrato`,
    contratos.every((c) => podeEditarRegistro(vendo, 'contratos', c) === podeEditarRegistro(normal, 'contratos', c)));
}
console.log('   verificado para as 6 pessoas do seed');

/* ================================================================== *
 * 8. Administração
 * ================================================================== */
console.log('\n╔══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║ 8. ADMINISTRAÇÃO — equipes visíveis e quem configura                               ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════╝\n');
console.log('PESSOA                    EQUIPES VÊ  GERENCIA           CONFIGURA ACESSO');
console.log('─'.repeat(78));

for (const usuario of USUARIOS_SEED) {
  const visiveis = equipesVisiveis(ctx(usuario));
  const gerencia = equipes.filter((e) => podeGerenciarEquipe(ctx(usuario), e));
  const configura = podeDefinirAcessoDaEquipe(ctx(usuario));
  console.log(
    `${usuario.nome.padEnd(25)} ${String(visiveis.length).padEnd(11)} ` +
    `${(gerencia.length ? gerencia.map((e) => e.nome).join(', ').slice(0, 17) : '—').padEnd(18)} ${configura ? 'sim' : 'não'}`,
  );

  // Só quem gerencia a equipe pode aparecer como gerente dela.
  ok(`${usuario.nome}: gerencia ⊆ enxerga`,
    gerencia.every((e) => visiveis.some((v) => v.id === e.id)));

  // Configurar acesso é privilégio de admin/dono.
  if (configura) {
    ok(`${usuario.nome}: quem configura é admin ou dono`,
      ehDono(usuario) || usuario.perfil === 'admin');
  }
}

/* ================================================================== *
 * 9. Integridade dos dados do seed
 * ================================================================== */
console.log('\n╔══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║ 9. INTEGRIDADE DO SEED                                                             ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════╝\n');

const idsUsuarios = new Set(USUARIOS_SEED.map((u) => u.id));
const idsEquipes = new Set(equipes.map((e) => e.id));

// Referência órfã aqui vira avatar em branco na tela.
for (const equipe of equipes) {
  for (const membro of equipe.membros) {
    ok(`equipe ${equipe.nome}: membro ${membro.usuarioId} existe`, idsUsuarios.has(membro.usuarioId));
  }
  for (const visao of equipe.visoesLiberadas ?? []) {
    // Contra o catálogo INTEIRO: listar quadro a quadro faz o teste envelhecer a cada quadro novo.
    ok(`equipe ${equipe.nome}: visão liberada ${visao} existe`,
      VISOES.some((v) => v.id === visao));
  }
  for (const coluna of equipe.colunasOcultas ?? []) {
    ok(`equipe ${equipe.nome}: coluna oculta ${coluna} existe`,
      TODAS_AS_COLUNAS.some((c) => c.id === coluna));
  }
}

for (const talento of talentos) {
  for (const id of nomeadosDoTalento(talento)) {
    ok(`talento ${talento.nome}: responsável ${id} existe`, idsUsuarios.has(id));
  }
}

for (const contrato of contratos) {
  for (const id of nomeadosDoContrato(contrato)) {
    ok(`contrato ${contrato.id}: pessoa ${id} existe`, idsUsuarios.has(id));
  }
  if (contrato.talentoId) {
    ok(`contrato ${contrato.id}: talentoId aponta para ficha existente`,
      talentos.some((t) => t.id === contrato.talentoId));
  }
}

// Uma área atendida por duas equipes tornaria a lista de candidatos imprevisível.
const areas = equipes.filter((e) => e.areaTalento).map((e) => e.areaTalento);
ok('nenhuma área é atendida por duas equipes', new Set(areas).size === areas.length);
ok('todos os ids de equipe são únicos', idsEquipes.size === equipes.length);
ok('todos os ids de usuário são únicos', idsUsuarios.size === USUARIOS_SEED.length);

const c = contarTalentos(talentos);
console.log(`   ${USUARIOS_SEED.length} pessoas · ${equipes.length} equipes · ${talentos.length} talentos (${c.exclusivo} exclusivos, ${c.interveniencia} interveniência)`);
console.log(`   ${TODAS_AS_COLUNAS.length} colunas catalogadas em ${visoesDoQuadro('talentos').length + visoesDoQuadro('contratos').length} abas`);

/* ================================================================== *
 * Resultado
 * ================================================================== */
console.log(
  falhas === 0
    ? '\n✅ Matriz completa: todas as invariantes verificadas, nenhuma falha.'
    : `\n❌ ${falhas} invariante(s) violada(s).`,
);
