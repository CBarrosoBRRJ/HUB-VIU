import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { TalentContract } from '../../types';
import { getVigenciaInfo, VIGENCIA_TONE_STYLE, VigenciaTone } from '../../utils/vigencia';

const RESUMO: { tone: VigenciaTone; rotulo: string }[] = [
  { tone: 'verde', rotulo: 'vigentes' },
  { tone: 'amarelo', rotulo: 'a vencer' },
  { tone: 'vermelho', rotulo: 'vencidos' },
  { tone: 'cinza', rotulo: 'sem vigência' },
];

interface GrupoHeaderProps {
  titulo: string;
  /** Classe de fundo da barra lateral — identidade visual do grupo. */
  cor: string;
  itens: TalentContract[];
  aberto: boolean;
  onToggle: () => void;
  colSpan: number;
}

/** Faixa de grupo com contagem e mini-farol da vigência. */
export function GrupoHeader({ titulo, cor, itens, aberto, onToggle, colSpan }: GrupoHeaderProps) {
  const porTone = itens.reduce<Record<string, number>>((acc, contract) => {
    const { tone } = getVigenciaInfo(contract);
    acc[tone] = (acc[tone] ?? 0) + 1;
    return acc;
  }, {});

  const presentes = RESUMO.filter((item) => (porTone[item.tone] ?? 0) > 0);

  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <div className="flex items-center gap-3 border-y border-slate-200/70 bg-gradient-to-r from-slate-50 to-white px-3 py-2.5">
          <button
            type="button"
            onClick={onToggle}
            className="flex min-w-0 items-center gap-2.5 text-left"
            aria-expanded={aberto}
          >
            <motion.span
              animate={{ rotate: aberto ? 0 : -90 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="text-slate-400"
            >
              <ChevronDown className="size-4" />
            </motion.span>

            <span className={`h-5 w-1.5 shrink-0 rounded-full ${cor}`} />

            <span className="truncate font-display text-sm font-bold text-slate-800">{titulo}</span>

            <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">
              {itens.length} {itens.length === 1 ? 'contrato' : 'contratos'}
            </span>
          </button>

          <div className="ml-auto flex items-center gap-3 pr-1">
            {presentes.map((item) => (
              <span key={item.tone} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className={`size-1.5 rounded-full ${VIGENCIA_TONE_STYLE[item.tone].dot}`} />
                <span className="tabular-nums">{porTone[item.tone]}</span>
                <span className="hidden lg:inline">{item.rotulo}</span>
              </span>
            ))}

            {/* Proporção do farol dentro do grupo. */}
            <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 sm:flex">
              {presentes.map((item) => (
                <motion.span
                  key={item.tone}
                  initial={{ width: 0 }}
                  animate={{ width: `${((porTone[item.tone] ?? 0) / itens.length) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                  className={`h-full ${VIGENCIA_TONE_STYLE[item.tone].bar}`}
                />
              ))}
            </span>
          </div>
        </div>
      </td>
    </tr>
  );
}
