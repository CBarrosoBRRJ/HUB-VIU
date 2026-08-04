/**
 * Busca dos quadros.
 *
 * ## A busca respeita as visões
 *
 * Quem não enxerga a aba **Contato** também não busca por telefone. Parece exagero, mas uma busca
 * que varre campo oculto vira um oráculo: digita-se um número e a lista responde de quem é. O
 * dado não aparece na tela e mesmo assim vazou.
 *
 * Por isso `camposPorVisao` — cada campo pesquisável declara de que visão veio, e o chamador
 * informa quais estão liberadas.
 */

import { Talento, TalentContract, Usuario } from '../types';
import { getVigenciaInfo } from './vigencia';

export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
}

/** Todo termo precisa aparecer em algum campo — busca por "marina 2026" acha os dois juntos. */
function casaTodosOsTermos(termo: string, campos: (string | undefined)[]): boolean {
  const alvo = normalizar(termo);
  if (!alvo) return true;

  const conteudo = campos.filter(Boolean).map((campo) => normalizar(campo!)).join(' ');
  return alvo.split(/\s+/).every((parte) => conteudo.includes(parte));
}

/**
 * Contratos: talento, descrição, número, status e **nome ou e-mail de quem está na linha**.
 *
 * Procurar pelo colega é o caso mais comum depois do talento — "o que a Camila está tocando?".
 */
export function filtrarContratos(
  contratos: TalentContract[],
  termo: string,
  usuarios: Usuario[],
): TalentContract[] {
  if (!termo.trim()) return contratos;
  const porId = new Map(usuarios.map((usuario) => [usuario.id, usuario]));

  return contratos.filter((contrato) => {
    const pessoas = [...contrato.responsaveisIds, ...contrato.parceirosIds]
      .map((id) => porId.get(id))
      .flatMap((usuario) => (usuario ? [usuario.nome, usuario.email] : []));

    return casaTodosOsTermos(termo, [
      contrato.talento,
      contrato.contrato,
      contrato.numero,
      contrato.status,
      // A vigência é derivada, mas é como as pessoas falam: "quais estão vencidos?".
      getVigenciaInfo(contrato).label,
      ...pessoas,
    ]);
  });
}

/**
 * Campos pesquisáveis de um talento, indexados pela **coluna** que os exibe.
 *
 * Granularidade de coluna, não de visão: a permissão tem dois níveis (aba e coluna), e agrupar
 * por aba deixaria uma coluna oculta pesquisável através da aba a que pertence.
 *
 * O **nome** fica fora do mapa de propósito — ver `filtrarTalentos`.
 */
export function camposPorColuna(
  talento: Talento,
  usuarios: Usuario[],
): Record<string, (string | undefined)[]> {
  const porId = new Map(usuarios.map((usuario) => [usuario.id, usuario]));
  const pessoa = (id?: string) => {
    const usuario = id ? porId.get(id) : undefined;
    return usuario ? [usuario.nome, usuario.email] : [];
  };

  const mapa: Record<string, (string | undefined)[]> = {
    'talentos:identificacao:tipo': [talento.tipo === 'exclusivo' ? 'exclusivo' : 'interveniência'],
    'talentos:identificacao:nomeArtistico': [talento.nomeArtistico],
    'talentos:identificacao:empresa': [talento.empresa],
    'talentos:contato:email': [talento.email],
    'talentos:contato:telefone': [talento.telefone],
    'talentos:contato:local': [talento.local],
    'talentos:contato:observacoes': [talento.observacoes],
    'talentos:financeiro:razaoSocial': [talento.razaoSocial],
    'talentos:financeiro:cnpj': [talento.cnpj],
    'talentos:financeiro:faturamento': [talento.faturamento],
    'talentos:financeiro:condicaoPagamento': [talento.condicaoPagamento],
    'talentos:financeiro:dadosBancarios': [talento.dadosBancarios],
  };

  for (const [rede, valor] of Object.entries(talento.redes)) {
    mapa[`talentos:redes:${rede}`] = [valor];
  }
  for (const [area, ids] of Object.entries(talento.responsaveis)) {
    mapa[`talentos:responsaveis:${area}`] = (ids ?? []).flatMap(pessoa);
  }

  return mapa;
}

/**
 * Talentos, restrito às colunas que a sessão enxerga.
 *
 * O **nome** é sempre pesquisável, mesmo sem coluna alguma liberada: é o que sustenta a lista, e
 * escondê-lo deixaria a tela inutilizável para quem legitimamente enxerga o quadro. Também não é
 * segredo — aparece na primeira coluna, que nunca se oculta.
 */
export function filtrarTalentos(
  talentos: Talento[],
  termo: string,
  usuarios: Usuario[],
  colunasVisiveis: string[],
): Talento[] {
  if (!termo.trim()) return talentos;

  return talentos.filter((talento) => {
    const porColuna = camposPorColuna(talento, usuarios);
    const campos = colunasVisiveis.flatMap((coluna) => porColuna[coluna] ?? []);
    return casaTodosOsTermos(termo, [talento.nome, ...campos]);
  });
}
