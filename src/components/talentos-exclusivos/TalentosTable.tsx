import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowDown, ArrowUp, AtSign, Banknote, CheckSquare, ChevronsUpDown, FileSpreadsheet, FileText, IdCard, Lock,
  CircleAlert, EyeOff, Plus, Share2, Trash2, Users,
} from 'lucide-react';
import { RedesTalento, Talento, TalentContract } from '../../types';
import { useDados } from '../../context/DadosProvider';
import {
  AREAS, areasDefinidas, ContagemTalentos, contratosDoTalento, FiltroTalento, getTipo, REDES,
  redesPreenchidas, responsaveisDaArea, TIPOS,
} from '../../utils/talentos';
import { getVigenciaInfo, VIGENCIA_TONE_STYLE } from '../../utils/vigencia';
import { podeCriarRegistro, podeEditarTalento } from '../../utils/permissoes';
import { visoesDoQuadro } from '../../utils/visoes';
import { colunasDaVisao, ColunaCatalogo } from '../../utils/colunas';
import { valoresUsados } from '../../utils/referencias';
import { formatDataCurta, formatDataHora, formatDate, todayISO } from '../../utils/dates';
import { baixarXlsx, ColunaExportada } from '../../utils/exportacao';
import { EditableCell } from '../ui/EditableCell';
import { CelulaOculta } from '../ui/CelulaOculta';
import { CelulaReferencia } from '../ui/CelulaReferencia';
import { BuscaQuadro } from '../ui/BuscaQuadro';
import { getCorAvatar, getIniciais } from '../usuarios/Avatar';
import { AreaResponsavelCell } from './AreaResponsavelCell';
import { TipoSelect } from './TipoSelect';

type Coluna = ColunaCatalogo;

/** Campos de texto editáveis direto na grade. */
export type CampoTalento =
  | 'nome' | 'nomeArtistico' | 'empresa' | 'email' | 'telefone' | 'local' | 'observacoes'
  | 'razaoSocial' | 'cnpj' | 'faturamento' | 'condicaoPagamento' | 'dadosBancarios';

type SortField = CampoTalento | 'tipo' | 'criadoEm';

const FILTROS: { id: FiltroTalento; label: string; dot: string; hint: string }[] = [
  { id: 'todos', label: 'Todos', dot: 'bg-slate-400', hint: 'Todos os talentos do quadro' },
  { id: 'exclusivo', label: 'Exclusivos', dot: 'bg-indigo-500', hint: 'Agenciados pela casa' },
  { id: 'interveniencia', label: 'Interveniência', dot: 'bg-slate-400', hint: 'Contratos tocados sem exclusividade' },
  {
    id: 'pendentes',
    label: 'Pendentes',
    dot: 'bg-amber-500',
    hint: 'Fichas abertas a partir de contratos, ainda sem dados',
  },
];

/** Ícones das abas, indexados pelos ids do catálogo de visões. */
const ICONES: Record<string, typeof IdCard> = {
  'talentos:identificacao': IdCard,
  'talentos:contato': AtSign,
  'talentos:redes': Share2,
  'talentos:financeiro': Banknote,
  'talentos:responsaveis': Users,
  'talentos:contratos': FileText,
};

/** Largura mínima por aba — evita esmagar as abas com mais colunas. */
const LARGURA_MINIMA: Record<string, string> = {
  'talentos:identificacao': 'min-w-[900px]',
  'talentos:contato': 'min-w-[900px]',
  'talentos:redes': 'min-w-[1100px]',
  'talentos:financeiro': 'min-w-[1050px]',
  'talentos:responsaveis': 'min-w-[1100px]',
  'talentos:contratos': 'min-w-[900px]',
};

interface TalentosTableProps {
  /** Já filtrados por permissão e por busca. */
  talentos: Talento[];
  total: number;
  contratos: TalentContract[];
  busca: string;
  onBuscaChange: (valor: string) => void;
  filtro: FiltroTalento;
  onFiltroChange: (filtro: FiltroTalento) => void;
  /** Contagens sobre o conjunto permitido, antes do filtro e da busca. */
  contagem: ContagemTalentos;
  /** Ids das visões que a sessão enxerga, na ordem do catálogo. */
  visoesVisiveis: string[];
  /** Ids das colunas que a sessão NÃO pode ver — a célula vira um borrão. */
  colunasOcultas: string[];
  /** Insere uma ficha vazia e devolve o id — ou `null` se não foi possível. */
  onCriar: () => string | null;
  onUpdateCampo: (id: string, campo: CampoTalento, valor: string) => void;
  onDeleteMany: (ids: string[]) => void;
}

export function TalentosTable({
  talentos, total, contratos, busca, onBuscaChange, filtro, onFiltroChange, contagem,
  visoesVisiveis, colunasOcultas, onCriar, onUpdateCampo, onDeleteMany,
}: TalentosTableProps) {
  const {
    sessao, alternarResponsavelDoTalento, definirTipoDoTalento, definirRedeDoTalento,
  } = useDados();
  const podeCriar = podeCriarRegistro(sessao, 'talentos');

  const abas = useMemo(
    () => visoesDoQuadro('talentos').filter((visao) => visoesVisiveis.includes(visao.id)),
    [visoesVisiveis],
  );

  const [aba, setAba] = useState(abas[0]?.id ?? 'talentos:identificacao');

  const [sort, setSort] = useState<{ field: SortField; direction: 'asc' | 'desc' } | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  /** Linha recém-criada, com o nome já em edição — ver a mesma decisão em `BacklogTable`. */
  const [recemCriado, setRecemCriado] = useState<string | null>(null);

  // Trocar de sessão pode tirar a aba aberta — cai na primeira que sobrou.
  useEffect(() => {
    if (!abas.some((item) => item.id === aba)) setAba(abas[0]?.id ?? '');
  }, [abas, aba]);

  /*
    O rascunho **não** se apaga ao trocar de aba — ver a mesma decisão em `BacklogTable`.

    Aqui o efeito era ainda mais custoso: um cadastro de talento se distribui por Identificação,
    Contato, Redes e Financeiro, e era preciso passar por todas para preencher.
  */

  /*
    Ordenação some junto com a coluna que a produziu.

    Ordenar por Telefone na aba Contato e ir para Redes deixava a lista numa ordem que nenhuma
    coluna da tela explica. O nome é a exceção: é a chave, e está em todas as abas.
  */
  useEffect(() => {
    if (!sort || sort.field === 'nome') return;
    if (!colunasDaVisao(aba).some((coluna) => coluna.field === sort.field)) setSort(null);
  }, [aba, sort]);

  const colunas = colunasDaVisao(aba);
  const oculta = (id: string) => colunasOcultas.includes(id);
  /** checkbox + Talento + colunas da aba + Ações. */
  const totalColunas = colunas.length + 3;

  const ordenados = useMemo(() => {
    if (!sort) return talentos;
    const fator = sort.direction === 'asc' ? 1 : -1;
    return [...talentos].sort(
      (a, b) => fator * String(a[sort.field] ?? '').localeCompare(String(b[sort.field] ?? ''), 'pt-BR'),
    );
  }, [talentos, sort]);

  function toggleSort(field: SortField) {
    setSort((atual) => {
      if (atual?.field !== field) return { field, direction: 'asc' };
      if (atual.direction === 'asc') return { field, direction: 'desc' };
      return null;
    });
  }

  function toggleSelecao(id: string) {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function toggleTodos() {
    setSelecionados(
      selecao.length === talentos.length ? new Set() : new Set(talentos.map((t) => t.id)),
    );
  }

  function exportarParaExcel() {
    const colunasExportadas: ColunaExportada[] = [
      { rotulo: 'Nome', valor: (i: number) => ordenados[i].nome },
      { rotulo: 'Tipo', valor: (i: number) => getTipo(ordenados[i].tipo).label },
      { rotulo: 'Nome Artístico', valor: (i: number) => ordenados[i].nomeArtistico || '' },
      { rotulo: 'Empresa', valor: (i: number) => ordenados[i].empresa || '' },
      { rotulo: 'E-mail', valor: (i: number) => ordenados[i].email || '' },
      { rotulo: 'Telefone', valor: (i: number) => ordenados[i].telefone || '' },
      { rotulo: 'Local', valor: (i: number) => ordenados[i].local || '' },
      { rotulo: 'Razão Social', valor: (i: number) => ordenados[i].razaoSocial || '' },
      { rotulo: 'CNPJ', valor: (i: number) => ordenados[i].cnpj || '' },
      { rotulo: 'Faturamento', valor: (i: number) => ordenados[i].faturamento || '' },
      { rotulo: 'Observações', valor: (i: number) => ordenados[i].observacoes || '' },
    ];

    const dataLegivel = formatDate(todayISO()).replace(/\//g, '-');
    try {
      baixarXlsx(
        `Talentos - ${dataLegivel}.xlsx`,
        colunasExportadas,
        ordenados.length,
        'Talentos',
      );
    } catch {
      window.alert('Não foi possível gerar o Excel. Recarregue a página e tente de novo.');
    }
  }

  function excluir(ids: string[], rotulo: string) {
    if (!window.confirm(`Excluir ${rotulo}? Os contratos permanecem no quadro, apenas sem o vínculo.`)) {
      return;
    }
    onDeleteMany(ids);
    setSelecionados(new Set());
  }

  /** Cria a ficha e deixa o nome pronto para digitar — ver `TITULO_PROVISORIO`. */
  function novoRegistro() {
    const id = onCriar();
    if (id) setRecemCriado(id);
  }

  /*
    A seleção só vale para o que está na tela.

    Limpar por lista de dependências sempre esquece um caso: a linha também sai da lista ao mudar
    de aba, filtro ou cadastro. O id continuava marcado e invisível, e "Excluir em Lote" apagava o que ninguém
    estava vendo. Derivar da interseção com as linhas visíveis se corrige sozinha.
  */
  const selecao = useMemo(
    () => talentos.filter((t) => selecionados.has(t.id)).map((t) => t.id),
    [talentos, selecionados],
  );
  const temSelecao = selecao.length > 0;

  /**
   * Colunas que se apoiam no que já existe, em vez de aceitar qualquer texto.
   *
   * Sem isto a mesma cidade vira "São Paulo" e "Sao Paulo", e a mesma empresa aparece com dois
   * nomes — cada um legítimo à primeira vista, e nenhum jeito de saber depois qual é o certo.
   */
  const opcoesDe = (campo: string) =>
    valoresUsados(talentos as unknown as Record<string, unknown>[], campo);

  const REFERENCIAS: Record<string, { entidade: string; campo: string }> = {
    'talentos:identificacao:empresa': { entidade: 'uma empresa', campo: 'empresa' },
    'talentos:contato:local': { entidade: 'um local', campo: 'local' },
    'talentos:financeiro:razaoSocial': { entidade: 'uma razão social', campo: 'razaoSocial' },
  };

  function celulaTexto(talento: Talento, coluna: Coluna, podeEditar: boolean) {
    if (oculta(coluna.id)) return <CelulaOculta label={coluna.label} align={coluna.align} />;

    const campo = coluna.campo as CampoTalento;
    const valor = talento[campo] ?? '';

    if (!podeEditar) {
      return (
        <div className={`truncate px-2 py-1 text-xs text-slate-700 ${coluna.align === 'center' ? 'text-center' : ''}`}>
          {valor || '—'}
        </div>
      );
    }

    const referencia = REFERENCIAS[coluna.id];
    if (referencia) {
      return (
        <CelulaReferencia
          value={valor}
          onCommit={(novo) => onUpdateCampo(talento.id, campo, novo)}
          opcoes={opcoesDe(referencia.campo)}
          entidade={referencia.entidade}
          align={coluna.align}
          placeholder={coluna.placeholder}
          className="text-xs text-slate-700"
        />
      );
    }

    return (
      <EditableCell
        value={valor}
        onCommit={(novo) => onUpdateCampo(talento.id, campo, novo)}
        align={coluna.align}
        placeholder={coluna.placeholder}
        className="text-xs text-slate-700"
      />
    );
  }

  function renderCelulasDaAba(talento: Talento, podeEditar: boolean) {
    if (aba === 'talentos:identificacao') {
      const definidas = areasDefinidas(talento);
      return (
        <>
          <td className="px-2 py-3">
            {oculta(colunas[0].id) ? (
              <CelulaOculta label="Tipo" largura="curta" />
            ) : (
              <TipoSelect
                valor={talento.tipo}
                onChange={podeEditar ? (tipo) => definirTipoDoTalento(talento.id, tipo) : undefined}
              />
            )}
          </td>
          <td className="px-2 py-2.5">{celulaTexto(talento, colunas[1], podeEditar)}</td>
          <td className="px-2 py-2.5">{celulaTexto(talento, colunas[2], podeEditar)}</td>
          <td className="px-3 py-3 text-center text-xs">
            {talento.tipo === 'exclusivo' ? (
              <span className={definidas === AREAS.length ? 'text-emerald-600' : 'text-slate-500'}>
                {definidas}/{AREAS.length}
              </span>
            ) : (
              <span className="text-slate-300" title="Áreas de responsabilidade valem para exclusivos">
                —
              </span>
            )}
          </td>
          {oculta(colunas[4].id) ? (
            <td className="px-3 py-3">
              <CelulaOculta label="Criado em" largura="curta" />
            </td>
          ) : (
            <td
              className="px-3 py-3 text-center text-xs text-slate-500"
              title={formatDataHora(talento.criadoEm)}
            >
              {formatDataCurta(talento.criadoEm)}
            </td>
          )}
        </>
      );
    }

    if (aba === 'talentos:contato' || aba === 'talentos:financeiro') {
      return colunas.map((coluna) => (
        <td key={coluna.id} className="px-2 py-2.5">
          {celulaTexto(talento, coluna, podeEditar)}
        </td>
      ));
    }

    if (aba === 'talentos:redes') {
      return (
        <>
          {REDES.map((rede, indice) => {
            const valor = talento.redes[rede.campo] ?? '';
            if (oculta(colunas[indice].id)) {
              return (
                <td key={rede.campo} className="px-2 py-2.5">
                  <CelulaOculta label={rede.label} largura="curta" />
                </td>
              );
            }
            return (
              <td key={rede.campo} className="px-2 py-2.5">
                {podeEditar ? (
                  <EditableCell
                    value={valor}
                    onCommit={(novo) => definirRedeDoTalento(talento.id, rede.campo, novo)}
                    align="center"
                    placeholder={rede.prefixo || '—'}
                    display={(v) => (v ? `${rede.prefixo}${v}` : '')}
                    className="text-xs text-slate-700"
                  />
                ) : (
                  <div className="px-2 py-1 text-center text-xs text-slate-700">
                    {valor ? `${rede.prefixo}${valor}` : '—'}
                  </div>
                )}
              </td>
            );
          })}
          <td className="px-3 py-3 text-center text-xs">
            <span className={redesPreenchidas(talento) > 0 ? 'text-slate-600' : 'text-slate-300'}>
              {redesPreenchidas(talento)}/{REDES.length}
            </span>
          </td>
        </>
      );
    }

    if (aba === 'talentos:responsaveis') {
      // Interveniência não tem áreas: a linha inteira vira um aviso, em vez de 6 botões inúteis.
      if (talento.tipo === 'interveniencia') {
        return (
          <td colSpan={AREAS.length} className="px-3 py-3 text-center text-xs text-slate-400">
            Áreas de responsabilidade valem para talentos exclusivos.
          </td>
        );
      }

      return AREAS.map((area, indice) => (
        <td key={area.id} className="px-2 py-3">
          {oculta(colunas[indice].id) ? (
            <CelulaOculta label={area.label} largura="curta" />
          ) : (
          <AreaResponsavelCell
            area={area.id}
            usuarioIds={responsaveisDaArea(talento, area.id)}
            onAlternar={
              podeEditar
                ? (usuarioId) => alternarResponsavelDoTalento(talento.id, area.id, usuarioId)
                : undefined
            }
          />
          )}
        </td>
      ));
    }

    const doTalento = contratosDoTalento(talento, contratos);
    const infos = doTalento.map((contrato) => getVigenciaInfo(contrato));
    const proximo = doTalento
      .filter((contrato) => contrato.fim && getVigenciaInfo(contrato).tone !== 'vermelho')
      .map((contrato) => contrato.fim)
      .sort()[0];

    return (
      <>
        <td className="px-3 py-3 text-center text-xs font-semibold text-slate-700">
          {doTalento.length}
        </td>
        {(['verde', 'amarelo', 'vermelho'] as const).map((tone, indice) => {
          const coluna = colunas[indice + 1];
          if (oculta(coluna.id)) {
            return (
              <td key={tone} className="px-3 py-3">
                <CelulaOculta label={coluna.label} largura="curta" />
              </td>
            );
          }
          const conta = infos.filter((info) => info.tone === tone).length;
          return (
            <td key={tone} className="px-3 py-3">
              <span
                className={`flex items-center justify-center gap-1.5 text-xs font-medium ${
                  conta > 0 ? VIGENCIA_TONE_STYLE[tone].text : 'text-slate-300'
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${conta > 0 ? VIGENCIA_TONE_STYLE[tone].dot : 'bg-slate-200'}`}
                />
                {conta}
              </span>
            </td>
          );
        })}
        {oculta(colunas[4].id) ? (
          <td className="px-3 py-3">
            <CelulaOculta label="Próximo fim" largura="curta" />
          </td>
        ) : (
          <td className="px-3 py-3 text-center text-xs text-slate-600">
            {proximo ? formatDate(proximo) : '—'}
          </td>
        )}
      </>
    );
  }

  function renderLinha(talento: Talento) {
    const podeEditar = podeEditarTalento(sessao, talento);
    const tipo = getTipo(talento.tipo);

    return (
      <motion.tr
        key={talento.id}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="border-b border-slate-100 transition-colors hover:bg-slate-50/70"
      >
        <td className="px-3 py-3">
          <input
            type="checkbox"
            aria-label={`Selecionar ${talento.nome}`}
            checked={selecionados.has(talento.id)}
            onChange={() => toggleSelecao(talento.id)}
            className="size-3.5 cursor-pointer accent-emerald-500"
          />
        </td>

        <td className="px-2 py-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`relative flex size-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white ${getCorAvatar(talento.nome)}`}
            >
              {getIniciais(talento.nome)}
              <span
                title={tipo.label}
                className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-white ${tipo.dot}`}
              />
            </span>

            <span className="min-w-0 flex-1">
              {podeEditar ? (
                <EditableCell
                  value={talento.nome}
                  onCommit={(valor) => valor.trim() && onUpdateCampo(talento.id, 'nome', valor.trim())}
                  align="left"
                  /* A ficha recém-criada nasce com o cursor no nome, e o provisório selecionado. */
                  editing={talento.id === recemCriado}
                  onEditingEnd={() => setRecemCriado(null)}
                  className="text-sm font-semibold text-slate-800"
                />
              ) : (
                <span className="block px-2 py-1 text-sm font-semibold text-slate-800">
                  {talento.nome}
                </span>
              )}
              {talento.cadastroPendente ? (
                <span
                  title="Ficha aberta a partir de um contrato — falta completar os dados"
                  className="ml-2 inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200"
                >
                  <CircleAlert className="size-2.5" />
                  Cadastro pendente
                </span>
              ) : (
                <span className="block truncate px-2 text-[10px] text-slate-400">
                  {talento.nomeArtistico || tipo.label}
                </span>
              )}
            </span>
          </div>
        </td>

        {renderCelulasDaAba(talento, podeEditar)}

        <td className="px-3 py-3">
          <div className="flex items-center justify-center">
            {podeEditar ? (
              <motion.button
                type="button"
                onClick={() => excluir([talento.id], `o cadastro de ${talento.nome}`)}
                whileHover={{ scale: 1.15, x: [0, -1.5, 1.5, 0] }}
                whileTap={{ scale: 0.9 }}
                aria-label={`Excluir cadastro de ${talento.nome}`}
                title="Excluir cadastro"
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="size-4" />
              </motion.button>
            ) : (
              <span className="p-1.5 text-slate-200" title="Você não responde por este talento">
                <Lock className="size-4" />
              </span>
            )}
          </div>
        </td>
      </motion.tr>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Abas: cada uma revela um grupo de colunas do mesmo quadro. */}
      <div className="flex shrink-0 flex-wrap items-center gap-1 bg-[#111a3a] px-3 py-2.5">
        {abas.map((item) => {
          const Icon = ICONES[item.id] ?? IdCard;
          const ativa = aba === item.id;
          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => setAba(item.id)}
              whileTap={{ scale: 0.96 }}
              title={item.restrita ? `Acesso restrito — ${item.motivo}` : undefined}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                ativa ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <Icon className="size-3.5" />
              {item.label}
              {item.restrita && <Lock className="size-3 opacity-60" />}
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
            encontrados={talentos.length}
            total={total}
          />

          {/* Filtros clicáveis — recortes do quadro, não fatias: pendente cruza com os tipos. */}
          <div className="flex flex-wrap items-center gap-1">
            {FILTROS.map((item) => {
              const ativo = filtro === item.id;
              const quantos = contagem[item.id];
              // O filtro de pendentes só aparece quando há o que resolver.
              if (item.id === 'pendentes' && quantos === 0) return null;

              return (
                <motion.button
                  key={item.id}
                  type="button"
                  onClick={() => onFiltroChange(ativo ? 'todos' : item.id)}
                  whileTap={{ scale: 0.96 }}
                  title={item.hint}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    ativo
                      ? item.id === 'pendentes'
                        ? 'bg-amber-500 text-white'
                        : 'bg-indigo-600 text-white'
                      : 'text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {item.id === 'pendentes' ? (
                    <CircleAlert className={`size-3 ${ativo ? '' : 'text-amber-500'}`} />
                  ) : (
                    <span className={`size-1.5 rounded-full ${ativo ? 'bg-white/70' : item.dot}`} />
                  )}
                  {item.label}
                  <span className={ativo ? 'text-white/70' : 'text-slate-400'}>{quantos}</span>
                </motion.button>
              );
            })}
          </div>

          <motion.button
            type="button"
            onClick={() =>
              excluir(
                selecao,
                selecao.length === 1
                  ? 'o cadastro selecionado'
                  : `os ${selecao.length} cadastros selecionados`,
              )
            }
            disabled={!temSelecao}
            whileHover={temSelecao ? { x: [0, -1.5, 1.5, 0] } : undefined}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors enabled:hover:bg-rose-50 enabled:hover:text-rose-600 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            <Trash2 className="size-3.5" />
            Excluir em Lote{temSelecao ? ` (${selecao.length})` : ''}
          </motion.button>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            onClick={exportarParaExcel}
            disabled={talentos.length === 0}
            whileHover={talentos.length > 0 ? { y: -1 } : undefined}
            whileTap={{ scale: 0.97 }}
            data-dica="Exportar para Excel"
            data-dica-sub="Baixa a lista de talentos visíveis em arquivo Excel (.xlsx)"
            data-dica-sempre
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors enabled:hover:bg-emerald-50 enabled:hover:text-emerald-700 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            <FileSpreadsheet className="size-3.5" />
            Exportar
          </motion.button>

          <motion.button
            type="button"
            onClick={toggleTodos}
            disabled={talentos.length === 0}
            whileHover={talentos.length > 0 ? { y: -1 } : undefined}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            <CheckSquare className="size-3.5" />
            {selecao.length === talentos.length && talentos.length > 0
              ? `Desmarcar Todas (${talentos.length})`
              : `Marcar Visíveis (${talentos.length})`}
          </motion.button>

          {/* A criação é uma ação, não uma linha permanente — ver PRD 03 §7.9. */}
          {podeCriar && (
            <motion.button
              type="button"
              onClick={novoRegistro}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              title="Insere uma linha no topo, com o nome pronto para digitar"
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600"
            >
              <Plus className="size-3.5" />
              Novo talento
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
          `table-fixed` com larguras explícitas: sem isto o navegador redistribui a sobra entre as
          colunas e o cabeçalho sai do lugar ao trocar de aba, porque cada aba tem outro número
          de colunas.
        */}
        <table className={`w-full table-fixed border-collapse ${LARGURA_MINIMA[aba] ?? ''}`}>
          <colgroup>
            <col className="w-10" />
            <col className="w-[22%]" />
            {colunas.map((coluna) => (
              <col key={coluna.id} style={{ width: `${coluna.peso}%` }} />
            ))}
            <col className="w-14" />
          </colgroup>

          <thead>
            <tr>
              <th className="sticky top-0 z-20 h-9 border-b border-slate-200 bg-slate-50 px-3">
                <input
                  type="checkbox"
                  aria-label="Selecionar todos os talentos visíveis"
                  checked={talentos.length > 0 && selecao.length === talentos.length}
                  onChange={toggleTodos}
                  disabled={talentos.length === 0}
                  className="size-3.5 cursor-pointer accent-emerald-500"
                />
              </th>

              <th className="sticky top-0 z-20 h-9 border-b border-slate-200 bg-slate-50 px-3">
                <button
                  type="button"
                  onClick={() => toggleSort('nome')}
                  className={`flex w-full items-center justify-start gap-1 text-[10px] font-bold uppercase tracking-wide transition hover:text-slate-700 ${
                    sort?.field === 'nome' ? 'text-slate-700' : 'text-slate-500'
                  }`}
                >
                  Talento
                  {sort?.field === 'nome' ? (
                    sort.direction === 'asc' ? <ArrowUp className="size-3 opacity-70" /> : <ArrowDown className="size-3 opacity-70" />
                  ) : (
                    <ChevronsUpDown className="size-3 opacity-70" />
                  )}
                </button>
              </th>

              {colunas.map((coluna) => {
                // Ordenar por uma coluna oculta revelaria a ordem do dado escondido.
                const ordenavel = coluna.field && !oculta(coluna.id);
                const ativa = ordenavel && sort?.field === coluna.field;
                const SortIcon = !ativa ? ChevronsUpDown : sort!.direction === 'asc' ? ArrowUp : ArrowDown;
                const alignClass = coluna.align === 'left' ? 'justify-start' : 'justify-center';

                return (
                  <th key={coluna.id} className="sticky top-0 z-20 h-9 border-b border-slate-200 bg-slate-50 px-3" title={oculta(coluna.id) ? `${coluna.label} — sem acesso` : coluna.hint}>
                    {ordenavel ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(coluna.field! as SortField)}
                        className={`flex w-full items-center gap-1 text-[10px] font-bold uppercase tracking-wide transition hover:text-slate-700 ${alignClass} ${
                          ativa ? 'text-slate-700' : 'text-slate-500'
                        }`}
                      >
                        <span className="truncate">{coluna.label}</span>
                        <SortIcon className="size-3 shrink-0 opacity-70" />
                      </button>
                    ) : (
                      <span
                        className={`flex w-full items-center gap-1 truncate text-[10px] font-bold uppercase tracking-wide ${alignClass} ${
                          oculta(coluna.id) ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {oculta(coluna.id) && <EyeOff className="size-3 shrink-0" />}
                        <span className="truncate">{coluna.label}</span>
                      </span>
                    )}
                  </th>
                );
              })}

              <th className="px-3 py-2.5">
                <span className="flex w-full justify-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Ações
                </span>
              </th>
            </tr>
          </thead>

          <tbody>
            {/* Linha de criação inline — só o nome; o resto se preenche na própria grade. */}
            {ordenados.map(renderLinha)}

            {talentos.length === 0 && (
              <tr>
                <td colSpan={totalColunas} className="px-3 py-10 text-center text-sm text-slate-400">
                  {busca.trim()
                    ? `Nenhum talento encontrado para "${busca.trim()}".`
                    : filtro !== 'todos'
                      ? `Nenhum talento em "${FILTROS.find((f) => f.id === filtro)?.label}".`
                      : podeCriar
                        ? 'Nenhum talento ainda — use o botão Novo talento para cadastrar o primeiro.'
                        : 'Nenhum talento visível para você.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {temSelecao && (
        <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
          {selecao.length} {selecao.length === 1 ? 'cadastro selecionado' : 'cadastros selecionados'}
        </div>
      )}
    </div>
  );
}

/** Reexportado para a página montar o filtro sem reimportar o catálogo. */
export type { RedesTalento };
export { TIPOS };
