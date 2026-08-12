/**
 * "Ver como": fiel na tela, inerte na escrita — 12/08/2026.
 *
 * As duas metades do contrato, cada uma testada onde vive:
 *
 * - **fiel** — `testeVisualizacao.mjs` garante que nenhuma função de permissão muda de resposta
 *   sob `visualizacao: true`;
 * - **inerte** — é ESTA suíte: clica de verdade nos botões que a simulação agora mostra e
 *   verifica que nada foi gravado. A guarda mora nos setters de coleção do `DadosProvider`, e só
 *   um teste que atravessa o provider consegue prová-la.
 *
 * O reporte que originou tudo: *"quando coloco na visão de algum outro usuário, algumas funções
 * não aparecem, como criar novo projeto"*. O caso daqui é exatamente esse gesto.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DadosProvider, useDados } from '../src/context/DadosProvider';
import { DialogoProvider } from '../src/components/ui/Dialogo';
import { BacklogAgenciados } from '../src/pages/BacklogAgenciados';
import { BannerVisualizacao } from '../src/components/usuarios/BannerVisualizacao';

/**
 * Ponte de teste: entra no modo "Ver como" sem atravessar a página de Usuários.
 *
 * O caminho real (Usuários → Acessos → "Ver como") já é coberto pelos testes da administração; o
 * assunto aqui é o que acontece DEPOIS de entrar, e a ponte corta o trajeto que não está em teste.
 */
/** Linhas com dados — mesmo recorte que os testes do Backlog usam. */
function linhasDeDados() {
  return screen.getAllByRole('row').filter((linha) => linha.querySelector('td')).length;
}

function Ponte({ alvoId }: { alvoId: string }) {
  const { verComo, visualizandoComo } = useDados();
  return (
    <button type="button" onClick={() => verComo(alvoId)}>
      {visualizandoComo ? '__vendo__' : '__entrar_como__'}
    </button>
  );
}

function montar(alvoId: string) {
  return render(
    <DialogoProvider>
      <DadosProvider>
        <Ponte alvoId={alvoId} />
        {/* O banner mora no App, acima da página — aqui ele entra porque o aviso é dele. */}
        <BannerVisualizacao />
        <BacklogAgenciados />
      </DadosProvider>
    </DialogoProvider>,
  );
}

// `globals: false` no vitest — o cleanup automático não roda; sem isto o segundo teste vê dois banners.
afterEach(cleanup);

describe('ver como — fiel na tela, inerte na escrita', () => {
  it('mostra o botão de criar que a pessoa tem, e o clique não grava nada', async () => {
    const usuario = userEvent.setup();
    // Ana (u1) é responsável na Gestão de Produção, que abre o Backlog: ela pode criar.
    montar('u1');

    await usuario.click(screen.getByText('__entrar_como__'));

    /*
      A metade "fiel": o botão está na tela. No desenho antigo ele sumia — a permissão respondia
      "não" pela visualização, e a auditoria via uma tela mentirosa.
    */
    const botao = await screen.findByRole('button', { name: /novo projeto/i });
    expect(botao, 'a simulação mostra o que a pessoa tem').toBeTruthy();

    // A régua é a visão DELA: entrar no modo muda a lista (Ana vê só as linhas em que é nomeada).
    const antes = linhasDeDados();

    /*
      A metade "inerte": o gesto morre na guarda do provider. Nenhuma linha nova — nem otimista,
      nem persistida — e o banner explica em vez de deixar o clique cair no silêncio.
    */
    await usuario.click(botao);

    expect(linhasDeDados(), 'nenhuma linha foi criada').toBe(antes);
    // A linha nova abriria em edição, com "Sem título" selecionado — não há textarea nenhum.
    expect(screen.queryByDisplayValue('Sem título'), 'nem em edição').toBeNull();
    expect(await screen.findByTestId('aviso-escrita'), 'o banner reagiu à tentativa').toBeTruthy();
  });

  it('sair da visualização devolve a escrita', async () => {
    const usuario = userEvent.setup();
    montar('u1');

    await usuario.click(screen.getByText('__entrar_como__'));
    await usuario.click(await screen.findByRole('button', { name: /sair da visualização/i }));

    await usuario.click(await screen.findByRole('button', { name: /novo projeto/i }));

    /*
      A criação foca a etapa Entrada para mostrar a linha nova, então contagem de linhas não é
      régua aqui. A prova de que criou é a própria linha: ela nasce em edição, com o título
      provisório pronto para substituir.
    */
    expect(await screen.findByDisplayValue('Sem título'), 'fora da visualização, criar volta a criar')
      .toBeTruthy();
  });
});
