import { getVigenciaInfo, contarPorFarol, matchesFiltro, VIGENCIA_ALERTA_DIAS } from './utils/vigencia.js';

const HOJE = new Date(2026, 7, 1); // 01/08/2026
let falhas = 0;

function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

const c = (over) => ({ id: 'x', talento: 'T', contrato: 'C', inicio: '2026-01-01', fim: '2026-12-31', status: 'Criação', responsaveisIds: [], parceirosIds: [], criadoEm: '2026-08-01T00:00:00.000Z', ...over });

// A janela de alerta agora é de 30 dias.
check('constante da janela', VIGENCIA_ALERTA_DIAS, 30);

// Fronteiras exatas
check('31 dias = verde', getVigenciaInfo(c({ fim: '2026-09-01' }), HOJE).tone, 'verde');
check('30 dias = amarelo', getVigenciaInfo(c({ fim: '2026-08-31' }), HOJE).tone, 'amarelo');
check('29 dias = amarelo', getVigenciaInfo(c({ fim: '2026-08-30' }), HOJE).tone, 'amarelo');
check('0 dias (vence hoje) = amarelo', getVigenciaInfo(c({ fim: '2026-08-01' }), HOJE).tone, 'amarelo');
check('-1 dia = vermelho', getVigenciaInfo(c({ fim: '2026-07-31' }), HOJE).tone, 'vermelho');

// O que antes era amarelo (entre 31 e 90 dias) agora é verde.
check('60 dias agora é verde', getVigenciaInfo(c({ fim: '2026-09-30' }), HOJE).tone, 'verde');
check('90 dias agora é verde', getVigenciaInfo(c({ fim: '2026-10-30' }), HOJE).tone, 'verde');

// Cinza segue fora do farol de cores
check('cancelado = cinza', getVigenciaInfo(c({ status: 'Cancelado' }), HOJE).tone, 'cinza');
check('sem data fim = cinza', getVigenciaInfo(c({ fim: '' }), HOJE).tone, 'cinza');

// Rótulos
check('label vence em 30d', getVigenciaInfo(c({ fim: '2026-08-31' }), HOJE).label, 'Vence em 30d');
check('label vencido há 3d', getVigenciaInfo(c({ fim: '2026-07-29' }), HOJE).label, 'Vencido há 3d');

// Percentual de tempo decorrido segue intacto
check('percentual meio do contrato', getVigenciaInfo(c({ inicio: '2026-07-01', fim: '2026-09-01' }), HOJE).percentual, 50);
check('percentual fim=inicio', getVigenciaInfo(c({ inicio: '2026-08-01', fim: '2026-08-01' }), HOJE).percentual, null);

// Contagens das abas com a nova regra
const base = [
  c({ id: '1', fim: '2026-12-31' }), // verde
  c({ id: '2', fim: '2026-09-30' }), // 60d: verde agora (era amarelo na regra de 90)
  c({ id: '3', fim: '2026-08-20' }), // 19d: amarelo
  c({ id: '4', fim: '2026-07-01' }), // vermelho
  c({ id: '5', status: 'Cancelado' }), // cinza
];
check('counts', contarPorFarol(base, HOJE), { todos: 5, vigentes: 2, a_vencer: 1, vencidos: 1 });
check('aba a vencer', base.filter((x) => matchesFiltro(getVigenciaInfo(x, HOJE), 'a_vencer')).map((x) => x.id), ['3']);

console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
