// Confere a normalização usada na busca de parceiros.
function normalizar(texto) {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

const casos = [
  ['Camila Souza', 'camila souza'],
  ['Diego Nogueira', 'diego nogueira'],
  ['José Antônio', 'jose antonio'],
  ['MÁRCIA', 'marcia'],
  ['ana.martins@viu.com.br', 'ana.martins@viu.com.br'],
];

let falhas = 0;
for (const [entrada, esperado] of casos) {
  const real = normalizar(entrada);
  const ok = real === esperado;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${entrada} -> ${real}`);
}

// Busca sem acento deve achar nome acentuado, e vice-versa.
const acha = (termo, nome) => normalizar(nome).includes(normalizar(termo));
const buscas = [
  ['jose', 'José Antônio', true],
  ['antônio', 'José Antônio', true],
  ['marcia', 'MÁRCIA Lopes', true],
  ['zzz', 'José Antônio', false],
];
for (const [termo, nome, esperado] of buscas) {
  const real = acha(termo, nome);
  const ok = real === esperado;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} buscar "${termo}" em "${nome}" -> ${real}`);
}

console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
