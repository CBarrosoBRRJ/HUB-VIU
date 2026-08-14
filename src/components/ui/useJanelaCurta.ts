import { useEffect, useState } from 'react';

/**
 * Altura de janela abaixo da qual a página entra em **modo econômico de altura** — 14/08/2026.
 *
 * ## De onde sai o número
 *
 * A moldura acima de uma grade custa ~585px com o mapa do processo aberto (cabeçalho, mapa, abas,
 * ações, cabeçalho de colunas e rodapé). Quatro linhas custam ~208px. Abaixo de ~793px a lista
 * fica com menos de quatro linhas — e uma lista de trabalho com três linhas não é uma lista.
 *
 * Arredondado para 820: a conta é estimativa, e arredondar para cima erra do lado seguro.
 *
 * ## Um número, dois efeitos
 *
 * O mesmo limiar governa o cabeçalho compacto e o mapa recolhido, de propósito. São duas respostas
 * à mesma pergunta — *"cabe?"* —, e dois números para uma pergunta só produziriam a faixa
 * intermediária onde um cede e o outro não, que ninguém saberia explicar.
 */
export const ALTURA_CONFORTAVEL = 820;

/**
 * A janela é curta o bastante para a página economizar altura?
 *
 * Reage ao redimensionamento: quem arrasta a janela vê o cabeçalho encolher na hora. É a diferença
 * entre uma regra de layout e uma decisão tomada uma vez na carga — e quem trabalha com a janela
 * dividida ao lado de outra coisa passa o dia nessa faixa.
 */
export function useJanelaCurta(): boolean {
  const [curta, setCurta] = useState(() => window.innerHeight < ALTURA_CONFORTAVEL);

  useEffect(() => {
    function medir() {
      setCurta(window.innerHeight < ALTURA_CONFORTAVEL);
    }
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  return curta;
}
