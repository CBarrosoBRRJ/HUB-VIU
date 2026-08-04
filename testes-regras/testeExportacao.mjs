/**
 * Exportação para Excel — a matriz que vira `.xlsx`.
 *
 * O download em si é do navegador (SheetJS, carregado no clique); o que se testa é a parte que
 * decide **o que sai**: a matriz de células e as larguras das colunas da planilha. A regra de
 * ouro — só o visível é exportado — vive em quem chama (`exportarParaExcel` filtra por `oculta`),
 * e o contrato daqui é não inventar nem perder célula.
 */
import XLSX from 'xlsx';
import { largurasDaMatriz, montarMatriz } from './utils/exportacao.js';

let falhas = 0;
function check(nome, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} -> ${JSON.stringify(real)}${ok ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

const colunas = [
  { rotulo: 'Projeto', valor: (i) => ['Coca Verão', 'Nubank Fee'][i] },
  { rotulo: 'Valor', valor: (i) => ['R$ 320.000,00', ''][i] },
];

console.log('--- A matriz ---');
const matriz = montarMatriz(colunas, 2);
check('cabeçalho na primeira linha', matriz[0], ['Projeto', 'Valor']);
check('uma linha por registro, na ordem', matriz.length, 3);
check('as células vêm do resolvedor por índice', matriz[1], ['Coca Verão', 'R$ 320.000,00']);
check('célula vazia continua vazia — não vira "undefined"', matriz[2], ['Nubank Fee', '']);
check('grade sem linhas exporta só o cabeçalho', montarMatriz(colunas, 0).length, 1);

console.log('\n--- As larguras ---');
const larguras = largurasDaMatriz(matriz);
check('uma largura por coluna', larguras.length, 2);
check('a régua é a maior célula, com folga', larguras[1], { wch: 'R$ 320.000,00'.length + 2 });
check('piso de 10 caracteres — coluna estreita continua legível',
  largurasDaMatriz([['a'], ['b']])[0], { wch: 10 });
check('teto de 48 — um Escopo de parágrafo não atravessa o monitor',
  largurasDaMatriz([['x'.repeat(300)]])[0], { wch: 48 });
// Só a primeira linha do texto conta para a largura: célula multilinha não estica a coluna.
check('quebra de linha não conta para a largura',
  largurasDaMatriz([[`ab\n${'x'.repeat(40)}`]])[0], { wch: 10 });

/* ------------------------------------------------------------------ *
 * O arquivo de verdade — ida e volta com a MESMA biblioteca do navegador
 *
 * "Faz o teste, não está exportando em Excel" (04/08/2026): o defeito era o interop CommonJS do
 * `import()` dinâmico, invisível a testes que só olham a matriz. Este bloco gera o `.xlsx` com o
 * SheetJS real e o relê — se a biblioteca ou o formato quebrarem, quebra aqui antes da tela.
 * ------------------------------------------------------------------ */
console.log('\n--- O arquivo de verdade ---');

const aba = XLSX.utils.aoa_to_sheet(matriz);
aba['!cols'] = larguras;
const arquivo = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(arquivo, aba, 'Backlog de Agenciados');
const bytes = XLSX.write(arquivo, { type: 'buffer', bookType: 'xlsx' });

check('o arquivo é um .xlsx de verdade (assinatura zip PK)', [bytes[0], bytes[1]], [0x50, 0x4b]);

const relido = XLSX.read(bytes, { type: 'buffer' });
check('a aba leva o nome da página', relido.SheetNames, ['Backlog de Agenciados']);
check('o conteúdo sobrevive à ida e volta',
  XLSX.utils.sheet_to_json(relido.Sheets['Backlog de Agenciados'], { header: 1, defval: '' }),
  matriz);

console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`);
