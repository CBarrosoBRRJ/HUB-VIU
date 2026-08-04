import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, Search, ShieldCheck, Trash2, UserPlus, Users, X } from 'lucide-react';
import { PapelEquipe, PerfilSistema, SituacaoUsuario, Usuario } from '../../types';
import { useDados } from '../../context/DadosProvider';
import { equipesDoUsuario } from '../../utils/equipes';
import {
  ehDono, podeDefinirPerfil, podeDefinirSituacao, podeExcluirUsuario, rotuloDeNivel, SITUACAO_LABEL,
} from '../../utils/permissoes';
import { EditableCell } from '../ui/EditableCell';
import { Floating } from '../ui/Floating';
import { Avatar } from './Avatar';
import { PerfilSelect } from './PerfilSelect';
import { SituacaoSelect, SITUACAO_STYLE } from './SituacaoSelect';

const SITUACOES: SituacaoUsuario[] = ['ativo', 'ferias', 'afastado', 'inativo', 'desligado'];
const PERFIS: PerfilSistema[] = ['admin', 'responsavel', 'membro'];

/** Normaliza para busca tolerante a acento e caixa. */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function AbaPessoas() {
  const {
    usuarios, equipes, sessao, usuarioAtualId, atualizarUsuario, definirPerfil, definirSituacao,
    excluirUsuario, definirMembroDaEquipe, removerMembroDaEquipe,
  } = useDados();

  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [menuAberto, setMenuAberto] = useState<'situacao' | 'equipe' | null>(null);
  const refSituacao = useRef<HTMLButtonElement>(null);
  const refEquipe = useRef<HTMLButtonElement>(null);

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return usuarios;
    return usuarios.filter(
      (usuario) => normalizar(usuario.nome).includes(termo) || normalizar(usuario.email).includes(termo),
    );
  }, [usuarios, busca]);

  const alvos = useMemo(
    () => usuarios.filter((usuario) => selecionados.has(usuario.id)),
    [usuarios, selecionados],
  );

  /** Perfis que a sessão pode atribuir a esta pessoa. */
  function perfisPermitidos(alvo: Usuario): PerfilSistema[] {
    return PERFIS.filter((perfil) => podeDefinirPerfil(sessao, alvo, perfil));
  }

  function alternar(id: string) {
    setSelecionados((atuais) => {
      const proximo = new Set(atuais);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function alternarTodos() {
    setSelecionados((atuais) =>
      atuais.size === filtrados.length ? new Set() : new Set(filtrados.map((u) => u.id)),
    );
  }

  /**
   * Ações em lote aplicam só onde há permissão e **informam o que ficou de fora**.
   *
   * Silenciar os ignorados faria o operador acreditar que mudou 10 quando mudou 7.
   */
  function aplicarSituacao(situacao: SituacaoUsuario) {
    const permitidos = alvos.filter((usuario) => podeDefinirSituacao(sessao, usuario, situacao));
    const ignorados = alvos.length - permitidos.length;

    const aviso = `Marcar ${permitidos.length} ${permitidos.length === 1 ? 'pessoa' : 'pessoas'} como ${SITUACAO_LABEL[situacao]}?${
      ignorados > 0 ? `\n\n${ignorados} ${ignorados === 1 ? 'foi ignorada' : 'foram ignoradas'} por falta de permissão.` : ''
    }`;
    if (permitidos.length === 0 || !window.confirm(aviso)) return;

    permitidos.forEach((usuario) => definirSituacao(usuario.id, situacao));
    setSelecionados(new Set());
    setMenuAberto(null);
  }

  function aplicarEquipe(equipeId: string, papel: PapelEquipe | null) {
    const equipe = equipes.find((item) => item.id === equipeId);
    if (!equipe) return;

    alvos.forEach((usuario) => {
      if (papel) definirMembroDaEquipe(equipeId, usuario.id, papel);
      else removerMembroDaEquipe(equipeId, usuario.id);
    });
    setSelecionados(new Set());
    setMenuAberto(null);
  }

  function excluirSelecionados() {
    const permitidos = alvos.filter((usuario) => podeExcluirUsuario(sessao, usuario));
    const ignorados = alvos.length - permitidos.length;
    if (permitidos.length === 0) {
      window.alert('Nenhuma das pessoas selecionadas pode ser excluída por você.');
      return;
    }

    const aviso = `Excluir ${permitidos.length} ${permitidos.length === 1 ? 'pessoa' : 'pessoas'} da base? Esta ação não pode ser desfeita.${
      ignorados > 0 ? `\n\n${ignorados} ${ignorados === 1 ? 'será ignorada' : 'serão ignoradas'} (dono, você mesmo ou sem permissão).` : ''
    }\n\nPara preservar o histórico, prefira a situação "Desligado".`;
    if (!window.confirm(aviso)) return;

    permitidos.forEach((usuario) => excluirUsuario(usuario.id));
    setSelecionados(new Set());
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Barra de ações */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="size-1.5 rounded-full bg-slate-300" />
            {usuarios.length} {usuarios.length === 1 ? 'pessoa na base' : 'pessoas na base'}
          </span>

          <AnimatePresence>
            {selecionados.size > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="flex flex-wrap items-center gap-1.5"
              >
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                  {selecionados.size} selecionada{selecionados.size === 1 ? '' : 's'}
                </span>

                <button
                  ref={refSituacao}
                  type="button"
                  onClick={() => setMenuAberto(menuAberto === 'situacao' ? null : 'situacao')}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Definir situação
                  <ChevronDown className="size-3" />
                </button>

                <button
                  ref={refEquipe}
                  type="button"
                  onClick={() => setMenuAberto(menuAberto === 'equipe' ? null : 'equipe')}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  <Users className="size-3.5" />
                  Equipes
                  <ChevronDown className="size-3" />
                </button>

                <button
                  type="button"
                  onClick={excluirSelecionados}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="size-3.5" />
                  Excluir
                </button>

                <button
                  type="button"
                  onClick={() => setSelecionados(new Set())}
                  aria-label="Limpar seleção"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50"
                >
                  <X className="size-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5">
          <Search className="size-3.5 shrink-0 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pessoa…"
            className="w-52 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Menus de lote */}
      <AnimatePresence>
        {menuAberto === 'situacao' && (
          <Floating anchorRef={refSituacao} width={220} height={240} align="start">
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
            >
              {SITUACOES.map((situacao) => (
                <button
                  key={situacao}
                  type="button"
                  onClick={() => aplicarSituacao(situacao)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-600 transition hover:bg-slate-50"
                >
                  <span className={`size-2 rounded-full ${SITUACAO_STYLE[situacao].dot}`} />
                  {SITUACAO_LABEL[situacao]}
                </button>
              ))}
            </motion.div>
          </Floating>
        )}

        {menuAberto === 'equipe' && (
          <Floating anchorRef={refEquipe} width={264} height={280} align="start">
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl custom-scrollbar"
            >
              {equipes.map((equipe) => (
                <div key={equipe.id} className="mb-1 rounded-lg p-1.5 hover:bg-slate-50">
                  <p className="mb-1 truncate text-xs font-semibold text-slate-700">{equipe.nome}</p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => aplicarEquipe(equipe.id, 'membro')}
                      className="flex flex-1 items-center justify-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 transition hover:bg-slate-200"
                    >
                      <UserPlus className="size-3" />
                      Adicionar
                    </button>
                    <button
                      type="button"
                      onClick={() => aplicarEquipe(equipe.id, null)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <X className="size-3" />
                      Remover
                    </button>
                  </div>
                </div>
              ))}
              {equipes.length === 0 && (
                <p className="px-2 py-3 text-center text-xs text-slate-400">Nenhuma equipe criada.</p>
              )}
            </motion.div>
          </Floating>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[1080px] border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70">
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  aria-label="Selecionar todas as pessoas visíveis"
                  checked={filtrados.length > 0 && selecionados.size === filtrados.length}
                  onChange={alternarTodos}
                  className="size-3.5 cursor-pointer accent-indigo-600"
                />
              </th>
              {['Nome', 'Contato', 'Cargo', 'Perfil', 'Situação', 'Equipes'].map((label, indice) => (
                <th
                  key={label}
                  className={`px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 ${
                    indice === 0 ? 'w-[20%] text-left' : 'text-center'
                  }`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filtrados.map((usuario) => {
              const times = equipesDoUsuario(equipes, usuario.id);
              const ehVoce = usuario.id === usuarioAtualId;
              const dono = ehDono(usuario);
              const situacoesPermitidas = SITUACOES.filter((situacao) =>
                podeDefinirSituacao(sessao, usuario, situacao),
              );

              return (
                <tr key={usuario.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50/70">
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label={`Selecionar ${usuario.nome}`}
                      checked={selecionados.has(usuario.id)}
                      onChange={() => alternar(usuario.id)}
                      className="size-3.5 cursor-pointer accent-indigo-600"
                    />
                  </td>

                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="relative shrink-0">
                        <Avatar usuario={usuario} />
                        {usuario.situacao !== 'ativo' && (
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-white ${SITUACAO_STYLE[usuario.situacao].dot}`}
                          />
                        )}
                      </span>
                      <EditableCell
                        value={usuario.nome}
                        onCommit={(valor) => atualizarUsuario(usuario.id, 'nome', valor)}
                        align="left"
                        className="flex-1 text-sm font-semibold text-slate-800"
                      />
                      {ehVoce && <span className="shrink-0 text-[10px] text-slate-400">(você)</span>}
                    </div>
                  </td>

                  <td className="px-2 py-2.5">
                    <EditableCell
                      value={usuario.email}
                      onCommit={(valor) => atualizarUsuario(usuario.id, 'email', valor)}
                    />
                  </td>

                  <td className="px-2 py-2.5">
                    <EditableCell
                      value={usuario.cargo}
                      onCommit={(valor) => atualizarUsuario(usuario.id, 'cargo', valor)}
                      placeholder="Cargo"
                    />
                  </td>

                  <td className="px-3 py-2.5">
                    {dono ? (
                      <span
                        className="flex w-full items-center justify-center gap-1.5 rounded-md bg-violet-50 px-2 py-1.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-200"
                        title="Criador da conta — nível imutável"
                      >
                        <ShieldCheck className="size-3 shrink-0" />
                        {rotuloDeNivel(usuario)}
                      </span>
                    ) : (
                      <PerfilSelect
                        value={usuario.perfil}
                        disponiveis={perfisPermitidos(usuario)}
                        onChange={
                          perfisPermitidos(usuario).length > 0
                            ? (perfil) => definirPerfil(usuario.id, perfil)
                            : undefined
                        }
                      />
                    )}
                  </td>

                  <td className="px-3 py-2.5">
                    <SituacaoSelect
                      value={usuario.situacao}
                      disponiveis={situacoesPermitidas}
                      onChange={
                        situacoesPermitidas.length > 0
                          ? (situacao) => definirSituacao(usuario.id, situacao)
                          : undefined
                      }
                    />
                  </td>

                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap justify-center gap-1">
                      {times.map((equipe) => (
                        <span
                          key={equipe.id}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                        >
                          {equipe.nome}
                        </span>
                      ))}
                      {times.length === 0 && <span className="text-[11px] text-slate-300">Sem equipe</span>}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtrados.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-sm text-slate-400">
                  Ninguém encontrado com esse termo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-1.5 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
        <Check className="size-3 text-emerald-500" />
        Nome, contato e cargo são editáveis na grade. Perfil e capacidades ficam na aba Acessos.
      </div>
    </div>
  );
}
