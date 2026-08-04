import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Copy, Inbox, Link2, Mail, X } from 'lucide-react';
import { useDados } from '../../context/DadosProvider';
import { horasRestantes, linkDoConvite, statusConvite } from '../../utils/convites';
import { podeDecidirSolicitacao } from '../../utils/permissoes';
import { formatDataCurta } from '../../utils/dates';
import { Avatar } from './Avatar';

/** Pedidos de acesso e convites em aberto, no mesmo lugar. */
export function AbaConvites() {
  const {
    equipes, solicitacoes, convites, sessao, getUsuario, decidirSolicitacao, revogarConvite,
  } = useDados();
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const pendentes = solicitacoes.filter((solicitacao) => solicitacao.status === 'pendente');
  const abertos = convites.filter((convite) => statusConvite(convite) === 'pendente');
  const podeDecidir = podeDecidirSolicitacao(sessao);

  async function copiar(id: string, link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopiadoId(id);
      window.setTimeout(() => setCopiadoId(null), 1800);
    } catch {
      // Sem permissão de área de transferência — o link segue visível.
    }
  }

  return (
    <div className="space-y-4">
      {/* Explicação: sem ela, os dois blocos parecem a mesma coisa. */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Como as pessoas entram na plataforma
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Mail className="size-3.5 text-indigo-500" />
              Convite — de dentro para fora
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Você (ou o responsável) emite um link para o e-mail de alguém, na página{' '}
              <strong className="font-semibold text-slate-600">Equipes</strong>. O link vale 24h,
              serve uma vez só e funciona apenas para o e-mail convidado. Aqui você acompanha os que
              ainda não foram usados, copia o link de novo ou revoga.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Inbox className="size-3.5 text-amber-600" />
              Pedido — de fora para dentro
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Quem já tem conta, mas não participa de uma equipe, pede acesso a ela pela própria
              página de Equipes. O pedido aparece aqui; aprovar já coloca a pessoa na equipe como
              membro.
            </p>
          </div>
        </div>
      </div>

      {/* Pedidos de acesso */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
          <Inbox className="size-4 text-amber-600" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Pedidos de acesso {pendentes.length > 0 && `(${pendentes.length})`}
          </p>
        </div>

        {pendentes.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Nenhum pedido pendente.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendentes.map((solicitacao) => {
              const solicitante = getUsuario(solicitacao.solicitanteId);
              const equipe = equipes.find((item) => item.id === solicitacao.equipeId);
              if (!solicitante) return null;

              return (
                <div key={solicitacao.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <Avatar usuario={solicitante} />
                  <span className="min-w-0 flex-1 text-xs text-slate-600">
                    <strong className="font-semibold text-slate-800">{solicitante.nome}</strong>
                    {' pede acesso à equipe '}
                    <strong className="font-semibold text-slate-800">{equipe?.nome ?? '—'}</strong>
                    {solicitacao.justificativa && (
                      <span className="block text-[11px] text-slate-500">“{solicitacao.justificativa}”</span>
                    )}
                  </span>

                  <span className="text-[11px] text-slate-400">{formatDataCurta(solicitacao.criadaEm)}</span>

                  {podeDecidir && (
                    <div className="flex items-center gap-1.5">
                      <motion.button
                        type="button"
                        onClick={() => decidirSolicitacao(solicitacao.id, true)}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.96 }}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600"
                      >
                        <Check className="size-3.5" />
                        Aprovar
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => decidirSolicitacao(solicitacao.id, false)}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.96 }}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      >
                        <X className="size-3.5" />
                        Recusar
                      </motion.button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Convites em aberto */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
          <Mail className="size-4 text-indigo-500" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Convites em aberto {abertos.length > 0 && `(${abertos.length})`}
          </p>
        </div>

        {abertos.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            Nenhum convite pendente. Convites são emitidos na página Equipes.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {abertos.map((convite) => {
              const equipe = equipes.find((item) => item.id === convite.equipeId);
              const link = linkDoConvite(convite);

              return (
                <div key={convite.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
                    <Link2 className="size-3.5" />
                  </span>

                  <span className="min-w-0 flex-1 text-xs text-slate-600">
                    <strong className="font-semibold text-slate-800">{convite.email}</strong>
                    {' · '}
                    {equipe?.nome ?? '—'}
                    {' · '}
                    {convite.papel === 'responsavel' ? 'Responsável' : 'Membro'}
                    <span className="block text-[11px] text-slate-400">
                      expira em {horasRestantes(convite)}h · uso único
                    </span>
                  </span>

                  <motion.button
                    type="button"
                    onClick={() => copiar(convite.id, link)}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    {copiadoId === convite.id ? (
                      <Check className="size-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    {copiadoId === convite.id ? 'Copiado' : 'Copiar link'}
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => revogarConvite(convite.id)}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  >
                    <X className="size-3.5" />
                    Revogar
                  </motion.button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
