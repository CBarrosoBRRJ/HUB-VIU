/** Regras puras das equipes — sem UI e sem estado. */

import { AppPage, Equipe, MembroEquipe, PapelEquipe } from '../types';

/**
 * Coloca a pessoa na equipe com o papel indicado.
 *
 * Idempotente: se já for membro, só troca o papel — nunca duplica a entrada.
 * `responsavelAte` define uma responsabilidade **temporária**; sem ele, é permanente.
 */
export function definirMembro(
  equipe: Equipe,
  usuarioId: string,
  papel: PapelEquipe,
  responsavelAte?: string,
): Equipe {
  const jaExiste = equipe.membros.some((membro) => membro.usuarioId === usuarioId);
  const entrada: MembroEquipe = {
    usuarioId,
    papel,
    // Prazo só faz sentido em responsável; voltar a membro sempre limpa a marca.
    ...(papel === 'responsavel' && responsavelAte ? { responsavelAte } : {}),
  };

  const membros: MembroEquipe[] = jaExiste
    ? equipe.membros.map((membro) => (membro.usuarioId === usuarioId ? entrada : membro))
    : [...equipe.membros, entrada];

  return { ...equipe, membros };
}

/** A responsabilidade temporária ainda vale? */
export function responsabilidadeVigente(membro: MembroEquipe, agora = new Date()): boolean {
  if (membro.papel !== 'responsavel') return false;
  if (!membro.responsavelAte) return true;
  return new Date(membro.responsavelAte).getTime() > agora.getTime();
}

export function removerMembro(equipe: Equipe, usuarioId: string): Equipe {
  return { ...equipe, membros: equipe.membros.filter((membro) => membro.usuarioId !== usuarioId) };
}

/** Papel **efetivo**: responsabilidade temporária vencida já vale como `membro`. */
export function getPapelNaEquipe(
  equipe: Equipe,
  usuarioId: string,
  agora = new Date(),
): PapelEquipe | null {
  const membro = equipe.membros.find((item) => item.usuarioId === usuarioId);
  if (!membro) return null;
  if (membro.papel === 'responsavel' && !responsabilidadeVigente(membro, agora)) return 'membro';
  return membro.papel;
}

/** Entrada bruta na equipe — inclui o prazo, quando houver. */
export function getMembro(equipe: Equipe, usuarioId: string): MembroEquipe | undefined {
  return equipe.membros.find((membro) => membro.usuarioId === usuarioId);
}

/** Concede ou revoga o acesso da equipe a uma página do Workspace. */
export function alternarPagina(equipe: Equipe, pagina: AppPage): Equipe {
  const temAcesso = equipe.paginasPermitidas.includes(pagina);
  return {
    ...equipe,
    paginasPermitidas: temAcesso
      ? equipe.paginasPermitidas.filter((id) => id !== pagina)
      : [...equipe.paginasPermitidas, pagina],
  };
}

export function contarPorPapel(
  equipe: Equipe,
  agora = new Date(),
): { responsaveis: number; membros: number } {
  return equipe.membros.reduce(
    (acc, membro) => {
      // Conta pelo papel efetivo: um prazo vencido não infla o número de responsáveis.
      if (getPapelNaEquipe(equipe, membro.usuarioId, agora) === 'responsavel') acc.responsaveis += 1;
      else acc.membros += 1;
      return acc;
    },
    { responsaveis: 0, membros: 0 },
  );
}

/** Equipes das quais a pessoa participa, em qualquer papel. */
export function equipesDoUsuario(equipes: Equipe[], usuarioId: string): Equipe[] {
  return equipes.filter((equipe) => equipe.membros.some((membro) => membro.usuarioId === usuarioId));
}

/** Equipes que operam um quadro — as que têm aquele quadro liberado. */
export function equipesDoQuadro(equipes: Equipe[], pagina: AppPage): Equipe[] {
  return equipes.filter((equipe) => equipe.paginasPermitidas.includes(pagina));
}

/**
 * Quem pode ser nomeado num registro daquele quadro.
 *
 * Nomear alguém de fora das equipes que operam o quadro criaria um responsável sem acesso ao
 * próprio registro — por isso a lista de candidatos sai daqui, e não da base inteira.
 */
export function usuariosDoQuadro(equipes: Equipe[], pagina: AppPage): string[] {
  const ids = new Set<string>();
  for (const equipe of equipesDoQuadro(equipes, pagina)) {
    for (const membro of equipe.membros) ids.add(membro.usuarioId);
  }
  return [...ids];
}

/** União das páginas liberadas pelas equipes da pessoa — acesso é cumulativo. */
export function paginasDoUsuario(equipes: Equipe[], usuarioId: string): AppPage[] {
  const paginas = new Set<AppPage>();
  for (const equipe of equipesDoUsuario(equipes, usuarioId)) {
    for (const pagina of equipe.paginasPermitidas) paginas.add(pagina);
  }
  return [...paginas];
}
