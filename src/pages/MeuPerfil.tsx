import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AtSign, Camera, Check, Clock, Copy, IdCard, Mail, ShieldCheck, Trash2, Users, X,
} from 'lucide-react';
import { Header } from '../components/Header';
import { Avatar } from '../components/usuarios/Avatar';
import { EditableCell } from '../components/ui/EditableCell';
import { useDados } from '../context/DadosProvider';
import { equipesDoUsuario, getPapelNaEquipe } from '../utils/equipes';
import { podeEditarProprioCadastro, rotuloDeNivel, SITUACAO_LABEL } from '../utils/permissoes';
import { mensagemErroIdentidade, validarEmail } from '../utils/identidade';
import { linkDaConfirmacao, trocaPendenteDe, VALIDADE_HORAS_EMAIL } from '../utils/trocaEmail';
import { mensagemErroFoto, processarFoto } from '../utils/foto';
import { formatDate } from '../utils/dates';

/** Campos que a própria pessoa mantém. O e-mail fica fora: muda por confirmação. */
const CAMPOS: {
  campo: 'cargo' | 'telefone' | 'local' | 'nascimento';
  label: string;
  placeholder?: string;
  tipo?: 'text' | 'date';
}[] = [
  { campo: 'cargo', label: 'Cargo', placeholder: 'Seu cargo' },
  { campo: 'telefone', label: 'Telefone', placeholder: '(00) 00000-0000' },
  { campo: 'local', label: 'Local', placeholder: 'Cidade, UF' },
  { campo: 'nascimento', label: 'Nascimento', tipo: 'date' },
];

/**
 * Cadastro que cada pessoa mantém de si mesma.
 *
 * Quem sabe o telefone e a cidade atual é a própria pessoa — centralizar isso na administração
 * garante que o dado envelheça.
 */
export function MeuPerfil() {
  const {
    usuarios, equipes, dominios, sessao, trocasEmail, atualizarProprioCadastro, definirFoto,
    solicitarTrocaEmail, cancelarTrocaEmail,
  } = useDados();

  const [novoEmail, setNovoEmail] = useState('');
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const inputFoto = useRef<HTMLInputElement>(null);

  const eu = sessao.usuario;
  const editavel = podeEditarProprioCadastro(sessao, eu);
  const minhasEquipes = equipesDoUsuario(equipes, eu?.id ?? '');
  const pendente = trocaPendenteDe(trocasEmail, eu?.id ?? '');

  const erroEmail = novoEmail.trim()
    ? (() => {
        const erro = validarEmail(novoEmail, { usuarios, dominios, ignorarId: eu?.id });
        return erro ? mensagemErroIdentidade(erro, dominios) : null;
      })()
    : null;

  async function escolherFoto(arquivo: File | undefined) {
    if (!arquivo || !eu) return;
    setErroFoto(null);
    const resultado = await processarFoto(arquivo);
    if ('erro' in resultado) {
      setErroFoto(mensagemErroFoto(resultado.erro));
      return;
    }
    definirFoto(eu.id, resultado.dataUrl);
  }

  async function copiarLink() {
    if (!pendente) return;
    try {
      await navigator.clipboard.writeText(linkDaConfirmacao(pendente));
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Sem área de transferência — o link segue visível na tela.
    }
  }

  if (!eu) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header
        title="Meu perfil"
        subtitle="Seus dados de cadastro, foto e e-mail de acesso."
        hints={[
          { icon: IdCard, text: 'Mantenha telefone e local atualizados' },
          { icon: Mail, text: 'Trocar o e-mail de acesso exige confirmação' },
          { icon: ShieldCheck, text: 'Perfil e equipes são definidos pela administração' },
        ]}
      />

      <main className="flex-1 overflow-auto bg-[#f4f6fa] p-6 custom-scrollbar">
        <div className="mx-auto max-w-3xl space-y-4">
          {/* Identificação */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-16 bg-gradient-to-r from-[#111a3a] via-[#233163] to-[#111a3a]" />

            <div className="px-5 pb-5">
              <div className="-mt-10 flex items-end gap-4">
                <div className="relative">
                  <span className="block rounded-full ring-4 ring-white">
                    <Avatar usuario={eu} size="xl" />
                  </span>

                  {editavel && (
                    <button
                      type="button"
                      onClick={() => inputFoto.current?.click()}
                      aria-label="Alterar foto"
                      title="Alterar foto"
                      className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md transition hover:bg-indigo-700"
                    >
                      <Camera className="size-4" />
                    </button>
                  )}

                  <input
                    ref={inputFoto}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => escolherFoto(e.target.files?.[0])}
                    className="hidden"
                  />
                </div>

                <div className="min-w-0 flex-1 pb-1">
                  {editavel ? (
                    <EditableCell
                      value={eu.nome}
                      onCommit={(valor) => valor.trim() && atualizarProprioCadastro('nome', valor.trim())}
                      align="left"
                      className="font-display text-xl font-bold text-slate-900"
                    />
                  ) : (
                    <p className="px-2 font-display text-xl font-bold text-slate-900">{eu.nome}</p>
                  )}
                  <p className="px-2 text-xs text-slate-500">
                    {rotuloDeNivel(eu)} · {SITUACAO_LABEL[eu.situacao]}
                  </p>
                </div>

                {eu.fotoUrl && editavel && (
                  <button
                    type="button"
                    onClick={() => definirFoto(eu.id, null)}
                    className="mb-1 flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="size-3.5" />
                    Remover foto
                  </button>
                )}
              </div>

              {erroFoto && <p className="mt-2 text-[11px] text-rose-600">{erroFoto}</p>}
              <p className="mt-2 text-[11px] text-slate-400">
                JPG, PNG ou WebP de até 5 MB. A imagem é recortada em quadrado e reduzida a 256 px.
              </p>
            </div>
          </div>

          {/* Dados de cadastro */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
              <IdCard className="size-4 text-slate-400" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Meus dados
              </p>
            </div>

            <div className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-2">
              {CAMPOS.map((item) => (
                <div key={item.campo}>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {item.label}
                  </p>
                  {editavel ? (
                    <EditableCell
                      value={eu[item.campo]}
                      onCommit={(valor) => atualizarProprioCadastro(item.campo, valor)}
                      type={item.tipo}
                      display={item.tipo === 'date' ? formatDate : undefined}
                      placeholder={item.placeholder}
                      align="left"
                      className="text-sm text-slate-700"
                    />
                  ) : (
                    <p className="px-2 py-1 text-sm text-slate-700">{eu[item.campo] || '—'}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* E-mail de acesso */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
              <AtSign className="size-4 text-slate-400" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                E-mail de acesso
              </p>
            </div>

            <div className="p-4">
              <p className="flex items-center gap-2 text-sm text-slate-700">
                <Mail className="size-4 text-slate-400" />
                {eu.email}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                É por ele que você entra na plataforma. Trocar exige confirmação no endereço novo —
                senão bastaria digitar o e-mail de outra pessoa para assumir o acesso dela.
              </p>

              {pendente ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                    <Clock className="size-3.5" />
                    Aguardando confirmação em {pendente.novoEmail}
                  </p>
                  <p className="mt-1 text-[11px] text-amber-800">
                    O link vale por {VALIDADE_HORAS_EMAIL}h. A troca só acontece depois que ele for
                    aberto.
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <code className="min-w-0 flex-1 truncate rounded-lg bg-white/70 px-2 py-1.5 text-[10px] text-slate-600">
                      {linkDaConfirmacao(pendente)}
                    </code>
                    <button
                      type="button"
                      onClick={copiarLink}
                      className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      {copiado ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                      {copiado ? 'Copiado' : 'Copiar link'}
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelarTrocaEmail(pendente.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <X className="size-3.5" />
                      Cancelar
                    </button>
                  </div>

                  <p className="mt-2 text-[10px] text-amber-700">
                    Sem servidor de e-mail, o link aparece aqui. Em produção, ele é enviado ao
                    endereço novo.
                  </p>
                </div>
              ) : (
                editavel && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5">
                      <AtSign className="size-3.5 shrink-0 text-slate-400" />
                      <input
                        type="email"
                        value={novoEmail}
                        onChange={(e) => setNovoEmail(e.target.value)}
                        placeholder="novo.email@viu.com.br"
                        className="w-60 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                      />
                    </div>

                    <motion.button
                      type="button"
                      onClick={() => {
                        if (solicitarTrocaEmail(novoEmail)) setNovoEmail('');
                      }}
                      disabled={!novoEmail.trim() || Boolean(erroEmail)}
                      whileTap={{ scale: 0.97 }}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200"
                    >
                      Solicitar troca
                    </motion.button>

                    {erroEmail && <p className="w-full text-[11px] text-rose-600">{erroEmail}</p>}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Minhas equipes */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
              <Users className="size-4 text-slate-400" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Minhas equipes
              </p>
            </div>

            <div className="p-4">
              {minhasEquipes.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Você ainda não faz parte de nenhuma equipe. Peça acesso a um administrador.
                </p>
              ) : (
                <div className="space-y-2">
                  {minhasEquipes.map((equipe) => (
                    <p key={equipe.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="size-1.5 rounded-full bg-indigo-400" />
                      <span className="flex-1">{equipe.nome}</span>
                      <span className="text-[11px] text-slate-400">
                        {getPapelNaEquipe(equipe, eu.id) === 'responsavel' ? 'responsável' : 'membro'}
                      </span>
                    </p>
                  ))}
                </div>
              )}

              <p className="mt-3 text-[11px] text-slate-400">
                Equipes e perfil são definidos pela administração — se algo estiver errado, fale com
                um administrador.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
