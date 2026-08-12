/**
 * "Ver como": fiel na tela, e quem age é só o dono — 12/08/2026.
 *
 * ## As três partes do contrato
 *
 * 1. **fiel** — `testeVisualizacao.mjs` garante que nenhuma função de permissão muda de resposta
 *    sob `visualizacao: true`. A simulação mostra o que a pessoa simulada tem, inclusive os botões
 *    de escrita: *"algumas funções não aparecem, como criar novo projeto"*;
 * 2. **o dono age** — pedido da operação: *"pode permitir apenas eu que sou o dono criar e usar as
 *    coisas como ele, mas registre como eu, porque preciso testar o que o usuário está conseguindo
 *    fazer"*. A objeção original era **rastro**, não permissão — e o rastro já sai certo, porque os
 *    campos de autoria gravam o id da sessão real, nunca o do simulado;
 * 3. **os demais não** — um admin que abre a visão de alguém segue em leitura pura. Ele tem poder
 *    de administrar, não de assumir a identidade alheia.
 *
 * Esta suíte cobre 2 e 3, que só se provam atravessando o provider de verdade.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DadosProvider, useDados } from '../src/context/DadosProvider';
import { DialogoProvider } from '../src/components/ui/Dialogo';
import { BacklogAgenciados } from '../src/pages/BacklogAgenciados';
import { BannerVisualizacao } from '../src/components/usuarios/BannerVisualizacao';

afterEach(cleanup);

/**
 * Ponte de teste: troca a sessão real e entra na simulação sem atravessar a página de Usuários.
 *
 * O caminho real (Usuários → Acessos → "Ver como") já é coberto pelos testes da administração; o
 * assunto aqui é o que acontece **depois** de entrar.
 */
function Ponte({ alvoId, sessaoId }: { alvoId: string; sessaoId?: string }) {
  const { verComo, entrarComo, visualizandoComo, usuarioReal, oportunidades } = useDados();
  return (
    <div>
      {sessaoId && (
        <button type="button" onClick={() => entrarComo(sessaoId)}>__trocar_sessao__</button>
      )}
      <button type="button" onClick={() => verComo(alvoId)}>
        {visualizandoComo ? '__vendo__' : '__entrar_como__'}
      </button>
      <span data-testid="sessao-real">{usuarioReal?.nome ?? ''}</span>
      {/*
        A régua da criação é o **dado**, não a tela: durante a simulação a grade mostra a visão da
        pessoa simulada, e ela pode legitimamente não enxergar a linha que acabou de nascer (não
        está nomeada nela). Contar aqui separa "criou" de "apareceu para ela".
      */}
      <span data-testid="total">{oportunidades.length}</span>
    </div>
  );
}

function montar(alvoId: string, sessaoId?: string) {
  return render(
    <DialogoProvider>
      <DadosProvider>
        <Ponte alvoId={alvoId} sessaoId={sessaoId} />
        <BannerVisualizacao />
        <BacklogAgenciados />
      </DadosProvider>
    </DialogoProvider>,
  );
}

describe('ver como', () => {
  it('o dono simula e AGE — a linha nasce, e a faixa diz em nome de quem', async () => {
    const usuario = userEvent.setup();
    // A sessão de fábrica é o dono; a Ana (u1) é o alvo da simulação.
    montar('u1');

    await usuario.click(screen.getByText('__entrar_como__'));
    const antes = Number(screen.getByTestId('total').textContent);

    // A parte "fiel": o botão aparece porque a pessoa simulada o tem.
    const botao = await screen.findByRole('button', { name: /novo projeto/i });
    await usuario.click(botao);

    // A parte "o dono age": a linha nasceu de verdade, no dado.
    expect(Number(screen.getByTestId('total').textContent), 'o dono cria durante a simulação')
      .toBe(antes + 1);

    /*
      E a faixa precisa dizer **em nome de quem**: a diferença entre "leitura" e "escrita com a
      minha assinatura" é grande demais para ficar implícita na tela.
    */
    expect(screen.getByText(/tudo fica registrado como/i).textContent)
      .toContain('Caio Cesar Moura Barroso');
  });

  it('um admin simulando NÃO age — nada grava, e a faixa explica', async () => {
    const usuario = userEvent.setup();
    // Troca a sessão real para a Ana (admin, não dona) e daí simula outra pessoa.
    montar('u3', 'u1');

    await usuario.click(screen.getByText('__trocar_sessao__'));
    expect(screen.getByTestId('sessao-real').textContent, 'a sessão real deixou de ser o dono')
      .toBe('Ana Martins');

    await usuario.click(screen.getByText('__entrar_como__'));

    const antes = Number(screen.getByTestId('total').textContent);
    const botao = screen.queryByRole('button', { name: /novo projeto/i });
    if (botao) await usuario.click(botao);

    expect(Number(screen.getByTestId('total').textContent), 'nenhuma linha nasceu').toBe(antes);
    if (botao) {
      expect(await screen.findByTestId('aviso-escrita'), 'a faixa reagiu à tentativa').toBeTruthy();
    }
  });

  it('sair da visualização tira a faixa e devolve a sessão', async () => {
    const usuario = userEvent.setup();
    montar('u1');

    await usuario.click(screen.getByText('__entrar_como__'));
    await usuario.click(await screen.findByRole('button', { name: /sair da visualização/i }));

    expect(screen.queryByText(/vendo como/i), 'a faixa saiu da tela').toBeNull();
    await usuario.click(await screen.findByRole('button', { name: /novo projeto/i }));
    expect(await screen.findByDisplayValue('Sem título')).toBeTruthy();
  });
});
