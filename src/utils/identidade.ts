/**
 * Identidade das pessoas.
 *
 * O e-mail é a **chave de negócio**: uma pessoa, uma conta. Com SSO corporativo, é também
 * o que o provedor devolve na autenticação — por isso toda comparação passa por
 * `normalizarEmail`, e nunca por igualdade crua de string.
 */

import { Usuario } from '../types';

export const DOMINIOS_PADRAO = ['g.globo', 'globo.com', 'viu.com.br'];

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getDominio(email: string): string {
  const partes = normalizarEmail(email).split('@');
  return partes.length === 2 ? partes[1] : '';
}

export function emailValido(email: string): boolean {
  // Verificação estrutural apenas: quem valida a existência é o provedor de SSO.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizarEmail(email));
}

export function dominioPermitido(email: string, dominios: string[]): boolean {
  const dominio = getDominio(email);
  return dominios.some((permitido) => normalizarEmail(permitido) === dominio);
}

/** Já existe alguém com esse e-mail? `ignorarId` serve para a própria pessoa ao editar. */
export function emailEmUso(email: string, usuarios: Usuario[], ignorarId?: string): boolean {
  const alvo = normalizarEmail(email);
  return usuarios.some((usuario) => usuario.id !== ignorarId && normalizarEmail(usuario.email) === alvo);
}

export function encontrarPorEmail(email: string, usuarios: Usuario[]): Usuario | undefined {
  const alvo = normalizarEmail(email);
  return usuarios.find((usuario) => normalizarEmail(usuario.email) === alvo);
}

export type ErroIdentidade = 'formato' | 'dominio' | 'duplicado';

/**
 * Validação única de e-mail, usada no cadastro manual e no convite.
 *
 * Retorna `null` quando está tudo certo — manter num só lugar evita que as duas portas de
 * entrada divirjam e criem conta duplicada por um caminho.
 */
export function validarEmail(
  email: string,
  { usuarios, dominios, ignorarId }: { usuarios: Usuario[]; dominios: string[]; ignorarId?: string },
): ErroIdentidade | null {
  if (!emailValido(email)) return 'formato';
  if (!dominioPermitido(email, dominios)) return 'dominio';
  if (emailEmUso(email, usuarios, ignorarId)) return 'duplicado';
  return null;
}

/**
 * Sufixos de geração: fazem parte do sobrenome, não são um nome a mais.
 *
 * "Ana de Souza Neto" reduzida a "Ana Neto" perde a família — é "Souza Neto" que identifica a
 * pessoa. Sem esta lista, o corte por última palavra devolveria exatamente isso.
 */
const SUFIXOS_DE_FAMILIA = new Set([
  'filho', 'filha', 'neto', 'neta', 'sobrinho', 'sobrinha',
  'junior', 'júnior', 'jr', 'jr.', 'segundo', 'terceiro', 'ii', 'iii',
]);

/** Partículas que ligam sobrenomes e não valem como nome por si — "de", "da", "dos"… */
const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'di', 'du', 'del', 'della', 'van', 'von', 'la', 'le']);

/**
 * O nome como as pessoas se chamam: **primeiro e último** — 12/08/2026.
 *
 * A sidebar exibia o nome de cadastro inteiro, e o cadastro é o nome civil: "Caio Cesar Moura
 * Barroso" não cabe em 256px e virava "Caio Cesar Moura Bar…", que é pior que qualquer versão
 * curta — corta no meio da palavra que identifica a pessoa. Pedido da operação: *"o primeiro e
 * último nome, ex: Caio Barroso"*.
 *
 * É a mesma regra que `getIniciais` já usava para o avatar (primeira + última inicial), agora
 * escrita por extenso: as duas partes que uma pessoa usa para se apresentar.
 *
 * Dois casos que o corte ingênuo erra, e que esta função trata:
 *
 * | Entrada | Corte ingênuo | Aqui |
 * |---|---|---|
 * | "Ana de Souza Neto" | "Ana Neto" — perde a família | "Ana Souza Neto" |
 * | "Marcos de Andrade" | "Marcos Andrade" | "Marcos Andrade" (a partícula sai) |
 *
 * Nome de uma palavra só volta inteiro; entrada vazia volta vazia.
 */
export function nomeCurto(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 1) return partes[0] ?? '';

  const primeiro = partes[0];
  const ultimo = partes[partes.length - 1];

  /*
    Sufixo de geração só é sufixo se houver sobrenome antes dele para carregar — e esse anterior
    não pode ser partícula ("Ana da Neto" não existe; se fosse o caso, o sufixo vira o sobrenome).
  */
  if (SUFIXOS_DE_FAMILIA.has(ultimo.toLowerCase()) && partes.length >= 3) {
    const anterior = partes[partes.length - 2];
    if (!PARTICULAS.has(anterior.toLowerCase())) return `${primeiro} ${anterior} ${ultimo}`;
  }

  return `${primeiro} ${ultimo}`;
}

/**
 * `cargo` guarda **o que a pessoa faz**, nunca o que ela pode fazer.
 *
 * A semente nasceu com `cargo: 'Dono do Sistema'` — que é vocabulário de permissão, não um cargo.
 * Corrigir a semente resolve quem instala hoje, e **não alcança quem já tem o valor gravado**: a
 * persistência versiona por formato e descarta tudo na virada, então não há migração pontual, e
 * derrubar a versão inteira por causa de uma string apagaria os dados de todo mundo.
 *
 * Este reparo é a alternativa: ele roda na leitura, corrige o valor que um defeito meu escreveu, e
 * não toca em nada que alguém tenha digitado — "Dono do Sistema" é uma frase que ninguém escolhe
 * como cargo. Mesma lógica do `semIdsRepetidos` em `persistencia.ts`: a garantia vale sempre,
 * venha o dado de onde vier.
 */
const CARGOS_INVALIDOS: Record<string, string> = {
  'Dono do Sistema': 'Desenvolvedor',
};

export function sanearCargos(usuarios: Usuario[]): Usuario[] {
  if (!usuarios.some((u) => CARGOS_INVALIDOS[u.cargo])) return usuarios;
  return usuarios.map((u) => (CARGOS_INVALIDOS[u.cargo] ? { ...u, cargo: CARGOS_INVALIDOS[u.cargo] } : u));
}

export function mensagemErroIdentidade(erro: ErroIdentidade, dominios: string[]): string {
  switch (erro) {
    case 'formato':
      return 'E-mail inválido.';
    case 'dominio':
      return `Domínio não autorizado. Permitidos: ${dominios.map((d) => `@${d}`).join(', ')}.`;
    case 'duplicado':
      return 'Já existe uma conta com esse e-mail.';
  }
}
