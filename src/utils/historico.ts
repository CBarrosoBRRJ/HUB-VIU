/**
 * O histórico de desfazer — `Ctrl+Z` no dado dos quadros.
 *
 * ## O problema que ele resolve
 *
 * A edição do sistema é estilo planilha: clicar numa célula já é editá-la, e sair do campo já é
 * salvar. Não há botão de salvar, e portanto **não havia momento para hesitar**. Quem sobrescrevia
 * o valor certo por engano só tinha um caminho: lembrar o que estava lá antes e digitar de novo.
 * Em coluna de escolha fechada — status, prioridade, responsável — nem isso, porque o valor
 * anterior não aparece em lugar nenhum depois da troca.
 *
 * A confirmação em diálogo protege o que é destrutivo e deliberado (excluir). O desfazer protege o
 * resto: o que é reversível e acidental. São dois problemas diferentes, e um não substitui o outro
 * — pedir confirmação a cada célula editada tornaria a grade impraticável.
 *
 * ## Por que observa o resultado, e não a intenção
 *
 * O caminho óbvio seria instrumentar cada mutação (`registrarHistorico('excluir')` no começo das
 * ~50 funções do provider). Foi descartado por dois motivos:
 *
 * 1. **A instrumentação envelhece.** A mutação nº 51 nasceria fora do desfazer, e o defeito só
 *    apareceria quando alguém perdesse trabalho — que é tarde demais para descobrir.
 * 2. **Duas verdades sobre a mesma ação.** O rótulo escrito à mão diz o que o autor *achava* que a
 *    função fazia; comparar os estados diz o que ela *fez*.
 *
 * Aqui o histórico observa as coleções e deriva a descrição da diferença. Toda mutação nova entra
 * no desfazer sem que ninguém precise lembrar dela.
 *
 * ## O que fica de fora, de propósito
 *
 * **Usuários, equipes, concessões e convites.** Desfazer não é para tudo: um `Ctrl+Z` distraído
 * que devolva acesso a quem acabou de ser desligado é um furo de segurança com cara de
 * conveniência. Mudança de permissão é ato deliberado, tem tela própria e trilha própria — e o
 * caminho de voltar atrás é refazer o gesto, conscientemente.
 *
 * **A sessão não sobrevive ao F5.** O histórico vive em memória. Persisti-lo faria o `Ctrl+Z` do
 * dia seguinte desfazer algo de ontem, que ninguém lembra ter feito — e, com backend, desfazer o
 * que outra pessoa fez no meio-tempo.
 */

import { Marca, Oportunidade, TalentContract, Talento } from '../types';

/**
 * As coleções que o desfazer alcança — o dado operacional dos três quadros.
 *
 * Guardadas por referência, não por cópia: as mutações do provider são imutáveis (`map`, spread),
 * então a lista anterior continua íntegra na memória. Clonar seria pagar por uma garantia que a
 * imutabilidade já dá.
 */
export interface Instantaneo {
  oportunidades: Oportunidade[];
  contratos: TalentContract[];
  talentos: Talento[];
  marcas: Marca[];
}

export interface EntradaHistorico {
  /** O estado **anterior** à mudança — é para cá que o desfazer volta. */
  instantaneo: Instantaneo;
  /** O que a mudança fez, em palavras da operação. Aparece no aviso da tela. */
  descricao: string;
}

/**
 * Quantos passos o histórico guarda.
 *
 * Vinte cobre a sessão de trabalho real — quem erra percebe em um ou dois gestos, não em quinze.
 * O teto existe porque cada entrada segura na memória as quatro listas inteiras do momento em que
 * foi criada: sem limite, uma tarde de edição manteria viva toda a história do dia.
 */
export const LIMITE_HISTORICO = 20;

type Colecao = keyof Instantaneo;

const COLECOES: Colecao[] = ['oportunidades', 'contratos', 'talentos', 'marcas'];

/** Como cada coleção se chama no aviso — singular e plural, porque a contagem entra no texto. */
const NOMES: Record<Colecao, { singular: string; plural: string; artigo: string }> = {
  oportunidades: { singular: 'projeto', plural: 'projetos', artigo: 'o' },
  contratos: { singular: 'contrato', plural: 'contratos', artigo: 'o' },
  talentos: { singular: 'talento', plural: 'talentos', artigo: 'o' },
  marcas: { singular: 'marca', plural: 'marcas', artigo: 'a' },
};

/**
 * Nada mudou de fato?
 *
 * Compara por **referência**, e é isso que a torna barata o bastante para rodar a cada render.
 * Funciona porque toda mutação do provider devolve uma lista nova: se a referência é a mesma, o
 * conteúdo é o mesmo. O contrário não vale — e não precisa valer, porque uma entrada de histórico
 * a mais custa memória, não correção.
 */
export function semMudanca(antes: Instantaneo, depois: Instantaneo): boolean {
  return COLECOES.every((colecao) => antes[colecao] === depois[colecao]);
}

interface ItemComId {
  id: string;
}

/** O nome pelo qual a operação chama este registro. */
function rotuloDoItem(colecao: Colecao, item: unknown): string {
  const registro = item as Record<string, unknown>;
  const candidato =
    colecao === 'oportunidades'
      ? registro.titulo
      : colecao === 'contratos'
        ? registro.talento
        : registro.nome;
  return typeof candidato === 'string' && candidato.trim() !== '' ? candidato : '';
}

/** `"Campanha Verão"` quando há nome; `o projeto` quando a linha ainda não tem um. */
function alvo(colecao: Colecao, item: unknown): string {
  const rotulo = rotuloDoItem(colecao, item);
  const { singular, artigo } = NOMES[colecao];
  return rotulo ? `"${rotulo}"` : `${artigo} ${singular}`;
}

function contar(quantos: number, colecao: Colecao): string {
  const { singular, plural } = NOMES[colecao];
  return `${quantos} ${quantos === 1 ? singular : plural}`;
}

/**
 * O que aconteceu entre dois estados, em uma frase.
 *
 * Só a **primeira** coleção que mudou é descrita. Uma ação pode tocar duas — escrever um nome novo
 * na coluna Talento de um contrato altera o contrato e abre a ficha do talento —, e narrar as duas
 * daria "Alteração em contrato e novo talento", que é a implementação falando, não a operação. A
 * ordem de `COLECOES` põe primeiro a coleção que a pessoa estava editando.
 */
export function descreverMudanca(antes: Instantaneo, depois: Instantaneo): string {
  for (const colecao of COLECOES) {
    const listaAntes = antes[colecao] as unknown as ItemComId[];
    const listaDepois = depois[colecao] as unknown as ItemComId[];
    if (listaAntes === listaDepois) continue;

    if (listaDepois.length > listaAntes.length) {
      const conhecidos = new Set(listaAntes.map((item) => item.id));
      const novos = listaDepois.filter((item) => !conhecidos.has(item.id));
      if (novos.length > 1) return `Criação de ${contar(novos.length, colecao)}`;

      const novo = novos[0];
      // Duplicar deixa rastro na própria linha — é o que separa "criou" de "copiou" sem adivinhar.
      const duplicado = Boolean((novo as unknown as { duplicadaDe?: string })?.duplicadaDe);
      const nome = novo ? alvo(colecao, novo) : NOMES[colecao].singular;
      return duplicado ? `Duplicação de ${nome}` : `Criação de ${nome}`;
    }

    if (listaDepois.length < listaAntes.length) {
      const restantes = new Set(listaDepois.map((item) => item.id));
      const removidos = listaAntes.filter((item) => !restantes.has(item.id));
      if (removidos.length > 1) return `Exclusão de ${contar(removidos.length, colecao)}`;
      return `Exclusão de ${removidos[0] ? alvo(colecao, removidos[0]) : NOMES[colecao].singular}`;
    }

    /*
      Mesmo tamanho: alguma linha foi editada — ou nenhuma, e a lista só mudou de ordem.

      A ordem é verificada **antes** da posição. Comparar índice a índice numa lista reordenada
      acusa a primeira linha que trocou de lugar como se ela tivesse sido editada, e o aviso
      passaria a nomear uma linha em que ninguém tocou. Se todos os objetos de depois já estavam
      antes — mesma identidade, outra posição —, nada foi alterado e a frase fica genérica.
    */
    const conhecidos = new Set<unknown>(listaAntes);
    if (listaDepois.every((item) => conhecidos.has(item))) {
      return `Alteração em ${NOMES[colecao].plural}`;
    }

    const editado = listaDepois.find((item) => !conhecidos.has(item));
    if (!editado) return `Alteração em ${NOMES[colecao].plural}`;
    return `Alteração em ${alvo(colecao, editado)}`;
  }

  return 'Alteração';
}

/**
 * Empilha respeitando o teto — o mais antigo cai pela base.
 *
 * Pura, devolvendo pilha nova: é o que permite guardá-la em estado do React sem que uma render
 * dupla do StrictMode acumule duas vezes o mesmo passo.
 */
export function empilhar<T>(pilha: T[], item: T, limite = LIMITE_HISTORICO): T[] {
  const proxima = [...pilha, item];
  return proxima.length > limite ? proxima.slice(proxima.length - limite) : proxima;
}

export interface ResultadoNavegacao {
  /** O estado a aplicar. `null` quando não havia para onde ir. */
  instantaneo: Instantaneo | null;
  passado: EntradaHistorico[];
  futuro: EntradaHistorico[];
  /** Frase pronta para o aviso — `null` quando nada aconteceu. */
  aviso: string | null;
}

/**
 * Um passo atrás: aplica o topo do passado e joga o estado atual no futuro.
 *
 * Recebe `atual` porque o refazer precisa saber para onde voltar — sem isso, desfazer seria uma
 * porta de mão única, e quem apertasse `Ctrl+Z` uma vez a mais perderia o que tinha acabado de
 * escrever, que é precisamente o susto que este módulo existe para evitar.
 */
export function desfazer(
  passado: EntradaHistorico[],
  futuro: EntradaHistorico[],
  atual: Instantaneo,
): ResultadoNavegacao {
  const entrada = passado[passado.length - 1];
  if (!entrada) return { instantaneo: null, passado, futuro, aviso: null };

  return {
    instantaneo: entrada.instantaneo,
    passado: passado.slice(0, -1),
    futuro: empilhar(futuro, { instantaneo: atual, descricao: entrada.descricao }),
    aviso: `Desfeito · ${entrada.descricao}`,
  };
}

/** Um passo à frente — o espelho de `desfazer`. */
export function refazer(
  passado: EntradaHistorico[],
  futuro: EntradaHistorico[],
  atual: Instantaneo,
): ResultadoNavegacao {
  const entrada = futuro[futuro.length - 1];
  if (!entrada) return { instantaneo: null, passado, futuro, aviso: null };

  return {
    instantaneo: entrada.instantaneo,
    passado: empilhar(passado, { instantaneo: atual, descricao: entrada.descricao }),
    futuro: futuro.slice(0, -1),
    aviso: `Refeito · ${entrada.descricao}`,
  };
}

/**
 * O atalho pede o desfazer desta tecla?
 *
 * `Ctrl+Z` no Windows, `Cmd+Z` no Mac. Fora daqui fica a decisão de **onde** ele vale — ver
 * `ehCampoDeTexto`.
 */
export function ehAtalhoDesfazer(evento: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}): boolean {
  return (evento.ctrlKey || evento.metaKey) && !evento.shiftKey && evento.key.toLowerCase() === 'z';
}

/**
 * `Ctrl+Shift+Z` ou `Ctrl+Y` — as duas convenções que convivem.
 *
 * O Windows consagrou o `Ctrl+Y`; o resto do mundo, o `Shift+Z`. Aceitar as duas custa uma linha e
 * evita que metade das pessoas conclua que refazer não existe.
 */
export function ehAtalhoRefazer(evento: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}): boolean {
  const comando = evento.ctrlKey || evento.metaKey;
  if (!comando) return false;
  const tecla = evento.key.toLowerCase();
  return (evento.shiftKey && tecla === 'z') || (!evento.shiftKey && tecla === 'y');
}

/**
 * O foco está num campo de texto?
 *
 * **É a regra mais importante deste módulo.** Dentro de um campo em edição, `Ctrl+Z` já significa
 * outra coisa — desfazer o que se digitou —, e o navegador faz isso sozinho, letra por letra.
 * Roubar a tecla ali trocaria "apagar a última palavra" por "reverter a linha inteira", que é o
 * oposto do que a pessoa pediu, no momento em que ela tem menos motivo para esperar surpresa.
 *
 * Recebe o elemento em vez de ler `document.activeElement` para poder ser testada sem DOM.
 */
export function ehCampoDeTexto(elemento: {
  tagName?: string;
  isContentEditable?: boolean;
} | null): boolean {
  if (!elemento) return false;
  if (elemento.isContentEditable) return true;
  const tag = (elemento.tagName ?? '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}
