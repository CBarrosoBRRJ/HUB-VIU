/**
 * Exportação da grade para Excel — `.xlsx` de verdade.
 *
 * ## Por que a biblioteca entrou (04/08/2026)
 *
 * A primeira versão gerava CSV com BOM e `;` — o Excel brasileiro abria com duplo clique, mas o
 * arquivo não **era** Excel, e a operação pediu o formato real ("não está exportando em Excel, e
 * deveria"). O SheetJS entra por `import()` dinâmico: os ~400 kB só carregam no clique do botão,
 * e a página não paga por eles.
 *
 * ## O que sai é o que se vê
 *
 * A exportação recebe as colunas **visíveis** e as linhas **filtradas** — o recorte da tela, com a
 * permissão já aplicada. Exportar mais que isso seria um vazamento: a planilha viraria o caminho
 * para ler coluna oculta e aba não liberada. Ver [07 §5](../../prd/07_visoes_e_relacoes.md).
 */
/**
 * A matriz da planilha: cabeçalho na primeira linha, uma linha por registro.
 *
 * Pura e separada do download pelo mesmo motivo de sempre: é o que `testeExportacao` verifica
 * sem navegador. Quebras de linha ficam — célula de Excel aceita texto multilinha.
 */
export function montarMatriz(colunas, totalDeLinhas) {
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
export function largurasDaMatriz(matriz) {
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
 * como qualquer download de página (o site não escolhe pasta; o navegador, sim). A biblioteca só
 * carrega aqui, no clique.
 */
export async function baixarXlsx(nomeDoArquivo, colunas, totalDeLinhas, nomeDaAba = 'Backlog') {
    /*
      O `?? modulo` não é paranoia: o pacote é CommonJS, e conforme o empacotador o `import()`
      entrega os exports na raiz OU embrulhados em `default`. Sem a guarda, `XLSX.utils` vem
      `undefined` num dos dois mundos e o clique falha **em silêncio** — foi o "não está
      exportando" reportado pela operação em 04/08/2026.
    */
    const modulo = await import('xlsx');
    const XLSX = modulo.default ?? modulo;
    const matriz = montarMatriz(colunas, totalDeLinhas);
    const aba = XLSX.utils.aoa_to_sheet(matriz);
    aba['!cols'] = largurasDaMatriz(matriz);
    const arquivo = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(arquivo, aba, nomeDaAba);
    XLSX.writeFile(arquivo, nomeDoArquivo);
}
