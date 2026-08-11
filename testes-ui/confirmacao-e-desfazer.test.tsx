/**
 * Confirmação em diálogo e desfazer — os dois pedidos da gestão em 11/08/2026.
 *
 * ## Por que precisa ser teste de interface
 *
 * As duas coisas só existem como interação. As regras do histórico já têm suíte pura
 * (`testes-regras/testeHistorico.mjs`), e ela verifica o que a pilha faz; o que **não** dá para
 * ver de lá é se a tecla chega, se a pergunta aparece, e se responder "Cancelar" de fato impede a
 * ação. É onde moravam os defeitos de sempre.
 *
 * Vale registrar o que a suíte antiga não pegava: com `window.confirm`, o `jsdom` devolvia
 * `undefined` e **toda exclusão passava sem confirmação nenhuma**. O teste dizia que a linha
 * sumia, e sumia — só que por um caminho que nenhuma pessoa percorreria.
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { DadosProvider } from '../src/context/DadosProvider';
import { DialogoProvider } from '../src/components/ui/Dialogo';
import { AvisoHistorico } from '../src/components/ui/AvisoHistorico';
import { BacklogAgenciados } from '../src/pages/BacklogAgenciados';

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

function montar() {
  return render(
    <DialogoProvider>
      <DadosProvider>
        <BacklogAgenciados />
        <AvisoHistorico />
      </DadosProvider>
    </DialogoProvider>,
  );
}

function linhas() {
  return screen.getAllByRole('row').filter((linha) => linha.querySelector('td'));
}

function primeiraLinha() {
  return linhas()[0];
}

/** O título da linha, como aparece na célula Projeto — a chave para reencontrá-la depois. */
function tituloDa(linha: HTMLElement): string {
  return linha.textContent ?? '';
}

async function dialogo() {
  return screen.findByRole('alertdialog');
}

async function responder(rotulo: RegExp) {
  const aberto = await dialogo();
  fireEvent.click(within(aberto).getByRole('button', { name: rotulo }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
}

/** A tecla vai ao documento, como no navegador — o atalho é global, não de um campo. */
function teclar(key: string, extra: Record<string, boolean> = {}) {
  fireEvent.keyDown(document, { key, ctrlKey: true, ...extra });
}

describe('a confirmação é um diálogo na tela, não a caixa do navegador', () => {
  it('excluir pergunta antes, nomeando o alvo', async () => {
    montar();
    const alvo = primeiraLinha();
    fireEvent.click(within(alvo).getByLabelText(/^Excluir/));

    const aberto = await dialogo();
    // O `role` é o que separa um diálogo de um popover qualquer — e é o que o leitor de tela usa.
    expect(aberto).toBeTruthy();
    expect(aberto.textContent).toContain('Excluir');
    // O botão nomeia a ação: "OK" não diz o que vai acontecer.
    expect(within(aberto).getByRole('button', { name: /^Excluir$/ })).toBeTruthy();
    expect(within(aberto).getByRole('button', { name: /^Cancelar$/ })).toBeTruthy();
  });

  it('cancelar não exclui nada', async () => {
    montar();
    const antes = linhas().length;
    fireEvent.click(within(primeiraLinha()).getByLabelText(/^Excluir/));
    await responder(/^Cancelar$/);

    expect(linhas()).toHaveLength(antes);
  });

  it('Esc é uma saída, e sair é não fazer nada', async () => {
    montar();
    const antes = linhas().length;
    fireEvent.click(within(primeiraLinha()).getByLabelText(/^Excluir/));
    await dialogo();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(linhas()).toHaveLength(antes);
  });

  it('confirmar exclui', async () => {
    montar();
    const antes = linhas().length;
    fireEvent.click(within(primeiraLinha()).getByLabelText(/^Excluir/));
    await responder(/^Excluir$/);

    expect(linhas()).toHaveLength(antes - 1);
  });

  /*
    O foco é regra de segurança, não de conforto.

    Num diálogo destrutivo ele pousa em "Cancelar": o Enter reflexo de quem confirma tudo não pode
    apagar uma linha. Num diálogo comum, pousa na confirmação.
  */
  it('em ação destrutiva o foco começa em Cancelar', async () => {
    montar();
    fireEvent.click(within(primeiraLinha()).getByLabelText(/^Excluir/));
    const aberto = await dialogo();

    await waitFor(() =>
      expect(document.activeElement).toBe(within(aberto).getByRole('button', { name: /^Cancelar$/ })));
  });

  it('em ação de rotina o foco começa na confirmação', async () => {
    montar();
    fireEvent.click(within(primeiraLinha()).getByLabelText(/^Duplicar/));
    const aberto = await dialogo();

    await waitFor(() =>
      expect(document.activeElement).toBe(within(aberto).getByRole('button', { name: /^Duplicar$/ })));
  });
});

describe('duplicar pergunta antes — pedido da gestão', () => {
  it('o clique sozinho não duplica mais', async () => {
    montar();
    const antes = linhas().length;
    fireEvent.click(within(primeiraLinha()).getByLabelText(/^Duplicar/));

    await dialogo();
    // Enquanto a pergunta está aberta, nada foi criado.
    expect(linhas()).toHaveLength(antes);
  });

  it('cancelar não duplica', async () => {
    montar();
    const antes = linhas().length;
    fireEvent.click(within(primeiraLinha()).getByLabelText(/^Duplicar/));
    await responder(/^Cancelar$/);

    expect(linhas()).toHaveLength(antes);
  });

  it('confirmar duplica, e a pergunta diz o que a cópia leva', async () => {
    montar();
    const antes = linhas().length;
    fireEvent.click(within(primeiraLinha()).getByLabelText(/^Duplicar/));

    const aberto = await dialogo();
    // A informação que antes só existia na dica do botão e no PRD.
    expect(aberto.textContent).toContain('esperando o novo talento');
    expect(aberto.textContent).toMatch(/valores.*n[ãa]o/i);

    fireEvent.click(within(aberto).getByRole('button', { name: /^Duplicar$/ }));
    await waitFor(() => expect(linhas()).toHaveLength(antes + 1));
  });
});

describe('Ctrl+Z devolve o que foi feito', () => {
  it('desfaz uma exclusão — a linha volta', async () => {
    montar();
    const antes = linhas().length;
    const titulo = tituloDa(primeiraLinha());

    fireEvent.click(within(primeiraLinha()).getByLabelText(/^Excluir/));
    await responder(/^Excluir$/);
    expect(linhas()).toHaveLength(antes - 1);

    teclar('z');

    await waitFor(() => expect(linhas()).toHaveLength(antes));
    expect(linhas().some((l) => tituloDa(l) === titulo)).toBe(true);
  });

  it('desfaz uma duplicação — depois de fechar o painel que ela abre', async () => {
    montar();
    const antes = linhas().length;

    fireEvent.click(within(primeiraLinha()).getByLabelText(/^Duplicar/));
    await responder(/^Duplicar$/);
    await waitFor(() => expect(linhas()).toHaveLength(antes + 1));

    /*
      Duplicar deixa o painel de talento aberto, com o cursor na busca — é o desenho: a linha nova
      nasce esperando o nome. Enquanto o cursor está lá, `Ctrl+Z` pertence ao campo, e o atalho
      global não age (a guarda de `ehCampoDeTexto`). Fechar o painel é o que a pessoa faz antes de
      se dar conta do engano, e é o que este teste reproduz.
    */
    expect((document.activeElement as HTMLElement)?.tagName).toBe('INPUT');
    teclar('z');
    expect(linhas()).toHaveLength(antes + 1);

    fireEvent.mouseDown(document.body);
    (document.activeElement as HTMLElement)?.blur();

    teclar('z');
    await waitFor(() => expect(linhas()).toHaveLength(antes));
  });

  it('desfaz uma edição de célula, devolvendo o valor anterior', async () => {
    montar();
    const alvo = linhas().find((l) => l.textContent?.includes('Coca-Cola Verão'))!;

    /*
      O valor do projeto, e não o título: o título da linha é composto ("Talento | Projeto") e o
      texto exato não vive num nó só. O caso que interessa é o mesmo — sobrescrever uma célula por
      engano —, e um valor em reais é onde ele dói mais.
    */
    fireEvent.click(within(alvo).getByText('R$ 32.000,00'));
    const campo = within(alvo).getByDisplayValue('R$ 32.000,00');
    fireEvent.change(campo, { target: { value: 'R$ 999.999,00' } });
    fireEvent.keyDown(campo, { key: 'Enter' });

    expect(screen.getByText('R$ 999.999,00')).toBeTruthy();

    /*
      O foco fica na célula recém-editada, e o atalho não vale dentro de campo de texto. Tirar o
      foco reproduz o que a pessoa faz: ela clica fora, vê o erro, e aí aperta Ctrl+Z.
    */
    (document.activeElement as HTMLElement)?.blur();
    teclar('z');

    await waitFor(() => expect(screen.getByText('R$ 32.000,00')).toBeTruthy());
    expect(screen.queryByText('R$ 999.999,00')).toBeNull();
  });

  it('não rouba o Ctrl+Z de dentro de um campo em edição', async () => {
    montar();
    const antes = linhas().length;

    // Uma exclusão para haver o que desfazer.
    fireEvent.click(within(primeiraLinha()).getByLabelText(/^Excluir/));
    await responder(/^Excluir$/);
    expect(linhas()).toHaveLength(antes - 1);

    /*
      Com o cursor num campo, `Ctrl+Z` pertence ao texto — é o desfazer do navegador, letra por
      letra. Se o atalho global agisse aqui, apagar uma palavra reverteria a linha inteira.
    */
    const busca = screen.getByPlaceholderText(/Buscar no quadro/);
    (busca as HTMLInputElement).focus();
    fireEvent.keyDown(busca, { key: 'z', ctrlKey: true, bubbles: true });

    // A exclusão continua de pé: o atalho não agiu.
    expect(linhas()).toHaveLength(antes - 1);
  });

  it('Ctrl+Shift+Z refaz o que foi desfeito', async () => {
    montar();
    const antes = linhas().length;

    fireEvent.click(within(primeiraLinha()).getByLabelText(/^Excluir/));
    await responder(/^Excluir$/);

    teclar('z');
    await waitFor(() => expect(linhas()).toHaveLength(antes));

    teclar('z', { shiftKey: true });
    await waitFor(() => expect(linhas()).toHaveLength(antes - 1));
  });

  it('Ctrl+Y também refaz — a convenção do Windows', async () => {
    montar();
    const antes = linhas().length;

    fireEvent.click(within(primeiraLinha()).getByLabelText(/^Excluir/));
    await responder(/^Excluir$/);
    teclar('z');
    await waitFor(() => expect(linhas()).toHaveLength(antes));

    teclar('y');
    await waitFor(() => expect(linhas()).toHaveLength(antes - 1));
  });

  it('sem nada para desfazer, a tecla não faz nada', async () => {
    montar();
    const antes = linhas().length;

    teclar('z');
    teclar('z');

    await waitFor(() => expect(linhas()).toHaveLength(antes));
    // E nenhum aviso mentindo que algo aconteceu.
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('o encerramento automático não entra no histórico', async () => {
    /*
      A varredura dos 20 dias roda na abertura e pode mudar linhas de status. Se ela empilhasse um
      passo, o primeiro `Ctrl+Z` de quem acabou de abrir o sistema desarquivaria projetos que a
      regra fechou — e ninguém entenderia por quê, porque a pessoa não fez nada.
    */
    montar();
    const antes = linhas().length;

    teclar('z');

    await waitFor(() => expect(linhas()).toHaveLength(antes));
  });
});

describe('o aviso diz o que aconteceu', () => {
  it('nomeia o que foi desfeito e oferece refazer', async () => {
    montar();
    const alvo = linhas().find((l) => l.textContent?.includes('Coca-Cola Verão'))!;

    fireEvent.click(within(alvo).getByLabelText(/^Excluir/));
    await responder(/^Excluir$/);

    teclar('z');

    const aviso = await screen.findByRole('status');
    expect(aviso.textContent).toContain('Desfeito');
    // A frase sai da diferença entre os dois estados — ver `descreverMudanca`.
    expect(aviso.textContent).toContain('Exclusão');
    expect(within(aviso).getByRole('button', { name: /Refazer/ })).toBeTruthy();
  });

  it('o botão Refazer do aviso funciona como o atalho', async () => {
    montar();
    const antes = linhas().length;

    fireEvent.click(within(primeiraLinha()).getByLabelText(/^Excluir/));
    await responder(/^Excluir$/);
    teclar('z');
    await waitFor(() => expect(linhas()).toHaveLength(antes));

    const aviso = await screen.findByRole('status');
    fireEvent.click(within(aviso).getByRole('button', { name: /Refazer/ }));

    await waitFor(() => expect(linhas()).toHaveLength(antes - 1));
  });
});
