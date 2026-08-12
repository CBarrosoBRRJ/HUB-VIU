import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check, Clock, Crown, Eye, LayoutGrid, Lock, Search, ShieldCheck, UserCheck, Users, X,
} from 'lucide-react';
import { AcaoConcedivel, PAGINAS_WORKSPACE, PapelEquipe, Usuario } from '../../types';
import { useDados } from '../../context/DadosProvider';
import { getPapelNaEquipe } from '../../utils/equipes';
import {
  ACAO_LABEL, ACOES_BASE, concessoesAtivasDe, contaAtiva, ehDono, nivelDeAcesso,
  podeGerenciarConcessoes, rotuloDeNivel, SITUACAO_LABEL,
} from '../../utils/permissoes';
import { Floating } from '../ui/Floating';
import { Avatar } from './Avatar';

const ACOES: AcaoConcedivel[] = [
  'gerenciar_usuarios',
  'gerenciar_acessos',
  'decidir_solicitacoes',
  'criar_equipe',
  'conceder_quadros',
  'definir_perfis',
  'gerenciar_dominios',
  'excluir_usuarios',
];

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function emDias(dias: number): string {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return `${data.toISOString().slice(0, 10)}T23:59:59`;
}

/**
 * Gestão de acesso de uma pessoa: capacidades, equipes e visualização.
 *
 * Busca em vez de listagem — com centenas de pessoas, uma lista aberta é inútil e cara de
 * renderizar.
 */
export function AbaAcessos() {
  const {
    usuarios, equipes, concessoes, sessao, conceder, revogarConcessao, definirMembroDaEquipe,
    removerMembroDaEquipe, verComo, contratos, talentos,
  } = useDados();

  const [busca, setBusca] = useState('');
  const [alvoId, setAlvoId] = useState<string | null>(null);
  const [dias, setDias] = useState('');
  const buscaRef = useRef<HTMLDivElement>(null);

  const podeConceder = podeGerenciarConcessoes(sessao);

  const resultados = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return [];
    return usuarios
      .filter((u) => normalizar(u.nome).includes(termo) || normalizar(u.email).includes(termo))
      .slice(0, 6);
  }, [busca, usuarios]);

  const alvo = usuarios.find((usuario) => usuario.id === alvoId);

  const visao = useMemo(() => {
    if (!alvo) return null;
    const contexto = { usuario: alvo, equipes, concessoes };

    // O nível é resposta de equipe — a nomeação decide linhas, não abre quadro (ver `nivelDeAcesso`).
    return {
      quadros: PAGINAS_WORKSPACE.map((pagina) => ({
        label: pagina.label,
        nivel: nivelDeAcesso(contexto, pagina.id),
      })),
      ativas: concessoesAtivasDe(concessoes, alvo.id),
    };
  }, [alvo, equipes, concessoes, contratos, talentos]);

  function alternarCapacidade(acao: AcaoConcedivel, jaConcedida: boolean, pessoa: Usuario) {
    if (jaConcedida) {
      revogarConcessao(pessoa.id, acao);
      return;
    }
    const prazo = Number(dias);
    conceder(pessoa.id, acao, prazo > 0 ? new Date(emDias(prazo)).toISOString() : undefined);
  }

  function alternarEquipe(equipeId: string, papelAtual: PapelEquipe | null, pessoa: Usuario) {
    if (papelAtual) removerMembroDaEquipe(equipeId, pessoa.id);
    else definirMembroDaEquipe(equipeId, pessoa.id, 'membro');
  }

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
          <ShieldCheck className="size-4 text-slate-400" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Gestão de acessos
          </p>
        </div>

        <div className="p-4">
          <p className="mb-3 text-xs text-slate-500">
            Busque a pessoa para ver o acesso dela e ajustar capacidades, equipes e quadros.
            {podeConceder
              ? ' Concessões podem ter prazo — útil para cobrir ausências sem promover ninguém.'
              : ' Só o dono do sistema concede ou revoga capacidades.'}
          </p>

          {/*
            O painel de resultados vai em portal: este card tem `overflow-hidden`, e um dropdown
            posicionado com `absolute` seria recortado pela borda do card.
          */}
          <div ref={buscaRef} className="flex max-w-md items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5">
            <Search className="size-3.5 shrink-0 text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar pessoa…"
              className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                aria-label="Limpar busca"
                className="rounded p-0.5 text-slate-400 transition hover:text-slate-600"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <AnimatePresence>
            {resultados.length > 0 && (
              <Floating anchorRef={buscaRef} width={420} height={260} align="start">
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
                >
                  {resultados.map((usuario) => (
                    <button
                      key={usuario.id}
                      type="button"
                      onClick={() => {
                        setAlvoId(usuario.id);
                        setBusca('');
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition hover:bg-slate-50"
                    >
                      <Avatar usuario={usuario} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-slate-700">{usuario.nome}</span>
                        <span className="block truncate text-rotulo text-slate-500">{usuario.email}</span>
                      </span>
                      <span className="shrink-0 text-rotulo text-slate-500">{rotuloDeNivel(usuario)}</span>
                    </button>
                  ))}
                </motion.div>
              </Floating>
            )}
          </AnimatePresence>

          {!alvo && (
            <p className="mt-3 text-xs text-slate-400">
              Nenhuma pessoa selecionada — comece digitando um nome.
            </p>
          )}
        </div>
      </div>

      {alvo && visao && (
        <>
          {/* Identificação + Ver como */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <Avatar usuario={alvo} size="md" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-800">{alvo.nome}</span>
              <span className="block truncate text-apoio text-slate-500">{alvo.email}</span>
            </span>

            <span className="text-xs text-slate-500">
              {rotuloDeNivel(alvo)} · {SITUACAO_LABEL[alvo.situacao]}
            </span>

            <motion.button
              type="button"
              onClick={() => verComo(alvo.id)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              disabled={!contaAtiva(alvo)}
              title={
                contaAtiva(alvo)
                  ? 'Abrir a plataforma com os olhos desta pessoa, em somente leitura'
                  : 'Conta sem acesso — não há o que visualizar'
              }
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200"
            >
              <Eye className="size-3.5" />
              Ver como
            </motion.button>

            <button
              type="button"
              onClick={() => setAlvoId(null)}
              aria-label="Fechar"
              className="rounded p-1 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {!contaAtiva(alvo) && (
            <p className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-4 py-2.5 text-apoio text-rose-700">
              <Lock className="size-3.5 shrink-0" />
              Conta {SITUACAO_LABEL[alvo.situacao].toLowerCase()} — nada abaixo tem efeito enquanto ela
              não voltar a ficar ativa.
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Capacidades */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <ShieldCheck className="size-3.5 text-slate-400" />
                  Capacidades
                </p>

                {podeConceder && !ehDono(alvo) && (
                  <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-rotulo text-slate-500">
                    <Clock className="size-3 text-slate-400" />
                    por
                    <input
                      type="number"
                      min={1}
                      value={dias}
                      onChange={(e) => setDias(e.target.value)}
                      placeholder="∞"
                      className="w-9 bg-transparent text-center text-apoio text-slate-700 outline-none placeholder:text-slate-500"
                    />
                    dias
                  </label>
                )}
              </div>

              <div className="p-2">
                {ACOES.map((acao) => {
                  const naBase = ACOES_BASE[alvo.perfil].includes(acao);
                  const concessao = visao.ativas.find((c) => c.acao === acao);
                  const donoTemTudo = ehDono(alvo);
                  const ligado = donoTemTudo || naBase || Boolean(concessao);
                  const travado = donoTemTudo || naBase || !podeConceder;

                  return (
                    <button
                      key={acao}
                      type="button"
                      disabled={travado}
                      onClick={() => alternarCapacidade(acao, Boolean(concessao), alvo)}
                      title={
                        donoTemTudo
                          ? 'O dono do sistema pode tudo, sempre'
                          : naBase
                            ? `Já incluído no perfil ${rotuloDeNivel(alvo)}`
                            : podeConceder
                              ? undefined
                              : 'Somente o dono concede capacidades'
                      }
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-xs transition ${
                        travado ? 'cursor-default' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`flex size-4 shrink-0 items-center justify-center rounded border transition ${
                          ligado ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 bg-white'
                        } ${travado && !ligado ? 'opacity-50' : ''}`}
                      >
                        {ligado && <Check className="size-3" />}
                      </span>

                      <span className={`flex-1 ${ligado ? 'text-slate-700' : 'text-slate-400'}`}>
                        {ACAO_LABEL[acao]}
                      </span>

                      {donoTemTudo && <span className="text-rotulo text-slate-500">dono</span>}
                      {!donoTemTudo && naBase && (
                        <span className="text-rotulo text-slate-500">do perfil</span>
                      )}
                      {concessao?.expiraEm && (
                        <span className="flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-rotulo font-medium text-amber-700">
                          <Clock className="size-2.5" />
                          {new Date(concessao.expiraEm).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Equipes e quadros */}
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-1.5 border-b border-slate-200 px-4 py-2.5">
                  <Users className="size-3.5 text-slate-400" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Equipes
                  </p>
                </div>

                <div className="p-2">
                  {equipes.map((equipe) => {
                    const papel = getPapelNaEquipe(equipe, alvo.id);
                    const dentro = papel !== null;

                    return (
                      <div
                        key={equipe.id}
                        className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-slate-50"
                      >
                        <button
                          type="button"
                          onClick={() => alternarEquipe(equipe.id, papel, alvo)}
                          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                        >
                          <span
                            className={`flex size-4 shrink-0 items-center justify-center rounded border transition ${
                              dentro ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {dentro && <Check className="size-3" />}
                          </span>
                          <span className={`min-w-0 flex-1 truncate text-xs ${dentro ? 'text-slate-700' : 'text-slate-400'}`}>
                            {equipe.nome}
                          </span>
                        </button>

                        {dentro && (
                          <button
                            type="button"
                            onClick={() =>
                              definirMembroDaEquipe(
                                equipe.id,
                                alvo.id,
                                papel === 'responsavel' ? 'membro' : 'responsavel',
                              )
                            }
                            title="Alternar entre responsável e membro"
                            className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-rotulo font-semibold ring-1 transition ${
                              papel === 'responsavel'
                                ? 'bg-amber-50 text-amber-700 ring-amber-200'
                                : 'bg-slate-100 text-slate-600 ring-slate-200'
                            }`}
                          >
                            {papel === 'responsavel' ? <Crown className="size-3" /> : <Users className="size-3" />}
                            {papel === 'responsavel' ? 'Responsável' : 'Membro'}
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {equipes.length === 0 && (
                    <p className="px-2 py-4 text-center text-xs text-slate-400">Nenhuma equipe criada.</p>
                  )}
                </div>
              </div>

              {/* Quadros resultantes */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-1.5 border-b border-slate-200 px-4 py-2.5">
                  <LayoutGrid className="size-3.5 text-slate-400" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Quadros que enxerga
                  </p>
                </div>

                <div className="space-y-1.5 p-4">
                  {visao.quadros.map((quadro) => (
                    <p key={quadro.label} className="flex items-center gap-1.5 text-xs">
                      {quadro.nivel === 'total' && (
                        <Check className="size-3.5 shrink-0 text-emerald-600" />
                      )}
                      {quadro.nivel === 'nomeado' && (
                        <UserCheck className="size-3.5 shrink-0 text-amber-500" />
                      )}
                      {quadro.nivel === 'nenhum' && <X className="size-3.5 shrink-0 text-slate-300" />}

                      <span className={quadro.nivel === 'nenhum' ? 'text-slate-400' : 'text-slate-600'}>
                        {quadro.label}
                      </span>

                      {quadro.nivel === 'nomeado' && (
                        <span
                          title="Vê apenas os registros em que foi nomeada"
                          className="rounded bg-amber-50 px-1 py-0.5 text-selo font-bold uppercase tracking-wide text-amber-600"
                        >
                          Só os dela
                        </span>
                      )}
                    </p>
                  ))}

                  <p className="pt-1 text-rotulo leading-snug text-slate-500">
                    O quadro abre pela equipe ou por nomeação. Membro e quem entra só por nomeação
                    enxergam apenas os próprios registros.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
