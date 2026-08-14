import { RefObject, useEffect, useRef, useState } from 'react';

/**
 * A barra horizontal da grade, grudada na dobra — 14/08/2026.
 *
 * ## O reporte
 *
 * A barra horizontal nativa mora na base do contêiner de rolagem — e desde que a folha rola quando
 * não cabe, essa base pode estar **abaixo da dobra**: para deslocar as colunas, a pessoa rolava
 * verticalmente até o fundo, usava a barra e voltava. *"Ela fica lá embaixo, obrigando o usuário a
 * descer muito até acessá-la."*
 *
 * ## O desenho
 *
 * A barra nativa horizontal é escondida (`.sem-barra-horizontal`, no `index.css`) e este espelho
 * assume o papel dela, com `position: sticky; bottom: 0`: gruda na base do que está **visível**
 * enquanto a grade atravessa a tela, e assenta no lugar natural quando o fundo chega. Quando tudo
 * cabe, ele fica exatamente onde a nativa ficaria — ninguém nota a troca.
 *
 * É o padrão das ferramentas que a operação já usa (Airtable, Monday): a barra de colunas
 * acompanha a viewport, não o conteúdo.
 *
 * A alternativa debatida e descartada foi **paginação**: ela ataca a rolagem vertical, e o
 * problema é o acesso à horizontal — numa tabela paginada, as 70 colunas continuam existindo e a
 * barra continuaria na base da página N. Paginação/virtualização seguem no débito nº 5, como
 * decisão futura de **performance**, não de navegação.
 *
 * ## Os dois cuidados do espelhamento
 *
 * - **sem loop**: cada lado só escreve quando o valor difere — atribuir `scrollLeft` igual não
 *   dispara evento, então a igualdade é o freio;
 * - **largura viva**: a tabela muda de largura com abas e colunas ocultas; o `ResizeObserver`
 *   refaz a medida. Ele não existe no jsdom, e o componente se degrada para uma medida única —
 *   os testes de comportamento não dependem dele.
 */
export function BarraRolagemHorizontal({ alvoRef }: { alvoRef: RefObject<HTMLDivElement | null> }) {
  const espelhoRef = useRef<HTMLDivElement>(null);
  const [larguraConteudo, setLarguraConteudo] = useState(0);
  const [temOverflow, setTemOverflow] = useState(false);

  useEffect(() => {
    const alvo = alvoRef.current;
    const espelho = espelhoRef.current;
    if (!alvo || !espelho) return;

    function medir() {
      if (!alvo) return;
      setLarguraConteudo(alvo.scrollWidth);
      // +1 tolera arredondamento de zoom fracionário — meia coluna de folga não é overflow.
      setTemOverflow(alvo.scrollWidth > alvo.clientWidth + 1);
    }
    medir();

    const observador =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null;
    observador?.observe(alvo);
    if (alvo.firstElementChild) observador?.observe(alvo.firstElementChild);

    function doAlvo() {
      if (espelho && alvo && espelho.scrollLeft !== alvo.scrollLeft) {
        espelho.scrollLeft = alvo.scrollLeft;
      }
    }
    function doEspelho() {
      if (espelho && alvo && alvo.scrollLeft !== espelho.scrollLeft) {
        alvo.scrollLeft = espelho.scrollLeft;
      }
    }
    alvo.addEventListener('scroll', doAlvo, { passive: true });
    espelho.addEventListener('scroll', doEspelho, { passive: true });

    return () => {
      observador?.disconnect();
      alvo.removeEventListener('scroll', doAlvo);
      espelho.removeEventListener('scroll', doEspelho);
    };
  }, [alvoRef]);

  return (
    /*
      `sticky bottom-0` ancora no scrollport da FOLHA — e é por isso que o card da grade usa
      `overflow-clip`, não `overflow-hidden`: os dois cortam o canto arredondado igual, mas o
      `hidden` cria um scroll container e prenderia o sticky ao card, que não rola.

      O fundo branco existe para o thumb não flutuar sobre o texto das linhas quando grudado.
    */
    <div
      data-testid="barra-de-colunas"
      className={`sticky bottom-0 z-10 shrink-0 border-t border-slate-100 bg-white ${temOverflow ? '' : 'hidden'}`}
    >
      <div ref={espelhoRef} className="barra-de-colunas overflow-x-auto overflow-y-hidden py-1">
        <div style={{ width: larguraConteudo }} className="h-px" />
      </div>
    </div>
  );
}
