/**
 * Geração de identificadores locais.
 *
 * ## O defeito que este módulo existe para impedir
 *
 * Os contadores eram inicializados com uma constante — `useRef(1)` — ou com o tamanho do **seed**.
 * Nenhum dos dois olha para o que está de fato carregado, e o resultado é id repetido:
 *
 * | Situação | O que acontecia |
 * |----------|-----------------|
 * | Contador em `1`, seed com `op1` | a **primeira** linha criada nascia com um id que já existia |
 * | Contador em `SEED.length + 1` | depois de um F5, voltava ao mesmo número e recriava os ids da sessão anterior |
 *
 * Em React, dois registros com a mesma `key` fazem a reconciliação juntar as linhas: a nova
 * aparece com os dados da antiga, e editar uma altera a outra. O sintoma na tela é "criar um
 * registro novo replica um existente" — que não parece problema de id, e por isso é caro de achar.
 *
 * ## A regra
 *
 * O próximo número vem **do que está carregado**, não do seed nem de uma constante. Assim ele
 * sobrevive ao `localStorage`, à ingestão por integração e a qualquer conjunto inicial.
 *
 * ## Com backend, isto sai
 *
 * O banco gera `uuid`. Um contador de sessão nunca foi adequado para múltiplos clientes
 * escrevendo ao mesmo tempo — ver [PRD 09 §5](../../prd/09_fundacoes_tecnicas.md).
 */

/**
 * Próximo número livre para ids no formato `<prefixo><n>` — `op7`, `tal3`, `u12`.
 *
 * Ignora o que não casa com o padrão: um id vindo de outra origem (importação, migração) não
 * impede o contador de funcionar, apenas não contribui para ele.
 */
export function proximoNumero(registros: { id: string }[], prefixo: string): number {
  const padrao = new RegExp(`^${prefixo}(\\d+)$`);

  const maior = registros.reduce((maximo, registro) => {
    const casou = padrao.exec(registro.id);
    if (!casou) return maximo;
    return Math.max(maximo, Number(casou[1]));
  }, 0);

  return maior + 1;
}

/**
 * Idem para ids com separador e zeros à esquerda — `CT-001`, usado pelos contratos.
 *
 * O formato existe porque o número do contrato é lido por gente, em conversa e em e-mail; um
 * `CT-7` no meio de `CT-041` atrapalha a leitura.
 */
export function proximoNumeroFormatado(registros: { id: string }[], prefixo: string): number {
  return proximoNumero(
    registros.map((registro) => ({ id: registro.id.replace(`${prefixo}-`, prefixo) })),
    prefixo,
  );
}
