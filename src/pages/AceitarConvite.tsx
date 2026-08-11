import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Building2, Check, Clock, Crown, Users } from 'lucide-react';
import { useDados } from '../context/DadosProvider';
import {
  horasRestantes, mensagemErroAceite, statusConvite, validarAceite, VALIDADE_HORAS,
} from '../utils/convites';
import { normalizarEmail } from '../utils/identidade';

/**
 * Tela do link de convite.
 *
 * Com SSO não há senha: o "login" apenas confirma qual e-mail o provedor devolveu. Aqui esse
 * retorno é simulado por um campo — o restante do fluxo (validação e consumo do token) é o
 * mesmo que valerá com o provedor real.
 */
export function AceitarConvite({ token, onConcluir }: { token: string; onConcluir: () => void }) {
  const { getConvitePorToken, aceitarConvite, equipes, getUsuario } = useDados();
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const convite = getConvitePorToken(token);
  const equipe = equipes.find((item) => item.id === convite?.equipeId);
  const quemConvidou = convite ? getUsuario(convite.criadoPorId) : undefined;

  const problema = useMemo(() => {
    if (!convite) return mensagemErroAceite('inexistente');
    const status = statusConvite(convite);
    if (status !== 'pendente') return mensagemErroAceite(status === 'aceito' ? 'aceito' : status === 'revogado' ? 'revogado' : 'expirado');
    return null;
  }, [convite]);

  function entrar() {
    if (!convite) return;
    const falha = validarAceite(convite, email);
    if (falha) {
      setErro(mensagemErroAceite(falha));
      return;
    }
    const resultado = aceitarConvite(token, email, nome);
    if (resultado) {
      setErro(mensagemErroAceite(resultado));
      return;
    }
    onConcluir();
  }

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
            <span className="flex size-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Building2 className="size-7" />
            </span>
          </div>

          <p className="font-display text-lg font-bold text-slate-900">VIU Agenciamento</p>

          {problema ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <p className="text-xs leading-relaxed text-amber-800">{problema}</p>
            </div>
          ) : (
            convite &&
            equipe && (
              <>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  {quemConvidou?.nome ?? 'Um administrador'} convidou você para a equipe{' '}
                  <strong className="font-semibold text-slate-700">{equipe.nome}</strong>.
                </p>

                <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-xs">
                  <p className="flex items-center gap-2 text-slate-600">
                    {convite.papel === 'responsavel' ? (
                      <Crown className="size-3.5 text-amber-500" />
                    ) : (
                      <Users className="size-3.5 text-slate-400" />
                    )}
                    Entrando como{' '}
                    <strong className="font-semibold text-slate-700">
                      {convite.papel === 'responsavel' ? 'Responsável' : 'Membro'}
                    </strong>
                  </p>
                  <p className="flex items-center gap-2 text-slate-500">
                    <Clock className="size-3.5 text-slate-400" />
                    Expira em {horasRestantes(convite)}h — validade de {VALIDADE_HORAS}h, uso único
                  </p>
                </div>

                <p className="mt-4 text-rotulo font-bold uppercase tracking-wider text-slate-500">
                  Entrar com a conta corporativa
                </p>
                <p className="mt-1 text-apoio leading-snug text-slate-500">
                  O convite foi emitido para <strong className="text-slate-600">{convite.email}</strong>.
                  A autenticação precisa ser feita com essa mesma conta.
                </p>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErro(null);
                  }}
                  placeholder="Seu e-mail corporativo"
                  className="mt-2.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />

                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && entrar()}
                  placeholder="Seu nome completo"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />

                {erro && <p className="mt-2 text-apoio text-rose-600">{erro}</p>}

                <motion.button
                  type="button"
                  onClick={entrar}
                  disabled={!normalizarEmail(email)}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200"
                >
                  <Check className="size-4" />
                  Aceitar convite e entrar
                </motion.button>

                <p className="mt-2 text-center text-rotulo text-slate-500">
                  Simulação do retorno do SSO — no ambiente real, este passo é o login corporativo.
                </p>
              </>
            )
          )}

          <button
            type="button"
            onClick={onConcluir}
            className="mt-4 w-full rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Voltar para a plataforma
          </button>
        </div>
      </motion.div>
    </div>
  );
}
