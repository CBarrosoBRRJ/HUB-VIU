import { ReactNode } from 'react';
import { Oportunidade } from '../../types';
import { INPUTS, totaisDoRodape } from '../../utils/oportunidades';

/**
 * Rodapé do grupo — a leitura de relance.
 *
 * Farol de SLA, exclusivos e distribuição de input. São os números que a operação confere sem
 * ler linha a linha para saber se o dia está sob controle.
 *
 * O farol conta **só quem ainda espera resposta**: o que já saiu da triagem não entra em nenhuma
 * das três faixas, porque somar projetos resolvidos ao "no prazo" inflaria o número que deveria
 * medir pressão.
 */
export function RodapeTotais({
  oportunidades, paginacao,
}: {
  /** SEMPRE o recorte inteiro, nunca a página: totais paginados fariam "Total no grupo" mentir. */
  oportunidades: Oportunidade[];
  paginacao?: ReactNode;
}) {
  const totais = totaisDoRodape(oportunidades);
  const emFarol = totais.slaAtrasados + totais.slaAtencao + totais.slaNoPrazo;

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-apoio">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <span className="text-slate-600">
          Total no grupo: <strong className="font-semibold text-slate-700">{totais.total}</strong>
        </span>

        {emFarol > 0 && (
          <span className="flex items-center gap-2 text-slate-500">
            <span className="text-slate-400">Farol SLA:</span>
            <span className="flex items-center gap-1 text-red-700">
              <span className="size-1.5 rounded-full bg-red-500" />
              {totais.slaAtrasados} atrasados
            </span>
            <span className="flex items-center gap-1 text-amber-700">
              <span className="size-1.5 rounded-full bg-amber-500" />
              {totais.slaAtencao} em atenção
            </span>
            <span className="flex items-center gap-1 text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {totais.slaNoPrazo} no prazo
            </span>
          </span>
        )}

        {/*
          Conta **exclusivos**, e não mais interveniências, desde 03/08/2026.

          O rodapé fala a língua da coluna: se a grade pergunta "Exclusivo?", o total ao pé dela
          não pode responder pelo avesso. Mesma cor da célula (índigo), pelo mesmo motivo.
        */}
        <span className="flex items-center gap-1.5 text-slate-500">
          <span className="text-slate-400">Exclusivos:</span>
          <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-semibold text-indigo-700 ring-1 ring-indigo-200">
            {totais.exclusivos} de {totais.total}
          </span>
        </span>
      </div>

      {/* A paginação mora no meio do rodapé: perto dos totais que ela janela, sem linha própria. */}
      {paginacao}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-slate-400">Input:</span>
        {/*
          O não classificado aparece à parte, e só quando existe.

          Distribuí-lo por um default inflaria uma das faixas com projetos que ninguém classificou
          — e o rodapé passaria a afirmar o que não sabe.
        */}
        {totais.semInput > 0 && (
          <span
            title="Projetos ainda sem classificação de input"
            className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700 ring-1 ring-amber-200"
          >
            A definir: <strong className="font-semibold">{totais.semInput}</strong>
          </span>
        )}
        {INPUTS.map((input) => (
          <span
            key={input.id}
            title={`${totais.porInput[input.id]} por ${input.label}`}
            className={`rounded px-1.5 py-0.5 ${
              totais.porInput[input.id] > 0
                ? 'bg-white text-slate-600 ring-1 ring-slate-200'
                : 'text-slate-300'
            }`}
          >
            {input.label}: <strong className="font-semibold">{totais.porInput[input.id]}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}
