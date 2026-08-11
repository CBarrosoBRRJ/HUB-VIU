import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Copy, Check, Crown, Mail, Users } from 'lucide-react';
import { Equipe, PapelEquipe } from '../../types';
import { useDados } from '../../context/DadosProvider';
import { podeConvidarComoResponsavel } from '../../utils/permissoes';
import { mensagemErroIdentidade, normalizarEmail, validarEmail } from '../../utils/identidade';
import { convitePendenteExistente, linkDoConvite, VALIDADE_HORAS } from '../../utils/convites';
import { getPapelNaEquipe } from '../../utils/equipes';
import { Floating } from '../ui/Floating';
import { enviarEmail, envioEhManual } from '../../services/email';

/** Emissão de convite para uma equipe: e-mail + papel, com validação de identidade. */
export function ConvidarPessoa({ equipe }: { equipe: Equipe }) {
  const { usuarios, convites, dominios, sessao, emitirConvite } = useDados();
  const [aberto, setAberto] = useState(false);
  const [email, setEmail] = useState('');
  const [papel, setPapel] = useState<PapelEquipe>('membro');
  const [linkGerado, setLinkGerado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);

  const podeNomearResponsavel = podeConvidarComoResponsavel(sessao);

  useEffect(() => {
    if (!aberto) return;
    function handleClickOutside(event: MouseEvent) {
      const alvo = event.target as Node;
      if (botaoRef.current?.contains(alvo) || painelRef.current?.contains(alvo)) return;
      setAberto(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [aberto]);

  useEffect(() => {
    if (!aberto) {
      setEmail('');
      setPapel('membro');
      setLinkGerado(null);
      setCopiado(false);
    }
  }, [aberto]);

  /**
   * Validação em camadas: formato e domínio sempre; duplicidade só barra quem **já está
   * nesta equipe** ou já tem convite pendente — pessoa existente pode ser convidada para
   * outra equipe, e o aceite apenas cria o vínculo.
   */
  const erro = useMemo(() => {
    if (!email.trim()) return null;

    const base = validarEmail(email, { usuarios: [], dominios });
    if (base) return mensagemErroIdentidade(base, dominios);

    const alvo = normalizarEmail(email);
    const existente = usuarios.find((usuario) => normalizarEmail(usuario.email) === alvo);
    if (existente && getPapelNaEquipe(equipe, existente.id)) {
      return 'Esta pessoa já faz parte da equipe.';
    }
    if (convitePendenteExistente(convites, alvo, equipe.id)) {
      return 'Já existe um convite pendente para este e-mail nesta equipe.';
    }
    return null;
  }, [email, usuarios, convites, dominios, equipe]);

  const podeEnviar = email.trim().length > 0 && !erro;

  function enviar() {
    if (!podeEnviar) return;
    const convite = emitirConvite(email, equipe.id, papel);
    setLinkGerado(linkDoConvite(convite));
  }

  /** O transporte fica em `services/email` — trocar `mailto` por API não toca nesta tela. */
  function enviarPorEmail() {
    if (!linkGerado) return;
    enviarEmail({
      para: normalizarEmail(email),
      assunto: `Convite para a equipe ${equipe.nome} — VIU Agenciamento`,
      corpo: [
        `Você foi convidado para a equipe ${equipe.nome} na plataforma VIU Agenciamento.`,
        '',
        'Acesse:',
        linkGerado,
        '',
        `O link vale ${VALIDADE_HORAS} horas, serve uma única vez e funciona apenas para este e-mail.`,
      ].join('\n'),
    });
  }

  async function copiar() {
    if (!linkGerado) return;
    try {
      await navigator.clipboard.writeText(linkGerado);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Sem permissão de área de transferência — o link segue visível para cópia manual.
    }
  }

  return (
    <>
      <motion.button
        ref={botaoRef}
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
      >
        <Mail className="size-3.5" />
        Convidar
      </motion.button>

      <AnimatePresence>
        {aberto && (
          <Floating anchorRef={botaoRef} width={320} height={300} align="start">
            <motion.div
              ref={painelRef}
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
            >
              {linkGerado ? (
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                    <Check className="size-3.5" />
                    Convite criado
                  </p>
                  <p className="mt-1 text-apoio leading-snug text-slate-500">
                    Envie este link para <strong className="text-slate-700">{normalizarEmail(email)}</strong>.
                    Ele vale por {VALIDADE_HORAS} horas, serve uma única vez e só funciona para esse e-mail.
                  </p>

                  <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-slate-50 p-2">
                    <code className="min-w-0 flex-1 truncate text-rotulo text-slate-600">{linkGerado}</code>
                    <motion.button
                      type="button"
                      onClick={copiar}
                      whileHover={{ scale: 1.12 }}
                      whileTap={{ scale: 0.9 }}
                      aria-label="Copiar link"
                      className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-white hover:text-slate-600"
                    >
                      {copiado ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    </motion.button>
                  </div>

                  <motion.button
                    type="button"
                    onClick={enviarPorEmail}
                    whileTap={{ scale: 0.98 }}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
                  >
                    <Mail className="size-3.5" />
                    Enviar por e-mail
                  </motion.button>

                  {envioEhManual && (
                    <p className="mt-1.5 text-rotulo leading-snug text-slate-500">
                      Abre seu cliente de e-mail com a mensagem pronta. O envio automático pela
                      plataforma entra junto com o backend.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setLinkGerado(null);
                      setEmail('');
                    }}
                    className="mt-2 w-full rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Convidar outra pessoa
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-rotulo font-bold uppercase tracking-wider text-slate-500">
                    Convidar para {equipe.nome}
                  </p>

                  <input
                    autoFocus
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && enviar()}
                    placeholder="pessoa@g.globo"
                    className="mt-2 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />

                  {erro && <p className="mt-1.5 text-apoio text-rose-600">{erro}</p>}

                  <p className="mt-3 text-rotulo font-bold uppercase tracking-wider text-slate-500">
                    Entra como
                  </p>
                  <div className="mt-1.5 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPapel('membro')}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-apoio font-semibold transition ${
                        papel === 'membro' ? 'bg-slate-500 text-white' : 'bg-slate-50 text-slate-500'
                      }`}
                    >
                      <Users className="size-3" />
                      Membro
                    </button>

                    <button
                      type="button"
                      disabled={!podeNomearResponsavel}
                      onClick={() => setPapel('responsavel')}
                      title={
                        podeNomearResponsavel
                          ? undefined
                          : 'Somente o Admin do Sistema nomeia responsáveis'
                      }
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-apoio font-semibold transition ${
                        papel === 'responsavel' ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-500'
                      } ${podeNomearResponsavel ? '' : 'cursor-not-allowed opacity-50'}`}
                    >
                      <Crown className="size-3" />
                      Responsável
                    </button>
                  </div>

                  <motion.button
                    type="button"
                    onClick={enviar}
                    disabled={!podeEnviar}
                    whileTap={podeEnviar ? { scale: 0.98 } : undefined}
                    className="mt-3 w-full rounded-lg bg-indigo-600 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200"
                  >
                    Gerar link de convite
                  </motion.button>
                </div>
              )}
            </motion.div>
          </Floating>
        )}
      </AnimatePresence>
    </>
  );
}
