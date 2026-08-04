import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Plus, Search, Trash2, UserPlus } from 'lucide-react';
import { Equipe, PapelEquipe, SituacaoUsuario, Usuario } from '../../types';
import { useDados } from '../../context/DadosProvider';
import { getMembro, getPapelNaEquipe } from '../../utils/equipes';
import { analisarSaidaDaEquipe, mensagemSaida } from '../../utils/saida';
import { podeDefinirSituacao } from '../../utils/permissoes';
import { formatDate, todayISO } from '../../utils/dates';
import { mensagemErroIdentidade, validarEmail } from '../../utils/identidade';
import { EditableCell } from '../ui/EditableCell';
import { Floating } from '../ui/Floating';
import { Avatar } from '../usuarios/Avatar';
import { PapelSelect, PAPEL_STYLE } from './PapelSelect';
import { SituacaoSelect } from '../usuarios/SituacaoSelect';
import { ConvidarPessoa } from './ConvidarPessoa';

/**
 * Campos editáveis na grade — perfil e situação só mudam na página de Usuários.
 *
 * `fotoUrl` também fica de fora: a foto se troca em Meu Perfil, não se digita numa célula. Sem
 * excluí-la, o tipo admitiria um campo opcional onde a grade só sabe editar texto obrigatório.
 */
type CampoUsuario = keyof Omit<
  Usuario,
  'id' | 'perfil' | 'situacao' | 'ehDono' | 'emailsAlternativos' | 'fotoUrl'
>;

const COLUNAS: { campo?: CampoUsuario; label: string; className: string; align: 'left' | 'center' }[] = [
  { campo: 'nome', label: 'Nome', className: 'w-[16%]', align: 'left' },
  { campo: 'email', label: 'Contato', className: 'w-[17%]', align: 'center' },
  { campo: 'cargo', label: 'Cargo', className: 'w-[12%]', align: 'center' },
  { campo: 'telefone', label: 'Telefone', className: 'w-[12%]', align: 'center' },
  { campo: 'local', label: 'Local', className: 'w-[11%]', align: 'center' },
  { campo: 'nascimento', label: 'Nascimento', className: 'w-[9%]', align: 'center' },
  { label: 'Papel', className: 'w-[11%]', align: 'center' },
  { label: 'Situação', className: 'w-[11%]', align: 'center' },
  { label: 'Ações', className: 'w-[5%]', align: 'center' },
];

const RASCUNHO_VAZIO = {
  nome: '',
  email: '',
  cargo: '',
  telefone: '',
  local: '',
  nascimento: '',
  papel: 'membro' as PapelEquipe,
};

/** Situações que a gestão de equipe pode aplicar; `desligado` é privativo do admin. */
const SITUACOES: SituacaoUsuario[] = ['ativo', 'ferias', 'afastado', 'inativo', 'desligado'];

/** Normaliza para busca tolerante a acento e caixa. */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

interface MembrosTableProps {
  equipe: Equipe;
  /** Sem gestão, a tabela vira somente leitura. */
  podeGerenciar: boolean;
}

export function MembrosTable({ equipe, podeGerenciar }: MembrosTableProps) {
  const {
    usuarios, dominios, equipes, contratos, getUsuario, criarUsuario, atualizarUsuario,
    definirMembroDaEquipe, removerMembroDaEquipe, definirSituacao, sessao,
  } = useDados();

  const [rascunho, setRascunho] = useState(RASCUNHO_VAZIO);
  const [busca, setBusca] = useState('');
  const [buscaExistente, setBuscaExistente] = useState('');
  const [painelAberto, setPainelAberto] = useState(false);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!painelAberto) return;
    function handleClickOutside(event: MouseEvent) {
      const alvo = event.target as Node;
      if (botaoRef.current?.contains(alvo) || painelRef.current?.contains(alvo)) return;
      setPainelAberto(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [painelAberto]);

  const membros = useMemo(() => {
    const termo = normalizar(busca.trim());
    return equipe.membros
      .map((membro) => ({ membro, usuario: getUsuario(membro.usuarioId) }))
      .filter((linha): linha is { membro: typeof linha.membro; usuario: Usuario } => Boolean(linha.usuario))
      .filter(({ usuario }) =>
        !termo || normalizar(usuario.nome).includes(termo) || normalizar(usuario.email).includes(termo),
      );
  }, [equipe.membros, getUsuario, busca]);

  /** Quem ainda não faz parte desta equipe. */
  const disponiveis = useMemo(() => {
    const termo = normalizar(buscaExistente.trim());
    return usuarios
      .filter((usuario) => !getPapelNaEquipe(equipe, usuario.id))
      .filter(
        (usuario) =>
          !termo || normalizar(usuario.nome).includes(termo) || normalizar(usuario.email).includes(termo),
      );
  }, [usuarios, equipe, buscaExistente]);

  /** Mesma validação do convite: formato, domínio autorizado e e-mail ainda não usado. */
  const erroEmail = useMemo(() => {
    if (!rascunho.email.trim()) return null;
    const erro = validarEmail(rascunho.email, { usuarios, dominios });
    return erro ? mensagemErroIdentidade(erro, dominios) : null;
  }, [rascunho.email, usuarios, dominios]);

  const podeSalvar =
    rascunho.nome.trim().length > 0 && rascunho.email.trim().length > 0 && !erroEmail;

  function salvarNovo() {
    if (!podeSalvar) return;
    const { papel, ...dados } = rascunho;
    const novo = criarUsuario({
      ...dados,
      nome: dados.nome.trim(),
      email: dados.email.trim(),
      cargo: dados.cargo.trim(),
    });
    definirMembroDaEquipe(equipe.id, novo.id, papel);
    setRascunho(RASCUNHO_VAZIO);
  }

  /**
   * Saída da equipe: corta o acesso, preserva o histórico.
   *
   * Quando a pessoa fica sem nenhuma equipe, oferecemos encerrar também a situação dela —
   * senão sobra uma conta ativa sem lugar nenhum, que é acesso órfão.
   */
  function removerDaEquipe(usuario: Usuario) {
    const analise = analisarSaidaDaEquipe(usuario.id, equipe.id, equipes, contratos);
    if (!window.confirm(mensagemSaida(usuario.nome, equipe.nome, analise))) return;

    removerMembroDaEquipe(equipe.id, usuario.id);

    if (!analise.ficaSemEquipe) return;

    const desligar = window.confirm(
      `${usuario.nome} ficou sem equipe.\n\nOK — marcar como Desligado (saiu da empresa).\nCancelar — marcar como Inativo (sem acesso por ora, reversível).\n\nO histórico é preservado nos dois casos.`,
    );
    definirSituacao(usuario.id, desligar ? 'desligado' : 'inativo');
  }

  /** Promove a responsável, com ou sem prazo. */
  function promover(usuario: Usuario, temporario: boolean) {
    if (!temporario) {
      definirMembroDaEquipe(equipe.id, usuario.id, 'responsavel');
      return;
    }

    const resposta = window.prompt(
      `Por quantos dias ${usuario.nome} responderá pela equipe?\n\nAo fim do prazo, volta a membro automaticamente.`,
      '15',
    );
    const dias = Number(resposta);
    if (!resposta || !Number.isFinite(dias) || dias <= 0) return;

    const ate = new Date();
    ate.setDate(ate.getDate() + dias);
    ate.setHours(23, 59, 59, 999);
    definirMembroDaEquipe(equipe.id, usuario.id, 'responsavel', ate.toISOString());
  }

  const inputClass =
    'w-full rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100';

  /** Sem permissão de gestão, o campo vira texto — nada de input desabilitado. */
  function Campo({
    usuario, campo, placeholder, tipo, formatar, className = '',
  }: {
    usuario: Usuario;
    campo: CampoUsuario;
    placeholder?: string;
    tipo?: 'text' | 'date';
    formatar?: (valor: string) => string;
    className?: string;
  }) {
    const valor = usuario[campo];
    if (!podeGerenciar) {
      const texto = formatar ? formatar(valor) : valor;
      return <div className={`px-2 py-1 text-xs text-slate-600 ${className}`}>{texto || '—'}</div>;
    }
    return (
      <EditableCell
        value={valor}
        onCommit={(novo) => atualizarUsuario(usuario.id, campo, novo)}
        type={tipo}
        display={formatar}
        placeholder={placeholder}
        align={campo === 'nome' ? 'left' : 'center'}
        className={className}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Barra de ações */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="size-1.5 rounded-full bg-slate-300" />
          {membros.length} {membros.length === 1 ? 'pessoa na equipe' : 'pessoas na equipe'}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5">
            <Search className="size-3.5 shrink-0 text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar pessoa…"
              className="w-52 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>

          {podeGerenciar && <ConvidarPessoa equipe={equipe} />}

          {podeGerenciar && (
            <motion.button
              ref={botaoRef}
              type="button"
              onClick={() => setPainelAberto((aberto) => !aberto)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <UserPlus className="size-3.5" />
              Adicionar existente
            </motion.button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {painelAberto && (
          <Floating anchorRef={botaoRef} width={288} height={320} align="start">
            <motion.div
              ref={painelRef}
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            >
              <div className="border-b border-slate-100 p-2">
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <Search className="size-3.5 shrink-0 text-slate-400" />
                  <input
                    autoFocus
                    value={buscaExistente}
                    onChange={(e) => setBuscaExistente(e.target.value)}
                    placeholder="Buscar na base…"
                    className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
                {disponiveis.map((usuario) => (
                  <button
                    key={usuario.id}
                    type="button"
                    onClick={() => {
                      definirMembroDaEquipe(equipe.id, usuario.id, 'membro');
                      setPainelAberto(false);
                      setBuscaExistente('');
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition hover:bg-slate-50"
                  >
                    <Avatar usuario={usuario} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-slate-700">{usuario.nome}</span>
                      <span className="block truncate text-[10px] text-slate-400">{usuario.email}</span>
                    </span>
                    <Plus className="size-3.5 shrink-0 text-slate-300" />
                  </button>
                ))}

                {disponiveis.length === 0 && (
                  <p className="px-3 py-4 text-center text-xs text-slate-400">
                    Todo mundo da base já está nesta equipe.
                  </p>
                )}
              </div>
            </motion.div>
          </Floating>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[1080px] border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70">
              {COLUNAS.map((coluna) => (
                <th
                  key={coluna.label}
                  className={`px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 ${coluna.className} ${
                    coluna.align === 'left' ? 'text-left' : 'text-center'
                  }`}
                >
                  {coluna.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Linha de criação inline — cadastra na base e já vincula à equipe. */}
            <tr className={`border-b-2 border-emerald-300 bg-emerald-50/30 ${podeGerenciar ? '' : 'hidden'}`}>
              <td className="px-3 py-2.5">
                <input
                  value={rascunho.nome}
                  onChange={(e) => setRascunho({ ...rascunho, nome: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && salvarNovo()}
                  placeholder="+ Nome... (Enter)"
                  className={inputClass}
                />
              </td>
              <td className="px-3 py-2.5">
                <input
                  type="email"
                  value={rascunho.email}
                  onChange={(e) => setRascunho({ ...rascunho, email: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && salvarNovo()}
                  placeholder={`email@${dominios[0] ?? 'viu.com.br'}`}
                  title={erroEmail ?? undefined}
                  className={`${inputClass} text-center ${
                    erroEmail ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : ''
                  }`}
                />
                {erroEmail && <p className="mt-1 text-[10px] leading-snug text-rose-600">{erroEmail}</p>}
              </td>
              <td className="px-3 py-2.5">
                <input
                  value={rascunho.cargo}
                  onChange={(e) => setRascunho({ ...rascunho, cargo: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && salvarNovo()}
                  placeholder="Cargo"
                  className={`${inputClass} text-center`}
                />
              </td>
              <td className="px-3 py-2.5">
                <input
                  value={rascunho.telefone}
                  onChange={(e) => setRascunho({ ...rascunho, telefone: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && salvarNovo()}
                  placeholder="(00) 00000-0000"
                  className={`${inputClass} text-center`}
                />
              </td>
              <td className="px-3 py-2.5">
                <input
                  value={rascunho.local}
                  onChange={(e) => setRascunho({ ...rascunho, local: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && salvarNovo()}
                  placeholder="Cidade, UF"
                  className={`${inputClass} text-center`}
                />
              </td>
              <td className="px-3 py-2.5">
                <input
                  type="date"
                  max={todayISO()}
                  value={rascunho.nascimento}
                  onChange={(e) => setRascunho({ ...rascunho, nascimento: e.target.value })}
                  className={inputClass}
                />
              </td>
              <td className="px-3 py-2.5">
                <PapelSelect
                  value={rascunho.papel}
                  onChange={(papel) => setRascunho({ ...rascunho, papel })}
                />
              </td>
              <td className="px-3 py-2.5 text-center">
                <span className="text-[11px] text-slate-400">ativo</span>
              </td>
              <td className="px-3 py-2.5">
                <motion.button
                  type="button"
                  onClick={salvarNovo}
                  disabled={!podeSalvar}
                  whileHover={podeSalvar ? { scale: 1.12, rotate: 90 } : undefined}
                  whileTap={podeSalvar ? { scale: 0.9 } : undefined}
                  transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                  aria-label="Cadastrar pessoa"
                  title={podeSalvar ? 'Cadastrar e adicionar à equipe' : 'Informe ao menos nome e contato'}
                  className={`mx-auto flex size-8 items-center justify-center rounded-lg text-white transition-colors ${
                    podeSalvar ? 'bg-emerald-500 hover:bg-emerald-600' : 'cursor-not-allowed bg-slate-200'
                  }`}
                >
                  <Plus className="size-4" />
                </motion.button>
              </td>
            </tr>

            {/*
              Sem `AnimatePresence` e sem `exit` — PRD 03 §7.5. Envolver as linhas fazia a `<tr>`
              de quem saiu da equipe ficar no DOM até a animação terminar, ocupando a altura toda
              e discordando do contador "N pessoas na equipe" logo acima. A saída de uma linha
              é sumir.
            */}
            {membros.map(({ usuario }) => (
                <motion.tr
                  key={usuario.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="border-b border-slate-100 transition-colors hover:bg-slate-50/70"
                >
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar usuario={usuario} />
                      <Campo
                        usuario={usuario}
                        campo="nome"
                        className="flex-1 text-sm font-semibold text-slate-800"
                      />
                    </div>
                  </td>
                  <td className="px-2 py-2.5">
                    <Campo usuario={usuario} campo="email" placeholder="email@viu.com.br" />
                  </td>
                  <td className="px-2 py-2.5">
                    <Campo usuario={usuario} campo="cargo" placeholder="Cargo" />
                  </td>
                  <td className="px-2 py-2.5">
                    <Campo usuario={usuario} campo="telefone" placeholder="(00) 00000-0000" />
                  </td>
                  <td className="px-2 py-2.5">
                    <Campo usuario={usuario} campo="local" placeholder="Cidade, UF" />
                  </td>
                  <td className="px-2 py-2.5">
                    <Campo usuario={usuario} campo="nascimento" tipo="date" formatar={formatDate} />
                  </td>
                  <td className="px-3 py-2.5">
                    {podeGerenciar ? (
                      <PapelSelect
                        value={getPapelNaEquipe(equipe, usuario.id) ?? 'membro'}
                        prazo={getMembro(equipe, usuario.id)?.responsavelAte}
                        onChange={(papel, temporario) => {
                          if (papel === 'membro') definirMembroDaEquipe(equipe.id, usuario.id, 'membro');
                          else promover(usuario, Boolean(temporario));
                        }}
                      />
                    ) : (
                      <span
                        className={`flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold ring-1 ${
                          PAPEL_STYLE[getPapelNaEquipe(equipe, usuario.id) ?? 'membro'].chip
                        }`}
                      >
                        {PAPEL_STYLE[getPapelNaEquipe(equipe, usuario.id) ?? 'membro'].label}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <SituacaoSelect
                      value={usuario.situacao}
                      disponiveis={SITUACOES.filter((situacao) =>
                        podeDefinirSituacao(sessao, usuario, situacao, equipe),
                      )}
                      onChange={
                        podeGerenciar ? (situacao) => definirSituacao(usuario.id, situacao) : undefined
                      }
                    />
                  </td>

                  <td className="px-3 py-2.5">
                    {podeGerenciar ? (
                      <motion.button
                        type="button"
                        onClick={() => removerDaEquipe(usuario)}
                        whileHover={{ scale: 1.15, x: [0, -1.5, 1.5, 0] }}
                        whileTap={{ scale: 0.9 }}
                        aria-label={`Remover ${usuario.nome} da equipe`}
                        title="Remover da equipe"
                        className="mx-auto flex rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="size-4" />
                      </motion.button>
                    ) : (
                      <span className="mx-auto flex justify-center text-slate-200" title="Sem permissão">
                        <Trash2 className="size-4" />
                      </span>
                    )}
                  </td>
                </motion.tr>
              ))}

            {membros.length === 0 && (
              <tr>
                <td colSpan={COLUNAS.length} className="px-3 py-10 text-center text-sm text-slate-400">
                  {equipe.membros.length === 0
                    ? 'Nenhuma pessoa nesta equipe — cadastre na linha acima ou adicione alguém da base.'
                    : 'Ninguém encontrado com esse termo.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-1.5 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
        <Check className="size-3 text-emerald-500" />
        {podeGerenciar
          ? 'Alterações nos dados são salvas ao sair do campo — clique numa célula para editar.'
          : 'Você participa desta equipe, mas não a administra — os dados estão em modo leitura.'}
      </div>
    </div>
  );
}
