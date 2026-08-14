import { useMemo, useRef, useState } from 'react';
import { useDados } from '../context/DadosProvider';
import { CalendarClock, Rows3, Workflow } from 'lucide-react';
import { Header } from '../components/Header';
import { CampoEditavel, ContratosTable } from '../components/talentos/ContratosTable';
import { TalentoStatus } from '../utils/talentosStatus';
import { getVigenciaInfo, matchesFiltro, contarPorFarol, VigenciaFiltro } from '../utils/vigencia';
import { definirPapel, Papel } from '../utils/pessoas';
import { nomeadosDoContrato, registrosVisiveis } from '../utils/permissoes';
import { filtrarContratos } from '../utils/busca';
import { todayISO } from '../utils/dates';

/**
 * Nome de um contrato recém-criado.
 *
 * A coluna Talento é a chave da linha e abre em edição ao criar. A ficha em Talentos **não** nasce
 * agora: `garantirTalento` só roda quando o nome de verdade for digitado, senão o cadastro se
 * encheria de fichas "Sem talento".
 */
export const TALENTO_PROVISORIO = 'Sem talento';

export function ContratosTalentos() {
  // Os contratos vivem no estado compartilhado: a administração precisa deles para saber
  // se alguém tem histórico antes de tirá-lo de uma equipe.
  const {
    contratos: todos, setContratos: setContracts, usuarios, sessao, garantirTalento,
  } = useDados();
  const [filtro, setFiltro] = useState<VigenciaFiltro>('todos');
  const [busca, setBusca] = useState('');
  /** Sequência própria: derivar do tamanho da lista repetiria ids após exclusões. */
  const proximoId = useRef(1);

  // Membro vê só as linhas em que foi nomeado — o farol conta em cima do que ele enxerga,
  // senão os números da barra denunciariam contratos que a grade não mostra.
  const contracts = useMemo(
    () => registrosVisiveis(sessao, 'contratos', todos, nomeadosDoContrato),
    [sessao, todos],
  );

  const counts = useMemo(() => contarPorFarol(contracts), [contracts]);

  /** Farol primeiro, busca depois — o "N de M" mede dentro da aba aberta. */
  const doFarol = useMemo(
    () => contracts.filter((contract) => matchesFiltro(getVigenciaInfo(contract), filtro)),
    [contracts, filtro],
  );

  const visiveis = useMemo(
    () => filtrarContratos(doFarol, busca, usuarios),
    [doFarol, busca, usuarios],
  );

  /**
   * Insere uma linha vazia e devolve o id, para a tabela abrir o talento em edição.
   *
   * O nome nasce provisório porque a coluna Talento é a chave da linha — e é ela que abre em
   * edição. A ficha em Talentos **não** é criada agora: `garantirTalento` roda quando o nome de
   * verdade for digitado, senão o quadro se encheria de fichas "Sem talento".
   */
  function handleCreate(): string | null {
    const id = `CT-${String(proximoId.current).padStart(3, '0')}`;
    proximoId.current += 1;
    setContracts((current) => [
      {
        id,
        talento: TALENTO_PROVISORIO,
        contrato: '',
        numero: '',
        inicio: todayISO(),
        fim: '',
        status: 'Criação',
        responsaveisIds: [],
        parceirosIds: [],
        criadoEm: new Date().toISOString(),
      },
      ...current,
    ]);
    return id;
  }

  function handleChangeStatus(id: string, status: TalentoStatus) {
    setContracts((current) =>
      current.map((contract) => (contract.id === id ? { ...contract, status } : contract)),
    );
  }

  function handleUpdateCampo(id: string, campo: CampoEditavel, valor: string) {
    /*
      Escrever um nome na coluna Talento resolve — ou cria — a ficha correspondente.

      A criação acontece **fora** do `setContracts` porque `garantirTalento` também escreve
      estado; chamá-la dentro do reducer a executaria duas vezes no StrictMode e abriria duas
      fichas para o mesmo nome.
    */
    const talentoId = campo === 'talento' ? garantirTalento(valor) ?? undefined : undefined;

    setContracts((current) =>
      current.map((contract) => {
        if (contract.id !== id) return contract;
        const atualizado = { ...contract, [campo]: valor };
        if (campo === 'talento') atualizado.talentoId = talentoId;
        return atualizado;
      }),
    );
  }

  function handleDefinirPapel(id: string, usuarioId: string, papel: Papel | null) {
    setContracts((current) =>
      current.map((contract) =>
        contract.id === id ? { ...contract, ...definirPapel(contract, usuarioId, papel) } : contract,
      ),
    );
  }

  function handleDeleteMany(ids: string[]) {
    const alvos = new Set(ids);
    setContracts((current) => current.filter((contract) => !alvos.has(contract.id)));
  }

  return (
    <div className="flex min-h-full flex-col">
      <Header
        title="Contratos de Agenciados"
        subtitle="Gestão dos contratos dos talentos agenciados — da minuta à assinatura, com controle de vigência e renovações."
        hints={[
          { icon: Rows3, text: 'Uma linha por contrato' },
          { icon: CalendarClock, text: 'Datas de início e fim sempre atualizadas' },
          { icon: Workflow, text: 'Status movimentado conforme a esteira' },
        ]}
      />

      <main className="flex min-h-0 flex-1 flex-col bg-[#f4f6fa] p-6">
        {/* `min-h-0` deixa o card encolher abaixo do conteúdo — é o que faz a lista rolar. */}
        <div className="min-h-0 flex-1">
          <ContratosTable
            contracts={visiveis}
            totalDoFiltro={doFarol.length}
            busca={busca}
            onBuscaChange={setBusca}
            counts={counts}
            filtro={filtro}
            onFiltroChange={setFiltro}
            onCreate={handleCreate}
            onChangeStatus={handleChangeStatus}
            onUpdateCampo={handleUpdateCampo}
            onDefinirPapel={handleDefinirPapel}
            onDeleteMany={handleDeleteMany}
          />
        </div>
      </main>
    </div>
  );
}
