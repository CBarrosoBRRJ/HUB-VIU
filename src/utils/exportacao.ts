/**
 * Exportação da grade para Excel — `.xlsx` de verdade.
 *
 * ## Por que a biblioteca entrou (04/08/2026) — e por que o import é estático
 *
 * A primeira versão gerava CSV com BOM e `;` — o Excel brasileiro abria com duplo clique, mas o
 * arquivo não **era** Excel, e a operação pediu o formato real ("não está exportando em Excel, e
 * deveria"). O SheetJS começou por `import()` dinâmico para os ~430 kB só carregarem no clique —
 * e o clique **morria em silêncio** no servidor de desenvolvimento: dependência instalada com o
 * `dev` no ar chega desatualizada ao otimizador do Vite, o `import()` falha, e nada baixa. Duas
 * rodadas de "ainda não exporta" depois, a troca: import estático. A página paga 143 kB gzip para
 * o botão funcionar **sempre** — confiabilidade ganha de peso, e este arquivo registra o porquê
 * para ninguém "otimizar" de volta.
 *
 * ## O que sai é o que se vê
 *
 * A exportação recebe as colunas **visíveis** e as linhas **filtradas** — o recorte da tela, com a
 * permissão já aplicada. Exportar mais que isso seria um vazamento: a planilha viraria o caminho
 * para ler coluna oculta e aba não liberada. Ver [07 §5](../../prd/07_visoes_e_relacoes.md).
 */

import * as XLSX from 'xlsx';

export interface ColunaExportada {
  rotulo: string;
  /** O valor da célula para uma linha — já como texto de leitura, não id interno. */
  valor: (indiceDaLinha: number) => string;
}

/**
 * A matriz da planilha: cabeçalho na primeira linha, uma linha por registro.
 *
 * Pura e separada do download pelo mesmo motivo de sempre: é o que `testeExportacao` verifica
 * sem navegador. Quebras de linha ficam — célula de Excel aceita texto multilinha.
 */
export function montarMatriz(colunas: ColunaExportada[], totalDeLinhas: number): string[][] {
  const matriz = [colunas.map((coluna) => coluna.rotulo)];
  for (let i = 0; i < totalDeLinhas; i += 1) {
    matriz.push(colunas.map((coluna) => coluna.valor(i)));
  }
  return matriz;
}

/**
 * Larguras das colunas da planilha, em caracteres (`wch` do SheetJS).
 *
 * A régua é a maior célula, com teto — sem ele, um Escopo de parágrafo faria a coluna atravessar
 * o monitor de quem abre.
 */
export function largurasDaMatriz(matriz: string[][]): { wch: number }[] {
  const colunas = matriz[0]?.length ?? 0;
  return Array.from({ length: colunas }, (_, indice) => {
    const maior = matriz.reduce((max, linha) => {
      const primeiraLinha = (linha[indice] ?? '').split('\n')[0];
      return Math.max(max, primeiraLinha.length);
    }, 0);
    return { wch: Math.min(48, Math.max(10, maior + 2)) };
  });
}

/**
 * Monta o `.xlsx` e dispara o download — que o navegador salva na pasta **Downloads** da pessoa,
 * como qualquer download de página (o site não escolhe pasta; o navegador, sim).
 */
export function baixarXlsx(
  nomeDoArquivo: string, colunas: ColunaExportada[], totalDeLinhas: number,
  nomeDaAba = 'Backlog',
): void {
  const matriz = montarMatriz(colunas, totalDeLinhas);
  const aba = XLSX.utils.aoa_to_sheet(matriz);
  aba['!cols'] = largurasDaMatriz(matriz);
  const arquivo = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(arquivo, aba, nomeDaAba);

  const arrayBuffer = XLSX.write(arquivo, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeDoArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
