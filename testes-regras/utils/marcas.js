import { normalizarNomeDeMarca } from './talentos.js';
/* ------------------------------------------------------------------ *
 * O que a marca sabe sobre si
 *
 * A aba Cliente mostra segmento, categoria e contatos que **não estão na oportunidade**: estão na
 * marca. É a mesma escolha já feita na interveniência, que vem da ficha do talento — um dado com
 * um dono só não tem como divergir de si mesmo.
 *
 * O preço é que a linha depende de um cadastro completo. Por isso as células da aba escrevem de
 * volta na marca: quem descobre o segmento no meio do preenchimento não precisa de outra tela, e
 * a marca sai da pendência pelo mesmo gesto.
 * ------------------------------------------------------------------ */
/** A marca com este nome, comparando pela chave da entidade — sem acento, caixa nem pontuação. */
export function marcaPorNome(nome, marcas) {
    const chave = normalizarNomeDeMarca(nome ?? '');
    if (!chave)
        return undefined;
    return marcas.find((marca) => normalizarNomeDeMarca(marca.nome) === chave);
}
/**
 * Setor da marca da oportunidade.
 *
 * `undefined` distingue dois casos que a tela precisa mostrar diferente: sem marca definida, e com
 * marca cujo cadastro ainda não tem segmento. O primeiro se resolve na coluna Marca; o segundo,
 * ali mesmo.
 */
export function segmentoDaMarca(nome, marcas) {
    return marcaPorNome(nome, marcas)?.segmento?.trim() || undefined;
}
export function categoriaDaMarca(nome, marcas) {
    return marcaPorNome(nome, marcas)?.categoria?.trim() || undefined;
}
/** Contatos cadastrados da marca — a lista que a coluna Contato oferece. */
export function contatosDaMarca(nome, marcas) {
    return marcaPorNome(nome, marcas)?.contatos ?? [];
}
/**
 * Valores já usados num campo da marca, ordenados.
 *
 * Alimenta o painel de Segmento e Categoria: a lista nasce do que já existe em vez de uma tabela
 * fixa que ninguém manteria. Quem escreve "Bebidas" na segunda marca escolhe da lista em vez de
 * digitar — e "bebidas" com minúscula deixa de existir como um segundo setor.
 */
export function valoresUsados(marcas, campo) {
    const vistos = new Map();
    for (const marca of marcas) {
        const valor = marca[campo]?.trim();
        if (!valor)
            continue;
        // A primeira grafia vista vence — a lista precisa de uma entrada por valor, não de três.
        const chave = normalizarNomeDeMarca(valor);
        if (!vistos.has(chave))
            vistos.set(chave, valor);
    }
    return [...vistos.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
/**
 * Como o negócio chegou.
 *
 * A lista é fechada porque a pergunta que ela responde é de contagem: quanto do pipeline veio de
 * cada caminho. Texto livre devolveria "indicação", "Indicação do cliente" e "veio por indicação"
 * como três respostas.
 */
export const CAPTACOES = [
    { id: 'ativa', label: 'Ativa', hint: 'A casa procurou o cliente' },
    { id: 'passiva', label: 'Passiva', hint: 'O cliente procurou a casa' },
    { id: 'indicacao', label: 'Indicação', hint: 'Chegou por indicação de terceiro' },
    { id: 'renovacao', label: 'Renovação', hint: 'Continuação de um projeto que já existia' },
];
/** `undefined` para valor ausente ou desconhecido — ausente não é nenhuma das opções. */
export function getCaptacao(id) {
    return CAPTACOES.find((opcao) => opcao.id === id);
}
