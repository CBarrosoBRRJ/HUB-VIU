import { useState } from 'react';
import { motion } from 'motion/react';
import { AtSign, KeyRound, RotateCcw, X } from 'lucide-react';
import { useDados } from '../../context/DadosProvider';
import { ehDono, podeGerenciarDominios, podeGerenciarEmailsDeAcesso } from '../../utils/permissoes';
import { useDialogo } from '../ui/Dialogo';

/** Configurações de identidade da plataforma: domínios e e-mails de acesso do dono. */
export function AbaConfiguracoes() {
  const {
    dominios, sessao, adicionarDominio, removerDominio, adicionarEmailAlternativo,
    removerEmailAlternativo, recomecarDoZero,
  } = useDados();
  const { confirmar } = useDialogo();

  const [novoDominio, setNovoDominio] = useState('');
  const [novoEmail, setNovoEmail] = useState('');

  const podeMexerEmDominios = podeGerenciarDominios(sessao);
  const dono = podeGerenciarEmailsDeAcesso(sessao, sessao.usuario) ? sessao.usuario : null;

  return (
    <div className="space-y-4">
      {/* Domínios */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
          <AtSign className="size-4 text-slate-400" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Domínios de e-mail autorizados
          </p>
        </div>

        <div className="p-4">
          <p className="mb-3 text-xs text-slate-500">
            Só é possível cadastrar ou convidar e-mails destes domínios. É a primeira barreira
            contra entrada de gente de fora.
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            {dominios.map((dominio) => (
              <span
                key={dominio}
                className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                @{dominio}
                {podeMexerEmDominios && dominios.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removerDominio(dominio)}
                    aria-label={`Remover domínio ${dominio}`}
                    className="rounded-full p-0.5 text-slate-400 transition hover:bg-white hover:text-rose-600"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </span>
            ))}
          </div>

          {podeMexerEmDominios && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5">
                <AtSign className="size-3.5 shrink-0 text-slate-400" />
                <input
                  value={novoDominio}
                  onChange={(e) => setNovoDominio(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    adicionarDominio(novoDominio);
                    setNovoDominio('');
                  }}
                  placeholder="novodominio.com.br"
                  className="w-52 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>

              <motion.button
                type="button"
                onClick={() => {
                  adicionarDominio(novoDominio);
                  setNovoDominio('');
                }}
                disabled={!novoDominio.trim()}
                whileTap={{ scale: 0.97 }}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200"
              >
                Adicionar domínio
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* E-mails de acesso do dono */}
      {dono && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
            <KeyRound className="size-4 text-slate-400" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Meus e-mails de acesso
            </p>
          </div>

          <div className="p-4">
            <p className="mb-3 text-xs text-slate-500">
              Como dono do sistema, você é a única identidade que entra por mais de um e-mail e fora
              dos domínios corporativos. É a rota alternativa caso o domínio principal fique
              indisponível.
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 ring-1 ring-violet-200">
                {dono.email}
                <span className="text-rotulo uppercase tracking-wider text-violet-400">principal</span>
              </span>

              {(dono.emailsAlternativos ?? []).map((email) => (
                <span
                  key={email}
                  className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => removerEmailAlternativo(dono.id, email)}
                    aria-label={`Remover ${email}`}
                    className="rounded-full p-0.5 text-slate-400 transition hover:bg-white hover:text-rose-600"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5">
                <AtSign className="size-3.5 shrink-0 text-slate-400" />
                <input
                  type="email"
                  value={novoEmail}
                  onChange={(e) => setNovoEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    adicionarEmailAlternativo(dono.id, novoEmail);
                    setNovoEmail('');
                  }}
                  placeholder="outro.email@exemplo.com"
                  className="w-60 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>

              <motion.button
                type="button"
                onClick={() => {
                  adicionarEmailAlternativo(dono.id, novoEmail);
                  setNovoEmail('');
                }}
                disabled={!novoEmail.trim()}
                whileTap={{ scale: 0.97 }}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200"
              >
                Adicionar e-mail
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* Dados de demonstração — só o dono, e só enquanto não há banco */}
      {ehDono(sessao.usuario) && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
            <RotateCcw className="size-4 text-slate-400" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Dados de demonstração
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="max-w-xl text-xs leading-relaxed text-slate-500">
              O que você cadastra fica salvo <strong className="font-semibold text-slate-600">neste
              navegador</strong> — recarregar a página não perde nada. Ainda não é o banco de dados:
              cada pessoa que abrir o sistema vê a própria cópia, e limpar os dados do navegador
              apaga tudo.
            </p>

            <motion.button
              type="button"
              onClick={async () => {
                const ok = await confirmar({
                  titulo: 'Apagar tudo e voltar ao exemplo inicial?',
                  descricao:
                    'Serve para reapresentar a demonstração do começo.\n'
                    // Nem o Ctrl+Z alcança: ele guarda passos da sessão, e esta ação recarrega a página.
                    + 'Isto apaga o que está salvo no navegador, e não tem desfazer.',
                  rotuloConfirmar: 'Apagar tudo',
                  destrutivo: true,
                  icone: 'alerta',
                });
                if (ok) recomecarDoZero();
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
            >
              <RotateCcw className="size-3.5" />
              Recomeçar do zero
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
