import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, LayoutGrid, Lock, Star, TriangleAlert } from 'lucide-react';
import { AppPage, Equipe, PAGINAS_WORKSPACE } from '../../types';
import { useDados } from '../../context/DadosProvider';
import { AREAS } from '../../utils/talentos';
import { visoesDoQuadro } from '../../utils/visoes';
import { colunasDaVisao, colunasOcultaveis } from '../../utils/colunas';
import { Switch } from '../ui/Switch';

/**
 * Configuração de acesso da equipe — os três níveis, do mais grosso ao mais fino.
 *
 * ```
 * Quadro   →  a equipe abre esta página?
 *   Aba    →  dentro dela, quais grupos de coluna?
 *     Coluna →  dentro da aba, o que fica borrado?
 * ```
 *
 * A tela tem duas partes: a lista de quadros, sempre visível, e **uma aba por quadro liberado**,
 * onde abas e colunas daquele quadro ficam juntas.
 *
 * Antes, "abas sensíveis" e "colunas ocultas" eram dois blocos separados, cada um listando todos
 * os quadros por dentro — para configurar um quadro era preciso caçá-lo em dois lugares. Aqui a
 * navegação segue a pergunta de quem configura: *"o que a equipe vê **neste quadro**?"*.
 */
export function ConfiguracaoEquipe({ equipe }: { equipe: Equipe }) {
  const {
    equipes, alternarPaginaDaEquipe, definirAreaDaEquipe, alternarVisaoDaEquipe,
    alternarColunaDaEquipe,
  } = useDados();

  const ocultas = equipe.colunasOcultas ?? [];
  const liberadas = equipe.visoesLiberadas ?? [];

  const quadros = useMemo(
    () => PAGINAS_WORKSPACE.filter((pagina) => equipe.paginasPermitidas.includes(pagina.id)),
    [equipe.paginasPermitidas],
  );

  const [quadroAberto, setQuadroAberto] = useState<AppPage | null>(quadros[0]?.id ?? null);

  // Revogar o quadro aberto deixaria a aba apontando para o nada.
  useEffect(() => {
    if (!quadros.some((quadro) => quadro.id === quadroAberto)) {
      setQuadroAberto(quadros[0]?.id ?? null);
    }
  }, [quadros, quadroAberto]);

  const abas = quadroAberto ? visoesDoQuadro(quadroAberto) : [];

  /** Resumo por quadro, para a aba mostrar o que está restrito sem precisar abrir. */
  function resumo(pagina: AppPage) {
    const visoes = visoesDoQuadro(pagina);
    const totalColunas = visoes.flatMap((visao) => colunasDaVisao(visao.id)).length;
    const escondidas = visoes
      .flatMap((visao) => colunasDaVisao(visao.id))
      .filter((coluna) => ocultas.includes(coluna.id)).length;
    const restritasFechadas = visoes.filter(
      (visao) => visao.restrita && !liberadas.includes(visao.id),
    ).length;

    return { totalColunas, escondidas, restritasFechadas };
  }

  return (
    <div className="space-y-4">
      {/* 1. Quadros */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-1 flex items-center gap-1.5 text-rotulo font-bold uppercase tracking-wider text-slate-500">
          <LayoutGrid className="size-3" />
          Quadros que a equipe enxerga
        </p>
        <p className="mb-3 text-apoio text-slate-500">
          O nível mais grosso: sem o quadro, nada abaixo tem efeito.
        </p>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PAGINAS_WORKSPACE.map((pagina) => {
            const permitida = equipe.paginasPermitidas.includes(pagina.id);
            const { totalColunas } = resumo(pagina.id);

            return (
              <label
                key={pagina.id}
                className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition ${
                  permitida ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Switch
                  ligado={permitida}
                  onChange={() => alternarPaginaDaEquipe(equipe.id, pagina.id)}
                  label={`Quadro ${pagina.label}`}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-xs font-medium ${
                      permitida ? 'text-indigo-800' : 'text-slate-600'
                    }`}
                  >
                    {pagina.label}
                  </span>
                  <span className="block text-rotulo text-slate-500">
                    {totalColunas > 0 ? `${totalColunas} colunas` : 'sem colunas ainda'}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        {equipe.paginasPermitidas.length === 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-apoio text-amber-600">
            <TriangleAlert className="size-3.5" />
            Esta equipe não enxerga nenhum quadro do Workspace.
          </p>
        )}
      </section>

      {/* 2. Abas e colunas, por quadro */}
      {quadroAberto && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Abas dos quadros liberados */}
          <div role="navigation" aria-label="Seções do quadro" className="flex flex-wrap items-center gap-1 bg-plano px-3 py-2.5">
            {quadros.map((quadro) => {
              const ativa = quadroAberto === quadro.id;
              const { escondidas, restritasFechadas } = resumo(quadro.id);
              const restricoes = escondidas + restritasFechadas;

              return (
                <motion.button
                  key={quadro.id}
                  type="button"
                  onClick={() => setQuadroAberto(quadro.id)}
                  whileTap={{ scale: 0.96 }}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    ativa ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {quadro.label}
                  {restricoes > 0 && (
                    <span
                      title={`${restritasFechadas} aba(s) fechada(s) · ${escondidas} coluna(s) oculta(s)`}
                      className={`rounded px-1.5 py-0.5 text-rotulo font-bold ${
                        ativa ? 'bg-indigo-500 text-indigo-50' : 'bg-white/10 text-slate-500'
                      }`}
                    >
                      {restricoes}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          <div className="px-5 py-4">
            <p className="mb-4 text-apoio leading-snug text-slate-500">
              Abas de <strong className="font-semibold text-slate-500">dado sensível</strong> vêm
              desligadas e precisam ser liberadas. As demais seguem o acesso do quadro. Dentro de
              cada uma, desligue as colunas que a equipe não deve ver — a célula vira um borrão e a
              largura é preservada, então a tabela não se desmonta.
            </p>

            {abas.length === 0 && (
              <p className="text-apoio text-slate-500">
                Este quadro ainda não tem colunas configuráveis.
              </p>
            )}

            <div className="space-y-4">
              {abas.map((aba) => {
                const restritaFechada = aba.restrita && !liberadas.includes(aba.id);
                const colunas = colunasOcultaveis(aba.id);
                const fixas = colunasDaVisao(aba.id).length - colunas.length;

                return (
                  <div
                    key={aba.id}
                    className={`rounded-xl border p-3 transition ${
                      restritaFechada ? 'border-slate-200 bg-slate-50/60' : 'border-slate-200'
                    }`}
                  >
                    {/* Cabeçalho da aba */}
                    <div className="flex flex-wrap items-center gap-2">
                      {aba.restrita ? (
                        <Switch
                          ligado={liberadas.includes(aba.id)}
                          onChange={() => alternarVisaoDaEquipe(equipe.id, aba.id)}
                          label={`Aba ${aba.label}`}
                          tom="ambar"
                          size="sm"
                        />
                      ) : (
                        <span
                          title="Aba aberta — segue o acesso do quadro"
                          className="flex size-4 items-center justify-center text-emerald-500"
                        >
                          <Eye className="size-3.5" />
                        </span>
                      )}

                      <span className="text-xs font-semibold text-slate-700">{aba.label}</span>

                      {aba.restrita && (
                        <span className="flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-selo font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
                          <Lock className="size-2.5" />
                          Sensível
                        </span>
                      )}

                      {aba.motivo && (
                        <span className="min-w-0 flex-1 truncate text-apoio text-slate-500">
                          {aba.motivo}
                        </span>
                      )}
                    </div>

                    {/* Colunas */}
                    <div
                      className={`mt-2.5 flex flex-wrap gap-x-4 gap-y-2 ${
                        restritaFechada ? 'pointer-events-none opacity-40' : ''
                      }`}
                    >
                      {colunas.map((coluna) => {
                        const visivel = !ocultas.includes(coluna.id);
                        return (
                          <label
                            key={coluna.id}
                            className="flex cursor-pointer items-center gap-1.5"
                            title={visivel ? 'Visível — desligue para ocultar' : 'Oculta para esta equipe'}
                          >
                            <Switch
                              ligado={visivel}
                              onChange={() => alternarColunaDaEquipe(equipe.id, coluna.id)}
                              label={`Coluna ${coluna.label}`}
                              size="sm"
                            />
                            <span
                              className={`text-apoio ${
                                visivel ? 'text-slate-600' : 'text-slate-500 line-through'
                              }`}
                            >
                              {coluna.label}
                            </span>
                          </label>
                        );
                      })}

                      {colunas.length === 0 && (
                        <span className="text-apoio text-slate-500">
                          Todas as colunas desta aba são obrigatórias.
                        </span>
                      )}
                    </div>

                    {fixas > 0 && (
                      <p className="mt-2 text-rotulo text-slate-500">
                        + {fixas} coluna{fixas > 1 ? 's' : ''} obrigatória{fixas > 1 ? 's' : ''} (nome,
                        totais, ações)
                      </p>
                    )}

                    {restritaFechada && (
                      <p className="mt-2 flex items-center gap-1 text-rotulo text-slate-500">
                        <EyeOff className="size-3" />
                        A equipe não vê esta aba — as colunas acima não têm efeito.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 3. Área de talentos */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-1 flex items-center gap-1.5 text-rotulo font-bold uppercase tracking-wider text-slate-500">
          <Star className="size-3" />
          Área de Talentos que a equipe atende
        </p>
        <p className="mb-3 text-apoio leading-snug text-slate-500">
          Define de quem sai a lista de responsáveis daquela coluna em Talentos. Uma área é
          atendida por uma equipe só — ligar aqui transfere.
        </p>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {AREAS.map((area) => {
            const atende = equipe.areaTalento === area.id;
            const outra = equipes.find(
              (item) => item.id !== equipe.id && item.areaTalento === area.id,
            );

            return (
              <label
                key={area.id}
                className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 transition ${
                  atende ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Switch
                  ligado={atende}
                  onChange={() => definirAreaDaEquipe(equipe.id, atende ? null : area.id)}
                  label={`Área ${area.label}`}
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-xs font-medium ${atende ? 'text-indigo-800' : 'text-slate-600'}`}
                  >
                    {area.label}
                  </span>
                  <span className="block truncate text-rotulo text-slate-500">
                    {outra ? `hoje: ${outra.nome}` : area.descricao}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
}
