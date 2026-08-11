import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Search, UserPlus } from 'lucide-react';
import { AreaTalento } from '../../types';
import { useDados } from '../../context/DadosProvider';
import { candidatosDaArea, equipeDaArea, getArea } from '../../utils/talentos';
import { Avatar } from '../usuarios/Avatar';
import { UserHoverCard } from '../usuarios/UserHoverCard';
import { Floating } from '../ui/Floating';

/** Normaliza para busca tolerante a acento e caixa. */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/** Avatar com cartão de perfil no hover — um por responsável. */
function AvatarResponsavel({
  usuarioId, papel = 'responsavel', onRemover,
}: { usuarioId: string; papel?: 'responsavel' | 'apoio'; onRemover?: () => void }) {
  const { getUsuario } = useDados();
  const usuario = getUsuario(usuarioId);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [aberto, setAberto] = useState(false);
  const timerRef = useRef<number | null>(null);

  function abrir() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setAberto(true);
  }

  /** Carência para o ponteiro atravessar o vão entre o avatar e o cartão. */
  function fecharComCarencia() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setAberto(false), 180);
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
        <motion.span
          whileHover={{ y: -2, scale: 1.08 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="block"
        >
          <Avatar usuario={usuario} ring />
        </motion.span>
      </span>

      <AnimatePresence>
        {aberto && (
          <Floating anchorRef={anchorRef} width={300} height={310}>
            <UserHoverCard
              usuario={usuario}
              papel={papel === 'apoio' ? 'parceiro' : 'responsavel'}
              onMouseEnter={abrir}
              onMouseLeave={fecharComCarencia}
              onRemover={
                onRemover
                  ? () => {
                      setAberto(false);
                      onRemover();
                    }
                  : undefined
              }
            />
          </Floating>
        )}
      </AnimatePresence>
    </>
  );
}

interface AreaResponsavelCellProps {
  area: AreaTalento;
  /** Ids de quem **responde** pela área; vazio significa "a definir". */
  usuarioIds: string[];
  /**
   * Ids de quem **apoia**, sem responder.
   *
   * Ausente deixa a célula no modo simples — uma lista só, sem escolha de papel. É o que a página
   * de Talentos usa, onde a distinção ainda não faz falta.
   */
  apoioIds?: string[];
  /** Alterna a pessoa — o mesmo gesto adiciona e remove. */
  onAlternar?: (usuarioId: string) => void;
  /** Alterna com papel. Quando presente, o painel oferece a escolha. */
  onAlternarPapel?: (usuarioId: string, papel: 'responsavel' | 'apoio') => void;
}

/**
 * Responsáveis de uma área do talento.
 *
 * Aceita **vários**, como a coluna Responsável dos contratos: dupla de produção e substituto são
 * situações correntes, e a lista é o que garante que os dois tenham acesso ao registro.
 */
export function AreaResponsavelCell({
  area, usuarioIds, apoioIds, onAlternar, onAlternarPapel,
}: AreaResponsavelCellProps) {
  const { usuarios, equipes, usuarioAtualId } = useDados();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const botaoRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);

  const config = getArea(area);
  const editavel = Boolean(onAlternar || onAlternarPapel);
  /** Com papéis, o painel mostra duas ações por pessoa em vez de um clique só. */
  const comPapeis = Boolean(onAlternarPapel);
  const apoios = apoioIds ?? [];
  /** Todos os envolvidos, responsáveis primeiro: é a ordem em que os avatares aparecem. */
  const todos = [...usuarioIds, ...apoios];
  const equipe = equipeDaArea(equipes, area);

  const candidatos = useMemo(() => {
    // Quem já responde permanece na lista mesmo tendo saído da equipe — senão não dá para tirá-lo.
    const daEquipe = candidatosDaArea(equipes, usuarios, area);
    const jaNomeados = usuarios.filter(
      (usuario) => usuarioIds.includes(usuario.id) && !daEquipe.some((c) => c.id === usuario.id),
    );

    const lista = [...daEquipe, ...jaNomeados].sort((a, b) => {
      if (a.id === usuarioAtualId) return -1;
      if (b.id === usuarioAtualId) return 1;
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });

    const termo = normalizar(busca.trim());
    if (!termo) return lista;
    return lista.filter(
      (usuario) => normalizar(usuario.nome).includes(termo) || normalizar(usuario.email).includes(termo),
    );
  }, [equipes, usuarios, area, usuarioIds, usuarioAtualId, busca]);

  useEffect(() => {
    if (!aberto) {
      setBusca('');
      return;
    }
    function handleClickOutside(evento: MouseEvent) {
      const alvo = evento.target as Node;
      if (botaoRef.current?.contains(alvo) || painelRef.current?.contains(alvo)) return;
      setAberto(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [aberto]);

  const vazio = todos.length === 0;

  return (
    <div className="flex items-center justify-center">
      {todos.map((id) => (
        <AvatarResponsavel
          key={id}
          usuarioId={id}
          /* O cartão de perfil diz o papel — é a informação que o avatar sozinho não carrega. */
          papel={apoios.includes(id) ? 'apoio' : 'responsavel'}
          onRemover={
            editavel
              ? () => (comPapeis
                ? onAlternarPapel!(id, apoios.includes(id) ? 'apoio' : 'responsavel')
                : onAlternar!(id))
              : undefined
          }
        />
      ))}

      {vazio && !editavel && <span className="text-apoio text-slate-500">—</span>}

      {editavel && (
        <motion.button
          ref={botaoRef}
          type="button"
          onClick={() => setAberto((atual) => !atual)}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.92 }}
          aria-label={`Responsáveis de ${config?.label ?? area}`}
          title={vazio ? `Definir responsável de ${config?.label ?? area}` : 'Adicionar pessoa'}
          className={`flex size-7 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white text-slate-400 transition-colors hover:border-indigo-400 hover:text-indigo-500 ${
            vazio ? '' : '-ml-1.5'
          }`}
        >
          <UserPlus className="size-3.5" />
        </motion.button>
      )}

      <AnimatePresence>
        {aberto && editavel && (
          <Floating anchorRef={botaoRef} width={280} height={320}>
            <motion.div
              ref={painelRef}
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            >
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="text-rotulo font-bold uppercase tracking-wider text-slate-500">
                  {config?.label}
                  {usuarioIds.length > 1 && (
                    <span className="ml-1 font-normal normal-case tracking-normal text-slate-400">
                      · {usuarioIds.length} pessoas
                    </span>
                  )}
                </p>
                <p className="truncate text-apoio text-slate-500">
                  {equipe ? equipe.nome : 'Nenhuma equipe atende esta área'}
                </p>
              </div>

              <div className="border-b border-slate-100 p-2">
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <Search className="size-3.5 shrink-0 text-slate-400" />
                  <input
                    autoFocus
                    value={busca}
                    onChange={(evento) => setBusca(evento.target.value)}
                    placeholder="Buscar pessoa…"
                    className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto py-1 custom-scrollbar">
                {candidatos.map((usuario) => {
                  const ehResponsavel = usuarioIds.includes(usuario.id);
                  const ehApoio = apoios.includes(usuario.id);
                  const nomeado = ehResponsavel || ehApoio;

                  /*
                    Sem papéis, a linha inteira é um botão — o modo que a página de Talentos usa.
                  */
                  if (!comPapeis) {
                    return (
                      <button
                        key={usuario.id}
                        type="button"
                        // O painel fica aberto: adicionar vários seguidos é o caso comum.
                        onClick={() => onAlternar!(usuario.id)}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition hover:bg-slate-50 ${
                          nomeado ? 'bg-indigo-50/60' : ''
                        }`}
                      >
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
                        {nomeado && <Check className="size-3.5 shrink-0 text-emerald-600" />}
                      </button>
                    );
                  }

                  /*
                    Com papéis: dois botões por pessoa, e clicar no papel que ela já tem a remove.

                    Os dois ficam visíveis em vez de esconder o segundo atrás de um menu — trocar
                    de apoio para responsável é gesto corrente, e vale um clique, não três.
                  */
                  return (
                    <div
                      key={usuario.id}
                      className={`flex items-center gap-2 px-3 py-1.5 transition ${
                        nomeado ? 'bg-indigo-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
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

                      <span className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onAlternarPapel!(usuario.id, 'responsavel')}
                          title={ehResponsavel ? 'Tirar da área' : 'Definir como responsável'}
                          className={`rounded px-1.5 py-0.5 text-rotulo font-bold uppercase tracking-wide transition ${
                            ehResponsavel
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-500 ring-1 ring-slate-200 hover:bg-white hover:text-indigo-600'
                          }`}
                        >
                          Resp.
                        </button>
                        <button
                          type="button"
                          onClick={() => onAlternarPapel!(usuario.id, 'apoio')}
                          title={ehApoio ? 'Tirar da área' : 'Definir como apoio'}
                          className={`rounded px-1.5 py-0.5 text-rotulo font-bold uppercase tracking-wide transition ${
                            ehApoio
                              ? 'bg-slate-500 text-white'
                              : 'text-slate-500 ring-1 ring-slate-200 hover:bg-white hover:text-slate-600'
                          }`}
                        >
                          Apoio
                        </button>
                      </span>
                    </div>
                  );
                })}

                {candidatos.length === 0 && (
                  <p className="px-3 py-4 text-center text-xs leading-snug text-slate-400">
                    {busca.trim()
                      ? 'Ninguém encontrado.'
                      : equipe
                        ? `A equipe ${equipe.nome} ainda não tem membros.`
                        : `Crie a equipe "${config?.equipeSugerida}" em Administração › Equipes e marque a área ${config?.label}.`}
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
