import { Fragment, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowDown, ArrowUp, CheckSquare, ChevronsUpDown, FileSpreadsheet, Group, Lock, Pencil, Plus, Trash2, Check,
} from 'lucide-react';
import { TalentContract } from '../../types';
import { useDados } from '../../context/DadosProvider';
import { STATUS_STYLE, TALENTO_STATUSES, TalentoStatus } from '../../utils/talentosStatus';
import { formatDataCurta, formatDataHora, formatDate, todayISO } from '../../utils/dates';
import { baixarXlsx, ColunaExportada } from '../../utils/exportacao';
import { getVigenciaInfo, VigenciaCounts, VigenciaFiltro } from '../../utils/vigencia';
import { Papel } from '../../utils/pessoas';
import { valoresUsados } from '../../utils/referencias';
import { podeCriarRegistro, podeEditarRegistro, podeExcluirRegistro } from '../../utils/permissoes';
import { StatusSelect } from './StatusSelect';
import { VigenciaCell } from './VigenciaCell';
import { ResponsavelCell } from './ResponsavelCell';
import { GrupoHeader } from './GrupoHeader';
import { EditableCell } from '../ui/EditableCell';
import { BuscaQuadro } from '../ui/BuscaQuadro';
import { VinculoTalento } from './VinculoTalento';
import { CelulaReferencia } from '../ui/CelulaReferencia';

type SortField = 'talento' | 'contrato' | 'numero' | 'inicio' | 'fim' | 'status' | 'criadoEm';
type SortDirection = 'asc' | 'desc';
type Agrupamento = 'nenhum' | 'status' | 'talento' | 'responsavel';

/** Campos de texto e data editáveis direto na grade. */
export type CampoEditavel = 'talento' | 'contrato' | 'numero' | 'inicio' | 'fim';

/**
 * Talento e Contrato são textuais e ficam à esquerda; o resto é centralizado.
 *
 * `width` alimenta o `<colgroup>` e **soma 100%** — com `table-fixed`, é o que garante que o
 * cabeçalho fique sobre a coluna certa qualquer que seja o conteúdo das linhas.
 */
const COLUMNS: {
  field?: SortField;
  label: string;
  width: string;
  align: 'left' | 'center';
  hint?: string;
}[] = [
  { field: 'talento', label: 'Talento', width: '15%', align: 'left' },
  {
    field: 'contrato',
    label: 'Contrato',
    width: '16%',
    align: 'left',
    hint: 'Do que é o contrato — ex.: Contrato de agenciamento, Campanha Coca-Cola',
  },
  {
    label: 'Responsável',
    width: '11%',
    align: 'center',
    hint: 'Responsáveis (coroa) respondem pelo contrato; parceiros apoiam a tramitação. Uma linha aceita vários de cada.',
  },
  { field: 'numero', label: 'Número', width: '9%', align: 'center' },
  { field: 'inicio', label: 'Início', width: '8%', align: 'center' },
  { field: 'fim', label: 'Fim', width: '8%', align: 'center' },
  { field: 'status', label: 'Status', width: '12%', align: 'center' },
  {
    label: 'Vigência',
    width: '11%',
    align: 'center',
    hint: 'Farol do prazo: verde acima de 30 dias, amarelo abaixo de 30 dias, vermelho vencido. A barra mostra quanto do contrato já decorreu.',
  },
  {
    field: 'criadoEm',
    label: 'Criado em',
    width: '6%',
    align: 'center',
    hint: 'Data em que a linha foi cadastrada — preenchida automaticamente',
  },
  { label: 'Ações', width: '4%', align: 'center' },
];

/** checkbox + colunas — usado no colspan das faixas de grupo e do estado vazio. */
const TOTAL_COLUNAS = COLUMNS.length + 1;

const TABS: { filtro: VigenciaFiltro; label: string; dot: string }[] = [
  { filtro: 'todos', label: 'Todos', dot: 'bg-slate-400' },
  { filtro: 'vigentes', label: 'Vigentes', dot: 'bg-emerald-500' },
  { filtro: 'a_vencer', label: 'A vencer', dot: 'bg-amber-500' },
  { filtro: 'vencidos', label: 'Vencidos', dot: 'bg-red-500' },
];

const AGRUPAMENTOS: { valor: Agrupamento; label: string }[] = [
  { valor: 'nenhum', label: 'Sem agrupamento' },
  { valor: 'status', label: 'Agrupar por Status' },
  { valor: 'talento', label: 'Agrupar por Talento' },
  { valor: 'responsavel', label: 'Agrupar por Responsável' },
];

interface ContratosTableProps {
  /** Já filtrados pela aba ativa e pela busca. */
  contracts: TalentContract[];
  /** Total do farol ativo antes da busca — o denominador do "N de M". */
  totalDoFiltro: number;
  busca: string;
  onBuscaChange: (valor: string) => void;
  counts: VigenciaCounts;
  filtro: VigenciaFiltro;
  onFiltroChange: (filtro: VigenciaFiltro) => void;
  /** Insere uma linha vazia e devolve o id — ou `null` se não foi possível. */
  onCreate: () => string | null;
  onChangeStatus: (id: string, status: TalentoStatus) => void;
  onUpdateCampo: (id: string, campo: CampoEditavel, valor: string) => void;
  onDefinirPapel: (id: string, usuarioId: string, papel: Papel | null) => void;
  onDeleteMany: (ids: string[]) => void;
}

export function ContratosTable({
  contracts, totalDoFiltro, busca, onBuscaChange, counts, filtro, onFiltroChange, onCreate,
  onChangeStatus, onUpdateCampo, onDefinirPapel, onDeleteMany,
}: ContratosTableProps) {
  const { getUsuario, sessao, talentos } = useDados();
  const podeCriar = podeCriarRegistro(sessao, 'contratos');

  /**
   * Nomes oferecidos na coluna Talento.
   *
   * Junta o cadastro de Talentos com o que já foi digitado em outros contratos — quem ainda não
   * tem ficha precisa aparecer, senão a segunda linha do mesmo talento continuaria livre para
   * divergir. `valoresUsados` devolve a grafia mais frequente de cada variante.
   */
  const nomesDeTalentos = useMemo(
    () => [
      ...new Set([
        ...talentos.map((talento) => talento.nome),
        ...valoresUsados(contracts as unknown as Record<string, unknown>[], 'talento'),
      ]),
    ].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [talentos, contracts],
  );

  const [sort, setSort] = useState<{ field: SortField; direction: SortDirection } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [agrupamento, setAgrupamento] = useState<Agrupamento>('nenhum');
  const [gruposFechados, setGruposFechados] = useState<Set<string>>(new Set());
  const [linhaEmEdicao, setLinhaEmEdicao] = useState<string | null>(null);
  /** Linha recém-criada, com o talento já em edição — ver a mesma decisão em `BacklogTable`. */
  const [recemCriado, setRecemCriado] = useState<string | null>(null);

  /** Cria o contrato e deixa a chave pronta para digitar. */
  function novoRegistro() {
    const id = onCreate();
    if (id) setRecemCriado(id);
  }

  const sortedContracts = useMemo(() => {
    if (!sort) return contracts;
    const fator = sort.direction === 'asc' ? 1 : -1;

    /*
      Status segue a esteira, não o dicionário.

      Alfabeticamente a coluna daria "Aprovação Conecta, Aprovação Inicial, Cancelado, Chancela…"
      — uma sequência que não corresponde a etapa nenhuma. O agrupamento por status já usava a
      ordem canônica (`TALENTO_STATUSES`); ordenar pela coluna usava outra, e as duas leituras da
      mesma tela discordavam.
    */
    const comparar = (a: TalentContract, b: TalentContract) => {
      if (sort.field === 'status') {
        return TALENTO_STATUSES.indexOf(a.status) - TALENTO_STATUSES.indexOf(b.status);
      }
      return String(a[sort.field] ?? '').localeCompare(String(b[sort.field] ?? ''), 'pt-BR');
    };

    return [...contracts].sort((a, b) => fator * comparar(a, b));
  }, [contracts, sort]);

  /** Grupos na ordem canônica da esteira (status) ou alfabética (demais). */
  const grupos = useMemo(() => {
    if (agrupamento === 'nenhum') return [];

    if (agrupamento === 'status') {
      return TALENTO_STATUSES
        .map((status) => ({
          chave: status,
          titulo: status,
          cor: STATUS_STYLE[status].solid,
          itens: sortedContracts.filter((contract) => contract.status === status),
        }))
        .filter((grupo) => grupo.itens.length > 0);
    }

    // Com vários responsáveis, o principal (o primeiro) define o grupo — assim
    // cada contrato aparece uma única vez e as contagens continuam somando.
    const chaveDe = (contract: TalentContract) =>
      agrupamento === 'talento' ? contract.talento.trim() || '—' : contract.responsaveisIds[0] ?? '';

    const mapa = new Map<string, TalentContract[]>();
    for (const contract of sortedContracts) {
      const chave = chaveDe(contract);
      const lista = mapa.get(chave) ?? [];
      lista.push(contract);
      mapa.set(chave, lista);
    }

    return [...mapa.entries()]
      .map(([chave, itens]) => ({
        chave,
        titulo: agrupamento === 'talento' ? chave : getUsuario(chave)?.nome ?? 'Sem responsável',
        cor: agrupamento === 'talento' ? 'bg-violet-500' : 'bg-indigo-500',
        itens,
      }))
      .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
  }, [agrupamento, sortedContracts]);

  function toggleSort(field: SortField) {
    setSort((current) => {
      if (current?.field !== field) return { field, direction: 'asc' };
      if (current.direction === 'asc') return { field, direction: 'desc' };
      return null;
    });
  }

  function toggleGrupo(chave: string) {
    setGruposFechados((current) => {
      const next = new Set(current);
      if (next.has(chave)) next.delete(chave);
      else next.add(chave);
      return next;
    });
  }

  function toggleSelection(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(
      selecao.length === contracts.length ? new Set() : new Set(contracts.map((c) => c.id)),
    );
  }

  function exportarParaExcel() {
    const colunasExportadas: ColunaExportada[] = [
      { rotulo: 'Talento', valor: (i: number) => sortedContracts[i].talento },
      { rotulo: 'Contrato', valor: (i: number) => sortedContracts[i].contrato || '' },
      {
        rotulo: 'Responsáveis',
        valor: (i: number) =>
          sortedContracts[i].responsaveisIds
            .map((id) => getUsuario(id)?.nome)
            .filter(Boolean)
            .join(', '),
      },
      { rotulo: 'Número', valor: (i: number) => sortedContracts[i].numero },
      { rotulo: 'Início', valor: (i: number) => formatDate(sortedContracts[i].inicio) },
      { rotulo: 'Fim', valor: (i: number) => formatDate(sortedContracts[i].fim) },
      { rotulo: 'Status', valor: (i: number) => sortedContracts[i].status },
      {
        rotulo: 'Vigência',
        valor: (i: number) => getVigenciaInfo(sortedContracts[i]).label,
      },
      { rotulo: 'Criado em', valor: (i: number) => formatDate(sortedContracts[i].criadoEm) },
    ];

    const dataLegivel = formatDate(todayISO()).replace(/\//g, '-');
    try {
      baixarXlsx(
        `Contratos de Agenciados - ${dataLegivel}.xlsx`,
        colunasExportadas,
        sortedContracts.length,
        'Contratos',
      );
    } catch {
      window.alert('Não foi possível gerar o Excel. Recarregue a página e tente de novo.');
    }
  }

  function handleDeleteMany(ids: string[], rotulo: string) {
    if (!window.confirm(`Excluir ${rotulo}? Esta ação não pode ser desfeita.`)) return;
    onDeleteMany(ids);
    setSelectedIds(new Set());
  }

  /*
    A seleção só vale para o que está na tela.

    Limpar por lista de dependências sempre esquece um caso: a linha também sai da lista ao mudar
    de status ou vigência. O id continuava marcado e invisível, e "Excluir em Lote" apagava o que ninguém
    estava vendo. Derivar da interseção com as linhas visíveis se corrige sozinha.
  */
  const selecao = useMemo(
    () => contracts.filter((c) => selectedIds.has(c.id)).map((c) => c.id),
    [contracts, selectedIds],
  );
  const hasSelection = selecao.length > 0;

  function renderLinha(contract: TalentContract) {
    // Membro só mexe no que está nomeado para ele; responsável e admin, no quadro todo.
    const podeEditar = podeEditarRegistro(sessao, 'contratos', contract);
    const podeExcluir = podeExcluirRegistro(sessao, 'contratos', contract);
    const emEdicao = podeEditar && linhaEmEdicao === contract.id;

    return (
      <motion.tr
        key={contract.id}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={`border-b border-slate-100 transition-colors ${
          emEdicao ? 'bg-indigo-50/40' : 'hover:bg-slate-50/70'
        }`}
      >
        <td className="px-3 py-3">
          <input
            type="checkbox"
            aria-label={`Selecionar contrato de ${contract.talento}`}
            checked={selectedIds.has(contract.id)}
            onChange={() => toggleSelection(contract.id)}
            className="size-3.5 cursor-pointer accent-emerald-500"
          />
        </td>
        <td className="px-2 py-2.5">
          {podeEditar ? (
            /*
              Referência à tabela de Talentos, não texto livre: é o que impede o mesmo talento de
              existir como "Gil do Vigor" numa linha e "Gilberto do Vigor" noutra.
            */
            <CelulaReferencia
              value={contract.talento}
              onCommit={(valor) => onUpdateCampo(contract.id, 'talento', valor)}
              opcoes={nomesDeTalentos}
              entidade="um talento"
              align="left"
              /* A linha recém-criada nasce com o cursor aqui, e o provisório selecionado. */
              editing={contract.id === recemCriado}
              onEditingEnd={() => setRecemCriado(null)}
              className="text-sm font-semibold text-slate-800"
            />
          ) : (
            <div className="truncate px-2 py-1 text-sm font-semibold text-slate-800">
              {contract.talento}
            </div>
          )}
          <VinculoTalento contrato={contract} />
        </td>
        <td className="px-2 py-2.5">
          {podeEditar ? (
            <EditableCell
              value={contract.contrato}
              onCommit={(valor) => onUpdateCampo(contract.id, 'contrato', valor)}
              align="left"
              placeholder="Do que é o contrato?"
              className="text-xs text-slate-700"
            />
          ) : (
            <div className="px-2 py-1 text-xs text-slate-700">{contract.contrato || '—'}</div>
          )}
        </td>
        <td className="px-3 py-3">
          <ResponsavelCell
            responsaveisIds={contract.responsaveisIds}
            parceirosIds={contract.parceirosIds}
            onDefinirPapel={(usuarioId, papel) => onDefinirPapel(contract.id, usuarioId, papel)}
            somenteLeitura={!podeEditar}
            quadro="contratos"
          />
        </td>
        <td className="px-2 py-2.5">
          {podeEditar ? (
            <EditableCell
              value={contract.numero}
              onCommit={(valor) => onUpdateCampo(contract.id, 'numero', valor)}
              placeholder="Número"
              className="font-mono"
            />
          ) : (
            <div className="px-2 py-1 text-center font-mono text-xs text-slate-600">
              {contract.numero || '—'}
            </div>
          )}
        </td>
        <td className="px-2 py-2.5">
          {podeEditar ? (
            <EditableCell
              value={contract.inicio}
              onCommit={(valor) => onUpdateCampo(contract.id, 'inicio', valor)}
              type="date"
              display={formatDate}
            />
          ) : (
            <div className="px-2 py-1 text-center text-xs text-slate-600">{formatDate(contract.inicio)}</div>
          )}
        </td>
        <td className="px-2 py-2.5">
          {podeEditar ? (
            <EditableCell
              value={contract.fim}
              onCommit={(valor) => onUpdateCampo(contract.id, 'fim', valor)}
              type="date"
              display={formatDate}
            />
          ) : (
            <div className="px-2 py-1 text-center text-xs text-slate-600">{formatDate(contract.fim)}</div>
          )}
        </td>
        <td className="px-3 py-3">
          {podeEditar ? (
            <StatusSelect
              value={contract.status}
              onChange={(status) => onChangeStatus(contract.id, status)}
            />
          ) : (
            <span
              className={`flex w-full items-center justify-center rounded-md px-2 py-2 text-xs font-semibold text-white ${STATUS_STYLE[contract.status].solid}`}
            >
              <span className="truncate">{contract.status}</span>
            </span>
          )}
        </td>
        <td className="px-3 py-3">
          <VigenciaCell info={getVigenciaInfo(contract)} />
        </td>
        <td className="px-3 py-3 text-center text-xs text-slate-500" title={formatDataHora(contract.criadoEm)}>
          {formatDataCurta(contract.criadoEm)}
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center justify-center gap-1">
            {podeEditar ? (
              <motion.button
                type="button"
                onClick={() => setLinhaEmEdicao(emEdicao ? null : contract.id)}
                whileHover={{ scale: 1.15, rotate: emEdicao ? 0 : -12 }}
                whileTap={{ scale: 0.9 }}
                aria-label={emEdicao ? 'Concluir edição' : 'Editar contrato'}
                title={emEdicao ? 'Concluir edição' : 'Editar'}
                className={`rounded-md p-1.5 transition-colors ${
                  emEdicao
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'
                }`}
              >
                {emEdicao ? <Check className="size-4" /> : <Pencil className="size-4" />}
              </motion.button>
            ) : (
              <span className="p-1.5 text-slate-200" title="Você não está nomeado neste contrato">
                <Lock className="size-4" />
              </span>
            )}

            {podeExcluir ? (
              <motion.button
                type="button"
                onClick={() => handleDeleteMany([contract.id], `o contrato de ${contract.talento}`)}
                whileHover={{ scale: 1.15, x: [0, -1.5, 1.5, 0] }}
                whileTap={{ scale: 0.9 }}
                aria-label={`Excluir contrato de ${contract.talento}`}
                title="Excluir"
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="size-4" />
              </motion.button>
            ) : (
              <span className="p-1.5 text-slate-200" title="Sem permissão para excluir">
                <Trash2 className="size-4" />
              </span>
            )}
          </div>
        </td>
      </motion.tr>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Abas do farol */}
      <div className="flex shrink-0 flex-wrap items-center gap-1 bg-[#111a3a] px-3 py-2.5">
        {TABS.map((tab) => {
          const isAtiva = filtro === tab.filtro;
          return (
            <motion.button
              key={tab.filtro}
              type="button"
              onClick={() => onFiltroChange(tab.filtro)}
              whileTap={{ scale: 0.96 }}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                isAtiva ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <span className={`size-1.5 rounded-full ${tab.dot}`} />
              {tab.label}
              <span className={isAtiva ? 'text-indigo-100' : 'text-slate-500'}>{counts[tab.filtro]}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Ações do grupo */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <BuscaQuadro
            valor={busca}
            onChange={onBuscaChange}
            placeholder="Buscar no quadro…"
            encontrados={contracts.length}
            total={totalDoFiltro}
          />

          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="size-1.5 rounded-full bg-slate-300" />
            {contracts.length} {contracts.length === 1 ? 'contrato no grupo' : 'contratos no grupo'}
          </span>

          <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50">
            <Group className="size-3.5 text-slate-400" />
            <select
              value={agrupamento}
              onChange={(e) => setAgrupamento(e.target.value as Agrupamento)}
              className="cursor-pointer bg-transparent font-medium outline-none"
            >
              {AGRUPAMENTOS.map((opcao) => (
                <option key={opcao.valor} value={opcao.valor}>
                  {opcao.label}
                </option>
              ))}
            </select>
          </label>

          <motion.button
            type="button"
            onClick={() =>
              handleDeleteMany(
                selecao,
                selecao.length === 1 ? 'o contrato selecionado' : `os ${selecao.length} contratos selecionados`,
              )
            }
            disabled={!hasSelection}
            whileHover={hasSelection ? { x: [0, -1.5, 1.5, 0] } : undefined}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors enabled:hover:bg-rose-50 enabled:hover:text-rose-600 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            <Trash2 className="size-3.5" />
            Excluir em Lote{hasSelection ? ` (${selecao.length})` : ''}
          </motion.button>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            onClick={exportarParaExcel}
            disabled={contracts.length === 0}
            whileHover={contracts.length > 0 ? { y: -1 } : undefined}
            whileTap={{ scale: 0.97 }}
            data-dica="Exportar para Excel"
            data-dica-sub="Baixa a lista de contratos visíveis em arquivo Excel (.xlsx)"
            data-dica-sempre
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors enabled:hover:bg-emerald-50 enabled:hover:text-emerald-700 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            <FileSpreadsheet className="size-3.5" />
            Exportar
          </motion.button>

          <motion.button
            type="button"
            onClick={toggleSelectAll}
            disabled={contracts.length === 0}
            whileHover={contracts.length > 0 ? { y: -1 } : undefined}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            <CheckSquare className="size-3.5" />
            {selecao.length === contracts.length && contracts.length > 0
              ? `Desmarcar Todas (${contracts.length})`
              : `Marcar Visíveis (${contracts.length})`}
          </motion.button>

          {/* A criação é uma ação, não uma linha permanente — ver PRD 03 §7.9. */}
          {podeCriar && (
            <motion.button
              type="button"
              onClick={novoRegistro}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              title="Insere uma linha no topo, com o talento pronto para digitar"
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600"
            >
              <Plus className="size-3.5" />
              Novo contrato
            </motion.button>
          )}
        </div>
      </div>

      {/*
        A lista rola dentro de si — mesmo padrão do Backlog (ver PRD 03 §7.4).

        Rolar a página inteira tira da tela o cabeçalho das colunas, a busca e os filtros,
        justamente o que se usa para navegar. Aqui só o corpo se move.

        `sticky` em tabela vale no `<th>`, não no `<thead>` — daí o posicionamento célula a
        célula, com altura fixa (`h-9`) para que a linha de criação saiba onde parar.
      */}
      <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
        {/*
          `table-fixed` + <colgroup>: sem isto o navegador redistribui a sobra pelas colunas
          conforme o conteúdo de cada linha, e o cabeçalho deixa de bater com os dados.
        */}
        <table className="w-full min-w-[1340px] table-fixed border-collapse">
          <colgroup>
            <col className="w-10" />
            {COLUMNS.map((column) => (
              <col key={column.label} style={{ width: column.width }} />
            ))}
          </colgroup>

          <thead>
            <tr>
              <th className="sticky top-0 z-20 h-9 border-b border-slate-200 bg-slate-50 px-3">
                <input
                  type="checkbox"
                  aria-label="Selecionar todos os contratos visíveis"
                  checked={contracts.length > 0 && selecao.length === contracts.length}
                  onChange={toggleSelectAll}
                  disabled={contracts.length === 0}
                  className="size-3.5 cursor-pointer accent-emerald-500"
                />
              </th>
              {COLUMNS.map((column) => {
                const isActive = column.field && sort?.field === column.field;
                const SortIcon = !isActive ? ChevronsUpDown : sort!.direction === 'asc' ? ArrowUp : ArrowDown;
                const alignClass = column.align === 'left' ? 'justify-start' : 'justify-center';

                return (
                  <th key={column.label} className="sticky top-0 z-20 h-9 border-b border-slate-200 bg-slate-50 px-3" title={column.hint}>
                    {column.field ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.field!)}
                        className={`flex w-full items-center gap-1 text-[10px] font-bold uppercase tracking-wide transition hover:text-slate-700 ${alignClass} ${
                          isActive ? 'text-slate-700' : 'text-slate-500'
                        }`}
                      >
                        <span className="truncate">{column.label}</span>
                        <SortIcon className="size-3 shrink-0 opacity-70" />
                      </button>
                    ) : (
                      <span
                        className={`flex w-full truncate text-[10px] font-bold uppercase tracking-wide text-slate-500 ${alignClass}`}
                      >
                        {column.label}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {/* Linha de criação inline */}
            {agrupamento === 'nenhum' && sortedContracts.map(renderLinha)}

            {agrupamento !== 'nenhum' &&
              grupos.map((grupo) => {
                const aberto = !gruposFechados.has(grupo.chave);
                return (
                  <Fragment key={grupo.chave}>
                    <GrupoHeader
                      titulo={grupo.titulo}
                      cor={grupo.cor}
                      itens={grupo.itens}
                      aberto={aberto}
                      onToggle={() => toggleGrupo(grupo.chave)}
                      colSpan={TOTAL_COLUNAS}
                    />
                    {aberto && grupo.itens.map(renderLinha)}
                  </Fragment>
                );
              })}

            {contracts.length === 0 && (
              <tr>
                <td colSpan={TOTAL_COLUNAS} className="px-3 py-10 text-center text-sm text-slate-400">
                  {busca.trim()
                    ? `Nenhum contrato encontrado para "${busca.trim()}".`
                    : counts.todos === 0
                      ? 'Nenhum contrato ainda — use o botão Novo contrato para cadastrar o primeiro.'
                      : 'Nenhum contrato nesta aba do farol.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hasSelection && (
        <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
          {selecao.length} {selecao.length === 1 ? 'contrato selecionado' : 'contratos selecionados'}
        </div>
      )}
    </div>
  );
}
