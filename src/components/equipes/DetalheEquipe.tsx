import { useState } from 'react';
import { motion } from 'motion/react';
import { Crown, LayoutGrid, Lock, Send, Settings, Star, Trash2, Users } from 'lucide-react';
import { Equipe } from '../../types';
import { useDados } from '../../context/DadosProvider';
import { contarPorPapel, getPapelNaEquipe } from '../../utils/equipes';
import { AREAS } from '../../utils/talentos';
import {
  podeDefinirAcessoDaEquipe, podeGerenciarEquipe, podeSolicitarAcesso,
} from '../../utils/permissoes';
import { getCorAvatar, getIniciais } from '../usuarios/Avatar';
import { EditableCell } from '../ui/EditableCell';
import { AbaConfig, Tabs } from '../ui/Tabs';
import { MembrosTable } from './MembrosTable';
import { LinkDaEquipe } from './LinkDaEquipe';
import { ConfiguracaoEquipe } from './ConfiguracaoEquipe';

type AbaId = 'pessoas' | 'configuracao';

export function DetalheEquipe({ equipe }: { equipe: Equipe }) {
  const { renomearEquipe, excluirEquipe, sessao, criarSolicitacao } = useDados();
  const { responsaveis, membros } = contarPorPapel(equipe);
  const [aba, setAba] = useState<AbaId>('pessoas');

  const podeGerenciar = podeGerenciarEquipe(sessao, equipe);
  const podeConfigurar = podeDefinirAcessoDaEquipe(sessao);
  const naEquipe = getPapelNaEquipe(equipe, sessao.usuario?.id ?? '') !== null;
  const podePedir = podeSolicitarAcesso(sessao) && !naEquipe;

  // A aba de Configuração é a única porta para quadros, abas e colunas — quem não configura
  // sequer a enxerga, e vê o resumo em leitura no cartão.
  const abas: AbaConfig<AbaId>[] = [
    { id: 'pessoas', label: 'Pessoas', icon: Users, contador: equipe.membros.length },
    ...(podeConfigurar
      ? [{ id: 'configuracao' as const, label: 'Configuração', icon: Settings }]
      : []),
  ];

  function pedirAcesso() {
    const justificativa = window.prompt(`Por que você precisa de acesso à equipe ${equipe.nome}?`);
    if (justificativa === null) return;
    criarSolicitacao(equipe.id, justificativa.trim());
  }

  function excluir() {
    const aviso =
      equipe.membros.length > 0
        ? `Excluir a equipe ${equipe.nome}? As ${equipe.membros.length} pessoas continuam na base de usuários.`
        : `Excluir a equipe ${equipe.nome}?`;
    if (window.confirm(aviso)) excluirEquipe(equipe.id);
  }

  const areaAtendida = AREAS.find((area) => area.id === equipe.areaTalento);

  return (
    <div className="flex-1 overflow-auto bg-[#f4f6fa] p-6 custom-scrollbar">
      {/* Cabeçalho da equipe */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-16 bg-gradient-to-r from-[#111a3a] via-[#233163] to-[#111a3a]" />

        <div className="px-5 pb-4">
          <div className="-mt-8 flex items-end justify-between gap-4">
            <span
              className={`flex size-16 items-center justify-center rounded-2xl text-lg font-bold text-white ring-4 ring-white ${getCorAvatar(equipe.nome)}`}
            >
              {getIniciais(equipe.nome)}
            </span>

            <div className="mb-1 flex items-center gap-2">
              {podePedir && (
                <motion.button
                  type="button"
                  onClick={pedirAcesso}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                >
                  <Send className="size-3.5" />
                  Solicitar acesso
                </motion.button>
              )}

              {podeGerenciar && (
                <motion.button
                  type="button"
                  onClick={excluir}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                >
                  <Trash2 className="size-3.5" />
                  Excluir equipe
                </motion.button>
              )}
            </div>
          </div>

          <div className="mt-3 max-w-md">
            {podeGerenciar ? (
              <EditableCell
                value={equipe.nome}
                onCommit={(valor) => valor.trim() && renomearEquipe(equipe.id, valor.trim())}
                align="left"
                className="font-display text-xl font-bold text-slate-900"
              />
            ) : (
              <p className="px-2 font-display text-xl font-bold text-slate-900">{equipe.nome}</p>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-4 px-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5 text-slate-400" />
              {equipe.membros.length} {equipe.membros.length === 1 ? 'pessoa' : 'pessoas'}
            </span>
            <span className="flex items-center gap-1.5">
              <Crown className="size-3.5 text-amber-500" />
              {responsaveis} {responsaveis === 1 ? 'responsável' : 'responsáveis'}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5 text-slate-400" />
              {membros} {membros === 1 ? 'membro' : 'membros'}
            </span>
          </div>

          {/* Resumo do acesso, em leitura. Quem configura faz isso na aba própria. */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 px-2 pt-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <LayoutGrid className="size-3 text-slate-400" />
              {equipe.paginasPermitidas.length > 0 ? (
                <span className="text-slate-600">
                  {equipe.paginasPermitidas.length}{' '}
                  {equipe.paginasPermitidas.length === 1 ? 'quadro' : 'quadros'}
                </span>
              ) : (
                <span className="text-amber-600">nenhum quadro</span>
              )}
            </span>

            {(equipe.visoesLiberadas ?? []).length > 0 && (
              <span className="flex items-center gap-1.5" title="Abas de dado sensível liberadas">
                <Lock className="size-3 text-amber-500" />
                {equipe.visoesLiberadas!.length} sensível
                {equipe.visoesLiberadas!.length > 1 ? 'is' : ''}
              </span>
            )}

            {areaAtendida && (
              <span className="flex items-center gap-1.5">
                <Star className="size-3 text-slate-400" />
                atende <span className="text-slate-600">{areaAtendida.label}</span>
              </span>
            )}

            {(equipe.colunasOcultas ?? []).length > 0 && (
              <span className="text-slate-400">
                {equipe.colunasOcultas!.length} coluna
                {equipe.colunasOcultas!.length > 1 ? 's ocultas' : ' oculta'}
              </span>
            )}
          </div>
        </div>

        <Tabs<AbaId> abas={abas} ativa={aba} onChange={setAba} />
      </div>

      {aba === 'pessoas' ? (
        <>
          {podeGerenciar && (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <LinkDaEquipe equipe={equipe} />
            </div>
          )}
          <MembrosTable equipe={equipe} podeGerenciar={podeGerenciar} />
        </>
      ) : (
        <ConfiguracaoEquipe equipe={equipe} />
      )}
    </div>
  );
}
