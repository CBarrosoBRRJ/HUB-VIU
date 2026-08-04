/**
 * SLA de triagem — 5 dias úteis entre a entrada da oportunidade e a resposta.
 *
 * ## Por que dias úteis, e não corridos
 *
 * O compromisso é operacional: quem recebe a demanda responde em 5 dias de trabalho. Contar
 * corridos faria uma demanda que chega na sexta ter metade do prazo consumido antes de alguém
 * abrir o sistema — e a régua deixaria de medir o que promete.
 *
 * Toda a contagem passa por aqui. Duplicar a aritmética de datas em outro arquivo é como se
 * produz dois prazos diferentes para a mesma linha.
 */
/** Prazo padrão de triagem, em dias úteis. */
export const SLA_DIAS_UTEIS = 5;
/** Converte `yyyy-mm-dd` em Date local à meia-noite — evita o deslocamento de fuso do UTC. */
function parseISO(iso) {
    if (!iso)
        return null;
    const [ano, mes, dia] = iso.split('-').map(Number);
    if (!ano || !mes || !dia)
        return null;
    return new Date(ano, mes - 1, dia);
}
function paraISO(data) {
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${data.getFullYear()}-${mes}-${dia}`;
}
/** Sábado e domingo. Feriados ficam de fora até a operação definir o calendário — ver §Limitações. */
function ehFimDeSemana(data) {
    const dia = data.getDay();
    return dia === 0 || dia === 6;
}
/**
 * Soma dias úteis a uma data.
 *
 * O dia da entrada **não** conta: uma demanda que chega hoje tem os 5 dias seguintes, não 4 e o
 * restinho de hoje.
 */
export function somarDiasUteis(iso, dias) {
    const base = parseISO(iso);
    if (!base)
        return '';
    const data = new Date(base);
    let restantes = dias;
    while (restantes > 0) {
        data.setDate(data.getDate() + 1);
        if (!ehFimDeSemana(data))
            restantes -= 1;
    }
    return paraISO(data);
}
/**
 * Dias úteis entre duas datas — negativo quando a segunda já passou da primeira.
 *
 * Conta os dias **a partir do dia seguinte** ao primeiro, na mesma régua de `somarDiasUteis`:
 * as duas precisam concordar, senão o prazo calculado e a contagem regressiva divergem.
 */
export function diasUteisEntre(inicioISO, fimISO) {
    const inicio = parseISO(inicioISO);
    const fim = parseISO(fimISO);
    if (!inicio || !fim)
        return 0;
    const adiante = fim.getTime() >= inicio.getTime();
    const [de, ate] = adiante ? [inicio, fim] : [fim, inicio];
    const cursor = new Date(de);
    let total = 0;
    while (cursor.getTime() < ate.getTime()) {
        cursor.setDate(cursor.getDate() + 1);
        if (!ehFimDeSemana(cursor))
            total += 1;
    }
    return adiante ? total : -total;
}
/** Prazo de triagem a partir da data de entrada. */
export function prazoDeTriagem(entradaISO) {
    return somarDiasUteis(entradaISO, SLA_DIAS_UTEIS);
}
/**
 * As cores do farol, por papel.
 *
 * `faixa` é a **barra na borda esquerda da linha** — o jeito como o quadro sinaliza o prazo desde
 * 03/08/2026. Antes foi um ponto colorido, depois um relógio em círculo, e os dois falharam pelo
 * mesmo motivo: numa linha que já tem etiqueta de status, etiqueta de prioridade e ícones de ação,
 * mais um objeto no fluxo horizontal vira ruído — e disputa a leitura com o que já estava lá.
 *
 * A barra sai do fluxo. Ela não ocupa lugar entre os elementos, não empurra nada, e a cor aparece
 * numa faixa que o olho lê como "estado desta linha" sem precisar de legenda. É o padrão que os
 * quadros de tarefa consagraram, e funciona aqui pelo mesmo motivo: **a linha inteira é o objeto,
 * então a marca dela fica na borda, não dentro.**
 */
export const SLA_TONE_STYLE = {
    /*
      `faixa` é a **cor** da barra, e não uma classe de borda.
      ---------------------------------------------------------------------------
      A primeira versão usava `border-l-*`, e a barra sumia ao rolar na horizontal: com
      `border-collapse: collapse`, o navegador assume o desenho das bordas da tabela e elas **não
      acompanham** a célula congelada. O `sticky` grudava; a borda ficava para trás.
  
      A cor sai daqui como valor porque quem a aplica usa `box-shadow: inset`, que é pintura da
      própria célula e viaja com ela. Trocar de volta para `border` traz o defeito de volta.
    */
    verde: { text: 'text-emerald-700', bar: 'bg-emerald-500', dot: 'bg-emerald-500', faixa: '#34d399' },
    amarelo: { text: 'text-amber-700', bar: 'bg-amber-500', dot: 'bg-amber-500', faixa: '#fbbf24' },
    vermelho: { text: 'text-red-700', bar: 'bg-red-500', dot: 'bg-red-500', faixa: '#ef4444' },
    // Já saiu da triagem: transparente mantém o alinhamento sem afirmar nada.
    cinza: { text: 'text-slate-500', bar: 'bg-slate-300', dot: 'bg-slate-300', faixa: 'transparent' },
};
/**
 * Farol do prazo — as faixas do PRD 01 §6.
 *
 * | Cor | Condição |
 * |-----|----------|
 * | 🟢 | mais de 2 dias úteis restantes |
 * | 🟡 | 1 a 2 dias — a janela de atenção |
 * | 🔴 | prazo ultrapassado |
 * | ⚫ | oportunidade já encerrada, ou sem prazo |
 *
 * O relógio **para** quando a oportunidade sai da triagem: o SLA mede o tempo de resposta, não o
 * tempo de vida do projeto. Deixá-lo correndo pintaria de vermelho tudo o que já foi resolvido.
 */
export function getSlaInfo(alvo, referencia = new Date()) {
    if (alvo.encerrada) {
        return { tone: 'cinza', label: 'Triada', diasRestantes: null, percentual: null };
    }
    if (!alvo.prazoEm) {
        return { tone: 'cinza', label: 'Sem prazo', diasRestantes: null, percentual: null };
    }
    const hoje = paraISO(referencia);
    const restantes = diasUteisEntre(hoje, alvo.prazoEm);
    let percentual = null;
    if (alvo.entradaEm) {
        const total = diasUteisEntre(alvo.entradaEm, alvo.prazoEm);
        if (total > 0) {
            const decorrido = diasUteisEntre(alvo.entradaEm, hoje);
            percentual = Math.round(Math.min(Math.max(decorrido / total, 0), 1) * 100);
        }
    }
    /*
      Vencer é pergunta de **calendário**; a régua de dias úteis mede só o tamanho do atraso.
  
      Sem esta distinção, o fim de semana logo após o prazo mentia: prazo na sexta, consulta no
      sábado — zero dias úteis entre as duas datas, e o farol dizia "Vence hoje" com o prazo já
      estourado. ISO compara como texto, então `>` basta.
    */
    const vencida = hoje > alvo.prazoEm;
    if (vencida) {
        const atraso = Math.abs(restantes);
        return {
            tone: 'vermelho',
            // No fim de semana o atraso em úteis ainda é zero — "Atrasada 0d" soaria como erro.
            label: atraso > 0 ? `Atrasada ${atraso}d` : 'Atrasada',
            diasRestantes: restantes,
            percentual: 100,
        };
    }
    if (restantes <= 2) {
        return {
            tone: 'amarelo',
            label: restantes === 0 ? 'Vence hoje' : `${restantes}d restantes`,
            diasRestantes: restantes,
            percentual,
        };
    }
    return { tone: 'verde', label: `${restantes}d restantes`, diasRestantes: restantes, percentual };
}
