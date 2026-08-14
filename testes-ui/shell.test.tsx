/**
 * A camada de emergência do shell, travada por convenção — 14/08/2026.
 *
 * ## O contrato que este arquivo guarda
 *
 * *"Fixa enquanto cabe, rolando quando não cabe — e a barra mora na folha."* Aprovado pela
 * operação em 14/08, depois do reporte de que a área de trabalho amputava o que excedesse a tela:
 * rodapé, botões e linhas ficavam **inalcançáveis**, sem barra nenhuma para chegar até eles.
 *
 * O jsdom não faz layout — não dá para medir rolagem de verdade aqui (isso é papel do Chrome
 * headless nas verificações manuais). O que dá para travar é a **estrutura** de que o mecanismo
 * depende, que é exatamente o que um refactor descuidado desfaria:
 *
 * 1. a folha (`main` do App) rola no eixo Y — é o único scroller de emergência;
 * 2. nenhuma página de quadro trava a própria altura (`overflow-hidden` na raiz era o amputador);
 * 3. toda grade tem piso (`min-h-52`) — sem ele, a área colapsa a zero e nada excede, então nada
 *    rola e o defeito volta em silêncio.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

describe('a camada de emergência do shell', () => {
  it('a folha é o único scroller de emergência', () => {
    const app = readFileSync('src/App.tsx', 'utf8');

    expect(app, 'o main rola no eixo Y quando o conteúdo não cabe')
      .toMatch(/<main[^>]*overflow-y-auto/);
    expect(app, 'e nunca no X — rolagem lateral é assunto interno de cada grade')
      .toMatch(/<main[^>]*overflow-x-hidden/);
  });

  it('nenhuma página de quadro amputa a própria altura', () => {
    /*
      `overflow-hidden` na raiz da página era o amputador: com a folha fixa, o excedente era
      cortado sem barra. `min-h-full` é o substituto — estica até a folha quando sobra espaço,
      cresce além dela quando falta.
    */
    const paginas = readdirSync('src/pages').filter((n) => n.endsWith('.tsx'));
    const infratores: string[] = [];

    for (const pagina of paginas) {
      const codigo = readFileSync(join('src/pages', pagina), 'utf8');
      // As rotas públicas (convite, confirmação) têm layout próprio de página inteira — fora.
      if (!codigo.includes('<Header')) continue;
      if (codigo.includes('"flex flex-1 flex-col overflow-hidden"')) infratores.push(pagina);
      if (!codigo.includes('min-h-full')) infratores.push(`${pagina}: sem min-h-full`);
    }

    expect(infratores, 'página de quadro que volta a travar a altura reabre o defeito').toEqual([]);
  });

  it('toda grade tem o piso que faz a rolagem de emergência existir', () => {
    const grades = [
      'src/components/backlog/BacklogTable.tsx',
      'src/components/talentos/ContratosTable.tsx',
      'src/components/talentos-exclusivos/TalentosTable.tsx',
    ];
    const semPiso = grades.filter((g) => !readFileSync(g, 'utf8').includes('min-h-52'));

    expect(semPiso, 'grade sem piso colapsa a zero e o excedente volta a ser amputado').toEqual([]);

    /*
      **O card usa `overflow-clip`, nunca `overflow-hidden`** — 14/08/2026. Os dois cortam o canto
      arredondado igual; a diferença é que `hidden` cria scroll container, e isso quebra DUAS
      coisas ao mesmo tempo: prende o `sticky` da barra de colunas ao card (que não rola) e amputa
      o excedente antes de a folha ter o que rolar. Foi o furo que a barra na dobra revelou.
    */
    for (const grade of grades) {
      const codigo = readFileSync(grade, 'utf8');
      expect(codigo, `${grade}: o card não pode voltar a ser scroll container`)
        .not.toMatch(/flex-col overflow-hidden rounded-2xl/);
      expect(codigo, `${grade}: o clip corta o canto sem prender o sticky`)
        .toContain('overflow-clip rounded-2xl');
      expect(codigo, `${grade}: a barra de colunas mora na dobra`)
        .toContain('BarraRolagemHorizontal');
      /*
        A nativa some por GEOMETRIA (scroller 17px mais alto que o wrapper `overflow-clip`), não
        por CSS de scrollbar: no Chrome ≥121, `scrollbar-width` definido desliga os pseudo webkit,
        e a regra que escondia por pseudo falhou em silêncio — a operação viu as duas barras.
      */
      expect(codigo, `${grade}: a nativa horizontal é clipada por geometria`)
        .toContain('h-[calc(100%+17px)]');
      expect(codigo, `${grade}: e nenhuma regra morta de pseudo volta a prometer o esconder`)
        .not.toContain('sem-barra-horizontal');
    }
  });
});
