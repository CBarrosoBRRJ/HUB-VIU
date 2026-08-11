import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Clock, Copy, Link2, Mail, Power, RefreshCw, Users } from 'lucide-react';
import { Equipe } from '../../types';
import { useDados } from '../../context/DadosProvider';
import {
  horasRestantesLink, linkDeEntrada, mensagemDeCompartilhamento, VALIDADE_HORAS_LINK,
} from '../../utils/linkEquipe';
import { enviarEmail } from '../../services/email';
import { useDialogo } from '../ui/Dialogo';

/**
 * Link coletivo da equipe — visível apenas para quem a administra.
 *
 * Serve ao caso real de "manda no grupo": um endereço só, que qualquer pessoa da empresa usa
 * para entrar como membro.
 */
export function LinkDaEquipe({ equipe }: { equipe: Equipe }) {
  const { dominios, linkDaEquipe, renovarLinkDaEquipe, desativarLinkDaEquipe, getUsuario } = useDados();
  const { confirmar } = useDialogo();
  const [copiado, setCopiado] = useState<'link' | 'mensagem' | null>(null);

  const link = linkDaEquipe(equipe.id);

  // Rotação: sem link vigente (primeiro acesso ou vencido), emite um na hora.
  useEffect(() => {
    if (!link) renovarLinkDaEquipe(equipe.id);
  }, [link, equipe.id, renovarLinkDaEquipe]);

  if (!link) return null;

  const endereco = linkDeEntrada(link);
  const mensagem = mensagemDeCompartilhamento(equipe, link, dominios);

  async function copiar(texto: string, tipo: 'link' | 'mensagem') {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(tipo);
      window.setTimeout(() => setCopiado(null), 1800);
    } catch {
      // Sem área de transferência — o texto continua visível para cópia manual.
    }
  }

  function enviarPorEmail() {
    enviarEmail({
      assunto: `Entre na equipe ${equipe.nome} — VIU Agenciamento`,
      corpo: mensagem,
    });
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <p className="mb-2 flex items-center gap-1.5 text-rotulo font-bold uppercase tracking-wider text-slate-500">
        <Link2 className="size-3" />
        Link de entrada da equipe
      </p>

      <p className="mb-2.5 text-apoio leading-relaxed text-slate-500">
        Visível apenas para você e demais responsáveis. Compartilhe no chat da equipe: quem abrir
        informa nome e e-mail corporativo e entra como{' '}
        <strong className="font-semibold text-slate-600">membro</strong>. Endereço aleatório, válido
        por {VALIDADE_HORAS_LINK}h — ao renovar, o anterior para de funcionar na hora.
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-50 px-2.5 py-2 text-apoio text-slate-600">
          {endereco}
        </code>

        <motion.button
          type="button"
          onClick={() => copiar(endereco, 'link')}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          {copiado === 'link' ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
          {copiado === 'link' ? 'Copiado' : 'Copiar link'}
        </motion.button>

        <motion.button
          type="button"
          onClick={() => copiar(mensagem, 'mensagem')}
          whileTap={{ scale: 0.97 }}
          title="Copia o texto pronto, com link, domínios aceitos e prazo"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          {copiado === 'mensagem' ? (
            <Check className="size-3.5 text-emerald-600" />
          ) : (
            <Copy className="size-3.5" />
          )}
          Copiar mensagem
        </motion.button>

        <motion.button
          type="button"
          onClick={enviarPorEmail}
          whileTap={{ scale: 0.97 }}
          title="Abre seu cliente de e-mail com a mensagem pronta"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <Mail className="size-3.5" />
          Enviar por e-mail
        </motion.button>

        <motion.button
          type="button"
          onClick={() => renovarLinkDaEquipe(equipe.id)}
          whileTap={{ scale: 0.97 }}
          title="Gera um novo endereço e invalida o atual"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <RefreshCw className="size-3.5" />
          Renovar
        </motion.button>

        <motion.button
          type="button"
          onClick={async () => {
            const ok = await confirmar({
              titulo: 'Desativar o link da equipe?',
              descricao: 'Quem já tiver o endereço deixa de conseguir entrar. Um link novo pode ser gerado depois.',
              rotuloConfirmar: 'Desativar',
              destrutivo: true,
            });
            if (ok) desativarLinkDaEquipe(equipe.id);
          }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <Power className="size-3.5" />
          Desativar
        </motion.button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-apoio text-slate-500">
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          gerado {new Date(link.criadoEm).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })} · expira em {horasRestantesLink(link)}h
        </span>

        <span>
          aceita {dominios.map((dominio) => `@${dominio}`).join(', ')}
        </span>

        {link.usos.length > 0 && (
          <span className="flex items-center gap-1" title={link.usos
            .map((uso) => getUsuario(uso.usuarioId)?.nome ?? uso.usuarioId)
            .join(', ')}
          >
            <Users className="size-3" />
            {link.usos.length} {link.usos.length === 1 ? 'entrada' : 'entradas'} por este link
          </span>
        )}
      </div>
    </div>
  );
}
