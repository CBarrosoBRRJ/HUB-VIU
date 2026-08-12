import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DadosProvider, useDados } from '../src/context/DadosProvider';
import { DialogoProvider } from '../src/components/ui/Dialogo';

afterEach(cleanup);

/**
 * O cenário exato da produção da operação, em 12/08/2026.
 *
 * Ela apagou usuários do seed e ficou com dois; os cards de equipe seguiram anunciando as pessoas
 * apagadas — *"mesmo sem equipe, aparece 1"*. Reproduzir o estado é o que separa "eu acho que
 * corrigi" de "corrigi".
 */
const DONO = {
  id: 'u0', nome: 'Caio', email: 'caio@viu.com.br', cargo: '', telefone: '', local: '',
  nascimento: '', perfil: 'admin', situacao: 'ativo', ehDono: true,
};
const ANA = {
  id: 'u1', nome: 'Ana Martins', email: 'ana@viu.com.br', cargo: '', telefone: '', local: '',
  nascimento: '', perfil: 'responsavel', situacao: 'ativo',
};

const EQUIPE = {
  id: 'e1', nome: 'Gestão de Contratos', criadaEm: '2026-08-01',
  paginasPermitidas: ['backlog'],
  membros: [{ usuarioId: 'u1', papel: 'membro' }],
};

function semear(usuarios: unknown[], equipes: unknown[]) {
  const k = (nome: string) => `viu:v12:${nome}`;
  localStorage.setItem(k('usuarios'), JSON.stringify(usuarios));
  localStorage.setItem(k('equipes'), JSON.stringify(equipes));
  localStorage.setItem(k('talentos'), JSON.stringify([]));
  localStorage.setItem(k('oportunidades'), JSON.stringify([]));
  localStorage.setItem(k('contratos'), JSON.stringify([]));
}

/** Espia o estado do provider e oferece o gesto de excluir. */
function Sonda() {
  const { equipes, usuarios, excluirUsuario } = useDados();
  return (
    <div>
      <button type="button" onClick={() => excluirUsuario('u1')}>__excluir__</button>
      <span data-testid="membros">{equipes[0]?.membros.length ?? -1}</span>
      <span data-testid="usuarios">{usuarios.length}</span>
    </div>
  );
}

function montar(usuarios: unknown[] = [DONO, ANA], equipes: unknown[] = [EQUIPE]) {
  semear(usuarios, equipes);
  return render(
    <DialogoProvider>
      <DadosProvider>
        <Sonda />
      </DadosProvider>
    </DialogoProvider>,
  );
}

describe('a equipe não guarda fantasma de quem foi excluído', () => {
  it('excluir a pessoa a tira da equipe no mesmo gesto', async () => {
    const usuario = userEvent.setup();
    montar();

    expect(screen.getByTestId('membros').textContent, 'a equipe começa com a Ana').toBe('1');

    await usuario.click(screen.getByText('__excluir__'));

    expect(screen.getByTestId('usuarios').textContent, 'a pessoa saiu da base').toBe('1');
    /*
      O defeito: a decisão de limpar as equipes era lida de uma variável escrita **dentro** do
      updater do `setUsuarios`. React roda o updater na renderização seguinte, não na hora — então
      a flag era sempre `false` no momento da leitura, e o vínculo ficava para trás.
    */
    expect(screen.getByTestId('membros').textContent, 'e saiu da equipe junto').toBe('0');
  });

  it('vínculo órfão gravado por versão anterior é descartado na leitura', () => {
    /*
      O reparo do dado que já está no navegador da operação. Mesma lógica do `semIdsRepetidos` e do
      `sanearCargos`: defeito que escreveu dado precisa de reparo na leitura, porque a persistência
      versiona por formato e não tem migração pontual.
    */
    montar([DONO], [EQUIPE]); // a Ana não existe mais, mas o vínculo dela sobrou

    expect(screen.getByTestId('membros').textContent, 'o fantasma não entra na aplicação').toBe('0');
  });
});
