import { definirPapel, getPapel, alternarPapel } from './utils/pessoas.js';

let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

// Migração entre papéis — o pedido central.
check('parceiro vira responsável',
  definirPapel({ responsaveisIds: ['u1'], parceirosIds: ['u2'] }, 'u2', 'responsavel'),
  { responsaveisIds: ['u1', 'u2'], parceirosIds: [] });

check('responsável vira parceiro',
  definirPapel({ responsaveisIds: ['u1', 'u2'], parceirosIds: [] }, 'u1', 'parceiro'),
  { responsaveisIds: ['u2'], parceirosIds: ['u1'] });

// Múltiplos responsáveis convivem.
check('vários responsáveis',
  definirPapel({ responsaveisIds: ['u1', 'u2'], parceirosIds: [] }, 'u3', 'responsavel'),
  { responsaveisIds: ['u1', 'u2', 'u3'], parceirosIds: [] });

check('remover tira dos dois papéis',
  definirPapel({ responsaveisIds: ['u1'], parceirosIds: ['u2'] }, 'u1', null),
  { responsaveisIds: [], parceirosIds: ['u2'] });

check('definir papel que já tem não duplica',
  definirPapel({ responsaveisIds: ['u1'], parceirosIds: [] }, 'u1', 'responsavel'),
  { responsaveisIds: ['u1'], parceirosIds: [] });

check('linha começa vazia e recebe o primeiro responsável',
  definirPapel({ responsaveisIds: [], parceirosIds: [] }, 'u1', 'responsavel'),
  { responsaveisIds: ['u1'], parceirosIds: [] });

// getPapel
check('getPapel responsável', getPapel({ responsaveisIds: ['u1'], parceirosIds: ['u2'] }, 'u1'), 'responsavel');
check('getPapel parceiro', getPapel({ responsaveisIds: ['u1'], parceirosIds: ['u2'] }, 'u2'), 'parceiro');
check('getPapel ausente', getPapel({ responsaveisIds: ['u1'], parceirosIds: [] }, 'u9'), null);

// alternarPapel: clicar no papel atual remove da linha.
check('alternar no mesmo papel remove',
  alternarPapel({ responsaveisIds: ['u1'], parceirosIds: [] }, 'u1', 'responsavel'),
  { responsaveisIds: [], parceirosIds: [] });

check('alternar para o outro papel migra',
  alternarPapel({ responsaveisIds: ['u1'], parceirosIds: [] }, 'u1', 'parceiro'),
  { responsaveisIds: [], parceirosIds: ['u1'] });

// Invariante: ninguém pode ocupar os dois papéis ao mesmo tempo.
const cenarios = [
  definirPapel({ responsaveisIds: ['u1', 'u2'], parceirosIds: ['u3'] }, 'u3', 'responsavel'),
  definirPapel({ responsaveisIds: ['u1'], parceirosIds: ['u2'] }, 'u1', 'parceiro'),
  alternarPapel({ responsaveisIds: ['u1'], parceirosIds: ['u2'] }, 'u2', 'responsavel'),
];
const semSobreposicao = cenarios.every((p) => !p.responsaveisIds.some((id) => p.parceirosIds.includes(id)));
check('nunca ocupa os dois papéis', semSobreposicao, true);

// O primeiro responsável é o que define o grupo — precisa ser estável.
const aposMigrar = definirPapel({ responsaveisIds: ['u1', 'u2'], parceirosIds: [] }, 'u3', 'parceiro');
check('principal preservado ao mexer em parceiros', aposMigrar.responsaveisIds[0], 'u1');

console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
