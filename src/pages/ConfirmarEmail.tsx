import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Check, Mail } from 'lucide-react';
import { useDados } from '../context/DadosProvider';
import { mensagemErroTroca } from '../utils/trocaEmail';

/** Página aberta pelo link de confirmação de troca de e-mail. */
export function ConfirmarEmail({ token, onConcluir }: { token: string; onConcluir: () => void }) {
  const { getTrocaPorToken, confirmarTrocaEmail, getUsuario } = useDados();
  const [resultado, setResultado] = useState<{ ok: boolean; mensagem: string } | null>(null);

  const troca = getTrocaPorToken(token);
  const pessoa = troca ? getUsuario(troca.usuarioId) : undefined;

  // A confirmação acontece ao abrir o link — é esse o gesto que prova o acesso à caixa nova.
  useEffect(() => {
    const erro = confirmarTrocaEmail(token);
    setResultado(
      erro
        ? { ok: false, mensagem: mensagemErroTroca(erro) }
        : { ok: true, mensagem: 'E-mail de acesso atualizado.' },
    );
    // Rodar uma vez por token: reexecutar cairia no erro "já confirmada".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6fa] p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="h-16 bg-gradient-to-r from-[#111a3a] via-[#233163] to-[#111a3a]" />

        <div className="px-6 pb-6">
          <div className="-mt-8 mb-4 flex size-16 items-center justify-center rounded-2xl bg-white ring-4 ring-white">
            <span
              className={`flex size-16 items-center justify-center rounded-2xl ${
                resultado?.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}
            >
              {resultado?.ok ? <Check className="size-7" /> : <Mail className="size-7" />}
            </span>
          </div>

          <p className="font-display text-lg font-bold text-slate-900">
            {resultado?.ok ? 'Tudo certo' : 'Confirmação de e-mail'}
          </p>

          {resultado?.ok ? (
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              {pessoa ? `${pessoa.nome} agora entra com ` : 'A conta agora entra com '}
              <strong className="font-semibold text-slate-700">{troca?.novoEmail}</strong>.
            </p>
          ) : (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <p className="text-xs leading-relaxed text-amber-800">{resultado?.mensagem}</p>
            </div>
          )}

          <button
            type="button"
            onClick={onConcluir}
            className="mt-5 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Ir para a plataforma
          </button>
        </div>
      </motion.div>
    </div>
  );
}
