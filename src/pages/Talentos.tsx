import { useMemo, useState } from 'react';
import { IdCard, Star, Users } from 'lucide-react';
import { Header } from '../components/Header';
import { useDados } from '../context/DadosProvider';
import { CampoTalento, TalentosTable } from '../components/talentos-exclusivos/TalentosTable';
import { ehDono, registrosVisiveis } from '../utils/permissoes';
import {
  contarTalentos, FiltroTalento, matchesFiltroTalento, nomeadosDoTalento, nomeEmUso,
} from '../utils/talentos';
import { colunasOcultasNaVisao, podeVerVisao, visoesDoQuadro } from '../utils/visoes';
import { COLUNAS_TALENTOS, colunasDaVisao } from '../utils/colunas';
import { filtrarTalentos } from '../utils/busca';

/** Nome de uma ficha recém-criada — ver `handleCriar`. */
export const TALENTO_PROVISORIO = 'Sem nome';

/**
 * Talentos.
 *
 * Guarda **exclusivos e interveniência** no mesmo cadastro — muda o vínculo comercial, não a
 * pessoa. O quadro de Contratos referencia estas fichas pelo nome.
 */
export function Talentos() {
  const {
    sessao, talentos, contratos, usuarios, equipes, criarTalento, atualizarTalento, excluirTalento,
  } = useDados();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroTalento>('todos');

  // Membro vê só as fichas em que foi nomeado; responsável e admin, o quadro todo.
  const permitidos = useMemo(
    () => registrosVisiveis(sessao, 'talentos', talentos, nomeadosDoTalento),
    [sessao, talentos],
  );

  /** Abas liberadas para esta sessão — a de dado pessoal e a financeira são restritas. */
  const visoesVisiveis = useMemo(() => {
    const contexto = { usuario: sessao.usuario, equipes };
    return visoesDoQuadro('talentos')
      .filter((visao) => podeVerVisao(contexto, visao.id, ehDono(sessao.usuario)))
      .map((visao) => visao.id);
  }, [sessao.usuario, equipes]);

  /** Colunas bloqueadas para esta sessão — a célula vira um borrão, a linha não se desmonta. */
  const colunasOcultas = useMemo(() => {
    const contexto = { usuario: sessao.usuario, equipes };
    const todas = Object.values(COLUNAS_TALENTOS).flat();
    return colunasOcultasNaVisao(contexto, todas, ehDono(sessao.usuario));
  }, [sessao.usuario, equipes]);

  /**
   * Colunas efetivamente visíveis: as das abas liberadas, menos as ocultas.
   *
   * É o que a busca varre. Procurar num campo que a tela esconde confirmaria o dado sem
   * exibi-lo — e as duas camadas de permissão precisam valer para a busca, não só para a grade.
   */
  const colunasVisiveis = useMemo(
    () =>
      visoesVisiveis
        .flatMap((visao) => colunasDaVisao(visao))
        .map((coluna) => coluna.id)
        .filter((id) => !colunasOcultas.includes(id)),
    [visoesVisiveis, colunasOcultas],
  );

  // Contagem sobre o conjunto permitido: os chips medem o quadro inteiro que a pessoa enxerga,
  // não o resultado da busca — senão o número mudaria a cada tecla.
  const contagem = useMemo(() => contarTalentos(permitidos), [permitidos]);

  /** Filtro primeiro, busca depois — a busca opera dentro do recorte escolhido. */
  const doFiltro = useMemo(
    () => permitidos.filter((talento) => matchesFiltroTalento(talento, filtro)),
    [permitidos, filtro],
  );

  const visiveis = useMemo(
    () => filtrarTalentos(doFiltro, busca, usuarios, colunasVisiveis),
    [doFiltro, busca, usuarios, colunasVisiveis],
  );

  /**
   * Insere uma ficha vazia e devolve o id, para a tabela abrir o nome em edição.
   *
   * O nome provisório é numerado — "Sem nome 2", "Sem nome 3" — porque o cadastro **recusa nomes
   * repetidos**: criar duas fichas seguidas sem renomear a primeira falharia em silêncio.
   */
  function handleCriar(): string | null {
    let nome = TALENTO_PROVISORIO;
    for (let n = 2; nomeEmUso(nome, talentos); n += 1) nome = `${TALENTO_PROVISORIO} ${n}`;
    return criarTalento(nome)?.id ?? null;
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header
        title="Talentos"
        subtitle="Cadastro dos talentos agenciados — exclusivos e de interveniência — com contato, redes, dados comerciais e quem responde por cada frente."
        hints={[
          { icon: Star, text: 'Exclusivos e interveniência no mesmo lugar' },
          { icon: IdCard, text: 'Uma linha por talento' },
          { icon: Users, text: 'Cada área puxa gente da sua equipe' },
        ]}
      />

      <main className="flex min-h-0 flex-1 flex-col bg-[#f4f6fa] p-6">
        {/* `min-h-0` deixa o card encolher abaixo do conteúdo — é o que faz a lista rolar. */}
        <div className="min-h-0 flex-1">
          <TalentosTable
            talentos={visiveis}
            total={doFiltro.length}
            contratos={contratos}
            busca={busca}
            onBuscaChange={setBusca}
            filtro={filtro}
            onFiltroChange={setFiltro}
            contagem={contagem}
            visoesVisiveis={visoesVisiveis}
            colunasOcultas={colunasOcultas}
            onCriar={handleCriar}
            onUpdateCampo={(id: string, campo: CampoTalento, valor: string) =>
              atualizarTalento(id, campo, valor)
            }
            onDeleteMany={(ids: string[]) => ids.forEach((id) => excluirTalento(id))}
          />
        </div>
      </main>
    </div>
  );
}
