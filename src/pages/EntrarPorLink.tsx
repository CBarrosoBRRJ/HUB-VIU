import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowRight, AtSign, Clock, Users } from 'lucide-react';
import { useDados } from '../context/DadosProvider';
import {
  horasRestantesLink, mensagemErroEntrada, validarEntrada, VALIDADE_HORAS_LINK,
} from '../utils/linkEquipe';
import { mensagemErroIdentidade, validarEmail } from '../utils/identidade';

/**
 * Entrada pelo link coletivo da equipe.
 *
 * Pede o mínimo — nome e e-mail corporativo — porque o objetivo é reduzir burocracia. A
 * segurança vem do link (prazo, rotação, desativação) e da lista de domínios, não de um
 * formulário longo.
 */
export function EntrarPorLink({ token, onConcluir }: { token: string; onConcluir: () => void }) {
  const { getLinkPorToken, equipes, dominios, usuarios, entrarPorLink, getUsuario } = useDados();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const link = getLinkPorToken(token);
  const equipe = equipes.find((item) => item.id === link?.equipeId);
  const quemCriou = link ? getUsuario(link.criadoPorId) : undefined;

  const problema = useMemo(() => {
    const falha = validarEntrada(link, equipe);
    return falha ? mensagemErroEntrada(falha) : null;
  }, [link, equipe]);

  /** Quem já tem conta apenas ganha o vínculo — o domínio dela já foi aprovado antes. */
  const jaTemConta = useMemo(
    () => usuarios.some((usuario) => usuario.email === email.trim().toLowerCase()),
    [usuarios, email],
  );

  const erroEmail = useMemo(() => {
    if (!email.trim() || jaTemConta) return null;
    const falha = validarEmail(email, { usuarios, dominios });
    return falha ? mensagemErroIdentidade(falha, dominios) : null;
  }, [email, usuarios, dominios, jaTemConta]);

  const podeEntrar = email.trim().length > 0 && (jaTemConta || (nome.trim().length > 0 && !erroEmail));

  function entrar() {
    if (!podeEntrar) return;
    const resultado = entrarPorLink(token, nome, email);
    if (resultado) {
      setErro(
        resultado === 'email_invalido'
          ? 'Use um e-mail de um dos domínios autorizados.'
          : mensagemErroEntrada(resultado),
      );
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
              <Users className="size-7" />
            </span>
          </div>

          <p className="font-display text-lg font-bold text-slate-900">VIU Agenciamento</p>

          {problema ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <p className="text-xs leading-relaxed text-amber-800">{problema}</p>
            </div>
          ) : (
            link &&
            equipe && (
              <>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  Você foi convidado a entrar na equipe{' '}
                  <strong className="font-semibold text-slate-700">{equipe.nome}</strong>
                  {quemCriou ? `, por ${quemCriou.nome}` : ''}.
                </p>

                <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-xs">
                  <p className="flex items-center gap-2 text-slate-600">
                    <Users className="size-3.5 text-slate-400" />
                    Você entra como <strong className="font-semibold text-slate-700">Membro</strong>
                  </p>
                  <p className="flex items-center gap-2 text-slate-500">
                    <Clock className="size-3.5 text-slate-400" />
                    Este link expira em {horasRestantesLink(link)}h — validade de {VALIDADE_HORAS_LINK}h
                  </p>
                  <p className="flex items-center gap-2 text-slate-500">
                    <AtSign className="size-3.5 text-slate-400" />
                    Aceita e-mails {dominios.map((dominio) => `@${dominio}`).join(', ')}
                  </p>
                </div>

                <input
                  autoFocus
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErro(null);
                  }}
                  placeholder={`seu.nome@${dominios[0] ?? 'empresa.com'}`}
                  className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />

                {erroEmail && <p className="mt-1.5 text-[11px] text-rose-600">{erroEmail}</p>}

                {jaTemConta ? (
                  <p className="mt-2 text-[11px] text-slate-500">
                    Você já tem conta — vamos apenas adicionar você a esta equipe.
                  </p>
                ) : (
                  <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && entrar()}
                    placeholder="Seu nome completo"
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                )}

                {erro && <p className="mt-2 text-[11px] text-rose-600">{erro}</p>}

                <motion.button
                  type="button"
                  onClick={entrar}
                  disabled={!podeEntrar}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200"
                >
                  Entrar na equipe
                  <ArrowRight className="size-4" />
                </motion.button>

                <p className="mt-2 text-center text-[10px] text-slate-400">
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
