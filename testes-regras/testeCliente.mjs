/*
  Aba Cliente — as regras que a tela não mostra.

  O ponto delicado é que segmento, categoria e contatos **não estão na oportunidade**: são lidos da
  marca pelo nome gravado na linha. Isso significa que a leitura depende de casar dois textos — e
  é exatamente aí que "Coca-Cola" e "coca cola" voltariam a ser dois clientes.
*/
import {
  CAPTACOES, categoriaDaMarca, contatosDaMarca, getCaptacao, marcaPorNome, segmentoDaMarca,
  valoresUsados,
} from './utils/marcas.js';

let falhas = 0;
function check(titulo, obtido, esperado) {
  const bate = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!bate) falhas++;
  console.log(`${bate ? 'OK  ' : 'FALHA'} ${titulo} -> ${JSON.stringify(obtido)}${
    bate ? '' : ` (esperado ${JSON.stringify(esperado)})`}`);
}

const MARCAS = [
  {
    id: 'mar1', nome: 'Coca-Cola', tipo: 'cliente', segmento: 'Bebidas',
    categoria: 'Refrigerantes', contatos: ['midia@coca.com', 'juridico@coca.com'],
    observacoes: '', criadoEm: '',
  },
  {
    id: 'mar2', nome: 'Ypê', tipo: 'cliente', segmento: 'Limpeza',
    categoria: '', contatos: [], observacoes: '', criadoEm: '', cadastroPendente: true,
  },
  {
    id: 'mar3', nome: 'Ambev', tipo: 'cliente', segmento: 'bebidas',
    categoria: 'Cervejas', contatos: ['parcerias@ambev.com'], observacoes: '', criadoEm: '',
  },
];

/* ---------------------------------------------------------------- a ponte nome → cadastro */
check('acha pelo nome exato', marcaPorNome('Coca-Cola', MARCAS)?.id, 'mar1');
// A mesma normalização da entidade: sem isso a linha antiga perderia o cadastro.
check('acha sem hífen', marcaPorNome('Coca Cola', MARCAS)?.id, 'mar1');
check('acha sem caixa', marcaPorNome('COCA-COLA', MARCAS)?.id, 'mar1');
check('acha sem acento', marcaPorNome('ype', MARCAS)?.id, 'mar2');
check('nome vazio não acha nada', marcaPorNome('', MARCAS), undefined);
check('nome ausente não acha nada', marcaPorNome(undefined, MARCAS), undefined);
check('marca desconhecida não inventa', marcaPorNome('Pepsi', MARCAS), undefined);

/* ---------------------------------------------------------------- leitura derivada */
check('segmento vem do cadastro', segmentoDaMarca('Coca-Cola', MARCAS), 'Bebidas');
check('categoria vem do cadastro', categoriaDaMarca('Coca-Cola', MARCAS), 'Refrigerantes');
/*
  Os três "vazios" precisam ser distinguíveis: sem marca, marca sem cadastro e cadastro sem o
  campo. A tela mostra os dois primeiros como "escolha a marca" e o terceiro como célula editável.
*/
check('sem marca, segmento é indefinido', segmentoDaMarca('', MARCAS), undefined);
check('marca fora do cadastro, indefinido', segmentoDaMarca('Pepsi', MARCAS), undefined);
check('campo em branco vira indefinido, não string vazia',
  categoriaDaMarca('Ypê', MARCAS), undefined);

check('contatos da marca', contatosDaMarca('Coca-Cola', MARCAS), ['midia@coca.com', 'juridico@coca.com']);
check('marca sem contatos devolve lista vazia', contatosDaMarca('Ypê', MARCAS), []);
// Lista vazia e não `undefined`: quem chama itera direto, sem guarda.
check('marca inexistente devolve lista vazia', contatosDaMarca('Pepsi', MARCAS), []);

/* ---------------------------------------------------------------- a lista do painel */
check('segmentos usados, sem repetir grafia',
  valoresUsados(MARCAS, 'segmento'), ['Bebidas', 'Limpeza']);
check('categorias usadas ignoram as vazias',
  valoresUsados(MARCAS, 'categoria'), ['Cervejas', 'Refrigerantes']);
check('ordenado em pt-BR', valoresUsados(
  [{ segmento: 'Ácido' }, { segmento: 'Bebidas' }, { segmento: 'Alimentos' }],
  'segmento',
), ['Ácido', 'Alimentos', 'Bebidas']);
check('lista vazia não quebra', valoresUsados([], 'segmento'), []);

/* ---------------------------------------------------------------- captação */
check('quatro opções', CAPTACOES.length, 4);
check('ids estáveis', CAPTACOES.map((c) => c.id), ['ativa', 'passiva', 'indicacao', 'renovacao']);
check('toda opção explica o que é', CAPTACOES.every((c) => c.hint.length > 10), true);
check('busca por id', getCaptacao('indicacao')?.label, 'Indicação');
// Ausente não é nenhuma das opções — o mesmo princípio das demais classificações.
check('ausente não vira a primeira', getCaptacao(undefined), undefined);
check('desconhecido não vira a primeira', getCaptacao('sei_la'), undefined);

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO OK');
process.exit(falhas ? 1 : 0);
