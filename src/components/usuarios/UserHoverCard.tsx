import { useState } from 'react';
import { Check, Copy, Crown, Globe, Mail, UserMinus, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { Usuario } from '../../types';
import { Papel } from '../../utils/pessoas';
import { Avatar } from './Avatar';

/** Hora corrente em Brasília — o time opera nesse fuso. */
function horaBrasilia(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());
}

interface UserHoverCardProps {
  usuario: Usuario;
  papel: Papel;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  /** Migra a pessoa para o outro papel. */
  onMigrar?: () => void;
  onRemover?: () => void;
}

/** Cartão de perfil — permanece aberto enquanto o ponteiro estiver sobre ele. */
export function UserHoverCard({
  usuario, papel, onMouseEnter, onMouseLeave, onMigrar, onRemover,
}: UserHoverCardProps) {
  const [copiado, setCopiado] = useState(false);
  const isResponsavel = papel === 'responsavel';

  async function copiarEmail() {
    try {
      await navigator.clipboard.writeText(usuario.email);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Sem permissão de área de transferência — o mailto continua disponível.
    }
  }

  return (
    <motion.div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      initial={{ opacity: 0, y: -6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.96 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10"
    >
      <div className="h-14 bg-gradient-to-r from-[#111a3a] via-[#233163] to-[#111a3a]" />

      <div className="px-4 pb-4">
        <div className="-mt-7 flex items-end justify-between">
          <span className="rounded-full ring-4 ring-white">
            <Avatar usuario={usuario} size="lg" />
          </span>
          <span
            className={`mb-1 flex items-center gap-1 rounded-full px-2.5 py-1 text-rotulo font-bold uppercase tracking-wider ${
              isResponsavel ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'
            }`}
          >
            {isResponsavel ? <Crown className="size-3" /> : <Users className="size-3" />}
            {isResponsavel ? 'Responsável' : 'Parceiro'}
          </span>
        </div>

        <p className="mt-2.5 truncate font-display text-base font-bold text-slate-900">{usuario.nome}</p>
        <p className="truncate text-xs text-slate-500">{usuario.cargo}</p>

        <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2">
            <Mail className="size-3.5 shrink-0 text-slate-400" />
            <a
              href={`mailto:${usuario.email}`}
              className="min-w-0 flex-1 truncate text-xs text-slate-600 transition hover:text-indigo-600"
            >
              {usuario.email}
            </a>
            <motion.button
              type="button"
              onClick={copiarEmail}
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Copiar e-mail"
              className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              {copiado ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
            </motion.button>
          </div>

          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Globe className="size-3.5 shrink-0 text-slate-400" />
            {horaBrasilia()} · Brasília
          </p>
        </div>

        {(onMigrar || onRemover) && (
          <div className="mt-3 flex gap-2">
            {onMigrar && (
              <motion.button
                type="button"
                onClick={onMigrar}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
              >
                {isResponsavel ? <Users className="size-3.5" /> : <Crown className="size-3.5" />}
                {isResponsavel ? 'Tornar parceiro' : 'Tornar responsável'}
              </motion.button>
            )}

            {onRemover && (
              <motion.button
                type="button"
                onClick={onRemover}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                aria-label="Remover da linha"
                title="Remover da linha"
                className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
              >
                <UserMinus className="size-3.5" />
              </motion.button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
