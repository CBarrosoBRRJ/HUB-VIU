/**
 * Jornada: um nome digitado no contrato abre a ficha do talento.
 *
 * Simula a sequência real de estado do `DadosProvider` — as mesmas funções puras que ele chama —
 * para verificar o ciclo completo: nome novo → ficha pendente → vínculo → curadoria.
 */
import { REDES_VAZIAS, encontrarTalentoPorNome, fichaVazia, alternarResponsavelDaArea, nomeadosDoTalento } from './utils/talentos.js';
import { semelhantes, valoresUsados, divergencias } from './utils/referencias.js';
import { contratosDoTalento } from './utils/talentos.js';

let falhas = 0;
let etapaAtual = '';
function etapa(titulo) {
  etapaAtual = titulo;
  console.log(`\n${titulo}`);
}
function ok(nome, condicao) {
  if (condicao) console.log(`   ✓ ${nome}`);
  else {
    falhas++;
    console.log(`   ✗ FALHOU: ${nome}  [${etapaAtual}]`);
  }
}

/* ---- estado simulado, como no provider ---- */
let talentos = [];
let contratos = [];
let sequencia = 1;

/** Espelha `garantirTalento`. */
function garantirTalento(nome) {
  const limpo = nome.trim();
  if (!limpo) return null;

  const existente = encontrarTalentoPorNome(limpo, talentos);
  if (existente) return existente.id;

  const novo = {
    id: `tal${sequencia++}`,
    nome: limpo,
    tipo: 'interveniencia',
    nomeArtistico: '', empresa: '', email: '', telefone: '', local: '', observacoes: '',
    razaoSocial: '', cnpj: '', faturamento: '', condicaoPagamento: '', dadosBancarios: '',
    redes: { ...REDES_VAZIAS },
    responsaveis: {},
    cadastroPendente: true,
    criadoEm: '2026-08-01T12:00:00.000Z',
  };
  talentos = [novo, ...talentos];
  return novo.id;
}

/** Espelha `atualizarTalento`: preencher qualquer campo além do nome resolve a pendência. */
function atualizarTalento(id, campo, valor) {
  talentos = talentos.map((t) =>
    t.id === id
      ? { ...t, [campo]: valor, cadastroPendente: campo === 'nome' ? t.cadastroPendente : false }
      : t,
  );
}

function criarContrato(nomeTalento, over = {}) {
  const contrato = {
    id: `CT-00${contratos.length + 1}`,
    talento: nomeTalento,
    talentoId: garantirTalento(nomeTalento) ?? undefined,
    contrato: '', numero: '', inicio: '2026-01-01', fim: '2026-12-31', status: 'Criação',
    responsaveisIds: [], parceirosIds: [], criadoEm: '', ...over,
  };
  contratos = [contrato, ...contratos];
  return contrato;
}

etapa('1. Nome novo no contrato abre a ficha');
const c1 = criarContrato('Gil do Vigor');
ok('a ficha foi criada', talentos.length === 1);
ok('o contrato aponta para ela', c1.talentoId === talentos[0].id);
ok('nasce como interveniência', talentos[0].tipo === 'interveniencia');
ok('e marcada como pendente', talentos[0].cadastroPendente === true);
ok('a ficha está vazia', fichaVazia(talentos[0]));

etapa('2. O mesmo nome não abre uma segunda ficha');
const c2 = criarContrato('Gil do Vigor');
ok('continua uma ficha só', talentos.length === 1);
ok('o segundo contrato aponta para a mesma', c2.talentoId === c1.talentoId);

etapa('3. Variação de grafia é reconhecida antes de virar duplicata');
// A célula compara com o que existe ANTES de gravar — é o que a interface faz.
const parecidos = semelhantes('Gilberto do Vigor', talentos.map((t) => t.nome));
ok('o alerta identifica o parecido', parecidos.length === 1);
ok('e aponta a grafia já cadastrada', parecidos[0].valor === 'Gil do Vigor');
// Se a pessoa insistir, o cadastro acontece — homônimos existem.
criarContrato('Gilberto do Vigor');
ok('insistir cria a segunda ficha', talentos.length === 2);

etapa('4. Acento não cria ficha nova');
criarContrato('gil do VIGOR');
ok('casa por nome normalizado', talentos.length === 2);

etapa('5. Preencher qualquer campo resolve a pendência');
const gil = talentos.find((t) => t.nome === 'Gil do Vigor');
ok('ainda pendente', gil.cadastroPendente === true);
atualizarTalento(gil.id, 'empresa', 'Vigor Produções');
const gilAtualizado = talentos.find((t) => t.id === gil.id);
ok('deixou de ser pendente', gilAtualizado.cadastroPendente === false);
ok('e a ficha não está mais vazia', !fichaVazia(gilAtualizado));

etapa('6. Renomear o próprio nome NÃO resolve a pendência');
const gilberto = talentos.find((t) => t.nome === 'Gilberto do Vigor');
atualizarTalento(gilberto.id, 'nome', 'Gilberto Vigor');
ok('segue pendente', talentos.find((t) => t.id === gilberto.id).cadastroPendente === true);

etapa('7. Os contratos da ficha continuam ligados');
const doGil = contratosDoTalento(gilAtualizado, contratos);
ok('reúne os três contratos dele', doGil.length === 3);
ok('inclui o que veio com outra grafia', doGil.some((c) => c.talento === 'gil do VIGOR'));

etapa('8. Responsáveis em lista');
let ficha = talentos[0];
ficha = alternarResponsavelDaArea(ficha, 'producao', 'u1');
ficha = alternarResponsavelDaArea(ficha, 'producao', 'u5');
ok('a área aceita dois', ficha.responsaveis.producao.length === 2);
ok('ambos entram na lista de nomeados', nomeadosDoTalento(ficha).length === 2);
ficha = alternarResponsavelDaArea(ficha, 'producao', 'u1');
ok('remover um mantém o outro', ficha.responsaveis.producao.length === 1);
ficha = alternarResponsavelDaArea(ficha, 'producao', 'u5');
ok('remover o último apaga a área', ficha.responsaveis.producao === undefined);

etapa('9. Auditoria de grafias divergentes');
// A referência corrige o que entra; a auditoria mostra o que já entrou.
const comDivergencia = [{ local: 'São Paulo' }, { local: 'Sao Paulo' }, { local: 'São Paulo' }];
const achadas = divergencias(comDivergencia, 'local');
ok('acha o grupo divergente', achadas.length === 1);
ok('com as duas grafias', achadas[0].grafias.length === 2);
ok('e a sugestão devolve a mais frequente', valoresUsados(comDivergencia, 'local')[0] === 'São Paulo');

console.log(
  falhas === 0
    ? '\n✅ Jornada completa: 9 etapas, nenhuma falha.'
    : `\n❌ ${falhas} verificação(ões) falharam.`,
);
