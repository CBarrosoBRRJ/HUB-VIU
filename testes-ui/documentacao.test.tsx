/**
 * O PRD é conferido contra o código — 12/08/2026.
 *
 * ## Por que este teste existe
 *
 * A operação perguntou, no fim de um dia de dezesseis mudanças: *"o PRD está atualizado com a
 * realidade?"*. A resposta honesta foi **não** — e o que estava errado não eram as seções que
 * tinham mudado (essas foram reescritas junto com o código), eram os **agregados e as citações
 * espalhadas**: contagens de teste em quatro lugares, todas diferentes; uma tabela de cores
 * apontando para uma classe que tinha saído naquela tarde; um débito técnico dizendo que o projeto
 * não estava versionado, horas depois de ele estar.
 *
 * Nenhuma dessas coisas quebra o build. Documentação errada não falha em lugar nenhum — ela só
 * engana quem chega depois, que é o pior tipo de defeito porque não deixa rastro.
 *
 * ## O que ele verifica, e o que não verifica
 *
 * Ele checa o que é **mecanicamente verificável**: link que aponta para arquivo que não existe,
 * variável CSS citada que ninguém declara, símbolo de código citado que sumiu do repositório,
 * documento sem versão ou data. Não checa se o texto está certo — isso continua sendo trabalho de
 * quem escreve.
 *
 * É pouco, e é exatamente o que basta: as três desatualizações que a operação sofreu eram todas
 * desta natureza.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, normalize } from 'node:path';

const DOCS = readdirSync('prd').filter((n) => n.endsWith('.md'));

/** Todo o código do repositório — fonte, testes e esquema. */
function arquivosDeCodigo(): string[] {
  const raizes = ['src', 'testes-regras', 'testes-ui', 'prisma'];
  const achados: string[] = [];

  function varrer(dir: string) {
    for (const nome of readdirSync(dir)) {
      const caminho = join(dir, nome);
      /*
        `testes-regras/utils` e `/data` são o JavaScript **compilado** de `src/` — incluí-los faria
        o teste enxergar como "existente" um símbolo que só sobrevive numa build antiga.
      */
      if (statSync(caminho).isDirectory()) {
        if (dir === 'testes-regras' && (nome === 'utils' || nome === 'data')) continue;
        varrer(caminho);
      } else if (/\.(ts|tsx|css|mjs|prisma)$/.test(nome)) {
        achados.push(caminho);
      }
    }
  }

  raizes.filter(existsSync).forEach(varrer);
  return achados;
}

const CODIGO = (() => {
  const arquivos = arquivosDeCodigo();
  const extras = ['tsconfig.json', 'vite.config.ts', 'package.json', 'index.html'].filter(existsSync);
  // O **nome** do arquivo conta: `testeFluxo` existe por ser `testeFluxo.mjs`, não por estar escrito dentro dele.
  return [...arquivos, ...extras].map((a) => readFileSync(a, 'utf8')).join('\n')
    + '\n' + [...arquivos, ...extras].join('\n');
})();

describe('o PRD aponta para código que existe', () => {
  it('não tem link quebrado', () => {
    const quebrados: string[] = [];

    for (const doc of DOCS) {
      const texto = readFileSync(join('prd', doc), 'utf8');
      // Links para o código (`../src/...`) e entre documentos (`08_backlog....md`).
      const alvos = [
        ...[...texto.matchAll(/\]\((\.\.\/[^)#]+)\)/g)].map((m) => join('prd', m[1])),
        ...[...texto.matchAll(/\]\((\d\d_[^)#]+\.md)[^)]*\)/g)].map((m) => join('prd', m[1])),
      ];
      alvos.filter((alvo) => !existsSync(normalize(alvo)))
        .forEach((alvo) => quebrados.push(`${doc} -> ${alvo}`));
    }

    expect(quebrados, 'link do PRD para arquivo inexistente').toEqual([]);
  });

  it('não cita variável CSS que ninguém declara', () => {
    const css = readFileSync('src/index.css', 'utf8');
    const declaradas = new Set([...css.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((m) => m[1]));
    /*
      `--texto-pessoal` é a régua de Meu Perfil: quem a declara é `aparencia.ts`, em tempo de
      execução, no `documentElement`. O CSS só a **lê**, com valor padrão.
    */
    const emTempoDeExecucao = new Set(['--texto-pessoal']);

    const fantasmas: string[] = [];
    for (const doc of DOCS) {
      const texto = readFileSync(join('prd', doc), 'utf8');
      for (const [, prop] of texto.matchAll(/`(--[a-z0-9-]+)`/g)) {
        // `--to-schema` e afins são bandeiras de linha de comando, não CSS.
        if (prop.startsWith('--to-') || emTempoDeExecucao.has(prop) || declaradas.has(prop)) continue;
        fantasmas.push(`${doc}: ${prop}`);
      }
    }

    expect([...new Set(fantasmas)], 'variável CSS citada que não existe no index.css').toEqual([]);
  });

  it('não cita símbolo de código que saiu do repositório', () => {
    /*
      Pega o que **parece** identificador: `camelCase` com maiúscula interna, ou `SCREAMING_SNAKE`.
      Nome de uma palavra só (`carregar`, `duplicar`) fica de fora de propósito — colide com
      português corrente e encheria o teste de falso positivo.
    */
    const PADRAO = /`([a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*|[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+)`/g;

    /** Nomes de plataforma, biblioteca e sigla — não são código deste repositório. */
    const EXTERNOS = new Set([
      'localStorage', 'sessionStorage', 'querySelector', 'querySelectorAll', 'useState', 'useEffect',
      'useMemo', 'useRef', 'useCallback', 'useLayoutEffect', 'setTimeout', 'clearTimeout',
      'addEventListener', 'removeEventListener', 'preventDefault', 'stopPropagation', 'getItem',
      'setItem', 'removeItem', 'toFixed', 'toLowerCase', 'toUpperCase', 'parseFloat', 'parseInt',
      'isArray', 'toISOString', 'getTime', 'replaceState', 'pushState', 'scrollTo', 'scrollIntoView',
      'getBoundingClientRect', 'createPortal', 'toLocaleDateString', 'toLocaleString', 'toBeTruthy',
      'JSON', 'NaN', 'URL', 'API', 'CPF', 'CNPJ', 'SLA', 'UI', 'CSS', 'HTML', 'PRD', 'ISO', 'SSO',
      'CI', 'PPI', 'OKLCH', 'AA', 'WCAG', 'PDF', 'CGA', 'GP', 'TV', 'VIU', 'JIT', 'DOM', 'React',
      'Date', 'Set', 'Map', 'Math', 'Object', 'Array', 'Promise', 'Intl', 'window', 'document',
      'process', 'ExcelJS', 'Prisma', 'Vitest', 'TypeScript', 'JavaScript', 'PostgreSQL', 'Excel',
      'setState', 'useSyncExternalStore', 'StrictMode',
    ]);

    /*
      **Nomes que o PRD cita porque foram removidos.** Cada um é uma decisão registrada, e o texto
      em volta diz que eles não existem mais — apagar a menção apagaria a explicação de por quê.
      A lista é o custo de manter essa memória, e é curta de propósito: se crescer, é sinal de que o
      PRD virou arquivo morto em vez de documento.
    */
    const REMOVIDOS_DE_PROPOSITO = new Set([
      'AREA_DA_ABA', 'alcanceEstimado', 'publicoAlvo', 'statusJuridico', 'comNome', 'posicaoDoNome',
    ]);

    const sumidos = new Map<string, Set<string>>();
    for (const doc of DOCS) {
      const texto = readFileSync(join('prd', doc), 'utf8');
      for (const [, nome] of texto.matchAll(PADRAO)) {
        if (EXTERNOS.has(nome) || REMOVIDOS_DE_PROPOSITO.has(nome) || nome.length < 4) continue;
        if (new RegExp(`\\b${nome}\\b`).test(CODIGO)) continue;
        if (!sumidos.has(nome)) sumidos.set(nome, new Set());
        sumidos.get(nome)!.add(doc);
      }
    }

    const relato = [...sumidos].map(([nome, docs]) => `${nome} (${[...docs].join(', ')})`);
    expect(relato, 'o PRD cita símbolo que não existe mais no repositório').toEqual([]);
  });

  it('todo documento se identifica com versão e data', () => {
    /*
      Sem isto não há como saber se uma seção é decisão vigente ou registro de algo que mudou. O
      README é índice, não documento de decisão — e por isso carrega só a data.
    */
    const semCabecalho: string[] = [];

    for (const doc of DOCS) {
      const cabecalho = readFileSync(join('prd', doc), 'utf8').split('\n').slice(0, 6).join('\n');
      const ehIndice = doc === 'README.md';
      if (!ehIndice && !/\*\*Versão:\*\*/.test(cabecalho)) semCabecalho.push(`${doc}: sem versão`);
      if (!/\*\*(Data|Atualizado):\*\*\s*\d\d\/\d\d\/\d{4}/.test(cabecalho)) {
        semCabecalho.push(`${doc}: sem data`);
      }
    }

    expect(semCabecalho, 'documento sem versão ou data no cabeçalho').toEqual([]);
  });
});
