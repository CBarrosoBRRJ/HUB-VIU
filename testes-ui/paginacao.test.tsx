/**
 * A grade pagina em 20 — 14/08/2026.
 *
 * Pedido da operação, com a faixa dela: *"poderíamos pensar em algo como 15 a 20 projetos, passar
 * para outra página?"*. O cenário de teste semeia 25 linhas — uma página cheia mais um resto —
 * porque o seed padrão (9) nunca pagina, e é exatamente assim que a paginação quebraria em
 * silêncio: todos os testes verdes numa lista que nunca precisou dela.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DadosProvider } from '../src/context/DadosProvider';
import { DialogoProvider } from '../src/components/ui/Dialogo';
import { BacklogAgenciados } from '../src/pages/BacklogAgenciados';

afterEach(cleanup);

/** 25 oportunidades mínimas em Entrada — o shape que a grade lê sem quebrar. */
function semear(n = 25) {
  const hoje = '2026-08-04';
  const ops = Array.from({ length: n }, (_, i) => ({
    id: `op${1000 + i}`, titulo: `Projeto ${String(i + 1).padStart(2, '0')}`, marca: '', talento: '',
    exclusivo: false, escopo: '', status: 'entrada', statusDesde: hoje, entradaEm: hoje,
    prazoEm: '2026-08-11', responsaveis: {}, pendencias: [], valorProjeto: '', cache: '',
    comissaoGlobo: '', comissao: '', impostos: '', custoProducao: '', saving: '', pep: '',
    linkProposta: '', linkSalesforce: '', linkPastaOrcamento: '', linkPastaPlanejamento: '',
    tipoContratacao: '', numeroContrato: '', contatoCliente: '', observacoes: '',
    entradaPor: 'manual', revisada: true, criadoEm: new Date(2026, 7, 4).toISOString(),
  }));
  localStorage.setItem('viu:v12:oportunidades', JSON.stringify(ops));
}

function montar() {
  return render(
    <DialogoProvider>
      <DadosProvider>
        <BacklogAgenciados />
      </DadosProvider>
    </DialogoProvider>,
  );
}

function linhasDeDados() {
  return screen.getAllByRole('row').filter((l) => l.querySelector('td'));
}

describe('a grade pagina em 20', () => {
  it('mostra 20, anuncia o resto, e a próxima página entrega', async () => {
    const usuario = userEvent.setup();
    semear(25);
    try {
      montar();

      expect(linhasDeDados().length, 'a primeira página é a janela de 20').toBe(20);
      // "de 25" também aparece em "Exclusivos: 0 de 25" — a âncora é o par posição+total.
      expect(screen.getByText(/1–20/).parentElement?.textContent, 'os controles dizem a posição')
        .toContain('de 25');

      await usuario.click(screen.getByRole('button', { name: /próxima página/i }));

      expect(linhasDeDados().length, 'a última página traz só o resto').toBe(5);
      expect(screen.getByText(/21–25/)).toBeTruthy();
      // O rodapé continua falando do recorte inteiro — totais não são paginados.
      expect(screen.getByText(/Total no grupo/).parentElement?.textContent).toContain('25');
    } finally {
      localStorage.removeItem('viu:v12:oportunidades');
    }
  });

  it('com uma página só, controle nenhum aparece', () => {
    // O seed padrão (< 20 em qualquer etapa) nunca pagina: paginação numa lista que cabe é ruído.
    montar();
    expect(screen.queryByRole('button', { name: /próxima página/i })).toBeNull();
  });

  it('"Marcar Visíveis" marca a página, não o recorte', async () => {
    /*
      A regra de sempre — "a seleção só vale para o que está na tela" — com a tela menor. Marcar
      25 linhas das quais 5 estão fora de vista devolveria o defeito que a regra original matou:
      excluir em lote o que ninguém estava vendo.
    */
    const usuario = userEvent.setup();
    semear(25);
    try {
      montar();
      await usuario.click(screen.getByRole('button', { name: /Marcar Visíveis/ }));
      expect(screen.getByText(/Desmarcar Todas \(20\)/), 'marcou os 20 da página').toBeTruthy();
      expect(screen.getByText(/Excluir em Lote \(20\)/)).toBeTruthy();
    } finally {
      localStorage.removeItem('viu:v12:oportunidades');
    }
  });
});
