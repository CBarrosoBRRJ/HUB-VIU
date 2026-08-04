/**
 * Troca do e-mail de acesso.
 *
 * Mesma mecânica do convite: token único, prazo e uso único. A diferença é o que está em jogo —
 * aqui se troca a **identidade** de uma conta existente, então a confirmação precisa chegar ao
 * endereço novo antes de a troca valer.
 */

import { TrocaEmail } from '../types';
import { gerarToken } from './convites';
import { normalizarEmail } from './identidade';

export const VALIDADE_HORAS_EMAIL = 24;

const MS_POR_HORA = 3_600_000;

export type StatusTroca = 'pendente' | 'confirmada' | 'expirada';

export function criarTrocaEmail(
  dados: { id: string; usuarioId: string; novoEmail: string },
  agora = new Date(),
): TrocaEmail {
  return {
    ...dados,
    novoEmail: normalizarEmail(dados.novoEmail),
    token: gerarToken(),
    criadaEm: agora.toISOString(),
    expiraEm: new Date(agora.getTime() + VALIDADE_HORAS_EMAIL * MS_POR_HORA).toISOString(),
  };
}

export function statusTroca(troca: TrocaEmail, agora = new Date()): StatusTroca {
  if (troca.confirmadaEm) return 'confirmada';
  if (new Date(troca.expiraEm).getTime() <= agora.getTime()) return 'expirada';
  return 'pendente';
}

export type ErroTroca = 'inexistente' | 'confirmada' | 'expirada';

export function validarConfirmacao(
  troca: TrocaEmail | undefined,
  agora = new Date(),
): ErroTroca | null {
  if (!troca) return 'inexistente';
  const status = statusTroca(troca, agora);
  if (status === 'confirmada') return 'confirmada';
  if (status === 'expirada') return 'expirada';
  return null;
}

export function mensagemErroTroca(erro: ErroTroca): string {
  switch (erro) {
    case 'inexistente':
      return 'Este link de confirmação não existe.';
    case 'confirmada':
      return 'Esta troca de e-mail já foi confirmada.';
    case 'expirada':
      return `O link expirou (validade de ${VALIDADE_HORAS_EMAIL} horas). Solicite a troca novamente.`;
  }
}

/** Troca ainda pendente de uma pessoa — só pode haver uma por vez. */
export function trocaPendenteDe(
  trocas: TrocaEmail[],
  usuarioId: string,
  agora = new Date(),
): TrocaEmail | undefined {
  return trocas.find(
    (troca) => troca.usuarioId === usuarioId && statusTroca(troca, agora) === 'pendente',
  );
}

export function linkDaConfirmacao(troca: TrocaEmail, origem = window.location.origin): string {
  return `${origem}/#/confirmar-email/${troca.token}`;
}
