import { useEffect, useState } from 'react';
import { Users, ShieldCheck, UserPlus } from 'lucide-react';
import { Header } from '../components/Header';
import { ListaEquipes } from '../components/equipes/ListaEquipes';
import { DetalheEquipe } from '../components/equipes/DetalheEquipe';
import { useDados } from '../context/DadosProvider';
import { equipesVisiveis, podeCriarEquipe } from '../utils/permissoes';
import { AppPage } from '../types';

export function Equipes() {
  const { criarEquipe, sessao } = useDados();
  const [equipeAtivaId, setEquipeAtivaId] = useState<string | null>(null);

  // Cada um enxerga apenas as equipes de que participa; o admin vê todas.
  const equipes = equipesVisiveis(sessao);
  const podeCriar = podeCriarEquipe(sessao);

  // Mantém uma equipe sempre selecionada: a primeira, ou nenhuma quando a lista esvazia.
  useEffect(() => {
    if (equipes.length === 0) {
      setEquipeAtivaId(null);
      return;
    }
    if (!equipeAtivaId || !equipes.some((equipe) => equipe.id === equipeAtivaId)) {
      setEquipeAtivaId(equipes[0].id);
    }
  }, [equipes, equipeAtivaId]);

  function handleCriar(nome: string, paginas: AppPage[]) {
    const nova = criarEquipe(nome, paginas);
    setEquipeAtivaId(nova.id);
  }

  const equipeAtiva = equipes.find((equipe) => equipe.id === equipeAtivaId);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header
        title="Equipes"
        subtitle="Organize as pessoas em equipes e defina quais quadros do Workspace cada uma enxerga."
        hints={[
          { icon: Users, text: 'Uma equipe por área ou frente de trabalho' },
          { icon: UserPlus, text: 'Cadastre a pessoa uma vez e reaproveite nas demais equipes' },
          { icon: ShieldCheck, text: 'Responsável responde pela equipe; membro participa' },
        ]}
      />

      <div className="flex flex-1 overflow-hidden">
        <ListaEquipes
          equipes={equipes}
          equipeAtivaId={equipeAtivaId}
          onSelecionar={setEquipeAtivaId}
          onCriar={handleCriar}
          podeCriar={podeCriar}
        />

        {equipeAtiva ? (
          <DetalheEquipe key={equipeAtiva.id} equipe={equipeAtiva} />
        ) : (
          <div className="flex flex-1 items-center justify-center bg-[#f4f6fa] p-6">
            <div className="max-w-sm text-center">
              <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm ring-1 ring-slate-200">
                <Users className="size-6" />
              </span>
              <p className="font-display text-base font-bold text-slate-800">
                {podeCriar ? 'Nenhuma equipe ainda' : 'Você não administra nenhuma equipe'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {podeCriar
                  ? 'Crie a primeira equipe na coluna à esquerda para começar a cadastrar as pessoas.'
                  : 'Peça a um administrador para incluir você como responsável de uma equipe.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
