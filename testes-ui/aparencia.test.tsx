/**
 * O controle de tamanho de texto — Meu Perfil, card "Tamanho do texto".
 *
 * O que só um teste de interface vê: o clique e o arrasto de verdade chegando à raiz do documento
 * e à persistência. As regras de `utils/aparencia.ts` são triviais de propósito; o risco está na
 * fiação — o botão que não aplica, a régua que não grava, a escolha que não sobrevive ao F5.
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { DadosProvider } from '../src/context/DadosProvider';
import { DialogoProvider } from '../src/components/ui/Dialogo';
import { MeuPerfil } from '../src/pages/MeuPerfil';
import { FAIXA_FATOR, fatorTextoSalvo, limitarFator, restaurarFatorTexto } from '../src/utils/aparencia';

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.style.removeProperty('--texto-pessoal');
});
afterEach(cleanup);

function montar() {
  return render(
    <DialogoProvider>
      <DadosProvider>
        <MeuPerfil />
      </DadosProvider>
    </DialogoProvider>,
  );
}

function fatorAplicado(): string {
  return document.documentElement.style.getPropertyValue('--texto-pessoal');
}

describe('o tamanho do texto', () => {
  it('oferece os três atalhos e a régua, com Padrão valendo', () => {
    montar();
    for (const opcao of ['Compacto', 'Padrão', 'Confortável']) {
      expect(screen.getByRole('radio', { name: new RegExp(opcao) })).toBeTruthy();
    }
    expect(screen.getByRole('radio', { name: /Padrão/ }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('slider', { name: /ajuste fino/i })).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('o atalho aplica na raiz, na hora', () => {
    montar();
    fireEvent.click(screen.getByRole('radio', { name: /Confortável/ }));

    // É isto que faz o sistema inteiro mudar: tudo é rem, e o rem nasce daqui.
    expect(fatorAplicado()).toBe('1.07');
    expect(screen.getByRole('radio', { name: /Confortável/ }).getAttribute('aria-checked')).toBe('true');
  });

  it('a régua encontra o ponto que os atalhos não têm', () => {
    /*
      O caso que a criou: no monitor de 32", 16px foi "pequeno", +8% foi "imenso" e +2% "ainda
      ruim" — a janela de conforto é mais fina que qualquer degrau nomeado. A régua vai de 1 em 1%.
    */
    montar();
    fireEvent.change(screen.getByRole('slider', { name: /ajuste fino/i }), { target: { value: '104' } });

    expect(fatorAplicado()).toBe('1.04');
    expect(screen.getByText('104%')).toBeTruthy();
    // Fora dos atalhos, nenhum deles acende — a régua é a posição, não um deles "quase".
    for (const opcao of ['Compacto', 'Padrão', 'Confortável']) {
      expect(screen.getByRole('radio', { name: new RegExp(opcao) }).getAttribute('aria-checked')).toBe('false');
    }
  });

  it('a escolha sobrevive ao F5', () => {
    montar();
    fireEvent.change(screen.getByRole('slider', { name: /ajuste fino/i }), { target: { value: '109' } });
    cleanup();

    // O F5: a raiz zera, e a carga da aplicação restaura o que foi gravado (main.tsx).
    document.documentElement.style.removeProperty('--texto-pessoal');
    restaurarFatorTexto();

    expect(fatorTextoSalvo()).toBe(1.09);
    expect(fatorAplicado()).toBe('1.09');

    montar();
    expect(screen.getByText('109%')).toBeTruthy();
  });

  it('a faixa se defende do que estiver gravado', () => {
    // Valor fora da régua — edição manual do localStorage, versão antiga, o que for.
    expect(limitarFator(3)).toBe(FAIXA_FATOR.max);
    expect(limitarFator(0.1)).toBe(FAIXA_FATOR.min);
    expect(limitarFator(Number.NaN)).toBe(1);
  });
});
