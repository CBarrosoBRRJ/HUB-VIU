/**
 * A escala de texto, travada por teste — 11/08/2026.
 *
 * ## Por que um teste que lê arquivos, e não a tela
 *
 * Os outros testes desta pasta montam componentes e clicam neles. Este não: ele varre o código
 * fonte procurando **tamanho de fonte cravado em pixel**. É um teste de convenção, e existe porque
 * a convenção já foi quebrada uma vez — em silêncio, 202 vezes, ao longo de dez dias.
 *
 * Nenhum teste de comportamento pegaria isso. `text-[9px]` renderiza, clica, passa em tudo o que a
 * suíte verifica; o defeito só aparece na mesa de quem precisa aproximar o rosto do monitor para
 * ler o nome de uma coluna, ou de quem aumentou a fonte do sistema e não viu nada mudar.
 *
 * O custo de manter é uma linha por degrau novo. O custo de não manter é a escala derreter de volta
 * para pixel na primeira tela com pressa — que é exatamente como ela derreteu da primeira vez.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Todos os `.ts`/`.tsx` de `src/`, recursivamente. */
function fontes(diretorio = 'src'): string[] {
  return readdirSync(diretorio).flatMap((nome) => {
    const caminho = join(diretorio, nome);
    if (statSync(caminho).isDirectory()) return fontes(caminho);
    return /\.tsx?$/.test(nome) ? [caminho] : [];
  });
}

describe('a escala de texto', () => {
  it('não tem tamanho de fonte cravado em pixel', () => {
    /*
      `text-[13px]` e companhia ignoram a preferência de tamanho de fonte do sistema — quem
      aumentou a letra para conseguir enxergar não recebe nada. A escala do `index.css` é em `rem`
      justamente para acompanhá-la.
    */
    const infratores = fontes()
      .map((caminho) => ({ caminho, achados: readFileSync(caminho, 'utf8').match(/text-\[\d+px\]/g) }))
      .filter((item) => item.achados)
      .map((item) => `${item.caminho}: ${[...new Set(item.achados)].join(', ')}`);

    expect(infratores, 'use text-selo · text-rotulo · text-apoio · text-dado (ver index.css)')
      .toEqual([]);
  });

  it('declara os quatro degraus, na proporção que o layout assume', () => {
    const css = readFileSync('src/index.css', 'utf8');

    /*
      Os valores são **fixos**, e o teste os trava um a um de propósito.

      A tentativa de subi-los 1px cada (9→10, 10→11, 11→12) para "melhorar a legibilidade" estourou
      o layout: os contêineres — `w-64` da sidebar, `size-8` do avatar — escalam com a **raiz**, não
      com o degrau, então o texto engordou ~10% dentro da mesma caixa e a sidebar passou a cortar
      "Backlog de Agenciad…" e a quebrar "DONO DO SISTEMA" em duas linhas.

      Legibilidade se resolve na raiz fluida e na régua de Meu Perfil, que movem texto e caixa
      juntos. Estes quatro números são proporção interna do desenho — mexer neles isoladamente é
      quebrar a razão texto/caixa que toda tela assume.
    */
    const esperado: Record<string, number> = {
      '--text-selo': 0.5625,
      '--text-rotulo': 0.625,
      '--text-apoio': 0.6875,
      '--text-dado': 0.8125,
    };

    for (const [degrau, rem] of Object.entries(esperado)) {
      const valor = new RegExp(`${degrau}:\\s*([\\d.]+)rem`).exec(css);
      expect(valor, `${degrau} precisa estar declarado no @theme`).toBeTruthy();
      expect(
        Number(valor![1]),
        `${degrau} mudou — se é por legibilidade, o lugar é a raiz fluida, não o degrau`,
      ).toBe(rem);
    }
  });

  it('a régua da grade não produz texto ilegível em nenhuma camada', () => {
    const css = readFileSync('src/index.css', 'utf8');

    /*
      O caso que originou tudo isto.

      A grade não usa a escala: ela tem régua própria (`--texto-grade`, fluida) e cada camada
      desconta um degrau dela. Ninguém somava as duas coisas — e o cabeçalho de coluna, que é a
      régua menos o maior desconto, chegava a **7px** numa tela de notebook.

      Este teste faz a soma que faltava, e usa **dois pisos** porque as camadas não têm a mesma
      exigência:

      - o **dado** (menor fração) é texto de leitura, em caixa baixa, e tem o piso mais exigente;
      - o **cabeçalho e os selos** (maior fração) são caixa alta e negrito, lidos uma vez para
        localizar. A altura de maiúscula rende mais que a de um texto comum do mesmo corpo, e é
        por isso que eles toleram um piso mais baixo — ali, e só ali.

      Os dois pisos existem porque a primeira correção usou um só, de 10px para tudo, e o resultado
      foi uma grade inchada que a operação recusou na hora (ver `index.css`).
    */
    /*
      A régua é **constante** desde 11/08/2026, e o teste garante que ela continue assim.

      Ela era um `clamp` com `vh + vw` — media a janela por conta própria. Quando a raiz fluida
      assumiu a escala do produto inteiro, as duas camadas passaram a se somar: em 1024px a raiz já
      estava no piso e a régua encolhia de novo, jogando o dado para 8,5px. Uma camada de fluidez,
      não duas; toda variação por tela vem da raiz.
    */
    const reguaFixa = /--texto-grade:\s*([\d.]+)rem\s*;/.exec(css);
    expect(reguaFixa, 'a régua da grade precisa ser constante — a fluidez é da raiz').toBeTruthy();
    const reguaRem = Number(reguaFixa![1]);

    // As camadas são lidas **pelo nome**: é o que permite ao teste falar da hierarquia, e não de
    // um `Math.max` sobre números anônimos que não diz qual camada é qual.
    const fatores = ['cabecalho', 'dado', 'selo'].map((papel) => {
      const achado = new RegExp(`--fator-${papel}:\\s*([\\d.]+)`).exec(css);
      expect(achado, `--fator-${papel} precisa estar declarado`).toBeTruthy();
      return Number(achado![1]);
    });

    /*
      A conta roda nas **telas-alvo declaradas**, não no piso teórico do `clamp`.

      O piso só é alcançado em janelas abaixo de ~900px, fora dos alvos ([03 §1.2.5]); medir por ele
      reprovaria uma régua que na prática nunca produz aquele valor. Os alvos são os monitores
      reais da operação — foi neles que o cabeçalho de 7px apareceu, e é neles que o piso importa.
    */
    const raiz = (larguraPx: number) => Math.min(17.25, Math.max(16, 15.1 + 0.065 * larguraPx / 100));

    for (const largura of [1024, 1366, 1920, 2535]) {
      const r = raiz(largura);
      const valor = reguaRem * r;
      const [fatorCabecalho, fatorDado] = fatores;
      const rotulo = valor * fatorCabecalho;
      const dado = valor * fatorDado;

      /*
        O piso do dado voltou a 9,4px depois que a dupla fluidez saiu.

        Com a régua constante, a menor tela-alvo produz dado de 9,5px — antes eram 8,5px, porque a
        régua encolhia junto com a raiz. **Este é o número que a queixa "nas telas pequenas não dá
        para ver" derrubou**, e o piso existe para ele não voltar por descuido.

        **Os pisos subiram em 12/08/2026**, com a régua, e depois desceram na calibração: a
        primeira tentativa levou o dado a 11,0px e a operação achou grande. Ela devolveu os quatro
        números que queria, e o piso passou a ser **o valor que ela escolheu**, com margem de
        décimo — 9,9 no dado, 10,4 no cabeçalho.

        Estes números não são teoria, são veredito de tela. O que o piso protege é que ninguém
        volte abaixo deles por descuido: foi de ~10px que veio a queixa de "pixelado" no monitor
        grande, e a diferença entre 9,9 e o que havia antes está toda na régua, não no degrau.
      */
      expect(dado, `dado ficaria em ${dado.toFixed(1)}px em ${largura}px`).toBeGreaterThanOrEqual(9.9);
      /*
        O cabeçalho é caixa alta, então tolera mais — mas ele **sobe junto** com o dado, e não por
        conta própria: a régua é uma só, e a hierarquia entre as camadas é o que a operação pediu
        que não se perdesse ("mas que não fique maior que o header").
      */
      expect(rotulo, `cabeçalho ficaria em ${rotulo.toFixed(1)}px em ${largura}px`)
        .toBeGreaterThanOrEqual(10.4);
    }
  });

  it('o cabeçalho fica acima do dado — a hierarquia que a tabela sempre descreveu', () => {
    const css = readFileSync('src/index.css', 'utf8');
    const fator = (papel: string) =>
      Number(new RegExp(`--fator-${papel}:\\s*([\\d.]+)`).exec(css)![1]);

    /*
      A inversão de 11/08/2026, decidida pelo produto.

      O comentário da hierarquia sempre descreveu "dados menores que a placa que os nomeia", e o
      código entregava o contrário — divergência que sobreviveu oito dias porque a relação só
      existia somando `calc`s espalhados. Agora ela é uma comparação de dois números nomeados, e
      este teste é o que impede a volta silenciosa.

      A alternativa descartada foi a convenção de tabela (dado ≥ cabeçalho, como Monday e Excel):
      o produto preferiu a leitura estrutural, com o cabeçalho ancorando a coluna.
    */
    expect(fator('cabecalho'), 'o cabeçalho precisa ser MAIOR que o dado')
      .toBeGreaterThan(fator('dado'));
    expect(fator('dado'), 'o dado precisa ser maior que os selos')
      .toBeGreaterThan(fator('selo'));

    /*
      **O cabeçalho não se mexe para resolver isto.** Ele foi calibrado com a operação em
      −0.1875rem e aprovado; a inversão foi feita descendo o dado, e a primeira tentativa — subir o
      cabeçalho até passar o dado — foi recusada na hora ("antes o tamanho do header estava
      perfeito, era só diminuir os dados"). Este número trava o acerto.
    */
    expect(fator('cabecalho'), 'a fração do cabeçalho é calibrada — desça o dado, não suba ele')
      .toBe(0.769231);

    /*
      "Por pouco" é parte do pedido: a distância fica na faixa de 5% a 15%. Acima disso o rótulo
      em caixa alta domina a grade; abaixo, a inversão não se percebe e o custo de encolher o dado
      não compra nada.
    */
    /*
      A distância é medida **entre as frações**, e não entre dois pixels: foi assim que ela se
      perdeu. Com degraus subtrativos, subir a régua mantinha o vão absoluto e diluía a proporção —
      a mesma queixa de legibilidade que subiu a régua derrubou a hierarquia junto, sem que nada na
      declaração mudasse. Fração contra fração, o número aqui é o mesmo em qualquer régua.
    */
    const distancia = (fator('cabecalho') - fator('dado')) / fator('cabecalho');

    expect(distancia, `${(distancia * 100).toFixed(0)}% entre cabeçalho e dado`)
      .toBeGreaterThanOrEqual(0.05);
    expect(distancia, `${(distancia * 100).toFixed(0)}% entre cabeçalho e dado`)
      .toBeLessThanOrEqual(0.15);
  });

  it('o nome do projeto continua no topo da hierarquia', () => {
    const css = readFileSync('src/index.css', 'utf8');
    /*
      Ele identifica a linha — é o que se procura ao varrer a lista. A inversão trocou a ordem
      entre cabeçalho e dado; deixar o rótulo da coluna passar o nome do projeto trocaria o "o quê"
      pelo "onde", que é outra coisa.
    */
    expect(css, 'a coluna do projeto usa a régua cheia, sem desconto')
      .toMatch(/\.grade-fluida td\.col-projeto[\s\S]{0,120}font-size:\s*var\(--texto-grade\)/);
  });
});

describe('a raiz acompanha a tela', () => {
  it('escala com a largura, sem encolher abaixo do desenho nem virar zoom', () => {
    const css = readFileSync('src/index.css', 'utf8');

    /*
      A validação nos quatro monitores da operação (1051 a 2535px) mostrou o texto batendo num
      teto fixo e ficando proporcionalmente minúsculo nas telas grandes. A correção é a raiz
      fluida — e este teste garante as duas pontas dela:

      - **piso ≥ 16px**: tela pequena mantém o desenho aprovado; a escala nunca encolhe o produto;
      - **teto ≤ 20px**: monitor grande cresce até o legível e para — "que não fique imenso".
    */
    // O `calc(... * var(--texto-pessoal, 1))` é a preferência por pessoa — ver `utils/aparencia.ts`.
    const raiz = /html\s*\{\s*font-size:\s*calc\(clamp\(\s*([\d.]+)px\s*,[^,]+,\s*([\d.]+)px\s*\)\s*\*\s*var\(--texto-pessoal,\s*1\)\)/.exec(css);
    expect(raiz, 'a raiz precisa da escala fluida multiplicada por --texto-pessoal').toBeTruthy();

    expect(Number(raiz![1]), 'o piso da raiz encolheria o desenho aprovado').toBeGreaterThanOrEqual(16);
    /*
      O teto caiu de 19 para 17,25 em 11/08/2026, por bissecção com a operação: 16 fixo foi
      "pequeno" e 19 foi "imenso" na mesma tela. O guarda agora aperta dos dois lados — um teto
      acima de 18 já é o valor que foi recusado.
    */
    expect(Number(raiz![2]), 'o teto da raiz viraria zoom').toBeLessThanOrEqual(18);
  });

  it('a preferência pessoal é conforto, não zoom', () => {
    const fonte = readFileSync('src/utils/aparencia.ts', 'utf8');

    // A faixa da régua: além de ±15% é zoom, e zoom é papel do navegador.
    const faixa = /min:\s*([\d.]+),\s*max:\s*([\d.]+)/.exec(fonte);
    expect(faixa, 'FAIXA_FATOR precisa estar declarada').toBeTruthy();
    expect(Number(faixa![1])).toBeGreaterThanOrEqual(0.85);
    expect(Number(faixa![2])).toBeLessThanOrEqual(1.2);

    // Os atalhos vivem dentro da faixa, e o Padrão é exatamente a curva calibrada.
    const fatores = [...fonte.matchAll(/fator:\s*([\d.]+)/g)].map((m) => Number(m[1]));
    expect(fatores.length, 'os três atalhos precisam existir').toBe(3);
    for (const fator of fatores) {
      expect(fator).toBeGreaterThanOrEqual(Number(faixa![1]));
      expect(fator).toBeLessThanOrEqual(Number(faixa![2]));
    }
    expect(fatores, 'o Padrão precisa ser exatamente a curva calibrada').toContain(1);
  });
});

describe('a legibilidade não depende da rede nem do sistema', () => {
  it('toda pilha de fonte tem alternativa nomeada para Windows, Mac e Linux', () => {
    const css = readFileSync('src/index.css', 'utf8');
    /*
      As fontes vêm do Google Fonts. Se a rede corporativa bloquear o domínio, o navegador cai na
      pilha — e com `system-ui` sozinho cada sistema resolve para uma fonte de métrica diferente,
      num layout calculado para nenhuma delas.
    */
    for (const alternativa of ['Segoe UI', 'BlinkMacSystemFont', 'Roboto']) {
      expect(css, `falta "${alternativa}" na pilha de fontes`).toContain(alternativa);
    }
  });

  it('respeita a preferência de movimento reduzido do sistema', () => {
    const css = readFileSync('src/index.css', 'utf8');
    expect(css).toContain('prefers-reduced-motion');

    // A outra metade: o `motion` anima em JavaScript e escapa do CSS.
    const app = readFileSync('src/App.tsx', 'utf8');
    expect(app).toContain('reducedMotion="user"');
  });
});
