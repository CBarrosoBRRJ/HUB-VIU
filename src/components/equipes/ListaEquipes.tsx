import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, Search, Users, X } from 'lucide-react';
import { AppPage, Equipe, PAGINAS_WORKSPACE } from '../../types';
import { getCorAvatar, getIniciais } from '../usuarios/Avatar';

/** Normaliza para busca tolerante a acento e caixa. */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

interface ListaEquipesProps {
  equipes: Equipe[];
  equipeAtivaId: string | null;
  onSelecionar: (id: string) => void;
  onCriar: (nome: string, paginas: AppPage[]) => void;
  /** Criar equipe é privilégio do admin. */
  podeCriar: boolean;
}

/** Coluna esquerda do workspace: busca, criação e navegação entre equipes. */
export function ListaEquipes({
  equipes, equipeAtivaId, onSelecionar, onCriar, podeCriar,
}: ListaEquipesProps) {
  const [busca, setBusca] = useState('');
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState('');
  const [paginas, setPaginas] = useState<AppPage[]>(PAGINAS_WORKSPACE.map((p) => p.id));

  const filtradas = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return equipes;
    return equipes.filter((equipe) => normalizar(equipe.nome).includes(termo));
  }, [busca, equipes]);

  function alternarPagina(pagina: AppPage) {
    setPaginas((atuais) =>
      atuais.includes(pagina) ? atuais.filter((id) => id !== pagina) : [...atuais, pagina],
    );
  }

  function salvar() {
    if (!nome.trim()) return;
    onCriar(nome.trim(), paginas);
    setNome('');
    setPaginas(PAGINAS_WORKSPACE.map((p) => p.id));
    setCriando(false);
  }

  return (
    <div className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="space-y-2 border-b border-slate-100 p-3">
        {podeCriar && (
          <motion.button
            type="button"
            onClick={() => setCriando((atual) => !atual)}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            {criando ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
            {criando ? 'Cancelar' : 'Nova equipe'}
          </motion.button>
        )}

        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
          <Search className="size-3.5 shrink-0 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar equipes"
            className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {criando && podeCriar && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden border-b border-emerald-200 bg-emerald-50/40"
          >
            <div className="space-y-2.5 p-3">
              <input
                autoFocus
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && salvar()}
                placeholder="+ Nova equipe (Enter)"
                className="w-full rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />

              <div>
                <p className="mb-1.5 text-rotulo font-bold uppercase tracking-wider text-slate-500">
                  Quadros que a equipe enxerga
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PAGINAS_WORKSPACE.map((pagina) => {
                    const ativa = paginas.includes(pagina.id);
                    return (
                      <button
                        key={pagina.id}
                        type="button"
                        onClick={() => alternarPagina(pagina.id)}
                        className={`rounded-full px-2.5 py-1 text-apoio font-medium transition ${
                          ativa
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:ring-indigo-300'
                        }`}
                      >
                        {pagina.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <motion.button
                type="button"
                onClick={salvar}
                disabled={!nome.trim()}
                whileTap={{ scale: 0.98 }}
                className="w-full rounded-lg bg-indigo-600 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200"
              >
                Criar equipe
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        <p className="px-2 py-1.5 text-rotulo font-bold uppercase tracking-[0.14em] text-slate-500">
          Todas as equipes ({equipes.length})
        </p>

        <div className="flex flex-col gap-0.5">
          {filtradas.map((equipe) => {
            const ativa = equipe.id === equipeAtivaId;
            return (
              <button
                key={equipe.id}
                type="button"
                onClick={() => onSelecionar(equipe.id)}
                className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  ativa ? 'bg-indigo-50' : 'hover:bg-slate-50'
                }`}
              >
                {ativa && (
                  <motion.span
                    layoutId="indicador-equipe"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    className="absolute left-0 h-5 w-1 rounded-r-full bg-indigo-500"
                  />
                )}
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-rotulo font-bold text-white ${getCorAvatar(equipe.nome)}`}
                >
                  {getIniciais(equipe.nome)}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-dado ${ativa ? 'font-semibold text-indigo-700' : 'text-slate-600'}`}
                  >
                    {equipe.nome}
                  </span>
                </span>
                <span className="shrink-0 text-apoio tabular-nums text-slate-500">
                  {equipe.membros.length}
                </span>
              </button>
            );
          })}

          {filtradas.length === 0 && (
            <p className="flex flex-col items-center gap-2 px-3 py-8 text-center text-xs text-slate-400">
              <Users className="size-5 text-slate-300" />
              {equipes.length === 0 ? 'Nenhuma equipe ainda.' : 'Nenhuma equipe encontrada.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
