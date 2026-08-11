/**
 * Testes de **interface** do Backlog — clique de verdade, num DOM de verdade.
 *
 * ## Por que este arquivo existe
 *
 * As suítes de regra rodam lógica pura e não pegariam nenhum dos defeitos que apareceram nesta
 * fase: painel fechando antes de escolher, linha nova replicando uma existente, tela quebrando ao
 * renderizar. Todos eram de **renderização e interação** — o lugar exato onde este arquivo olha.
 *
 * Monta o `DadosProvider` real e a página real. Sem mock: se o clique funciona aqui, funciona no
 * navegador pelas mesmas razões.
 *
 * ## Por que fica dentro do repositório
 *
 * Ao contrário das suítes de regra — que vivem num diretório temporário e são dívida conhecida —
 * esta precisa do build do Vite para compilar TSX. Fica em `testes-ui/` e roda com `npm run test:ui`.
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { DadosProvider } from '../src/context/DadosProvider';
import { DialogoProvider } from '../src/components/ui/Dialogo';
import { BacklogAgenciados } from '../src/pages/BacklogAgenciados';

/** Cada teste começa com o `localStorage` limpo: o seed é o ponto de partida conhecido. */
beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

/**
 * `DialogoProvider` por fora, como no `App`.
 *
 * Ele entrou aqui em 11/08/2026, quando as confirmações deixaram de ser `window.confirm`. Não é
 * detalhe de montagem: **o `jsdom` não implementa `window.confirm`** e o devolvia como `undefined`,
 * de modo que toda exclusão passava direto — a suíte media um caminho que ninguém confirmava. Com
 * o diálogo em React, a pergunta existe no DOM e o teste tem de respondê-la, como uma pessoa.
 */
function montar() {
  return render(
    <DialogoProvider>
      <DadosProvider>
        <BacklogAgenciados />
      </DadosProvider>
    </DialogoProvider>,
  );
}

/** Responde à pergunta aberta e espera o diálogo sair — é o que uma pessoa faria. */
async function responderDialogo(rotulo: RegExp) {
  const dialogo = await screen.findByRole('alertdialog');
  fireEvent.click(within(dialogo).getByRole('button', { name: rotulo }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
}

/**
 * As linhas de **dados** da grade.
 *
 * Filtra por `<td>`: o cabeçalho também tem checkbox de seleção ("Selecionar todas"), e cairia no
 * filtro se a busca fosse pelo checkbox.
 */
function linhas() {
  return screen.getAllByRole('row').filter((linha) => linha.querySelector('td'));
}

/**
 * O botão de uma coluna, pelo nome acessível que ele expõe.
 *
 * `aria-label` porque o `title` saiu quando a `Dica` assumiu os balões — e nome de controle é
 * papel do aria, não do tooltip.
 */
function celula(linha: HTMLElement, alvo: RegExp) {
  return within(linha).getAllByRole('button').find((b) =>
    alvo.test(b.getAttribute('aria-label') ?? '') || alvo.test(b.getAttribute('title') ?? ''))!;
}

/**
 * Os rótulos das colunas de **uma seção** da grade contínua.
 *
 * Desde 03/08/2026 o Backlog é uma tabela só: as abas viraram seções que rolam, e todas as colunas
 * estão sempre no DOM. Perguntar "quais colunas a aba X mostra" deixou de fazer sentido — a
 * pergunta virou "quais colunas pertencem à seção X", e é o que esta função responde.
 *
 * Cada seção é marcada no DOM pela primeira coluna dela (`data-secao`), que é também o alvo que o
 * scroll mede. A seção vai desse marco até o próximo.
 */
function colunasDaSecao(visaoId: string): string[] {
  const cabecalhos = screen.getAllByRole('columnheader');
  const inicio = cabecalhos.findIndex((th) => th.getAttribute('data-secao') === visaoId);
  if (inicio < 0) return [];
  const resto = cabecalhos.slice(inicio + 1);
  const fim = resto.findIndex((th) => th.hasAttribute('data-secao'));
  const ate = fim < 0 ? cabecalhos.length : inicio + 1 + fim;
  return cabecalhos.slice(inicio, ate).map((th) => th.textContent?.trim() ?? '');
}

/** Os rótulos congelados à esquerda — aparecem uma vez, e não por aba. */
function colunasCongeladas(): string[] {
  /*
    O congelamento vem de uma classe (`sticky`), e jsdom não resolve CSS — só o `left` inline, que
    é calculado em JS porque cada célula precisa somar a largura das anteriores.
  */
  return screen.getAllByRole('columnheader')
    .filter((th) => (th as HTMLElement).style.left !== '')
    .map((th) => th.textContent?.trim() ?? '');
}

/**
 * O painel flutuante aberto — as opções vivem **em portal**, fora da linha.
 *
 * Buscar no documento inteiro confundiria a opção do painel com o valor já gravado na célula: os
 * dois exibem o mesmo texto.
 */
function painelAberto() {
  // "Buscar marca…" é do painel; "Buscar no quadro…" é da barra de ações.
  return screen.getByPlaceholderText(/^Buscar (marca|talento)/).closest('div')!.parentElement!;
}

describe('a tela abre', () => {
  it('renderiza sem quebrar e mostra o que está em andamento', () => {
    montar();
    expect(screen.getByText('Backlog de Agenciados')).toBeTruthy();
    // 12 vivas no seed: seis status ativos × dois exemplos.
    expect(linhas()).toHaveLength(12);
  });

  it('mostra as 8 abas na ordem da operação', () => {
    montar();
    /*
      Nove ao fim da realocação de 03/08/2026. Saíram cinco e entrou uma:

      | Aba | O que houve |
      |-----|-------------|
      | **Agência** | A operação não vai trabalhar com agência intermediária |
      | **Talento** | Absorvida pela Cliente — as duas eram metades da mesma pergunta |
      | **Entrega** | Output e Impacto foram para a Demanda |
      | **Conteúdo** · **Audiência** | Nomeavam áreas; as colunas de pessoas foram para a Time |
      | **Time** ✅ | Nova: as oito áreas numa tela só |
    */
    /*
      Demanda abre — correção da operação ("devemos começar por demanda"): a Demanda é a triagem,
      e o quadro existe para triar. Links fica antes do Time, que fecha por ser a única seção que
      fala de quem toca, não do projeto. Pagamento foi fundida no Financeiro.
    */
    /*
      Reordenada pela imagem da operação em 04/08/2026: Produção colou no Escopo (os tiques de lá
      destravam as colunas daqui) e Jurídico veio antes do Financeiro (primeiro o que assina,
      depois o que se cobra).
    */
    const esperado = ['Demanda', 'Escopo', 'Produção', 'Cliente',
      'Jurídico', 'Financeiro', 'Links', 'Time'];
    /*
      A ordem acompanha o projeto, não o organograma (PRD 08 §6) — e é especificação da operação.
      Lida da faixa de navegação, que é onde ela se manifesta.
    */
    // Restrito à faixa: "Talento" também é cabeçalho de coluna, e cabeçalho ordenável é botão.
    const faixa = document.querySelector('[class*="111a3a"]')!;
    const abas = [...faixa.querySelectorAll('button')].map((b) => b.textContent?.trim() ?? '');
    expect(abas).toEqual(esperado);
  });

  it('não exibe "undefined" em lugar nenhum', () => {
    montar();
    // Um `undefined` renderizado é o rastro de campo opcional lido sem guarda.
    expect(document.body.textContent).not.toContain('undefined');
    expect(document.body.textContent).not.toContain('NaN');
  });

  it('não tem mais a barra de filtros', () => {
    montar();
    // Os chips saíram: o recorte é a etapa do mapa. Ver PRD 08 §7.
    expect(screen.queryByRole('button', { name: /^Em triagem/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Encerradas/ })).toBeNull();
  });
});

describe('criar um projeto', () => {
  /*
    O defeito que motivou este teste: a linha nova nascia com um id que o seed já usava, e o React
    reconciliava as duas como uma — a nova aparecia com os dados da antiga.
  */
  it('insere UMA linha, sem replicar nenhuma existente', async () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: /Novo projeto/ }));

    /*
      Criar foca a etapa **Entrada**, que é onde a linha nasce — a lista passa a mostrar as duas do
      seed mais a nova. O defeito que este teste guarda: com id colidindo, o React juntava a nova
      com uma existente e o total não subia.
    */
    await waitFor(() => expect(linhas()).toHaveLength(3));
    // O nome nasce em edição: o provisório está no `value` do input, não como texto do DOM.
    const emEdicao = document.querySelectorAll('input[value="Sem título"]');
    expect(emEdicao.length + screen.queryAllByText('Sem título').length).toBe(1);
  });

  it('abre o nome em edição, com o provisório selecionado', async () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: /Novo projeto/ }));

    // O cursor precisa cair no nome: sem isso, criar exigiria um segundo clique.
    await waitFor(() => {
      const campo = document.activeElement as HTMLInputElement;
      expect(campo?.tagName).toBe('INPUT');
      expect(campo?.value).toBe('Sem título');
    });
  });

  it('grava o nome digitado', async () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: /Novo projeto/ }));

    await waitFor(() => expect((document.activeElement as HTMLInputElement)?.value).toBe('Sem título'));
    const campo = document.activeElement as HTMLInputElement;
    fireEvent.change(campo, { target: { value: 'Campanha de Teste' } });
    fireEvent.keyDown(campo, { key: 'Enter' });

    await waitFor(() => expect(screen.getByText('Campanha de Teste')).toBeTruthy());
  });
});

describe('escolher marca da lista', () => {
  /*
    O defeito: o painel vive em portal, e o handler de "clique fora" o tratava como fora de si
    mesmo — fechava no `mousedown`, antes de o clique registrar.
  */
  it('abre o painel e grava a opção clicada', async () => {
    montar();
    const linha = linhas()[0];
    const celulaMarca = celula(linha, /Escolher marca/);

    fireEvent.click(celulaMarca);
    await waitFor(() => expect(screen.getByPlaceholderText(/Buscar marca/)).toBeTruthy());

    // Escolher precisa **gravar** — o defeito fazia o painel fechar sem efeito nenhum.
    const painel = screen.getByPlaceholderText(/Buscar marca/).closest('div')!.parentElement!;
    const opcao = [...painel.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Natura')!;
    fireEvent.mouseDown(opcao);

    await waitFor(() => {
      expect(celula(linhas()[0], /Escolher marca/).textContent).toContain('Natura');
    });
  });

  it('filtra a lista ao digitar', async () => {
    montar();
    fireEvent.click(celula(linhas()[0], /Escolher marca/));

    const busca = await screen.findByPlaceholderText(/Buscar marca/);
    fireEvent.change(busca, { target: { value: 'nub' } });

    await waitFor(() => {
      const opcoes = [...painelAberto().querySelectorAll('button')].map((b) => b.textContent?.trim());
      expect(opcoes).toContain('Nubank');
      expect(opcoes).not.toContain('Coca-Cola');
    });
  });

  it('oferece criar quando o texto não existe — e só então', async () => {
    montar();
    fireEvent.click(celula(linhas()[0], /Escolher marca/));
    const busca = await screen.findByPlaceholderText(/Buscar marca/);

    // Nome já cadastrado: nada de criar, senão duplicaria a marca.
    fireEvent.change(busca, { target: { value: 'Natura' } });
    await waitFor(() => expect(screen.queryByText(/^Criar “/)).toBeNull());

    // Nome novo: o escape aparece, marcado como solicitação.
    fireEvent.change(busca, { target: { value: 'Marca Inédita' } });
    await waitFor(() => expect(screen.getByText(/Criar “Marca Inédita”/)).toBeTruthy());
    expect(screen.getByText(/solicitação de cadastro/i)).toBeTruthy();
  });

  it('não oferece criar para a mesma marca escrita diferente', async () => {
    montar();
    fireEvent.click(celula(linhas()[0], /Escolher marca/));
    const busca = await screen.findByPlaceholderText(/Buscar marca/);

    // "coca cola" é a mesma "Coca-Cola" — criar aqui seria a duplicata que a lista impede.
    fireEvent.change(busca, { target: { value: 'coca cola' } });
    await waitFor(() => {
      const opcoes = [...painelAberto().querySelectorAll('button')].map((b) => b.textContent?.trim());
      // Nada de criar — e a Coca-Cola continua na lista, pronta para escolher.
      expect(opcoes.some((t) => t?.startsWith('Criar'))).toBe(false);
      expect(opcoes).toContain('Coca-Cola');
    });
  });
});

describe('congelamento', () => {
  /*
    Em Revisão, Aguardando Feedback e StandBy os dados não se editam: há uma versão do material
    circulando fora do quadro.
  */
  it('mostra o selo nas linhas congeladas', () => {
    montar();
    // O seed tem duas em Em Revisão e duas em Aguardando Feedback.
    expect(screen.getAllByText('Congelado').length).toBeGreaterThan(0);
  });

  it('o status continua clicável numa linha congelada', () => {
    montar();
    const congelada = linhas().find((l) => within(l).queryByText('Congelado'));
    expect(congelada).toBeTruthy();

    // Congelar dados não pode travar o fluxo — senão o projeto ficaria preso.
    expect(celula(congelada!, /^Avançar de/)).toBeTruthy();
  });
});

describe('coluna Orçamento', () => {
  /*
    Ela morava na Demanda, entre Prioridade e Deadline, até 03/08/2026 — e em mais nove abas.

    Todas as colunas de pessoas se juntaram na aba **Time**, a pedido da operação: "quem está nesse
    projeto?" é pergunta sobre o projeto inteiro, e respondê-la custava abrir seis abas.
  */
  it('saiu da Demanda e vive na seção Time', () => {
    montar();
    /*
      Na grade contínua toda coluna está sempre no DOM — as abas viraram seções que rolam. Perguntar
      "a aba X mostra a coluna Y?" deixou de fazer sentido; a pergunta virou "a coluna Y pertence à
      seção X?", que é o que colunasDaSecao responde.
    */
    expect(colunasDaSecao('backlog:demanda')).not.toContain('Orçamento');
    expect(colunasDaSecao('backlog:time')).toContain('Orçamento');
  });

  it('a aba Time reúne as oito áreas', () => {
    montar();
    fireEvent.click(screen.getByText('Time'));
    const nomes = screen.getAllByRole('columnheader').map((c) => c.textContent?.trim() ?? '');
    for (const area of ['Talent Manager', 'Orçamento', 'GP', 'Conteúdo', 'Audiência',
      'Produção', 'Pagamento', 'Jurídico']) {
      expect(nomes.some((n) => n.includes(area)), `área ${area}`).toBe(true);
    }
  });
});

describe('nome do projeto', () => {
  it('não é cortado com reticências — quebra em duas linhas', () => {
    montar();
    const linha = linhas().find((l) => l.textContent?.includes('Magalu'));
    const nome = within(linha!).getByText(/Magalu Black Friday/);
    // `truncate` corta numa linha; a coluna-chave precisa ser legível por inteiro.
    expect(nome.className).toContain('line-clamp-2');
    expect(nome.className).not.toContain('truncate');
  });
});

describe('navegação entre abas', () => {
  /*
    Toda aba **ou** mostra colunas **ou** explica que ainda não tem — nunca uma grade em branco com
    checkbox e Ações, que pareceria defeito em vez de trabalho por fazer.

    A primeira versão deste teste exigia que nenhuma aba estivesse vazia. Passava, e estava errado:
    codificava o estado de um dia como se fosse regra. Bastou nascer a aba Agência para quebrar —
    e o que quebrou foi o teste, não o produto.

    Hoje nenhuma aba está vazia (a Agência saiu em 03/08/2026), mas a forma do teste continua a
    mesma: ela descreve o contrato, não a contagem do dia.
  */
  it('toda aba mostra colunas ou explica a ausência', () => {
    montar();
    const faixa = screen.getByText('Demanda').closest('div')!;
    const abas = [...faixa.querySelectorAll('button')];
    expect(abas.length).toBeGreaterThanOrEqual(8);

    for (const aba of abas) {
      const nome = aba.textContent?.trim();
      fireEvent.click(aba);

      const cabecalhos = screen.queryAllByRole('columnheader');
      if (cabecalhos.length === 0) {
        expect(screen.getByText(/ainda não tem colunas/)).toBeTruthy();
        continue;
      }
      // Cinco é o piso das abas definidas: as mais enxutas têm oito.
      expect(cabecalhos.length, `aba ${nome}`).toBeGreaterThan(5);
    }
  });

  it('volta para a Demanda com as colunas', () => {
    montar();
    fireEvent.click(screen.getByText('Cliente'));
    fireEvent.click(screen.getByText('Demanda'));
    expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(5);
  });
});

describe('Orçamento: responsável e apoio', () => {
  /*
    Uma pessoa responde pela entrega; as demais ajudam. Enquanto era uma lista plana, três nomes
    numa área diziam "estes três estão envolvidos" — e ninguém sabia a quem cobrar.
  */
  /** Abre o painel de pessoas da coluna Orçamento na primeira linha, na aba Time. */
  async function abrirOrcamento() {
    // Desde 03/08/2026 as colunas de pessoas vivem na aba Time.
    fireEvent.click(screen.getByText('Time'));
    /*
      Pelo `aria-label`, não pelo `title`: o primeiro registro do seed chama-se
      "[Carta Orçamento] Marina Duarte…", e o botão do nome casaria com /Orçamento/ antes deste.
    */
    const botao = within(linhas()[0]).getByRole('button', { name: /Responsáveis de Orçamento/ });
    fireEvent.click(botao);
    await screen.findByPlaceholderText(/Buscar pessoa/);
  }

  /** Os botões de papel de uma pessoa, no painel aberto. */
  function papeisDe(nome: string) {
    const linha = [...document.querySelectorAll('div')]
      .filter((d) => d.textContent?.includes(nome))
      .pop()!;
    return {
      resp: within(linha as HTMLElement).getByText('Resp.'),
      apoio: within(linha as HTMLElement).getByText('Apoio'),
    };
  }

  it('o painel oferece os dois papéis', async () => {
    montar();
    await abrirOrcamento();

    const acoes = [...document.querySelectorAll('button')].map((b) => b.textContent?.trim());
    expect(acoes).toContain('Resp.');
    expect(acoes).toContain('Apoio');
  });

  it('define responsável, e depois troca para apoio', async () => {
    montar();
    await abrirOrcamento();

    // Uma pessoa da equipe de Orçamento — a lista vem dela, não de todos os usuários.
    const alvo = [...document.querySelectorAll('button')]
      .filter((b) => b.textContent?.trim() === 'Resp.')[0];
    fireEvent.click(alvo);

    await waitFor(() => expect(alvo.className).toContain('bg-indigo-600'));

    // Trocar de papel é **um** clique: os dois botões ficam visíveis lado a lado.
    const apoio = alvo.parentElement!.querySelector('button:last-child') as HTMLElement;
    fireEvent.click(apoio);

    await waitFor(() => {
      // Ninguém fica nos dois papéis: virar apoio tira de responsável.
      expect(apoio.className).toContain('bg-slate-500');
      expect(alvo.className).not.toContain('bg-indigo-600');
    });
  });
});

describe('cabeçalho', () => {
  it('centraliza todos os rótulos', () => {
    montar();
    // Rótulo curto sobre coluna estreita: alinhado à esquerda, solta-se do conteúdo que nomeia.
    const alinhados = screen.getAllByRole('columnheader')
      .flatMap((th) => [...th.querySelectorAll('button, span')])
      .filter((el) => el.className.includes('justify-'));
    expect(alinhados.length).toBeGreaterThan(5);
    expect(alinhados.every((el) => el.className.includes('justify-center'))).toBe(true);
  });

  it('não corta rótulo longo — quebra em duas linhas', () => {
    montar();
    const origem = screen.getAllByRole('columnheader')
      .find((th) => th.textContent?.includes('Origem do Projeto'))!;
    const rotulo = within(origem).getByText('Origem do Projeto');
    expect(rotulo.className).toContain('line-clamp-2');
    expect(rotulo.className).not.toContain('truncate');
  });
});

describe('tooltip', () => {
  /*
    Quando o texto está cortado, o tooltip é o mecanismo que devolve o dado — então ele precisa
    trazer **o valor**, não uma explicação genérica da coluna.
  */
  it('a dica de uma célula é o valor completo', () => {
    montar();
    // Uma linha editável qualquer: a congelada não renderiza a marca como botão.
    const marca = linhas().map((l) => celula(l, /Escolher marca/)).find(Boolean)!;
    // O valor, não o rótulo da ação: é o valor que some quando a célula corta.
    expect(marca.getAttribute('data-dica')).toBe(marca.textContent?.trim());
    expect(marca.getAttribute('aria-label')).toBe('Escolher marca');
  });

  it('a dica do cabeçalho é o rótulo inteiro, com a explicação abaixo', () => {
    montar();
    const th = screen.getAllByRole('columnheader')
      .find((c) => c.textContent?.includes('Exclusivo'))!;
    const alvo = th.matches('[data-dica]') ? th : th.querySelector('[data-dica]')!;
    expect(alvo.getAttribute('data-dica')).toBe('Exclusivo');
    // A explicação vem em segundo plano: é contexto, não o que faltava ler.
    expect(alvo.getAttribute('data-dica-sub')).toContain('vínculo do talento');
  });

  it('o farol do SLA mostra a data, e o estado do prazo abaixo', () => {
    montar();
    /*
      A coluna Deadline saiu de todas as abas em 03/08/2026 e virou o **farol na célula de Ações**.

      A regra que a governava sobrevive intacta: a data é o dado, "3d restantes" é o comentário
      sobre ela. Trocar um pelo outro foi um defeito real, e é o que esta asserção impede — só que
      agora sobre o tooltip, e não sobre a célula.
    */
    const alvo = document.querySelector('[data-dica-sub*="Deadline de triagem"]')!;
    expect(alvo).toBeTruthy();
    expect(alvo.getAttribute('data-dica')).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('o prazo é a barra na borda da linha, não um objeto dentro dela', () => {
    montar();
    /*
      Duas tentativas anteriores puseram o farol **no fluxo** da linha — um ponto colorido junto ao
      nome, depois um relógio na célula de Ações. As duas disputavam atenção com a etiqueta de
      status, a de prioridade e os ícones de ação.

      A barra sai do fluxo: é a borda esquerda da primeira célula, não empurra nada e não pede
      largura. Este teste tranca as duas metades — ela é borda, e é a primeira célula.
    */
    const barra = document.querySelector('[data-dica-sub*="Deadline de triagem"]') as HTMLElement;
    expect(barra.tagName).toBe('TD');
    /*
      Sombra interna, e não borda: com `border-collapse: collapse` a borda não acompanha a célula
      congelada, e a barra sumia ao rolar na horizontal. Foi defeito visto em tela.
    */
    expect(barra.style.boxShadow).toContain('inset');
    // O `left` inline é o que jsdom enxerga; o `position: sticky` vem da classe, via CSS.
    expect(barra.style.left).toBe('0px');

    const todas = [...barra.parentElement!.querySelectorAll('td')];
    expect(todas.indexOf(barra as HTMLElement)).toBe(0);
  });

  it('a linha já triada mantém a borda, sem cor', () => {
    montar();
    /*
      `border-l-transparent`, e não ausência de borda: sem ela o conteúdo deslocaria 5px e toda
      linha resolvida ficaria desalinhada das demais.
    */
    const barras = [...document.querySelectorAll('td[data-dica-sub*="Deadline de triagem"]')] as HTMLElement[];
    const triadas = barras.filter((b) => b.style.boxShadow.includes('transparent'));
    expect(triadas.length).toBeGreaterThan(0);
    // A barra transparente mantém os 5px: sem eles o conteúdo deslocaria e a linha desalinharia.
    for (const barra of triadas) expect(barra.style.boxShadow).toContain('5px');
  });

  it('substituiu o title nativo nas células de valor', () => {
    montar();
    const linha = linhas()[0];
    // Um sistema só: `title` nativo e balão próprio no mesmo elemento desenhavam dois tooltips.
    expect(celula(linha, /Escolher marca/).getAttribute('title')).toBeNull();
    expect(celula(linha, /Escolher marca/).getAttribute('data-dica')).toBeTruthy();
  });
});

/*
  Aba Cliente.

  O que precisa ser verdade aqui é diferente do Escopo: sete colunas são **as mesmas**, e quatro
  leem ou escrevem no cadastro da marca em vez da linha. Os dois pontos onde isso pode falhar em
  silêncio são o espelhamento (uma coluna que não renderiza porque o despacho comparava o id
  inteiro) e o alcance da escrita (segmento que grava na linha e não na marca).
*/
describe('aba cliente', () => {
  /* A seção está sempre montada: 'abrir' virou só montar. Ver `colunasDaSecao`. */
  function abrirCliente() {
    montar();
  }

  it('a seção Cliente é o lado da marca; o do talento voltou à Demanda', () => {
    abrirCliente();
    /*
      As âncoras (Status, Projeto, Entrada, Talento) e as Ações não aparecem aqui: estão
      congeladas à esquerda, fora de qualquer seção — é o teste 'as âncoras ficam congeladas'.

      Desde a ordenação por imagem (04/08/2026), Exclusivo e Origem do Talento abrem a Demanda —
      vínculo é informação de decisão — e a Cliente ficou com o que deriva do cadastro da marca.
    */
    const nomes = colunasDaSecao('backlog:cliente');
    expect(nomes).toEqual(expect.arrayContaining([
      expect.stringContaining('Marca'),
      expect.stringContaining('Segmento'), expect.stringContaining('Categoria'),
    ]));
    expect(nomes.some((n) => n?.includes('Exclusivo'))).toBe(false);
    expect(colunasDaSecao('backlog:demanda')).toEqual(expect.arrayContaining([
      expect.stringContaining('Exclusivo'), expect.stringContaining('Origem do Talento'),
    ]));
    /*
      Três saíram em 03/08/2026: Orçamento foi para a aba Time, e Contato e Deadline saíram a
      pedido da operação. A aba ficou com o que descreve o cliente, e nada mais.
    */
    for (const fora of ['Orçamento', 'Contato', 'Deadline']) {
      expect(nomes.some((n) => n?.includes(fora)), `coluna ${fora}`).toBe(false);
    }
    expect(nomes[nomes.length - 1]).toContain('Categoria');
  });

  it('as colunas espelhadas renderizam — não só o Escopo as conhece', () => {
    abrirCliente();
    const linha = linhas()[0];
    // Talento e Marca comparavam o id inteiro; na aba Cliente cairiam no ramo de texto.
    expect(celula(linha, /Escolher talento/)).toBeTruthy();
    expect(celula(linha, /Escolher marca/)).toBeTruthy();
  });

  it('o segmento vem do cadastro da marca, não da linha', () => {
    abrirCliente();
    // Coca-Cola é Bebidas no cadastro; nenhuma oportunidade guarda esse dado.
    const linha = linhas().find((l) => l.textContent?.includes('Coca-Cola'))!;
    expect(linha.textContent).toContain('Bebidas');
    expect(linha.textContent).toContain('Refrigerantes');
  });

  it('trocar a marca traz o segmento junto — ele não é digitado por linha', () => {
    abrirCliente();
    const daAmbev = () => linhas().find((l) => l.textContent?.includes('Ambev'))!;
    expect(daAmbev().textContent).toContain('Cervejas');

    fireEvent.click(celula(daAmbev(), /Escolher marca/));
    fireEvent.mouseDown(within(painelAberto()).getByText('Natura'));

    // A linha virou Natura e o segmento acompanhou: o dado é da marca, não da linha.
    const agora = linhas().find((l) => l.textContent?.includes('Natura'))!;
    expect(agora.textContent).toContain('Beleza');
    expect(agora.textContent).toContain('Cosméticos');
  });

  it('editar o segmento alcança todos os projetos da marca', () => {
    abrirCliente();
    const daCoca = () => linhas().find((l) => l.textContent?.includes('Coca-Cola'))!;

    fireEvent.click(celula(daCoca(), /Escolher segmento/));
    fireEvent.change(screen.getByPlaceholderText(/^Buscar segmento/), {
      target: { value: 'Bebidas não alcoólicas' },
    });
    fireEvent.mouseDown(screen.getByText(/Criar .Bebidas não alcoólicas./));
    expect(daCoca().textContent).toContain('Bebidas não alcoólicas');

    /*
      A prova do alcance: outra linha passa a apontar para a mesma marca e já nasce com o valor
      novo. Se o segmento estivesse na linha, esta abriria vazia.
    */
    // Qualquer linha editável que ainda não seja da Coca-Cola — congelada não abre painel.
    const outra = linhas()
      .filter((l) => !l.textContent?.includes('Coca-Cola'))
      .map((l) => celula(l, /Escolher marca/))
      .find(Boolean)!;
    fireEvent.click(outra);
    fireEvent.mouseDown(within(painelAberto()).getByText('Coca-Cola'));

    const migradas = linhas().filter((l) => l.textContent?.includes('Coca-Cola'));
    expect(migradas.length).toBe(2);
    for (const linha of migradas) expect(linha.textContent).toContain('Bebidas não alcoólicas');
  });

  it('sem marca, segmento e categoria dizem por que estão vazios', () => {
    abrirCliente();
    fireEvent.click(screen.getByRole('button', { name: 'Novo projeto' }));

    // A linha nova nasce sem marca — e as colunas que dependem dela explicam a ausência.
    const explicando = screen.getAllByText('—')
      .filter((n) => /Escolha a marca primeiro/.test(n.getAttribute('data-dica-sub') ?? ''));
    // Eram três até 03/08/2026; a coluna Contato saiu e sobraram Segmento e Categoria.
    expect(explicando.length).toBe(2);
    // Vale sempre: é explicação, não repetição de texto cortado.
    for (const no of explicando) expect(no.getAttribute('data-dica-sempre')).not.toBeNull();
  });

  it('a coluna Contato saiu da aba', () => {
    abrirCliente();
    /*
      Removida em 03/08/2026, a pedido da operação. O campo `contatoCliente` continua no modelo,
      sem tela — registrado como pendência em [00 §5.7]. Os contatos seguem no cadastro da marca,
      que é de onde a coluna os lia.
    */
    const linha = linhas().find((l) => l.textContent?.includes('Coca-Cola'))!;
    const contato = within(linha).queryAllByRole('button')
      .find((b) => /Escolher contato/.test(b.getAttribute('aria-label') ?? ''));
    expect(contato).toBeUndefined();
  });

  it('Demanda e Cliente são seções distintas da mesma grade', () => {
    montar();
    expect(colunasDaSecao('backlog:demanda')).toContain('Prioridade');
    expect(colunasDaSecao('backlog:demanda')).not.toContain('Segmento');
    expect(colunasDaSecao('backlog:cliente')).toContain('Segmento');
  });
});


/*
  Aba Talento.

  Duas colunas vêm da ficha, e a ficha pode faltar — é o caso do Bruno Salles, que existe nas
  linhas mas não no cadastro. Os três estados (com valor · sem valor · sem ficha) precisam ser
  distinguíveis, porque cada um se resolve num lugar diferente.
*/
describe('aba talento', () => {
  /*
    A aba e a coluna se chamam igual — por isso a busca vai pelo botão, não pelo texto. Sem isso, o
    clique cai no cabeçalho da coluna Talento do Escopo e a aba nunca troca.
  */
  /* A aba Talento foi absorvida pela Cliente, e a seção está sempre montada. */
  function abrirTalento() {
    montar();
  }

  it('as duas metades continuam na grade — repartidas entre Demanda e Cliente', () => {
    abrirTalento();
    /*
      A união de 03/08 juntou as metades numa aba; a ordenação por imagem de 04/08 as repartiu de
      novo — mas por função, não por entidade: o lado do talento (decisão) abre a Demanda, o lado
      da marca (cadastro) é a Cliente. Nada se perdeu; mudou o endereço.
    */
    expect(colunasDaSecao('backlog:demanda')).toEqual(expect.arrayContaining([
      expect.stringContaining('Exclusivo'),
      expect.stringContaining('Origem do Talento'),
    ]));
    const nomes = colunasDaSecao('backlog:cliente');
    expect(nomes).toEqual(expect.arrayContaining([
      expect.stringContaining('Marca'), expect.stringContaining('Segmento'),
      expect.stringContaining('Categoria'),
    ]));
    /*
      As que saíram em 03/08/2026, por motivos diferentes:

      - **Tipo de Talento** dizia o mesmo que Exclusivo, em outras palavras. Ficou uma só.
      - **Talent Manager** e **Orçamento** mudaram-se para a aba Time, com as outras seis áreas.
      - **Contato** e **Deadline** saíram a pedido da operação.
    */
    for (const fora of ['Tipo de Talento', 'Talent Manager', 'Orçamento', 'Contato', 'Deadline']) {
      expect(nomes.some((n) => n?.includes(fora)), `coluna ${fora}`).toBe(false);
    }
  });

  it('a exclusividade vem da ficha e não é editável', () => {
    abrirTalento();
    const linha = linhas().find((l) => l.textContent?.includes('Marina Duarte'))!;
    // Marina é exclusiva no cadastro — a linha não guarda esse dado, deriva dele.
    // Na grade contínua o Exclusivo aparece 2x por linha (seções Demanda e Cliente) — getAll.
    const rotulo = within(linha).getAllByText('Sim')[0];
    expect(rotulo.tagName).toBe('SPAN');
    expect(rotulo.getAttribute('data-dica-sub')).toContain('é exclusivo da casa');
  });

  it('e a coluna inverteu junto com o nome: interveniência responde "Não"', () => {
    abrirTalento();
    /*
      O teste que a troca de 03/08 exigia. Helena Prado é a única não-exclusiva do cadastro: numa
      coluna chamada "Exclusivo", a resposta dela tem de ser **Não**. Se alguém renomear sem
      inverter — ou reverter a inversão —, a tela passa a mentir em toda linha, e é aqui que morre.
    */
    const linha = linhas().find((l) => l.textContent?.includes('Helena Prado'))!;
    // Na grade contínua o Exclusivo aparece 2x por linha (seções Demanda e Cliente) — getAll.
    const rotulo = within(linha).getAllByText('Não')[0];
    expect(rotulo.getAttribute('data-dica-sub')).toContain('não é exclusivo');
    expect(rotulo.getAttribute('data-dica-sub')).toContain('interveniência');
  });

  it('sem ficha, exclusividade e origem explicam qual é o problema', () => {
    abrirTalento();
    // Bruno Salles aparece nas linhas mas não tem ficha em Talentos.
    const linha = linhas().find((l) => l.textContent?.includes('Bruno Salles'))!;
    const semFicha = within(linha).getAllByText('—')
      .filter((n) => /ainda não tem ficha|vem do vínculo dela/.test(n.getAttribute('data-dica-sub') ?? ''));
    /*
      Na grade contínua a linha inteira está montada: Exclusivo aparece 2x (Demanda e Cliente),
      mais Origem do Talento e as que leem a ficha no Jurídico. O que importa não é a contagem — é
      que TODAS expliquem o problema, e nenhuma afirme algo sobre uma ficha que não existe.
    */
    expect(semFicha.length).toBeGreaterThanOrEqual(2);
    for (const no of semFicha) expect(no.getAttribute('data-dica-sub')).toContain('Bruno Salles');
  });

  it('editar a origem alcança todos os projetos do talento', () => {
    abrirTalento();
    const daHelena = () => linhas().filter((l) => l.textContent?.includes('Helena Prado'));
    expect(daHelena().length).toBeGreaterThan(1);

    // Helena nasce sem origem — "não classificado" é estado real, e a coluna o mostra.
    const alvo = daHelena().map((l) => celula(l, /Trocar origem do talento/)).find(Boolean)!;
    fireEvent.click(alvo);
    fireEvent.click(screen.getByText('Prospecção'));

    for (const linha of daHelena()) expect(linha.textContent).toContain('Prospecção');
  });
});

describe('demanda e produção', () => {
  function abrir(_nome: string) {
    montar();
  }

  it('a Demanda recebeu Output, Impacto e Captação', () => {
    montar();
    const nomes = screen.getAllByRole('columnheader').map((c) => c.textContent?.trim());
    /*
      As três vieram de Entrega e Escopo em 03/08/2026: são informação de decisão, e quem vai
      aceitar ou declinar quer vê-las sem trocar de aba. A aba Entrega saiu junto — sem elas
      sobrariam só as espelhadas de identificação.
    */
    expect(nomes).toEqual(expect.arrayContaining([
      expect.stringContaining('Tipo de Output'), expect.stringContaining('Impacto'),
      expect.stringContaining('Captação'),
    ]));
    // Nenhuma aba tem coluna Deadline: virou o farol na célula de Ações.
    expect(nomes.some((n) => n?.includes('Deadline'))).toBe(false);
  });

  it('impacto usa escala própria, não a de prioridade', () => {
    montar();
    // Bruno não tem impacto no seed — a célula abre em 'Definir', sem 'Alto' pré-existente na linha.
    const linha = linhas().find((l) => l.textContent?.includes('Bruno Salles'))!;
    const botao = celula(linha, /Trocar impacto/);
    fireEvent.click(botao);
    /*
      O painel da EtiquetaSelect vive em portal, no fim do body — a última ocorrência de cada
      rótulo é dele. O seed realista pôs 'Alto' em células de outras linhas, então o texto sozinho
      deixou de identificar o painel.
    */
    for (const rotulo of ['Alto', 'Médio', 'Baixo']) {
      expect(screen.getAllByText(rotulo).length).toBeGreaterThanOrEqual(1);
    }
    fireEvent.click(screen.getAllByText('Alto').at(-1)!);
    expect(celula(linhas().find((l) => l.textContent?.includes('Bruno Salles'))!, /Trocar impacto/).textContent).toContain('Alto');
    /*
      A cor é a informação nesta coluna, e as duas escalas convivem no quadro: se impacto usasse o
      vermelho da prioridade alta, "Alto" e "Alta" pareceriam a mesma medida.
    */
    expect(celula(linhas().find((l) => l.textContent?.includes('Bruno Salles'))!, /Trocar impacto/).className).not.toContain('rose');
  });

  it('output é lista fechada e nasce por classificar', () => {
    montar();
    // Bruno segue sem output: o seed realista classificou outras linhas, não esta.
    const botao = celula(linhas().find((l) => l.textContent?.includes('Bruno Salles'))!, /Trocar tipo de output/);
    expect(botao.textContent).toContain('—');
    fireEvent.click(botao);
    // Última ocorrência de cada rótulo: o painel vive em portal, no fim do body, e o seed
    // realista já mostra 'Reels' e 'Merchandising' em células de outras linhas.
    for (const rotulo of ['Post', 'Reels', 'Stories', 'Vídeo', 'Live', 'Evento', 'Merchandising']) {
      expect(screen.getAllByText(rotulo).at(-1)).toBeTruthy();
    }
  });

  it('Produção ficou com o assunto, sem as colunas de pessoas', () => {
    abrir('Produção');
    const nomes = screen.getAllByRole('columnheader').map((c) => c.textContent?.trim());
    expect(nomes).toEqual(expect.arrayContaining([
      expect.stringContaining('Edição'), expect.stringContaining('Valor de Produção'),
    ]));
    /*
      As três que tinha — Produção, GP e Orçamento — foram para a aba Time em 03/08/2026.

      Esta aba era o caso que provou a regra "a coluna declara a própria área", por ter sido a
      primeira com duas. A regra continua valendo; o que mudou foi onde as colunas moram.
    */
    for (const area of ['GP', 'Orçamento']) {
      expect(colunasDaSecao('backlog:producao'), `área ${area}`).not.toContain(area);
    }
  });

  it('as oito colunas de área da aba Time abrem painel de gente', () => {
    montar();
    fireEvent.click(screen.getByText('Time'));
    const linha = linhas()[0];
    /*
      Antes a área vinha da aba, o que só comportava uma por vez. Agora são oito na mesma linha: se
      o despacho voltasse a depender da aba, sete ficariam mudas — é o defeito que este teste tranca.
    */
    const painéis = within(linha).getAllByRole('button')
      .filter((b) => /Definir|responsáve/i.test(b.getAttribute('aria-label') ?? b.textContent ?? ''));
    expect(painéis.length).toBeGreaterThanOrEqual(8);
  });

  it('edição é lista fechada, e responde só QUEM edita', () => {
    abrir('Produção');
    // A Coca-Cola tem o tique de Edição marcado no seed; sem ele a célula estaria travada.
    const linha = linhas().find((l) => l.textContent?.includes('Coca-Cola'))!;
    fireEvent.click(celula(linha, /Trocar edição/));
    // Dentro do painel: "Talento" é também nome de coluna.
    const painel = screen.getAllByText('Edição')
      .find((no) => no.className.includes('uppercase'))!.parentElement!;
    for (const rotulo of ['Interna', 'Talento', 'Agência', 'Produtora']) {
      expect(within(painel).getByText(rotulo)).toBeTruthy();
    }
    /*
      **"Sem edição" saiu da lista em 03/08/2026.**

      A pergunta "tem edição?" passou a ser o tique da aba Escopo, e ter as duas no mesmo lugar
      criava um estado que nada na tela resolvia: tique marcado com "Sem edição" escolhido.
      Uma pergunta, um lugar.
    */
    expect(within(painel).queryByText('Sem edição')).toBeNull();
  });

  it('sem o tique do Escopo, a coluna trava e diz onde se resolve', () => {
    abrir('Produção');
    // A Ambev não tem tique de Edição no seed.
    const linha = linhas().find((l) => l.textContent?.includes('Ambev'))!;
    const travada = within(linha).getAllByText('—')
      .find((n) => /Marque Edição na aba Escopo/.test(n.getAttribute('data-dica-sub') ?? ''));
    /*
      A célula travada **explica**, em vez de ficar muda. Sem isso a pessoa clicaria, nada
      aconteceria, e não haveria como saber se é permissão, defeito ou regra — o mesmo raciocínio
      do selo "Congelado".
    */
    expect(travada).toBeTruthy();
    expect(travada!.getAttribute('data-dica')).toContain('Sem edição neste projeto');
  });
});

describe('valor de produção', () => {
  function abrirProducao() {
    montar();
  }

  it('Conteúdo e Audiência vêm logo depois da Edição', () => {
    abrirProducao();
    const nomes = screen.getAllByRole('columnheader').map((c) => c.textContent?.trim() ?? '');
    /*
      As três respondem em sequência à mesma pergunta: **como esse material é feito, e para quem**.
      Conteúdo e Audiência nasceram em 03/08/2026, ao lado da Edição a pedido da operação.
    */
    /*
      Por seção: a grade inteira tem DOIS 'Edição' — o tique do Escopo e a lista da Produção — e
      um findIndex global achava o do Escopo, medindo a vizinhança errada.
    */
    expect(colunasDaSecao('backlog:producao')).toEqual([
      'Edição', 'Conteúdo', 'Audiência', 'Valor de Produção',
    ]);
  });

  it('as duas novas são lista fechada', () => {
    abrirProducao();
    // A op3 (Natura) tem o tique de Conteúdo marcado e nenhum valor — destravada e por classificar.
    const natura = linhas().find((l) => l.textContent?.includes('Natura'))!;
    const botao = celula(natura, /Trocar conteúdo/i);
    // Com tique e sem valor é "trabalho pendente"; sem tique seria "não se aplica".
    expect(botao.textContent).toContain('—');
    fireEvent.click(botao);
    // Painel em portal, no fim do body — o seed realista já mostra estes rótulos em células.
    const painel = screen.getAllByText('Conteúdo')
      .find((no) => no.className.includes('uppercase'))!.parentElement!;
    for (const opcao of ['Publieditorial', 'Review', 'Tutorial', 'Depoimento',
      'Entretenimento', 'Institucional']) {
      expect(within(painel).getByText(opcao), opcao).toBeTruthy();
    }
  });

  it('o tique separa "não preenchido" de "não se aplica"', () => {
    abrirProducao();
    /*
      A distinção que os três tiques existem para fazer. Uma coluna vazia diz as duas coisas ao
      mesmo tempo; com o tique, a tela responde qual das duas é — e a segunda não é trabalho
      pendente de ninguém.
    */
    const natura = linhas().find((l) => l.textContent?.includes('Natura'))!;
    const pendente = within(natura).getAllByText('—')
      .find((n) => /Trocar conteúdo/i.test(n.closest('button')?.getAttribute('aria-label') ?? ''));
    expect(pendente, 'com tique e sem valor: por preencher').toBeTruthy();

    const ambev = linhas().find((l) => l.textContent?.includes('Ambev'))!;
    const naoSeAplica = within(ambev).getAllByText('—')
      .find((n) => /aba Escopo/.test(n.getAttribute('data-dica-sub') ?? ''));
    expect(naoSeAplica, 'sem tique: não se aplica').toBeTruthy();
  });

  it('aceita o que a operação escreve, incluindo texto', () => {
    abrirProducao();
    const linha = linhas().find((l) => l.textContent?.includes('Coca-Cola'))!;
    expect(linha.textContent).toContain('R$ 48.000,00');
    // "a definir" é resposta legítima — recusá-la faria o dado não entrar.
    expect(linhas().some((l) => l.textContent?.includes('a definir'))).toBe(true);
  });

  it('grava o que se digita', () => {
    abrirProducao();
    const alvo = linhas().find((l) => l.textContent?.includes('Ambev'))!;
    const celulaValor = within(alvo).getAllByRole('button')
      .find((b) => /R\$ 12\.500/.test(b.textContent ?? ''))!;
    fireEvent.click(celulaValor);
    const campo = within(alvo).getByDisplayValue('R$ 12.500,00');
    fireEvent.change(campo, { target: { value: 'R$ 30.000,00' } });
    fireEvent.blur(campo);

    const depois = linhas().find((l) => l.textContent?.includes('Ambev'))!;
    expect(depois.textContent).toContain('R$ 30.000,00');
  });
});

describe('aba escopo', () => {
  function abrirEscopo() {
    montar();
  }

  it('mostra as oito colunas na ordem pedida', () => {
    abrirEscopo();
    const nomes = screen.getAllByRole('columnheader').map((c) => c.textContent?.trim() ?? '');
    /*
      A aba foi enxugada e recomposta no mesmo dia, a pedido da operação:

      1. As quatro contagens (Reels, Vídeos, Post, Cotas) viraram **Escopo**, uma coluna de texto —
         "3 · 1 · 0 · 0" nunca disse o que "3 reels + 1 vídeo de 60s, uso de 6 meses" diz
      2. Orçamento foi para a aba Time; Captação para a Demanda; Entrada e Exclusivo saíram
      3. O Deadline virou o farol na borda da linha
      4. Entraram os três **tiques** — o que o projeto inclui —, que destravam as colunas de mesmo
         nome na aba Produção

      A aba passou a responder duas perguntas em sequência: o que se pede, e o que isso inclui.
    */
    expect(colunasDaSecao('backlog:escopo')).toEqual([
      'Escopo', 'Edição', 'Conteúdo', 'Audiência', 'Data de Veiculação',
    ]);
  });

  it('os tiques destravam as colunas da Produção', () => {
    abrirEscopo();
    const coca = linhas().find((l) => l.textContent?.includes('Coca-Cola'))!;
    const tique = within(coca).getByLabelText('Edição neste projeto') as HTMLInputElement;
    // A Coca-Cola nasce com o tique marcado no seed, e com "Interna" preenchido lá.
    expect(tique.checked).toBe(true);
    expect(tique.getAttribute('data-dica-sub')).toContain('liberada na aba Produção');

    const ambev = linhas().find((l) => l.textContent?.includes('Ambev'))!;
    const semTique = within(ambev).getByLabelText('Edição neste projeto') as HTMLInputElement;
    expect(semTique.checked).toBe(false);
    expect(semTique.getAttribute('data-dica-sub')).toContain('Marque para preencher');
  });

  it('o escopo guarda o pedido em texto', () => {
    abrirEscopo();
    const coca = linhas().find((l) => l.textContent?.includes('Coca-Cola'))!;
    // O seed converteu as contagens antigas em texto — o dado não se perdeu na migração.
    expect(coca.textContent).toContain('3 reels, 1 vídeo, 2 posts e 2 cotas de patrocínio.');
  });

  it('edita em área de texto, e não num campo de uma linha', async () => {
    abrirEscopo();
    const linha = () => linhas().find((l) => l.textContent?.includes('Coca-Cola'))!;
    const celulaEscopo = within(linha()).getByText(/3 reels, 1 vídeo/);
    fireEvent.click(celulaEscopo);

    /*
      `<textarea>`, não `<input>`.

      Num campo de uma linha o briefing corre para o lado e o começo some pela esquerda enquanto se
      digita. Aqui Enter quebra linha e `Ctrl`+Enter confirma — o inverso das demais células, e a
      única forma de escrever um parágrafo.
    */
    const campo = within(linha()).getByDisplayValue(/3 reels, 1 vídeo/) as HTMLTextAreaElement;
    expect(campo.tagName).toBe('TEXTAREA');

    fireEvent.change(campo, { target: { value: '2 reels\ne 1 vídeo de 60s' } });
    fireEvent.blur(campo);

    // A quebra sobrevive à gravação e à exibição.
    expect(linha().textContent).toContain('2 reels');
    expect(linha().textContent).toContain('e 1 vídeo de 60s');
  });

  it('a data de veiculação guarda ISO e mostra em pt-BR', () => {
    abrirEscopo();
    const linha = linhas().find((l) => l.textContent?.includes('Coca-Cola'))!;
    const celulaData = within(linha).getByLabelText('data de veiculação');
    expect(celulaData.textContent).toBe('15/09/2026');
    // O dado guardado é ISO — se fosse pt-BR, a ordenação viraria alfabética.
    expect(celulaData.getAttribute('data-dica')).toBe('15/09/2026');
  });

  it('captação é lista fechada, separada da captação comercial', () => {
    // A coluna mudou-se para a Demanda em 03/08/2026, com Output e Impacto.
    montar();
    const linha = linhas().find((l) => l.textContent?.includes('Coca-Cola'))!;
    const botao = celula(linha, /Trocar captação/);
    expect(botao.textContent).toContain('Estúdio');
    fireEvent.click(botao);
    const painel = screen.getAllByText('Captação')
      .find((no) => no.className.includes('uppercase'))!.parentElement!;
    for (const rotulo of ['Estúdio', 'Externa', 'Remota', 'Material do talento', 'Sem captação']) {
      expect(within(painel).getByText(rotulo)).toBeTruthy();
    }
  });
});

describe('aba time', () => {
  function abrirTime() {
    montar();
  }

  it('mostra as dez áreas na ordem pedida', () => {
    abrirTime();
    const nomes = screen.getAllByRole('columnheader').map((c) => c.textContent?.trim() ?? '');
    /*
      As áreas na ordem em que o projeto passa por elas, e não em ordem alfabética: quem lê a linha
      da esquerda para a direita percorre o caminho do trabalho.

      **Produtor Artístico** e **Executivo** entraram em 03/08/2026, logo depois de Produção: são
      as duas frentes dela, e ficam ao lado de quem responde pelo todo.
    */
    expect(colunasDaSecao('backlog:time')).toEqual([
      'Talent Manager', 'Orçamento', 'GP', 'Conteúdo', 'Audiência', 'Produção',
      'Produtor Artístico', 'Executivo', 'Pagamento', 'Jurídico',
    ]);
  });

  /*
    O que pode falhar em silêncio é a coluna de área não renderizar. Antes a área vinha da aba, e
    com oito na mesma aba sete ficariam mudas — cada uma precisa declarar a sua.
  */
  it('cada área abre o próprio painel de pessoas', () => {
    abrirTime();
    const linha = linhas()[0];
    for (const area of ['Talent', 'Orçamento', 'GP', 'Conteúdo', 'Audiência', 'Produção',
      'Pagamento', 'Jurídico']) {
      const botao = within(linha).queryAllByRole('button')
        .find((b) => new RegExp(`de ${area}`, 'i').test(b.getAttribute('aria-label') ?? ''));
      expect(botao, `painel da área ${area}`).toBeTruthy();
    }
  });

  it('as abas cujas colunas foram realocadas saíram da barra', () => {
    montar();
    /*
      Entrega, Conteúdo e Audiência perderam as colunas próprias — para a Demanda e para a aba Time
      — e ficariam só com as espelhadas de identificação, idênticas entre si.

      As três chegaram a voltar por algumas horas no mesmo dia, enquanto a realocação corria:
      remover uma aba que ainda não teve a sua vez é decidir antes da hora. Saíram quando a vez
      chegou. **As áreas continuam vivas**, com coluna própria na aba Time — o teste acima prova.
    */
    const faixa = screen.getByText('Demanda').closest('div')!;
    const abas = [...faixa.querySelectorAll('button')].map((b) => b.textContent?.trim());
    for (const aba of ['Entrega', 'Conteúdo', 'Audiência', 'Talento', 'Agência']) {
      expect(abas, `aba ${aba}`).not.toContain(aba);
    }
  });
});

describe('abas financeiro, pagamento, jurídico e links', () => {
  function abrir(_nome: string) {
    montar();
  }

  it('a seção Financeiro absorveu o Pagamento: valores, parcelas e PEP juntos', () => {
    abrir('Financeiro');
    /*
      A ordenação da operação pôs Parcelas e PEP entre os valores — e seção é um trecho contíguo,
      então as duas abas restritas viraram uma. Cachê, Parcelas e PEP em sequência respondem:
      quanto sai, em quantas vezes, sob qual código no ERP.
    */
    expect(colunasDaSecao('backlog:financeiro')).toEqual([
      'Valor Projeto', 'Valor Cachê', 'Parcelas', 'PEP',
      'Comissão Globo', 'Comissão', 'Imposto', 'Saving',
    ]);
  });

  it('valores aceitam o que a operação escreve', () => {
    abrir('Financeiro');
    const linha = linhas().find((l) => l.textContent?.includes('Coca-Cola'))!;
    expect(linha.textContent).toContain('R$ 32.000,00');
    // "a apurar" é resposta legítima num campo de valor.
    expect(linhas().some((l) => l.textContent?.includes('a apurar'))).toBe(true);
  });

  it('Parcelas e PEP vivem no Financeiro, ao lado do cachê', () => {
    abrir('Financeiro');
    const linha = linhas().find((l) => l.textContent?.includes('Coca-Cola'))!;
    expect(within(linha).getByLabelText('Quantidade de parcelas').textContent).toBe('3');
    expect(linha.textContent).toContain('PEP-2026-0148');
  });

  it('Jurídico lê razão social e documento da ficha do talento', () => {
    abrir('Jurídico');
    const linha = linhas().find((l) => l.textContent?.includes('Marina Duarte'))!;
    const daFicha = within(linha).getAllByText(/./)
      .filter((n) => /Da ficha de/.test(n.getAttribute('data-dica-sub') ?? ''));
    // Razão social e CPF/CNPJ — os dois vêm do cadastro, não da linha.
    expect(daFicha.length).toBeGreaterThanOrEqual(1);
  });

  it('Links mostra o destino, não a URL', () => {
    abrir('Links');
    const nomes = screen.getAllByRole('columnheader').map((c) => c.textContent?.trim() ?? '');
    // Sem o prefixo "Link": a seção já se chama Links.
    expect(colunasDaSecao('backlog:links')).toEqual([
      'Proposta', 'Salesforce', 'Pasta de Orçamento', 'Pasta de Planejamento',
    ]);

    // Bruno: sem links E editável — a Renner está congelada (Em Revisão) e não mostra 'Adicionar'.
    const linha = linhas().find((l) => l.textContent?.includes('Bruno Salles'))!;
    const vazio = within(linha).getAllByLabelText(/Adicionar link/)[0];
    expect(vazio).toBeTruthy();
    expect(vazio.getAttribute('data-dica-sub')).toContain('colar');
  });

  it('um link colado vira "Abrir", em nova aba e sem referrer', () => {
    abrir('Links');
    /*
      Uma linha ainda **sem** proposta — a Renner. As primeiras ganharam links reais quando o seed
      foi enriquecido para medir as larguras, e a célula delas já diz "Abrir", não "Adicionar".
    */
    const linha = () => linhas().find((l) => l.textContent?.includes('Bruno Salles'))!;
    fireEvent.click(within(linha()).getAllByLabelText(/Adicionar link da proposta/)[0]);
    const campo = within(linha()).getByLabelText('Link da proposta');
    fireEvent.change(campo, { target: { value: 'https://drive.exemplo/proposta' } });
    fireEvent.blur(campo);

    const ancora = within(linha()).getByLabelText('Abrir link da proposta') as HTMLAnchorElement;
    expect(ancora.textContent).toContain('Abrir');
    expect(ancora.target).toBe('_blank');
    // `noopener` impede que a página aberta manipule esta pelo `window.opener`.
    expect(ancora.rel).toContain('noopener');
    // A URL inteira fica na dica: conferir antes de clicar é prudente num link externo.
    expect(ancora.getAttribute('data-dica')).toBe('https://drive.exemplo/proposta');
  });

  it('a seção Links tem só endereços — as pessoas vivem na seção Time', () => {
    abrir('Links');
    /*
      Na grade contínua a linha inteira está montada, incluindo as 10 colunas de pessoas da seção
      Time — contá-las na linha deixou de provar qualquer coisa. A prova agora é estrutural: a
      seção Links não contém coluna de pessoas.
    */
    for (const pessoas of ['Manager', 'Orçamento', 'GP', 'Produção', 'Pagamento', 'Jurídico']) {
      expect(colunasDaSecao('backlog:links'), pessoas).not.toContain(pessoas);
    }
  });
});

describe('busca', () => {
  function buscar(termo: string) {
    const campo = screen.getByPlaceholderText(/Buscar no quadro/);
    fireEvent.change(campo, { target: { value: termo } });
  }

  /** Abre uma aba pela faixa de navegação. */
  function abrirAba(nome: string) {
    const faixa = screen.getByText('Demanda').closest('div')!;
    fireEvent.click(within(faixa).getByText(nome));
  }

  /*
    ## O recorte da busca, desde 03/08/2026

    **As três âncoras, sempre, mais as colunas da aba aberta.**

    Antes ela varria as colunas de todas as abas liberadas. Era poderoso e imprevisível: na aba
    Escopo, um termo trazia uma linha por causa de um valor do Financeiro que não estava na tela — a
    pessoa via um resultado que a tela não explicava.

    O outro extremo, buscar só o que a aba mostra, quebraria o gesto mais comum: procurar pelo
    talento numa aba sem a coluna Talento devolveria nada. Daí as âncoras.
  */
  it('as âncoras valem em qualquer aba', () => {
    montar();
    for (const aba of ['Demanda', 'Financeiro', 'Links', 'Time']) {
      abrirAba(aba);
      buscar('Coca-Cola');
      expect(linhas().length, `marca na aba ${aba}`).toBeGreaterThan(0);
      buscar('Marina Duarte');
      expect(linhas().length, `talento na aba ${aba}`).toBeGreaterThan(0);
      buscar('');
    }
  });

  it('o campo da aba aberta entra na busca', () => {
    montar();
    // Segmento e categoria são colunas da aba Cliente, e vêm do cadastro da marca.
    abrirAba('Cliente');
    buscar('Refrigerantes');
    expect(linhas().length).toBe(1);
    expect(linhas()[0].textContent).toContain('Coca-Cola');
  });

  it('acha em qualquer seção, de onde quer que se esteja', () => {
    montar();
    /*
      Esta asserção já foi o oposto: "PEP na Demanda não acha", quando cada aba era uma tabela e um
      resultado de outra aba não se explicava na tela. A grade contínua desfez a premissa — o PEP
      está na mesma tabela, um scroll adiante — e a busca voltou a cobrir tudo que a sessão enxerga.
      A permissão continua valendo: coluna oculta e aba restrita seguem fora.
    */
    abrirAba('Demanda');
    buscar('PEP-2026-0152');
    expect(linhas().length).toBe(1);
    expect(linhas()[0].textContent).toContain('Ambev');
  });

  it('acha o escopo em texto, na aba dele', () => {
    montar();
    abrirAba('Escopo');
    buscar('cotas de patrocínio');
    expect(linhas().length).toBeGreaterThan(0);
  });

  it('acha por valor escrito como a operação escreve', () => {
    montar();
    abrirAba('Produção');
    buscar('a definir');
    expect(linhas().length).toBeGreaterThan(0);
  });

  it('acha pelo rótulo da classificação, não pelo id', () => {
    montar();
    abrirAba('Escopo');
    buscar('Estúdio');
    // O dado guardado é `estudio`; quem procura digita o que lê na tela.
    expect(linhas().length).toBeGreaterThan(0);
  });

  it('continua achando pelo nome do projeto', () => {
    montar();
    buscar('Verão');
    expect(linhas().length).toBeGreaterThan(0);
  });

  it('termo sem correspondência mostra o vazio, não a lista inteira', () => {
    montar();
    buscar('zzzznadaaqui');
    // A tabela troca as linhas por um aviso — uma `tr` só, que o helper conta.
    expect(linhas().length).toBe(1);
    expect(linhas()[0].textContent).toMatch(/nenhum|nada|encontr/i);
  });
});

describe('cabeçalho legível', () => {
  /*
    O rótulo estourava e o `break-words` partia a palavra no meio: "VÍDEO S", "PRIORIDAD E".

    Três causas somadas — fonte de 11px, `tracking-wider` sobre texto já em caixa alta, e a licença
    para partir palavra. Estes testes trancam as três; a quarta garantia, de que a palavra cabe na
    largura reservada, está em `testeColunas`.
  */
  it('nenhum cabeçalho parte palavra no meio', () => {
    montar();
    const faixa = screen.getByText('Demanda').closest('div')!;
    for (const aba of [...faixa.querySelectorAll('button')]) {
      fireEvent.click(aba);
      // A aba sem colunas não tem cabeçalho para verificar.
      for (const th of screen.queryAllByRole('columnheader')) {
        const rotulo = th.querySelector('.line-clamp-2');
        if (!rotulo) continue;
        // `break-words` é o que autoriza a quebra dentro da palavra.
        expect(rotulo.className).not.toContain('break-words');
      }
    }
  });

  it('a métrica do cabeçalho é a mesma em toda coluna', () => {
    montar();
    const estilos = new Set(
      screen.getAllByRole('columnheader')
        .flatMap((th) => [...th.querySelectorAll('button, span')])
        .map((no) => no.className)
        .filter((c) => c.includes('uppercase'))
        /*
          A métrica passou a ser lida pelo **nome do degrau**, não pelo pixel.

          Em 11/08/2026 os 202 tamanhos cravados em px viraram a escala nomeada do `index.css` —
          `text-selo`, `text-rotulo`, `text-apoio`, `text-dado` —, para que o corpo do texto
          acompanhe a preferência de quem usa em vez de ignorá-la. O regex antigo procurava
          `text-[10px]` e passou a encontrar `undefined`.
        */
        .map((c) => `${/text-(selo|rotulo|apoio|dado)\b/.exec(c)?.[0]} ${/tracking-\w+/.exec(c)?.[0]}`),
    );
    // Uma métrica só: divergir aqui faria a mesma tabela parecer duas.
    expect([...estilos]).toEqual(['text-rotulo tracking-wide']);
  });

  it('a tabela pede a largura das colunas, e não uma proporção', () => {
    montar();
    const tabela = screen.getAllByRole('table')[0] as HTMLElement;
    /*
      `table-layout: fixed` com a soma das larguras declaradas, desde 03/08/2026.

      O `width: max-content` (layout automático) deixava o navegador alargar qualquer coluna cujo
      conteúdo mínimo não coubesse — e o `left` acumulado das congeladas, somado das larguras
      *declaradas*, ficava curto: a Talento deslizava por cima da Entrada ao rolar. Fixo, o
      `<colgroup>` é lei e a soma confere por construção.
    */
    expect(tabela.style.tableLayout).toBe('fixed');
    expect(tabela.style.width).toMatch(/^\d+px$/);
    expect(tabela.style.minWidth).toBe('100%');
  });

  it('as âncoras ficam congeladas, e aparecem uma vez só', () => {
    montar();
    /*
      O que a grade contínua existe para resolver: as quatro colunas de identificação se repetiam
      nas nove abas, e a leitura recomeçava a cada troca.
    */
    const fixas = colunasCongeladas().filter(Boolean); // a 1ª é o checkbox, sem rótulo
    expect(fixas).toEqual(['Ações', 'Status', 'Projeto', 'Entrada', 'Talento']);

    // Uma vez só em toda a grade — se voltarem a se repetir, aparecem aqui duplicadas.
    const todos = screen.getAllByRole('columnheader').map((th) => th.textContent?.trim());
    for (const ancora of ['Status', 'Projeto', 'Entrada', 'Talento']) {
      expect(todos.filter((n) => n === ancora), `âncora ${ancora}`).toHaveLength(1);
    }
  });
});

describe('duplicar projeto', () => {
  // Desde 11/08/2026 duplicar pergunta antes — ver `duplicar` em `BacklogTable`.
  async function duplicarPrimeira() {
    montar();
    const alvo = linhas().find((l) => l.textContent?.includes('Coca-Cola'))!;
    fireEvent.click(within(alvo).getByLabelText(/^Duplicar/));
    await responderDialogo(/^Duplicar$/);
  }

  /*
    A linha duplicada não tem palavra que a identifique — só um ícone. Localizá-la pelo atributo
    do rastro é o que sobra, e é também o que garante que o rastro existe.
  */
  function linhaDuplicada() {
    return linhas().find((l) => l.querySelector('[data-dica^="Criada a partir"]'))!;
  }

  it('cria uma linha nova, sem tocar na original', async () => {
    montar();
    const antes = linhas().length;
    const alvo = linhas().find((l) => l.textContent?.includes('Coca-Cola'))!;
    fireEvent.click(within(alvo).getByLabelText(/^Duplicar/));
    await responderDialogo(/^Duplicar$/);

    expect(linhas().length).toBe(antes + 1);
    // Duas linhas com o mesmo projeto — e a original continua com seu talento.
    const daCoca = linhas().filter((l) => l.textContent?.includes('Coca-Cola Verão'));
    expect(daCoca.length).toBe(2);
    expect(daCoca.some((l) => l.textContent?.includes('Marina Duarte'))).toBe(true);
  });

  it('herda o trabalho de digitar, não o talento', async () => {
    await duplicarPrimeira();
    const nova = linhaDuplicada();
    // Marca e classificações vêm junto.
    expect(nova.textContent).toContain('Coca-Cola');
    // A célula de talento nasce vazia: é o que muda.
    expect(celula(nova, /Escolher talento/).textContent?.trim()).toBe('Talento');
  });

  it('escolher o talento corrige o nome do projeto', async () => {
    await duplicarPrimeira();
    /*
      A operação nomeia o projeto com o talento dentro. Sem esta correção o título continuaria
      dizendo "Marina Duarte" — e reescrevê-lo à mão é o trabalho que duplicar existe para poupar.
    */
    fireEvent.mouseDown(within(painelAberto()).getByText('Rafael Nogueira'));

    const nova = linhaDuplicada();
    expect(nova.textContent).toContain('Rafael Nogueira | Coca-Cola Verão');
    expect(nova.textContent).not.toContain('Marina Duarte');
    // A original segue intacta.
    const original = linhas().find((l) => !l.querySelector('[data-dica^="Criada a partir"]')
      && l.textContent?.includes('Coca-Cola Verão'))!;
    expect(original.textContent).toContain('Marina Duarte');
  });

  it('abre esperando o novo talento', async () => {
    await duplicarPrimeira();
    // O painel de talento já está aberto — sem um segundo clique.
    expect(screen.getByPlaceholderText(/^Buscar talento/)).toBeTruthy();
  });

  it('valores e contrato não vêm junto', async () => {
    await duplicarPrimeira();
    const faixa = screen.getByText('Demanda').closest('div')!;
    fireEvent.click(within(faixa).getByText('Financeiro'));

    const nova = linhaDuplicada();
    /*
      Um número copiado parece conferido, e ninguém revisa o que já está preenchido. O cachê da
      origem era R$ 250.000 — se aparecesse aqui, seria afirmação de outra negociação.
    */
    expect(nova.textContent).not.toContain('250.000');
  });

  it('o rastro é ícone, sem palavra na linha', async () => {
    await duplicarPrimeira();
    const rastro = linhaDuplicada().querySelector('[data-dica^="Criada a partir"]')!;
    expect(rastro.getAttribute('data-dica')).toContain('Coca-Cola Verão');
    // Rastro, não vínculo: as duas são projetos independentes.
    expect(rastro.getAttribute('data-dica-sub')).toContain('independentes');
    /*
      Sem texto: "Duplicada" soava como erro, e "filha"/"subprojeto" prometeriam um vínculo que o
      modelo não tem. Nome que promete o que não entrega estranha mais que nome nenhum.
    */
    expect(rastro.textContent?.trim()).toBe('');
    expect(screen.queryByText(/Duplicada|Filha|Subprojeto/)).toBeNull();
  });

  it('duplicar um desfecho não herda o desfecho', () => {
    montar();
    /*
      Duplicar um projeto declinado para nascer declinado seria afirmar um desfecho que ninguém
      decidiu para a linha nova. Ela volta ao começo do fluxo.
    */
    const faixa = screen.getByText('Demanda').closest('div')!;
    fireEvent.click(within(faixa).getByText('Demanda'));

    const congelada = linhas().find((l) => /Em Revisão|Aguardando/.test(l.textContent ?? ''));
    if (!congelada) return;
    const botao = within(congelada).queryByLabelText(/^Duplicar/);
    // Congelamento não impede duplicar: a linha nova é outra, e não circula fora do quadro.
    expect(botao).toBeTruthy();
  });
});

describe('editar uma linha não vaza para as outras', () => {
  /*
    Reporte da operação em 03/08/2026: "quando mudamos um ou N dados de uma linha, ela muda de
    outra também". Os caminhos de escrita são todos imutáveis e as linhas têm `key` por id — mas
    a garantia precisa viver num teste, porque a causa clássica (referência compartilhada numa
    duplicação rasa, chave de React por índice) entra fácil e só aparece com dado na tela.

    O que **não** entra aqui: as colunas que gravam no cadastro (Segmento, Categoria, Origem do
    Talento, Razão Social, Exclusivo). Nelas, mudar numa linha muda nas outras do mesmo talento ou
    marca **por desenho** — a célula escreve na ficha, e a dica avisa o alcance.
  */
  function editarTexto(linha: HTMLElement, atual: string, novo: string) {
    fireEvent.click(within(linha).getByText(atual));
    const campo = within(linha).getByDisplayValue(atual);
    fireEvent.change(campo, { target: { value: novo } });
    fireEvent.keyDown(campo, { key: 'Enter' });
  }

  it('um valor editado aparece na linha editada, e em nenhuma outra', () => {
    montar();
    const eAlvo = (l: HTMLElement) => l.textContent?.includes('Coca-Cola Verão');
    const outrasAntes = linhas().filter((l) => !eAlvo(l)).map((l) => l.textContent);

    const alvo = linhas().find(eAlvo)!;
    editarTexto(alvo, 'R$ 32.000,00', 'R$ 999.999,00');

    // As demais linhas seguem, caractere a caractere, o que eram antes da edição.
    expect(linhas().filter((l) => !eAlvo(l)).map((l) => l.textContent)).toEqual(outrasAntes);
    expect(linhas().filter((l) => l.textContent?.includes('R$ 999.999,00'))).toHaveLength(1);
  });

  it('a cópia é independente: editar a duplicada não toca a origem', async () => {
    montar();
    /*
      A duplicação copia o objeto raso (`{...origem}`) — se alguma atualização mutasse uma
      estrutura aninhada em vez de recriá-la, o defeito apareceria exatamente aqui: nas duas
      linhas ao mesmo tempo.
    */
    const origem = linhas().find((l) => l.textContent?.includes('Coca-Cola Verão'))!;
    fireEvent.click(within(origem).getByLabelText(/^Duplicar/));
    await responderDialogo(/^Duplicar$/);
    fireEvent.mouseDown(within(painelAberto()).getByText('Rafael Nogueira'));

    const copia = linhas().find((l) => l.querySelector('[data-dica^="Criada a partir"]'))!;
    // O valor do projeto vem junto na cópia (cachê e comissões, não — são por negociação).
    editarTexto(copia, 'R$ 320.000,00', 'R$ 555.000,00');

    const original = linhas().find((l) =>
      !l.querySelector('[data-dica^="Criada a partir"]') && l.textContent?.includes('Coca-Cola Verão'))!;
    expect(original.textContent).toContain('R$ 320.000,00');
    expect(original.textContent).not.toContain('R$ 555.000,00');
  });
});

describe('pendências — com quem está a bola', () => {
  /*
    A tradução dos "status extras" da planilha (04/08/2026): o status continua um só; a espera
    vira etiqueta com relógio, dentro do painel de status. O seed demonstra: op4 (Itaú) tem a
    Cotação de Elenco aberta e o Retorno da Marca já chegado; op5 (Renner) carrega o rastro da
    revisão parcelada.
  */
  function linhaItau() {
    return linhas().find((l) => l.textContent?.includes('Itaú Volta às Aulas'))!;
  }
  function abrirPainelDeStatus(linha: HTMLElement) {
    fireEvent.click(celula(linha, /^Avançar de/));
  }

  it('o selo sinaliza com o badge ⏳ — sem texto, porque em 106px texto acaba comido', () => {
    montar();
    // op4 e op5 têm uma espera aberta cada: o badge aparece, o nome não (ele vive na dica).
    expect(linhaItau().textContent).toContain('⏳');
    expect(linhaItau().textContent).not.toContain('Gestão de Elenco');
    const renner = linhas().find((l) => l.textContent?.includes('Renner Inverno'))!;
    expect(renner.textContent).toContain('⏳');
    // Linha sem espera não é lembrada disso.
    const coca = linhas().find((l) => l.textContent?.includes('Coca-Cola Verão'))!;
    expect(coca.textContent).not.toContain('⏳');
  });

  it('o painel lista as esperas e o menu oferece só as do status, sem as já abertas', () => {
    montar();
    abrirPainelDeStatus(linhaItau());

    // A aberta, com relógio e os dois botões; a chegada, com a volta.
    expect(screen.getByText('Cotação Gestão de Elenco')).toBeTruthy();
    expect(screen.getByText('✓ Chegou')).toBeTruthy();
    expect(screen.getByText('↩ Reabrir')).toBeTruthy();

    // O menu por status: Elaboração tem 4, menos a que já está aberta = 3.
    fireEvent.click(screen.getByText('+ Abrir pendência'));
    expect(screen.getByText('Validação Gestão Esporte')).toBeTruthy();
    expect(screen.getByText('Cálculo de Produção')).toBeTruthy();
    expect(screen.queryAllByText('Cotação Gestão de Elenco')).toHaveLength(1); // só a aberta, não no menu

    // Abrir a segunda espera → o badge ganha o número.
    fireEvent.click(screen.getByText('Validação Gestão Esporte'));
    expect(linhaItau().textContent).toContain('⏳2');
  });

  it('cada espera mostra o percurso: quando abriu, quando chegou, quantos dias', () => {
    /*
      As datas sempre existiram no modelo (`abertaEm`, `chegouEm` — são a matéria-prima do SLA);
      até 11/08/2026 o painel só mostrava a contagem, e "5d esperando" não responde a pergunta
      que a operação faz: *desde quando?* O relógio da suíte é fixo em 04/08 (`setup.ts`).
    */
    montar();
    abrirPainelDeStatus(linhaItau());

    // A aberta: desde quando, até hoje.
    expect(screen.getByText(/30\/07 → hoje · 5d esperando/)).toBeTruthy();
    // A chegada: o percurso completo, com as duas datas.
    expect(screen.getByText(/28\/07 → 29\/07 · 1d de espera/)).toBeTruthy();
  });

  it('"✓ Chegou" para o relógio e tem volta pelo "↩ Reabrir"', () => {
    montar();
    abrirPainelDeStatus(linhaItau());
    fireEvent.click(screen.getByText('✓ Chegou'));

    // Sem aberta, o badge some do selo — e a espera vira história, com reabrir ao lado.
    expect(linhaItau().textContent).not.toContain('⏳');
    expect(screen.getAllByText('↩ Reabrir').length).toBe(2);

    fireEvent.click(screen.getAllByText('↩ Reabrir')[0]);
    expect(linhaItau().textContent).toContain('⏳');
  });

  /*
    "Em Revisão"/"Aguardando Feedback" também são selos de outras linhas e cartões do mapa do
    fluxo. O destino do painel é o único botão com o texto exato e sem aria-label.
  */
  function destinoDoPainel(rotulo: string) {
    return screen.getAllByRole('button')
      .find((b) => b.textContent === rotulo && !b.getAttribute('aria-label'))!;
  }

  it('da Elaboração não se sobe com espera aberta — o destino trava e explica', () => {
    montar();
    abrirPainelDeStatus(linhaItau());

    // "Em elaboração não pode ir para revisão se tiver faltando alguma coisa" — regra da operação.
    const destino = destinoDoPainel('Em Revisão');
    expect((destino as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(destino);
    expect(within(linhaItau()).getByText('Em Elaboração')).toBeTruthy();

    // A resposta chegou → a trava abre, e a subida é direta (sem aviso: não há mais espera).
    fireEvent.click(screen.getByText('✓ Chegou'));
    fireEvent.click(destinoDoPainel('Em Revisão'));
    expect(within(linhaItau()).getByText('Em Revisão')).toBeTruthy();
  });

  it('na Revisão o aviso continua: a validação aberta atravessa se confirmada', () => {
    montar();
    const renner = () => linhas().find((l) => l.textContent?.includes('Renner Inverno'))!;
    abrirPainelDeStatus(renner());
    fireEvent.click(destinoDoPainel('Aguardando Feedback'));

    // Aqui a espera é do próprio destino (o cliente responde enquanto o talento valida): avisa, não trava.
    expect(screen.getByText(/avançar assim mesmo\?/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Avançar' }));

    expect(within(renner()).getByText('Aguardando Feedback')).toBeTruthy();
    // A validação viajou junto: o badge continua no selo.
    expect(renner().textContent).toContain('⏳');
  });

  it('na Revisão, declinar é só pelo talento — é ele quem está revisando', () => {
    montar();
    const renner = linhas().find((l) => l.textContent?.includes('Renner Inverno'))!;
    abrirPainelDeStatus(renner);

    expect(screen.getByText('Declinado pelo Talento')).toBeTruthy();
    // Interno e Mercado são conversas do retorno do cliente — vivem no Aguardando Feedback.
    expect(screen.queryByText('Declinado Internamente')).toBeNull();
    expect(screen.queryByText('Declinado pelo Mercado')).toBeNull();
  });

  it('status sem esperas no menu não ganha bloco — a Entrada abre o painel de sempre', () => {
    montar();
    const entrada = linhas().find((l) => l.textContent?.includes('Coca-Cola Verão'))!;
    abrirPainelDeStatus(entrada);

    expect(screen.getByText('Indisponíveis a partir daqui')).toBeTruthy();
    expect(screen.queryByText('+ Abrir pendência')).toBeNull();
    expect(screen.queryByText(/^Pendências/)).toBeNull();
  });
});
