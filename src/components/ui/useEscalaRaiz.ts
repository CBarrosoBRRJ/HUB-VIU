import { useEffect, useState } from 'react';
import { EVENTO_RAIZ } from '../../utils/aparencia';

/**
 * O fator da raiz fluida — quanto o `html { font-size: clamp(...) }` está ampliando o texto.
 *
 * ## Por que a grade precisa disto
 *
 * A raiz fluida ([03 §1.2.5](../../../prd/03_padroes_ui.md)) fez o texto crescer com a tela:
 * +19% num monitor de 2535px. Mas a grade do Backlog calcula **tudo em pixel** — largura de
 * coluna, `left` das congeladas, posição de scroll de cada seção — e esse contrato é deliberado:
 * com `table-layout: fixed`, a soma das larguras declaradas É a realidade, "exato por construção".
 *
 * O texto cresceu; as caixas de pixel, não. O resultado foi a operação vendo palavra comida em
 * coluna que antes cabia.
 *
 * ## Por que multiplicar na fonte, e não trocar os px por rem
 *
 * Trocar as larguras por `rem` resolveria as células e **quebraria o scroll**: `scrollTo` fala
 * pixel, e a posição de cada seção é a soma das larguras anteriores. Com larguras em rem, a soma
 * computada em px divergiria da realidade nas telas ampliadas — que é exatamente o defeito que o
 * cálculo "por construção" existe para impedir (reporte da operação, 04/08/2026).
 *
 * Multiplicando **todas** as larguras pelo mesmo fator, na fonte, a aritmética inteira continua
 * exata: célula, `left` e scroll crescem juntos, e a grade nas telas grandes fica idêntica à da
 * tela de calibração — só que maior.
 *
 * ## Comportamento
 *
 * Devolve `1` quando a raiz está nos 16px de calibração (e no jsdom, onde o CSS não é aplicado —
 * os testes medem o desenho de calibração). Reage a `resize` porque a raiz é `vw`: redimensionar
 * a janela muda o fator.
 */
function medir(): number {
  if (typeof window === 'undefined') return 1;
  const bruto = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(bruto) && bruto > 0 ? bruto / 16 : 1;
}

export function useEscalaRaiz(): number {
  const [fator, setFator] = useState(medir);

  /*
    Dois gatilhos, porque a raiz muda por dois caminhos: `resize` (a curva é `vw`) e o tamanho de
    texto escolhido em Meu Perfil, que troca `--texto-pessoal` **sem** redimensionar nada — daí o
    evento próprio (`EVENTO_RAIZ`, disparado por `utils/aparencia.ts`). Sem o segundo, as larguras
    da grade ficariam medidas na raiz antiga até o próximo resize.
  */
  useEffect(() => {
    function remedir() {
      setFator(medir());
    }
    window.addEventListener('resize', remedir);
    window.addEventListener(EVENTO_RAIZ, remedir);
    return () => {
      window.removeEventListener('resize', remedir);
      window.removeEventListener(EVENTO_RAIZ, remedir);
    };
  }, []);

  return fator;
}
