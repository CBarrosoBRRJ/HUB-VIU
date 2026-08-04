import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Building2, ChevronsUpDown, FileText, LayoutList, Lock, LucideIcon, Star, Users, UserCog,
} from 'lucide-react';
import { AppPage } from '../types';
import { useDados } from '../context/DadosProvider';
import { ehDono, PERFIL_LABEL } from '../utils/permissoes';
import { Avatar } from './usuarios/Avatar';
import { PERFIL_STYLE } from './usuarios/PerfilSelect';
import { Floating } from './ui/Floating';

interface ItemMenu {
  id: AppPage;
  label: string;
  icon: LucideIcon;
}

/** Blocos da navegação: o trabalho do dia a dia e a gestão da plataforma. */
const SECOES: {
  titulo: string;
  itens: ItemMenu[];
  /** Lista os quadros sem acesso, trancados, em vez de escondê-los. */
  mostrarBloqueados?: boolean;
}[] = [
  {
    titulo: 'Workspace',
    mostrarBloqueados: true,
    itens: [
      { id: 'backlog', label: 'Backlog de Agenciados', icon: LayoutList },
      { id: 'contratos', label: 'Contratos de Agenciados', icon: FileText },
      { id: 'talentos', label: 'Talentos', icon: Star },
      { id: 'clientes', label: 'Cadastro de Clientes', icon: Building2 },
    ],
  },
  {
    titulo: 'Administração',
    itens: [
      { id: 'equipes', label: 'Equipes', icon: Users },
      { id: 'usuarios', label: 'Usuários', icon: UserCog },
    ],
  },
];

interface SidebarProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  // A navegação segue a sessão (que pode estar em "Ver como"), mas o rodapé mostra
  // quem está de fato conectado — senão a troca de sessão viraria uma armadilha.
  const { usuarios, entrarComo, usuarioReal, visualizandoComo, nivelDoQuadro } = useDados();
  const [trocandoSessao, setTrocandoSessao] = useState(false);
  const botaoRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!trocandoSessao) return;
    function handleClickOutside(event: MouseEvent) {
      if (!botaoRef.current?.contains(event.target as Node)) setTrocandoSessao(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [trocandoSessao]);

  const usuario = usuarioReal;
  const perfilStyle = usuario ? PERFIL_STYLE[usuario.perfil] : null;

  return (
    <nav className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="font-display text-sm font-bold text-slate-900">VIU Agenciamento</p>
        <p className="text-[11px] text-slate-400">Gestão de talentos</p>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3 custom-scrollbar">
        {SECOES.map((secao) => {
          /**
           * Quadros sem acesso continuam **visíveis, com cadeado**.
           *
           * Esconder faz a pessoa achar que o quadro não existe e perguntar por ele no chat;
           * mostrar trancado diz o que existe e a quem pedir. As páginas de administração seguem
           * ocultas — ali a existência do menu já é informação restrita.
           */
          const itens = secao.itens
            .map((item) => ({ ...item, nivel: nivelDoQuadro(item.id) }))
            .filter((item) => item.nivel !== 'nenhum' || secao.mostrarBloqueados);

          if (itens.every((item) => item.nivel === 'nenhum')) return null;

          return (
            <div key={secao.titulo}>
              <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                {secao.titulo}
              </p>

              <div className="flex flex-col gap-0.5">
                {itens.map((item) => {
                  const Icon = item.icon;
                  const bloqueado = item.nivel === 'nenhum';
                  const isActive = activePage === item.id && !bloqueado;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={bloqueado}
                      onClick={() => onNavigate(item.id)}
                      title={
                        bloqueado
                          ? 'Sem acesso — peça a um responsável para incluir você na equipe deste quadro'
                          : undefined
                      }
                      className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] whitespace-nowrap transition-colors ${
                        bloqueado
                          ? 'cursor-not-allowed text-slate-300'
                          : isActive
                            ? 'bg-indigo-50 font-semibold text-indigo-700'
                            : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="indicador-pagina"
                          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                          className="absolute left-0 h-5 w-1 rounded-r-full bg-indigo-500"
                        />
                      )}
                      <Icon
                        className={`size-4 shrink-0 ${
                          bloqueado ? 'text-slate-300' : isActive ? 'text-indigo-600' : 'text-slate-400'
                        }`}
                      />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>

                      {bloqueado && <Lock className="size-3 shrink-0 text-slate-300" />}
                      {item.nivel === 'nomeado' && (
                        <span
                          title="Você vê apenas os registros em que foi nomeado"
                          className="shrink-0 rounded bg-slate-100 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400"
                        >
                          Meus
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sessão — provisório até existir login de verdade. */}
      {usuario && (
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-1">
            {/* O bloco leva ao próprio cadastro; o chevron troca a sessão (demo). */}
            <button
              type="button"
              onClick={() => onNavigate('perfil')}
              title="Abrir meu perfil"
              className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-2 text-left transition ${
                activePage === 'perfil' ? 'bg-indigo-50' : 'hover:bg-slate-50'
              }`}
            >
              <Avatar usuario={usuario} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-slate-700">
                  {usuario.nome}
                </span>
                <span
                  className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ${perfilStyle?.chip}`}
                >
                  {ehDono(usuario) ? 'Dono do Sistema' : PERFIL_LABEL[usuario.perfil]}
                </span>
              </span>
            </button>

            <button
              ref={botaoRef}
              type="button"
              disabled={Boolean(visualizandoComo)}
              onClick={() => setTrocandoSessao((aberto) => !aberto)}
              aria-label="Trocar de sessão"
              title={
                visualizandoComo
                  ? 'Saia da visualização para trocar de sessão'
                  : 'Trocar de sessão (modo demonstração)'
              }
              className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ChevronsUpDown className="size-3.5" />
            </button>
          </div>

          <AnimatePresence>
            {trocandoSessao && (
              <Floating anchorRef={botaoRef} width={232} height={260} align="start">
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.14, ease: 'easeOut' }}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
                >
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Entrar como (demo)
                  </p>
                  {usuarios.map((candidato) => (
                    <button
                      key={candidato.id}
                      type="button"
                      onClick={() => {
                        entrarComo(candidato.id);
                        setTrocandoSessao(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition hover:bg-slate-50"
                    >
                      <Avatar usuario={candidato} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-slate-700">
                          {candidato.nome}
                        </span>
                        <span className="block truncate text-[10px] text-slate-400">
                          {PERFIL_LABEL[candidato.perfil]}
                        </span>
                      </span>
                    </button>
                  ))}
                </motion.div>
              </Floating>
            )}
          </AnimatePresence>
        </div>
      )}
    </nav>
  );
}
