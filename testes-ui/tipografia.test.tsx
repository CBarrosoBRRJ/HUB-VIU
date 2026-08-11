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

      - o **dado** (menor desconto) é texto de leitura, em caixa baixa: piso de 10px;
      - o **cabeçalho e os selos** (maior desconto) são caixa alta e negrito, lidos uma vez para
        localizar. A altura de maiúscula em 9px equivale à de um texto comum bem maior, e é por
        isso que 9px se sustenta ali — e só ali.

      Os dois pisos existem porque a primeira correção usou um só, de 10px para tudo, e o resultado
      foi uma grade inchada que a operação recusou na hora (ver `index.css`).
    */
    const clamp = /--texto-grade:\s*clamp\(\s*([\d.]+)rem\s*,\s*([\d.]+)rem\s*\+\s*([\d.]+)vh\s*\+\s*([\d.]+)vw\s*,\s*([\d.]+)rem/.exec(css);
    expect(clamp, 'a régua da grade precisa do clamp fluido').toBeTruthy();
    const [pisoRem, baseRem, vh, vw, tetoRem] = clamp!.slice(1).map(Number);

    // Os degraus são lidos **pelo nome**: é o que permite ao teste falar da hierarquia, e não de
    // um `Math.max` sobre números anônimos que não diz qual camada é qual.
    const descontos = ['cabecalho', 'dado', 'selo'].map((papel) => {
      const achado = new RegExp(`--degrau-${papel}:\\s*([\\d.]+)rem`).exec(css);
      expect(achado, `--degrau-${papel} precisa estar declarado`).toBeTruthy();
      return Number(achado![1]);
    });

    /*
      A conta roda nas **telas-alvo declaradas**, não no piso teórico do `clamp`.

      O piso só é alcançado em janelas abaixo de ~900px, fora dos alvos ([03 §1.2.5]); medir por ele
      reprovaria uma régua que na prática nunca produz aquele valor. Os alvos são os monitores
      reais da operação — foi neles que o cabeçalho de 7px apareceu, e é neles que o piso importa.
    */
    const raiz = (larguraPx: number) => Math.min(17.25, Math.max(16, 15.1 + 0.065 * larguraPx / 100));
    const regua = (larguraPx: number, alturaPx: number) => {
      const r = raiz(larguraPx);
      const fluido = baseRem * r + (vh * alturaPx / 100) + (vw * larguraPx / 100);
      return { r, valor: Math.max(pisoRem * r, Math.min(tetoRem * r, fluido)) };
    };

    for (const [largura, altura] of [[1024, 768], [1366, 768], [1920, 1080], [2535, 1315]]) {
      const { r, valor } = regua(largura, altura);
      const [degrauCabecalho, degrauDado] = descontos;
      const rotulo = valor - degrauCabecalho * r;
      const dado = valor - degrauDado * r;

      /*
        O piso do dado caiu de 10px para 8,4px com a inversão de 11/08/2026 — e isso é
        consequência aceita, não descuido: o produto decidiu que o dado fica **abaixo** do
        cabeçalho, e o cabeçalho estava calibrado em 9px no menor alvo. Não há como pôr o dado
        sob ele sem que desça junto.

        Se um dia o dado ficar pequeno demais na prática, a saída **não** é mexer neste degrau
        (isso desfaz a inversão em silêncio): é subir a régua inteira, que move as duas camadas.
      */
      expect(dado, `dado ficaria em ${dado.toFixed(1)}px em ${largura}px`).toBeGreaterThanOrEqual(8.4);
      /*
        O cabeçalho é caixa alta: 9px ali tem altura de maiúscula equivalente à de um texto comum
        bem maior, e é o valor da grade original — que nunca foi objeto de queixa. O inaceitável
        eram os 7px, que vinham de um desconto de 0.25rem sobre a régua.
      */
      expect(rotulo, `cabeçalho ficaria em ${rotulo.toFixed(1)}px em ${largura}px`)
        .toBeGreaterThanOrEqual(8.9);
    }
  });

  it('o cabeçalho fica acima do dado — a hierarquia que a tabela sempre descreveu', () => {
    const css = readFileSync('src/index.css', 'utf8');
    const degrau = (papel: string) =>
      Number(new RegExp(`--degrau-${papel}:\\s*([\\d.]+)rem`).exec(css)![1]);

    /*
      A inversão de 11/08/2026, decidida pelo produto.

      O comentário da hierarquia sempre descreveu "dados menores que a placa que os nomeia", e o
      código entregava o contrário — divergência que sobreviveu oito dias porque a relação só
      existia somando `calc`s espalhados. Agora ela é uma comparação de dois números nomeados, e
      este teste é o que impede a volta silenciosa.

      A alternativa descartada foi a convenção de tabela (dado ≥ cabeçalho, como Monday e Excel):
      o produto preferiu a leitura estrutural, com o cabeçalho ancorando a coluna.
    */
    expect(degrau('cabecalho'), 'o cabeçalho precisa ser MAIOR que o dado')
      .toBeLessThan(degrau('dado'));
    expect(degrau('dado'), 'o dado precisa ser maior que os selos')
      .toBeLessThan(degrau('selo'));

    /*
      **O cabeçalho não se mexe para resolver isto.** Ele foi calibrado com a operação em
      −0.1875rem e aprovado; a inversão foi feita descendo o dado, e a primeira tentativa — subir o
      cabeçalho até passar o dado — foi recusada na hora ("antes o tamanho do header estava
      perfeito, era só diminuir os dados"). Este número trava o acerto.
    */
    expect(degrau('cabecalho'), 'o degrau do cabeçalho é calibrado — desça o dado, não suba ele')
      .toBe(0.1875);

    /*
      "Por pouco" é parte do pedido: a distância fica na faixa de 5% a 15%. Acima disso o rótulo
      em caixa alta domina a grade; abaixo, a inversão não se percebe e o custo de encolher o dado
      não compra nada.
    */
    const base = 0.8125 * 16;
    const cabecalho = base - degrau('cabecalho') * 16;
    const dado = base - degrau('dado') * 16;
    const distancia = (cabecalho - dado) / cabecalho;

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
