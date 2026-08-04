/**
 * Valores monetários — leitura tolerante, exibição consistente.
 *
 * Os campos de valor são **texto livre** por decisão de produto: a operação escreve
 * "R$ 320.000,00", "320000", "320 mil" e "a definir" no mesmo campo, e recusar qualquer um deles
 * faria o dado não entrar.
 *
 * O preço disso é que somar exige interpretar. `paraNumero` faz isso da forma mais conservadora
 * possível: o que não se reconhece vale zero, nunca um palpite. Um total errado é pior que um
 * total menor — quem confere descobre o segundo, não o primeiro.
 */
/**
 * Interpreta um texto de valor. `undefined` no que não reconhece — **e só nisso**.
 *
 * Existe separada de `paraNumero` porque "vale zero" e "não deu para ler" são respostas
 * diferentes, e `paraNumero` colapsava as duas: um cachê legítimo de R$ 0,00 era contado como
 * ilegível no totalizador, inflando a métrica de linhas por preencher. Zero é resposta; "a
 * definir" é ausência dela.
 *
 * Aceita o formato brasileiro (`1.234,56`) e o cru (`1234.56`), com ou sem `R$`. A distinção é
 * feita pela posição do último separador: em `1.234,56` a vírgula vem depois; em `1,234.56`, o
 * ponto. Sem essa checagem, `1.234` viraria 1,234 — um erro de mil vezes.
 */
export function interpretarValor(texto) {
    if (!texto)
        return undefined;
    const limpo = texto.replace(/[^\d.,-]/g, '').trim();
    // Sem nenhum dígito não há valor para ler — "a definir", "—", "isento de texto".
    if (!limpo || !/\d/.test(limpo))
        return undefined;
    const ultimaVirgula = limpo.lastIndexOf(',');
    const ultimoPonto = limpo.lastIndexOf('.');
    let normalizado;
    if (ultimaVirgula > ultimoPonto) {
        // Brasileiro: ponto é milhar, vírgula é decimal.
        normalizado = limpo.replace(/\./g, '').replace(',', '.');
    }
    else if (ultimoPonto > ultimaVirgula) {
        /*
          Só há ponto. Milhar ou decimal?
    
          A regra é a posição: separador com **exatamente três dígitos depois e nada mais** é milhar.
          É o que a grafia brasileira faz o tempo todo — "R$ 500.000" é meio milhão, não quinhentos.
          Um a dois dígitos ("10.5", "10.50") é decimal, que é como se escreve centavos.
    
          Sem esta distinção, `Number('500.000')` devolvia **500** — os totais do card de Finalização
          erravam por um fator de mil. E `Number('1.234.567')` era `NaN`, virava zero, e o valor saía
          da soma sem nem entrar na contagem de ilegíveis: um projeto de R$ 1,2 mi desaparecia.
        */
        const semVirgula = limpo.replace(/,/g, '');
        const pontos = (semVirgula.match(/\./g) ?? []).length;
        const casasFinais = semVirgula.length - semVirgula.lastIndexOf('.') - 1;
        normalizado =
            pontos > 1 || casasFinais === 3 ? semVirgula.replace(/\./g, '') : semVirgula;
    }
    else {
        normalizado = limpo;
    }
    const numero = Number(normalizado);
    return Number.isFinite(numero) ? numero : undefined;
}
/**
 * A versão que nunca falha: o que não se reconhece vale zero, nunca um palpite.
 *
 * Para **somar** — um total errado é pior que um total menor. Quem precisa distinguir o zero do
 * ilegível usa `interpretarValor`.
 */
export function paraNumero(texto) {
    return interpretarValor(texto) ?? 0;
}
/** `R$ 1.234.567` — sem centavos, que só poluem a leitura de totais grandes. */
export function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
    });
}
/**
 * Soma uma coluna de valores em texto.
 *
 * Devolve também **quantos registros não puderam ser lidos**: um total que esconde o que ficou de
 * fora convida a decisões erradas. A tela mostra esse número ao lado da soma.
 */
export function somarValores(textos) {
    let total = 0;
    let ilegiveis = 0;
    for (const texto of textos) {
        const preenchido = texto?.trim();
        if (!preenchido)
            continue;
        const numero = interpretarValor(preenchido);
        /*
          Ilegível é o que não se leu — não o que vale zero. "R$ 0,00" soma zero e conta como lido;
          "a definir" entra no contador que a tela mostra ao lado do total.
        */
        if (numero === undefined)
            ilegiveis += 1;
        else
            total += numero;
    }
    return { total, ilegiveis };
}
