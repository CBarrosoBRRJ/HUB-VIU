import {
  definirMembro, removerMembro, getPapelNaEquipe, alternarPagina, contarPorPapel,
  equipesDoUsuario, paginasDoUsuario,
} from './utils/equipes.js';

let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

const eq = (over) => ({
  id: 'eq1', nome: 'Agenciamento', paginasPermitidas: ['contratos'], membros: [], criadaEm: '2026-08-01T00:00:00.000Z', ...over,
});

// Membros
check('adicionar membro',
  definirMembro(eq(), 'u1', 'membro').membros,
  [{ usuarioId: 'u1', papel: 'membro' }]);

check('adicionar duas pessoas',
  definirMembro(definirMembro(eq(), 'u1', 'responsavel'), 'u2', 'membro').membros,
  [{ usuarioId: 'u1', papel: 'responsavel' }, { usuarioId: 'u2', papel: 'membro' }]);

// A mesma pessoa não pode entrar duas vezes: redefinir só troca o papel.
check('redefinir papel não duplica',
  definirMembro(eq({ membros: [{ usuarioId: 'u1', papel: 'membro' }] }), 'u1', 'responsavel').membros,
  [{ usuarioId: 'u1', papel: 'responsavel' }]);

check('redefinir preserva a ordem',
  definirMembro(
    eq({ membros: [{ usuarioId: 'u1', papel: 'membro' }, { usuarioId: 'u2', papel: 'membro' }] }),
    'u1', 'responsavel',
  ).membros.map((m) => m.usuarioId),
  ['u1', 'u2']);

check('remover membro',
  removerMembro(eq({ membros: [{ usuarioId: 'u1', papel: 'membro' }, { usuarioId: 'u2', papel: 'membro' }] }), 'u1').membros,
  [{ usuarioId: 'u2', papel: 'membro' }]);

check('remover quem não é membro é inócuo',
  removerMembro(eq({ membros: [{ usuarioId: 'u1', papel: 'membro' }] }), 'u9').membros,
  [{ usuarioId: 'u1', papel: 'membro' }]);

check('getPapelNaEquipe responsável',
  getPapelNaEquipe(eq({ membros: [{ usuarioId: 'u1', papel: 'responsavel' }] }), 'u1'), 'responsavel');
check('getPapelNaEquipe ausente',
  getPapelNaEquipe(eq({ membros: [] }), 'u1'), null);

// Acessos
check('conceder acesso', alternarPagina(eq(), 'backlog').paginasPermitidas, ['contratos', 'backlog']);
check('revogar acesso', alternarPagina(eq(), 'contratos').paginasPermitidas, []);

check('contagem por papel',
  contarPorPapel(eq({ membros: [
    { usuarioId: 'u1', papel: 'responsavel' },
    { usuarioId: 'u2', papel: 'responsavel' },
    { usuarioId: 'u3', papel: 'membro' },
  ] })),
  { responsaveis: 2, membros: 1 });

// Uma pessoa em várias equipes
const times = [
  eq({ id: 'eq1', nome: 'A', paginasPermitidas: ['contratos'], membros: [{ usuarioId: 'u1', papel: 'membro' }] }),
  eq({ id: 'eq2', nome: 'B', paginasPermitidas: ['backlog'], membros: [{ usuarioId: 'u1', papel: 'responsavel' }] }),
  eq({ id: 'eq3', nome: 'C', paginasPermitidas: ['backlog'], membros: [{ usuarioId: 'u2', papel: 'membro' }] }),
];
check('equipes do usuário', equipesDoUsuario(times, 'u1').map((e) => e.id), ['eq1', 'eq2']);
check('acesso é cumulativo e sem repetição', paginasDoUsuario(times, 'u1'), ['contratos', 'backlog']);
check('usuário sem equipe não tem acesso', paginasDoUsuario(times, 'u9'), []);

// Imutabilidade: as funções não podem alterar o objeto recebido.
const original = eq({ membros: [{ usuarioId: 'u1', papel: 'membro' }] });
definirMembro(original, 'u2', 'membro');
removerMembro(original, 'u1');
alternarPagina(original, 'backlog');
check('não muta a equipe original',
  { membros: original.membros.length, paginas: original.paginasPermitidas },
  { membros: 1, paginas: ['contratos'] });

console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
