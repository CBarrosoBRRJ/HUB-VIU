/**
 * Referência entre tabelas — o que impede o mesmo dado de existir escrito de duas formas.
 *
 * O problema é concreto: "Gil do Vigor" e "Gilberto do Vigor" são a mesma pessoa em duas linhas;
 * "São Paulo" e "Sao Paulo" são a mesma cidade em dois grupos. Depois de criados, ninguém percebe
 * — a lista mostra os dois e cada um parece legítimo.
 *
 * A correção acontece **na digitação**, e em duas camadas:
 *
 * 1. **Sugestão** — o que já existe aparece enquanto se digita, e escolher é mais rápido que
 *    escrever. A maior parte das duplicatas morre aqui, por conveniência.
 * 2. **Alerta de parecido** — quando o texto digitado não bate com nada mas está *perto* de algo
 *    que existe, a célula pergunta antes de aceitar. É a rede que pega o resto.
 *
 * A segunda camada nunca **bloqueia**: homônimos existem, e travar o cadastro por semelhança
 * deixaria a operação sem saída. Ela informa e deixa a decisão com quem digita.
 */

export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
}

/**
 * Distância de edição (Levenshtein), sobre o texto normalizado.
 *
 * Uma matriz de duas linhas em vez da matriz inteira: a lista de opções é percorrida a cada
 * tecla, e alocar `n × m` por comparação pesaria com algumas centenas de talentos.
 */
export function distancia(a: string, b: string): number {
  const x = normalizar(a);
  const y = normalizar(b);
  if (x === y) return 0;
  if (!x.length) return y.length;
  if (!y.length) return x.length;

  let anterior = Array.from({ length: y.length + 1 }, (_, i) => i);
  let atual = new Array<number>(y.length + 1);

  for (let i = 1; i <= x.length; i += 1) {
    atual[0] = i;
    for (let j = 1; j <= y.length; j += 1) {
      const custo = x[i - 1] === y[j - 1] ? 0 : 1;
      atual[j] = Math.min(atual[j - 1] + 1, anterior[j] + 1, anterior[j - 1] + custo);
    }
    [anterior, atual] = [atual, anterior];
  }

  return anterior[y.length];
}

/** Distância de edição normalizada pelo texto mais longo. 1 = idêntico. */
function similaridadeBruta(a: string, b: string): number {
  const maior = Math.max(normalizar(a).length, normalizar(b).length);
  if (maior === 0) return 1;
  return 1 - distancia(a, b) / maior;
}

/**
 * Palavras curtas de ligação não contam na comparação por token.
 *
 * "de", "do", "da" aparecem em quase todo nome composto e inflam a semelhança de coisas que nada
 * têm a ver — foi o que fez "Gestão **de** Contratos" e "Gestão **de** Produção" ficarem perto
 * demais na primeira calibração.
 */
function tokens(texto: string): string[] {
  return normalizar(texto)
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

/** Casamento de dois tokens: igual, um prefixo do outro (abreviação), ou distância de edição. */
function casarToken(a: string, b: string): number {
  if (a === b) return 1;
  if (a.startsWith(b) || b.startsWith(a)) return 0.9;
  return similaridadeBruta(a, b);
}

/**
 * Semelhança entre dois valores. 1 = idêntico, 0 = nada em comum.
 *
 * Combina duas leituras e fica com a maior:
 *
 * - **Caractere a caractere** (Levenshtein normalizado) — pega acento e erro de digitação:
 *   "Sao Paulo" × "São Paulo" = 1,00.
 * - **Token a token** — pega abreviação e nome que cresceu: "Gil do Vigor" × "Gilberto do Vigor"
 *   passa de 0,71 para 0,95, porque "gil" é prefixo de "gilberto".
 *
 * Sozinho, o Levenshtein não separava os casos: 0,71 para um par que **deve** alertar contra 0,63
 * para um que **não** deve. Margem apertada demais para escolher um limiar.
 */
export function similaridade(a: string, b: string): number {
  const bruta = similaridadeBruta(a, b);

  const tokensA = tokens(a);
  const tokensB = tokens(b);
  if (tokensA.length === 0 || tokensB.length === 0) return bruta;

  const [menor, maior] = tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];

  // Cada token do menor busca seu melhor par no maior.
  const soma = menor.reduce(
    (total, token) => total + Math.max(...maior.map((outro) => casarToken(token, outro))),
    0,
  );

  // Tokens sobrando no maior reduzem a confiança: "Helena Prado" × "Helena Prado Silva" é
  // provavelmente a mesma pessoa, mas menos certamente que "Helena Prado" × "Helena Pardo".
  const penalidade = 1 - ((maior.length - menor.length) / maior.length) * 0.3;

  return Math.max(bruta, (soma / menor.length) * penalidade);
}

/**
 * Limiar de "parecido demais para ser coincidência".
 *
 * Calibrado sobre os casos reais que a operação citou — ver `testeReferencias.mjs`, que trava
 * este número: pares que **devem** alertar ficam acima de 0,80; os que **não** devem, abaixo de
 * 0,67. O limiar mora nessa folga.
 *
 * Baixar mais produziria alerta em nome que só compartilha o sobrenome — e alerta que aparece
 * sempre é alerta que ninguém lê.
 */
export const LIMIAR_SEMELHANCA = 0.74;

export interface Semelhante {
  valor: string;
  similaridade: number;
}

/**
 * Valores existentes parecidos com o digitado — vazio quando há correspondência exata.
 *
 * Exata não é dúvida: se a pessoa escreveu exatamente o que existe, ela escolheu aquele.
 */
export function semelhantes(valor: string, opcoes: string[], limite = 3): Semelhante[] {
  const alvo = normalizar(valor);
  if (!alvo) return [];
  if (opcoes.some((opcao) => normalizar(opcao) === alvo)) return [];

  return opcoes
    .map((opcao) => ({ valor: opcao, similaridade: similaridade(valor, opcao) }))
    .filter((item) => item.similaridade >= LIMIAR_SEMELHANCA)
    .sort((a, b) => b.similaridade - a.similaridade)
    .slice(0, limite);
}

/**
 * Sugestões enquanto se digita.
 *
 * Quem começa com o termo vem antes de quem apenas o contém: digitar "mar" deve trazer "Marina"
 * na frente de "Ricardo Martins".
 */
export function sugestoes(termo: string, opcoes: string[], limite = 6): string[] {
  const alvo = normalizar(termo);
  const unicas = [...new Set(opcoes.filter((opcao) => opcao.trim()))];

  if (!alvo) return unicas.slice(0, limite);

  const comeca: string[] = [];
  const contem: string[] = [];

  for (const opcao of unicas) {
    const normalizada = normalizar(opcao);
    if (normalizada.startsWith(alvo)) comeca.push(opcao);
    else if (normalizada.includes(alvo)) contem.push(opcao);
  }

  return [...comeca, ...contem].slice(0, limite);
}

/**
 * Valores distintos já usados numa coluna — a fonte das sugestões.
 *
 * Agrupa por forma normalizada e devolve a **grafia mais frequente**. Se "São Paulo" aparece 8
 * vezes e "Sao Paulo" 1, a sugestão oferecida é a com acento: o que a maioria escreveu tende a
 * ser a forma correta, e assim a lista converge em vez de perpetuar o erro.
 */
export function valoresUsados(registros: Record<string, unknown>[], campo: string): string[] {
  const grupos = new Map<string, Map<string, number>>();

  for (const registro of registros) {
    const bruto = registro[campo];
    if (typeof bruto !== 'string') continue;
    const valor = bruto.trim();
    if (!valor) continue;

    const chave = normalizar(valor);
    const variantes = grupos.get(chave) ?? new Map<string, number>();
    variantes.set(valor, (variantes.get(valor) ?? 0) + 1);
    grupos.set(chave, variantes);
  }

  return [...grupos.values()]
    .map((variantes) => [...variantes.entries()].sort((a, b) => b[1] - a[1])[0][0])
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/**
 * Grafias divergentes de um mesmo valor já gravadas na base.
 *
 * Serve para a auditoria: mostra onde a coluna já tem "São Paulo" e "Sao Paulo" convivendo, para
 * que alguém decida qual fica. Só reporta grupos com mais de uma grafia.
 */
export function divergencias(
  registros: Record<string, unknown>[],
  campo: string,
): { normalizado: string; grafias: string[] }[] {
  const grupos = new Map<string, Set<string>>();

  for (const registro of registros) {
    const bruto = registro[campo];
    if (typeof bruto !== 'string') continue;
    const valor = bruto.trim();
    if (!valor) continue;

    const chave = normalizar(valor);
    const set = grupos.get(chave) ?? new Set<string>();
    set.add(valor);
    grupos.set(chave, set);
  }

  return [...grupos.entries()]
    .filter(([, grafias]) => grafias.size > 1)
    .map(([normalizado, grafias]) => ({ normalizado, grafias: [...grafias] }));
}
