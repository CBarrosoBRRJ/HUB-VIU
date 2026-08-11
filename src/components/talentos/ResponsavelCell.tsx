import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Crown, Search, UserPlus, Users } from 'lucide-react';
import { useDados } from '../../context/DadosProvider';
import { AppPage } from '../../types';
import { usuariosDoQuadro } from '../../utils/equipes';
import { getPapel, Papel, Pessoas } from '../../utils/pessoas';
import { Avatar } from '../usuarios/Avatar';
import { UserHoverCard } from '../usuarios/UserHoverCard';
import { Floating } from '../ui/Floating';

interface AvatarComPerfilProps {
  usuarioId: string;
  papel: Papel;
  onMigrar: () => void;
  onRemover: () => void;
  /** Só o cartão de perfil, sem as ações de mudar papel ou remover. */
  somenteLeitura?: boolean;
}

/** Avatar que revela o cartão de perfil no hover. */
function AvatarComPerfil({ usuarioId, papel, onMigrar, onRemover, somenteLeitura }: AvatarComPerfilProps) {
  const { getUsuario } = useDados();
  const usuario = getUsuario(usuarioId);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [isAberto, setIsAberto] = useState(false);
  const timerRef = useRef<number | null>(null);

  function abrir() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setIsAberto(true);
  }

  /** Carência para o ponteiro atravessar o vão entre o avatar e o cartão. */
  function fecharComCarencia() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setIsAberto(false), 180);
  }

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  if (!usuario) return null;

  return (
    <>
      <span
        ref={anchorRef}
        onMouseEnter={abrir}
        onMouseLeave={fecharComCarencia}
        className="relative -ml-1.5 inline-block first:ml-0"
      >
        <motion.span whileHover={{ y: -2, scale: 1.08 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }} className="block">
          <Avatar usuario={usuario} ring />
        </motion.span>
        {papel === 'responsavel' && (
          <span className="absolute -right-0.5 -top-1 flex size-3.5 items-center justify-center rounded-full bg-white">
            <Crown className="size-2.5 text-amber-500" />
          </span>
        )}
      </span>

      <AnimatePresence>
        {isAberto && (
          <Floating anchorRef={anchorRef} width={300} height={310}>
            <UserHoverCard
              usuario={usuario}
              papel={papel}
              onMouseEnter={abrir}
              onMouseLeave={fecharComCarencia}
              onMigrar={
                somenteLeitura
                  ? undefined
                  : () => {
                      setIsAberto(false);
                      onMigrar();
                    }
              }
              onRemover={
                somenteLeitura
                  ? undefined
                  : () => {
                      setIsAberto(false);
                      onRemover();
                    }
              }
            />
          </Floating>
        )}
      </AnimatePresence>
    </>
  );
}

/** Normaliza para busca tolerante a acento e caixa. */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

interface ResponsavelCellProps extends Pessoas {
  /** `null` tira a pessoa da linha. */
  onDefinirPapel: (usuarioId: string, papel: Papel | null) => void;
  /** Quem não pode editar a linha vê os avatares, mas não mexe na composição. */
  somenteLeitura?: boolean;
  /** Restringe os candidatos a quem opera este quadro. */
  quadro?: AppPage;
}

export function ResponsavelCell({
  responsaveisIds, parceirosIds, onDefinirPapel, somenteLeitura = false, quadro,
}: ResponsavelCellProps) {
  const { usuarios, usuarioAtualId, equipes } = useDados();
  const [isOpen, setIsOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const botaoRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);

  /**
   * Candidatos = quem participa das equipes que operam este quadro.
   *
   * Nomear alguém de fora criaria um responsável sem acesso ao próprio registro. Quem já está
   * na linha continua aparecendo, mesmo que tenha saído da equipe depois.
   */
  const ordenados = useMemo(() => {
    const jaNaLinha = new Set([...responsaveisIds, ...parceirosIds]);
    const doQuadro = quadro ? new Set(usuariosDoQuadro(equipes, quadro)) : null;

    return usuarios
      .filter((usuario) => !doQuadro || doQuadro.has(usuario.id) || jaNaLinha.has(usuario.id))
      .sort((a, b) => {
        if (a.id === usuarioAtualId) return -1;
        if (b.id === usuarioAtualId) return 1;
        return a.nome.localeCompare(b.nome, 'pt-BR');
      });
  }, [usuarios, usuarioAtualId, equipes, quadro, responsaveisIds, parceirosIds]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      const alvo = event.target as Node;
      if (botaoRef.current?.contains(alvo) || painelRef.current?.contains(alvo)) return;
      setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setBusca('');
  }, [isOpen]);

  const pessoas: Pessoas = { responsaveisIds, parceirosIds };

  const candidatos = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return ordenados;
    return ordenados.filter(
      (usuario) => normalizar(usuario.nome).includes(termo) || normalizar(usuario.email).includes(termo),
    );
  }, [busca, ordenados]);

  const vazio = responsaveisIds.length === 0 && parceirosIds.length === 0;

  return (
    <div className="flex items-center justify-center">
      {responsaveisIds.map((id) => (
        <AvatarComPerfil
          key={id}
          usuarioId={id}
          papel="responsavel"
          somenteLeitura={somenteLeitura}
          onMigrar={() => onDefinirPapel(id, 'parceiro')}
          onRemover={() => onDefinirPapel(id, null)}
        />
      ))}
      {parceirosIds.map((id) => (
        <AvatarComPerfil
          key={id}
          usuarioId={id}
          papel="parceiro"
          somenteLeitura={somenteLeitura}
          onMigrar={() => onDefinirPapel(id, 'responsavel')}
          onRemover={() => onDefinirPapel(id, null)}
        />
      ))}

      {somenteLeitura && responsaveisIds.length === 0 && parceirosIds.length === 0 && (
        <span className="text-apoio text-slate-500">—</span>
      )}

      {/* Botão único: define responsáveis e parceiros. */}
      {!somenteLeitura && (
      <motion.button
        ref={botaoRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.92 }}
        aria-label="Gerenciar pessoas da linha"
        title={vazio ? 'Atribuir responsável' : 'Adicionar pessoas'}
        className={`flex size-7 items-center justify-center rounded-full border border-dashed bg-white transition-colors hover:border-indigo-400 hover:text-indigo-500 ${
          vazio ? 'border-slate-300 text-slate-400' : '-ml-1.5 border-slate-300 text-slate-400'
        }`}
      >
        <UserPlus className="size-3.5" />
      </motion.button>
      )}

      <AnimatePresence>
        {isOpen && !somenteLeitura && (
          <Floating anchorRef={botaoRef} width={288} height={330}>
            <motion.div
              ref={painelRef}
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            >
              <div className="border-b border-slate-100 p-2">
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <Search className="size-3.5 shrink-0 text-slate-400" />
                  <input
                    autoFocus
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar pessoa…"
                    className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
                {candidatos.map((usuario) => {
                  const papel = getPapel(pessoas, usuario.id);
                  return (
                    <div key={usuario.id} className="flex items-center gap-2 px-3 py-1.5 transition hover:bg-slate-50">
                      <Avatar usuario={usuario} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-slate-700">
                          {usuario.nome}
                          {usuario.id === usuarioAtualId && (
                            <span className="ml-1 text-rotulo font-normal text-slate-500">(você)</span>
                          )}
                        </span>
                        <span className="block truncate text-rotulo text-slate-500">{usuario.email}</span>
                      </span>

                      {/* Clicar no papel que a pessoa já tem a remove da linha. */}
                      <motion.button
                        type="button"
                        onClick={() => onDefinirPapel(usuario.id, papel === 'responsavel' ? null : 'responsavel')}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        aria-label={`Responsável: ${usuario.nome}`}
                        title={papel === 'responsavel' ? 'Remover da linha' : 'Tornar responsável'}
                        className={`shrink-0 rounded-md p-1 transition ${
                          papel === 'responsavel'
                            ? 'bg-amber-50 text-amber-500'
                            : 'text-slate-300 hover:bg-amber-50 hover:text-amber-500'
                        }`}
                      >
                        <Crown className="size-3.5" />
                      </motion.button>

                      <motion.button
                        type="button"
                        onClick={() => onDefinirPapel(usuario.id, papel === 'parceiro' ? null : 'parceiro')}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        aria-label={`Parceiro: ${usuario.nome}`}
                        title={papel === 'parceiro' ? 'Remover da linha' : 'Tornar parceiro'}
                        className={`shrink-0 rounded-md p-1 transition ${
                          papel === 'parceiro'
                            ? 'bg-indigo-50 text-indigo-500'
                            : 'text-slate-300 hover:bg-indigo-50 hover:text-indigo-500'
                        }`}
                      >
                        <Users className="size-3.5" />
                      </motion.button>
                    </div>
                  );
                })}

                {candidatos.length === 0 && (
                  <p className="px-3 py-4 text-center text-xs leading-snug text-slate-400">
                    {busca.trim()
                      ? 'Ninguém encontrado.'
                      : 'Nenhuma pessoa na equipe que opera este quadro. Cadastre em Administração › Equipes.'}
                  </p>
                )}
              </div>
            </motion.div>
          </Floating>
        )}
      </AnimatePresence>
    </div>
  );
}
