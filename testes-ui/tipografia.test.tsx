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

  it('declara os quatro degraus, e nenhum abaixo de 10px', () => {
    const css = readFileSync('src/index.css', 'utf8');
    const degraus = ['--text-selo', '--text-rotulo', '--text-apoio', '--text-dado'];

    for (const degrau of degraus) {
      const valor = new RegExp(`${degrau}:\\s*([\\d.]+)rem`).exec(css);
      expect(valor, `${degrau} precisa estar declarado no @theme`).toBeTruthy();

      /*
        O piso de 10px não é gosto: abaixo disso o texto deixa de ser lido e passa a ser
        reconhecido pelo formato — e um rótulo que se adivinha não é rótulo.
      */
      const px = Number(valor![1]) * 16;
      expect(px, `${degrau} está em ${px}px`).toBeGreaterThanOrEqual(10);
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
    const piso = /--texto-grade:\s*clamp\(\s*([\d.]+)rem/.exec(css);
    expect(piso, 'a régua da grade precisa de um piso no clamp').toBeTruthy();

    const descontos = [...css.matchAll(/var\(--texto-grade\)\s*-\s*([\d.]+)rem/g)]
      .map((m) => Number(m[1]));
    expect(descontos.length, 'os degraus da grade precisam existir').toBeGreaterThan(0);

    const base = Number(piso![1]) * 16;
    const dado = base - Math.min(...descontos) * 16;
    const rotulo = base - Math.max(...descontos) * 16;

    expect(dado, `o dado da célula ficaria em ${dado}px`).toBeGreaterThanOrEqual(10);
    expect(rotulo, `o cabeçalho ficaria em ${rotulo}px`).toBeGreaterThanOrEqual(9);
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
